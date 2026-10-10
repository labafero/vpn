# Fase 1 — monitoramento privado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ativar monitoramento Twitch consentido e oferecer sessões privadas e convites temporários no `vpn-monitor`.

**Architecture:** Supabase guarda sessões, convites, estado EventSub e deduplicação. `vpn-sentry` controla consentimento, Twitch webhooks, reconciliação e autorização; `vpn-monitor` usa proxy same-origin e contratos OpenAPI gerados. A atualização normal vem de EventSub e um job Supabase Cron reconcilia lacunas.

**Tech Stack:** pnpm workspace, Nuxt 4/Nitro, Vue, Nuxt UI v4, Valibot, Supabase Postgres/RLS/pg_cron, Twitch EventSub webhooks, OpenAPI 3.1, Vitest, PGlite e pgTAP.

**Spec:** `docs/superpowers/specs/2026-10-10-fase-1-monitoramento-privado-design.md`

## Global Constraints

- O consentimento `monitoring-v1` não ativa coleta; o dono deve aceitar `monitoring-v2` explicitamente e a ativação começa desligada.
- O monitoramento da Fase 1 armazena metadados de sessões apenas; não incorpora player nem captura áudio/vídeo.
- Convites são de uso único, vinculados a uma sessão ativa, expiram em 24 horas, armazenam somente hash e exigem usuário VPN autenticado.
- `vpn-sentry` autentica usuário e sessão atual e verifica autorização atual em toda operação privada; tokens e segredos nunca chegam ao browser.
- `vpn-monitor` chama Sentry somente pelo proxy same-origin; nenhuma tabela ou rota da Fase 1 é exposta por `vpn-news`.
- RLS permanece ativa em tabelas expostas; tabelas de segredo/deduplicação ficam no schema `private`, fora da Data API.
- `packages/contracts/openapi.yaml` é a fonte dos contratos; regenerar `packages/contracts/src/generated.ts` pelo script existente.
- `packages/database/src/database.types.ts` é gerado e não deve ser editado manualmente.
- Usar Supabase CLI `2.119.0` (versão já fixada no CI) e Docker Desktop para banco local; pgTAP é executado no container pelo CLI, sem instalar extensão separadamente.
- Criar migrations com `supabase migration new fase_1_monitoramento_privado`; usar o caminho com timestamp gerado pelo CLI.
- Seguir UI em português, Nuxt 4 no diretório `app/`, Valibot para entradas e lint como formatador.
- Usar Vercel/Supabase existentes e o domínio customizado de produção; não criar projeto, serviço, domínio ou ambiente.

## Review Focus

- Webhook EventSub com assinatura errada, timestamp fora da janela, ID repetido ou entrega fora de ordem não altera sessão; fixar em `vpn-sentry/tests/twitch-eventsub.test.ts`.
- Canal desativado, conexão expirada ou consentimento diferente de `monitoring-v2` não recebe evento nem consulta de reconciliação; fixar em `vpn-sentry/tests/monitoring-service.test.ts` e `vpn-sentry/tests/monitoring-cron.test.ts`.
- Dois usuários resgatando o mesmo convite simultaneamente resultam em exatamente um aceite; fixar em `vpn-sentry/tests/monitoring-db.test.ts`.
- Membro sem concessão, convite expirado/revogado e sessão encerrada não conseguem ler metadados; fixar em `vpn-sentry/tests/monitoring-api.test.ts` e `supabase/tests/monitoring.test.sql`.
- Token de convite, credencial Twitch e payload EventSub não aparecem em resposta ou log sanitizado; fixar em `vpn-sentry/tests/monitoring-api.test.ts` e `vpn-monitor/tests/monitoring-proxy.test.ts`.

---

### Task 1: Schema, consentimento e políticas de acesso

**Files:**
- Create: `supabase/migrations/<timestamp>_fase_1_monitoramento_privado.sql` (timestamp criado por `supabase migration new`)
- Create: `supabase/tests/monitoring.test.sql`
- Modify: `supabase/tests/foundation.test.sql`
- Modify: `vpn-sentry/tests/foundation-db.test.ts`
- Regenerate: `packages/database/src/database.types.ts`

**Interfaces:**
- Cria `private.monitoring_sessions`, `private.access_invites` e tabelas privadas de subscription/deduplicação, fora da Data API; somente `vpn_sentry` acessa dados de sessão no banco, enquanto Sentry aplica escopo de dono/admin/convidado.
- Adiciona `channels.monitoring_consent_version` e `channels.monitoring_consented_at`; exige `monitoring-v2` vigente para ativação e substitui a constraint que fixa `monitoring_enabled=false`, mantendo `DEFAULT false`.
- Define privilégios para `vpn_sentry` e impede leitura/escrita direta de qualquer sessão, convite ou subscription por clientes browser.

