# Lint e Prettier no monorepo

## Escopo e autorização

11/10/2026: usuário solicitou mesclar PR #9 e aplicar lint + Prettier para facilitar leitura/revisão humana. PR #9 mesclada no commit 3c2e1d733a9be053c1b90ea5c760cf0ca34f79a4 após todos os checks passarem. Branch codex/lint-prettier baseada nesse main, no worktree isolado existente. Entrega da padronização em PR separada.

## Padrão

- Prettier 3.8.3 e eslint-config-prettier 10.1.8 centralizados na raiz, reutilizando as versões já existentes na News. Lock preserva o grafo existente: somente importers foram ajustados.
- `.prettierrc.json`: dois espaços, aspas simples, sem ponto e vírgula/vírgula pendente, largura 100, um atributo por linha e finais LF. Templates Vue usam htmlWhitespaceSensitivity=ignore para blocos legíveis; pontuação adjacente ao nome de cidade foi mantida explicitamente.
- ESLint continua analisando código dos quatro projetos Nuxt; configuração final do Prettier desativa regras estilísticas conflitantes. Prettier cobre fontes/configurações Vue, TypeScript, JavaScript, JSON, CSS e YAML do monorepo.
- `pnpm format` escreve; `pnpm format:check` verifica sem alterar; `pnpm lint` analisa e `pnpm lint:fix` corrige regras autofixáveis. CI agora exige format:check entre lint e typecheck.
- Tipos gerados do Supabase/OpenAPI, lock, dependências, outputs e estado local excluídos; não houve mudança nos arquivos gerados. Preferências de editor não foram alteradas além da formatação mecânica do JSON existente.

## Evidências

Check inicial identificou 176 arquivos fora do padrão. Após formatação, pnpm format:check passou. pnpm lint, pnpm typecheck, pnpm contracts:check e 92 testes de 21 arquivos passaram. Revisão independente: 143 arquivos equivalentes à aplicação mecânica do formatter ao baseline; templates Vue parseiam e palavras de conteúdo preservadas. Pequena diferença de espaço antes de `?` na confirmação de remoção de cidade corrigida e lint/check repetidos.

Instalação congelada concluída. Uma reinstalação foi necessária para recriar links locais de dependências transitivas; o lock final evita atualizar bibliotecas fora do escopo. Build inicial revelou quatro handlers Vue com múltiplas instruções que o Prettier semi:false separou por newline; Nuxt os interpretou como expressão inválida. As mesmas atribuições foram extraídas para funções nomeadas (nota, confirmação de exclusão de registro/relação e retorno do wizard), sem mudar sua ordem/efeito. Auditoria compileTemplate: 4 erros antes, 0 em 55 templates depois. Lint, format:check e typecheck repetidos passaram. Revisão independente confirmou handlers equivalentes. Build completo dos quatro projetos com Supabase local isolado passou. Os 12 grupos de aceitação editorial sobre o bundle final passaram, incluindo edição de notas, retorno do wizard, CSV, revogação e OBS em 1280/1920 px; fixtures removidas. Consulta SQL confirmou users/records/posts/values=0, policy temporária=0 e catálogo original=8. Nenhuma alteração de schema/acessos remotos. Pendências por destino: publicação da PR e checks remotos; merge desta nova PR ainda não autorizado.
Git também fixa LF em .gitattributes, evitando que core.autocrlf do Windows gere falsos erros de format:check após checkout. PR publicada: https://github.com/labafero/vpn/pull/10; configuração e fontes em commits separados.
