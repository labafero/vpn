const { chromium } = require(process.env.VPN_PLAYWRIGHT_MODULE || 'playwright')
const fs = require('node:fs')
const crypto = require('node:crypto')

if (!process.env.VPN_TEST_SUPABASE_STATUS) throw new Error('Set VPN_TEST_SUPABASE_STATUS to the local CLI status file')
const status = JSON.parse(fs.readFileSync(process.env.VPN_TEST_SUPABASE_STATUS, 'utf8').replace(/^\uFEFF/, ''))
const base = status.API_URL
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('This acceptance check only supports a local Supabase instance')
const admin = status.SERVICE_ROLE_KEY
const users = []
const localItems = []
const itemNames = []
let browser
let page
async function request(path, method, body, token = admin) {
  const response = await fetch(`${base}${path}`, { method, headers: { apikey: admin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: body === undefined ? undefined : JSON.stringify(body) })
  if (!response.ok) throw new Error(`Local API ${method} ${path.split('?')[0]}: ${response.status}`)
  return response.status === 204 ? null : response.json()
}
async function createUser() {
  const email = `editor-${crypto.randomUUID()}@example.invalid`
  const password = crypto.randomBytes(20).toString('hex')
  const user = await request('/auth/v1/admin/users', 'POST', { email, password, email_confirm: true })
  users.push(user.id)
  const session = await request('/auth/v1/token?grant_type=password', 'POST', { email, password })
  return { id: user.id, email, password, token: session.access_token }
}
async function login(context, user) {
  const tab = await context.newPage()
  await tab.goto('http://127.0.0.1:3010/login', { waitUntil: 'domcontentloaded' }); await tab.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false, { timeout: 15000 })
  tab.setDefaultTimeout(15000); tab.setDefaultNavigationTimeout(20000); page = tab
  await tab.getByLabel('E-mail', { exact: true }).fill(user.email)
  await tab.getByLabel('Senha', { exact: true }).fill(user.password)
  await tab.getByRole('button', { name: 'Entrar', exact: true }).click()
  await tab.waitForURL('**/redacao', { waitUntil: 'domcontentloaded' })
  return tab
}
async function main() {
  const editor = await createUser()
  const second = await createUser()
  await request('/rest/v1/editorial_members', 'POST', [{ user_id: editor.id }, { user_id: second.id }])
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true })
  page = await login(context, editor)
  await page.goto('http://127.0.0.1:3010/redacao/valores/novo', { waitUntil: 'domcontentloaded', timeout: 20000 }); await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false, { timeout: 15000 })
  await page.getByText('Etapa 1 de 4').waitFor()
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Neon', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Cadastrar um novo item').check()
  const itemName = `Item de validação ${crypto.randomUUID().slice(0, 8)}`
  itemNames.push(itemName)
  await page.getByLabel('Nome do novo item').fill(itemName)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Valor em reais').fill('1.234,56')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Salvar valor', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/redacao/valores')
  await page.getByText('R$ 1.234,56', { exact: true }).first().waitFor()
  const item = (await request(`/rest/v1/market_items?name=eq.${encodeURIComponent(itemName)}`, 'GET'))[0]
  localItems.push(item.id)
  console.log('PASS wizard creates item and quotation and redirects')
  await page.screenshot({ path: '.superpowers/runtime/values-dashboard.png', fullPage: true })
  await request('/rest/v1/market_values', 'POST', { user_id: editor.id, cidade: 'neon', item_id: item.id, amount: 1300 }, editor.token)
  await page.goto(`http://127.0.0.1:3010/redacao/valores?cidade=neon&item=${item.id}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false, { timeout: 15000 })
  await page.getByText('R$ 1.300,00', { exact: true }).first().waitFor()
  console.log('PASS dashboard loads updated price')
  await page.goto('http://127.0.0.1:3010/redacao/valores/novo', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('#__nuxt')?.__vue_app__?.$nuxt?.isHydrating === false)
  await page.getByRole('combobox').click()
  await page.getByRole('option', { name: 'Neon', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Cadastrar um novo item').check()
  const retryName = `Item retry ${crypto.randomUUID().slice(0, 8)}`
  itemNames.push(retryName)
  await page.getByLabel('Nome do novo item').fill(retryName)
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Valor em reais').fill('0')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar', exact: true }).click()
  if (await page.getByLabel('Valor em reais').inputValue() !== '0') throw new Error('Wizard lost amount when going back')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.route('**/rest/v1/market_values*', route => route.request().method() === 'POST' ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Temporary validation failure' }) }) : route.continue())
  await page.getByRole('button', { name: 'Salvar valor', exact: true }).click()
  await page.getByText(/Seus dados foram preservados/).waitFor()
  await page.unroute('**/rest/v1/market_values*')
  const retryItem = (await request(`/rest/v1/market_items?name=eq.${encodeURIComponent(retryName)}`, 'GET'))[0]
  localItems.push(retryItem.id)
  await page.getByRole('button', { name: 'Salvar valor', exact: true }).click()
  await page.waitForURL(url => url.pathname === '/redacao/valores')
  await page.getByText('R$ 0,00', { exact: true }).first().waitFor()
  const saved = await request(`/rest/v1/market_values?user_id=eq.${editor.id}&item_id=eq.${retryItem.id}`, 'GET')
  if (saved.length !== 1 || saved[0].amount !== 0) throw new Error('Retry duplicated quotation or lost zero')
  const concurrentName = `Concurrent ${crypto.randomUUID().slice(0, 8)}`
  itemNames.push(concurrentName)
  const concurrent = await Promise.all([editor, second].map(u => request('/rest/v1/rpc/find_or_create_market_item', 'POST', { p_name: concurrentName }, u.token)))
  if (concurrent[0].id !== concurrent[1].id) throw new Error('Concurrent item creation produced different identities')
  localItems.push(concurrent[0].id)
  console.log('PASS wizard back, zero, retry after item creation and concurrent catalog creation')
  const records = await request('/rest/v1/db_records', 'POST', [
    { type: 'pessoa', nome: 'Pessoa validação', dados: { telefone: '555' }, cidade: 'neon', created_by: editor.id },
    { type: 'empresa_legal', nome: 'Empresa validação', dados: {}, cidade: 'neon', created_by: editor.id }
  ], editor.token)
  const [person] = records
  await page.goto(`http://127.0.0.1:3010/redacao/base/${person.id}`, { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false, { timeout: 15000 })
  await page.getByText('Relacionamentos', { exact: true }).waitFor()
  await page.getByPlaceholder('Adicionar nota...').fill('Nota de validação')
  await page.getByRole('button', { name: 'Adicionar nota', exact: true }).click()
  await page.getByText('Nota de validação', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Editar nota', exact: true }).click()
  await page.locator('textarea[maxlength="5000"]').fill('Nota editada')
  await page.getByRole('button', { name: 'Salvar nota', exact: true }).click()
  await page.getByText('Nota editada', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Registro relacionado' }).click()
  await page.getByRole('option', { name: 'Empresa validação', exact: true }).click()
  await page.getByRole('button', { name: 'Adicionar relacionamento', exact: true }).click()
  await page.getByText('trabalha em →', { exact: true }).waitFor()
  console.log('PASS notes create/edit and relationship added')
  const contextTwo = await browser.newContext()
  const firstPage = page; const secondPage = await login(contextTwo, second); page = firstPage
  await secondPage.goto(`http://127.0.0.1:3010/redacao/base/${person.id}`, { waitUntil: 'domcontentloaded' }); await secondPage.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false)
  await secondPage.getByText('Nota editada', { exact: true }).waitFor()
  if (await secondPage.getByRole('button', { name: 'Editar nota', exact: true }).count()) throw new Error('Other editor can edit note')
  console.log('PASS second editor shares record but cannot edit author note')
  await page.goto('http://127.0.0.1:3010/redacao/base', { waitUntil: 'domcontentloaded' }); await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false, { timeout: 15000 })
  await page.getByRole('link', { name: 'Pessoa validação', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Exportar', exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Registros (CSV)', exact: true }).click()
  const download = await downloadPromise
  const csv = fs.readFileSync(await download.path(), 'utf8')
  if (!csv.includes('Pessoa validação') || !csv.includes('555')) throw new Error('Missing CSV fields')
  console.log('PASS filtered table and CSV includes structured fields')
  await page.screenshot({ path: '.superpowers/runtime/base-table.png', fullPage: true })
  for (const [menu, expected] of [['Notas (CSV)', 'Nota editada'], ['Relacionamentos (CSV)', 'trabalha em']]) {
    await page.getByRole('button', { name: 'Exportar', exact: true }).click()
    const pending = page.waitForEvent('download')
    await page.getByRole('menuitem', { name: menu, exact: true }).click()
    const content = fs.readFileSync(await (await pending).path(), 'utf8')
    if (!content.includes(expected)) throw new Error(`Missing content in ${menu}`)
  }
  console.log('PASS notes and relations CSV downloads')
  await page.goto('http://127.0.0.1:3010/redacao/base/novo', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false); await page.getByLabel('Nome', { exact: true }).fill('Registro criado pela interface')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.waitForURL(/\/redacao\/base\/\d+$/)
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.getByLabel('Nome', { exact: true }).fill('Registro editado pela interface')
  await page.getByRole('button', { name: 'Salvar', exact: true }).click()
  await page.getByText('Registro editado pela interface', { exact: true }).first().waitFor()
  console.log('PASS record creation and editing through UI')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:3010/redacao/base', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false); await page.getByLabel('Buscar nome', { exact: true }).fill('Registro editado')
  await page.getByRole('link', { name: 'Registro editado pela interface', exact: true }).waitFor()
  await page.getByRole('link', { name: 'Empresa validação', exact: true }).waitFor({ state: 'hidden' })
  await page.screenshot({ path: '.superpowers/runtime/base-mobile.png', fullPage: true })
  await page.getByLabel('Buscar nome', { exact: true }).focus()
  await page.keyboard.press('Tab')
  if (!await page.evaluate(() => document.activeElement?.getAttribute('role') === 'combobox')) throw new Error('Keyboard focus did not reach type filter')
  await page.setViewportSize({ width: 1440, height: 1000 })
  console.log('PASS mobile search and keyboard focus')
  await request('/rest/v1/broadcast_config', 'POST', { user_id: editor.id, cidade: 'neon', title: 'Transmissão de validação' })
  const anonymous = await browser.newContext(); const overlay = await anonymous.newPage(); overlay.setDefaultTimeout(15000); overlay.setDefaultNavigationTimeout(20000)
  await overlay.setViewportSize({ width: 1920, height: 1080 })
  await overlay.goto(`http://127.0.0.1:3010/overlay?broadcaster=${editor.id}`, { waitUntil: 'domcontentloaded' }); await overlay.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false)
  await overlay.getByLabel('Valores recentes de mercado').waitFor()
  await overlay.screenshot({ path: '.superpowers/runtime/overlay-1920.png' })
  await overlay.setViewportSize({ width: 1280, height: 720 })
  await overlay.screenshot({ path: '.superpowers/runtime/overlay-1280.png' })
  console.log('PASS public overlay with city at both viewport sizes')
  await request(`/rest/v1/broadcast_config?user_id=eq.${editor.id}`, 'PATCH', { cidade: null })
  await overlay.reload({ waitUntil: 'domcontentloaded' })
  await overlay.getByLabel('Valores recentes de mercado').getByText('neon:', { exact: true }).first().waitFor()
  await overlay.screenshot({ path: '.superpowers/runtime/overlay-all-cities.png' })
  await request(`/rest/v1/broadcast_config?user_id=eq.${editor.id}`, 'PATCH', { cidade: 'dallas' })
  await overlay.reload({ waitUntil: 'domcontentloaded' })
  await overlay.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__))
  await overlay.waitForTimeout(1200)
  if (await overlay.getByLabel('Valores recentes de mercado').count()) throw new Error('Empty city fell back to another city')
  await overlay.route('**/rest/v1/rpc/get_overlay_market_values', route => route.abort())
  await overlay.reload({ waitUntil: 'domcontentloaded' })
  await overlay.getByText('Transmissão de validação', { exact: true }).waitFor()
  console.log('PASS overlay without city, empty city and network failure preserves layout')
  await request(`/rest/v1/editorial_members?user_id=eq.${second.id}`, 'DELETE')
  await secondPage.goto('http://127.0.0.1:3010/redacao/base', { waitUntil: 'domcontentloaded' }); await secondPage.waitForFunction(() => document.querySelector("#__nuxt")?.__vue_app__?.$nuxt?.isHydrating === false)
  await secondPage.getByText('Acesso restrito à equipe autorizada da redação').first().waitFor()
  console.log('PASS revoked editorial access blocks next navigation')
}
main().catch(async error => {
  console.error(error.message)
  if (page) {
    await page.screenshot({ path: '.superpowers/runtime/browser-failure.png', fullPage: true }).catch(() => {})
  }
  process.exitCode = 1
}).finally(async () => {
  await browser?.close()
  try {
    for (const id of users) await request(`/auth/v1/admin/users/${id}`, 'DELETE')
    for (const name of itemNames) {
      const items = await request(`/rest/v1/market_items?name=eq.${encodeURIComponent(name)}`, 'GET')
      localItems.push(...items.map(item => item.id))
    }
    for (const id of new Set(localItems)) await request(`/rest/v1/market_items?id=eq.${id}`, 'DELETE')
    console.log('Temporary local users and fixtures cleaned')
  } catch (error) {
    console.error(`Fixture cleanup failed: ${error.message}`)
    process.exitCode = 1
  }
})


