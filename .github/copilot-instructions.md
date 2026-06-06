# Instruções para Copilot neste repositório: vpn

Este arquivo ajuda sessões futuras do Copilot CLI e assistentes de IA a trabalharem de forma eficaz neste repositório.

## 1) Comandos de build, lint e teste
- Servidor de desenvolvimento: pnpm dev  (nuxt dev)
- Build de produção: pnpm build  (nuxt build)
- Preview do build: pnpm preview  (nuxt preview)
- Pós-instalação (prepare): pnpm postinstall  (executa nuxt prepare)
- Lint: pnpm lint  (executa eslint .)
- Typecheck: pnpm typecheck  (nuxt typecheck)
- Formatar (não usado no CI): pnpm format  (prettier --write .)

Observações:
- Pipeline de CI: `pnpm install` → `pnpm run lint` → `pnpm run typecheck` (não há testes configurados).
- Não existem testes unitários/integrados configurados. Ao adicionar testes, documente também como rodar um único teste (ex.: `pnpm test path/to/file.spec.ts`).

## 2) Arquitetura em alto nível
- Aplicação SPA com Nuxt 4 usando o diretório `app/` (rotas em `app/pages/`).
- Stack de UI: @nuxt/ui + Tailwind CSS v4; variáveis de tema em `@theme static`.
- Autenticação e backend: Supabase via @nuxtjs/supabase. Chaves públicas ficam em variáveis de ambiente NUXT_PUBLIC_SUPABASE_URL e NUXT_PUBLIC_SUPABASE_KEY; a chave secreta do servidor (se usada) fica em variáveis não públicas.
- Conteúdo: Nuxt Content (nova API). Consultas de conteúdo usam queryCollection(...).order(...).all() e são configuradas em content.config.ts.
- Rotas especiais: páginas de overlay para OBS em `app/pages/overlay/*` (record, tinker, idle, index) e fluxo de autenticação (`/login`, `/confirm`).
- Tipos e composables: Typescript em `app/types/` e composables em `app/composables/` (ex.: usePostMedia.ts).
- Artefatos de build: saída do Nuxt em `.output/` (ignorada pelo git). O tsconfig referencia diretórios gerados em `.nuxt/`.

## 3) Convenções e padrões específicos do repositório
- Use pnpm (packageManager: pnpm@11.1.3). CI e scripts assumem pnpm.
- Seguir a convenção Nuxt 4: usar `app/` para rotas; não adicionar `pages/` na raiz.
- Helpers do Supabase: prefira useSupabaseClient(), useSupabaseUser() e useNuxtApp().$supabase para operações.
- Variáveis de ambiente: mantenha chaves públicas em NUXT_PUBLIC_*; veja `.env.example`.
- Seguir ESLint como verificador/formatador principal: `pnpm lint`. Prettier existe, mas não é obrigatório no CI.
- Verificação de tipos: execute `pnpm typecheck` (usado no CI após o lint).
- Tailwind + Nuxt UI: ordem de imports importa — importar `@import "tailwindcss"` antes de `@import "@nuxt/ui"` quando necessário.
- Páginas de overlay: são pensadas para saída HTML usada em OBS; mantenha-as simples e auto-contidas em `app/pages/overlay/`.
- Regras de estilo: eslint.config.mjs aplica regras específicas (ex.: sem trailing commas, estilo 1TBS). Respeitar essas regras ao editar.
- Workspace: existe pnpm-workspace.yaml para suportar builds nativos (ex.: better-sqlite3). Evitar adicionar dependências nativas sem atualizar a workspace.
- Secrets no CI/deploy: o workflow de deploy pode usar segredos como SUPABASE_ACCESS_TOKEN — confira `.github/workflows/deploy.yml` e as Secrets do repositório antes de alterar fluxos de deploy.

## 4) Documentos e pistas úteis para o assistente
- Documentos primários: README.md, AGENTS.md, .env.example, .github/workflows/ci.yml e .github/workflows/deploy.yml.
- Para orientações específicas do Supabase, carregar a skill `supabase` (há referência em skills-lock.json e em `.agents/skills/supabase`).

## 5) Arquivos que o assistente deve preferir ao responder ou modificar código
- app/ (rotas, composables, types)
- content.config.ts (configurações de conteúdo)
- eslint.config.mjs (regras de estilo)
- package.json (scripts)
- .env.example (nomes de variáveis de ambiente)
- .github/workflows/ci.yml e .github/workflows/deploy.yml (expectativas de CI/CD)

---

Se já existir um arquivo `.github/copilot-instructions.md`, mesclar estas seções em vez de substituir tudo. (Arquivo criado/atualizado pelo Copilot CLI.)