- [ ] **Step 1: Escrever casos SQL de segurança e invariantes** em `supabase/tests/monitoring.test.sql`: dono lê metadados; outro membro e `anon` não leem sessões/convites diretamente; admin lê metadados; `vpn_sentry` tem privilégios de persistência; monitoramento inicia falso; ativação exige `monitoring-v2`; sessão não duplica `provider_stream_id`; convite não pode ser reutilizado nem aceito após expiração/revogação/fim da sessão.
- [ ] **Step 2: Subir o Supabase local e rodar o teste SQL para confirmar falha** com `pnpm dlx supabase@2.119.0 start` e `pnpm dlx supabase@2.119.0 test db`; resultado esperado: falha apontando os objetos/constraints novos ausentes.
- [ ] **Step 3: Criar a migration pelo CLI** com `pnpm dlx supabase@2.119.0 migration new fase_1_monitoramento_privado` e implementar tabelas, grants, RLS/policies e alteração da constraint dentro do arquivo com timestamp gerado.
- [ ] **Step 4: Atualizar a expectativa antiga de monitoramento sempre desativado** em `supabase/tests/foundation.test.sql` e `vpn-sentry/tests/foundation-db.test.ts` para afirmar default falso, ativação condicionada ao consentimento e ausência de escrita direta por browser; aplicar a migration nova no teste PGlite após a migration da fundação.
- [ ] **Step 5: Regenerar tipos do banco e conferir histórico local** com `pnpm dlx supabase@2.119.0 gen types typescript --local --schema public,private,graphql_public` (redirecionar a saída para `packages/database/src/database.types.ts`) e `pnpm dlx supabase@2.119.0 migration list --local`.
- [ ] **Step 6: Rodar `pnpm exec vitest run vpn-sentry/tests/foundation-db.test.ts` e `pnpm dlx supabase@2.119.0 test db`**; ambos devem passar com os dados de teste isolados.
- [ ] **Step 7: Commitar migration, testes e tipos gerados** com `git add supabase/migrations supabase/tests/monitoring.test.sql supabase/tests/foundation.test.sql vpn-sentry/tests/foundation-db.test.ts packages/database/src/database.types.ts` e `git commit -m "feat: adiciona persistencia de monitoramento privado"`.

### Task 2: Serviço de sessões, EventSub e reconciliação no Sentry

**Files:**
- Create: `vpn-sentry/server/utils/twitch-eventsub.ts`
- Create: `vpn-sentry/server/utils/monitoring-service.ts`
- Create: `vpn-sentry/server/api/eventsub/twitch.post.ts`
- Create: `vpn-sentry/server/api/internal/twitch/reconcile.post.ts`
- Create: `vpn-sentry/workers/reconcile-twitch.mjs`
- Modify: `vpn-sentry/server/utils/private-database.ts`
- Modify: `vpn-sentry/server/utils/twitch-oauth.ts`
- Modify: `vpn-sentry/workers/index.mjs`
- Modify: `vpn-sentry/.env.example`
- Create: `vpn-sentry/tests/twitch-eventsub.test.ts`
- Create: `vpn-sentry/tests/monitoring-db.test.ts`
- Create: `vpn-sentry/tests/monitoring-service.test.ts`
- Create: `vpn-sentry/tests/monitoring-cron.test.ts`

**Interfaces:**
- `verifyTwitchWebhook(headers, rawBody, secret, now): VerifiedEventSubMessage | null` valida HMAC, timestamp e estrutura antes de chamar o serviço.
- `createMonitoringService(repository, gateway, clock)` retorna operações de canais, sessões, convites, `setMonitoring(userId, channelId, enabled, consent)`, `handleEvent(message)` e `reconcile(now)`; mutações de sessão e consumo de evento são atômicos no repositório.
- `FoundationRepository` recebe operações transacionais para ativação/consentimento, início/fim de sessão, convites de uso único em schema privado, deduplicação e seleção/reconciliação de canais ativos.
- `POST /api/eventsub/twitch` responde ao challenge Twitch e processa notificações sem autenticação de usuário, mas exige assinatura válida para notificações.
- `POST /api/internal/twitch/reconcile` usa `NUXT_TWITCH_CRON_SECRET`, segredo distinto de credenciais de usuário, compara estado atual e encerra/abre sessões sem duplicar.

