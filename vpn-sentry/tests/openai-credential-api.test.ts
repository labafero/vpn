import { createServer, type Server } from 'node:http'
import { createApp, createRouter, toNodeListener } from 'h3'
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vitest'
import credentialGet from '../server/api/v1/me/openai-credential.get'
import credentialPost from '../server/api/v1/me/openai-credential.post'
import credentialDelete from '../server/api/v1/me/openai-credential.delete'
import { FoundationError } from '../server/utils/api-error'

const fixture = vi.hoisted(() => ({
  signedIn: true,
  configured: false,
  save: vi.fn(async () => {}),
  remove: vi.fn(async () => {}),
  has: vi.fn(async () => fixture.configured)
}))

vi.mock('../server/utils/auth', () => ({
  requireVpnUser: async () => {
    if (!fixture.signedIn) throw new FoundationError(401)
    return { userId: 'owner', role: 'member' }
  }
}))
vi.mock('../server/utils/openai-credential-repository', () => ({
  getOpenAiCredentialRepository: () => ({
    has: fixture.has,
    save: fixture.save,
    remove: fixture.remove
  })
}))

let server: Server
let address: string
beforeAll(async () => {
  const router = createRouter()
    .get('/me/openai-credential', credentialGet)
    .post('/me/openai-credential', credentialPost)
    .delete('/me/openai-credential', credentialDelete)
  server = createServer(toNodeListener(createApp().use(router)))
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})
afterEach(() => vi.unstubAllEnvs())

test('returns only whether the signed-in user has a key', async () => {
  fixture.signedIn = false
  expect((await fetch(`${address}/me/openai-credential`)).status).toBe(401)
  fixture.signedIn = true
  fixture.configured = true
  const response = await fetch(`${address}/me/openai-credential`)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ configured: true, systemConfigured: false })

  vi.stubEnv('NUXT_OPENAI_API_KEY', 'sk-system-secret')
  const withSystemKey = await fetch(`${address}/me/openai-credential`)
  expect(await withSystemKey.json()).toEqual({ configured: true, systemConfigured: true })
  vi.unstubAllEnvs()
})

test('validates, saves, and deletes only the current user key without returning it', async () => {
  const invalid = await fetch(`${address}/me/openai-credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: 'bad' })
  })
  expect(invalid.status).toBe(400)

  const apiKey = `sk-proj-${'a'.repeat(32)}`
  const saved = await fetch(`${address}/me/openai-credential`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  })
  expect(saved.status).toBe(200)
  const savedPayload = await saved.json()
  expect(savedPayload).toEqual({ configured: true, systemConfigured: false })
  expect(JSON.stringify(savedPayload)).not.toContain(apiKey)
  expect(fixture.save).toHaveBeenCalledWith('owner', apiKey)

  const removed = await fetch(`${address}/me/openai-credential`, { method: 'DELETE' })
  expect(removed.status).toBe(200)
  expect(await removed.json()).toEqual({ configured: false, systemConfigured: false })
  expect(fixture.remove).toHaveBeenCalledWith('owner')
})
