# Fase 1 — evidências de validação

## Código e execução local

- Branch: `codex/fase-1-monitoramento-privado`, [PR #6](https://github.com/labafero/vpn/pull/6).
- `pnpm install --frozen-lockfile`: passou; lockfile consistente.
- `pnpm dlx supabase@2.119.0 db reset --local`: passou; migration `20261010194553` aplicada.
- `pnpm dlx supabase@2.119.0 test db`: passou; 22 assertions pgTAP em 2 arquivos.
- `pnpm dlx supabase@2.119.0 migration list --local`: todas as 21 migrations locais alinhadas.
- `pnpm test:foundation`: passou; 78 testes em 16 arquivos.
- `pnpm contracts:check`: passou; contratos OpenAPI sincronizados.
- `pnpm lint`: passou para todos os workspaces.
- `pnpm typecheck`: passou para todos os workspaces.
- `pnpm build`: passou para os 4 aplicativos. Para `vpn-news`, foram carregadas apenas as variáveis públicas Supabase do `.env` local fora do worktree; valores não registrados.
- O validador de produção usa `pg_net`/Vault e verifica a URL customizada, os segredos e os privilégios de login antes de agendar. O job existente não foi alterado.

Testes automatizados cobrem assinatura, replay/ordem EventSub, consentimento, deduplicação, reconciliação, limites de dono/admin/convidado, convite expirado/revogado/concorrente, proxy e contratos. O fluxo de conexão e consentimento foi exercitado em produção com a conta Twitch `quilamcz`; o canal oficial `vpn_rp` é a conta do bot e não o canal monitorado.

## Ambientes remotos

| Ambiente | Commit/domínio | Evidência | Reversão | Estado |
| --- | --- | --- | --- | --- |
| Preview/CI | PR #6, mergeada em `8c455a9` | CI `ci` e `foundation-db` verdes; quatro previews Vercel concluídos. O smoke test da interface no preview protegido não foi executado. | Descartar previews | CI validado; smoke de preview não executado |
| Supabase remoto `vpn` | Projeto `VPN_RP` (`zxzigoaddoslkokbzmyc`) | Migration `20261010194553` aplicada via Supabase CLI; `migration list` confirmou as 21 migrations alinhadas. | Revisar e aplicar migration reversa | Aplicada e verificada |
| Cron remoto | `vpn-sentry.labafero.com` | `vpn-twitch-reconciliation` ativo em `15,45 * * * *`. Disparo autenticado via `pg_net` respondeu HTTP 200 (`checked: 1`) em 2026-10-10 21:49 UTC. | Remover somente `vpn-twitch-reconciliation` | Ativo e validado |
| Produção | `vpn-monitor.labafero.com` / `vpn-sentry.labafero.com` | Sentry implantado como produção READY no deployment `dpl_ZXLJJsnPoJuAPiqhyrY3b7uoGryW`; health respondeu HTTP 200. Segredo e callback EventSub configurados no ambiente Production da Vercel. | Reverter o deployment pela Vercel | Promovido e validado |
| Evento Twitch real | Canal `quilamcz`, webhook do Sentry de produção | Twitch entregou `stream.online` às 21:59:23 UTC e `stream.offline` às 21:59:50 UTC em 2026-10-10; ambos registrados como mensagens de webhook, não como eventos sintéticos de reconciliação. As duas subscriptions permaneceram habilitadas. | Desativar monitoramento e remover a subscription | Recebido e validado |

A Fase 1 foi concluída em produção em 2026-10-10: migration remota, Cron com resposta observável, subscriptions EventSub habilitadas e eventos Twitch reais de início e encerramento foram verificados. O fluxo de interface com duas contas reais continua fora desta validação operacional.

## Revalidação de status — 16 de outubro de 2026

- PR #6 está merged em `main` desde 10/10/2026, merge commit `8c455a937a3827d946b6c4d34473f0d72914ac00`. CI, `foundation-db` e os checks dos quatro projetos Vercel estão aprovados no head `9450369d2ca7dc0e572b6ec579c20b0122bd04da`.
- A exposição da API e a integração com a central foram exercitadas no preview Vercel de `codex/twitch-cron-skip-empty` (`vpn-monitor-1izq6g32u-anilson-lopes-projects.vercel.app` → `vpn-sentry-qq32fygrq-anilson-lopes-projects.vercel.app`). `GET /api/v1/health` do Sentry respondeu `200`; com uma sessão temporária de membro, o proxy do Monitor retornou `200` em `GET /api/sentry/me` (`role: member`) e `GET /api/sentry/channels` (`[]`). A conta de teste foi removida ao final (Auth Admin `DELETE` respondeu `200`). Nenhuma implantação foi disparada nesta validação.
- Status: **validação da API privada pela central concluída no preview; Fase 1 operacionalmente concluída**. O fluxo de interface com duas contas reais continua fora da validação, conforme escopo anterior. A próxima fase prevista no PRD é a Fase 2 — evidências e alertas.
