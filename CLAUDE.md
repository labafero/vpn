# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar neste repositório.

## Comandos

```bash
pnpm dev          # servidor de desenvolvimento em 0.0.0.0:3000
pnpm build        # build de produção
pnpm preview      # preview do build de produção
pnpm lint         # ESLint (formatador principal — roda primeiro no CI)
pnpm typecheck    # nuxt typecheck (roda após o lint no CI)
pnpm format       # prettier (não obrigatório no CI)
```

Pipeline de CI: `lint → typecheck`. Nenhum teste está configurado.

## Arquitetura

**Nuxt 4 SPA** ("BRN Roleplay / VPN") usando a convenção de diretório `app/`. Backend é Supabase (PostgreSQL + Auth). UI usa Nuxt UI v4 + Tailwind CSS v4. Validação de formulários usa valibot.

### Rotas

Duas superfícies distintas:

**Pública** — sem sidebar, header com marca VPN:
- `/` — índice de notícias: slider hero de posts `destaque`, filtro por cidade, grid de posts
- `/[cidade]` — página de notícias por cidade, temática definida por `city_config.cor_primaria`

**Redação** (protegida, layout dashboard com sidebar):
- `/redacao` — lista de posts
- `/redacao/novo` — criar post
- `/redacao/[id]/editar` — editar post
- `/redacao/transmissao` — configuração de transmissão por usuário
- `/redacao/valores` — editor de valores de mercado
- `/redacao/cidades` — CRUD de configuração de cidades

**Overlays** (browser sources do OBS, layout `overlay` — manter simples e autocontidos):
- `/overlay/index`, `/overlay/idle`

### Layouts

- `default` — `UDashboardGroup` + sidebar (`UDashboardSidebar`) usado em `/redacao/*`. Atalhos de teclado: `g-r` redação, `g-n` novo, `g-t` transmissão, `g-v` valores, `g-c` cidades.
- `auth` — layout público mínimo (nome confuso; é o header VPN público, não um wrapper de login)
- `overlay` — layout bare para páginas do OBS

### Autenticação

`supabase.redirect` é `false` — redirecionamentos de auth são tratados manualmente em `app/middleware/auth.ts` via `useSupabaseUser()`. Páginas em `/redacao` usam `definePageMeta({ middleware: 'auth' })`.

### Tabelas do Supabase

| Tabela | Finalidade |
|---|---|
| `posts` | Matérias com `cidade`, `destaque`, `published_at`, `media_url`/`media_type` opcionais |
| `broadcast_config` | Configuração de transmissão ao vivo por usuário (título, cidade) — upsert em `user_id` |
| `city_config` | Configuração de exibição por cidade (slug, nome, jornal, `cor_primaria`, logo) — upsert em `slug` |
| `market_values` | Entradas de mercado em série temporal por usuário |
| `market_values_latest` | View: última entrada por label por usuário |

### Composables

- `useBroadcastConfig` — fetch/upsert de `broadcast_config` do usuário atual
- `useCidadeConfig` — busca cidade por slug (`fetchBySlug` lança 404 se não encontrar), busca todas, upsert, delete
- `useMarketValues` — insere snapshots de mercado, busca histórico e view de últimos valores
- `usePostMedia` — helpers de upload de mídia para capa e mídia do post
- `useServerClock` — relógio do servidor
- `useCharacterConfig` — configuração de personagem/jogador

### Temas por cidade

`app/utils/cidadeColors.ts` exporta `corClasses`, um mapa de `CorPrimaria` (10 nomes de cores Tailwind + `"zinc"`) para `{ text, border, bg, muted }`. Sempre usar este mapa ao renderizar UI com marca de cidade — nunca hardcodar classes de cor em páginas de cidade.

### Convenções

- **ESLint** é o formatador — sem vírgulas pendentes, estilo 1tbs (`eslint.config.mjs`).
- **Tailwind v4**: `@import "tailwindcss"` antes de `@import "@nuxt/ui"` no CSS. Variáveis de tema em `@theme static`. Classes de cor usadas em `corClasses` devem existir estaticamente (sem interpolação dinâmica de classes).
- **Idioma**: strings de UI em português (pt-BR).
- `app/types/database.types.ts` é gerado automaticamente pelo Supabase — não editar manualmente.
- `pnpm-workspace.yaml` suporta builds de binários nativos. Não adicionar dependências nativas sem atualizar o workspace.
- Não adicionar `pages/` na raiz do repositório — Nuxt 4 usa o diretório `app/`.

## Forma de trabalho

- **Não sugerir atalhos ou workarounds** quando o problema real ainda não foi resolvido. Diagnosticar a causa raiz e resolver corretamente.
