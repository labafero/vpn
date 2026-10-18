# Processamento de clips no VPN Sentry — desenho

**Estado:** desenho base aprovado em 18/10/2026; diretriz captions-first e Whisper sob demanda incorporada em 18/10/2026; autorização incremental para download Twitch detalhada após validação da API em 18/10/2026; especificação revisada para aprovação antes do plano de implementação.

## Objetivo

Permitir que o VPN Sentry detecte ocorrências em clips autorizados da Twitch, mantendo o objetivo de custo operacional adicional igual a R$ 0. A detecção de ocorrências é a função do Sentry; transcrever áudio é uma limitação técnica e um caminho de recuperação, não o produto principal. O fluxo prioriza captions da Twitch e usa a infraestrutura atual da Vercel e do Supabase para persistir clips, resultados e pedidos de transcrição, com limites que suspendem ou adiam processamento antes de consumir além da capacidade gratuita observada.

O Sentry continua sendo o responsável pela detecção final. Um aplicativo auxiliar local ou um bot em outro host são possibilidades futuras para reduzir consumo ou facilitar a captura; eles não fazem parte desta entrega.

## Decisões aprovadas

- A mídia de entrada é um clip da Twitch identificado por URL/ID, submetido pelo streamer ou criado pela integração Twitch quando a captura agendada for habilitada. O Sentry valida a referência e busca a mídia; clientes não enviam MP4 arbitrário.
- A Twitch é uma dependência de primeira classe da stack, junto com Vercel, Supabase, Nuxt e Nitro: priorizar APIs, captions, permissões, configurações e limites nativos documentados antes de adicionar provedor pago ou software auxiliar.
- O fluxo padrão usa a autorização Twitch do próprio streamer para processar clips do canal que ele vinculou à conta VPN. A permissão de download de clips é solicitada somente quando ele habilitar essa função, não durante o vínculo Twitch inicial.
- O OAuth incremental pede apenas o escopo necessário para o recurso ativado. Para clips do canal do próprio streamer, solicitar `channel:manage:clips`; não solicitar permissões de funcionalidades futuras.
- Todo conteúdo do VPN originado de GTA RP é tratado como +18. A tela de sincronização informa essa regra e que a barreira de idade da Twitch é esperada; não é uma falha de integração.
- O Sentry prioriza texto de captions da Twitch e aplica suas frases de gatilho para detectar ocorrências. O uso de captions como fonte automática precisa ser comprovado com um clip positivo e uma interface oficial; habilitar captions na Twitch, por si só, não prova que o worker consegue ler o texto.
- O Whisper nunca é iniciado automaticamente quando um clip chega sem captions acessíveis. O usuário solicita a transcrição por uma ação explícita no Monitor; o pedido entra na fila do worker Node.js da Vercel e respeita cota global e limites por canal. Supabase guarda configuração, metadados, estado e fila, sem executar Whisper em Edge Functions.
- Há dois modos de solicitação: envio manual de clip pelo streamer e amostragem agendada durante uma live autorizada. A cadência inicial considerada é no máximo um clip a cada 15 minutos e três horas monitoradas por canal por dia. São limites iniciais sujeitos à validação de carga, não compromissos de disponibilidade.
- Todo clip Twitch válido enviado pelo streamer é registrado imediatamente, inclusive quando não houver captions disponíveis ou o orçamento de Whisper estiver esgotado. Sem captions acessíveis, o clip aguarda a decisão do usuário; só um pedido explícito pode colocá-lo na fila de Whisper.
- A submissão persistida inclui URL Twitch canônica/ID, metadados permitidos retornados pela Twitch, canal/dono, data de recebimento e estado. O original de áudio/vídeo só é baixado quando houver capacidade de processamento.
- Um teto global mensal de CPU/áudio processado, limites por canal, deduplicação e concorrência limitada protegem a cota de Whisper. Ao atingir o teto, pedidos já feitos ficam aguardando capacidade e novas solicitações são explicadas ao usuário; nenhuma tentativa de upgrade pago é automática.
- A tabela privada de submissões é a fonte de verdade para referências e pedidos explícitos de Whisper. Mensagens `pgmq` contêm apenas IDs internos para acordar o worker; podem ser refeitas a partir dos pedidos persistidos se expirarem ou falharem. Clips sem captions não viram jobs de Whisper automaticamente, mesmo quando há capacidade ociosa.
- A retenção de referências pendentes não expira antes do processamento, exceto por remoção/revogação solicitada pelo dono. Após o processamento, os metadados e resultados seguem a política da issue #14. O produto monitora idade das referências e uso do banco; se a capacidade gratuita se aproximar do limite, interrompe novas capturas agendadas, mas não apaga itens pendentes silenciosamente.
- Transcrições completas são temporárias. Persistir somente os dados mínimos para revisar uma detecção (referência à evidência, timestamp, regra/versionamento e trecho de texto estritamente necessário), sujeitos à política da issue #14.
- Termos e interface instruem habilitar captions nas configurações do canal e selecioná-las ao criar clips, além de ativar armazenamento e publicação de VODs para maximizar a disponibilidade das fontes Twitch. Explicam que certas rotas de captions dependem do VOD, que a amostragem não garante cobertura contínua e que Whisper é uma ação sob demanda sujeita a orçamento, atraso e disponibilidade do clip.

