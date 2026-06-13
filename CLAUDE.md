# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # dev server on 0.0.0.0:3000
pnpm build        # production build
pnpm preview      # preview production build
pnpm lint         # ESLint (primary formatter — runs first in CI)
pnpm typecheck    # nuxt typecheck (runs after lint in CI)
pnpm format       # prettier (not required in CI)
```

CI pipeline: `lint → typecheck`. No tests are configured.

## Architecture

**Nuxt 4 SPA** using the `app/` directory convention (not root-level `pages/`). Backend is Supabase (PostgreSQL + Auth). UI uses Nuxt UI + Tailwind CSS v4.

### Key directories

- `app/pages/` — all routes
  - `/redacao/*` — newsroom: post list, create (`novo`), edit (`[id]/editar`), broadcast config (`transmissao`), Spotify (`spotify`)
  - `/overlay/*` — OBS browser-source overlays (`index`, `idle`) — keep these simple and self-contained
  - `/login`, `/` — public-facing pages
- `app/composables/` — `useBroadcastConfig.ts` (fetch/save broadcast settings), `usePostMedia.ts` (media upload helpers)
- `app/types/database.types.ts` — auto-generated Supabase types; do not edit by hand
- `server/api/spotify/` — Spotify OAuth flow and now-playing API (server-side, uses `runtimeConfig` secrets)
- `supabase/migrations/` — database migrations

### Supabase

Auth and data access use `@nuxtjs/supabase`. Prefer `useSupabaseClient()` and `useSupabaseUser()` in components. Server routes that need elevated privileges use the service-role key from `runtimeConfig`.

`supabase.redirect` is set to `false` in `nuxt.config.ts` — handle auth redirects manually in middleware.

### Spotify integration

OAuth secrets (`spotifyClientSecret`, `spotifyRedirectUri`) live in `runtimeConfig` (non-public). The client ID is in `runtimeConfig.public.spotifyClientId`. Token storage is in the `spotify_connection` Supabase table.

### Environment variables

See `.env.example`. Public vars use `NUXT_PUBLIC_*` prefix. Do not add Supabase or Spotify secrets to public runtime config.

## Working style

- **Não sugerir atalhos ou workarounds** quando o problema real ainda não foi resolvido. Diagnosticar a causa raiz e resolver corretamente.

## Conventions

- **ESLint** is the formatter — no dangling commas, 1tbs brace style (`eslint.config.mjs`).
- **Tailwind v4**: import order in CSS matters — `@import "tailwindcss"` before `@import "@nuxt/ui"`. Theme variables go in `@theme static`.
- **Language**: UI strings are Portuguese (pt-BR).
- **pnpm-workspace.yaml** supports native binary builds (`better-sqlite3`). Don't add native dependencies without updating the workspace config.
- Do not add `pages/` at the repo root — Nuxt 4 convention requires the `app/` directory.
