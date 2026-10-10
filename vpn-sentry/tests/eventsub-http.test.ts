import { createHmac } from 'node:crypto'
import { createServer, type Server } from 'node:http'
import { createApp, toNodeListener } from 'h3'
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest'
import route from '../server/api/eventsub/twitch.post'

const fixture = vi.hoisted(() => ({ handleEvent: vi.fn(), confirmSubscription: vi.fn(), getService: vi.fn(), getRepository: vi.fn() }))
vi.mock('../server/utils/monitoring-runtime', () => ({ getMonitoringService: fixture.getService }))
vi.mock('../server/utils/monitoring-database', () => ({ getMonitoringRepository: fixture.getRepository }))
let server: Server
let address: string
const secret = 'webhook-secret-32-bytes-abcdefgh'
const signedRequest = (type: string, payload: object) => {
  const body = JSON.stringify(payload)
  const id = `message-${type}`
  const timestamp = new Date().toISOString()
  const signature = createHmac('sha256', secret).update(id + timestamp + body).digest('hex')
  return fetch(address, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Twitch-Eventsub-Message-Id': id, 'Twitch-Eventsub-Message-Timestamp': timestamp, 'Twitch-Eventsub-Message-Signature': `sha256=${signature}`, 'Twitch-Eventsub-Message-Type': type }, body })
}
beforeAll(async () => {
  server = createServer(toNodeListener(createApp().use(route)))
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  address = `http://127.0.0.1:${(server.address() as { port: number }).port}`
})
afterAll(async () => { vi.unstubAllEnvs(); await new Promise<void>(resolve => server.close(() => resolve())) })
beforeEach(() => {
  vi.stubEnv('NUXT_TWITCH_EVENTSUB_SECRET', secret)
  fixture.handleEvent.mockReset()
  fixture.confirmSubscription.mockReset()
  fixture.getService.mockReset().mockReturnValue({ handleEvent: fixture.handleEvent })
  fixture.getRepository.mockReset().mockReturnValue({ confirmSubscription: fixture.confirmSubscription })
})
test('signed challenge is echoed as plain text and enables the subscription', async () => {
  const response = await signedRequest('webhook_callback_verification', { subscription: { id: 'sub-1' }, challenge: 'challenge-token' })
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('text/plain')
  expect(await response.text()).toBe('challenge-token')
  expect(fixture.confirmSubscription).toHaveBeenCalledWith('sub-1', true)
})
test('invalid signatures cannot mutate event state', async () => {
  const response = await fetch(address, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Twitch-Eventsub-Message-Id': 'bad', 'Twitch-Eventsub-Message-Timestamp': new Date().toISOString(), 'Twitch-Eventsub-Message-Signature': 'sha256=bad', 'Twitch-Eventsub-Message-Type': 'notification' }, body: '{}' })
  expect(response.status).toBe(400)
  expect(fixture.handleEvent).not.toHaveBeenCalled()
})
test('valid online notification is passed as verified normalized metadata', async () => {
  const response = await signedRequest('notification', { subscription: { id: 'sub-1', type: 'stream.online' }, event: { broadcaster_user_id: '42', id: 'stream-1', title: 'Live', category_name: 'News', started_at: new Date().toISOString() } })
  expect(response.status).toBe(200)
  expect(fixture.handleEvent).toHaveBeenCalledWith(expect.objectContaining({ broadcasterUserId: '42', streamId: 'stream-1', type: 'stream.online' }))
})
