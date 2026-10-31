# CLAUDE.md

Este arquivo fornece orientações ao trabalhar neste repositório.

## Comandos

```bash
pnpm dev:site      # site principal em 0.0.0.0:3000
pnpm dev:news      # portal público e redação em 0.0.0.0:3001
pnpm dev:monitor   # portal privado em 0.0.0.0:3002
pnpm dev:sentry    # API Nitro em 0.0.0.0:3003
pnpm build         # build de todos os workspaces
pnpm lint          # ESLint de todos os workspaces
pnpm lint:fix      # corrige problemas autofixáveis de ESLint
pnpm format        # Prettier nos fontes e configurações do monorepo
pnpm format:check  # verifica formatação sem alterar arquivos
pnpm typecheck     # typecheck de todos os workspaces
```

Pipeline de CI: `lint → format:check → typecheck → contracts:check → test:foundation → build`, além do job de banco isolado.

## Arquitetura

**Monorepo pnpm** com quatro projetos Nuxt 4 (incluindo o site institucional vpn-site) e pacotes compartilhados. `vpn-news` usa a convenção de diretório `app/`; backend e Auth são Supabase. UI usa Nuxt UI v4 + Tailwind CSS v4. Validação de formulários usa valibot.

Fonte de produto: [PRD geral](PRD.md), [PRDs por app](docs/product/README.md) e [ADRs aceitas](docs/adr/). Detalhes técnicos de papéis, consentimento e retenção permanecem em [foundation](docs/architecture/foundation.md). `DESIGN.md` é a referência do sistema visual compartilhado.

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

- `/overlay` (página `overlay/index.vue`, exige `?broadcaster=<uuid>`), `/overlay/idle`

### Layouts

- `vpn-news/default` — `UDashboardGroup` + sidebar (`UDashboardSidebar`) usado em `/redacao/*`. Atalhos de teclado: `g-r` redação, `g-n` novo, `g-t` transmissão, `g-v` valores, `g-c` cidades.
- `auth` — layout público mínimo (nome confuso; é o header VPN público, não um wrapper de login)
- `overlay` — layout bare para páginas do OBS

### Autenticação

`supabase.redirect` é `false` — redirecionamentos de auth são tratados manualmente em `app/middleware/auth.ts` via `useSupabaseUser()`. Páginas em `/redacao` usam `definePageMeta({ middleware: 'auth' })`.

### Tabelas do Supabase

| Tabela                 | Finalidade                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `posts`                | Matérias com `cidade`, `destaque`, `published_at`, `media_url`/`media_type` opcionais             |
| `broadcast_config`     | Configuração de transmissão ao vivo por usuário (título, cidade) — upsert em `user_id`            |
| `city_config`          | Configuração de exibição por cidade (slug, nome, jornal, `cor_primaria`, logo) — upsert em `slug` |
| `market_values`        | Entradas de mercado em série temporal por usuário                                                 |
| `market_values_latest` | View: última entrada por label por usuário                                                        |

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

- **ESLint** analisa o código; **Prettier** formata fontes e configurações com a configuração da raiz (`.prettierrc.json`): dois espaços, aspas simples, sem ponto e vírgula ou vírgulas pendentes. Rodar `pnpm format` antes de entregar. `eslint-config-prettier` evita regras conflitantes nos quatro projetos Nuxt. Arquivos gerados ficam excluídos em `.prettierignore`; não formatá-los manualmente.
- **Tailwind v4**: `@import "tailwindcss"` antes de `@import "@nuxt/ui"` no CSS. Variáveis de tema em `@theme static`. Classes de cor usadas em `corClasses` devem existir estaticamente (sem interpolação dinâmica de classes).
- **Idioma**: strings de UI em português (pt-BR).
- `packages/database/src/database.types.ts` é gerado automaticamente pelo Supabase — não editar manualmente.
- `pnpm-workspace.yaml` suporta builds de binários nativos. Não adicionar dependências nativas sem atualizar o workspace.
- Não adicionar `pages/` na raiz do repositório — os projetos Nuxt 4 usam o diretório `app/`.

## Forma de trabalho

- **Não sugerir atalhos ou workarounds** quando o problema real ainda não foi resolvido. Diagnosticar a causa raiz e resolver corretamente.
- Para planejar, executar, retomar ou entregar uma fase, seguir [docs/workflows/entrega.md](docs/workflows/entrega.md). Recuperar PRD do app, ADRs relevantes, autorizações e evidências antes de propor trabalho. Planos de execução são temporários; não mantê-los como requisitos depois da entrega.
- Para descobrir ambientes e acessos, consultar [docs/operations/environments.md](docs/operations/environments.md) e verificar CLI/API/MCP antes de pedir nomes ou URLs ao usuário. Revalidar o registro na conta; não tratá-lo como estado atual garantido.
- Para preparar uma máquina, autenticar ferramentas ou diagnosticar o ambiente local, usar [vpn-environment](.agents/skills/vpn-environment/SKILL.md).
- Para deploy Vercel, preview em PR, acompanhamento/status de deployment ou validação da UI publicada, usar [vpn-release](.agents/skills/vpn-release/SKILL.md) e [docs/workflows/publicacao.md](docs/workflows/publicacao.md). Essas instruções específicas do VPN complementam as skills de fornecedores; preservar autorizações já dadas e o destino pedido pelo usuário.

## Fundação privada

Consultar docs/architecture/foundation.md para papéis, consentimento e retenção. Tipos API são gerados de packages/contracts/openapi.yaml. Credenciais Twitch ficam no schema privado. Nunca promover usuários por user_metadata.
