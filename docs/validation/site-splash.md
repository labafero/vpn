# Splash da home e validação do fluxo de deploy

Data: 17/10/2026. Branch: `feat/site-splash`. Base: `b47ee83`.

## Objetivo e autorização

O usuário solicitou uma mudança visual real na home institucional, inspirada na abertura do site GTA VI, para comprovar o fluxo de deploy e a validação pelo navegador. Aprovou o desenho de marca VPN central, fundo escuro, brilho vermelho, saída em aproximadamente 1,5 segundo, botão de pular e respeito a movimento reduzido. Em seguida determinou repetição em toda abertura e F5, substituindo a proposta inicial de uma vez por sessão.

Destino: preview do projeto existente `vpn-site`, equipe `anilson-lopes-projects`. Root directory `vpn-site`, Node 24.x. Não promover produção nem aplicar migrations como parte desta prova. A home institucional não usa banco: este deploy não comprova uma leitura autenticada do Supabase. O vínculo Supabase e as 25 migrations alinhadas estão registrados em `ambiente-local.md`.

## Implementação

- `VpnSplash.vue` acrescenta abertura animada com SVG da identidade existente; não usa imagens da Rockstar, armazenamento de sessão ou porcentagem fictícia.
- A animação termina por CSS mesmo sem hidratação. JavaScript remove o elemento e limpa o timer no unmount.
- Botão Pular e Escape dispensam a abertura. Ao dispensar com o botão focado, foco segue para o título da home.
- Movimento reduzido oculta a abertura imediatamente por CSS e pelo cliente.
- A home existente permanece renderizada pelo servidor e disponível após a abertura.

## Plano de verificação

1. Formatar e executar lint, typecheck, contratos, testes de fundação e build do Site.
2. Publicar a branch para disparar preview pela integração Git, identificar deployment pelo commit e confirmar target Preview/estado READY.
3. Abrir o destino real em Chromium: desktop, mobile, F5, botão Pular, teclado, movimento reduzido e JavaScript desativado. Conferir erros no console e overflow horizontal; guardar capturas sem credenciais.
4. Registrar URL, commit, resultado remoto e pendências. Manter produção atual até revisão do usuário.

## Evidências e pendências

- Ferramentas: Node 24.22.0, pnpm 11.1.3, Vercel CLI 64.5.0.
- Formatação executada; lint, typecheck e contratos passaram na preparação.
- Chromium/Playwright instalados fora das dependências do produto. A primeira tentativa de abrir Chromium identificou biblioteca Linux ausente (`libnspr4.so`); instalação das dependências do navegador depende de sudo humano e foi solicitada ao usuário.
- Lint, typecheck, contratos, formatação, 92 testes de fundação, 7 testes dos scripts CI e build do Site passaram. Build emitiu avisos de sourcemaps e retries de metadados Google Fonts, mas concluiu com fontes em cache local.
- Preview e validação no navegador ainda pendentes; não declarar prova remota sem executá-la.
