# Fase 1 — evidências de validação

## Código e execução local

- Branch: `codex/fase-1-monitoramento-privado` (SHA registrado na PR após push).
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

Testes automatizados cobrem assinatura, replay/ordem EventSub, consentimento, deduplicação, reconciliação, limites de dono/admin/convidado, convite expirado/revogado/concorrente, proxy e contratos. O fluxo de UI local com duas contas reais não foi executado nesta etapa.

## Ambientes remotos

| Ambiente | Commit/domínio | Evidência | Reversão | Estado |
| --- | --- | --- | --- | --- |
| Preview/CI | A preencher após abertura da PR | CI e preview aguardam execução para o commit publicado | Descartar preview | Pendente |
| Supabase remoto `vpn` | Projeto existente | Migration não aplicada por esta PR | Revisar e aplicar migration reversa | Pendente |
| Cron remoto | `vpn-sentry.labafero.com` | SQL versionado; job desta fase não agendado | Remover somente `vpn-twitch-reconciliation` | Pendente |
| Produção | `vpn-monitor.labafero.com` / `vpn-sentry.labafero.com` | Não promovido por esta PR | Processo de entrega após revisão e autorização | Pendente |
| Evento Twitch real | Domínio Sentry de produção | Requer migration e configuração de EventSub implantadas | Desativar monitoramento e remover a subscription | Pendente |

Critérios de evento Twitch real e execução observável do Cron permanecem pendentes até implantação autorizada. CI verde e validação local não significam que a Fase 1 esteja concluída.
