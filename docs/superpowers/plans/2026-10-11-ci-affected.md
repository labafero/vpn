# CI por impacto

> Execução nesta sessão com superpowers:executing-plans, a partir da análise aprovada pelo usuário.

**Objetivo:** executar builds dos aplicativos afetados e iniciar uma única instância Supabase somente quando necessária, preservando checks de código e o prerender real do News.

**Arquitetura:** um seletor Node lê os manifests dos workspaces e propaga alterações aos consumidores. O workflow usa o diff de push/PR e suporta execução completa manual. Um resultado final estável agrega seleção e verificações; runs antigos de PR são cancelados.

**Escopo:** GitHub Actions; nenhuma mudança no banco remoto ou configuração Vercel. Entrega em PR separada com base `main`, conforme correção do usuário. PR 10 já mesclada no commit 96091b8.

## Tarefas e critérios

- [ ] Testar seleção: Site isolado, dependentes de contratos/database, migrations/testes/configuração do banco, configuração global, docs, exclusões e execução manual.
- [ ] Implementar seletor com propagação pelo grafo real de dependencies/devDependencies/optionalDependencies; fallback completo para caminhos desconhecidos e histórico indisponível.
- [ ] Adaptar workflow: checks rápidos para código, builds seriais selecionados, um Supabase compartilhado por SQL e News, sem artefato de tipos não comparado, cancelamento por PR, status final obrigatório.
- [ ] Verificar testes, Prettier, sintaxe do workflow e execução remota; registrar resultados e abrir/anexar PR.

## Pontos de revisão

Diff PR considera merge-base; push considera before/after, incluindo exclusões. Novo branch/histórico ausente executa tudo. Mudança de lockfile/workflow/seletor executa tudo e SQL. Docs não iniciam banco/build. Falhas de seleção/checks devem falhar no agregado, nunca virar skip verde. News mantém Supabase e cidades prerenderizadas.
