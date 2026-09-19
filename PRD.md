# PRD — VPN: rede de monitoramento e inteligência para roleplay

## Visão geral

VPN significa **Virtual Private Network**. Neste produto, a VPN é uma rede
privada de monitoramento de transmissões de roleplay, não uma solução de túnel
de rede ou acesso remoto.

O produto conecta streamers, redação e comunidades de roleplay em torno de
transmissões autorizadas. O primeiro núcleo é uma central privada que acompanha
lives publicadas em plataformas externas, começando pela Twitch, detecta sinais
de interesse e distribui alertas controlados. A publicação jornalística e a
programação contínua são evoluções construídas sobre essa rede de sinais,
eventos e evidências.

## Arquitetura do monorepo

O produto é organizado em projetos independentes que compartilham contratos e
tipos:

| Projeto | Responsabilidade | Superfície |
| --- | --- | --- |
| `vpn-news` | Portal público, redação editorial e overlays | Pública e editorial |
| `vpn-monitor` | Sessões monitoradas, convites, eventos e alertas | Privada |
| `vpn-sentry` | Backend privado, integrações com provedores e workers de processamento | Privada, API e execução assíncrona |
| `packages/contracts` | Contratos REST/OpenAPI compartilhados entre aplicações | Compartilhada |
| `packages/database` | Tipos gerados para o banco de dados | Compartilhada |

As migrações, políticas e configuração do Supabase permanecem em `supabase/`
na raiz. O `vpn-news` mantém o fluxo editorial já existente; o `vpn-monitor`
é a nova central privada; e o `vpn-sentry` concentra operações que não devem
ser executadas diretamente no navegador, como OAuth, integrações e workers.

As superfícies devem depender de `packages/contracts` para formatos de API,
erros, eventos e estados compartilhados. Tipos de banco gerados não devem ser
editados manualmente.

## Problema

Lives de roleplay contêm acontecimentos relevantes, mas hoje estão dispersas
entre canais e comunidades. A redação não possui uma visão central de quem está
ao vivo, não consegue compartilhar alertas de forma estruturada e precisa
identificar manualmente os momentos que podem exigir atenção ou virar matéria.

## Objetivos

- Centralizar o monitoramento privado de lives autorizadas.
- Permitir que cada streamer controle quem pode acompanhar sua transmissão.
- Detectar sinais de possível risco usando áudio e vídeo.
- Distribuir notificações dentro da VPN e no Discord.
- Criar uma base de eventos, clips e evidências para posterior trabalho
  editorial.
- Manter a arquitetura aberta para integrações futuras com outros provedores,
  plugins locais, agentes nativos e mensagens in-game.

## Não objetivos do primeiro ciclo

- Substituir Twitch, Kick ou YouTube como plataforma de transmissão.
- Receber ou retransmitir o sinal de vídeo como um servidor de streaming próprio.
- Controlar OBS ou operar a produção audiovisual do streamer.
- Publicar automaticamente matérias sem revisão.
- Enviar alertas para autoridades reais fora do contexto de roleplay.
- Interpretar a barra de vida com precisão garantida desde a primeira versão.
- Criar imediatamente um plugin ou executável local.

## Públicos

| Público | Necessidade |
| --- | --- |
| Streamer | Conectar sua conta Twitch, autorizar monitoramento e controlar acessos |
| Dono da transmissão | Receber alertas e gerenciar sua lista de transmissão |
| Administrador VPN | Monitorar sinais autorizados e receber todos os alertas |
| Contato autorizado | Receber avisos de transmissão e possíveis riscos |
| Redação | Revisar eventos, clips e evidências para criar conteúdo |
| Comunidade FiveM | Receber notificações por Discord e, futuramente, dentro do jogo |

## Privacidade e modelo de acesso

Toda transmissão é privada por padrão. O acesso inicial pertence ao dono da
transmissão e ao administrador VPN.

O dono pode criar convites com:

