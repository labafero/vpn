# Autenticação central da VPN Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralizar login e cadastro em `vpn.labafero.com` e compartilhar uma sessão Supabase entre Site, Monitor, News e os próximos apps VPN.

**Architecture:** As páginas públicas atuais do Site continuam públicas. O Site valida destinos de retorno no servidor e oferece login/cadastro por senha e Discord/Twitch. Um pacote sem dependências de framework contém validação de retorno, callback PKCE e opções de cookie usadas pelos três apps; cada app processa seu callback e mantém suas regras atuais de autorização.

**Tech Stack:** Nuxt 4, Nuxt UI 4, `@nuxtjs/supabase` 2.0.9, Supabase Auth SSR/PKCE, Valibot, Vitest e Playwright.

**Spec:** [Desenho aprovado](../specs/2026-10-18-central-vpn-auth-sso-design.md)

## Global Constraints

- O portal central é `https://vpn.labafero.com`; os destinos atuais são `https://vpn-monitor.labafero.com` e `https://vpn-news.labafero.com`.
- Os três apps usam o mesmo projeto Supabase, `cookiePrefix: sb-vpn-auth-token`, `maxAge: 28800` e opções SSR compatíveis; produção usa `Domain=.labafero.com`, `Secure` e `SameSite=Lax`; desenvolvimento local omite `Domain`.
- `return_to` aceita somente origens explícitas. O callback recebe apenas código PKCE e rota validada; tokens não são passados entre apps nem registrados.
- Cadastro cria usuário comum e não insere linhas em `user_roles` nem `editorial_members`. Não criar `vpn_admin`, migration ou promoção via `user_metadata`; News conserva seu gate editorial.
- Login Twitch não altera scopes, consentimento, callbacks nem tokens da conexão operacional Twitch no Monitor/Sentry.
- Textos de interface em pt-BR; erros de provedor são genéricos; não incluir secrets, códigos OAuth ou respostas brutas em logs.
- Não editar `packages/database/src/database.types.ts` manualmente.
- A prova de Preview em `vercel.app` não demonstra cookie entre subdomínios. O usuário já autorizou Vercel para validação e produção caso Preview não baste; usar o menor destino que prove todos os critérios e registrar a evidência. A entrega termina em branch/PR revisável; merge não faz parte desta autorização.

## Review Focus

- `return_to` com origem externa, userinfo, protocolo estranho, `//host`, barra invertida ou fragmento não pode sair da VPN; testar em Task 1 e no endpoint do Site em Task 2.
- O callback não pode falhar por cookie PKCE host-only, prefixo divergente ou middleware executado antes da troca do código; testar callback e opções em Task 3 e no navegador real em Task 5.
- Cadastro sem sessão por confirmação pendente deve exibir instrução de confirmação; cadastro com sessão imediata deve concluir o retorno; testar ambos em Tasks 2 e 5.
- Sair de um app deve invalidar a sessão nos outros; provar em browser em Tasks 4–5.
- Usuário autenticado sem `editorial_members` continua recebendo 403 em `/redacao`; provar em Tasks 4–5.

---

### Task 1: Políticas de retorno e cookie compartilhadas

**Files:**

