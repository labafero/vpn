# Validação da persistência de clips — Fase 2, issue #14

**Estado em 18/10/2026:** esquema e rotina de retenção implementados em branch; validação local pgTAP e geração dos tipos Supabase pendentes por falta do runtime local.

## Implementado

- Migration `20261018173747_phase2_clip_persistence.sql` cria consentimento privado `clip-processing-v1`, submissões privadas com metadados allowlisted, estados e modos validados, chave única por canal/clip, índices e grants restritos ao papel `vpn_sentry`.
- A rotina `private.purge_expired_clip_submissions(p_now)` remove somente submissões em estado terminal com `finished_at` há pelo menos 90 dias. Referências pendentes não expiram por tempo.
- `supabase/operations/schedule-clip-retention.sql` documenta agendamento diário e remoção do Cron. Não foi executado.
- Nenhum arquivo de mídia ou transcrição é persistido.

## Evidências executadas

- `pnpm test:foundation`: **25 arquivos e 122 testes passaram**. A cobertura PGlite inclui papéis anônimo/autenticado sem acesso privado, leitura pelo Sentry, consentimento inválido, FK de canal, unicidade, estados/modos inválidos, permissão da função de retenção e limpeza determinística que mantém itens pendentes e terminais recentes.
- O teste foi observado falhar antes da migration por ausência das tabelas; após a migration e função, a suíte passou.
- `git diff --check`: passou antes dos commits de esquema e retenção.
- `supabase migration new` criou a migration usando Supabase CLI 2.119.0.

## Pendente por runtime local

- `supabase test db --local` não conectou em `127.0.0.1:54322` (`ECONNREFUSED`). O comando `docker` informa que a integração WSL 2 do Docker Desktop não está habilitada nesta distro. O aplicativo Docker Desktop foi iniciado, mas a integração continua desativada. Por isso, `supabase db reset --local` e pgTAP ainda não executaram.
- `supabase gen types typescript --local --schema public,private,graphql_public` retornou `GenTypesLocalDbInspectError: failed to inspect service`; `packages/database/src/database.types.ts` não foi editado manualmente. Habilitar a distro `labafero` em Docker Desktop → Settings → Resources → WSL Integration; depois iniciar a stack, resetar o banco, rodar pgTAP e gerar os tipos.
- `pnpm --filter @vpn/sentry typecheck`, `pnpm contracts:check` e `pnpm format:check`: passaram.

Nenhuma migration, job Cron ou configuração foi aplicada ao Supabase remoto. A ausência do pgTAP e dos tipos atualizados é uma pendência real de entrega, não evidência de aprovação do schema PostgreSQL em runtime.