## Alternativas avaliadas

1. **Processar na infraestrutura atual — escolhido.** Preserva a arquitetura planejada para a Fase 2 e não exige instalação do streamer. A capacidade é limitada pelas cotas gratuitas e pelo tamanho/tempo de execução das Functions; precisa de admissão e backpressure.
2. **Aplicativo auxiliar no computador do streamer.** Distribui o custo de CPU e pode analisar continuamente, mas requer instalação, atualizações e compatibilidade com sistemas operacionais. Fica como otimização futura.
3. **Bot em outra hospedagem.** Pode ajudar na captura/coordenação. Se o bot enviar apenas suspeitas, ele também executa uma pré-detecção; para manter a detecção exclusivamente no Sentry, precisa enviar clips candidatos ao Sentry para a decisão final. Uma hospedagem diferente não atende por si só à meta de R$ 0.

## Fluxo

1. O Monitor apresenta consentimento para guardar e processar clips, modo de captura, limites atuais e estado da fila. A tela informa que conteúdo GTA RP é +18 e orienta o streamer a habilitar captions nas configurações do canal, selecioná-las ao criar clips e ativar armazenamento/publicação de VODs para maximizar a compatibilidade. O streamer pode colar um link Twitch válido ou habilitar amostragem agendada. Ao ativar processamento de clips, inicia a autorização incremental descrita abaixo.
2. O Sentry autentica o streamer, valida formato/host Twitch, verifica consentimento e associação entre clip e canal e extrai o identificador. URL arbitrária é recusada para impedir SSRF e acesso a hosts não autorizados.
3. Depois da validação do host Twitch, o Sentry persiste imediatamente a submissão privada com URL/ID canônico, canal/dono conhecido, horário de recebimento e estado `pending_metadata`. A consulta de enriquecimento da Twitch atualiza uma allowlist de metadados (ID, canal, criador, título, data, duração, idioma e contagem de visualizações) e move para `pending_captions`. Falha temporária mantém a referência persistida e agenda nova tentativa de metadados.
4. Para a amostragem agendada, o Sentry só solicita a criação de clips durante sessão consentida e dentro da janela diária/cadência. A integração precisa obter o escopo Twitch apropriado por consentimento explícito. Cada clip criado é tratado como assíncrono e sua submissão/metadados são persistidos mesmo que o orçamento de Whisper esteja esgotado. O primeiro teste precisa confirmar que clips criados pela integração herdam a opção de captions habilitada no canal; a API não documenta um parâmetro de captions.
5. Assim que os metadados estão disponíveis, o fluxo tenta obter captions da Twitch por uma interface oficial, sem esperar pela cota de Whisper, e aplica imediatamente as frases configuradas. A origem e a versão da regra ficam associadas ao resultado. Se não houver captions ou a interface não as entregar, registra `needs_transcription_request`; não cria job de Whisper.
6. O Monitor apresenta a ação “Transcrever com Whisper” para um clip sem captions acessíveis, informa que a operação consome a cota e registra o pedido explícito do usuário. Se a cota estiver cheia, o pedido permanece como `pending_asr` até haver capacidade; cliques repetidos não criam jobs duplicados.
7. Um worker Node.js no Sentry recebe somente jobs de Whisper solicitados pelo usuário, revalida consentimento e cotas, busca a mídia Twitch por um caminho oficialmente suportado, verifica tipo, duração e tamanho, processa em espaço temporário e remove os arquivos em sucesso ou erro.
8. Para Whisper, o worker extrai áudio, executa o modelo escolhido, aplica as frases configuradas vigentes no momento do pedido e grava a origem/versionamento e o resultado mínimo. O Monitor mostra andamento, detecções e estado; erros são sanitizados e tentativas são limitadas com backoff.

