# PRD — VPN: rede de monitoramento e inteligência para roleplay

## Visão geral

VPN significa **Virtual Private Network**. Neste produto, a VPN é uma rede
privada de monitoramento de transmissões de roleplay, não uma solução de túnel
de rede ou acesso remoto.

O produto conecta streamers, redação e comunidades de roleplay em torno de
transmissões autorizadas. A central privada acompanha lives da Twitch, detecta
sinais de interesse e distribui alertas controlados. Eventos e evidências
alimentam fluxos editoriais com revisão humana.

## Arquitetura do monorepo

Este documento mantém a visão geral do ecossistema. Requisitos específicos ficam
nos [PRDs de News, Monitor e Sentry](docs/product/README.md); decisões
transversais aceitas ficam em [ADRs](docs/adr/).

O produto é organizado em projetos independentes que compartilham contratos e
tipos:

| Projeto              | Responsabilidade                                                       | Superfície                         |
| -------------------- | ---------------------------------------------------------------------- | ---------------------------------- |
| `vpn-site`           | Portal institucional e entrada de autenticação central                 | Pública                            |
| `vpn-news`           | Portal público, redação editorial e overlays                           | Pública e editorial                |
| `vpn-monitor`        | Sessões monitoradas, convites, eventos e alertas                       | Privada                            |
| `vpn-sentry`         | Backend privado, integrações com provedores e workers de processamento | Privada, API e execução assíncrona |
| `packages/contracts` | Contratos REST/OpenAPI compartilhados entre aplicações                 | Compartilhada                      |
| `packages/database`  | Tipos gerados para o banco de dados                                    | Compartilhada                      |

As migrações, políticas e configuração do Supabase permanecem em `supabase/`
na raiz. O `vpn-news` mantém o fluxo editorial já existente; o `vpn-monitor`
é a nova central privada; e o `vpn-sentry` concentra operações que não devem
ser executadas diretamente no navegador, como OAuth, integrações e workers.

As superfícies devem depender de `packages/contracts` para formatos de API,
erros, eventos e estados compartilhados. Tipos de banco gerados não devem ser
editados manualmente.

## Problema

Lives de roleplay contêm acontecimentos relevantes, mas estão dispersas entre
canais e comunidades. A redação precisa de uma visão central de transmissões
autorizadas e de alertas estruturados para identificar momentos que podem
exigir atenção ou virar matéria.

## Objetivos

- Centralizar o monitoramento privado de lives autorizadas.
- Permitir que cada streamer controle quem pode acompanhar sua transmissão.
- Detectar sinais de possível risco usando áudio e vídeo.
- Distribuir notificações dentro da VPN e no Discord.
- Associar eventos, clips e evidências a fluxos editoriais revisados.
- Definir contratos extensíveis para provedores, agentes locais e canais de
  notificação autorizados.

## Limites e não objetivos

- Substituir Twitch, Kick ou YouTube como plataforma de transmissão.
- Receber ou retransmitir o sinal de vídeo como um servidor de streaming próprio.
- Controlar OBS ou operar a produção audiovisual do streamer.
- Publicar automaticamente matérias sem revisão.
- Enviar alertas para autoridades reais fora do contexto de roleplay.
- Interpretar a barra de vida com precisão garantida.
- Operar por plugin ou executável local.
- Enviar notificações dentro do jogo.

## Públicos

| Público             | Necessidade                                                            |
| ------------------- | ---------------------------------------------------------------------- |
| Streamer            | Conectar sua conta Twitch, autorizar monitoramento e controlar acessos |
| Dono da transmissão | Receber alertas e gerenciar sua lista de transmissão                   |
| Administrador VPN   | Monitorar sinais autorizados e receber todos os alertas                |
| Contato autorizado  | Receber avisos de transmissão e possíveis riscos                       |
| Redação             | Revisar eventos, clips e evidências para criar conteúdo                |
| Comunidade FiveM    | Receber notificações autorizadas por Discord                           |

## Privacidade e modelo de acesso

Toda transmissão é privada por padrão. O dono da transmissão e o administrador
VPN têm acesso conforme suas permissões; outras pessoas precisam de convite.

O dono pode criar convites com:

- validade definida;
- escopo limitado;
- possibilidade de revogação;
- acesso a uma transmissão ou sessão específica.

