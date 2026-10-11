# Planejamento das três issues editoriais

Em 10/10/2026 foram consultadas as três issues abertas, seus comentários (nenhum), o histórico Git, a CI e `origin/main` `e797899`. Nenhuma PR aberta. Workspace atual `codex/fase-1-evidencias-producao` contém mudança documental do DNS que deve ser preservada e entregue separadamente. Código atual e main não divergem nas áreas destas issues. Banco remoto não foi inspecionado neste planejamento; migrations versionadas são evidência de intenção, não de estado remoto atual.

## Ordem recomendada

1. Pré-requisito editorial da [issue #3](2026-10-10-issue-3-base-de-dados.md), tarefa 1: acesso por associação confiável, compartilhado pela Base e pelos novos valores.
2. [Issue #1: valores](2026-10-10-issue-1-valores.md): catálogo, snapshots, wizard e dashboard.
3. [Issue #2: stocks](2026-10-10-issue-2-overlay-stocks.md): consulta deduplicada e renderização no OBS, após #1.
4. Restante da [issue #3: Base de Dados](2026-10-10-issue-3-base-de-dados.md): relações, tabela e exportação. Independente de #1/#2 após autorização editorial.

Os planos de monitoramento Fase 0/1 permanecem separados. Não criar novos serviços, ambientes ou tabelas duplicadas de cidade. Execução deve partir de main atualizado em worktree isolado, preservando documentação pendente; autorização editorial é um pré-requisito de código e banco, não concessão automática a usuários.

## Revisão solicitada

Regra já confirmada: Base compartilhada entre autorizados da redação. Propostas a revisar: valores por broadcaster; sem cidade, último valor por item entre cidades com identificação de origem; leitura pública de preços como antes; catálogo global com oito nomes sem preços; Base com tipos atuais, relações direcionadas e três exportações CSV; associação editorial administrada fora da UI neste lote.

Planos e implementação local aprovados pelo usuário em 10/10/2026. Atribuição de membros editoriais reais, push/preview, merge, migrations remotas e produção continuam sem autorização. A execução local está registrada em `docs/validation/issues-editoriais.md`; nenhuma issue remota foi fechada.

## Verificação e entrega

A CI atual possui Vitest e pgTAP, além de lint → typecheck → build; instruções antigas sobre ausência de testes estão desatualizadas. Ampliar suite existente para `vpn-news/tests`, sem remover checks. Rodar `pnpm lint`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm test:foundation`, `pnpm dlx supabase@2.119.0 test db` e `pnpm build` com Supabase local/configuração pública de build. Os resultados da execução estão no registro de validação.

Na execução, criar `docs/validation/issues-editoriais.md` com autorizações, commit/worktree/PR, evidências locais/preview/remotas, pendências e reversão por entrega. Não fechar issues apenas com UI pronta se banco, RLS ou prova de fluxo ainda estiverem pendentes. Estratégia sugerida: execução direta nesta sessão após revisão, dada a dependência do modelo e das políticas; delegação apenas se escolhida pelo usuário.
