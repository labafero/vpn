# Preparação local em 24/10/2026

Branch `main`, commit base `0c44318`, worktree `/home/anils/labafero/vpn`, inicialmente sem alterações. Execução solicitada pela skill `vpn-environment`, seguindo [preparação](../workflows/preparar-ambiente.md). Escopo: preparar desenvolvimento e checks locais, verificar acessos hospedados. Nenhum deploy, alteração de banco ou instalação de Docker.

## Ferramentas e configuração

- WSL2 Linux x86_64. Node 24.21.0 existente via NVM, compatível com `.nvmrc` (`24`); padrão do usuário preservado. CI continua em Node 22.
- pnpm Linux 11.1.3 já disponível; `pnpm install --frozen-lockfile` passou, incluindo geração Nuxt. Lockfile e fontes permaneceram sem alterações.
- Vercel CLI 64.5.0 instalada via npm no runtime NVM Linux. Instalador registrou aviso sobre script de instalação de esbuild não autorizado; `vercel --version` e `vercel whoami` executaram. Deploy/build pela CLI não foram testados.
- Supabase CLI 2.119.0, versão fixada na CI, instalada em `~/.local/bin/supabase`. SHA-256 do arquivo Linux amd64 conferido contra `checksums.txt` da release oficial.
- GitHub CLI autenticado como `anilsonlopes`, protocolo Git SSH. Nenhuma PR ou alteração remota criada.
- `~/.config/vpn` criado com permissão `700`, sem segredos provisionados.
- `.env` por aplicativo criado a partir do respectivo `.env.example`, com configuração pública Supabase já versionada em News e campos privados vazios. Permissões `600` e ignore Git conferidos. Os comandos Nuxt carregam esses arquivos locais; não foi feita cópia de segredos de produção.

## Serviços

- Inicialmente sem sessões Vercel/Supabase. Após o usuário concluir os logins, `vercel whoami` confirmou `quila`; listagem da equipe `anilson-lopes-projects` e inspeção dos quatro projetos confirmaram root directories correspondentes e Node 24.x.
- `vercel link` vinculou News, Site, Monitor e Sentry aos projetos existentes por diretório de aplicativo. `.env.local` gerados com credencial OIDC temporária, ignorados pelo Git e com permissão `600`; não substituem os `.env` da aplicação. Ignores redundantes gerados pela CLI foram removidos, preservando o ignore da raiz.
- `supabase projects list --agent no --output-format text` confirmou acesso ao projeto `VPN_RP`, ref `zxzigoaddoslkokbzmyc`. `supabase link` concluiu e `supabase migration list --linked --agent no --output-format text` confirmou 27 migrations alinhadas. Nenhuma migration aplicada.
- Requisições com a chave pública versionada ao projeto `zxzigoaddoslkokbzmyc`: `/auth/v1/settings` HTTP 200 e leitura mínima de `/rest/v1/city_config` HTTP 200. Evidência de acesso público Auth/Data API, sem comprovar login de usuário, integração completa ou acesso administrativo.

## Checks

- `pnpm lint`: passou nos quatro aplicativos.
- `pnpm typecheck`: passou nos quatro aplicativos. Executado antes da criação dos `.env`, registrou avisos de URL/chave ausentes. Site também avisou que `app/types/database.types.ts` não existe e usou `Database = unknown`; nenhuma alteração de tipos feita nesta preparação.
- `pnpm contracts:check`: passou.
- `pnpm format`: passou sem alterações nos fontes.
- `pnpm format:check`: passou.
- Primeira execução de `pnpm test:foundation` concorrendo com outros checks: 202 de 203 testes passaram; um teste de contrato excedeu o limite de 5 s. Execução completa isolada: **38 arquivos, 205 testes passaram** em 14,08 s. O timeout foi contenção de recursos; nenhum limite ou teste foi alterado.
- Build completo `pnpm build` passou nos quatro aplicativos. Avisos de sourcemap de Tailwind/Rollup não impediram a geração.

## Pendências e retomada

Preparo de ferramentas, checks locais, sessões hospedadas, vínculos e login entre aplicativos validado.

