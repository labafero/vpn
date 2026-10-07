import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/internal/twitch/validate.post'
const fixture = vi.hoisted(() => ({ validate: vi.fn(), getService: vi.fn() }))
vi.mock('../server/utils/twitch-oauth', () => ({ getTwitchOAuthService: fixture.getService }))
let server: Server
let address: string
const secret = 'a'.repeat(64)
beforeAll(async () => {
  server = createServer(toNodeListener(createApp().use(route)))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>(resolve => server.close(() => resolve())) })
beforeEach(() => {
  vi.stubEnv('NUXT_TWITCH_CRON_SECRET', secret)
  fixture.validate.mockReset().mockResolvedValue({ checked: 1, expired: 0, failed: 0, deferred: 0 })
  fixture.getService.mockReset().mockReturnValue({ validateStoredConnections: fixture.validate })
})
test.each([undefined, 'Bearer wrong', 'Bearer vpn-session-token'])('cron refuses ordinary or missing credentials: %s', async authorization => {
  const response = await fetch(address, { method: 'POST', headers: authorization ? { Authorization: authorization } : {} })
  expect(response.status).toBe(401)
  expect(fixture.getService).not.toHaveBeenCalled()
  expect(response.headers.get('cache-control')).toBe('no-store')
})
test('cron fails closed when secret is absent', async () => {
  vi.stubEnv('NUXT_TWITCH_CRON_SECRET', '')
  expect((await fetch(address, { method: 'POST' })).status).toBe(503)
  expect(fixture.getService).not.toHaveBeenCalled()
})
test('cron runs bounded validation with server secret', async () => {
  const response = await fetch(address, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })
  expect(response.status).toBe(200)
  expect(fixture.validate).toHaveBeenCalledWith(expect.any(Date), { maxDurationMs: 200000 })
  expect(await response.json()).toEqual({ checked: 1, expired: 0, failed: 0, deferred: 0 })
})
test.each([{ checked: 1, expired: 0, failed: 1, deferred: 0 }, { checked: 0, expired: 0, failed: 0, deferred: 1 }])('partial cron work is not reported as success', async result => {
  fixture.validate.mockResolvedValue(result)
  expect((await fetch(address, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })).status).toBe(503)
})
test('provider exceptions cannot expose secrets', async () => {
  fixture.validate.mockRejectedValue(new Error('sensitive refresh_token'))
  const response = await fetch(address, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('refresh_token')
})
