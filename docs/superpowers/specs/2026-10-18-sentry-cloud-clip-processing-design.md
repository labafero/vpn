# Processamento de clips no VPN Sentry — desenho

**Estado:** desenho aprovado pelo usuário em 18/10/2026; especificação para revisão antes do plano de implementação.

## Objetivo

Permitir que o VPN Sentry processe clips autorizados da Twitch na nuvem, transcreva o áudio e detecte frases configuradas, mantendo o objetivo de custo operacional adicional igual a R$ 0. O primeiro caminho usa a infraestrutura atual da Vercel e do Supabase, com limites que suspendem ou adiam processamento antes de consumir além da capacidade gratuita observada.

O Sentry continua sendo o responsável pela detecção final. Um aplicativo auxiliar local ou um bot em outro host são possibilidades futuras para reduzir consumo ou facilitar a captura; eles não fazem parte desta entrega.

## Decisões aprovadas

- A mídia de entrada é um clip da Twitch identificado por URL/ID, submetido pelo streamer ou criado pela integração Twitch quando a captura agendada for habilitada. O Sentry valida a referência e busca a mídia; clientes não enviam MP4 arbitrário.
- O processamento de áudio acontece no worker do Sentry, em runtime Node.js da Vercel. Supabase guarda configuração, metadados, estado e fila, sem executar Whisper em Edge Functions.
- Há dois modos de solicitação: envio manual de clip pelo streamer e amostragem agendada durante uma live autorizada. A cadência inicial considerada é no máximo um clip a cada 15 minutos e três horas monitoradas por canal por dia. São limites iniciais sujeitos à validação de carga, não compromissos de disponibilidade.
- Todo clip Twitch válido enviado pelo streamer é registrado imediatamente, inclusive quando o orçamento mensal de processamento estiver esgotado. A cota controla a etapa cara de ASR/Whisper, não a aceitação nem a persistência da submissão.
- A submissão persistida inclui URL Twitch canônica/ID, metadados permitidos retornados pela Twitch, canal/dono, data de recebimento e estado. O original de áudio/vídeo só é baixado quando houver capacidade de processamento.
- Um teto global mensal de CPU/áudio processado, limites por canal, deduplicação e concorrência limitada protegem a cota. Ao atingir o teto, novas submissões manuais e agendadas permanecem salvas como pendentes; nenhuma tentativa de upgrade pago é automática.
- A tabela privada de submissões é a fonte de verdade para a fila e mantém itens pendentes pelo tempo necessário, inclusive dias ou meses. Mensagens `pgmq` contêm apenas IDs internos para acordar o worker; podem ser refeitas a partir das submissões se expirarem ou falharem. A ordem mais antiga é processada primeiro quando o orçamento voltar a permitir.
- A retenção de dados pendentes não expira antes do processamento, exceto por remoção/revogação solicitada pelo dono. Após o processamento, os metadados e resultados seguem a política da issue #14. O produto monitora idade da submissão mais antiga e uso do banco; se a capacidade gratuita se aproximar do limite, interrompe novas capturas agendadas, mas não apaga submissões pendentes silenciosamente.
- Transcrições completas são temporárias. Persistir somente os dados mínimos para revisar uma detecção (referência à evidência, timestamp, regra/versionamento e trecho de texto estritamente necessário), sujeitos à política da issue #14.

## Alternativas avaliadas

1. **Processar na infraestrutura atual — escolhido.** Preserva a arquitetura planejada para a Fase 2 e não exige instalação do streamer. A capacidade é limitada pelas cotas gratuitas e pelo tamanho/tempo de execução das Functions; precisa de admissão e backpressure.
2. **Aplicativo auxiliar no computador do streamer.** Distribui o custo de CPU e pode analisar continuamente, mas requer instalação, atualizações e compatibilidade com sistemas operacionais. Fica como otimização futura.
3. **Bot em outra hospedagem.** Pode ajudar na captura/coordenação. Se o bot enviar apenas suspeitas, ele também executa uma pré-detecção; para manter a detecção exclusivamente no Sentry, precisa enviar clips candidatos ao Sentry para a decisão final. Uma hospedagem diferente não atende por si só à meta de R$ 0.

