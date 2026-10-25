# VPN Shared UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Share a VPN brand bar and visual tokens across Site, News, and Monitor, with cross-app navigation and the existing central Supabase session.

**Architecture:** Add `@vpn/ui` as a Vue/CSS workspace package containing brand tokens, the VPN mark, a responsive app bar, and pure navigation helpers. Each app supplies its environment URLs and current Supabase account state; its local shell handles sign-in and sign-out using `@vpn/auth` and its existing client. Keep editorial, city, monitor, and OBS content app-specific.

**Tech Stack:** pnpm workspaces, Nuxt 4, Nuxt UI v4, Tailwind CSS v4, Vue, Vitest, Playwright.

**Status:** publicada em produção nos projetos Site, News e Monitor em 24/10/2026. Evidências: [vpn-ui-shell-production-2026-10-24.md](../../validation/vpn-ui-shell-production-2026-10-24.md). Não houve merge ou push. A automação não tinha sessão autenticada para provar `/api/v1/me` com sucesso; o estado anônimo foi validado.

**Spec:** [2026-10-24-vpn-ui-shell-design.md](../specs/2026-10-24-vpn-ui-shell-design.md)

## Global Constraints

- UI copy remains in pt-BR.
- Reuse `@vpn/auth`, the existing Supabase cookie prefix/domain and current auth endpoints; do not pass tokens across apps.
- Preserve News city accent mapping from `corClasses` and each city's configured primary color.
- Keep `/overlay*`, `/auth/callback`, and redirect-only login routes free of the shared app bar.
- Do not change database schema, APIs, editorial authorization, Twitch scopes/consents, or Sentry behavior.
- Use the Site palette: `#ed1c24`, `#05090c`, Inter, and dark surfaces. Use Nuxt UI semantic colors for Nuxt UI controls.
- Local destinations use `127.0.0.1:3003` (Site), `127.0.0.1:3000` (News), and `127.0.0.1:3001` (Monitor); production destinations use the official `vpn.labafero.com`, `vpn-news.labafero.com`, and `vpn-monitor.labafero.com` origins. Allow per-environment overrides for Preview.

## Review Focus

- A malicious `return_to` in the app-bar sign-in link must still be rejected by the Site endpoint; test through `@vpn/auth` and the existing return-target tests.
- Development hosts must remain the shared local hostname so Supabase host-only cookies are shared; test environment URL resolution in Task 1.
- Anonymous users must see an Entrar link that preserves the current app path; verify the exact encoded return URL in Task 5.
- A shared logout must clear the `.labafero.com` session from any app; assert the cookie and cross-app redirect in Task 5's auth browser run.
- News city identity must remain visible after removing its sticky local app header; verify city masthead and dynamic `corClasses` in Task 3.

---

### Task 1: Build the shared `@vpn/ui` package

**Files:**

- Create: `packages/ui/package.json`
- Create: `packages/ui/src/index.ts`
- Create: `packages/ui/src/theme.css`
- Create: `packages/ui/src/components/VpnBrand.vue`
- Create: `packages/ui/src/components/VpnAppBar.vue`
- Test: `packages/ui/tests/navigation.test.ts`
- Modify: `vitest.config.ts`

**Interfaces:**

- `VpnAppId = 'site' | 'news' | 'monitor'`.
- `VpnAppUrls = Record<VpnAppId, string>`.
- `resolveVpnAppUrls(environment: 'development' | 'production' | 'preview', overrides?: Partial<VpnAppUrls>): VpnAppUrls` returns local, canonical production, or overridden Preview URLs.
- `createVpnAppLinks(active: VpnAppId, urls: VpnAppUrls): VpnAppLink[]` returns ordered Site/News/Monitor links with an `active` flag.
- `<VpnAppBar>` accepts `activeApp`, `appUrls`, `authenticated`, optional `accountLabel`, and `signInHref`; it emits `signOut` and exposes an `account-options` slot for app-specific controls such as News appearance selection.

- [x] **Step 1: Write failing unit tests** for URL defaults/overrides, stable link ordering, and exactly one active destination.
- [x] **Step 1a: Add a failing security assertion** that rejects non-HTTP(S) origins and non-loopback HTTP overrides outside development.
- [x] **Step 2: Run focused Vitest** with `pnpm exec vitest run packages/ui/tests/navigation.test.ts`; confirm the exports are missing.
- [x] **Step 3: Implement** the URL/link helpers, package exports, shared color/font tokens, VPN mark, and responsive semantic app bar. Keep Vue/Supabase state out of the package; use Nuxt UI `UHeader`/`UButton` with semantic links and accessible account details.
- [x] **Step 4: Run focused Vitest** and confirm all URL/link assertions pass.

