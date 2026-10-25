# Validação do SSO central da VPN

Estado em 23 de outubro de 2026 (UTC): publicação e verificações públicas concluídas; a integração local e o fluxo de sessão entre apps foram validados em navegador. Callbacks OAuth com consentimento real ainda aguardam validação. Nenhum merge foi feito.

## Código e checks

- Branch: `codex/central-auth-sso`
- SHA publicado: `33405ebd14ebaf07da94dc65e049a3d37d792c38`
- Depois do deployment, uma revisão endureceu somente o harness: ele agora rejeita Supabase remoto e exige que Site, Monitor e News usem o mesmo hostname local. Os três testes Node de guarda passaram; o bundle dos apps não mudou após o SHA publicado.
- Supabase local: `pnpm exec supabase status -o json` não iniciou porque o processo não tem permissão no socket Docker (`permission denied`). As travas do harness recusaram tanto um Supabase remoto quanto uma URL de app remota antes de criar fixtures ou acessar a URL do app.
- Testes de autenticação e middleware: 8 arquivos, 24 testes passaram.
- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm contracts:check` passaram.
- `pnpm test:foundation -- --maxWorkers=1 --minWorkers=1`: 37 arquivos, 200 testes passaram.
- `pnpm build` passou para todos os workspaces com as variáveis públicas do exemplo News. Permaneceram avisos já observados de mapas de origem, tamanho de chunks e tipos Supabase ausentes no app Site; nenhum interrompeu o build.
- Continuação da validação local: 38 arquivos, 203 testes da fundação passaram; lint, format:check, typecheck, contratos e `git diff --check` passaram.
- O middleware do News passou a aguardar claims verificados, e o gate editorial consulta o `sub` verificado em vez de depender do ref reativo ainda vazio durante a navegação SSO. O login por senha do portal também confirma os claims antes de navegar.

## Produção Vercel

Os três deployments foram publicados diretamente pela CLI a partir do mesmo SHA. Os alvos foram `production`; cada ID foi acompanhado até `READY`, e o domínio oficial foi conferido.

| App     | Deployment                         | URL do deployment                                                 | Domínio oficial                    |
| ------- | ---------------------------------- | ----------------------------------------------------------------- | ---------------------------------- |
| Site    | `dpl_2NkrdH6k1zVqrTh4aznGgvhC8iq1` | <https://vpn-site-qxyu79xwz-anilson-lopes-projects.vercel.app>    | <https://vpn.labafero.com>         |
| Monitor | `dpl_FCskZ22oWdeeziNSCzkZcgThnnCo` | <https://vpn-monitor-q8762uk7g-anilson-lopes-projects.vercel.app> | <https://vpn-monitor.labafero.com> |
| News    | `dpl_CdDwDw9YGbrooFeAiwmXtwJcuMCR` | <https://vpn-news-c4y3cx0eb-anilson-lopes-projects.vercel.app>    | <https://vpn-news.labafero.com>    |

No projeto `vpn-news`, `autoAssignCustomDomains` estava desativado. Após confirmar que `vpn-news.labafero.com` pertencia ao projeto e continuava no deployment anterior, o alias oficial foi atribuído ao novo ID com `vercel alias set`; `vercel inspect vpn-news.labafero.com` e `vercel alias list` confirmaram o destino atual.

Os pontos de retorno que atendiam os domínios antes desta publicação eram Site `dpl_BtNgcypPvMuGpbV3Y4C9Ne3f4yPX`, Monitor `dpl_8i6HxD3C8y14eoSQangf51BeSUVj` e News `dpl_HdM3X76JNKZ1Tvzu2eRe42pKotZE`. Nenhum rollback foi executado.

## Configuração remota conferida em 23/10/2026

No projeto Supabase `VPN_RP` (`zxzigoaddoslkokbzmyc`): `site_url` permaneceu `https://vpn.labafero.com`; Discord e Twitch permaneceram habilitados; `mailer_autoconfirm` permaneceu `true`. A allowlist conservou os valores anteriores e recebeu somente estes callbacks exatos:

- `https://vpn.labafero.com/auth/callback`
- `https://vpn-monitor.labafero.com/auth/callback`
- `https://vpn-news.labafero.com/auth/callback`

Nenhum segredo de provider foi alterado.

## Atualização da allowlist local em 25/10/2026

Após autorização do usuário, confirmei pela CLI que o projeto `VPN_RP` (`zxzigoaddoslkokbzmyc`) continuava `ACTIVE_HEALTHY`. A configuração Auth remota mantinha `site_url=https://vpn.labafero.com` e os callbacks oficiais de produção. A allowlist já continha `http://localhost:3000` como origem, mas não continha os callbacks locais.

Atualizei somente `uri_allow_list` pela Management API, preservando as entradas existentes e acrescentando:

- `http://localhost:3000/auth/callback`
- `http://localhost:3001/auth/callback`
- `http://localhost:3002/auth/callback`

