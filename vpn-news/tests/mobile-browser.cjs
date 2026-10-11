// Run from the repository root with all three apps and local Supabase running.
const { chromium } = require(process.env.VPN_PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { resolve } = require('node:path')

const status = JSON.parse(
  fs.readFileSync(process.env.VPN_TEST_SUPABASE_STATUS, 'utf8').replace(/^\uFEFF/, '')
)
assert(
  ['localhost', '127.0.0.1'].includes(new URL(status.API_URL).hostname),
  'Local Supabase required'
)
let browser, user, post
const extraPosts = []
const phase = process.env.VPN_MOBILE_PHASE || 'run'
const fixturePath = '.superpowers/runtime/mobile-fixtures.json'
function localPolicy(sql) {
  const file = resolve('.superpowers/runtime/mobile-policy.sql')
  fs.writeFileSync(file, sql)
  const result = spawnSync(
    process.env.VPN_PNPM_BINARY || (process.platform === 'win32' ? 'pnpm.exe' : 'pnpm'),
    [
      'dlx',
      'supabase@2.119.0',
      'db',
      'query',
      '--local',
      '--workdir',
      '.superpowers/runtime',
      '--file',
      file
    ],
    { windowsHide: true, encoding: 'utf8' }
  )
  assert.equal(
    result.status,
    0,
    `Local fixture policy operation failed: ${[result.stderr, result.stdout, result.error?.message].filter(Boolean).join('\n').slice(0, 1200)}`
  )
}
async function api(path, method = 'GET', body) {
  const response = await fetch(status.API_URL + path, {
    method,
    headers: {
      apikey: status.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${status.SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body && JSON.stringify(body)
  })
  assert(response.ok, `Local API ${method} ${path.split('?')[0]} ${response.status}`)
  return response.status === 204 ? null : response.json()
}
async function visit(page, port, route) {
  console.log(`CHECK ${port}${route}`)
  await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'domcontentloaded' })
  // City landing pages deliberately ship without scripts in production.
  if (phase === 'verify' && route === '/neon') {
    // Nuxt color-mode retains its small inline theme initializer with noScripts.
    assert.equal(
      await page.locator('script[src], script[type="module"]').count(),
      0,
      'City page must ship without hydration bundles'
    )
  } else
    await page.waitForFunction(
      () => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false
    )
  await page.waitForTimeout(350)
}
async function checkWidth(page, label) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth
    const outside = [
      ...document.querySelectorAll('header a, button, input, textarea, [role="combobox"]')
    ]
      .filter((element) => {
        if (element.closest('table')) return false // Columns are checked by keyboard scrolling below.
        const r = element.getBoundingClientRect()
        return r.width && r.height && (r.left < -1 || r.right > width + 1)
      })
      .map(
        (element) => element.getAttribute('aria-label') || element.textContent.trim().slice(0, 60)
      )
    return { width, scroll: document.documentElement.scrollWidth, outside }
  })
  assert(result.scroll <= result.width + 1, `${label}: page overflow ${JSON.stringify(result)}`)
  assert.deepEqual(result.outside, [], `${label}: controls clipped`)
}
async function main() {
  const prepared = ['verify', 'expose'].includes(phase)
    ? JSON.parse(fs.readFileSync(fixturePath, 'utf8'))
    : null
  const email = prepared?.email || `mobile-${crypto.randomUUID()}@example.invalid`
  const password = prepared?.password || crypto.randomBytes(20).toString('hex')
  user =
    prepared?.user ||
    (await api('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true }))
  if (!prepared) await api('/rest/v1/editorial_members', 'POST', { user_id: user.id })
  const records =
    prepared?.records ||
    (await api(
      '/rest/v1/db_records',
      'POST',
      Array.from({ length: 70 }, (_, i) => ({
        type: 'pessoa',
        nome: `Registro mobile ${i} ${'nome-longo-'.repeat(10)}`,
        dados: {},
        cidade: 'neon',
        created_by: user.id
      }))
    ))
  const item = prepared?.item || (await api('/rest/v1/market_items?select=id&limit=1'))[0]
  if (!prepared) {
    await api('/rest/v1/db_record_notes', 'POST', {
      record_id: records[0].id,
      body: 'texto-sem-espaços-'.repeat(100),
      created_by: user.id
    })
    await api(
      '/rest/v1/market_values',
      'POST',
      Array.from({ length: 70 }, (_, i) => ({
        user_id: user.id,
        cidade: 'neon',
        item_id: item.id,
        amount: 123456789012.34 + i
      }))
    )
  }
  post =
    prepared?.post ||
    (
      await api('/rest/v1/posts', 'POST', {
        title: 'Matéria para validação mobile com um título longo',
        body: 'Conteúdo de validação. '.repeat(30),
        cover_url: '/vpn-icon.svg',
        user_id: user.id,
        cidade: 'neon',
        destaque: true,
        published_at: new Date().toISOString()
      })
    )[0]
  extraPosts.push(
    ...(prepared?.extraPosts ||
      (await api('/rest/v1/posts', 'POST', {
        ...post,
        id: undefined,
        title: 'Segundo destaque mobile',
        published_at: new Date(Date.now() + 1000).toISOString()
      })))
  )
  if (!prepared || phase === 'expose') {
    assert.match(user.id, /^[0-9a-f-]{36}$/i)
    // Production already exposes posts publicly. Local migrations only expose own
    // posts; permit just this suite's temporary articles, then remove the policy.
    localPolicy('DROP POLICY IF EXISTS vpn_mobile_fixture_read ON public.posts;')
    localPolicy(
      `CREATE POLICY vpn_mobile_fixture_read ON public.posts FOR SELECT TO anon USING (user_id = '${user.id}'::uuid);`
    )
  }
  if (phase === 'prepare' || phase === 'expose') {
    fs.writeFileSync(
      fixturePath,
      JSON.stringify({ user, email, password, records, item, post, extraPosts })
    )
    console.log('Local fixtures prepared for prerender and bundle verification')
    return
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()
  page.setDefaultTimeout(30000)
  await visit(page, 3010, '/login')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL('**/redacao')
  // Monitor API fixtures exercise long text and populated states without Twitch changes.
  await page.route('**/api/sentry/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const session = {
      id: 'mobile-session',
      title: 'Título de sessão '.repeat(15),
      category: 'Categoria de validação',
      startedAt: new Date().toISOString(),
      endedAt: null,
      canManageInvites: true
    }
    const payload = path.endsWith('/channels')
      ? [
          {
            id: 'mobile-channel',
            login: 'canal_muito_longo_'.repeat(5),
            monitoringEnabled: true,
            subscriptionStatus: 'enabled',
            connectionStatus: 'connected'
          }
        ]
      : path.endsWith('/invites')
        ? [
            {
              id: 'mobile-invite',
              expiresAt: new Date().toISOString(),
              acceptedAt: null,
              revokedAt: null
            }
          ]
        : path.endsWith('/sessions')
          ? { items: [session], nextCursor: null }
          : path.includes('/sessions/')
            ? session
            : { login: 'canal_muito_longo_'.repeat(5), status: 'connected', canReconnect: false }
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(payload) })
  })
  // A classic scrollbar leaves only 305px of content in a 320px viewport.
  await page.setViewportSize({ width: 305, height: 900 })
  await visit(page, 3011, '/')
  await checkWidth(page, 'Site 305px available width with classic scrollbar')
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await visit(page, 3011, '/')
    await checkWidth(page, `Site ${width}`)
    if (width === 320)
      await page.screenshot({ path: '.superpowers/runtime/mobile-site.png', fullPage: true })
    if (width < 768) {
      const toggle = page.getByRole('button', { name: 'Abrir navegação' })
      await toggle.click()
      await page
        .getByRole('navigation', { name: 'Navegação mobile' })
        .getByRole('link', { name: 'O universo' })
        .click()
      await assert.doesNotReject(() => toggle.waitFor({ state: 'visible' }))
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false')
    }
    for (const route of [
      '/',
      '/neon',
      '/redacao',
      '/redacao/base',
      `/redacao/base/${records[0].id}`,
      '/redacao/base/novo',
      '/redacao/valores',
      '/redacao/valores/novo',
      '/redacao/novo',
      `/redacao/${post.id}/editar`,
      '/redacao/transmissao',
      '/redacao/cidades',
      '/redacao/cidades/novo',
      '/redacao/cidades/neon'
    ]) {
      await visit(
        page,
        3010,
        route === '/redacao/valores' ? `${route}?cidade=neon&item=${item.id}` : route
      )
      if (route === '/') await page.getByRole('heading', { name: post.title }).first().waitFor()
      if (route === '/neon')
        await page.getByText('O que está movimentando Neon', { exact: true }).waitFor()
      if (route === '/neon' && width < 640) {
        const next = page.getByRole('link', { name: /^Próximo destaque:/ }).first()
        await next.focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(
          () => {
            const container = document.querySelector('#cidade-destaque-0').parentElement
            return container.scrollLeft >= container.clientWidth - 1
          },
          undefined,
          { timeout: 3000 }
        )
        await page
          .locator('#cidade-destaque-1')
          .getByRole('link', { name: /^Próximo destaque:/ })
          .focus()
        await page.keyboard.press('Enter')
        await page.waitForFunction(
          () => document.querySelector('#cidade-destaque-0').parentElement.scrollLeft < 1,
          undefined,
          { timeout: 3000 }
        )
      }
      if (route === '/redacao/base')
        await page
          .getByRole('link', { name: /^Registro mobile/ })
          .first()
          .waitFor()
      if (route === `/redacao/base/${records[0].id}`)
        await page.getByText('texto-sem-espaços-'.repeat(100), { exact: true }).waitFor()
      if (route === '/redacao/valores') {
        await page.getByText('Últimos valores da cidade', { exact: true }).waitFor()
        await page.getByText('Ver todos os dados do gráfico', { exact: true }).click()
      }
      if (route === '/redacao/valores/novo') {
        await page.getByRole('combobox').click()
        await page.getByRole('option', { name: 'Neon', exact: true }).click()
        await page.getByRole('button', { name: 'Continuar', exact: true }).click()
        await page.getByLabel('Cadastrar um novo item').check()
        await page.getByLabel('Nome do novo item').fill('Nome de item longo '.repeat(4))
        await page.getByRole('button', { name: 'Continuar', exact: true }).click()
        await page.getByLabel('Valor em reais').fill('123.456.789.012,34')
        await page.getByRole('button', { name: 'Continuar', exact: true }).click()
        await page.getByRole('button', { name: 'Salvar valor', exact: true }).waitFor()
      }
      if (width < 640 && route === '/redacao/base') {
        const rowHeight = await page
          .getByRole('link', { name: /^Registro mobile/ })
          .first()
          .evaluate((element) => element.closest('tr').getBoundingClientRect().height)
        assert(rowHeight <= 120, `Long record names make mobile rows too tall: ${rowHeight}`)
        const region = page.getByRole('region', { name: 'Registros da Base de Dados' })
        await region.focus()
        await page.keyboard.press('ArrowRight')
        await page.waitForFunction(
          () => document.querySelector('[aria-label="Registros da Base de Dados"]').scrollLeft > 0
        )
        await region.evaluate((element) => {
          element.scrollLeft = 0
        })
      }
      await checkWidth(page, `News ${route} ${width}`)
      if (width === 320 && route === '/neon')
        await page.screenshot({ path: '.superpowers/runtime/mobile-city.png', fullPage: true })
      if (width === 320 && ['/redacao/base', '/redacao/valores'].includes(route))
        await page.screenshot({
          path: `.superpowers/runtime/mobile-${route.split('/').pop()}.png`,
          fullPage: true
        })
    }
    if (width < 1024) {
      await visit(page, 3010, '/redacao/base')
      await page.getByRole('button', { name: 'Abrir barra lateral', exact: true }).click()
      await page.getByRole('link', { name: 'Valores', exact: true }).click()
      await page.waitForURL('**/redacao/valores')
      await assert.doesNotReject(() =>
        page.getByRole('link', { name: 'Registrar valor', exact: true }).click()
      )
      await page.waitForURL('**/redacao/valores/novo')
    }
    for (const route of ['/', '/conexao', '/sessoes/mobile-session', '/login']) {
      await visit(page, 3012, route)
      if (route === '/') await page.getByText('Monitoramento privado', { exact: true }).waitFor()
      if (route === '/' || route === '/conexao')
        await page.getByText('canal_muito_longo_'.repeat(5), { exact: true }).waitFor()
      if (route === '/sessoes/mobile-session')
        await page.getByRole('heading', { name: 'Título de sessão '.repeat(15).trim() }).waitFor()
      await checkWidth(page, `Monitor ${route} ${width}`)
      if (width === 320 && route === '/')
        await page.screenshot({ path: '.superpowers/runtime/mobile-monitor.png', fullPage: true })
    }
    console.log(
      `PASS mobile-first ${width}px: 19 routes, populated content, controls, wizard and navigation`
    )
  }
}
main()
  .catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
  .finally(async () => {
    const errors = []
    async function cleanup(action) {
      try {
        await action()
      } catch (error) {
        errors.push(error.message)
      }
    }
    await cleanup(() => browser?.close())
    if (['prepare', 'expose'].includes(phase) && !process.exitCode) return
    if (post) await cleanup(() => api(`/rest/v1/posts?id=eq.${post.id}`, 'DELETE'))
    for (const extra of extraPosts)
      await cleanup(() => api(`/rest/v1/posts?id=eq.${extra.id}`, 'DELETE'))
    if (user) await cleanup(() => api(`/auth/v1/admin/users/${user.id}`, 'DELETE'))
    if (user)
      await cleanup(() =>
        localPolicy('DROP POLICY IF EXISTS vpn_mobile_fixture_read ON public.posts;')
      )
    if (errors.length) {
      console.error(`Local fixture cleanup failed: ${errors.join('; ')}`)
      process.exitCode = 1
      return
    }
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
    console.log('Local mobile fixtures cleaned')
  })