### Task 2: Put the shared shell on the Site

**Files:**

- Create: `vpn-site/app/layouts/default.vue`
- Create: `vpn-site/app/components/VpnAppNavigation.vue`
- Modify: `vpn-site/app/pages/index.vue`
- Modify: `vpn-site/app/pages/entrar.vue`, `vpn-site/app/pages/cadastro.vue`
- Modify: `vpn-site/app/components/LegalPage.vue`
- Modify: `vpn-site/app/pages/auth/callback.vue`
- Modify: `vpn-site/app/assets/css/main.css`, `vpn-site/app/app.config.ts`, `vpn-site/nuxt.config.ts`
- Modify: `vpn-site/.env.example`, `vpn-site/package.json`
- Test: `vpn-site/tests/ui-shell-browser.cjs`

**Interfaces:**

- The Site wrapper reads `useSupabaseUser()`, passes the account label and current route to `VpnAppBar`, and handles `signOut` through the existing Supabase client.
- Site sign-in destinations are created with `buildAuthPortalUrl`; an anonymous Site page uses `/entrar`, while apps on other origins receive the full current URL as `return_to`.
- `runtimeConfig.public.vpnAppUrls` comes from `resolveVpnAppUrls` and the `NUXT_PUBLIC_VPN_SITE_URL`, `NUXT_PUBLIC_VPN_NEWS_URL`, and `NUXT_PUBLIC_VPN_MONITOR_URL` overrides.

- [x] **Step 1: Add browser assertions** for the common navigation, active Site state, anonymous Entrar link, and exact News/Monitor destinations.
- [x] **Step 2: Run the smoke test** against the current Site and confirm it fails because the shared shell is absent.
- [x] **Step 3: Add the default layout and navigation wrapper.** Exclude the OAuth callback; keep the shared bar on landing, auth, and legal pages.
- [x] **Step 4: Replace the existing landing header with the shared bar.** Put News and Monitor in the bar and as the two primary app destinations; retain “Explorar a VPN” and the page sections. Remove duplicate local brand headers from login/signup/legal views.
- [x] **Step 5: Import shared tokens and configure URL overrides.** Add the shared package to `vpn-site`, confirm Nuxt resolves `@vpn/ui`, `@vpn/ui/theme.css`, and the app-bar component, and document development/Preview values in `.env.example`.
- [x] **Step 6: Run** `pnpm --filter @vpn/site lint`, `pnpm --filter @vpn/site typecheck`, the Site browser smoke test, and the Site build.

### Task 3: Apply the shell and theme to News

**Files:**

- Create: `vpn-news/app/components/VpnAppNavigation.vue`
- Create: `vpn-news/app/components/UserAppearanceOptions.vue`
- Modify: `vpn-news/app/layouts/auth.vue`, `vpn-news/app/layouts/default.vue`
- Modify: `vpn-news/app/pages/index.vue`, `vpn-news/app/pages/[cidade].vue`
- Modify: `vpn-news/app/components/UserMenu.vue`, `vpn-news/app/pages/auth/callback.vue`
- Modify: `vpn-news/app/assets/css/main.css`, `vpn-news/app/app.config.ts`, `vpn-news/nuxt.config.ts`
- Modify: `vpn-news/.env.example`, `vpn-news/package.json`, `pnpm-lock.yaml`
- Test: `vpn-site/tests/ui-shell-browser.cjs`

**Interfaces:**

- The public `auth` layout and editorial `default` layout both render the shared app bar. The `overlay` layout stays independent, and login/callback remain layout-free.
- The editor's account email and logout move into the shared app bar. `UserAppearanceOptions` remains available from its `account-options` slot, preserving light/dark/system selection.
- City pages keep `corClasses`, logo, city name, and city-specific colors as a non-sticky local masthead below the shared VPN bar.