- validade definida;
- escopo limitado;
- possibilidade de revogação;
- acesso a uma transmissão ou sessão específica.

Em uma fase posterior, o dono poderá manter uma lista de transmissão
persistente. Essa lista aceitará usuários da VPN e contatos vinculados ao
Discord. O dono controlará os destinatários e suas permissões.

Nenhuma transmissão será indexada publicamente ou exibida no portal público sem
autorização explícita.

## Escopo do MVP

### Conta e Twitch

- Cadastro e autenticação de usuário na VPN.
- OAuth com Twitch.
- Identificação do canal autorizado.
- Ativação e desativação do monitoramento pelo dono.
- Estado do canal: offline, online, indisponível ou autorização expirada.

### Central privada

- Lista de transmissões autorizadas.
- Visão da transmissão e do streamer monitorado.
- Histórico de sessões monitoradas.
- Eventos detectados e seu estado de processamento.
- Evidências associadas, como clip, timestamp, trecho de áudio ou frame.
- Acesso administrativo completo para o operador VPN.

### Alertas

Os alertas devem ser enviados imediatamente para o administrador VPN, dono da
transmissão e destinatários autorizados.

O alerta deve ser tratado como **possível risco**, nunca como diagnóstico ou
certeza. Deve incluir, quando disponível:

- tipo do sinal detectado;
- horário;
- transmissão e streamer;
- nível de confiança;
- evidência ou referência ao clip;
- estado: novo, reconhecido, em análise, resolvido ou falso positivo.

### Sinais iniciais

- Personagem caído.
- Perseguição.
- Frases-chave cadastradas pelo streamer.
- Variação significativa na barra de vida observada no vídeo.
- Combinações relevantes entre sinais de áudio e vídeo.

### Notificações

O primeiro canal é o painel da VPN. O segundo é um servidor Discord oficial da
VPN, com um canal privado por streamer.

O modelo de expansão é:

```text
VPN → Discord oficial da VPN → bot em Discords externos → mensagem in-game
```

O bot/app para Discords externos e a integração com FiveM não fazem parte do
primeiro MVP, mas o modelo de eventos deve permitir esses destinos.

## Estratégia de inteligência

A validação inicial será feita com lives gravadas e clips, antes de exigir
análise contínua em tempo real.

O primeiro protótipo deve priorizar recursos gratuitos e regras simples:

- processamento periódico de frames;
- regiões configuráveis da tela;
- comparação temporal entre frames;
- detecção baseada em mudanças, não em interpretação completa de cada frame;
- transcrição ou busca de frases-chave;
- combinação de sinais com limiar de confiança.

A visão computacional será considerada experimental até que os testes mostrem
precisão suficiente. Detecções podem criar alertas, mas não devem executar ações
irreversíveis automaticamente.

Clips da Twitch são uma possível fonte de evidência e validação. A estratégia
exata para obter clips periódicos, analisar o sinal e associá-los à sessão deve
ser validada tecnicamente antes de virar requisito fechado.

## Jornalismo e conteúdo futuro

Eventos e evidências poderão originar:

- rascunhos de matérias;
- clips temáticos;
- compilados por cidade ou servidor;
- entrevistas e documentários;
- boletins e programas gravados;
- programação ao vivo em formato jornalístico 24/7.

No primeiro ciclo, a IA apenas sugere eventos, evidências e rascunhos. A
publicação final permanece sob revisão editorial.

O `vpn-news` continua responsável pela visualização de matérias com texto,
imagem e vídeo, incluindo páginas dedicadas por cidade/servidor. A central de
monitoramento em `vpn-monitor` é uma nova superfície privada sobre essa base
editorial, integrada ao backend e aos workers de `vpn-sentry` por meio dos
contratos compartilhados.

## Entidades iniciais

- `users`: contas VPN e papéis administrativos.
- `provider_connections`: OAuth e identidade do provedor, sem armazenar tokens
  em texto exposto.
