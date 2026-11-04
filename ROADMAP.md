# Roadmap

As fases organizam a evolução do produto. Os PRDs por app, as ADRs aceitas e
[`docs/architecture/foundation.md`](docs/architecture/foundation.md) definem os
requisitos e decisões vigentes.

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