O acesso é concedido por sessão e por convite revogável. O produto não mantém
uma lista persistente de destinatários VPN ou Discord por canal.

Nenhuma transmissão será indexada publicamente ou exibida no portal público sem
autorização explícita.

## Escopo do produto

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

### Sinais considerados

- Personagem caído.
- Perseguição.
- Frases-chave cadastradas pelo streamer.
- Variação significativa na barra de vida observada no vídeo.
- Combinações relevantes entre sinais de áudio e vídeo.

### Notificações

Os canais de notificação são o painel VPN e o servidor Discord oficial, com um
canal privado por streamer.

O modelo de expansão é:

```text
VPN → Discord oficial da VPN → bot em Discords externos → mensagem in-game
```

Bots para Discords externos e integração com FiveM estão fora do escopo. Os
contratos de eventos não concedem acesso a esses destinos.

## Estratégia de inteligência

O produto VPN Monitor tem como núcleo detectar frases-gatilho e apresentar
ocorrências com timestamp para revisão humana. O Sentry transcreve clips pela
OpenAI: usa primeiro a chave central e, se ela não estiver configurada, a chave
individual do dono. Captions nativas da Twitch não são uma fonte de texto para
detecção neste escopo.

O processamento usa regras simples e determinísticas:

- processamento periódico de frames;
- regiões configuráveis da tela;
- comparação temporal entre frames;
- detecção baseada em mudanças, não em interpretação completa de cada frame;
- transcrição ou busca de frases-chave;
- combinação de sinais com limiar de confiança.

A visão computacional é experimental. Detecções podem criar alertas, mas não
executam ações irreversíveis automaticamente.

Clips autorizados da Twitch são uma fonte de evidência. Cada detecção mantém a
referência temporal e a origem necessárias para revisão.

## Uso editorial de eventos

Eventos e evidências apoiam fluxos editoriais, como:

- rascunhos de matérias;
- clips temáticos;
- compilados por cidade ou servidor;
- entrevistas e documentários;
- boletins e programas gravados;
- programação ao vivo em formato jornalístico 24/7.

A IA sugere eventos, evidências e rascunhos. A publicação final sempre exige
revisão editorial humana.

O `vpn-news` apresenta matérias com texto, imagem e vídeo, incluindo páginas
dedicadas por cidade/servidor. O `vpn-monitor` é a superfície privada de
monitoramento, integrada ao backend e aos workers de `vpn-sentry` por meio dos
contratos compartilhados.

## Entidades

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
- `editorial_items`: vínculo entre eventos/evidências e matérias.

## Segurança e confiança

- OAuth deve usar escopos mínimos e permitir revogação.
- Tokens de provedores não podem aparecer em URLs, logs ou payloads públicos.
- RLS deve separar proprietário, administrador, convidado e público.
- Convites devem expirar e ser revogáveis.
- Toda detecção precisa registrar origem, versão da regra/modelo e confiança.
- Alertas devem deixar explícito que são possibilidades, com caminho para
  reconhecer, resolver ou marcar falso positivo.
- Evidências têm política explícita de retenção e exclusão.
- A VPN deve deixar claro que o monitoramento é autorizado pelo proprietário.
- `vpn-monitor` não deve conter segredos de provedores ou lógica de workers.
- `vpn-sentry` deve validar autorização e escopos antes de acessar provedores.
- APIs entre superfícies devem seguir os contratos publicados em
  `packages/contracts`.

## Critérios de sucesso

- Um usuário consegue conectar e revogar sua Twitch.
- Uma sessão monitorada permanece privada e acessível apenas aos autorizados.
- Um convite expirado não concede acesso.
- Uma sessão online gera estado correto na central.
- Um alerta chega ao painel e ao canal Discord correspondente.
- O alerta contém evidência e confiança quando disponíveis.
- O usuário consegue reconhecer e resolver um alerta.
- Nenhum token ou conteúdo privado aparece em logs ou superfícies públicas.
- O fluxo de matérias, imagens, vídeos e páginas por cidade continua
  funcionando.
- Os consumidores usam os contratos compartilhados sem divergência de payload.

## Fundação detalhada

Regras de acesso, consentimento e retenção: [fundação](docs/architecture/foundation.md).
Vincular uma conta Twitch não habilita coleta; o monitoramento exige consentimento
separado do dono.
