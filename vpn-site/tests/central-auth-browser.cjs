const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const { readFile } = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const { assertLocalBrowserTargets } = require('./central-auth-browser-guards.cjs')

const browserTools =
  process.env.VPN_BROWSER_TOOLS || path.join(os.homedir(), '.cache', 'vpn-tools', 'browser')
const { chromium } = require(path.join(browserTools, 'node_modules', 'playwright'))

const siteUrl = new URL(process.env.VPN_E2E_SITE_URL || 'http://localhost:3000')
const monitorUrl = new URL(process.env.VPN_E2E_MONITOR_URL || 'http://localhost:3002')
const newsUrl = new URL(process.env.VPN_E2E_NEWS_URL || 'http://localhost:3001')
const portalUrl = `${siteUrl.origin}`
const password = `VpnAuth-${randomUUID()}-Aa1!`
const testNamespace = randomUUID().replaceAll('-', '')
const editorEmail = `vpn-editor-${testNamespace}@example.test`
const confirmationEmail = `vpn-confirm-${testNamespace}@example.test`
const createdUserIds = []
const requestTimeoutMs = 15000

async function readSupabaseStatus() {
  const statusPath = process.env.VPN_TEST_SUPABASE_STATUS
  if (!statusPath) throw new Error('Set VPN_TEST_SUPABASE_STATUS to local Supabase status JSON.')

  const status = JSON.parse(await readFile(statusPath, 'utf8'))
  const url = status.API_URL || status.SUPABASE_URL
  const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY
  const serviceKey = status.SERVICE_ROLE_KEY || status.SECRET_KEY
  if (!url || !anonKey || !serviceKey) {
    throw new Error('Local Supabase status must include API_URL, ANON_KEY, and SERVICE_ROLE_KEY.')
  }

  const apiUrl = new URL(url)
  if (!['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)) {
    throw new Error('Refusing to create or delete auth fixtures outside local Supabase.')
  }

  return {
    url: apiUrl.origin,
    anonKey,
    serviceKey,
    mailpitUrl: status.INBUCKET_URL || 'http://127.0.0.1:54324'
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(requestTimeoutMs),
    headers: { 'content-type': 'application/json', ...options.headers }
  })
  const body = await response.text()
  let data = null
  try {
    data = body ? JSON.parse(body) : null
  } catch {
    data = body
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from local Supabase test service.`)
  }
  return data
}

function adminHeaders(serviceKey) {
  return { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }
}

async function createUser(supabase, email, confirmed) {
  const user = await requestJson(`${supabase.url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(supabase.serviceKey),
    body: JSON.stringify({ email, password, email_confirm: confirmed })
  })
  const id = user.id || user.user?.id
  assert.ok(id, 'Admin API creates a local fixture user.')
  createdUserIds.push(id)
  return id
}

