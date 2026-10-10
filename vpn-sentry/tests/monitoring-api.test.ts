import { createServer, type Server } from 'node:http'
import { createApp, createRouter, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import sessionRoute from '../server/api/v1/sessions/[id].get'
import listRoute from '../server/api/v1/sessions/index.get'
import { FoundationError } from '../server/utils/api-error'
import type { MonitoringSession } from '../server/utils/monitoring-service'

const fixture = vi.hoisted(() => ({ user: null as { userId: string; role: 'member'|'vpn_admin' } | null, service: null as Record<string, ReturnType<typeof vi.fn>> | null }))
vi.mock('../server/utils/auth', () => ({ requireVpnUser: async () => { if (!fixture.user) throw new FoundationError(401); return fixture.user } }))
vi.mock('../server/utils/monitoring-runtime', () => ({ getMonitoringService: () => fixture.service }))
const ownerId = '00000000-0000-0000-0000-000000000031'
const guestId = '00000000-0000-0000-0000-000000000032'
const sessionId = '30000000-0000-0000-0000-000000000031'
const session: MonitoringSession = { id: sessionId, channelId: '20000000-0000-0000-0000-000000000031', ownerId, streamId: 'stream-1', title: 'Live', category: 'News', startedAt: new Date().toISOString(), endedAt: null }
let server: Server
let address: string
beforeAll(async () => {
  const router = createRouter().get('/api/v1/sessions/:id', sessionRoute).get('/api/v1/sessions', listRoute)
  server = createServer(toNodeListener(createApp().use(router)))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())) })
beforeEach(() => {
  fixture.user = { userId: ownerId, role: 'member' }
  fixture.service = { getSession: vi.fn(async () => session), canReadSession: vi.fn(async (_id, userId) => userId === ownerId), listSessions: vi.fn(async () => ({ items: [session], nextCursor: null })) }
})
test('session API sanitizes internal owner IDs and keeps responses private', async () => {
  const response = await fetch(`${address}/api/v1/sessions/${sessionId}`)
  expect(response.status).toBe(200)
  expect(response.headers.get('cache-control')).toBe('no-store')
  const data = await response.json() as Record<string, unknown>
  expect(data).toMatchObject({ id: sessionId, canManageInvites: true })
  expect(data).not.toHaveProperty('ownerId')
})
test('uninvited users cannot read a session and failures do not reveal session metadata', async () => {
  fixture.user = { userId: guestId, role: 'member' }
  const response = await fetch(`${address}/api/v1/sessions/${sessionId}`)
  expect(response.status).toBe(404)
  expect(await response.text()).not.toContain('stream-1')
})
test('anonymous API requests are rejected and history uses bounded pagination', async () => {
  fixture.user = null
  expect((await fetch(`${address}/api/v1/sessions`)).status).toBe(401)
  fixture.user = { userId: ownerId, role: 'member' }
  expect((await fetch(`${address}/api/v1/sessions?limit=101`)).status).toBe(400)
  const response = await fetch(`${address}/api/v1/sessions?limit=10`)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ items: [{ canManageInvites: true }], nextCursor: null })
})