## Fluxo

1. O Monitor apresenta consentimento para guardar e processar clips, modo de captura, limites atuais e estado da fila. O streamer pode colar um link Twitch válido ou habilitar amostragem agendada.
2. O Sentry autentica o streamer, valida formato/host Twitch, verifica consentimento e associação entre clip e canal e extrai o identificador. URL arbitrária é recusada para impedir SSRF e acesso a hosts não autorizados.
3. Depois da validação do host Twitch, o Sentry persiste imediatamente a submissão privada com URL/ID canônico, canal/dono conhecido, horário de recebimento e estado `pending_metadata`. A consulta de enriquecimento da Twitch acontece em seguida; quando bem-sucedida, atualiza uma allowlist de metadados (ID, canal, criador, título, data, duração, idioma e contagem de visualizações) e move para `pending_asr`. Falha temporária mantém a referência persistida e agenda nova tentativa de metadados.
4. Para a amostragem agendada, o Sentry só solicita a criação de clips durante sessão consentida e dentro da janela diária/cadência. A integração precisa obter o escopo Twitch apropriado por consentimento explícito. Cada clip criado é tratado como assíncrono e sua submissão/metadados são persistidos mesmo que o orçamento de Whisper esteja esgotado.
5. Um dispatcher compara o consumo medido com o orçamento, seleciona a submissão pendente mais antiga quando houver capacidade e envia seu ID interno à fila privada. Sem capacidade, a submissão continua no banco, visível como pendente/aguardando cota.
6. Um worker Node.js no Sentry recebe um item por chamada limitada, revalida consentimento, busca a mídia Twitch por um caminho oficialmente suportado, verifica tipo, duração e tamanho e processa em espaço temporário.
7. O worker extrai áudio, executa o modelo escolhido, carrega as frases configuradas vigentes no momento do processamento, aplica o detector e grava a versão exata das frases e o resultado mínimo. Arquivos temporários são removidos tanto em sucesso quanto em erro.
8. O Monitor exibe andamento, detecções e estado terminal da solicitação. Erros são sanitizados; tentativas são limitadas, com backoff e estado recuperável observável. Submissões aguardando cota ficam visíveis e não são tratadas como falha.

## Limites e capacidade

Referência do benchmark local do spike: cerca de 11,1 vezes tempo real em uma execução serial do modelo Whisper `base`. É uma aproximação de custo, não uma garantia de performance na Vercel.

| Cenário máximo                                 | Clips/mês (10 canais) | Áudio/mês | CPU estimada no benchmark local |
| ---------------------------------------------- | --------------------: | --------: | ------------------------------: |
| 3 h de live/dia, um clip de 30 s a cada 15 min |                 3.600 |      30 h |                           2,7 h |
| Mesmo limite, um clip de 60 s por intervalo    |                 3.600 |      60 h |                           5,4 h |

A Vercel Hobby informa 4 horas de CPU ativa mensais. O cenário de 30 segundos caberia na estimativa bruta com apenas cerca de 1,3 hora de folga para download, conversão, detector e variação de hardware. O cenário de 60 segundos excede a cota estimada. A cota gratuita do Supabase não torna sua Edge Function adequada para ASR, que tem limite de dois segundos de CPU ativa por requisição.

Portanto, a cadência de 15 minutos é um teto de produto para o piloto, condicionada a um teste real em Preview e a um orçamento mensal de CPU. O sistema precisa medir consumo real por job, reservar margem para o restante do Sentry e suspender o processamento Whisper antes do limite Hobby. O orçamento inicial definitivo será definido com a medição hospedada, sem supor equivalência entre CPU local e CPU da Vercel. Suspender Whisper não interrompe a ingestão de referências e metadados: elas permanecem pendentes para processamento posterior.

