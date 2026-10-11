# Issue #1 — wizard e histórico de valores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task; superpowers:subagent-driven-development somente se o usuário selecionar delegação. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Registrar preços por cidade/item pelo wizard e consultar sua evolução no dashboard.
**Architecture:** Reutilizar city_config, introduzir catálogo e snapshots numéricos; browser usa Supabase com RLS e autorização editorial.
**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Valibot, Supabase/Postgres, Vitest/pgTAP.
**Spec:** `docs/superpowers/specs/2026-10-10-valores-overlay-design.md`.
**Status:** aprovado pelo usuário em 10/10/2026; implementação local concluída. Ver evidências e pendências de entrega em `docs/validation/issues-editoriais.md`.

## Global Constraints

- Nuxt 4 `app/`, Nuxt UI v4, Valibot, pt-BR, `corClasses`, tipos Supabase gerados; nenhum serviço novo.
- Não alterar Monitor/Sentry nem reabrir a Fase 1.
- Histórico somente por INSERT; bloquear UPDATE/DELETE pela aplicação.
- Nome de item de 1–100 caracteres; valor monetário `numeric(14,2)` não negativo.
- Seguir `docs/workflows/entrega.md`; planejamento não autoriza banco remoto, merge ou produção.

## Review Focus

- Duas criações concorrentes do mesmo item reutilizam identidade; testar na tarefa 1.
- Zero e moeda pt-BR são aceitos; negativo, overflow e fração excedente rejeitados; tarefa 2.
- Falha no snapshot após criar item preserva dados e permite retry; tarefa 3.
- Empate temporal e comparação entre séries diferentes não corrompem tendência; tarefas 1/2.
- Não editor e usuário tentando inserir como outro são bloqueados; tarefa 1.

### Task 1: Catálogo e snapshots

**Files:** criar migration via `pnpm dlx supabase@2.119.0 migration new market_catalog_values`; criar `supabase/tests/market-values.test.sql`; regenerar `packages/database/src/database.types.ts` pelo CLI local.
**Interfaces:** tabelas e view descritas na spec; preço e IDs estáveis, cidade por slug; políticas usam `editorial_members`.

- [x] Escrever pgTAP para nomes normalizados/seed, FK, precisão, snapshots imutáveis, inserção somente própria/editorial e leitura pública; confirmar falha com `pnpm dlx supabase@2.119.0 test db` no banco local antes da migration.
- [x] Criar catálogo, snapshots, índices, grants/RLS e view security_invoker; não alterar migrations antigas. Para concorrência de item, unique key normalizada + insert on conflict com retorno da identidade existente, por RPC security invoker se necessário.
- [x] Aplicar localmente, rodar pgTAP até passar e gerar tipos. Validar seed aplicado uma única vez e nenhuma cotação fictícia.
- [x] Commit somente dos arquivos desta tarefa.

### Task 2: Consultas e cálculo de preços

**Files:** criar `vpn-news/app/composables/useMarketItems.ts`, `useMarketValues.ts`, `vpn-news/app/utils/marketValues.ts`, `vpn-news/tests/market-values.test.ts`; adicionar `vpn-news/tests/**/*.test.ts` em `vitest.config.ts`.
**Interfaces:** `findOrCreateItem(name: string): Promise<MarketItem>`; `save(input: { cidade: string; itemId: number; amount: string }): Promise<MarketValue>`; `fetchHistory(filters: { cidade: string; itemId: number; from?: string; page: number }): Promise<{ rows: MarketValue[]; total: number }>`; `fetchLatest(filters: { cidade?: string }): Promise<MarketValue[]>`. Tipos derivados do schema. `parseAmountToCents(input: string): number`, `calculateTrend(currentCents: number, previousCents: number | null): 'up' | 'down' | 'stable'`.

- [x] Escrever casos: `1.234,56` → 123456, `0` → 0, `-1`/`1,234`/overflow → rejeição; tendência sem anterior stable; alta/baixa calculadas na mesma série. Rodar `pnpm exec vitest run vpn-news/tests/market-values.test.ts` e confirmar falha.
- [x] Implementar parse explícito e consultas tipadas; usuário derivado da sessão, paginação determinística, erros sem mascarar respostas. Mapear decimal SQL para centavos sem aceitar NaN.
- [x] Rodar testes até passar e commit.

### Task 3: Wizard e dashboard

**Files:** criar `vpn-news/app/pages/redacao/valores/index.vue`, `novo.vue`, `vpn-news/app/components/market/ValueWizard.vue`, `HistoryChart.vue`; modificar `vpn-news/app/layouts/default.vue` para link/atalho `g-v`. Usar `useEditorialAccess` do plano #3.
**Interfaces:** wizard usa interfaces da tarefa 2; gráfico recebe uma única série `{ at: string; cents: number }[]`, sem misturar cidades/itens. Gráfico SVG com título acessível e tabela de dados correspondente, sem biblioteca nova.

- [x] Criar roteiro de aceitação com fluxo completo, volta entre etapas, item concorrente, zero, cidade/item indisponível e falha após criar item; executar para registrar ausência atual.
- [x] Implementar etapas cidade/item/valor/revisão, validação Valibot, bloqueio de duplo envio, preservação dos campos em falha e redirecionamento somente após sucesso.
- [x] Implementar dashboard com períodos 7/30/90/todo, últimos valores, série selecionada, variação e histórico paginado; estados vazios/erro e navegação por teclado/mobile.
- [x] Executar roteiro com Supabase local; registrar evidências em `docs/validation/issues-editoriais.md`. Rodar checks do lote e commit.

## Entrega

Branch proposta `codex/issue-1-valores`, baseada no pré-requisito editorial aprovado. PR referencia #1; preview após autorização compatível e isolamento do banco. Checks: `pnpm lint`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm test:foundation`, `pnpm dlx supabase@2.119.0 test db`, `pnpm build` com Supabase local configurado. Banco remoto exige inventário/dry run e aprovação; rollback da UI não remove snapshots.