- [ ] **Step 1: Escrever testes do verificador EventSub** para challenge válido, assinatura HMAC correta, assinatura incorreta, timestamp antigo, corpo alterado, ID de mensagem repetido, payload malformado e ausência de log de segredo/corpo em `vpn-sentry/tests/twitch-eventsub.test.ts`.
- [ ] **Step 2: Executar `pnpm exec vitest run vpn-sentry/tests/twitch-eventsub.test.ts`** e confirmar falha porque `twitch-eventsub.ts` ainda não existe.
- [ ] **Step 3: Implementar `verifyTwitchWebhook`** usando raw body, comparação de assinatura em tempo constante e janela de timestamp definida pelo contrato Twitch; fazer o handler responder challenge e rejeitar mensagens não verificadas sem logar segredos/corpo.
- [ ] **Step 4: Escrever testes do serviço** em `vpn-sentry/tests/monitoring-service.test.ts`: ativação exige conexão e `monitoring-v2`; inscrição Twitch falha sem marcar ativo; evento online abre sessão; offline encerra a sessão correta; duplicação/ordem invertida são inofensivas; desativação encerra sessão e remove subscription; conexão inválida não é consultada.
- [ ] **Step 5: Rodar o teste do serviço** com `pnpm exec vitest run vpn-sentry/tests/monitoring-service.test.ts` e confirmar falha nos comportamentos ainda ausentes.
- [ ] **Step 6: Escrever testes PGlite do repositório** em `vpn-sentry/tests/monitoring-db.test.ts` para consumo atômico de evento e resgate concorrente do mesmo convite (um aceite e uma recusa).
- [ ] **Step 7: Executar `pnpm exec vitest run vpn-sentry/tests/monitoring-db.test.ts`** e confirmar falha nos métodos de persistência ausentes.
- [ ] **Step 8: Implementar repositório e serviço transacionais** em `private-database.ts` e `monitoring-service.ts`; registrar/limpar inscrição EventSub, validar estado atual antes de escrever e usar constraints como última barreira à duplicação.
- [ ] **Step 9: Escrever testes da rota Cron** em `vpn-sentry/tests/monitoring-cron.test.ts`: segredo ausente/errado recusa execução; segredo correto reconcilia apenas canais autorizados; erro parcial retorna falha sanitizada; sessões reconciliadas não duplicam.
- [ ] **Step 10: Executar `pnpm exec vitest run vpn-sentry/tests/monitoring-cron.test.ts`** e confirmar falha antes da rota/worker.
- [ ] **Step 11: Implementar `reconcile.post.ts` e `reconcile-twitch.mjs`** seguindo os padrões de `server/api/internal/twitch/validate.post.ts`, `workers/validate-twitch.mjs` e `workers/index.mjs`; limitar a consulta à lista de canais ativos em lotes permitidos pela Twitch e reconciliar sem duplicar sessão.
- [ ] **Step 12: Rodar os quatro arquivos de teste do Task 2 e `pnpm --filter @vpn/sentry typecheck`**; confirmar passagem e ausência de segredo/payload sensível nas respostas de falha.
- [ ] **Step 13: Commitar Sentry e testes** com `git add vpn-sentry` e `git commit -m "feat: monitora sessoes Twitch via EventSub"`.

### Task 3: API privada e contratos OpenAPI

**Files:**
- Modify: `packages/contracts/openapi.yaml`
- Modify: `packages/contracts/tests/openapi.test.ts`
- Modify: `packages/contracts/src/index.ts`
- Regenerate: `packages/contracts/src/generated.ts`
- Modify: `vpn-sentry/server/utils/api-error.ts`
- Create: `vpn-sentry/server/api/v1/channels/index.get.ts`
- Create: `vpn-sentry/server/api/v1/channels/[id]/monitoring.patch.ts`
- Create: `vpn-sentry/server/api/v1/sessions/index.get.ts`
- Create: `vpn-sentry/server/api/v1/sessions/[id].get.ts`
- Create: `vpn-sentry/server/api/v1/sessions/[id]/invites/index.get.ts`
- Create: `vpn-sentry/server/api/v1/sessions/[id]/invites/index.post.ts`
- Create: `vpn-sentry/server/api/v1/invites/[id].delete.ts`
- Create: `vpn-sentry/server/api/v1/invites/accept.post.ts`
- Create: `vpn-sentry/tests/monitoring-api.test.ts`