Segredos privados permanecem fora dos `.env` locais. O Sentry autenticado foi validado pelo endpoint de produção; um Sentry local com banco privado ainda precisa de `NUXT_PRIVATE_DATABASE_URL` para executar seus fluxos completos. Publicação do código local segue a skill `vpn-release` e requer destino e autorização compatíveis.

## Diagnóstico e correção do login no navegador

Site, Monitor e News iniciados localmente nas portas 3003, 3001 e 3000. Playwright com Google Chrome do sistema confirmou redirecionamento de `/conexao` e `/redacao` ao portal, preservando o destino. O formulário recebeu HTTP 400 do endpoint Supabase de senha e exibiu a mensagem genérica de credenciais.

Uma janela visível do Edge nativo do Windows, controlada pelo Playwright via Chrome DevTools Protocol, foi usada para depurar o navegador do usuário. A observação registrou apenas caminhos, status HTTP e códigos de erro, sem senha ou tokens. A tentativa inicial retornou **HTTP 400, `captcha_failed`**, em `/auth/v1/token`.

Leitura autenticada da configuração Auth pela Management API confirmou `security_captcha_enabled=true` e provider `turnstile`. A tela de login e cadastro agora renderiza o widget e envia `options.captchaToken` para os métodos Auth do Supabase. A site key pública foi configurada como `NUXT_PUBLIC_TURNSTILE_SITE_KEY` no projeto Vercel `vpn-site` nos ambientes Development, Preview e Production, e no `.env` local ignorado pelo Git.

Verificação em Edge: widget emitiu token; tentativa com usuário de teste chegou a `invalid_credentials`, provando aceitação do token CAPTCHA. Com a conta real, a sessão autenticou Site e abriu Monitor `/conexao` e News `/redacao` localmente; a mesma sessão autorizou `GET /api/v1/me` no Sentry de produção (HTTP 200). A correção do destino padrão também foi exercitada: `/api/auth/return-target` retorna a origem local permitida quando a pessoa abre o portal diretamente; um `return_to` do Monitor preserva `/conexao`. Host não permitido continua usando o fallback canônico.

## Publicação em produção

Após autorização explícita do usuário, o projeto Vercel `vpn-site` foi publicado diretamente da raiz do monorepo para Production pela CLI, sem merge ou push em `main`. O dry run contou 353 arquivos (3,9 MB) e excluiu `.env`, `.env.local`, `.vercel`, dependências, diretórios gerados e ferramentas privadas. A configuração Vercel confirmou `vpn-site` com root directory do aplicativo e domínio oficial `vpn.labafero.com`.

- Deployment: `dpl_8hX2HDKNtHmnTgGypeARVRBuELoe`, target Production, `READY`; URL imutável `https://vpn-site-tpl2ljm7e-anilson-lopes-projects.vercel.app`; alias `https://vpn.labafero.com` associado ao mesmo ID.
- A API da Vercel reportou SHA `0c4431881151a77bf847db3acf084cdf52b839d9` (commit-base `0c44318`). O upload incluiu as alterações locais não commitadas descritas nesta seção; o SHA reportado pela plataforma não representa sozinho esse conteúdo. O diff foi preservado na branch local de entrega após a publicação.
- Prova HTTP no domínio oficial: Site `/` HTTP 200; `/entrar` HTTP 200 com widget Turnstile no HTML; `/api/auth/return-target` retornou `https://vpn.labafero.com/`; com `return_to=https://vpn-monitor.labafero.com/conexao`, preservou exatamente esse destino.
- Checagem conjunta dos serviços: Monitor `/conexao` HTTP 200; News `/redacao` HTTP 200; Sentry `/api/v1/me` sem sessão HTTP 401 (`UNAUTHORIZED`), confirmando que a rota protegida não aceita acesso anônimo. A sessão real havia sido validada antes deste deploy nos apps locais e no Sentry de produção; ainda falta repetir a navegação autenticada com a nova produção do Site.

A site key deve permanecer Config pública nos ambientes Vercel. Secret do Turnstile continua apenas no Supabase. Para concluir a prova pós-publicação com conta real, abrir `https://vpn.labafero.com/entrar`, entrar e confirmar o retorno ao Monitor/News solicitado e o acesso autenticado ao Sentry.
