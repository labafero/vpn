# Título proposto

Completa valores de mercado, stocks no OBS e Base de Dados editorial

# Corpo preparado

A redação passa a registrar preços por cidade/item em um wizard e consultar séries históricas no dashboard. O overlay público exibe os últimos preços do broadcaster, filtrando pela cidade ativa ou deduplicando por item entre cidades. A Base de Dados existente passa a ter relações referenciais, tabela pesquisável/paginada e exportações completas de registros, notas e vínculos.

O acesso à Base e à gravação de preços exige associação editorial confiável, compartilhada entre editores autorizados. Autoria dos registros é imutável; notas só podem ser editadas/removidas pelo próprio autor. Foram corrigidas a corrida de estado após login e a abertura indevida do menu móvel que ocultava controles para tecnologias assistivas no desktop.

Relaciona #1, #2 e #3. Não fechar issues apenas pela implementação local.

Validação local: lint, typecheck, build de todos os workspaces, contratos, 92 testes Vitest, 68 pgTAP e fluxos reais de Auth/Data API/UI. O roteiro versionado passou também contra o build de produção local: concorrência, zero/retry, dois editores, notas, relações, três CSVs, mobile/teclado, overlay anônimo nas duas resoluções, ausência de cidade/dados, falha de rede e revogação.

Quatro migrations novas. Aplicação remota depende de projeto/migrations confirmados, inventário de dados, lista aprovada de editores e autorização específica. Constraints `NOT VALID` preservam o legado; precisam de auditoria e validação antes de concluir implantação. Não promove usuários automaticamente. Preview requer banco isolado compatível. Merge/produção não estão autorizados por este lote.

Evidências, commits, decisões, preflight e reversão: `docs/validation/issues-editoriais.md`.