A amostragem não é análise contínua: um clip de 30 segundos a cada 15 minutos cobre 3,3% do áudio; 60 segundos cobrem 6,7%. O produto deve descrever esse modo como amostragem e não prometer detectar todas as frases. O envio manual é adequado para clips selecionados pelo streamer.

A fila de processamento pode crescer durante dias ou meses, mas a tabela também consome a cota de banco. No plano Supabase Free, o banco entra em modo somente leitura acima de 500 MB por projeto. Monitorar volume de metadados e idade da fila e suspender criação automática com antecedência quando o armazenamento se aproximar do limite. O sistema não deve prometer retenção indefinida nem perda zero além da capacidade gratuita; nesse cenário, deve avisar que novas submissões não podem ser salvas e permitir retomada após limpeza ou aumento de capacidade autorizado.

Guardar URL e metadados não preserva o arquivo original: a Twitch ou o dono do canal podem tornar um clip indisponível antes que a cota permita processá-lo. O worker precisa verificar disponibilidade ao retirar o item da fila; se a fonte não existir mais, marcar `source_unavailable` e conservar os metadados para a lista do usuário, sem alegar que o vídeo será transcrito. Preservar a mídia por meses exigiria download antecipado e armazenamento privado, com impacto próprio de armazenamento e retenção a decidir na issue #14.

As frases configuradas são lidas no momento em que o ASR é executado, e a versão aplicada fica registrada no resultado. Assim, alterações enquanto um clip espera na fila melhoram a detecção desse clip. Na Fase 2, a issue #16 ainda usa uma lista fixa/versionada; configuração pessoal permanece prevista para a Fase 3, mas o modelo de submissão deve permitir associar a versão que será aplicada quando essa configuração existir. Frases mais específicas podem reduzir falsos alertas, mas não reduzem a CPU gasta para transcrever; o áudio ainda precisa passar pelo Whisper para então comparar as frases.

## Integração Twitch a provar

Uma URL é um identificador de recurso, não necessariamente um URL de arquivo acessível pelo backend. A API Twitch de criação retorna ID e URL de edição; a documentação diz que a URL de edição permite baixar a mídia, mas o método de download efetivo e sua adequação a um worker precisam ser comprovados em uma integração local/Preview. A criação a partir de VOD usa duração entre 5 e 60 segundos, padrão 30; a criação durante live e a partir de VOD pedem escopos OAuth diferentes. O OAuth atual da VPN não deve receber novos escopos silenciosamente.

Antes de aprovar ingestão ampla, provar: submissão de um link Twitch, obtenção do ID, validação de `broadcaster_id`, espera pela disponibilidade, download autenticado pelo fluxo suportado, limites de duração/tamanho, expiração do link e sanitização de logs. Se não houver fluxo de mídia estável que respeite consentimento e escopos, bloquear ingestão por URL até encontrar uma opção suportada; não recorrer a extração de página ou URL de CDN não documentado.

## Reutilizar legendas da Twitch antes do Whisper

A API Helix `Get Clips` retorna URL, IDs, offset, duração e outros metadados, mas não documenta campos de legenda ou transcrição. Portanto, o Sentry não pode pedir à API uma transcrição pronta do clip. A ausência de texto na resposta Helix também não prova que o clip não tenha legendas no player.

A Twitch documenta o evento JavaScript `Twitch.Player.CAPTIONS`, que emite texto sincronizado quando legendas existem no conteúdo reproduzido por um player interativo de live/VOD. A documentação dos clips descreve um player separado, não interativo e sem essa API JavaScript. O teste de menor custo é usar o `video_id` e `vod_offset` do clip para abrir o VOD no player interativo, começar no offset e observar se o evento entrega as legendas daquele trecho. O `Get Clips` pode retornar `video_id` vazio e `vod_offset` nulo quando o VOD não existe ou ainda não foi criado.

Hipótese para a implementação, sujeita ao teste de compatibilidade: usar texto e timestamps da Twitch quando o player VOD os disponibilizar; só então comparar as frases no Sentry. Se o VOD/offset não existir, o player não emitir legendas ou a fonte não for tecnicamente acessível no fluxo de processamento, marcar a submissão `needs_asr` e deixar o Whisper na fila com o orçamento de CPU já definido. Não depender de legendas queimadas na imagem nem de endpoints privados/não documentados.