**Interfaces:**
- `PATCH /api/v1/channels/{id}/monitoring` recebe `{ enabled: true, consentVersion: "monitoring-v2", consentAccepted: true }` para ativar e `{ enabled: false }` para desativar.
- `GET /api/v1/channels` retorna somente canais do dono ou metadados visíveis ao admin.
- `GET /api/v1/sessions?channelId=&cursor=&limit=` lista sessões permitidas com paginação estável; `GET /api/v1/sessions/{id}` retorna metadados se dono/admin ou convidado válido.
- `POST /api/v1/sessions/{id}/invites` retorna token de aceite uma única vez e expiração; `GET` lista metadados sem token; `DELETE /api/v1/invites/{id}` revoga; `POST /api/v1/invites/accept` consome token atomicamente.
- Schemas OpenAPI `MonitoringChannel`, `MonitoringSession`, `AccessInvite`, `InviteCreated`, `InviteAccepted` e respostas paginadas são exportados em `packages/contracts/src/index.ts` a partir de `components` gerados.

- [ ] **Step 1: Escrever testes de contrato e API** em `packages/contracts/tests/openapi.test.ts` e `vpn-sentry/tests/monitoring-api.test.ts`; cobrir caminhos/métodos, propriedades fechadas, limites de paginação, sem autenticação 401, isolamento por proprietário, admin somente leitura, convidado somente sessão autorizada, consentimento inválido, revogação, resgate concorrente e `Cache-Control: no-store`/erros sem segredo.
- [ ] **Step 2: Executar `pnpm contracts:check`, `pnpm exec vitest run packages/contracts/tests/openapi.test.ts` e `pnpm exec vitest run vpn-sentry/tests/monitoring-api.test.ts`**; confirmar que operações e handlers ainda faltam.
- [ ] **Step 3: Definir schemas, operações, respostas e erros** em `packages/contracts/openapi.yaml`; usar limites de tamanho, request bodies sem propriedades adicionais e respostas sem hashes/credenciais. Declarar schemas `MonitoringChannel`, `MonitoringSession`, `AccessInvite`, `InviteCreated`, `InviteAccepted` e respostas paginadas.
- [ ] **Step 4: Gerar tipos com `pnpm contracts:generate` e exportar os schemas** em `packages/contracts/src/index.ts`.
- [ ] **Step 5: Implementar handlers** usando `requireVpnUser`, `privateResponse`, validação Valibot, serviço/repositório do Task 2 e erros `400/401/403/404/409/410/503` sanitizados em português; nenhuma autorização usa `user_metadata`/JWT role antigo.
- [ ] **Step 6: Rodar `pnpm contracts:check`, os dois arquivos de teste e `pnpm --filter @vpn/sentry typecheck`**; confirmar que todas as rotas OpenAPI correspondem aos handlers.
- [ ] **Step 7: Commitar API, contratos e testes** com `git add packages/contracts vpn-sentry/server vpn-sentry/tests/monitoring-api.test.ts` e `git commit -m "feat: expõe API privada de sessões e convites"`.

### Task 4: Proxy Monitor e central privada

**Files:**
- Modify: `vpn-monitor/server/utils/sentry-proxy.ts`
- Modify: `vpn-monitor/server/api/sentry/[...path].ts`
- Modify: `vpn-monitor/app/pages/index.vue`
- Create: `vpn-monitor/app/pages/sessoes/index.vue`
- Create: `vpn-monitor/app/pages/sessoes/[id].vue`
- Create: `vpn-monitor/app/pages/convites/aceitar.vue`
- Modify: `vpn-monitor/app/pages/conexao.vue`
- Create: `vpn-monitor/tests/monitoring-proxy.test.ts`

**Interfaces:**
- O proxy allowlist restringe paths e métodos às rotas aprovadas; mutações exigem Origin configurado e `X-VPN-CSRF: 1`.
- A página de conexão oferece ativação separada, com checkbox desmarcado, texto `monitoring-v2` e distinção visual entre Twitch conectado e monitoramento ativo.
- A central lista estados e histórico paginado; detalhe oferece metadados, criar/copiar/listar/revogar convite e aceitar convite autenticado.

