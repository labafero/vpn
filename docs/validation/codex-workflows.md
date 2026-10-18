# Skills operacionais VPN

Verificação em 17/10/2026, após a publicação do splash. Objetivo autorizado: transformar a experiência de preparação/publicação em instruções reutilizáveis para Codex, sem executar nova publicação.

## Organização

- `.agents/skills/vpn-environment`: seleção de preparo/diagnóstico da máquina, com procedimento em `docs/workflows/preparar-ambiente.md`.
- `.agents/skills/vpn-release`: preview em PR, produção direcionada e acompanhamento de deployment existente, com procedimento em `docs/workflows/publicacao.md`, referência de navegador e helper read-only.
- `AGENTS.md` encaminha essas tarefas às skills. O guia antigo permanece como índice humano. Estado operacional e evidências de entregas ficam nos registros existentes, sem IDs históricos fixados como parâmetros das skills.
- Skills de fornecedores e seus hashes em `skills-lock.json` não foram alterados. As skills próprias ficam versionadas no diretório de repositório indicado pela documentação oficial do Codex.

## Validação

- Validador da skill-creator aprovou ambas as skills e seus manifests.
- 11 testes do helper passaram: estado INITIALIZING apesar de mensagem otimista, commits/projetos/targets incorretos, preview nulo versus custom environment, alias pendente, erro terminal, SHA ausente e omissão de campos privados da resposta.
- Consultas reais somente de leitura: produção `dpl_DJcRKgt4s8XKS3E2qsKLymvryfK5`, SHA `f15a8e9ee929cf59b88f338a32e7455491363e16`, domínio oficial; preview `dpl_2ZJTf7W4j8cyMoiGh6Z1KHCzqJbY`, SHA `a064a165f9bca86c49c68d0415e81fa4e9287c36`. Ambos retornaram READY, identidade conferida e `uiVerified: false`, preservando a distinção entre estado da plataforma e prova de interface.
- Referências locais das skills/workflows resolvidas; formatação e `git diff --check` passaram.
- Avaliação independente offline aplicou os procedimentos a quatro cenários: produção de um aplicativo sem preview adicional; retorno INITIALIZING com mensagem de pronto; preview de PR com outro deployment global mais recente; máquina WSL sem runtime Linux funcional.
- O baseline com a skill genérica preservou os limites de autorização, mas deixou a raiz/seleção do projeto do monorepo sem roteiro e utilizou `--format json` na listagem, opção incompatível com a CLI verificada. A avaliação com as novas skills escolheu a raiz do monorepo com IDs confirmados, `--json`, identidade por SHA, acompanhamento limitado e separação entre browser headless e visível; não encontrou bloqueadores procedimentais.

## Limites

A avaliação de comportamento foi uma simulação offline, não um novo deploy. Não houve instalação de ferramentas, login, push, merge, mudança de banco ou alteração em produção nesta validação. O helper foi testado com consultas reais; a seleção implícita das skills depende do carregamento pelo Codex e pode exigir atualização/reinício da sessão. O AGENTS.md fornece um caminho explícito mesmo quando a lista da sessão ainda não foi atualizada.
