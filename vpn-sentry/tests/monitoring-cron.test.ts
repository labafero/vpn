import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/internal/twitch/reconcile.post'

const fixture = vi.hoisted(() => ({ reconcile: vi.fn(), getService: vi.fn() }))
vi.mock('../server/utils/monitoring-runtime', () => ({ getMonitoringService: fixture.getService }))
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
  fixture.reconcile.mockReset().mockResolvedValue({ checked: 2 })
  fixture.getService.mockReset().mockReturnValue({ reconcile: fixture.reconcile })
})
test('monitoring reconciliation is protected by its server secret', async () => {
  expect((await fetch(address, { method: 'POST' })).status).toBe(401)
  expect(fixture.getService).not.toHaveBeenCalled()
  const response = await fetch(address, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ checked: 2 })
})
test('secret failures and provider details are sanitized', async () => {
  vi.stubEnv('NUXT_TWITCH_CRON_SECRET', '')
  expect((await fetch(address, { method: 'POST' })).status).toBe(503)
  vi.stubEnv('NUXT_TWITCH_CRON_SECRET', secret)
  fixture.reconcile.mockRejectedValue(new Error('private client_secret'))
  const response = await fetch(address, { method: 'POST', headers: { Authorization: `Bearer ${secret}` } })
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('client_secret')
})
