# Processamento de clips no VPN Sentry — desenho

**Estado:** desenho aprovado pelo usuário em 18/10/2026; especificação para revisão antes do plano de implementação.

## Objetivo

Permitir que o VPN Sentry processe clips autorizados da Twitch na nuvem, transcreva o áudio e detecte frases configuradas, mantendo o objetivo de custo operacional adicional igual a R$ 0. O primeiro caminho usa a infraestrutura atual da Vercel e do Supabase, com limites que suspendem ou adiam processamento antes de consumir além da capacidade gratuita observada.

O Sentry continua sendo o responsável pela detecção final. Um aplicativo auxiliar local ou um bot em outro host são possibilidades futuras para reduzir consumo ou facilitar a captura; eles não fazem parte desta entrega.

## Decisões aprovadas

- A mídia de entrada é um clip da Twitch identificado por URL/ID, submetido pelo streamer ou criado pela integração Twitch quando a captura agendada for habilitada. O Sentry valida a referência e busca a mídia; clientes não enviam MP4 arbitrário.
- O processamento de áudio acontece no worker do Sentry, em runtime Node.js da Vercel. Supabase guarda configuração, metadados, estado e fila, sem executar Whisper em Edge Functions.
- Há dois modos de solicitação: envio manual de clip pelo streamer e amostragem agendada durante uma live autorizada. A cadência inicial considerada é no máximo um clip a cada 15 minutos e três horas monitoradas por canal por dia. São limites iniciais sujeitos à validação de carga, não compromissos de disponibilidade.
- Um teto global mensal de CPU/áudio processado, limites por canal, deduplicação, concorrência limitada e fila com tamanho máximo impedem que um pico esgote a cota sem controle. Ao atingir o teto, novas amostras agendadas são ignoradas e solicitações manuais ficam com estado explícito de limite atingido/adiado; nenhuma tentativa de upgrade pago é automática.
- A fila contém referências opacas ao clip e à sessão, nunca áudio, URL assinada ou transcrição. Mensagens são idempotentes; reentrega após timeout não duplica mídia nem eventos.
- O arquivo é baixado para área temporária do worker e removido ao concluir ou falhar. A persistência do MP4 original, sua duração de retenção e eventual armazenamento durável permanecem sob decisão da issue #14; o worker não deve introduzir retenção de mídia por conta própria.
- Transcrições completas são temporárias. Persistir somente os dados mínimos para revisar uma detecção (referência à evidência, timestamp, regra/versionamento e trecho de texto estritamente necessário), sujeitos à política da issue #14.

## Alternativas avaliadas

1. **Processar na infraestrutura atual — escolhido.** Preserva a arquitetura planejada para a Fase 2 e não exige instalação do streamer. A capacidade é limitada pelas cotas gratuitas e pelo tamanho/tempo de execução das Functions; precisa de admissão e backpressure.
2. **Aplicativo auxiliar no computador do streamer.** Distribui o custo de CPU e pode analisar continuamente, mas requer instalação, atualizações e compatibilidade com sistemas operacionais. Fica como otimização futura.
3. **Bot em outra hospedagem.** Pode ajudar na captura/coordenação. Se o bot enviar apenas suspeitas, ele também executa uma pré-detecção; para manter a detecção exclusivamente no Sentry, precisa enviar clips candidatos ao Sentry para a decisão final. Uma hospedagem diferente não atende por si só à meta de R$ 0.

## Fluxo

1. O Monitor apresenta estado de consentimento para processamento de clips e limites atuais. O streamer pode colar um link Twitch válido ou habilitar amostragem agendada.
2. O Sentry autentica o streamer, verifica consentimento e associação entre clip e canal, extrai somente um identificador Twitch e consulta a API oficial. Requisições de URL de mídia arbitrária são recusadas para impedir SSRF e acesso a hosts não autorizados.
3. Para a amostragem agendada, o Sentry só solicita a criação de clips durante sessão consentida e dentro da janela diária/cadência. A integração precisa obter o escopo Twitch apropriado por consentimento explícito. Cada clip criado é tratado como assíncrono e pode ainda não estar disponível para download.
4. O Sentry deduplica o ID Twitch, aplica os limites diário, mensal e global e grava uma mensagem privada na fila. O clip não é baixado se não houver capacidade de processamento.
5. Um worker Node.js no Sentry recebe um item por chamada limitada, busca a mídia Twitch por um caminho oficialmente suportado, verifica tipo, duração e tamanho e processa em espaço temporário.
6. O worker extrai áudio, executa o modelo escolhido, aplica detector versionado, grava o resultado mínimo e remove arquivos temporários em bloco de limpeza que roda tanto em sucesso quanto em erro.
7. O Monitor exibe andamento, detecções e estado terminal da solicitação. Erros são sanitizados; tentativas são limitadas, com backoff e fila de falhas observável.

