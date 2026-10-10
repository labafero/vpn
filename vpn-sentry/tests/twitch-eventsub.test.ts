import { createHmac } from 'node:crypto'
import { expect, test } from 'vitest'
import { createEventSubGateway, verifyTwitchWebhook } from '../server/utils/twitch-eventsub'

const secret = 'secret'
const now = new Date('2026-10-10T12:00:00Z')
function signed(body: string, timestamp = now.toISOString()) {
  const id = 'message-1'
  return { 'twitch-eventsub-message-id': id, 'twitch-eventsub-message-timestamp': timestamp, 'twitch-eventsub-message-type': 'notification', 'twitch-eventsub-message-signature': `sha256=${createHmac('sha256', secret).update(id + timestamp + body).digest('hex')}` }
}
test('validates signed Twitch online event and rejects tampering, replay window, and malformed payload', () => {
  const body = JSON.stringify({ subscription: { id: 'sub-1', type: 'stream.online' }, event: { broadcaster_user_id: '42', id: 'stream-1', started_at: now.toISOString(), title: 'Live' } })
  expect(verifyTwitchWebhook(signed(body), body, secret, now)).toMatchObject({ type: 'notification', notification: { broadcasterUserId: '42', streamId: 'stream-1' } })
  expect(verifyTwitchWebhook(signed(body), `${body} `, secret, now)).toBeNull()
  expect(verifyTwitchWebhook(signed(body, '2026-10-10T11:49:59Z'), body, secret, now)).toBeNull()
  expect(verifyTwitchWebhook(signed('{}'), '{}', secret, now)).toBeNull()
})

test('EventSub gateway uses an app token for subscriptions and stream reconciliation', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = []
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); requests.push({ url, init })
    if (url.includes('oauth2/token')) return Response.json({ access_token: 'app-token', expires_in: 3600 })
    if (url.endsWith('/eventsub/subscriptions')) return Response.json({ data: [{ id: 'sub-1', status: 'enabled' }] })
    if (url.includes('/streams?')) return Response.json({ data: [{ id: 'live-1', title: 'Live', game_name: 'News', started_at: now.toISOString() }] })
    return new Response(null, { status: 204 })
  }
  const gateway = createEventSubGateway({ clientId: 'client', clientSecret: 'app-secret' }, fetcher)
  expect(await gateway.createSubscription('42', 'stream.offline', 'https://sentry.test/hook', secret)).toEqual({ id: 'sub-1', status: 'enabled' })
  expect(await gateway.getStream('42')).toMatchObject({ streamId: 'live-1', category: 'News' })
  expect(requests.filter(request => request.url.includes('oauth2/token'))).toHaveLength(1)
  const subscription = requests.find(request => request.url.endsWith('/eventsub/subscriptions'))!
  expect(subscription.init?.headers).toMatchObject({ Authorization: 'Bearer app-token', 'Client-Id': 'client' })
  expect(JSON.parse(subscription.init?.body as string)).toMatchObject({ type: 'stream.offline', transport: { callback: 'https://sentry.test/hook', secret } })
  expect(subscription.init?.headers).not.toHaveProperty('OAuth')
})
