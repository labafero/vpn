# Validar e mostrar o navegador

Ler quando a entrega exigir prova de UI ou o usuário pedir para ver o browser. Acessar a URL/commit da operação em andamento; não abrir um preview antigo por conveniência. HTTP 200 e READY são evidências de camadas diferentes da interface.

## Escolher a ferramenta

Usar a ferramenta de navegador já disponível. Se não houver, Playwright/Chromium pode ficar em uma pasta de ferramentas fora das dependências do produto. Reutilizar instalação existente; não adicionar Playwright ao monorepo só para inspecionar uma entrega.

Exemplo de preparação quando a ferramenta realmente estiver ausente, com versão revalidada antes da instalação:

```bash
VPN_BROWSER_TOOLS="${XDG_CACHE_HOME:-$HOME/.cache}/vpn-tools/browser"
npm install --prefix "$VPN_BROWSER_TOOLS" playwright@1.61.1
node "$VPN_BROWSER_TOOLS/node_modules/playwright/cli.js" install chromium
```

No Linux, binário instalado não garante as bibliotecas de sistema. Se o launch apontar biblioteca ausente, diagnosticar e usar `playwright install-deps chromium`. Esse passo pode exigir sudo humano; pedir que o usuário execute no próprio terminal, nunca que envie senha. O ambiente de execução pode exigir o caminho absoluto do Node instalado pelo NVM para o comando sudo.

## Sessão e proteção

No preview protegido, usar login humano ou acesso de automação autorizado, mantendo a proteção. `vercel curl` pode gerar/recuperar a credencial de bypass. Conferir a ajuda instalada. Na CLI 64.5.0, `--cwd` após `curl` foi passado incorretamente ao curl do sistema: executar a partir do diretório vinculado e passar `--scope` antes do subcomando.

Se usar o fluxo CLI para obter cookie, não imprimir corpo privado, headers ou cookie. Usar `umask 077`, cookie jar em pasta temporária privada, header `x-vercel-set-bypass-cookie: true` e destino específico. Importar o cookie somente no contexto de browser autorizado. Nunca colocar segredo em query string, código do produto, capturas ou Git. O primeiro uso pode criar uma credencial de automação no projeto: isso é acesso externo, não consequência de ler a skill.

Não remover proteção para facilitar testes. Em domínio oficial público, verificar sem bypass que um visitante normal consegue acessar a página. Uma sessão privilegiada não comprova acesso público.

## Provar a alteração

Conferir o status da navegação e a UI da mudança real. Escolher desktop/mobile, interação por teclado, refresh, console, rede e acessibilidade conforme o comportamento alterado. Para animações, observar fases e condições no relógio do browser (`requestAnimationFrame`/eventos), em vez de depender de um sleep externo que pode chegar tarde. Não tornar cenários específicos do splash obrigatórios para qualquer tipo de entrega.

Quando a mudança envolver abertura/transição, conferir: repetição solicitada em F5, botão Pular, Escape sem antes focar um botão, saída durante a animação, movimento reduzido, JavaScript desativado e carregamento lento. Confirmar que há conteúdo/links utilizáveis após a abertura. Screenshot de um instante não comprova duração ou navegação.

Guardar capturas e resultado sanitizado fora do Git, ou no local de artefatos acordado. Inspecionar as capturas, não apenas gerá-las. Registrar caminho e se são temporárias ou anexos persistentes; não prometer que um arquivo em `/tmp` estará disponível em outra máquina. Adaptar assertions à funcionalidade, não apenas à presença de um título.

## Mostrar a janela ao usuário

Headless serve para automação; não mostra uma janela. No WSL, conferir DISPLAY/Wayland/WSLg e se `BROWSER` aponta para um executável existente. Se houver desktop acessível, abrir Chromium com `headless: false`, trazer a aba correta para frente e manter o processo vivo. Se a ferramenta não mostrar uma janela nesta sessão, declarar o limite e fornecer URL/captura, sem afirmar que o usuário está vendo o browser.

Exemplo mínimo a ser salvo na pasta de ferramentas, onde `playwright` resolve como módulo:

```js
import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage()
await page.goto(process.argv[2], { waitUntil: 'domcontentloaded' })
await page.bringToFront()
console.log('Janela aberta no destino solicitado')
await new Promise((resolve) => browser.on('disconnected', resolve))
```

Para UI dependente de autenticação, preparar o contexto privado antes da navegação. Usar captura de erros/assertions apropriadas no teste separado; este exemplo só abre a janela. Confirmar o processo e a URL efetivamente abertos antes de informar sucesso. Uma resposta final não deve fingir que o agente continua acompanhando um build, ainda que uma janela/processo externo permaneça aberto.