O evento de captions é uma interface de playback no browser, não uma API de transcrição em lote para o worker Node.js. O probe deve medir o atrito de reproduzir o trecho e encaminhar o texto ao Sentry; só adotar esta via para processamento em background se houver forma suportada e sem exigir que o streamer mantenha uma página aberta. Caso contrário, ela pode atender apenas revisão assistida no Monitor, com Whisper como caminho automatizado.

As legendas de clips Twitch são variáveis: a Twitch informa que clips feitos pela ação rápida ou por Auto Clips incluem captions por padrão; outros clips dependem de a opção ter sido habilitada. A Auto Clips permanece descrita como alfa por convite e restrita a canais com idioma de transmissão inglês e VOD público. Isso não garante legendas para todo clip nem disponibilidade para canais em português. Cada submissão deve registrar a origem de transcrição usada (`twitch_captions` ou `whisper`) e a versão/regra aplicada.

## Fila e execução

Recomendação: Supabase Queues (`pgmq`) como fila privada e durável, com mensagens pequenas contendo IDs internos. A fila é pull-based e FIFO; o consumidor Node.js fica em `vpn-sentry` e é acionado por uma chamada interna agendada seguindo o padrão de Cron já existente. Cada execução processa um número pequeno e limitado de mensagens; Edge Functions do Supabase não executam o modelo.

Como mensagens podem reaparecer após seu período de visibilidade, os efeitos no banco, armazenamento e geração de eventos precisam ser idempotentes. Usar retries limitados, backoff, dead-letter/arquivamento com metadados sanitizados e limite de jobs em execução. Uma falha do dispatcher ou esgotamento da cota não remove o registro pendente; ele pode ser reenfileirado. Não criar worker permanentemente ligado nem processamento ilimitado em uma única Function.

## Dados, privacidade e segurança

- Consentimento para monitorar eventos Twitch da Fase 1 não autoriza por si só criação de clips, processamento de áudio ou retenção de transcrições. Apresentar consentimento específico, finalidade, modo manual/agendado, duração, retenção e revogação.
- O consentimento de captura inclui persistir URL/ID e metadados Twitch durante a espera pelo processamento. A UI informa que a transcrição pode atrasar dias ou meses quando a capacidade gratuita está ocupada.
- A revogação bloqueia novas solicitações e novos downloads imediatamente. Jobs já enfileirados devem verificar consentimento novamente antes de baixar e antes de persistir resultados.
- Aceitar apenas IDs/URLs Twitch suportados. Validar host, protocolo, redirect, ID do canal e tipo/tamanho obtidos por API; não seguir redirects arbitrários. Remover query strings e tokens de logs.
- Buckets de mídia, se aprovados na issue #14, são privados e recebem somente objetos com limite e expiração. A URL Twitch nunca é exposta como acesso permanente ao Monitor.
- Coletar somente áudio/falas necessários ao propósito aprovado; transcrição integral, áudio e vídeo não aparecem em resposta pública, analytics ou logs.
- Alertas e respostas automáticas não contatam serviços de emergência ou terceiros sem confirmação humana explícita.

## Estados e erros observáveis

Solicitação: `pending_metadata`, `pending_asr`, `processing`, `completed`, `no_match`, `source_unavailable`, `failed_retryable`, `failed_terminal`, `cancelled_consent`. A UI apresenta `pending_asr` como “aguardando capacidade” quando Whisper está pausado pela cota. Exibir mensagens simples para limite de armazenamento que impede novas submissões, clip indisponível, duração/tamanho excedidos e erro temporário. Guardar razão operacional sanitizada, tentativas, timestamps e duração de CPU sem conteúdo de áudio.

Uma falha de ASR não cria um evento negativo. Clip sem áudio, idioma sem suporte, timeout ou resposta inválida termina com estado de erro apropriado, preserva apenas a referência de origem permitida e libera recursos temporários.

