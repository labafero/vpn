# Publicar, acompanhar e validar uma entrega VPN

Procedimento da skill [vpn-release](../../.agents/skills/vpn-release/SKILL.md). Usar [entrega](entrega.md) para autorizações e continuidade, e [ambientes](../operations/environments.md) para descobrir os destinos. Preparação de máquina fica em [preparar ambiente](preparar-ambiente.md).

## Definir a operação em andamento

Recuperar aplicativo/projeto, equipe, branch, SHA completo, PR, ambiente, domínio e autorização existente. Revalidar o projeto/root directory na conta. Ler o diff e executar os checks pertinentes antes de publicar. Não repetir aprovação compatível já dada; não inferir merge, produção dos outros aplicativos ou mudança no banco.

| Pedido                                   | Caminho                                                             |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Preview de uma PR                        | Desativado nos projetos VPN; habilitar explicitamente se necessário |
| Produção aprovada de um aplicativo       | Publicação direcionada por CLI                                      |
| Acompanhar/status/abrir deploy existente | Consultar o deployment; não criar outro                             |

Os quatro arquivos `vercel.json` desativam deployments automáticos originados do Git. Use a CLI para publicar explicitamente apenas o aplicativo autorizado. A configuração não bloqueia `vercel deploy --prod`. Se for necessário preview no futuro, reabilitar deployments Git conscientemente antes de abrir/atualizar a PR.

## Preview associado à PR

1. Conferir a PR, branch e head SHA, por exemplo `gh pr view <numero> --json headRefName,headRefOid,url`. Se ainda não existir PR, preparar diff/descrição e criá-la dentro do escopo da tarefa; não incluir arquivos privados ou mudanças alheias.
2. Commit/push da branch dentro da autorização existente. `main` é produção nos projetos atuais: não fazer push em main para criar preview. Uma autorização ausente deve ser solicitada com o commit/destino já preparados.
3. Consultar a versão instalada: `vercel list --help`. Listar no projeto/equipe, filtrando `--meta githubCommitRef=<branch> --json`, e conferir o SHA completo em `meta.githubCommitSha`. Não escolher simplesmente a primeira entrada ou o deployment global mais recente.
4. Recuperar o ID com `vercel inspect <url> --scope <equipe>` e registrar a relação PR → projeto → branch → SHA → ID/URL. Alias de branch pode mudar de commit; usar URL/ID específico como evidência.
5. Conferir target Preview. Se uma operação que deveria ser preview criar produção inesperada, cancelar esse deployment e verificar o estado antes de qualquer domínio; não promover nem associar aliases para contornar o problema.

Acompanhar CI da PR (`gh pr checks <numero>`) separadamente do build Vercel. Não criar outro deployment porque a CI está pendente ou o build está na fila.

## Produção direcionada

Confirmar autorização para o aplicativo/destino atual e guardar o deployment que atende o domínio como ponto de retorno. Verificar diff e SHA do código que será enviado. Sem autorização de merge, não integrar main para disparar produção por conveniência.

Executar **na raiz do monorepo**, usando IDs obtidos do vínculo/conta, com o root directory remoto já definido no projeto:

```bash
VERCEL_ORG_ID=<org-confirmada> VERCEL_PROJECT_ID=<projeto-confirmado> vercel deploy --dry --prod --yes --scope <equipe> --json
VERCEL_ORG_ID=<org-confirmada> VERCEL_PROJECT_ID=<projeto-confirmado> vercel deploy --prod --yes --no-wait --scope <equipe>
```

Os placeholders devem ser substituídos, não executados literalmente. Não usar a pasta do aplicativo como raiz de envio se isso fizer o projeto resolver `vpn-site/vpn-site`. `--cwd` para inspeção de vínculo não determina sozinho a raiz correta do envio.