- Create: `packages/auth/package.json`, `packages/auth/src/index.ts`
- Test: `packages/auth/tests/auth-redirect.test.ts`, `packages/auth/tests/supabase-cookie-options.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**

- `resolveAuthReturnTo(candidate: string | null | undefined, allowedOrigins: readonly string[], fallback: string): string` aceita apenas URL HTTP(S) com origem exata permitida, sem credenciais nem fragmento.
- `buildAuthCallbackUrl(returnTo: string, callbackPath?: string): string` cria callback na origem do destino e transfere `pathname + search` sem fragmento ou parâmetros OAuth (`code`, `access_token`, `refresh_token`, `token_hash`, `error`, `error_description`, `error_code`, `state`).
- `resolveAuthCallbackPath(candidate: string | null | undefined, fallback?: string): string` aceita somente caminho local iniciado por uma barra simples.
- `buildAuthPortalUrl(authPortalUrl: string, returnTo?: string, page?: 'entrar' | 'cadastro', authError?: boolean): string` gera a URL do portal e codifica `return_to`.
- `VPN_AUTH_COOKIE_PREFIX = 'sb-vpn-auth-token'` e `getSupabaseCookieOptions(environment: 'development' | 'preview' | 'production')` são usados igualmente nos três apps; todas as opções incluem `maxAge: 28800`.

- [x] **Step 1: Escrever testes falhando**: `rejectsUnapprovedAuthReturnTargets` rejeita origem externa, `//host`, userinfo, protocolo inesperado, barra invertida e fragmento; `buildsAppCallbackWithoutHash` preserva `/conexao?tab=clips`; `resolvesOnlyLocalCallbackPaths` rejeita URL absoluta e `//host`; `buildsCentralLoginUrl` codifica o retorno e inclui `auth_error=1` somente quando solicitado; `usesSharedCookieOptions` espera Domain ausente em desenvolvimento/Preview, `.labafero.com` em produção, `path: '/'`, `maxAge: 28800`, `sameSite: 'lax'`, prefixo `sb-vpn-auth-token` e Secure em Preview/produção.
- [x] **Step 2: Confirmar RED** com `pnpm exec vitest run packages/auth/tests/auth-redirect.test.ts packages/auth/tests/supabase-cookie-options.test.ts` — pacote/funções ausentes.
- [x] **Step 3: Implementar** o pacote puro em TypeScript, sem dependências Nuxt/Supabase; adicionar `packages/auth/tests/**/*.test.ts` e `vpn-site/tests/**/*.test.ts` ao `include` do Vitest. A lista de origens vem do chamador e a comparação é por `URL.origin` exata.
- [x] **Step 4: Confirmar GREEN** com o mesmo comando.
- [x] **Step 5: Commitar** `feat(auth): add shared auth policies`.

### Task 2: Portal central de entrar e cadastrar

**Files:**

- Modify: `vpn-site/package.json`, `vpn-site/nuxt.config.ts`, `vpn-site/.gitignore`, `pnpm-lock.yaml`
- Create: `vpn-site/.env.example`, `vpn-site/app/pages/entrar.vue`, `vpn-site/app/pages/cadastro.vue`, `vpn-site/app/utils/auth-actions.ts`
- Create: `vpn-site/server/api/auth/return-target.get.ts`
- Test: `vpn-site/tests/auth-actions.test.ts`, `vpn-site/tests/auth-return-target.test.ts`

**Interfaces:**

- Consome `@vpn/auth` da Task 1.
- `startOAuth(client, provider: 'discord' | 'twitch', callbackUrl)` chama `auth.signInWithOAuth` com o provider e `options.redirectTo` indicados.
- `signUpWithEmail(client, { email, password }, callbackUrl)` chama `auth.signUp` com `options.emailRedirectTo` e retorna se houve sessão imediata; a UI não exibe erro bruto.
- `GET /api/auth/return-target?return_to=...` responde `{ returnTo: string }`, validado no servidor contra `NUXT_AUTH_RETURN_ORIGINS`; se ausente ou inválido, usa `https://vpn.labafero.com/`.

- [x] **Step 1: Escrever testes falhando** para Discord/Twitch encaminhados ao callback, signup incluindo `emailRedirectTo`, sessão imediata versus confirmação pendente e endpoint devolvendo fallback para origem externa/URL com `//`.
- [x] **Step 2: Confirmar RED** com `pnpm exec vitest run vpn-site/tests/auth-actions.test.ts vpn-site/tests/auth-return-target.test.ts`.
- [x] **Step 3: Adicionar a integração Supabase** ao Site com `@nuxtjs/supabase` 2.0.9, Valibot e `@vpn/auth`; definir `redirect: false` e `runtimeConfig.authReturnOrigins` como lista separada por vírgulas a partir de `NUXT_AUTH_RETURN_ORIGINS`; registrar as dependências no lockfile.
- [x] **Step 4: Implementar o endpoint de destino** usando `resolveAuthReturnTo`; criar `.env.example` com os nomes das variáveis necessárias e origens locais/prod, sem valores secretos.
- [x] **Step 5: Implementar as páginas** `/entrar` e `/cadastro`, com senha, confirmação de senha, botões Discord/Twitch e textos pt-BR. Consultar o endpoint antes de OAuth/cadastro e antes do redirect pós-login; mostrar instrução quando `signUp` não retorna sessão.
- [x] **Step 6: Confirmar GREEN** com os testes direcionados, `pnpm --filter @vpn/site lint` e `pnpm --filter @vpn/site typecheck`.
- [x] **Step 7: Commitar** `feat(site): add centralized VPN authentication portal`.

### Task 3: Cookie SSO e callback PKCE nos três apps

**Files:**