## Critérios de aceitação para a futura implementação

- O caminho Twitch URL → validação de canal → download de mídia pelo método suportado funciona com OAuth e consentimento explícitos, sem aceitar destino arbitrário.
- O worker Node.js processa um job sob limites de pacote, memória, duração e orçamento real da Vercel; Supabase Edge não roda inferência.
- Dez streamers de teste simulados, com a política de amostragem escolhida, permanecem abaixo do orçamento mensal conservador, considerando a CPU total do projeto e não apenas o ASR.
- Limite diário por canal, orçamento global de ASR, concorrência, retries e comportamento de pausa/retomada têm testes automatizados.
- Toda referência Twitch válida aceita fica registrada antes de verificar disponibilidade de CPU; esgotamento do orçamento deixa itens pendentes e não os descarta.
- O dispatcher reconstrói mensagens da fila a partir da tabela de submissões sem duplicar trabalho ou apagar metadados.
- Deduplicação Twitch e idempotência impedem evento ou mídia duplicados sob reentrega e concorrência.
- Revogação antes e durante a fila impede novos downloads e persistência; limpeza ocorre também em erro e timeout.
- RLS, permissões da fila privada, Storage privado, contratos e tipos gerados passam nos checks do monorepo.
- A UI comunica que a captura de 15 minutos é amostragem parcial e apresenta cota/estado sem alegar cobertura contínua.
- Pendências não expiram por idade antes do ASR, salvo exclusão/revogação pelo dono; depois do processamento, metadados/resultados seguem retenção aprovada na issue #14.
- Monitoramento de espaço do banco alerta e suspende captura agendada antes da cota Free; a UI explica quando não for possível aceitar novas referências até liberar espaço.

## Entrega em etapas

- **Issue #14 — Persistência privada, consentimento e retenção:** persistir a fila de submissões e metadados Twitch; decidir retenção após processamento, consentimento específico e acesso. Pendências permanecem até processamento ou exclusão solicitada, com o limite físico gratuito monitorado.
- **Issue #15 — Ingestão de clips:** provar resolução e download de clip Twitch, então implementar entrada manual e, se escopos/capacidade forem aceitos, criar clips amostrados pela API. Fazer teste curto de capacidade do runtime já no Preview.
- **Issue #16 — Worker:** fila Supabase privada e consumidor Node.js limitado; primeiro provar a disponibilidade de captions por uma interface oficial. Se essa fonte servir ao processamento em background, usá-la e enviar clips sem captions ao Whisper; caso contrário, manter Whisper como caminho automatizado.
- **Issues #17–#19 e #20:** API privada de eventos, revisão no Monitor, validação ponta a ponta e alertas, preservando limites e consentimentos aprovados.

## Fontes oficiais verificadas em 18/10/2026

- [Vercel Hobby: cota de 4 horas de CPU ativa](https://vercel.com/docs/plans/hobby)
- [Vercel Functions: duração, memória, tamanho de pacote e payload](https://vercel.com/docs/functions/limitations)
- [Supabase Edge Functions: limites de CPU e memória](https://supabase.com/docs/guides/functions/limits)
- [Supabase Queues e PGMQ](https://supabase.com/docs/guides/queues) e [API de PGMQ](https://supabase.com/docs/guides/queues/pgmq)
- [Cotas de banco Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) e [modo somente leitura acima de 500 MB no Free](https://supabase.com/docs/guides/platform/database-size)
- [Twitch Clips](https://dev.twitch.tv/docs/api/clips/) e [referência da API, Create Clip From VOD](https://dev.twitch.tv/docs/api/reference)
- [Player JavaScript Twitch: evento `CAPTIONS` e playback interativo de VOD](https://dev.twitch.tv/docs/embed/video-and-clips/)
- [Auto Clips e condições das captions](https://help.twitch.tv/s/article/auto-clips?language=en_US) e [legendas em clips](https://help.twitch.tv/s/article/how-to-use-clips?language=en_US)