async function findUserId(supabase, email) {
  const response = await requestJson(`${supabase.url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: adminHeaders(supabase.serviceKey)
  })
  const users = response.users || []
  const user = users.find((candidate) => candidate.email === email)
  assert.ok(user?.id, 'The local signup user exists in Auth.')
  if (!createdUserIds.includes(user.id)) createdUserIds.push(user.id)
  return user.id
}

async function restRequest(supabase, table, query, options = {}) {
  const url = new URL(`/rest/v1/${table}`, supabase.url)
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value)
  return requestJson(url, {
    ...options,
    headers: {
      ...adminHeaders(supabase.serviceKey),
      prefer: 'return=representation',
      ...options.headers
    }
  })
}

async function assertNoRoleRows(supabase, userId) {
  const query = { select: 'user_id', user_id: `eq.${userId}` }
  const [roles, editorialMembers] = await Promise.all([
    restRequest(supabase, 'user_roles', query),
    restRequest(supabase, 'editorial_members', query)
  ])
  assert.deepEqual(roles, [], 'Signup does not create a user_roles row.')
  assert.deepEqual(editorialMembers, [], 'Signup does not create an editorial_members row.')
}

async function seedEditorialMember(supabase, userId) {
  await restRequest(
    supabase,
    'editorial_members',
    {},
    {
      method: 'POST',
      body: JSON.stringify({ user_id: userId })
    }
  )
}

async function deleteUser(supabase, userId) {
  if (!userId) return
  await requestJson(`${supabase.url}/rest/v1/editorial_members?user_id=eq.${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(supabase.serviceKey)
  }).catch(() => {})
  await requestJson(`${supabase.url}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(supabase.serviceKey)
  }).catch(() => {})
}

async function waitForConfirmationLink(mailpitUrl, email) {
  const deadline = Date.now() + 30000
  const base = new URL(mailpitUrl)
  const mailbox = email.split('@')[0]

  while (Date.now() < deadline) {
    let messages = []
    try {
      const search = new URL('/api/v1/search', base)
      search.searchParams.set('query', `to:${email}`)
      const data = await requestJson(search, { headers: {} })
      messages = data.messages || []
    } catch {
      try {
        const inbox = new URL(`/api/v1/mailbox/${encodeURIComponent(mailbox)}`, base)
        const data = await requestJson(inbox, { headers: {} })
        messages = data.messages || []
      } catch {
        messages = []
      }
    }

    for (const message of messages) {
      const id = message.ID || message.id
      if (!id) continue
      try {
        const detailResponse = await fetch(new URL(`/view/${encodeURIComponent(id)}.html`, base), {
          signal: AbortSignal.timeout(requestTimeoutMs)
        })
        if (!detailResponse.ok) continue
        const content = (await detailResponse.text())
          .replaceAll('&amp;', '&')
          .replaceAll('&#x3D;', '=')
        const link = content
          .match(/https?:\/\/[^\s"'<>]+/g)
          ?.find((value) => value.includes('/auth/v1/verify'))
        if (link) return link.replace(/[).,;]+$/, '')
      } catch {
        // The mail service may publish the message before its detail endpoint is ready.
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  throw new Error('No local confirmation email arrived in Mailpit within 30 seconds.')
}

async function waitForSignupResult(page) {
  let result
  try {
    result = await page.waitForFunction(
      ({ monitorOrigin }) => {
        if (location.origin === monitorOrigin && location.pathname === '/conexao') return 'session'
        const text = document.body?.innerText ?? ''
        if (text.includes('Confira seu e-mail')) return 'confirmation'
        const error = [
          'Não foi possível criar sua conta.',
          'Conclua a verificação antirobô antes de continuar.',
          'Não foi possível carregar a verificação antirobô.'
        ].find((message) => text.includes(message))
        return error ? `error: ${error}` : false
      },
      { monitorOrigin: monitorUrl.origin },
      { timeout: 20000 }
    )
  } catch {
    const currentUrl = new URL(page.url())
    const notices = await page.locator('[role="alert"], [role="status"]').allTextContents()
    await page.screenshot({ path: '/tmp/vpn-auth-signup-timeout.png' })
    throw new Error(
      `Signup did not finish at ${currentUrl.origin}${currentUrl.pathname}; notices: ${notices.join(' | ') || 'none'}`
    )
  }
  const state = await result.jsonValue()
  if (state.startsWith('error: ')) throw new Error(state.slice('error: '.length))
  return state
}

async function submitEmailForm(page, email, returnTo, action) {
  await page.goto(`${portalUrl}/${action}?return_to=${encodeURIComponent(returnTo)}`)
  await waitForAuthFormReady(page)
  const emailInput = page.locator('input[type="email"]')
  await emailInput.fill(email)
  const passwordFields = page.locator('input[type="password"]')
  await passwordFields.nth(0).fill(password)
  if (action === 'cadastro') await passwordFields.nth(1).fill(password)
  await page.getByRole('button', { name: action === 'cadastro' ? 'Criar conta' : 'Entrar' }).click()
}

async function waitForAuthFormReady(page) {
  await page.locator('input[type="email"]').waitFor({ state: 'visible' })
  await page.waitForFunction(() => window.__VPN_E2E_TURNSTILE_RENDERED__ === true, undefined, {
    timeout: 10000
  })
}

async function assertProtectedRouteRedirect(page, appUrl, path) {
  await page.goto(new URL(path, appUrl).href)
  await page.waitForURL((url) => url.origin === siteUrl.origin && url.pathname === '/entrar')
  const returnTo = new URL(page.url()).searchParams.get('return_to')
  assert.equal(returnTo, new URL(path, appUrl).href)
}

async function assertVpnAppNavigation(page, activeApp, accountEmail) {
  const navigation = page.getByRole('navigation', { name: 'Navegação VPN' })
  await navigation.waitFor({ state: 'visible' })

  const appUrls = { Site: siteUrl, News: newsUrl, Monitor: monitorUrl }
  for (const [label, url] of Object.entries(appUrls)) {
    const link = navigation.getByRole('link', { name: label, exact: true })
    assert.equal(await link.getAttribute('href'), url.origin)
    assert.equal(
      await link.getAttribute('aria-current'),
      label.toLowerCase() === activeApp ? 'page' : null
    )
  }
  assert.equal(await navigation.locator('[aria-current="page"]').count(), 1)

  await page.locator('.vpn-app-bar__account-trigger').click()
  await page.getByText(accountEmail, { exact: true }).waitFor({ state: 'visible' })

  if (activeApp === 'news') {
    await page.getByText('Abrir redação', { exact: true }).waitFor({ state: 'visible' })
    assert.equal(await page.getByText('Aparência', { exact: true }).count(), 0)
    const bar = await page.locator('.vpn-app-bar').boundingBox()
    const dashboard = await page.locator('.editorial-dashboard').boundingBox()
    assert.ok(bar && dashboard && dashboard.y >= bar.y + bar.height - 1)
  }
}

async function run() {
  assertLocalBrowserTargets({ site: siteUrl, monitor: monitorUrl, news: newsUrl })
  const supabase = await readSupabaseStatus()
  const response = await fetch(siteUrl)
  assert.ok(response.ok, `Site is available at ${siteUrl.origin}.`)

  let browser
  let context
  try {
    const editorId = await createUser(supabase, editorEmail, true)
    await seedEditorialMember(supabase, editorId)

    browser = await chromium.launch({
      headless: process.env.VPN_E2E_HEADED !== '1',
      ...(process.env.VPN_BROWSER_EXECUTABLE
        ? { executablePath: process.env.VPN_BROWSER_EXECUTABLE }
        : {})
    })
    context = await browser.newContext()
    await context.addInitScript(() => {
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
    const page = await context.newPage()

    const monitorReturn = new URL('/conexao?tab=clips', monitorUrl).href
    await page.goto(`${portalUrl}/cadastro?return_to=${encodeURIComponent(monitorReturn)}`)
    const emailInput = page.locator('input[type="email"]')
    await waitForAuthFormReady(page)
    await emailInput.fill(confirmationEmail)
    const signupPasswords = page.locator('input[type="password"]')
    await signupPasswords.nth(0).fill(password)
    await signupPasswords.nth(1).fill(password)
    await page.getByRole('button', { name: 'Criar conta' }).click()

    const signupResult = await waitForSignupResult(page)
    if (signupResult === 'confirmation') {
      const confirmationLink = await waitForConfirmationLink(supabase.mailpitUrl, confirmationEmail)
      await page.goto(confirmationLink)
      await page.waitForURL(
        (url) => url.origin === monitorUrl.origin && url.pathname === '/conexao'
      )
    }
    await page.getByRole('heading', { name: 'Conexão Twitch' }).waitFor()
    const signupId = await findUserId(supabase, confirmationEmail)
    await assertNoRoleRows(supabase, signupId)

    await page.goto(siteUrl.href)
    await assertVpnAppNavigation(page, 'site', confirmationEmail)
    assert.ok(
      (await context.cookies(siteUrl.href)).some((cookie) =>
        cookie.name.startsWith('sb-vpn-auth-token')
      )
    )
    await page.goto(new URL('/conexao', monitorUrl).href)
    await page.getByRole('heading', { name: 'Conexão Twitch' }).waitFor()
    const denied = await context.request.get(new URL('/redacao', newsUrl).href)
    assert.equal(denied.status(), 403, 'A regular authenticated user receives 403 in /redacao.')

    await page.goto(new URL('/login', monitorUrl).href)
    await page.waitForURL((url) => url.origin === siteUrl.origin && url.pathname === '/entrar')
    const monitorLoginReturn = new URL('/conexao', monitorUrl).href
    assert.equal(new URL(page.url()).searchParams.get('return_to'), monitorLoginReturn)
    await submitEmailForm(page, editorEmail, monitorLoginReturn, 'entrar')
    await page.waitForURL((url) => url.origin === monitorUrl.origin && url.pathname === '/conexao')
    await page.getByRole('heading', { name: 'Conexão Twitch' }).waitFor()
    await assertVpnAppNavigation(page, 'monitor', editorEmail)

    const editorialReturn = new URL('/redacao', newsUrl).href
    await submitEmailForm(page, editorEmail, editorialReturn, 'entrar')
    await page.waitForURL((url) => url.origin === newsUrl.origin && url.pathname === '/redacao')
    await page.getByRole('heading', { name: 'Redação' }).waitFor()
    await assertVpnAppNavigation(page, 'news', editorEmail)

    if (process.env.VPN_E2E_REDIRECTS_ONLY === '1') {
      process.stdout.write(
        'Local auth redirect E2E passed: signup to Monitor, password login to Monitor, and password login to News.\n'
      )
      return
    }

    await page.goto(siteUrl.href)
    await assertVpnAppNavigation(page, 'site', editorEmail)
    assert.ok(
      (await context.cookies(siteUrl.href)).some((cookie) =>
        cookie.name.startsWith('sb-vpn-auth-token')
      )
    )
    await page.goto(new URL('/conexao', monitorUrl).href)
    await page.getByRole('heading', { name: 'Conexão Twitch' }).waitFor()
    await assertVpnAppNavigation(page, 'monitor', editorEmail)
    await page.goto(new URL('/redacao', newsUrl).href)
    await page.getByRole('heading', { name: 'Redação' }).waitFor()
    await assertVpnAppNavigation(page, 'news', editorEmail)

    await page.goto(new URL('/conexao', monitorUrl).href)
    await page.locator('.vpn-app-bar__account-trigger').waitFor({ state: 'visible' })
    await page.locator('.vpn-app-bar__account-trigger').click()
    await page.getByRole('button', { name: 'Sair' }).click()
    await page.waitForURL((url) => url.origin === siteUrl.origin)
    assert.equal(
      (await context.cookies([siteUrl.href, monitorUrl.href, newsUrl.href])).some((cookie) =>
        cookie.name.startsWith('sb-vpn-auth-token')
      ),
      false,
      'Signing out removes the shared Supabase cookie.'
    )
    await assertProtectedRouteRedirect(page, newsUrl, '/redacao')

    await page.goto(new URL('/login', monitorUrl).href)
    await page.waitForURL((url) => url.origin === siteUrl.origin && url.pathname === '/entrar')
    assert.equal(
      new URL(page.url()).searchParams.get('return_to'),
      new URL('/conexao', monitorUrl).href
    )
    await page.goto(new URL('/login', newsUrl).href)
    await page.waitForURL((url) => url.origin === siteUrl.origin && url.pathname === '/entrar')
    assert.equal(
      new URL(page.url()).searchParams.get('return_to'),
      new URL('/redacao', newsUrl).href
    )

    const invalidCode = new URL('/auth/callback', monitorUrl)
    invalidCode.searchParams.set('code', 'invalid-local-pkce-code')
    invalidCode.searchParams.set('next', '/conexao?tab=clips')
    await page.goto(invalidCode.href)
    await page.waitForURL(
      (url) =>
        url.origin === siteUrl.origin &&
        url.pathname === '/entrar' &&
        url.searchParams.get('auth_error') === '1'
    )
    const errorReturn = new URL(page.url()).searchParams.get('return_to')
    assert.equal(errorReturn, new URL('/conexao?tab=clips', monitorUrl).href)
    await page
      .getByRole('alert')
      .getByText('Não foi possível concluir o login. Tente novamente.')
      .waitFor()
    assert.equal(page.url().includes('invalid-local-pkce-code'), false)

    process.stdout.write(
      'Central auth browser checks passed: signup/confirmation, PKCE callback, cross-app session, editorial 403/access, logout, legacy routes, and local fixture role isolation.\n'
    )
  } finally {
    await context?.close().catch(() => {})
    await browser?.close().catch(() => {})
    await findUserId(supabase, confirmationEmail).catch(() => null)
    for (const userId of createdUserIds) await deleteUser(supabase, userId)
  }
}

run().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  process.exitCode = 1
})