- Modify: `packages/auth/src/index.ts`, os três `nuxt.config.ts`, os três `package.json` e `pnpm-lock.yaml`
- Modify: `vpn-site/.env.example`, `vpn-monitor/.env.example`, `vpn-news/.env.example`
- Create: `vpn-site/app/pages/auth/callback.vue`, `vpn-monitor/app/pages/auth/callback.vue`, `vpn-news/app/pages/auth/callback.vue`
- Test: `packages/auth/tests/auth-callback.test.ts`

**Interfaces:**

- Todos configuram `cookiePrefix: VPN_AUTH_COOKIE_PREFIX`, `useSsrCookies: true` e `getSupabaseCookieOptions(...)`.
- `NUXT_PUBLIC_VPN_AUTH_URL` aponta ao portal; Site lê `NUXT_AUTH_RETURN_ORIGINS`. Local usa `127.0.0.1` nas portas dos três apps, portanto cookie host-only é compartilhado pelo hostname.
- `completeAuthCallback(exchange: (code: string) => Promise<{ error: unknown | null }>, code: string | null | undefined, candidatePath: string | null | undefined): Promise<{ ok: boolean; destination: string }>` troca via `auth.exchangeCodeForSession(code)` uma vez e sempre devolve destino local.
- Cada `/auth/callback` navega ao destino após sucesso e retorna ao portal com `auth_error=1` e texto genérico se faltar o código ou a troca falhar. A rota tem `ssr: false`.

- [x] **Step 1: Escrever testes falhando** em `packages/auth/tests/auth-callback.test.ts`: `completeAuthCallback` chama exchange uma vez, preserva `/conexao?tab=clips` e retorna `ok: false` para ausência/falha de código; `//evil.example` resolve para `/`.
- [x] **Step 2: Confirmar RED** com `pnpm exec vitest run packages/auth/tests/auth-callback.test.ts`.
- [x] **Step 3: Implementar `completeAuthCallback`** em `packages/auth/src/index.ts`; usar `resolveAuthCallbackPath` antes e depois da troca, sem interpolar erro Supabase.
- [x] **Step 4: Confirmar GREEN** com `pnpm exec vitest run packages/auth/tests/auth-callback.test.ts`.
- [x] **Step 5: Configurar a sessão compartilhada** nos três `nuxt.config.ts`, instalando `@vpn/auth` em Monitor/News e usando o mesmo prefixo/opções. Desabilitar `detectSessionInUrl` para evitar troca implícita duplicada.
- [x] **Step 6: Implementar os callbacks** client-only nos três apps; cada callback limpa parâmetros OAuth após troca e usa `buildAuthPortalUrl(authPortalUrl, safeReturnTo, 'entrar', true)` em caso de erro.
- [x] **Step 7: Confirmar GREEN** com testes direcionados, lint e typecheck dos três apps.
- [ ] **Step 8: Commitar** `feat(auth): share Supabase SSR session across VPN apps`.

### Task 4: Redirecionamentos, proteção e logout entre apps

**Files:**

- Modify: `vpn-monitor/app/middleware/auth.ts`, `vpn-monitor/app/middleware/accept-invite.ts`, `vpn-monitor/app/pages/login.vue`, `vpn-monitor/app/pages/conexao.vue`
- Modify: `vpn-news/app/middleware/auth.ts`, `vpn-news/app/middleware/editorial.ts`, `vpn-news/app/pages/login.vue`, `vpn-news/app/components/UserMenu.vue`
- Test: `vpn-monitor/tests/auth-middleware.test.ts`, novos testes de convite no Monitor e testes de middleware/editorial no News

**Interfaces:**

- Middleware sem sessão constrói `return_to` com origem do request mais `to.fullPath` e navega via `buildAuthPortalUrl(authPortalUrl, returnTo, 'entrar')`; o Site revalida a origem.
- `/login` legado do Monitor volta para `/conexao` quando não recebe destino; o do News volta para `/redacao`. Destinos recebidos devem ser caminhos locais.
- Logout executa `signOut()` e leva ao portal. Convite mantém token somente no `sessionStorage` do Monitor e retorna a `/convites/aceitar`.

