# VPN Roleplay

Nuxt 4 SPA with Supabase auth, Nuxt UI, Nuxt Content, Tailwind v4.

## Commands

```bash
pnpm dev                  # dev server
pnpm build                # production build
pnpm preview              # preview production build
pnpm lint                 # ESLint (CI runs this first)
pnpm typecheck            # nuxt typecheck (CI runs after lint)
pnpm postinstall          # nuxt prepare (runs automatically)
```

CI pipeline: `lint → typecheck` (no tests configured).

## Nuxt 4 conventions

- Uses `app/` directory (pages at `app/pages/`), not root-level `pages/`.
- Content uses new API: `queryCollection('blog').order('date', 'DESC').all()` (defined in `content.config.ts`).
- tsconfig references generated `.nuxt/` dirs; `.nuxt/` is gitignored.

## Supabase

- Auth via `@nuxtjs/supabase`; env vars in `.env` (`NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY`).
- Helpers: `useSupabaseClient()`, `useSupabaseUser()`, `useNuxtApp().$supabase`.
- Load the `supabase` skill (from `.agents/skills/supabase`) for deeper guidance.

## Style & config

- **ESLint**: no dangling commas, 1tbs brace style (`eslint.config.mjs` extends Nuxt-generated config).
- **Tailwind v4**: `@import "tailwindcss"` + `@import "@nuxt/ui"` syntax; theme vars in `@theme static`.
- **Editorconfig**: 2-space indent, LF, trim trailing whitespace, final newline.
- **Font**: `Iosevka Charon Mono` set as sans.
- **Lang**: `pt-BR`.
- **No formatter command** despite `prettier` in devDependencies — use ESLint (`pnpm lint`).

## Pages

| Route             | File                           | Purpose                         |
| ----------------- | ------------------------------ | ------------------------------- |
| `/`               | `app/pages/index.vue`          | Empty shell (landing)           |
| `/login`          | `app/pages/login.vue`          | Email/password sign-in          |
| `/confirm`        | `app/pages/confirm.vue`        | Auth callback, redirects to `/` |
| `/overlay/record` | `app/pages/overlay/record.vue` | OBS broadcast overlay           |
| `/overlay/tinker` | `app/pages/overlay/tinker.vue` | OBS news ticker overlay         |

## Package manager

- `pnpm` 11.1.3 (see `package.json`).
- `pnpm-workspace.yaml` allows `better-sqlite3` builds; blocks others (`esbuild`, `@parcel/watcher`, etc.).
- Renovate follows `nuxt/renovate-config-nuxt`.