- `channels`: canais monitoráveis e provedor de origem.
- `monitoring_sessions`: períodos em que um canal esteve sendo acompanhado.
- `access_invites`: convites, escopos, expiração e revogação.
- `notification_recipients`: usuários VPN e contatos Discord autorizados.
- `monitoring_events`: sinais detectados, confiança, estado e timestamps.
- `evidence`: clips, frames, áudio, transcrições e referências temporais.
- `notification_deliveries`: tentativas e resultados por canal.
- `editorial_items`: vínculo futuro entre eventos/evidências e matérias.

## Segurança e confiança

- OAuth deve usar escopos mínimos e permitir revogação.
- Tokens de provedores não podem aparecer em URLs, logs ou payloads públicos.
- RLS deve separar proprietário, administrador, convidado e público.
- Convites devem expirar e ser revogáveis.
- Toda detecção precisa registrar origem, versão da regra/modelo e confiança.
- Alertas devem deixar explícito que são possibilidades, com caminho para
  reconhecer, resolver ou marcar falso positivo.
- Evidências devem ter política de retenção e exclusão definida antes da escala.
- A VPN deve deixar claro que o monitoramento é autorizado pelo proprietário.
- `vpn-monitor` não deve conter segredos de provedores ou lógica de workers.
- `vpn-sentry` deve validar autorização e escopos antes de acessar provedores.
- APIs entre superfícies devem seguir os contratos publicados em
  `packages/contracts`.

## Fases

### Fase 0 — fundação

- Atualizar o modelo de produto e dados.
- Definir autenticação, papéis, consentimento e retenção.
- Validar a integração OAuth Twitch.
- Consolidar contratos REST/OpenAPI em `packages/contracts`.
- Definir as fronteiras entre `vpn-monitor`, `vpn-sentry` e `vpn-news`.

### Fase 1 — monitoramento privado

- Conectar canal Twitch.
- Detectar sessões online.
- Criar painel privado de canais e sessões em `vpn-monitor`.
- Implementar convites temporários.
- Expor no `vpn-sentry` a API necessária para a central privada.

### Fase 2 — evidências e alertas

- Processar clips ou gravações de teste em workers do `vpn-sentry`.
- Criar eventos de possível risco.
- Entregar notificações no painel e no Discord oficial.
- Criar histórico e estados de reconhecimento/resolução.

### Fase 3 — inteligência experimental

- Frases-chave configuráveis.
- Detecção de personagem caído e perseguição.
- Análise temporal de regiões da tela.
- Avaliação de precisão e falsos positivos.

### Fase 4 — rede e editorial

- Listas de transmissão persistentes.
- Bot para Discords externos.
- Vínculo entre eventos, evidências e matérias do `vpn-news`.
- Plugins/agentes locais para telemetria adicional.
- Integração futura com FiveM e programação 24/7.

## Critérios de sucesso iniciais

- Um usuário consegue conectar e revogar sua Twitch.
- Uma sessão monitorada permanece privada e acessível apenas aos autorizados.
- Um convite expirado não concede acesso.
- Uma sessão online gera estado correto na central.
- Um alerta chega ao painel e ao canal Discord correspondente.
- O alerta contém evidência e confiança quando disponíveis.
- O usuário consegue reconhecer e resolver um alerta.
- Nenhum token ou conteúdo privado aparece em logs ou superfícies públicas.
- O fluxo atual de matérias, imagens, vídeos e páginas por cidade continua
  funcionando.
- Os consumidores usam os contratos compartilhados sem divergência de payload.

## Decisões adiadas

- Estratégia final de acesso ao áudio e vídeo da live em tempo real.
- Processamento de clips periódicos versus outra fonte de frames.
- Provedor de visão computacional e transcrição.
- Retenção e custo de evidências.
- Sistema operacional e empacotamento de plugin/executável.
- Integração técnica com Discords externos e FiveM.
- Formato do canal jornalístico 24/7.
- Modelo final de hospedagem e execução dos workers.
- Limites de retenção e compartilhamento entre monitoramento e redação.
