# Issue #3 — evolução da Base de Dados Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task; superpowers:subagent-driven-development somente se o usuário selecionar delegação. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Completar consulta, relações e exportação da Base de Dados existente, compartilhada entre usuários autorizados da redação.
**Architecture:** Preservar db_records/dados e notas; acrescentar associação editorial confiável e tabela de relações; aplicar autorização no banco e refletir na UI.
**Tech Stack:** Nuxt 4, Vue 3, Nuxt UI v4, Valibot, Supabase/Postgres, Vitest/pgTAP.
**Spec:** `docs/superpowers/specs/2026-10-10-base-de-dados-design.md`.
**Status:** aprovado pelo usuário em 10/10/2026; implementação local concluída. Ver evidências e pendências de entrega em `docs/validation/issues-editoriais.md`.

## Global Constraints

- Compartilhada entre usuários autorizados da redação; não promover automaticamente toda conta autenticada.
- RLS/grants em todas as tabelas expostas; sem autorização por user_metadata.
- Nuxt 4 app/, Nuxt UI v4, Valibot, pt-BR e tipos Supabase gerados.
- Preservar IDs e dados; sem converter relações textuais automaticamente por coincidência de nome.
- Nenhuma mudança nos privilégios do Monitor; sem banco remoto/merge/produção sem autorização.

## Review Focus

- Conta autenticada não editorial e revogação bloqueiam leitura/exportação; tarefa 1.
- Troca de autoria e edição/remoção de nota de outro editor são rejeitadas; tarefa 1.
- Autorrelação, duplicação e exclusão de extremo não deixam órfãos; tarefa 2.
- Busca rápida não recebe resultado antigo; paginação não exporta só 25 linhas; tarefas 3/4.
- Aspas, novas linhas, Unicode e fórmulas de planilha são seguros no CSV; tarefa 4.

### Task 1: Associação editorial e acesso compartilhado

**Files:** criar migration via `pnpm dlx supabase@2.119.0 migration new editorial_access`; criar `supabase/tests/editorial-access.test.sql`, `vpn-news/app/composables/useEditorialAccess.ts`, `vpn-news/app/middleware/editorial.ts`; modificar páginas existentes em `vpn-news/app/pages/redacao/base/`; regenerar tipos.
**Interfaces:** `editorial_members` conforme spec; `useEditorialAccess()` retorna `{ authorized, loading, refresh }`; middleware exige login e associação vigente. Política banco continua sendo fonte de autorização.

- [x] Escrever pgTAP com anon, membro comum, dois editores, editor revogado, tentativa de autopromoção, troca de autor e nota de outro. Confirmar falhas das políticas atuais localmente.
- [x] Criar associação somente administrável por operação confiável e políticas/grants por operação; autor imutável em registros/notas. Dois editores colaboram sobre registros; notas editáveis/removíveis só por autor. Não semear usuários reais.
- [x] Implementar middleware/composable e feedback de acesso negado; aplicar apenas Base de Dados e futuro módulo de valores.
- [x] Aplicar/testar localmente, gerar tipos e commit isolado: este é o pré-requisito da #1. Preparar inventário de autores e lista explícita de editores para revisão antes da aplicação remota.

### Task 2: Relações e validação dos registros

**Files:** criar migration via `pnpm dlx supabase@2.119.0 migration new db_record_relations`; criar `supabase/tests/db-record-relations.test.sql`, `vpn-news/app/utils/dbRecordSchemas.ts`, `vpn-news/app/composables/useDbRecordRelations.ts`, `vpn-news/app/components/base/RecordRelations.vue`; modificar `useDbRecords.ts`, `base/novo.vue`, `base/[id].vue`; regenerar tipos.
**Interfaces:** `fetchRelations(recordId: number): Promise<Relation[]>`, `addRelation(input: { sourceId: number; targetId: number; kind: string }): Promise<Relation>`, `removeRelation(id: number): Promise<void>`. Schemas por tipo preservam campos existentes; limites da spec. Adicionar `updateNote(id: number, body: string)` em useDbRecords.

- [x] Escrever testes SQL de RLS, FK, unicidade e cascade dos vínculos; testes `vpn-news/tests/db-record-schemas.test.ts` de campos por tipo, notas vazias e limites; confirmar falhas.
- [x] Implementar tabela e políticas, esquemas e consultas tipadas, removendo `as never`; renderizar texto sem HTML arbitrário. Auditoria prévia dos dados evita constraints incompatíveis silenciosas.
- [x] Adicionar seletor de alvo, tipo de relação, vínculos de entrada/saída e confirmação de exclusão; manter dados textuais anteriores e edição de notas próprias.
- [x] Rodar SQL/unitários e validar ficha com relações e notas entre dois editores; commit.

### Task 3: Consulta em tabela

**Files:** modificar `vpn-news/app/pages/redacao/base/index.vue`, `useDbRecords.ts`; criar `vpn-news/tests/db-record-query.test.ts`.
**Interfaces:** `fetchPage(filters: { type?: DbRecordType; cidade?: string; search?: string; sort: 'nome' | 'updated_at'; ascending: boolean; page: number }): Promise<{ rows: DbRecord[]; total: number }>`; página de 25 linhas e desempate por ID. Escapar `%` e `_` na busca literal.

- [x] Testar filtros, ordenação/desempate, páginas, busca literal e descarte de resposta fora de ordem; confirmar falha.
- [x] Substituir lista por UTable com controles de busca/filtros/ordenação/paginação; debounce 300 ms, reiniciar página ao mudar filtro, impedir resultado antigo e distinguir vazio/erro.
- [x] Validar teclado/mobile, navegação à ficha e usuário sem acesso; rodar testes e commit.

### Task 4: Exportação completa

**Files:** criar `vpn-news/app/utils/dbRecordCsv.ts`, `vpn-news/app/composables/useDbRecordExport.ts`, `vpn-news/tests/db-record-csv.test.ts`; modificar `base/index.vue`.
**Interfaces:** `serializeCsv(headers: string[], rows: string[][]): string`; `exportRecords(filters)`, `exportRelations(filters)`, `exportNotes(filters)` exportam conjuntos autorizados correspondentes aos registros filtrados em lotes de 500, com progresso/cancelamento e erros explícitos. Relações só com ambos os extremos exportados; notas dos registros exportados. IDs permitem reconstituir vínculos.

- [x] Escrever testes com aspas/vírgulas/CRLF/Unicode e células iniciadas por `=`, `+`, `-`, `@` ou controles; exportação >25/>500 registros, filtro aplicado, revogação e falha no segundo lote sem arquivo parcial apresentado como sucesso. Confirmar falha.
- [x] Implementar CSV UTF-8 BOM/CRLF, quote escaping e neutralização de fórmulas para texto; exportar dados específicos JSON, notas e relações em ações separadas. Liberar Blob URLs e não consultar tabelas privadas do Monitor.
- [x] Executar testes e comparar arquivos com fixtures; registrar evidência e commit.

## Entrega

Branch proposta `codex/issue-3-base-de-dados`, com pré-requisito editorial em commit isolado. PR referencia #3; se #1 precisar avançar antes, extrair autorização para PR pequeno compartilhado. Validar localmente pipeline completo, testes novos e pgTAP; depois preparar preview sem expor dados de produção. Antes da migration remota: inventário, membros aprovados, plano de reversão preservando a restrição de acesso e confirmação de projeto. Não reabrir políticas amplas para reverter a UI.
