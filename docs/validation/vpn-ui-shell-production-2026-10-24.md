# VPN shared UI shell — produção

Data: 24 de outubro de 2026 (horário de São Paulo)

## Escopo publicado

Barra VPN compartilhada e links para Site, News e Monitor; tema comum do News/Monitor; remoção do cabeçalho redundante de cidades no News; encaminhamento de login para o portal central com retorno ao app e à rota de origem.

Não houve alteração no código ou no projeto Vercel do Sentry, em APIs, nem no banco Supabase.

## Deployments

Conta Vercel `quila`, equipe `anilson-lopes-projects`; raiz de envio `/home/anils/labafero/vpn`. Os três projetos foram conferidos na conta, com root directories `vpn-site`, `vpn-news` e `vpn-monitor`, Node 24.x, instalação `pnpm install --frozen-lockfile` e build `pnpm build`.

Os dry runs incluíram `packages/ui`, os arquivos dos três apps e `pnpm-lock.yaml`; ignoraram `.env`, `.env.local`, `.agents`, `.codex`, `.aws`, `node_modules` e saídas geradas.

| App | Deployment de produção | Domínio oficial conferido |
|---|---|---|
| Site | `dpl_DULo8TWivSfkdheXfpwZZBuE6MYJ` — READY — [vpn-site-q75j786rt-anilson-lopes-projects.vercel.app](https://vpn-site-q75j786rt-anilson-lopes-projects.vercel.app) | `vpn.labafero.com` aponta para o mesmo ID |
| News | `dpl_5Zcc6jkf1DLNxT7VYBM19MMbrch4` — READY — [vpn-news-mpjoafw39-anilson-lopes-projects.vercel.app](https://vpn-news-mpjoafw39-anilson-lopes-projects.vercel.app) | `vpn-news.labafero.com` aponta para o mesmo ID |
| Monitor | `dpl_FdmRHAbZS6ZmhroN1ubXVyUgwfYr` — READY — [vpn-monitor-ga2u3wltm-anilson-lopes-projects.vercel.app](https://vpn-monitor-ga2u3wltm-anilson-lopes-projects.vercel.app) | `vpn-monitor.labafero.com` aponta para o mesmo ID |

O News ficou READY sem associar automaticamente o domínio personalizado. O alias foi conferido e associado ao deployment acima com `vercel alias set`; depois, `vercel inspect vpn-news.labafero.com --json` confirmou o ID novo. Os domínios do Site e Monitor já apontavam para seus deployments READY.

A Vercel reporta o SHA `1251c3a51c560ff035f9e241ef93207d0627b631` para esses deployments, que era o HEAD da branch `codex/vpn-ui-shell` no envio. O CLI enviou o conteúdo local ainda não commitado; portanto `commitVerified` é falso e esse SHA não representa sozinho as alterações publicadas. O código permaneceu na branch/worktree local, sem push ou merge.

## Verificações

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check`, `pnpm test:foundation` (39 arquivos, 209 testes) e `pnpm build`: passaram antes da publicação; `pnpm build` passou novamente após o ajuste do menu mobile.
- `git diff --check`: passou.
- Browser Playwright em produção: Site desktop/mobile, menu mobile sob esquema claro, barra de 56 px, News e página Neon, ausência da barra “Todas as cidades”, return-to do login na home e cidade, exclusão do overlay, redirecionamento anônimo do Monitor para o login central e carregamento da tela de login. Sem erros JavaScript.
- O acionamento do menu mobile por teclado não foi confirmado no Chromium headless; abertura por toque/clique foi validada. Tratar como pendência de acessibilidade.
- Sentry de produção, sem sessão: `/api/v1/health` respondeu HTTP 200; `/api/v1/me` respondeu HTTP 401, confirmando o guard anônimo.
- A automação não tinha uma sessão autenticada de usuário, então não foi possível registrar `/api/v1/me` com HTTP 200 nem completar uma operação autenticada real após a publicação. O login real segue dependente da sessão do usuário.

Warnings de sourcemap do Nuxt/Tailwind e da anotação `#__PURE__` do VueUse apareceram nos builds; não impediram a geração dos quatro apps. O Site também reportou o aviso preexistente de arquivo de tipos do banco ausente e fallback para `unknown`.

## Pontos de retorno

Antes da publicação, os domínios apontavam para os deployments `dpl_8hX2HDKNtHmnTgGypeARVRBuELoe` (Site), `dpl_CdDwDw9YGbrooFeAiwmXtwJcuMCR` (News) e `dpl_5wYpyGW1Wcptk8E5CpLqxMAGVmJy` (Monitor). Para rollback, conferir cada deployment com `vercel inspect` e a ajuda atual de `vercel rollback` antes de agir.
