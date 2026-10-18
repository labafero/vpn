import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/sentry/[...path]'

const fixture = vi.hoisted(() => ({
  signedIn: false,
  protectionBypass: '',
  token: 'test-token',
  userId: '00000000-0000-0000-0000-000000000001'
}))
vi.mock('#supabase/server', () => ({
  serverSupabaseClient: async () => ({
    auth: {
      getSession: async () => ({
        data: { session: fixture.signedIn ? { access_token: fixture.token } : null }
      }),
      getUser: async () => ({
        data: { user: { id: fixture.userId, is_anonymous: false } },
        error: null
      })
    }
  })
}))

const nativeFetch = globalThis.fetch
let server: Server
let address: string
const upstream = vi.fn<typeof fetch>()
beforeAll(async () => {
  vi.stubGlobal('useRuntimeConfig', () => ({
    sentryUrl: 'https://sentry.test/api/v1',
    monitorOrigin: 'https://monitor.test',
    sentryProtectionBypassSecret: fixture.protectionBypass
  }))
  const app = createApp()
  app.use((event) => {
    event.context.params = { path: event.path.slice(1).split('?')[0] }
    return route(event)
  })
  server = createServer(toNodeListener(app))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = (server.address() as { port: number }).port
  address = `http://127.0.0.1:${port}`
})
beforeEach(() => {
  fixture.signedIn = false
  fixture.protectionBypass = ''
  upstream.mockReset()
  vi.stubGlobal('fetch', upstream)
})
afterAll(async () => {
  vi.unstubAllGlobals()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

test('unauthenticated request never reaches Sentry', async () => {
  const response = await nativeFetch(`${address}/me`)
  expect(response.status).toBe(401)
  expect(upstream).not.toHaveBeenCalled()
})
test('mutation without CSRF never reaches Sentry', async () => {
  fixture.signedIn = true
  const response = await nativeFetch(`${address}/provider-connections/twitch`, {
    method: 'DELETE',
    headers: { Origin: 'https://monitor.test' }
  })
  expect(response.status).toBe(400)
  expect(upstream).not.toHaveBeenCalled()
})
test('authorize creates HttpOnly nonce and forwards only verified bearer', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(
    Response.json({ authorizationUrl: 'https://id.twitch.tv/oauth2/authorize?state=test' })
  )
  const response = await nativeFetch(`${address}/provider-connections/twitch/authorize`, {
    method: 'POST',
    headers: {
      Origin: 'https://monitor.test',
      'X-VPN-CSRF': '1',
      'Content-Type': 'application/json',
      'X-OAuth-Nonce': 'attacker'
    },
    body: JSON.stringify({ consentVersion: 'monitoring-v1', consentAccepted: true })
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('set-cookie')).toMatch(/HttpOnly/)
  expect(response.headers.get('set-cookie')).toMatch(/Secure/)
  const options = upstream.mock.calls[0]![1]!
  expect(options.headers).toMatchObject({ Authorization: 'Bearer test-token' })
  expect((options.headers as Record<string, string>)['X-OAuth-Nonce']).not.toBe('attacker')
})
test('provider errors are sanitized by the proxy', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(new Response('private access_token secret', { status: 500 }))
  const response = await nativeFetch(`${address}/me`)
  expect(response.status).toBe(503)
  expect(await response.text()).not.toMatch(/access_token|secret/)
})
test('callback redirects only to configured Monitor origin', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(
    new Response(null, { status: 303, headers: { Location: 'https://evil.test' } })
  )
  const response = await nativeFetch(
    `${address}/provider-connections/twitch/callback?code=private-code&state=test`,
    { redirect: 'manual' }
  )
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('private-code')
})

test('protected preview uses only the server-owned bypass and never exposes it', async () => {
  fixture.signedIn = true
  fixture.protectionBypass = 'private-preview-bypass'
  upstream.mockResolvedValue(Response.json({ id: fixture.userId }))
  const response = await nativeFetch(`${address}/me`, {
    headers: { 'x-vercel-protection-bypass': 'attacker' }
  })
  expect(response.status).toBe(200)
  expect(upstream.mock.calls[0]![1]!.headers).toMatchObject({
    Authorization: 'Bearer test-token',
    'x-vercel-protection-bypass': 'private-preview-bypass'
  })
  expect(await response.text()).not.toContain('private-preview-bypass')
  expect(Array.from(response.headers.values()).join('')).not.toContain('private-preview-bypass')
})

test('browser cannot inject a deployment bypass when server has none', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(Response.json({ id: fixture.userId }))
  await nativeFetch(`${address}/me`, { headers: { 'x-vercel-protection-bypass': 'attacker' } })
  expect(upstream.mock.calls[0]![1]!.headers).not.toHaveProperty('x-vercel-protection-bypass')
})

test('OAuth refusal result is a short cookie with no provider query reflected', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(
    new Response(null, {
      status: 303,
      headers: { location: 'https://monitor.test/conexao', 'x-oauth-result': 'declined' }
    })
  )
  const response = await nativeFetch(
    `${address}/provider-connections/twitch/callback?state=valid&error=access_denied&error_description=private`,
    { redirect: 'manual' }
  )
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('https://monitor.test/conexao')
  expect(response.headers.get('set-cookie')).toContain('vpn-oauth-result=declined')
  expect(response.headers.get('set-cookie')).not.toMatch(/private|access_denied|state=valid/)
})

test('failed OAuth upgrade returns to connection UI without exposing the callback code', async () => {
  fixture.signedIn = true
  upstream.mockResolvedValue(
    Response.json({ message: 'Desconecte o vínculo existente', private: 'secret' }, { status: 409 })
  )
  const response = await nativeFetch(
    `${address}/provider-connections/twitch/callback?code=private-code&state=valid`,
    { redirect: 'manual' }
  )
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('https://monitor.test/conexao')
  expect(response.headers.get('set-cookie')).toContain('vpn-oauth-result=failed')
  expect(await response.text()).not.toMatch(/private-code|secret|Desconecte/)
})