Revisar a lista do dry run e `.vercelignore`: fontes/pacotes/lockfile necessários presentes; `.aws`, `.codex`, `.agents`, `.env` privados, dependências e saídas geradas excluídos. Não imprimir respostas completas de variáveis ou incluir credenciais no bundle.

Registrar ID/URL e target retornados. O comando com `--no-wait` pode imprimir uma mensagem de sucesso enquanto `readyState` ainda é INITIALIZING: a mensagem confirma criação, não conclusão. Prosseguir com acompanhamento.

## Acompanhar o deployment correto

Uma observação read-only reproduzível:

```bash
python3 .agents/skills/vpn-release/scripts/deployment_status.py <dpl_id> --scope <equipe> --project <nome-ou-id> --target <preview-ou-production> --sha <sha-completo>
```

Em produção acrescentar `--domain <hostname-oficial>`. O helper usa a API autenticada pela CLI e imprime somente evidências selecionadas; não publica, promove ou muda aliases.

| Retorno | Significado                                                   | Próxima ação                                           |
| ------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| 0       | Plataforma READY e identidade conferida nos campos fornecidos | Validar HTTP/UI real; ainda não é entrega concluída    |
| 2       | INITIALIZING/QUEUED/BUILDING ou alias oficial ainda pendente  | Consultar novamente com espera limitada                |
| 1       | Projeto/target/SHA incorreto ou falha terminal                | Investigar; não validar nem promover o artefato errado |
| 3       | Falha de CLI/acesso/schema/estado desconhecido                | Diagnosticar autenticação, ajuda e resposta suportada  |

Sem `--sha`, a consulta pode informar status, mas `commitVerified` será falso. Não apresentar esse resultado como prova do commit da PR. Target nulo em um preview comum é normal na API Vercel; custom environments não devem ser tratados como preview por suposição.

Consultar a cada 15–30s, com esperas de no máximo 45s por chamada e atualizações ao usuário em até 60s. Adotar um prazo de observação (por exemplo, dez minutos), ajustável quando houver progresso concreto. Ao excedê-lo, consultar fila/logs e registrar estado/ponto de retomada; não criar outro deploy nem manter um loop silencioso. ERROR/CANCELED interrompem a espera. Correção e nova tentativa dependem da causa e da autorização vigente; não repetir cegamente.

Logs: `vercel inspect <url> --scope <equipe> --logs`. Usar o ID/URL registrado, sem trocar para outro build mais recente. READY pode anteceder a associação do domínio por alguns segundos: reconsultar alias e `vercel inspect <dominio> --scope <equipe>`, conferindo ID e SHA via API se necessário. Não alterar DNS ou aliases sem diagnosticar o estado.

## Verificar o destino e registrar

Seguir a [referência de navegador](../../.agents/skills/vpn-release/references/browser.md). Preview protegido pode exigir sessão/cookie de automação autorizado; manter a proteção e não colocar segredo em URL. Validar a funcionalidade alterada, não somente título ou status 200. Em produção usar o domínio oficial, não apenas a URL gerada.

Registrar em `docs/operations/environments.md` somente mudanças duradouras no estado operacional, como configuração de domínio, cron ou credencial por nome. Estado efêmero de deployment, CI, build e prova HTTP/UI fica na saída das ferramentas e na PR, sem criar relatório documental por entrega. Evitar copiar IDs da última entrega para a próxima como se fossem atuais.

Quando a produção vier de uma branch não integrada, preservar o código no Git e registrar essa relação: outro deploy de main usará o estado de main. Produção autorizada não implica merge. Se houver defeito da publicação, usar o ponto de retorno dentro da autorização compatível, consultar a ajuda de `vercel rollback` e verificar o domínio após a reversão; em incidentes/decisões fora do escopo, preparar a ação concreta e pedir autorização.

Referências oficiais: [Vercel monorepos](https://vercel.com/docs/monorepos), [CLI deploy](https://vercel.com/docs/cli/deploy), [CLI inspect](https://vercel.com/docs/cli/inspect).
