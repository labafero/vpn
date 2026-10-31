import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/internal/clips/process.post'

const fixture = vi.hoisted(() => ({
  validate: vi.fn(),
  getOAuth: vi.fn(),
  processNext: vi.fn(),
  getWorker: vi.fn()
}))
vi.mock('../server/utils/clip-runtime', () => ({ getClipProcessingService: fixture.getWorker }))
let server: Server
let address: string
const secret = 'a'.repeat(64)

beforeAll(async () => {
  server = createServer(toNodeListener(createApp().use(route)))
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
