# CI por impacto

## Autorização e destino

Usuário aprovou a análise consolidada e solicitou PR nova; corrigiu a base para main. Nenhum merge autorizado nesta etapa. Base 96091b8 (PR 10 já mesclada). Branch codex/ci-affected-workspaces.

## Comportamento

- PR usa merge-base; main usa before/after, incluindo arquivos removidos.
- Aplicativos afetados e consumidores transitivos são selecionados pelos manifests. Lockfile, workflow, seletor, configurações globais e caminhos desconhecidos executam tudo.
- Alterações de migrations/testes/configuração Supabase executam SQL e todos os builds; operação SQL manual não é aplicada.
- News mantém prerender real com Supabase. Uma única instância atende prerender e SQL quando ambos necessários. Site/Monitor/Sentry isolados não iniciam banco.
- Docs dispensam instalação e checks de código. O status ci verifica seleção e resultado, falhando em erros/cancelamentos de dependências.
- Cancelamento por PR; sem duplicação push + pull_request. Execução completa manual disponível. Removido artefato de tipos que não validava drift.
- Vercel permanece com sua configuração existente; a otimização afeta GitHub Actions.

## Verificação local — 11/10/2026

Prettier, lint dos quatro aplicativos, typecheck, contratos e 92 testes existentes passaram. Testes Node cobrem seletor e eventos Git reais: exclusão, divergência da base da PR, push, branch novo e execução manual. Actionlint 1.7.12 e git diff --check passaram. Revisão independente sem problemas bloqueantes; fixture corrigida para incluir Sentry como consumidor do pacote database.

## Evidência remota

A registrar após abertura da PR: resultado de seleção, uma inicialização Supabase, pgTAP, quatro builds e resultado agregado. Nenhum banco remoto alterado.
