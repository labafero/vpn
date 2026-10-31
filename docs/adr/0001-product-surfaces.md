# ADR-0001: Fronteiras das superfícies do ecossistema VPN

- **Estado:** Aceita
- **Data:** 2026-10-28
- **Substitui:** decisões distribuídas no PRD geral e nos designs de implementação

## Contexto

O monorepo contém aplicações com públicos e permissões diferentes. Requisitos
misturados fazem mudanças numa superfície introduzirem dados, UI ou acesso que
pertencem a outra.

## Decisão

- `vpn-news` mantém o portal público, redação e overlays OBS.
- `vpn-monitor` é a experiência autenticada para conexão, consentimento,
  monitoramento e revisão de sessões, clips e detecções.
- `vpn-sentry` é o backend privado para integrações, autorização de provedores,
  dados sensíveis e execução de workers; não é uma UI de produto.
- `vpn-site` é o portal institucional e a entrada de autenticação central. Nesta
  organização documental ele permanece coberto pelo PRD geral, sem PRD próprio.
- Contratos entre aplicações ficam em `packages/contracts`; tipos de banco
  permanecem gerados em `packages/database`.
- A redação publica conteúdo somente após revisão humana. Eventos do Monitor não
  publicam matérias automaticamente.

## Consequências

Cada subapp tem PRD próprio em `docs/product/`. Dados privados não são expostos
ao News por associação implícita; integração editorial futura exige contrato e
fluxo de revisão explícitos. A identidade visual compartilhada continua em
`DESIGN.md`.