## Limites e capacidade

Referência do benchmark local do spike: cerca de 11,1 vezes tempo real em uma execução serial do modelo Whisper `base`. É uma aproximação de custo, não uma garantia de performance na Vercel.

| Cenário máximo                                 | Clips/mês (10 canais) | Áudio/mês | CPU estimada no benchmark local |
| ---------------------------------------------- | --------------------: | --------: | ------------------------------: |
| 3 h de live/dia, um clip de 30 s a cada 15 min |                 3.600 |      30 h |                           2,7 h |
| Mesmo limite, um clip de 60 s por intervalo    |                 3.600 |      60 h |                           5,4 h |

A Vercel Hobby informa 4 horas de CPU ativa mensais. O cenário de 30 segundos caberia na estimativa bruta com apenas cerca de 1,3 hora de folga para download, conversão, detector e variação de hardware. O cenário de 60 segundos excede a cota estimada. A cota gratuita do Supabase não torna sua Edge Function adequada para ASR, que tem limite de dois segundos de CPU ativa por requisição.

Portanto, a cadência de 15 minutos é um teto de produto para o piloto, condicionada a um teste real em Preview e a um orçamento mensal de CPU. O sistema precisa medir consumo real por job, reservar margem para o restante do Sentry e ajustar ou suspender automaticamente a amostragem antes do limite Hobby. O orçamento inicial definitivo será definido com a medição hospedada, sem supor equivalência entre CPU local e CPU da Vercel.

A amostragem não é análise contínua: um clip de 30 segundos a cada 15 minutos cobre 3,3% do áudio; 60 segundos cobrem 6,7%. O produto deve descrever esse modo como amostragem e não prometer detectar todas as frases. O envio manual é adequado para clips selecionados pelo streamer.

## Integração Twitch a provar

Uma URL é um identificador de recurso, não necessariamente um URL de arquivo acessível pelo backend. A API Twitch de criação retorna ID e URL de edição; a documentação diz que a URL de edição permite baixar a mídia, mas o método de download efetivo e sua adequação a um worker precisam ser comprovados em uma integração local/Preview. A criação a partir de VOD usa duração entre 5 e 60 segundos, padrão 30; a criação durante live e a partir de VOD pedem escopos OAuth diferentes. O OAuth atual da VPN não deve receber novos escopos silenciosamente.

Antes de aprovar ingestão ampla, provar: submissão de um link Twitch, obtenção do ID, validação de `broadcaster_id`, espera pela disponibilidade, download autenticado pelo fluxo suportado, limites de duração/tamanho, expiração do link e sanitização de logs. Se não houver fluxo de mídia estável que respeite consentimento e escopos, bloquear ingestão por URL até encontrar uma opção suportada; não recorrer a extração de página ou URL de CDN não documentado.

## Fila e execução

Recomendação: Supabase Queues (`pgmq`) como fila privada e durável, com mensagens pequenas contendo IDs internos. A fila é pull-based e FIFO; o consumidor Node.js fica em `vpn-sentry` e é acionado por uma chamada interna agendada seguindo o padrão de Cron já existente. Cada execução processa um número pequeno e limitado de mensagens; Edge Functions do Supabase não executam o modelo.

Como mensagens podem reaparecer após seu período de visibilidade, os efeitos no banco, armazenamento e geração de eventos precisam ser idempotentes. Usar retries limitados, backoff, dead-letter/arquivamento com metadados sanitizados e limite de jobs em execução. Não criar worker permanentemente ligado nem processamento ilimitado em uma única Function.

## Dados, privacidade e segurança

