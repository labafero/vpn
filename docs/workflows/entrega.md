# Do planejamento à entrega

Rotina para agentes trabalhando neste repositório. Preservar o objetivo e as autorizações do usuário ao retomar. A documentação versionada é a memória compartilhada; atualizar fatos relevantes no lugar adequado, sem depender da conversa inteira.

## Retomar e planejar

Ler AGENTS.md, o PRD do app em `docs/product/`, ADRs relevantes em `docs/adr/`, `PRD.md` geral quando o escopo cruzar apps, `DESIGN.md` para mudanças visuais e o estado operacional atual em `docs/operations/`. Consultar branch, worktree, diff, PR e CI. Identificar a primeira etapa incompleta. Não refazer decisões ou implementação já aprovadas. Aplicar skills relevantes e usar planejamento proporcional à mudança.

Mudanças complexas podem usar um plano de execução curto com resultado observável, limites, dependências, critérios e destino. Plano não é fonte durável de produto ou arquitetura: ao concluir a entrega, atualizar PRD/ADR para comportamento e decisões; verificações ficam nos testes, CI e PR. Remover o plano concluído. Distinguir aprovação de código, push, preview, merge e produção; uma autorização não implica as demais.

Para preparar máquina/acessos, usar [preparar ambiente](preparar-ambiente.md) via `vpn-environment`. Para preview em PR, produção ou acompanhamento de deploy existente, usar [publicação](publicacao.md) via `vpn-release`. Esses procedimentos detalham a execução sem substituir as autorizações e evidências deste fluxo.

## Descobrir antes de perguntar

Consultar docs/operations/environments.md. Conferir configuração versionada, vínculos locais e nomes das variáveis privadas, sem imprimir valores. Usar CLI/API/MCP para consultar projetos, equipe, domínio, root directory, deployments e banco. Descobrir comandos pela ajuda e confirmar capacidades atuais na documentação oficial.

Se uma CLI não estiver instalada, considerar execução pelo gerenciador de pacotes com versão fixada, API ou MCP. Falta da ferramenta local não demonstra ausência de capacidade. Diferenciar instalação ausente, sessão não autenticada, permissão insuficiente e projeto inexistente.

Pedir somente o que as fontes acessíveis não resolvem: login humano, escolha entre destinos ambíguos ou ação fora do escopo autorizado. Explicar a descoberta concreta que motivou a pergunta. Nunca pedir tokens, senhas ou arquivos .env pelo chat; iniciar o fluxo oficial de autenticação. Enquanto aguarda, executar trabalho independente.

## Executar e verificar

Reutilizar worktree apropriado e manter correções independentes em branches/PRs próprias quando acordado. Diagnosticar a causa raiz antes de modificar. Para segurança ou comportamento relevante, testar o caso de falha e verificar a correção. Nunca editar tipos de banco gerados manualmente.

Verificar o necessário à mudança e os checks exigidos pelo repositório. Rodar novamente somente quando novas alterações ou falhas justificarem. Falha preexistente da CI deve ter causa identificada, PR responsável e impacto descrito; não eliminar checks para obter verde.

Mudanças em autenticação, sessão ou autorização devem provar o percurso inteiro do usuário pelas aplicações envolvidas, e não somente o app alterado: portal Site, retorno ao Monitor/News e uma operação autenticada do Sentry (`/api/v1/me` ou fluxo de negócio equivalente). Cobrir também logout e o estado sem sessão quando fizerem parte da mudança. Registrar separadamente apps locais e serviços remotos usados na prova.

Separar evidências:

| Etapa            | Evidência necessária                                                                  |
| ---------------- | ------------------------------------------------------------------------------------- |
| Código local     | Comandos, resultado, commit ou diff verificado                                        |
| Integração local | Serviços reais envolvidos, resposta observada e limpeza das fixtures                  |
| Preview          | URL, commit publicado, configuração do destino e prova HTTP/UI                        |
| Banco remoto     | Projeto confirmado, migrations existentes/pendentes, execução e verificação posterior |
| Job remoto       | Agenda registrada e resposta HTTP da execução, não apenas enfileiramento              |
| Produção         | Autorização compatível, resultado real e procedimento de reversão                     |

Sucesso local não substitui prova remota. Sanitização de logs da aplicação não prova ausência de metadados nos logs da plataforma. Falha ou trabalho adiado não conta como sucesso parcial suficiente para fechar a fase.

## Preparar a entrega e agir dentro do escopo

Antes de pedir uma autorização realmente necessária, preparar o resultado para revisão: diff/PR, destino identificado, migrations pendentes ou dry run, variáveis exigidas por nome, impacto, verificações e reversão. Aprovação deve ser o último passo da preparação. Continuar ações reversíveis já autorizadas sem pedir confirmação repetida. Respeitar restrições explícitas do plano e autorizações posteriores do usuário.

Atualizar a PR em torno da implementação final e anexá-la à tarefa. Não mesclar PRs nem promover produção por conveniência. Após qualquer mudança externa autorizada, verificar seu efeito; uma resposta de criação ou enfileiramento não encerra a prova de funcionamento.

## Deixar continuidade e fechar

Os testes automatizados e seus resultados pertencem aos testes e à CI; não manter uma cópia documental paralela. PRDs e ADRs descrevem comportamento e decisões duráveis. `docs/operations/environments.md` mantém somente o estado atual necessário para operar e descobrir ambientes, sem histórico de testes ou de cada publicação. Nunca registrar credenciais, URLs com códigos OAuth ou dados pessoais de testes.

Na entrega ao usuário, informar o que mudou, o que passou, o que permanece aberto e a ação que depende dele. Marcar uma fase concluída apenas quando seus critérios estiverem atendidos. Se depender de login ou decisão externa, preservar o resultado revisável e o ponto de retomada.

## Melhorar a rotina

Transformar falhas recorrentes demonstradas em instruções curtas ou scripts verificáveis. Preferir documentos versionados ligados pelo AGENTS.md para contexto específico do VPN. Criar uma skill quando houver técnica reutilizável que exija orientação própria; avaliar RAG quando o volume e a recuperação de fontes demonstrarem essa necessidade. Não criar infraestrutura adicional apenas para armazenar fatos que cabem nestes registros.

## Conta, domínio e processos

Antes de configurar OAuth, conferir a conta do console e comparar o Client ID com o ambiente sem exibir segredos. Usar o domínio personalizado escolhido pelo usuário; perguntar apenas o nome se ele não estiver definido. No primeiro deploy de projeto Vercel, conferir o target retornado: a plataforma pode classificá-lo como produção mesmo quando solicitado preview. Cancelar imediatamente um target inesperado e verificar o próximo deployment antes de associar domínios.

Uma resposta final encerra a execução do agente, embora comandos externos possam continuar. Não dizer que está executando ou aguardando sem consultar o processo/deployment. Perguntas de status durante execução devem receber resposta em commentary, seguida da continuidade autorizada. Registrar bloqueios humanos concretos e continuar verificações independentes enquanto aguarda.
