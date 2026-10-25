const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const browserTools =
  process.env.VPN_BROWSER_TOOLS || path.join(os.homedir(), '.cache', 'vpn-tools', 'browser')
const { chromium } = require(path.join(browserTools, 'node_modules', 'playwright'))
const siteUrl = new URL(process.env.VPN_UI_SITE_URL || 'http://localhost:3000')
const newsUrl = new URL(process.env.VPN_UI_NEWS_URL || 'http://localhost:3001')
const monitorUrl = new URL(process.env.VPN_UI_MONITOR_URL || 'http://localhost:3002')
const builtNewsUrl = new URL(
  process.env.VPN_UI_BUILD_NEWS_URL ||
    (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://vpn-news.labafero.com')
)
const browserExecutable =
  process.env.VPN_BROWSER_EXECUTABLE ||
  ['/usr/bin/google-chrome', '/usr/bin/chromium'].find((candidate) => fs.existsSync(candidate))

async function assertHostedOAuthEndpoint(page, provider) {
  const liveOAuth = process.env.VPN_UI_LIVE_OAUTH === '1'
  const authRequests = []
  const onRequest = (request) => {
    const url = new URL(request.url())
    if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/auth/v1/')) {
      authRequests.push(`${url.host}${url.pathname}`)
    }
  }
  page.on('request', onRequest)
  if (!liveOAuth) await page.route('**/auth/v1/authorize**', (route) => route.abort())
  try {
    const requestPromise = page
      .waitForRequest(
        (request) => {
          const url = new URL(request.url())
          return url.pathname === '/auth/v1/authorize'
        },
        { timeout: 10000 }
      )
      .catch(() => {
        throw new Error(
          `No ${provider} OAuth request was issued. Auth requests observed: ${authRequests.join(', ') || 'none'}.`
        )
      })
    await page.getByRole('button', { name: `Continuar com ${provider}` }).click()
    const authorizeUrl = new URL((await requestPromise).url())
    assert.match(authorizeUrl.hostname, /^[a-z0-9-]+\.supabase\.co$/)
    assert.equal(authorizeUrl.searchParams.get('provider'), provider.toLowerCase())
    const callbackUrl = new URL(authorizeUrl.searchParams.get('redirect_to'))
    assert.ok(
      [siteUrl.origin, newsUrl.origin, monitorUrl.origin].includes(callbackUrl.origin),
      'OAuth returns through the local callback of the requested app.'
    )
    assert.equal(callbackUrl.pathname, '/auth/callback')
    if (liveOAuth) {
      const providerDomain = provider === 'Discord' ? 'discord.com' : 'twitch.tv'
      await page.waitForURL((url) => url.hostname.endsWith(providerDomain), { timeout: 20000 })
    }
  } finally {
    page.off('request', onRequest)
    if (!liveOAuth) await page.unroute('**/auth/v1/authorize**')
  }
}