Leitura posterior retornou HTTP 200, confirmou os três callbacks habilitados e confirmou que o `site_url` continuou em produção. Nenhuma configuração de provedor ou segredo foi alterado.

Nos três projetos Vercel, comparei sem exibir valores as variáveis de produção: o Site contém `NUXT_PUBLIC_VPN_AUTH_URL`, `NUXT_AUTH_RETURN_ORIGINS` e as duas variáveis Supabase públicas; Monitor e News contêm `NUXT_PUBLIC_VPN_AUTH_URL` e as duas variáveis Supabase públicas. As URLs centrais, a URL do projeto Supabase e as origens de retorno corresponderam aos valores esperados; a chave pública Supabase é igual nos três apps.

## Evidência de browser nos domínios oficiais

Os testes publicados usaram Chromium headless contra os domínios de produção, sem cookie de usuário:

- Site: `/entrar`, `/cadastro`, `/termos-de-uso` e `/politica-de-privacidade` responderam `200`; os formulários exibiram campos de e-mail/senha e ações Discord/Twitch. O endpoint de retorno preservou `https://vpn-monitor.labafero.com/conexao?tab=clips` e substituiu uma origem externa pelo fallback central.
- Monitor: `/conexao?tab=clips` e o `/login` legado redirecionaram ao portal com o destino esperado. Um callback PKCE com código inválido voltou ao portal com mensagem genérica, preservou o destino e não deixou o código na URL final.
- News: `/` respondeu `200`; `/redacao` e o `/login` legado sem sessão redirecionaram ao portal com `/redacao` como destino. Callback inválido voltou com o mesmo erro genérico e destino preservado.

Esses resultados provam renderização e redirecionamentos sem sessão. Não provam autenticação concluída, cookie compartilhado, autorização editorial autenticada ou logout entre domínios.

## Evidência de integração local

Em 23/10/2026, a stack Supabase local foi iniciada com a CLI `2.119.0`, migrations aplicadas e Mailpit disponível. Site, Monitor e News foram executados em `127.0.0.1:3003`, `:3001` e `:3000`, respectivamente. As guardas locais e o roteiro de browser passaram usando o Google Chrome do sistema via `VPN_CHROME_PATH` (o download Chromium padrão do Playwright não suporta Ubuntu 26.04 neste host), confirmando signup/confirmação, cookie compartilhado, 403 para usuário comum, acesso editorial para membro, logout, rotas legadas, isolamento de papéis e callback PKCE inválido. Fixtures de Auth e associação editorial foram removidas pelo `finally` do roteiro.

## Pendências para fechar a prova ponta a ponta

1. Autorizar Discord e Twitch em um navegador comum e confirmar cada retorno pelo respectivo callback. O navegador Playwright disponível é automatizado e já havia sido recusado pelo OAuth Twitch em validação anterior; não o usei para declarar callback real. Não há navegador de desktop do host disponível neste WSL.
2. Após uma sessão autorizada, confirmar cookie `.labafero.com` no Site, Monitor e News, acesso entre apps, comportamento autenticado de `/redacao` e logout compartilhado.
3. A configuração remota auto confirma e-mails (`mailer_autoconfirm=true`), então o fluxo real de confirmação pendente não pode ocorrer nela no estado atual. Não alterei essa política de produção. A prova de confirmação pendente segue sem execução porque o Supabase local não pôde iniciar.

O teste repetível em `vpn-site/tests/central-auth-browser.cjs` cobre cadastro, confirmação via Inbucket, sessão entre os três apps, isolamento de papéis, proteção editorial, logout e callback inválido quando executado com Supabase local em `127.0.0.1`.

## Correção do OAuth no desenvolvimento local em 25/10/2026

Os `.env` ignorados do Site, News e Monitor estavam apontando para o Supabase local, onde Discord e Twitch não estão habilitados. Restaurei os valores hospedados dessas cópias locais, mantendo as URLs dos apps e a lista de origens de retorno em `localhost`; nenhuma credencial foi registrada neste documento. O teste versionado `vpn-site/tests/ui-shell-browser.cjs` confirmou em Chrome visível que ambos usam o projeto Supabase hospedado e callbacks locais permitidos. Uma execução com `VPN_UI_LIVE_OAUTH=1` também confirmou que o Supabase aceitou os dois provedores e redirecionou para os domínios oficiais Discord e Twitch. A execução parou antes de credenciais/consentimento e não comprova uma nova sessão OAuth local concluída. O mock de Turnstile do teste serve apenas para sincronizar a hidratação; não valida o CAPTCHA real nem o login por senha.

Os scripts de desenvolvimento agora fixam Site `3000`, News `3001`, Monitor `3002` e Sentry `3003`, evitando que a escolha automática de portas troque Site e News quando iniciam juntos. Os quatro servidores responderam nas portas previstas.
