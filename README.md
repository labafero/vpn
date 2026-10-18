# VPN Roleplay Monorepo

Monorepo do ecossistema VPN Roleplay.

## Projetos

- `vpn-news`: portal público, redação editorial e overlays OBS.
- `vpn-monitor`: portal privado para sessões, convites e alertas.
- `vpn-sentry`: API Nitro privada, integrações e workers.
- `packages/contracts`: contrato OpenAPI compartilhado.
- `packages/database`: tipos gerados do Supabase.

## Desenvolvimento

```bash
pnpm install
pnpm dev:news
pnpm dev:monitor
pnpm dev:sentry
pnpm lint
pnpm typecheck
pnpm build
```

As migrações e a configuração do Supabase permanecem em `supabase/` na raiz.

Para preparar uma máquina ou publicar com Codex, use as skills
[`vpn-environment`](.agents/skills/vpn-environment/SKILL.md) e
[`vpn-release`](.agents/skills/vpn-release/SKILL.md). O
[índice de ambiente e publicação](docs/operations/development-setup.md) aponta para os workflows.

## Fundação privada

Consulte [fundação](docs/architecture/foundation.md) para acesso, consentimento e retenção. O workspace vpn-site mantém o site institucional.