## Limites e capacidade

Referência do benchmark local do spike: cerca de 11,1 vezes tempo real em uma execução serial do modelo Whisper `base`. É uma aproximação de custo, não uma garantia de performance na Vercel.

| Cenário máximo                                 | Clips/mês (10 canais) | Áudio/mês | CPU estimada no benchmark local |
| ---------------------------------------------- | --------------------: | --------: | ------------------------------: |
| 3 h de live/dia, um clip de 30 s a cada 15 min |                 3.600 |      30 h |                           2,7 h |
| Mesmo limite, um clip de 60 s por intervalo    |                 3.600 |      60 h |                           5,4 h |

Esses valores são um limite de estresse no caso de todo clip amostrado receber pedido de Whisper. Não são o volume padrão: captions da Twitch são priorizadas e Whisper só entra na conta depois de pedido explícito do usuário.

A Vercel Hobby informa 4 horas de CPU ativa mensais. O cenário de 30 segundos caberia na estimativa bruta com apenas cerca de 1,3 hora de folga para download, conversão, detector e variação de hardware. O cenário de 60 segundos excede a cota estimada. A cota gratuita do Supabase não torna sua Edge Function adequada para ASR, que tem limite de dois segundos de CPU ativa por requisição.

Portanto, a cadência de 15 minutos é um teto de produto para o piloto, condicionada a um teste real em Preview e a um orçamento mensal de CPU. O sistema precisa medir consumo real por job, reservar margem para o restante do Sentry e suspender pedidos de Whisper antes do limite Hobby. O orçamento inicial definitivo será definido com a medição hospedada, sem supor equivalência entre CPU local e CPU da Vercel. Whisper só processa clips solicitados pelo usuário; pedidos autorizados sem capacidade ficam aguardando, e os demais clips permanecem armazenados com metadados até uma ação do usuário.

A amostragem não é análise contínua: um clip de 30 segundos a cada 15 minutos cobre 3,3% do áudio; 60 segundos cobrem 6,7%. O produto deve descrever esse modo como amostragem e não prometer detectar todas as frases. O envio manual é adequado para clips selecionados pelo streamer.

A fila de processamento pode crescer durante dias ou meses, mas a tabela também consome a cota de banco. No plano Supabase Free, o banco entra em modo somente leitura acima de 500 MB por projeto. Monitorar volume de metadados e idade da fila e suspender criação automática com antecedência quando o armazenamento se aproximar do limite. O sistema não deve prometer retenção indefinida nem perda zero além da capacidade gratuita; nesse cenário, deve avisar que novas submissões não podem ser salvas e permitir retomada após limpeza ou aumento de capacidade autorizado.

Guardar URL e metadados não preserva o arquivo original: a Twitch ou o dono do canal podem tornar um clip indisponível antes que a cota permita processá-lo. O worker precisa verificar disponibilidade ao retirar o item da fila; se a fonte não existir mais, marcar `source_unavailable` e conservar os metadados para a lista do usuário, sem alegar que o vídeo será transcrito. Preservar a mídia por meses exigiria download antecipado e armazenamento privado, com impacto próprio de armazenamento e retenção a decidir na issue #14.

As frases configuradas são aplicadas ao texto de captions da Twitch quando acessível ou à transcrição Whisper quando o usuário solicita. A origem do texto e a versão das frases ficam registradas no resultado. Na Fase 2, a issue #16 ainda usa uma lista fixa/versionada; configuração pessoal permanece prevista para a Fase 3, mas o modelo de submissão deve permitir associar a versão aplicada. Frases mais específicas podem reduzir falsos alertas; Whisper continua sendo custo opcional sob demanda, não requisito para cada clip.

