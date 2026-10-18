# Prova de concorrência local

Executar depois de aplicar as migrations no Supabase **local**, com `VPN_LOCAL_DATABASE_URL` carregada de configuração privada. A URL precisa apontar a localhost/127.0.0.1 e o login local precisa poder criar/remover fixtures em `auth.users` e executar `SET ROLE vpn_sentry`. Na stack padrão, usar a conta local `supabase_admin`; o login `postgres` do runner não pode assumir esse papel.

```sh
pnpm exec vitest run --config vpn-sentry/integration/vitest.config.ts
```

O teste não integra a suíte sem dependências externas. Ele usa duas conexões reais sob `vpn_sentry` para inserir a mesma referência, revogar/reativar consentimento enquanto Helix está suspenso e bloquear um callback OAuth no advisory lock compartilhado. A observação de `pg_stat_activity.wait_event = advisory` comprova a espera antes de confirmar a retirada local. A fixture usa UUIDs aleatórios, tokens sintéticos criptografados e é removida em `finally`; não chama Twitch nem utiliza credenciais de produção.

Para obter a configuração, usar `supabase status -o json` de forma capturada por um processo local, sem imprimir chaves/URLs privadas nos logs. Não executar contra um projeto remoto. O teste falha explicitamente quando a URL ou os privilégios necessários não estão disponíveis.