async function run() {
  const browser = await chromium.launch({
    headless: process.env.VPN_UI_HEADED !== '1',
    ...(browserExecutable ? { executablePath: browserExecutable } : {})
  })
  try {
    const page = await browser.newPage()
    await page.addInitScript(() => {
      window.__VPN_E2E_TURNSTILE_RENDERED__ = false
      window.turnstile = {
        render(_container, options) {
          window.__VPN_E2E_TURNSTILE_RENDERED__ = true
          queueMicrotask(() => options.callback('local-e2e-turnstile-token'))
          return 'local-e2e-widget'
        },
        reset() {},
        remove() {}
      }
    })
    await page.goto(siteUrl.href, { waitUntil: 'domcontentloaded' })

    const navigation = page.getByRole('navigation', { name: 'Navegação VPN' })
    await navigation.waitFor({ state: 'visible', timeout: 8000 })

    const siteLink = navigation.getByRole('link', { name: 'Site', exact: true })
    const newsLink = navigation.getByRole('link', { name: 'News', exact: true })
    const monitorLink = navigation.getByRole('link', { name: 'Monitor', exact: true })
    assert.equal(await siteLink.getAttribute('aria-current'), 'page')
    assert.equal(await siteLink.getAttribute('href'), siteUrl.origin)
    assert.equal(await newsLink.getAttribute('href'), newsUrl.origin)
    assert.equal(await monitorLink.getAttribute('href'), monitorUrl.origin)
    assert.equal(
      await page.getByRole('link', { name: 'Entrar', exact: true }).getAttribute('href'),
      '/entrar'
    )
    await page.getByRole('link', { name: 'Explorar a VPN', exact: true }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'Abrir navegação VPN' }).isVisible(), false)

    await page.goto(
      new URL('/entrar?return_to=http%3A%2F%2Flocalhost%3A3002%2Fconexao', siteUrl).href,
      {
        waitUntil: 'domcontentloaded'
      }
    )
    assert.equal(await page.getByRole('navigation', { name: 'Navegação VPN' }).count(), 0)
    await page.getByText('Entre na sua conta').waitFor()
    await page.waitForFunction(() => window.__VPN_E2E_TURNSTILE_RENDERED__ === true)
    await assertHostedOAuthEndpoint(page, 'Discord')
    await page.goto(new URL('/entrar', siteUrl).href, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => window.__VPN_E2E_TURNSTILE_RENDERED__ === true)
    await assertHostedOAuthEndpoint(page, 'Twitch')

    await page.goto(new URL('/cadastro', siteUrl).href, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.getByRole('navigation', { name: 'Navegação VPN' }).count(), 0)
    await page.getByText('Crie sua conta VPN').waitFor()

    await page.goto(siteUrl.href, { waitUntil: 'domcontentloaded' })
    await page.getByRole('navigation', { name: 'Navegação VPN' }).waitFor({ state: 'visible' })

    await page.setViewportSize({ width: 390, height: 844 })
    assert.equal(await page.getByRole('button', { name: 'Abrir navegação VPN' }).isVisible(), true)
    await page.getByRole('button', { name: 'Abrir navegação VPN' }).click()
    const mobileNavigation = page.locator('#vpn-app-mobile-navigation')
    await mobileNavigation.waitFor({ state: 'visible' })
    assert.equal(
      await mobileNavigation
        .getByRole('link', { name: 'Site', exact: true })
        .getAttribute('aria-current'),
      'page'
    )

    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(newsUrl.href, { waitUntil: 'domcontentloaded' })
    const newsNavigation = page.getByRole('navigation', { name: 'Navegação VPN' })
    await newsNavigation.waitFor({ state: 'visible', timeout: 8000 })
    assert.ok((await page.locator('.vpn-app-bar').boundingBox()).height <= 56)
    assert.equal(await page.getByRole('link', { name: 'Todas as cidades', exact: true }).count(), 0)
    assert.equal(
      await newsNavigation
        .getByRole('link', { name: 'News', exact: true })
        .getAttribute('aria-current'),
      'page'
    )
    const signIn = new URL(
      await page.getByRole('link', { name: 'Entrar', exact: true }).getAttribute('href')
    )
    assert.equal(signIn.origin, siteUrl.origin)
    assert.equal(signIn.pathname, '/entrar')
    assert.equal(signIn.searchParams.get('return_to'), newsUrl.origin + '/')

    await page.goto(new URL('/neon', newsUrl).href, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.getByRole('navigation', { name: 'Navegação VPN' }).count(), 0)

    const prerenderedCityPath = path.join(
      __dirname,
      '../../vpn-news/.output/public/neon/index.html'
    )
    if (fs.existsSync(prerenderedCityPath)) {
      const prerenderedCity = fs.readFileSync(prerenderedCityPath, 'utf8')
      assert.match(prerenderedCity, /<script[^>]+type="module"/)
      assert.ok(
        prerenderedCity.includes(encodeURIComponent(new URL('/neon', builtNewsUrl).href)),
        'Prerendered city sign-in link returns to the configured News origin.'
      )
    }

    await page.goto(new URL('/overlay/idle', newsUrl).href, { waitUntil: 'domcontentloaded' })
    assert.equal(await page.getByRole('navigation', { name: 'Navegação VPN' }).count(), 0)

    await page.goto(new URL('/conexao', monitorUrl).href, { waitUntil: 'domcontentloaded' })
    await page.waitForURL((url) => url.origin === siteUrl.origin && url.pathname === '/entrar')
    const monitorReturnTo = new URL(page.url()).searchParams.get('return_to')
    assert.equal(monitorReturnTo, new URL('/conexao', monitorUrl).href)

    process.stdout.write(
      'Shared shell smoke passed: Site desktop/mobile and auth OAuth providers, News public/city/static return paths, OBS overlay exclusion, and Monitor auth return path.\n'
    )
  } finally {
    await browser.close()
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
