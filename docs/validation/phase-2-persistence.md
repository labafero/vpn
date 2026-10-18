# Validação da persistência de clips — Fase 2, issue #14

**Estado em 18/10/2026:** schema, retenção, pgTAP, PGlite e tipos Supabase validados localmente. Nenhuma migration ou rotina foi aplicada ao Supabase remoto.

## Implementado

- Migration `20261018173747_phase2_clip_persistence.sql` cria consentimento privado `clip-processing-v1`, submissões privadas com metadados allowlisted, estados e modos validados, chave única por canal/clip, índices e grants restritos ao papel `vpn_sentry`.
- A rotina `private.purge_expired_clip_submissions(p_now)` remove somente submissões em estado terminal com `finished_at` há pelo menos 90 dias. Referências pendentes não expiram por tempo.
- `supabase/operations/schedule-clip-retention.sql` documenta agendamento diário e remoção do Cron. Não foi executado.
- `packages/database/src/database.types.ts` foi regenerado do banco local com os dois tipos de tabela privada e a rotina de retenção; não houve edição manual.
- Nenhum arquivo de mídia ou transcrição é persistido.

## Evidências executadas

- `pnpm test:foundation`: **25 arquivos e 122 testes passaram**. A cobertura PGlite inclui negação de SELECT/INSERT/UPDATE/DELETE dos papéis anônimo/autenticado, CRUD privado pelo Sentry, FK de canal, unicidade, versão e revogação do consentimento, estados/modos inválidos, `finished_at` obrigatório nos estados terminais, e retenção dos cinco estados terminais antigos com preservação de pendências e processamentos antigos.
- O teste foi observado falhar antes da migration por ausência das tabelas; após a migration e função, a suíte passou.
- `supabase db reset --local`: passou, aplicando toda a cadeia local até `20261018173747_phase2_clip_persistence.sql`.
- `supabase test db --local`: **7 arquivos, 101 assertions passaram**, incluindo 33 testes da issue #14. A tentativa inicial expôs que o usuário do runner não pode `SET ROLE vpn_sentry`; pgTAP valida os privilégios efetivos com `has_table_privilege`/`has_function_privilege`, e PGlite executa as operações reais sob esse papel.
- `supabase gen types typescript --local --schema public,private,graphql_public`: passou. O CLI pediu formatação do arquivo gerado, executada com `oxfmt` conforme instrução do próprio gerador.
- `pnpm lint`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm format:check`: passaram após a geração dos tipos.
- `git diff --check`: passou antes dos commits de esquema e retenção.
- `supabase migration new` criou a migration usando Supabase CLI 2.119.0.

O SQL de Cron continua sendo uma operação manual e não foi executado. Nenhuma migration, job Cron ou configuração foi aplicada ao Supabase remoto.

## Revalidação e entrega em 18/10/2026

- Branch/worktree: `codex/issue-14-persistence`, `/home/anewkilla/worktrees/vpn-issue-14-persistence`; implementação revisada no commit `30b9dbc` e PR https://github.com/labafero/vpn/pull/23.
- O usuário forneceu nova execução de `supabase test db --local` nesse worktree: **7 arquivos, 101 testes, Result: PASS**, com Supabase CLI 2.119.0. Esta evidência foi executada no terminal do usuário, não pelo agente.
- O agente reexecutou `pnpm exec vitest run vpn-sentry/tests/foundation-db.test.ts`: **1 arquivo, 1 teste aprovado**. A tentativa de pgTAP do agente foi bloqueada por acesso negado ao socket Docker; não houve falha de assertion nem reset do banco.
- Revisão da PR não identificou bloqueios; a nota antiga de pgTAP pendente foi corrigida. A dependência PR #22 já foi integrada e a PR #23 tem `main` como base.
- O usuário autorizou os ajustes documentais, push, integração da PR #23 e encerramento da issue #14 ao solicitar a execução do plano. Migration remota, ativação do Cron e deploy manual continuam fora desta entrega.
