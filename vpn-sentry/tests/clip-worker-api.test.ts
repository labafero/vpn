import { createServer, type Server } from 'node:http'
import { createApp, createRouter, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/internal/clips/process.post'
import discoverRoute from '../server/api/internal/clips/discover.post'

const fixture = vi.hoisted(() => ({
  validate: vi.fn(),
  getOAuth: vi.fn(),
  processNext: vi.fn(),
  getWorker: vi.fn(),
  runDiscovery: vi.fn(),
  getDiscovery: vi.fn()
}))
vi.mock('../server/utils/clip-runtime', () => ({
  getClipProcessingService: fixture.getWorker,
  getClipDiscoveryService: fixture.getDiscovery
}))
let server: Server
let address: string
const secret = 'a'.repeat(64)

beforeAll(async () => {
  const router = createRouter().post('/discover', discoverRoute)
  server = createServer(toNodeListener(createApp().use(router).use(route)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})
beforeEach(() => {
  vi.stubEnv('NUXT_CLIP_WORKER_SECRET', secret)
  fixture.processNext.mockReset().mockResolvedValue({ state: 'idle' })
  fixture.getWorker.mockReset().mockReturnValue({ processNext: fixture.processNext })
  fixture.runDiscovery
    .mockReset()
    .mockResolvedValue({ phase: 'idle', discovered: 0, complete: false })
  fixture.getDiscovery.mockReset().mockReturnValue({ runNext: fixture.runDiscovery })
})

test.each([undefined, 'Bearer wrong'])(
  'refuses missing or invalid credentials: %s',
  async (authorization) => {
    const response = await fetch(address, {
      method: 'POST',
      headers: authorization ? { Authorization: authorization } : {}
    })
    expect(response.status).toBe(401)
    expect(response.headers.get('cache-control')).toBe('no-store')
  }
)

test('fails closed if the worker secret is not configured', async () => {
  vi.stubEnv('NUXT_CLIP_WORKER_SECRET', '')
  expect((await fetch(address, { method: 'POST' })).status).toBe(503)
})

test('processes at most one queued clip per request', async () => {
  const response = await fetch(address, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  })
  expect(response.status).toBe(200)
  expect(fixture.processNext).toHaveBeenCalledOnce()
  expect(await response.json()).toEqual({ state: 'idle' })
})

test('processes the clip queue independently of Twitch credential validation', async () => {
  const response = await fetch(address, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  })
  expect(response.status).toBe(200)
  expect(fixture.processNext).toHaveBeenCalledOnce()
})

test('sanitizes provider and worker failures', async () => {
  fixture.processNext.mockRejectedValue(new Error('private openai api key'))
  const response = await fetch(address, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  })
  expect(response.status).toBe(503)
  expect(await response.text()).not.toContain('openai')
})

test('runs scheduled discovery separately and authenticates with the worker secret', async () => {
  const response = await fetch(`${address}/discover`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` }
  })
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  expect(await response.json()).toEqual({ phase: 'idle', discovered: 0, complete: false })
  expect(fixture.runDiscovery).toHaveBeenCalledOnce()
  expect(fixture.processNext).not.toHaveBeenCalled()
})
