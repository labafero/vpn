# Issue #2 — stocks por cidade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task; superpowers:subagent-driven-development somente se o usuário selecionar delegação. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Exibir valores recentes do broadcaster no OBS, filtrados por cidade ativa e sem repetição.
**Architecture:** Consultar snapshots da issue #1 usando contexto de useOverlayState; deduplicar no banco antes do limite e renderizar componente leve no ticker existente.
**Tech Stack:** Nuxt 4, Vue 3, Supabase/Postgres, Vitest/pgTAP.
**Spec:** `docs/superpowers/specs/2026-10-10-valores-overlay-design.md`.
**Status:** aprovado pelo usuário em 10/10/2026; implementação local concluída. Ver evidências e pendências de entrega em `docs/validation/issues-editoriais.md`.

## Global Constraints

- Nuxt 4 `app/`, Nuxt UI v4, Valibot, pt-BR, `corClasses`, tipos Supabase gerados; nenhum serviço novo.
- Não misturar broadcasters; não recorrer a outra cidade se a ativa não tiver preços.
- No máximo dez itens após deduplicação; atualização a cada 60 segundos.
- Não alterar Monitor/Sentry nem reabrir a Fase 1.

## Review Focus

- Mesmo item em várias cidades sem cidade ativa gera uma entrada com origem; tarefa 1.
- Onze snapshots repetidos não ocultam outros itens antes do limite; tarefa 1.
- Empates de created_at usam ID descendente; tarefa 1.
- Resposta antiga após mudar contexto é descartada; tarefa 2.
- Sem dados, falha de rede e unmount não quebram layout nem deixam timers; tarefa 2.

### Task 1: Consulta pública mínima de stocks

**Files:** criar migration via `pnpm dlx supabase@2.119.0 migration new overlay_market_latest`; criar `supabase/tests/overlay-stocks.test.sql`; regenerar tipos.
**Interfaces:** RPC `get_overlay_market_values(p_broadcaster_id UUID, p_cidade TEXT DEFAULT NULL)` retorna até dez linhas `{ id, item_id, item_name, cidade, amount, created_at, trend }`, security invoker, somente leitura. `trend` compara o snapshot anterior na mesma série usuário/cidade/item. Query ranqueia e deduplica antes do LIMIT.

- [x] Escrever SQL para cidade ativa/ausente, broadcasters distintos, duplicados excedendo dez, empate temporal, preço anterior em outra cidade e ausência de dados. Confirmar falha em `supabase test db` local.
- [x] Implementar RPC com grants SELECT/EXECUTE mínimos para anon/authenticated, sobre preços públicos da #1; não consultar base editorial, notas ou dados do Monitor.
- [x] Rodar testes SQL até passar, gerar tipos e commit.

### Task 2: Componente no ticker e ciclo de atualização

**Files:** criar `vpn-news/app/composables/useOverlayStocks.ts`, `vpn-news/app/components/overlay/stocks.vue`, `vpn-news/tests/overlay-stocks.test.ts`; modificar `vpn-news/app/components/overlay/tinker.vue`.
**Interfaces:** `useOverlayStocks(broadcasterId: Ref<string>, cidade: Ref<string | undefined>)` retorna `{ stocks, loading, error, refresh }`; componente recebe contexto existente, formata moeda pt-BR, mostra cidade somente no modo sem cidade ativa.

- [x] Escrever testes de coordenação para resposta atrasada descartada, contexto limpo, refresh em 60 segundos, falha inicial/recorrente e cancelamento de timer. Rodar `pnpm exec vitest run vpn-news/tests/overlay-stocks.test.ts` para registrar falha.
- [x] Implementar watch imediato do contexto, contador de geração de consultas, timer único e limpeza; nenhuma consulta sem UUID válido. Componente oculto se vazio; preservar último conjunto válido em falha periódica somente se contexto for o mesmo.
- [x] Integrar junto às notícias/marca sem alterar outros overlays; usar corClasses e indicação de tendência por texto/ícone além de cor.
- [x] Rodar testes, abrir `/overlay?broadcaster=<fixture>` em 1920×1080 e 1280×720 com/sem cidade/preço/rede; registrar screenshots e commit.

## Entrega

Branch proposta `codex/issue-2-overlay-stocks` após #1, PR referencia #2. Rodar pipeline do lote e `supabase test db`; provar browser source público sem login e sem exposição da Base de Dados. Produção exige autorização conforme workflow; rollback remove componente/RPC, mantendo preços.
