# Páginas legais para o OAuth do Discord

Data: 18/10/2026. PR: https://github.com/labafero/vpn/pull/25. Branch: `feat/site-discord-legal-pages`. Commit da implementação: `b02e77e36ddafad564054244ba6db8a2e367d0fe`. Merge em `main`: `7257900ce53ba902844362cd5fe60fdf5237da3c`.

## Resultado

As páginas públicas de termos de uso e política de privacidade estão publicadas para os campos de política do app no Discord Developer Portal:

- https://vpn.labafero.com/termos-de-uso
- https://vpn.labafero.com/politica-de-privacidade

A home também apresenta links para as duas páginas. O texto cobre o uso atual do site, a vinculação OAuth do Discord em implantação, os dados tratados, compartilhamento, retenção, segurança, controles e contato pelo servidor oficial da VPN. A política descreve o comportamento verificado: referências pendentes a clipes não expiram automaticamente; registros finalizados seguem retenção de até 90 dias, mas a limpeza automática ainda não está agendada em produção.

## Checks e navegador

- `pnpm --filter @vpn/site lint`, `typecheck` e `build`: passaram localmente.
- PR #25: checks de CI passaram; Preview Vercel `dpl_bBmJ8MgpfpgEZecod4dNsQiCAikb`, projeto `vpn-site`, branch/SHA acima, estado `READY`.
- CI no merge para `main`: run https://github.com/labafero/vpn/actions/runs/39178777502 passou, incluindo lint, formatação, typecheck, contratos, testes da fundação e build dos aplicativos afetados.
- HTTP público sem bypass: as rotas de termos, privacidade e home retornaram 200. Os títulos foram `Termos de uso — VPN Roleplay`, `Política de privacidade — VPN Roleplay` e `VPN Roleplay — A cidade nunca dorme`; a home contém os dois links legais.
- Chromium/Playwright no domínio oficial: navegação entre termos e privacidade, links externos do Discord e links da home passaram. Em viewport móvel de 390×844 não houve overflow horizontal. Sem erros de página ou de console.
- Capturas desktop e mobile: `/tmp/vpn-terms-desktop.png` e `/tmp/vpn-privacy-mobile.png`; são arquivos temporários locais, não anexos persistentes.

## Produção

Antes do merge, o domínio oficial atendia `dpl_2zpVK9z2Jv2n3DW1gDnxv8R792eM`, target `production`, SHA `c6a8d9c35b635da53cc5a42a50c12cb10585b93a`.

Após o merge, o projeto `vpn-site` publicou `dpl_FsV8td8q6dX4rEvYDvv8w1zCX6JX`, URL https://vpn-site-rcu8epiee-anilson-lopes-projects.vercel.app, target `production`, SHA completo `7257900ce53ba902844362cd5fe60fdf5237da3c`, estado `READY`. A API da Vercel confirmou o alias `vpn.labafero.com`; o helper `deployment_status.py` confirmou projeto, target, SHA e domínio. As rotas e a UI pública foram verificadas após a publicação.

O merge também iniciou deployments dos outros três projetos conectados ao monorepo; News, Monitor e Sentry foram cancelados. Nenhum foi promovido a produção por esta entrega.
