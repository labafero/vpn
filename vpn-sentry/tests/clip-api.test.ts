import { createServer, type Server } from 'node:http'
import { createApp, createRouter, toNodeListener } from 'h3'
import { afterAll, beforeAll, expect, test, vi } from 'vitest'
import consentGet from '../server/api/v1/channels/[id]/clip-consent.get'
import consentPatch from '../server/api/v1/channels/[id]/clip-consent.patch'
import submit from '../server/api/v1/channels/[id]/clips.post'
import listClips from '../server/api/v1/channels/[id]/clips.get'
import callback from '../server/api/v1/provider-connections/twitch/callback.get'
import { FoundationError } from '../server/utils/api-error'
const fixture = vi.hoisted(() => ({
  signedIn: true,
  fail: false,
  cancelled: false,
  listClips: vi.fn()
}))
vi.mock('../server/utils/auth', () => ({
  requireVpnUser: async () => {
    if (!fixture.signedIn) throw new FoundationError(401)
    return { userId: 'owner', role: 'member' }
  }
}))
vi.mock('../server/utils/clip-runtime', () => ({
  getClipIngestionService: () => ({
    getConsent: async () => {
      if (fixture.fail) throw new Error('private provider secret')
      return { manualEnabled: false }
    },
    setConsent: async () => ({ manualEnabled: false }),
    submit: async () => ({
      id: 'submission',
      state: 'pending_captions',
      duplicate: false
    }),
    list: fixture.listClips
  })
}))
vi.mock('../server/utils/twitch-oauth', () => ({
  getTwitchOAuthService: () => ({
    cancelTwitchAuthorization: async (_user: unknown, input: { state: string }) => {
      if (input.state !== 'valid') throw new FoundationError(400)
      fixture.cancelled = true
    },
    completeTwitchAuthorization: async () => {}
  })
}))
let server: Server
let address: string
const path = '/channels/20000000-0000-0000-0000-000000000001'
beforeAll(async () => {
  vi.stubEnv('NUXT_MONITOR_ORIGIN', 'https://monitor.test')
  const router = createRouter()
    .get('/channels/:id/clip-consent', consentGet)
    .patch('/channels/:id/clip-consent', consentPatch)
    .post('/channels/:id/clips', submit)
    .get('/channels/:id/clips', listClips)
    .get('/callback', callback)
  server = createServer(toNodeListener(createApp().use(router)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})
test('clip endpoints authenticate before accessing data and never cache', async () => {
  fixture.signedIn = false
  for (const [route, method] of [
    ['clip-consent', 'GET'],
    ['clip-consent', 'PATCH'],
    ['clips', 'POST'],
    ['clips', 'GET']
  ]) {
    const response = await fetch(`${address}${path}/${route}`, { method })
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  }
  fixture.signedIn = true
  fixture.fail = true
  const response = await fetch(`${address}${path}/clip-consent`)
  expect(response.status).toBe(503)
  expect(await response.text()).not.toMatch(/provider|secret/)
  fixture.fail = false
})
test('clip history delegates to the owner-scoped service', async () => {
  fixture.signedIn = true
  fixture.listClips.mockResolvedValue({ items: [] })
  const list = await fetch(`${address}${path}/clips`)
  expect(list.status).toBe(200)
  expect(list.headers.get('cache-control')).toBe('no-store')
  expect(await list.json()).toEqual({ items: [] })
})
test('OAuth refusal redirects with a fixed result and never reflects provider query', async () => {
  const response = await fetch(
    `${address}/callback?state=valid&error=access_denied&error_description=secret`,
    { redirect: 'manual' }
  )
  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('https://monitor.test/conexao')
  expect(response.headers.get('x-oauth-result')).toBe('declined')
  expect(fixture.cancelled).toBe(true)
  expect(await response.text()).not.toContain('secret')
  expect(
    (await fetch(`${address}/callback?state=wrong&error=access_denied`, { redirect: 'manual' }))
      .status
  ).toBe(400)
})
