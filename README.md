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
