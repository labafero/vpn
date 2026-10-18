# Preparar ambiente para desenvolver e publicar

Procedimento da skill [vpn-environment](../../.agents/skills/vpn-environment/SKILL.md). A política comum está em [entrega](entrega.md); conta e destinos ficam em [ambientes](../operations/environments.md). Este procedimento não autoriza deploy ou alteração de banco.

## Descobrir o que falta

Conferir branch/worktree, alterações locais, `.nvmrc`, `packageManager` da raiz, versões na CI, vínculos `.vercel/project.json`/`.vercel/repo.json`, `supabase/.temp/project-ref` e nomes de variáveis, sem imprimir valores privados.

No shell, verificar `command -v`/`type -a` e versões de Node, pnpm, Vercel, Supabase e GitHub CLI quando a tarefa envolver PR/CI. No WSL, um pnpm em `/mnt/c/...` e erro de socket não demonstram problema do projeto: carregar NVM e usar ferramentas Linux. NVM já instalado não deve ser reinstalado por falta de Node no PATH.

O objetivo habitual é editar, executar lint/testes e acessar serviços hospedados. Não instalar Docker, subir aplicativos ou replicar banco por padrão. Se um teste realmente exigir containers ou portas, identificar essa necessidade separadamente.

## Runtime e dependências

Instalar NVM pelo [procedimento oficial](https://github.com/nvm-sh/nvm#installing-and-updating) apenas quando ausente. Na raiz do repositório:

```bash
source "$HOME/.nvm/nvm.sh"
nvm install
nvm use
node --version
```

Usar a versão de pnpm em `package.json` (atualmente 11.1.3). Se faltar, instalar no runtime Linux; não usar o pnpm do Windows no WSL. Definir Node 24 como padrão do usuário só se isso estiver autorizado. A `.nvmrc` seleciona Node 24 no projeto; a CI ainda pode usar outra versão e deve ser consultada.

```bash
npm install --global pnpm@11.1.3
pnpm install --frozen-lockfile
```

Instalar CLIs somente quando necessário e verificar as opções com `--help`. Versões comprovadas constam no registro de ambientes; não assumir que são a versão mais recente. Supabase tem versão fixa na CI: usar distribuição oficial compatível, não `npm install -g supabase`. Descobrir arquitetura/sistema antes de baixar um binário. Configurar o PATH para o diretório Linux escolhido.

## Acesso às contas

Consultar primeiro o estado autenticado, sem disparar login desnecessário:

```bash
vercel whoami
supabase projects list --agent no --output-format text
gh auth status
```

Quando faltar sessão, iniciar o fluxo oficial. No Supabase 2.119.0, `supabase login --agent no --output-format text --no-browser` permite autenticação humana mesmo quando há detecção de agente. O usuário abre o link e insere o código no mesmo terminal. Não pedir senha, token ou código pelo chat. Se o shell do agente não for o terminal interativo do usuário, instruir a execução no terminal humano.

Se o navegador não abrir no WSL, verificar se o comando configurado em `BROWSER` existe. Um link pode ser aberto manualmente no Windows; a ausência de `wslview` não significa ausência de conta. Seguir trabalho independente enquanto o usuário autentica e conferir de novo o resultado.

## Destinos e configuração privada

Conferir conta/equipe, projeto, root directory e ambiente na plataforma antes de vincular. Não criar projetos ou alterar configurações remotas como teste de login. `vercel link --help` e `supabase link --help` definem as opções instaladas. No monorepo, vínculos por aplicativo podem coexistir; a publicação direcionada usa a raiz do repositório, não um duplo `vpn-site/vpn-site`.

No Supabase, confirmar ref e consultar migrations com o projeto vinculado; `migration list` é evidência de alinhamento, não autorização para `db push`, `db reset` ou operação SQL. Uma leitura por CLI não comprova os fluxos Auth/Data API do aplicativo.

Usar `~/.config/vpn/` para configuração privada do projeto, pasta `700`, arquivos `600`, separados por aplicativo/destino. Manter sessões das CLIs em seus locais oficiais. Arquivos privados não entram no Git, logs ou deploy.

Os `.env.example` definem nomes esperados. A pasta privada não carrega nada automaticamente: verificar como o comando escolhido lê o arquivo. Os comandos Nuxt atuais usam `.env` no aplicativo. `.env.local` com `VERCEL_OIDC_TOKEN`, que a Vercel pode gerar ao vincular, não substitui as variáveis da aplicação. Evitar carregar produção por padrão para lint/testes.

## Provar o preparo

Executar os checks pertinentes ao objetivo e registrar os resultados: `pnpm lint`, `pnpm test:foundation`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm format:check`. Build deve ser executado quando necessário à mudança; News consulta `city_config` no Supabase durante o prerender e exige URL/chave pública válidas.

Distinguir instalação, sessão, vínculo e integração funcional. Não declarar sucesso de um check não executado. Erros de sandbox/DNS ou `listen EPERM` requerem o caminho de execução permitido pelo ambiente; não alterar testes ou dependências para ocultar a restrição.

Atualizar evidências em `docs/validation/` e fatos de conta/versões em `docs/operations/environments.md`. Próxima ação de publicação: [workflow de publicação](publicacao.md).