- Consentimento para monitorar eventos Twitch da Fase 1 não autoriza por si só criação de clips, processamento de áudio ou retenção de transcrições. Apresentar consentimento específico, finalidade, modo manual/agendado, duração, retenção e revogação.
- A revogação bloqueia novas solicitações e novos downloads imediatamente. Jobs já enfileirados devem verificar consentimento novamente antes de baixar e antes de persistir resultados.
- Aceitar apenas IDs/URLs Twitch suportados. Validar host, protocolo, redirect, ID do canal e tipo/tamanho obtidos por API; não seguir redirects arbitrários. Remover query strings e tokens de logs.
- Buckets de mídia, se aprovados na issue #14, são privados e recebem somente objetos com limite e expiração. A URL Twitch nunca é exposta como acesso permanente ao Monitor.
- Coletar somente áudio/falas necessários ao propósito aprovado; transcrição integral, áudio e vídeo não aparecem em resposta pública, analytics ou logs.
- Alertas e respostas automáticas não contatam serviços de emergência ou terceiros sem confirmação humana explícita.

## Estados e erros observáveis

Solicitação: `queued`, `processing`, `completed`, `no_match`, `deferred_quota`, `failed_retryable`, `failed_terminal`, `cancelled_consent`. Exibir ao streamer uma mensagem simples para cota, clip indisponível, duração/tamanho excedidos e erro temporário. Guardar razão operacional sanitizada, tentativas, timestamps e duração de CPU sem conteúdo de áudio.

Uma falha de ASR não cria um evento negativo. Clip sem áudio, idioma sem suporte, timeout ou resposta inválida termina com estado de erro apropriado, preserva apenas a referência de origem permitida e libera recursos temporários.

## Critérios de aceitação para a futura implementação

- O caminho Twitch URL → validação de canal → download de mídia pelo método suportado funciona com OAuth e consentimento explícitos, sem aceitar destino arbitrário.
- O worker Node.js processa um job sob limites de pacote, memória, duração e orçamento real da Vercel; Supabase Edge não roda inferência.
- Dez streamers de teste simulados, com a política de amostragem escolhida, permanecem abaixo do orçamento mensal conservador, considerando a CPU total do projeto e não apenas o ASR.
- Limite diário por canal, orçamento global, fila máxima, concorrência, retries e comportamento ao atingir a cota têm testes automatizados.
- Deduplicação Twitch e idempotência impedem evento ou mídia duplicados sob reentrega e concorrência.
- Revogação antes e durante a fila impede novos downloads e persistência; limpeza ocorre também em erro e timeout.
- RLS, permissões da fila privada, Storage privado, contratos e tipos gerados passam nos checks do monorepo.
- A UI comunica que a captura de 15 minutos é amostragem parcial e apresenta cota/estado sem alegar cobertura contínua.
- Limites de retenção são aprovados na issue #14 e testados com fixtures; não ficam implícitos no worker.

## Entrega em etapas

- **Issue #14 — Persistência privada, consentimento e retenção:** decidir dados mínimos, consentimento específico, retenção e acesso. Não assumir 30/90 dias sem aprovação explícita.
- **Issue #15 — Ingestão de clips:** provar resolução e download de clip Twitch, então implementar entrada manual e, se escopos/capacidade forem aceitos, criar clips amostrados pela API. Fazer teste curto de capacidade do runtime já no Preview.
- **Issue #16 — Worker:** fila Supabase privada, consumidor Node.js limitado, transcrição, detecção, orçamento e limpeza.
- **Issues #17–#19 e #20:** API privada de eventos, revisão no Monitor, validação ponta a ponta e alertas, preservando limites e consentimentos aprovados.

## Fontes oficiais verificadas em 18/10/2026

- [Vercel Hobby: cota de 4 horas de CPU ativa](https://vercel.com/docs/plans/hobby)
- [Vercel Functions: duração, memória, tamanho de pacote e payload](https://vercel.com/docs/functions/limitations)
- [Supabase Edge Functions: limites de CPU e memória](https://supabase.com/docs/guides/functions/limits)
- [Supabase Queues e PGMQ](https://supabase.com/docs/guides/queues) e [API de PGMQ](https://supabase.com/docs/guides/queues/pgmq)
- [Twitch Clips](https://dev.twitch.tv/docs/api/clips/) e [referência da API, Create Clip From VOD](https://dev.twitch.tv/docs/api/reference)