- [ ] **Step 1: Escrever testes do proxy** em `vpn-monitor/tests/monitoring-proxy.test.ts`: paths não permitidos, método inválido, origem/CSRF ausente em mutação, identidade ausente, bearer VPN verificado, e token de convite ausente das respostas não autorizadas.
- [ ] **Step 2: Rodar `pnpm exec vitest run vpn-monitor/tests/monitoring-proxy.test.ts`** e confirmar que a allowlist atual recusa os novos endpoints.
- [ ] **Step 3: Atualizar allowlist e proxy** preservando cabeçalhos de sessão, `no-store`, CSRF e sanitização já usados em `vpn-monitor/server/utils/sentry-proxy.ts` e `vpn-monitor/server/api/sentry/[...path].ts`.
- [ ] **Step 4: Implementar páginas protegidas** com Nuxt UI v4 e Valibot, carregamento/erro/vazio, acessibilidade de status, paginação e controles de dono; aceitar token de convite sem persistir token em analytics/logs.
- [ ] **Step 5: Atualizar `index.vue` e `conexao.vue`** para direcionar à central e apresentar consentimento específico de monitoramento sem alterar o consentimento OAuth `monitoring-v1` já concluído.
- [ ] **Step 6: Rodar teste do proxy, `pnpm --filter @vpn/monitor typecheck` e `pnpm --filter @vpn/monitor lint`**; confirmar que nenhum player/iframe/script Twitch é carregado.
- [ ] **Step 7: Commitar UI e proxy** com `git add vpn-monitor` e `git commit -m "feat: cria central privada de sessoes Twitch"`.

### Task 5: Integração local, operação e passagem de fase

**Files:**
- Create: `supabase/operations/schedule-twitch-reconciliation.sql`
- Modify: `docs/operations/environments.md`
- Create: `docs/operations/phase-1-validation.md`
- Modify: `docs/architecture/foundation.md`

**Interfaces:**
- A operação cron registra o job de reconciliação no projeto Supabase existente, usando Vault e endpoint customizado; nenhuma credencial é impressa no log.
- O registro de validação distingue evidência local, preview, banco remoto, job remoto e produção conforme `docs/workflows/entrega.md`.

- [ ] **Step 1: Atualizar documentação operacional** com nomes das variáveis (`NUXT_TWITCH_EVENTSUB_SECRET`, segredo Cron, URLs por domínio), setup do webhook, desafio, agenda, estados recuperáveis e reversão de migration/job; não registrar valores secretos.
- [ ] **Step 2: Escrever/verificar `schedule-twitch-reconciliation.sql`** para rodar reconciliação a cada 30 minutos nos minutos 15 e 45, usando `pg_cron`/`pg_net` e o Vault existente; isso intercala o job OAuth já agendado nos minutos 0 e 30. Incluir SQL para consultar `cron.job` e `net._http_response`, e remover somente o job de reconciliação.
- [ ] **Step 3: Executar migrations e pgTAP localmente** com `pnpm dlx supabase@2.119.0 db reset --local` e `pnpm dlx supabase@2.119.0 test db`; conferir RLS, constraints, `pnpm dlx supabase@2.119.0 migration list --local` e tipos gerados sem editar manualmente.
- [ ] **Step 4: Executar testes da fundação** com `pnpm test:foundation`; depois `pnpm contracts:check`, `pnpm lint`, `pnpm typecheck` e `pnpm build` em sequência do pipeline estabelecido.
- [ ] **Step 5: Validar localmente o ciclo** com fixtures de webhook assinadas: ativar após consentimento, receber online, consultar painel, criar e resgatar convite com dois usuários, receber offline, confirmar revogação e reconciliação de sessão propositalmente obsoleta; na UI confirmar consentimento desmarcado, mensagens de erro/estado, paginação, convite expirado e ausência de qualquer player/iframe/script Twitch; remover fixtures e segredos temporários ao final.
- [ ] **Step 6: Registrar evidências e pendências** em `docs/operations/phase-1-validation.md`; para preview, remoto e job remoto, registrar commit, domínio, resposta/estado real e ação de reversão. Só validar produção depois da revisão da PR e autorização explícita para promover; não marcar Fase 1 como concluída sem evento Twitch real e job remoto comprovados.
- [ ] **Step 7: Commitar documentação e operação** com `git add supabase/operations docs/operations docs/architecture/foundation.md` e `git commit -m "docs: registra operacao da fase 1"`.

## Critérios de conclusão

- Cinco tasks concluídas com commits revisáveis e CI verde (`lint → typecheck → build`, contratos e testes de fundação incluídos).
- Testes cobrem assinatura/replay/ordem de EventSub, consentimento, deduplicação, falhas de reconciliação, limites de dono/admin/convidado, convite expirado/revogado/concorrente e vazamento de segredos.
- Migration e políticas foram aplicadas e verificadas no banco remoto correto, o job Cron executou com resposta observável e Twitch enviou eventos reais ao domínio de produção.
- UI usa metadados apenas e o Monitor distingue conexão Twitch de monitoramento ativo.
- PR contém evidências por ambiente e caminho de rollback; merge e alteração em produção continuam sujeitos ao processo de entrega e às autorizações existentes.