- [ ] **Step 1: Escrever testes falhando**: rota/query preservadas para login anônimo; claims ausentes/anonymous bloqueiam Monitor; convite retorna à rota de aceite sem token na URL; ausência de sessão no News redireciona; usuário sem vínculo editorial recebe 403 e editor continua autorizado.
- [ ] **Step 2: Confirmar RED** com `pnpm exec vitest run vpn-monitor/tests/auth-middleware.test.ts vpn-monitor/tests/accept-invite.test.ts vpn-news/tests/auth-middleware.test.ts`.
- [ ] **Step 3: Atualizar gates e rotas legadas** para o portal, preservando query/path seguros e defaults definidos acima.
- [ ] **Step 4: Atualizar convite e logout** para conservar o estado local necessário e invalidar o cookie compartilhado; manter intactos o gate `editorial_members` e os fluxos/scopes Twitch operacionais.
- [ ] **Step 5: Confirmar GREEN** com testes direcionados, lint e typecheck Monitor/News.
- [ ] **Step 6: Commitar** `feat(auth): route VPN apps through central sign-in`.

### Task 5: Prova local, callbacks reais e entrega verificável

**Files:**

- Create: `vpn-site/tests/central-auth-browser.cjs`, `docs/validation/central-auth-sso.md`
- Modify: `vpn-site/package.json` (script `test:e2e:auth`)
- Atualizar configurações Supabase/Vercel somente após revalidar projeto, aplicativos, origens e valores públicos atuais; não alterar segredos de provider.

**Interfaces:**

- A prova de browser usa três apps em `127.0.0.1` com portas distintas e Supabase local/serviço real. Para provar o atributo de cookie `.labafero.com`, usar domínio Vercel controlado sob `labafero.com` ou produção; hosts `vercel.app` isolados não fecham esse critério.
- O usuário já autorizou deploy Vercel para teste e produção se Preview for insuficiente. Consultar a skill `vpn-release` na execução; registrar app, commit, deployment, URL, CI/build e observações sem tokens/códigos pessoais.

- [ ] **Step 1: Criar o teste de browser** para entrada/cadastro, confirmação via Inbucket quando habilitada, retorno ao destino, sessão Site→Monitor→News, 403 editorial para membro comum, acesso editorial para editor, logout em um app invalidando o outro e código callback inválido retornando erro genérico ao portal com o destino preservado. Fixtures ficam apenas no Supabase local e são removidas ao final; verificar que o cadastro não criou registro em `user_roles` nem em `editorial_members`.
- [ ] **Step 2: Formatar e validar o código**: `pnpm format`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm test:foundation -- --maxWorkers=1 --minWorkers=1` e `pnpm build`. Corrigir falhas relevantes antes de publicar ou registrar resultado.
- [ ] **Step 3: Executar integração local**: `pnpm exec supabase status -o json > /tmp/vpn-auth-supabase-status.json`; iniciar os três servidores; então executar `VPN_TEST_SUPABASE_STATUS=/tmp/vpn-auth-supabase-status.json pnpm --filter @vpn/site test:e2e:auth`. Não imprimir o arquivo de status, que contém chave administrativa.
- [ ] **Step 4: Conferir configuração remota** do projeto Supabase autenticado: URL principal, Discord/Twitch habilitados, confirmação de e-mail, redirect allowlist e envs Vercel (`NUXT_AUTH_RETURN_ORIGINS` no Site e `NUXT_PUBLIC_VPN_AUTH_URL` nos apps), sem imprimir valores. Adicionar somente callbacks `/auth/callback` necessários; remover callbacks locais temporários ao fim e conferir a lista final.
- [ ] **Step 5: Provar callbacks reais** Discord e Twitch e confirmação real de e-mail no ambiente escolhido. Se Preview não demonstrar `.labafero.com`, publicar os três apps no destino autorizado que permite a prova; mock ou inspeção de URL do provider não contam como callback validado.
- [ ] **Step 6: Registrar evidências** e limitações em `docs/validation/central-auth-sso.md`; executar `git diff --check`, revisar o diff e commitar `docs(auth): record central SSO validation`.

## Revisão do plano

A cobertura mapeia todas as decisões do desenho: portal e cadastro (Task 2), política de retorno (Tasks 1–2), cookie e PKCE (Task 3), login legado, convite, autorização editorial e logout (Task 4), provedores, confirmação de e-mail, configuração remota, validação Vercel e evidências (Task 5). Não há migration, promoção de papel ou alteração da conexão Twitch operacional. Os helpers são compartilhados via `@vpn/auth`; os callbacks recebem somente caminhos locais depois da validação de origem no portal. A prova local cobre cookie entre apps na mesma hostname em portas distintas; a prova publicada é obrigatória para o atributo de domínio entre subdomínios.