- [x] **Step 1: Add UI assertions** for active News navigation, public pages, editorial shell, city theme marker, and absence of the app bar on an overlay route.
- [x] **Step 2: Run the News shell checks** against current code and confirm the common bar assertions fail.
- [x] **Step 3: Add the local navigation wrapper** using current Supabase user/client and validated portal return URLs; wire it into public and editorial layouts.
- [x] **Step 4: Replace duplicate top branding** on the public index and city page with page-local controls/masthead; move account/logout to the bar and retain appearance choices in the account menu.
- [x] **Step 5: Apply shared theme tokens** to the public News shell and Nuxt UI primary/neutral colors. Keep `corClasses` and all generated overlays unchanged.
- [x] **Step 6: Run** `pnpm --filter @vpn/news lint`, `pnpm --filter @vpn/news typecheck`, and relevant News/browser checks.

### Task 4: Apply the shell and theme to Monitor

**Files:**

- Create: `vpn-monitor/app/layouts/default.vue`
- Create: `vpn-monitor/app/components/VpnAppNavigation.vue`
- Modify: `vpn-monitor/app/app.config.ts`, `vpn-monitor/app/assets/css/main.css`, `vpn-monitor/nuxt.config.ts`
- Modify: `vpn-monitor/app/pages/conexao.vue`, `vpn-monitor/app/pages/login.vue`, `vpn-monitor/app/pages/auth/callback.vue`
- Modify: `vpn-monitor/.env.example`, `vpn-monitor/package.json`, `pnpm-lock.yaml`
- Test: `vpn-site/tests/ui-shell-browser.cjs`

**Interfaces:**

- The default layout puts the shared app bar above authenticated Monitor pages. Login/callback redirects stay layout-free.
- The account control reads the existing shared Supabase user; sign-out clears the existing shared session and returns to the central Site.
- Monitor uses red primary/zinc neutral colors and the shared background/surface tokens. Connection and session screens keep their current content and controls.

- [x] **Step 1: Add shell assertions** for active Monitor navigation, app destinations, account control, and no bar on login/callback.
- [x] **Step 2: Run current Monitor shell checks** and confirm the common bar assertions fail.
- [x] **Step 3: Add the default layout and navigation wrapper;** remove the duplicate sign-out button from `/conexao` after wiring the shared account control.
- [x] **Step 4: Import the shared theme** and configure the Monitor primary/neutral palettes and environment URL overrides.
- [x] **Step 5: Run** `pnpm --filter @vpn/monitor lint`, `pnpm --filter @vpn/monitor typecheck`, and relevant Monitor/browser checks.

### Task 5: Verify the complete shell and record evidence

**Files:**

- Modify: `vpn-site/tests/central-auth-browser.cjs`
- Modify: `vpn-site/tests/ui-shell-browser.cjs`
- Create: `docs/validation/vpn-ui-shell-2026-10-24.md`

- [x] **Step 1: Extend the central-auth browser flow** to assert the common app bar on Site, Monitor, and News; account identity after authentication; correct link return paths; and shared logout from the top account menu.
- [x] **Step 2: Run the browser smoke flow** across public Site, News, Monitor auth redirect, and News overlay; confirm overlay layout has no VPN bar.
- [x] **Step 3: Run the full verification set** requested for this repository: `pnpm lint`, `pnpm format`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm test:foundation -- --maxWorkers=1 --minWorkers=1`, and `pnpm build`.
- [x] **Step 4: Validate the real cross-app session** using the existing authorized browser/account if available: Site → Monitor/News and authenticated Sentry `/api/v1/me`; otherwise record exactly which authenticated step requires the user session.
- [x] **Step 5: Review** responsive rendering, duplicate headers, city colors, and overlays in browser; record apps, URLs, deployment IDs, commands, and limitations in `docs/validation/vpn-ui-shell-production-2026-10-24.md`. Mobile menu activation from the keyboard was not confirmed in headless browser and remains a follow-up.
- [x] **Step 6: Run** `git diff --check` and review all changed files; commit the completed implementation with a descriptive UI-shell message.

## Plan Self-Review

- Spec sections are covered: shared package and theme (Task 1), Site shell and CTAs (Task 2), News public/editorial shell and city colors (Task 3), Monitor shell/theme (Task 4), mobile/account/session/overlay and full-flow verification (Task 5).
- The component API and URL resolution are defined before consumers use them; unit tests own pure navigation behavior and browser tests own rendered/authenticated behavior.
- Sentry is validation-only; no deployment, Supabase config, database, API, or authorization change is included.
- Preview destinations are configurable through public URL overrides; production and local defaults are fixed in this plan. Shared cookie SSO remains guaranteed only on the existing supported origins and is not expanded to unrelated `vercel.app` hosts.