## Integração Twitch a provar

Uma URL é um identificador de recurso, não necessariamente um URL de arquivo acessível pelo backend. A Twitch documenta [`Get Clips Download`](https://dev.twitch.tv/docs/api/reference/#get-clips-download) (`GET /helix/clips/downloads`), que retorna URLs temporárias para baixar as versões landscape/portrait de até 10 clips por chamada. Esse endpoint exige `editor:manage:clips` ou `channel:manage:clips`, além de `broadcaster_id`, `editor_id` e `clip_id`; a integração local ainda precisa comprovar autorização e download pelo Sentry. Como a resposta contém URLs temporárias, buscar o arquivo quando houver orçamento para processá-lo, em vez de guardar a URL temporária na fila. O download é do próprio clip e não depende do VOD de origem. O OAuth atual da VPN não deve receber novos escopos silenciosamente.

### Autorização incremental e papel de editor

O vínculo Twitch inicial continua usando escopos vazios. Quando o usuário ativa processamento de clips, o Monitor explica a finalidade e inicia uma nova autorização Twitch. O browser envia somente um identificador de capacidade permitido (inicialmente `clip_download`); o Sentry mapeia esse identificador para `channel:manage:clips`, sem aceitar listas arbitrárias de escopos do cliente. O callback confirma que a identidade Twitch continua sendo a do canal vinculado, valida que o escopo solicitado foi realmente concedido e registra os escopos concedidos. Não habilitar download nem substituir a credencial existente se a pessoa recusar, autorizar outra conta ou retornar sem a permissão necessária; manter a conexão anterior funcional e apresentar uma ação para tentar novamente.

Esse fluxo exige uma rota de reautorização para uma conexão já ativa: o endpoint atual solicita escopos vazios e só aceita `scopes.length === 0`, portanto não atende a atualização. A renovação de capacidade deve preservar state/nonce, consentimento explícito, validação do `client_id` e a credencial válida anterior até que o novo token e a permissão sejam verificados. Persistir o conjunto de escopos junto ao vínculo e verificar a permissão novamente antes de cada chamada protegida. Recusar o escopo requerido deixa o recurso desabilitado, sem desconectar o canal.

O caminho escolhido é o token do próprio broadcaster com `channel:manage:clips`, limitado aos clips cujo `broadcaster_id` corresponda ao canal vinculado. Se a VPN optar por baixar clips de outros canais usando VPN_RP como conta de serviço, essa conta precisa ter o papel Editor em cada canal e autorizar o aplicativo com `editor:manage:clips`. A Twitch não oferece endpoint para adicionar ou remover editores: a documentação pública oferece somente leitura da lista via `Get Channel Editors`; o dono precisa atribuir o papel manualmente em Creator Dashboard → Community → Roles Manager → Add New → Editor ([instruções oficiais](https://help.twitch.tv/s/article/Managing-Roles-for-Your-Channel?language=en_US)). O Monitor pode exibir esses passos e um botão para abrir o Twitch, mas não deve alegar que cadastrou o editor por API. Essa alternativa fica fora do fluxo inicial: o modelo atual associa uma identidade Twitch exclusiva a cada usuário VPN, então uma credencial central VPN_RP compartilhada entre streamers requer desenho próprio de credencial de serviço e isolamento multi-tenant.

O clipe `vpn: test` usado como exemplo tem `janetmariarp` como broadcaster e `VPN_RP` como criador do clip. A permissão necessária é determinada pelo broadcaster, não por quem clicou para criar o clip; o vínculo de `janetmariarp` com `channel:manage:clips` é o caminho padrão para esse teste. A barreira +18 que a Twitch apresenta a visitantes não autenticados é alinhada à política VPN. A navegação anônima não expôs faixas de captions e não serve como prova de disponibilidade de texto; a validação da mídia deve usar o fluxo autorizado sem tentar contornar a barreira de idade.

Antes de aprovar ingestão ampla, provar: submissão de um link Twitch, obtenção do ID, validação de `broadcaster_id`, espera pela disponibilidade, download autenticado pelo fluxo suportado, limites de duração/tamanho, expiração do link temporário e sanitização de logs. Se não houver fluxo de mídia estável que respeite consentimento e escopos, bloquear ingestão por URL até encontrar uma opção suportada; não recorrer a extração de página ou URL de CDN não documentado.

## Reutilizar legendas da Twitch antes do Whisper

A API Helix `Get Clips` retorna URL, IDs, offset, duração e outros metadados, mas não documenta campos de legenda ou transcrição. `Get Clips Download` fornece o arquivo de mídia, não texto transcrito. Portanto, o Sentry não pode pedir à API uma transcrição pronta do clip. A ausência de texto na resposta Helix também não prova que o clip não tenha legendas no player.

A Twitch documenta o evento JavaScript [`Twitch.Player.CAPTIONS`](https://dev.twitch.tv/docs/embed/video-and-clips/), que emite texto sincronizado quando legendas existem no conteúdo reproduzido por um player interativo de live/VOD. A documentação dos clips descreve um player separado, não interativo e sem essa API JavaScript. A orientação de uso da plataforma deve instruir o streamer a habilitar captions na configuração de clips e selecioná-las na criação; para testar a rota do player, também deve habilitar armazenamento e publicação de VODs. Se a própria integração criar clips, deve usar a configuração de canal que inclua captions por padrão quando disponível; a API de criação não documenta um parâmetro explícito de captions, então isso também precisa ser validado. O [`Get Clips`](https://dev.twitch.tv/docs/api/clips/) fornece `video_id` e `vod_offset` para localizar o clip no VOD, mas pode retornar vídeo vazio e offset nulo quando o VOD não existe ou ainda não foi criado.

Diretriz de produto: captions da Twitch são o caminho padrão e sem custo de ASR. O evento do player, contudo, é uma interface de playback no browser, não uma API de transcrição em lote para o worker Node.js. Além disso, VODs têm retenção limitada; se o texto só puder ser obtido pelo VOD, a fila de dias ou meses pode ultrapassar a disponibilidade da fonte. Antes de prometer detecção automática captions-first, a integração deve provar que consegue obter texto e timestamps de um clip criado com captions habilitadas, usando uma interface oficial e sem depender de VOD além de sua retenção. Se não houver interface suportada, manter o clip como `needs_transcription_request` e deixar Whisper disponível somente por ação do usuário; não recorrer a scraping de página, endpoints privados/não documentados ou OCR de captions queimadas na imagem.

O primeiro teste positivo ainda precisa usar um clip criado com captions habilitadas; os dez exemplos fornecidos não são controle positivo. O teste deve comparar captions do player/clip com o áudio conhecido e verificar timestamps, disponibilidade após expiração do VOD e acesso pelo fluxo autorizado do Sentry. Só adotar captions no processamento automático se a obtenção for suportada e não exigir que o streamer mantenha uma página aberta.

As legendas de clips Twitch são variáveis: a Twitch informa que clips feitos pela ação rápida ou por Auto Clips incluem captions por padrão; outros clips dependem de a opção ter sido selecionada na criação e habilitada nas configurações do canal ([instruções oficiais](https://help.twitch.tv/s/article/how-to-use-clips)). Em 2026-10-18, os dez clips iniciais fornecidos pelo usuário abriram e reproduziram no player. No navegador, nenhum expôs faixa `textTracks`/`<track>`, controle de closed captions ou requisição de arquivo de legenda. Um deles informava que o VOD e o replay do chat haviam expirado, enquanto o arquivo do clip continuava reproduzível. Um clip adicional de título `vpn: test` teve os metadados da página carregados; a Twitch exigiu login para continuar por ser conteúdo adulto. Essa barreira é esperada e alinhada à política +18 do VPN, não uma falha do produto. A navegação anônima não observou captions, então o exemplo não é controle positivo nem permite concluir se há texto acessível no fluxo autenticado. A Auto Clips permanece descrita como alfa por convite e restrita a canais com idioma de transmissão inglês e VOD público. Portanto, a orientação ao usuário reduz a ausência de captions, mas não elimina a necessidade do teste positivo da integração. Cada submissão deve registrar a origem do texto (`twitch_captions` ou `whisper`) e a versão/regra aplicada.

## Fila e execução

Recomendação: Supabase Queues (`pgmq`) como fila privada e durável, com mensagens pequenas contendo IDs internos. A fila é pull-based e FIFO; contém tarefas de captions e pedidos explícitos de Whisper, nunca transcrição automática de todo clip sem captions. O consumidor Node.js fica em `vpn-sentry` e é acionado por uma chamada interna agendada seguindo o padrão de Cron já existente. Cada execução processa um número pequeno e limitado de mensagens; Edge Functions do Supabase não executam o modelo.

Como mensagens podem reaparecer após seu período de visibilidade, os efeitos no banco, armazenamento e geração de eventos precisam ser idempotentes. Usar retries limitados, backoff, dead-letter/arquivamento com metadados sanitizados e limite de jobs em execução. Uma falha do dispatcher ou esgotamento da cota não remove o registro pendente; ele pode ser reenfileirado. Não criar worker permanentemente ligado nem processamento ilimitado em uma única Function.

## Dados, privacidade e segurança

- Consentimento para monitorar eventos Twitch da Fase 1 não autoriza por si só criação de clips, processamento de áudio ou retenção de transcrições. Apresentar consentimento específico, finalidade, modo manual/agendado, duração, retenção, escopos incrementais e revogação. Para GTA RP, informar a classificação +18 e que a tela de idade da Twitch é esperada.
- O consentimento de captura inclui persistir URL/ID e metadados Twitch durante a espera pelo processamento. A UI informa que referências podem aguardar dias ou meses; captions devem ser verificadas assim que o clip chega, pois o VOD de origem tem retenção limitada. Whisper só acontece mediante pedido visível do usuário.
- A revogação bloqueia novas solicitações e novos downloads imediatamente. Jobs já enfileirados devem verificar consentimento novamente antes de baixar e antes de persistir resultados.
- Aceitar apenas IDs/URLs Twitch suportados. Validar host, protocolo, redirect, ID do canal e tipo/tamanho obtidos por API; não seguir redirects arbitrários. Remover query strings e tokens de logs.
- Buckets de mídia, se aprovados na issue #14, são privados e recebem somente objetos com limite e expiração. A URL Twitch nunca é exposta como acesso permanente ao Monitor.
- Coletar somente áudio/falas necessários ao propósito aprovado; transcrição integral, áudio e vídeo não aparecem em resposta pública, analytics ou logs.
- Alertas e respostas automáticas não contatam serviços de emergência ou terceiros sem confirmação humana explícita.

## Estados e erros observáveis

Solicitação: `pending_metadata`, `pending_captions`, `needs_transcription_request`, `pending_asr`, `processing`, `completed`, `no_match`, `source_unavailable`, `failed_retryable`, `failed_terminal`, `cancelled_consent`. `pending_captions` é a tentativa automática da fonte Twitch; `needs_transcription_request` significa que faltam captions acessíveis e o usuário ainda não pediu Whisper; `pending_asr` só existe após pedido explícito e é apresentado como “aguardando capacidade” se a cota estiver pausada. A UI explica o consumo antes do pedido e não cria Whisper automaticamente pela chegada de clip ou ociosidade do worker. Quando a cota voltar, jobs já pedidos explicitamente podem ser retomados. Exibir mensagens simples para limite de armazenamento que impede novas submissões, clip indisponível, duração/tamanho excedidos e erro temporário. Guardar razão operacional sanitizada, tentativas, timestamps e duração de CPU sem conteúdo de áudio.

Uma falha de ASR não cria um evento negativo. Clip sem áudio, idioma sem suporte, timeout ou resposta inválida termina com estado de erro apropriado, preserva apenas a referência de origem permitida e libera recursos temporários.

## Critérios de aceitação para a futura implementação

- O caminho Twitch URL → validação de canal → download de mídia pelo método suportado funciona com OAuth e consentimento explícitos, sem aceitar destino arbitrário.
- O caminho captions-first é validado com um clip positivo criado com captions habilitadas, incluindo origem, texto, timestamps e disponibilidade sem exigir VOD além da retenção; sem essa prova, o Sentry não anuncia detecção automática de captions.
- Clip sem captions acessíveis fica em `needs_transcription_request`; Whisper só entra na fila após ação do usuário e mostra cota/estado antes de aceitar o pedido.
- O worker Node.js processa um job sob limites de pacote, memória, duração e orçamento real da Vercel; Supabase Edge não roda inferência.
- Dez streamers de teste simulados, com a política de amostragem escolhida, permanecem abaixo do orçamento mensal conservador, considerando a CPU total do projeto e não apenas o ASR.
- Limite diário por canal, orçamento global de ASR, concorrência, retries e comportamento de pausa/retomada têm testes automatizados.
- Toda referência Twitch válida aceita fica registrada antes de verificar disponibilidade de CPU; clip sem captions fica disponível para solicitação explícita de Whisper, e falta de orçamento deixa pedidos feitos pendentes sem descartá-los.
- O dispatcher reconstrói mensagens da fila a partir da tabela de submissões sem duplicar trabalho ou apagar metadados.
- Deduplicação Twitch e idempotência impedem evento ou mídia duplicados sob reentrega e concorrência.
- Revogação antes e durante a fila impede novos downloads e persistência; limpeza ocorre também em erro e timeout.
- RLS, permissões da fila privada, Storage privado, contratos e tipos gerados passam nos checks do monorepo.
- Termos, onboarding e revisão explicam a configuração necessária de captions/VOD, que a detecção depende da disponibilidade dessas captions, que a amostragem de 15 minutos é parcial e que Whisper é sob demanda, pode atrasar e consome cota.
- Referências e pedidos pendentes seguem retenção e exclusão aprovadas na issue #14; a interface não promete que a Twitch manterá o clip/VOD disponível por dias ou meses.
- Monitoramento de espaço do banco alerta e suspende captura agendada antes da cota Free; a UI explica quando não for possível aceitar novas referências até liberar espaço.

## Entrega em etapas

- **Issue #14 — Persistência privada, consentimento e retenção:** persistir a fila de submissões e metadados Twitch; decidir retenção após processamento, consentimento específico e acesso. Pendências permanecem até processamento ou exclusão solicitada, com o limite físico gratuito monitorado.
- **Issue #15 — Ingestão de clips:** provar resolução e download de clip Twitch, então implementar entrada manual e, se escopos/capacidade forem aceitos, criar clips amostrados pela API. Fazer teste curto de capacidade do runtime já no Preview.
- **Issue #16 — Worker:** fila Supabase privada e consumidor Node.js limitado; provar a disponibilidade de captions por uma interface oficial e usá-las como caminho padrão de detecção. Clips sem captions ficam sem transcrição até o usuário solicitar Whisper no Monitor; respeitar cota global e limites por canal, sem fallback automático.
- **Issues #17–#19 e #20:** API privada de eventos, revisão no Monitor, validação ponta a ponta e alertas, preservando limites e consentimentos aprovados.

## Fontes oficiais verificadas em 18/10/2026

- [Vercel Hobby: cota de 4 horas de CPU ativa](https://vercel.com/docs/plans/hobby)
- [Vercel Functions: duração, memória, tamanho de pacote e payload](https://vercel.com/docs/functions/limitations)
- [Supabase Edge Functions: limites de CPU e memória](https://supabase.com/docs/guides/functions/limits)
- [Supabase Queues e PGMQ](https://supabase.com/docs/guides/queues) e [API de PGMQ](https://supabase.com/docs/guides/queues/pgmq)
- [Cotas de banco Supabase](https://supabase.com/docs/guides/platform/billing-on-supabase) e [modo somente leitura acima de 500 MB no Free](https://supabase.com/docs/guides/platform/database-size)
- [Twitch Clips](https://dev.twitch.tv/docs/api/clips/), [Get Clips Download e escopos](https://dev.twitch.tv/docs/api/reference/#get-clips-download) e [criação de clips](https://dev.twitch.tv/docs/api/reference)
- [Escopos Twitch](https://dev.twitch.tv/docs/authentication/scopes/) e [Get Channel Editors](https://dev.twitch.tv/docs/api/reference/#get-channel-editors)
- [Player JavaScript Twitch: evento `CAPTIONS` e playback interativo de VOD](https://dev.twitch.tv/docs/embed/video-and-clips/)
- [Auto Clips e condições das captions](https://help.twitch.tv/s/article/auto-clips?language=en_US) e [legendas em clips](https://help.twitch.tv/s/article/how-to-use-clips?language=en_US)
- [Armazenamento, publicação e retenção de VODs](https://help.twitch.tv/s/article/video-on-demand?language=pt_BR)
