# Preparação de uma máquina de desenvolvimento

O desenvolvimento, lint e testes rodam na máquina. Publicação dos aplicativos ocorre na Vercel; banco e serviços integrados ficam no Supabase hospedado. Docker e uma stack Supabase local são opcionais para testes isolados de banco, não requisitos para o fluxo habitual.

## Ferramentas Linux/WSL

Instalar NVM pelo [procedimento oficial](https://github.com/nvm-sh/nvm#installing-and-updating) e carregar `~/.nvm/nvm.sh` no shell. Não reutilizar o pnpm do Windows no WSL. Executar os comandos abaixo na raiz do repositório; `.nvmrc` seleciona Node 24.

```bash
nvm install
nvm alias default 24
nvm use
npm install --global pnpm@11.1.3 vercel@64.5.0
node --version
pnpm --version
vercel --version
```

Instalar a CLI Supabase oficial 2.119.0, versão da CI, usando o artefato correspondente ao sistema e arquitetura. Confirmar `supabase --version` e que seu diretório está no PATH. Não usar instalação global via npm para Supabase.

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:foundation
pnpm typecheck
pnpm contracts:check
pnpm format:check
```

Node 24 é a escolha deste ambiente; a CI ainda usa Node 22. Não assumir equivalência dos resultados sem verificar a CI.

## Configuração privada

Usar `~/.config/vpn/` como fonte privada de configuração do projeto. A pasta deve ter permissão `700`; arquivos com credenciais, `600`. Não versionar arquivos nem copiar valores para a documentação.

Estrutura sugerida, com arquivos criados somente quando necessários:

```text
~/.config/vpn/
  news/development.env
  monitor/development.env
  sentry/development.env
  site/development.env
  integration/preview.env
  integration/production.env
```

Os exemplos `.env.example` dos aplicativos definem os nomes esperados. Os arquivos nessa pasta não são carregados automaticamente pelo Nuxt ou pelas CLIs: o carregamento precisa indicar aplicativo e destino explicitamente. Os comandos atuais de desenvolvimento leem `.env` no aplicativo. Definir e validar o mecanismo de carregamento antes de usá-lo; não presumir que mover arquivos configura a integração.

Manter sessões de autenticação das CLIs nos locais gerenciados por elas. Priorizar login oficial; usar tokens separados e com escopo apropriado apenas quando necessários para automação. Configurações de produção não devem ser carregadas por padrão para lint/testes.

## Contas e destinos

```bash
vercel login
vercel whoami
supabase login --agent no --output-format text --no-browser
supabase projects list --agent no --output-format text
```

No WSL, se o navegador não abrir, copiar o link para o navegador do Windows e informar o código no mesmo terminal que iniciou o login. Não enviar códigos ou tokens pelo chat. O flag termina em `--no-browser` (com `r`). `--agent no --output-format text` permite o prompt humano mesmo quando o ambiente detecta um agente.

Consultar `docs/operations/environments.md` e revalidar equipe, projetos e root directories na conta. Vínculos não são compartilhados automaticamente entre máquinas ou entre aplicativos.

Antes de vincular, consultar `vercel link --help` e `supabase link --help`. Vincular cada aplicativo ao projeto Vercel correspondente e o repositório ao projeto Supabase confirmado. Comparar migrations com `supabase migration list` depois do vínculo; vincular e consultar não autorizam aplicar mudanças no banco.

Exemplo de vínculos existentes confirmados em 17/10/2026, executado na raiz do repositório:

```bash
vercel link --yes --scope anilson-lopes-projects --project vpn-news --cwd vpn-news
vercel link --yes --scope anilson-lopes-projects --project vpn-monitor --cwd vpn-monitor
vercel link --yes --scope anilson-lopes-projects --project vpn-sentry --cwd vpn-sentry
vercel link --yes --scope anilson-lopes-projects --project vpn-site --cwd vpn-site
supabase link --project-ref zxzigoaddoslkokbzmyc --agent no --output-format text --yes
supabase migration list --linked --agent no --output-format text
```

A CLI Vercel pode baixar um token OIDC temporário para `.env.local` ao vincular. Esse arquivo precisa continuar ignorado pelo Git, com permissão `600`. Não é um backup de configuração nem garante acesso a valores privados remotos. Os comandos atuais Nuxt usam `.env`, portanto não presumir carregamento de `.env.local`.

Os projetos Vercel têm root directory igual ao nome do aplicativo. Ao preparar publicação manual, conferir como a CLI envia a raiz do monorepo e resolve esse diretório antes de executar deploy; o vínculo por aplicativo, sozinho, não valida esse passo.

## Preparação do deploy

Seguir `docs/workflows/entrega.md`. Confirmar commit, destino e checks; revisar variáveis por nome e dependências do banco. Conferir se o fluxo escolhido é a integração Git existente ou publicação explícita pela CLI, evitando dois deploys para a mesma entrega.

Publicar preview quando autorizado, confirmar o target retornado e verificar HTTP/UI no destino real. Deploy de produção e migrations remotas exigem autorização compatível com a entrega. Não usar deploy ou alteração de banco como teste de instalação das CLIs.

O build do News consulta `city_config` no Supabase para gerar páginas estáticas e exige URL/chave pública válidas. Não é necessário executar build remoto ou carregar credenciais de produção para provar que lint e testes locais funcionam.


## Prova realizada com o splash do Site

Branch `feat/site-splash`, commit inicial `a064a16`, PR #21. O push disparou automaticamente o deployment `dpl_2ZJTf7W4j8cyMoiGh6Z1KHCzqJbY`, com target Preview, sem publicar produção. A configuração Git existente também disparou os outros três aplicativos; isso pode adicionar espera à fila mesmo quando só um workspace muda.

```bash
git push -u origin feat/site-splash
vercel list vpn-site --scope anilson-lopes-projects --meta githubCommitRef=feat/site-splash --json
vercel inspect vpn-site-knp64evg0-anilson-lopes-projects.vercel.app --scope anilson-lopes-projects
vercel inspect vpn-site-knp64evg0-anilson-lopes-projects.vercel.app --scope anilson-lopes-projects --logs
gh pr checks 21
```

Para uma entrega nova, substituir branch, URL e PR pelos resultados dessa entrega. Conferir o SHA completo no deployment, pois o alias da branch pode mudar de commit.

### Navegador no WSL

Playwright/Chromium podem ser instalados como ferramentas de validação fora do repositório. Além do binário, Chromium exige bibliotecas Linux: o instalador `playwright install-deps chromium` usa sudo e pode exigir senha no terminal humano. A existência de `DISPLAY`/Wayland com WSLg permite janela visível; navegação headless sozinha não abre uma janela para o usuário. Neste ambiente `BROWSER=wslview` estava configurado, mas o executável não existia; foi usada uma janela Chromium via WSLg.

Previews protegidos exigem sessão Vercel no navegador humano ou acesso de automação autorizado. A CLI `vercel curl` gerencia o bypass de automação. Em 64.5.0, `--cwd` após `curl` foi repassado incorretamente ao curl do sistema: executar a partir do diretório vinculado e passar `--scope` antes do subcomando. Usar cookie ou header para automação; nunca colocar o segredo na URL ou no registro de validação. A CLI pode criar o token de automação no projeto ao primeiro uso; isso não desativa a proteção.

Validar no preview real: desktop/mobile, F5, Pular/Escape, movimento reduzido, JavaScript desativado, erros do console e navegação após a abertura. Guardar apenas evidências sem credenciais. Acompanhar separadamente CI, build Vercel e prova de interface; nenhum deles substitui os outros.


## Publicação direta de um aplicativo em produção

Quando a produção estiver explicitamente autorizada e a versão tiver sido aprovada localmente, não é obrigatório criar outro preview. Para publicar só o Site, executar da raiz do monorepo com os IDs confirmados, pois o root directory remoto já é `vpn-site`:

```bash
VERCEL_ORG_ID=team_2jtnk9op6XJqsvnTSfafbETS VERCEL_PROJECT_ID=prj_jdfBpNeabXqUYLCXb4fwxRYX9ngO vercel deploy --dry --prod --yes --scope anilson-lopes-projects --json
VERCEL_ORG_ID=team_2jtnk9op6XJqsvnTSfafbETS VERCEL_PROJECT_ID=prj_jdfBpNeabXqUYLCXb4fwxRYX9ngO vercel deploy --prod --yes --no-wait --scope anilson-lopes-projects
```

IDs não são segredos. Não definir a pasta do aplicativo como raiz de envio se o projeto espera o monorepo. Conferir os arquivos do dry run e usar `.vercelignore` para impedir envio de credenciais, `.env` privados e saídas locais. O comando real deve usar um commit conhecido com os checks aplicáveis aprovados.

Consultar `vercel inspect <url> --scope anilson-lopes-projects`, acompanhar logs e confirmar target Production, estado READY e alias oficial. Abrir `https://vpn.labafero.com` no Chromium e verificar a mudança real, console, mobile e comportamento sem JavaScript. Guardar o deployment anterior para reversão. Um deployment CLI pode apontar para uma branch ainda não integrada a main: registrar esse estado, pois um próximo deploy de main usará o código de main. Publicar em produção não autoriza merge ou alterações no banco.

Referências oficiais: [monorepos](https://vercel.com/docs/monorepos), [seleção do projeto por IDs](https://vercel.com/docs/cli/global-options), [deploy pela CLI](https://vercel.com/docs/cli/deploy).


Produção comprovada em 17/10/2026 com o procedimento acima: commit `f15a8e9`, deployment `dpl_DJcRKgt4s8XKS3E2qsKLymvryfK5`, target Production e READY; domínio `vpn.labafero.com` validado em Chromium desktop/mobile. A publicação direta afetou só o Site. Resultados e reversão: [registro do splash](../validation/site-splash.md).
