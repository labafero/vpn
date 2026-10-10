import { createHmac, timingSafeEqual } from 'node:crypto'
import { FoundationError } from './api-error'

export type EventSubNotification = {
  messageId: string
  subscriptionId: string
  type: 'stream.online' | 'stream.offline'
  broadcasterUserId: string
  observedAt: string
  streamId?: string
  title?: string
  category?: string
  startedAt?: string
}
export type VerifiedEventSubMessage =
  | { type: 'webhook_callback_verification'; challenge: string; subscriptionId: string }
  | { type: 'notification'; notification: EventSubNotification }
  | { type: 'revocation'; subscriptionId: string }

export function verifyTwitchWebhook(headers: Record<string, string | undefined>, rawBody: string, secret: string, now = new Date()): VerifiedEventSubMessage | null {
  const id = headers['twitch-eventsub-message-id']
  const timestamp = headers['twitch-eventsub-message-timestamp']
  const signature = headers['twitch-eventsub-message-signature']
  const messageType = headers['twitch-eventsub-message-type']
  if (!id || id.length > 128 || !timestamp || !signature || !messageType || !secret) return null
  const sentAt = Date.parse(timestamp)
  if (!Number.isFinite(sentAt) || Math.abs(now.getTime() - sentAt) > 10 * 60_000) return null
  const expected = `sha256=${createHmac('sha256', secret).update(id + timestamp + rawBody).digest('hex')}`
  const actual = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return null
  try {
    const body = JSON.parse(rawBody) as { challenge?: unknown; subscription?: { id?: unknown; type?: unknown }; event?: Record<string, unknown> }
    const subscriptionId = body.subscription?.id
    if (typeof subscriptionId !== 'string' || !subscriptionId) return null
    if (messageType === 'webhook_callback_verification' && typeof body.challenge === 'string') return { type: 'webhook_callback_verification', challenge: body.challenge, subscriptionId }
    if (messageType === 'revocation') return { type: 'revocation', subscriptionId }
    if (messageType !== 'notification' || !body.event || typeof body.event.broadcaster_user_id !== 'string') return null
    const type = body.subscription?.type
    if (type !== 'stream.online' && type !== 'stream.offline') return null
    const event = body.event
    const broadcasterUserId = event.broadcaster_user_id as string
    if (type === 'stream.online' && (typeof event.id !== 'string' || typeof event.started_at !== 'string' || !Number.isFinite(Date.parse(event.started_at)))) return null
    return { type: 'notification', notification: { messageId: id, subscriptionId, type, broadcasterUserId, observedAt: timestamp, ...(typeof event.id === 'string' ? { streamId: event.id } : {}), ...(typeof event.title === 'string' ? { title: event.title } : {}), ...(typeof event.category_name === 'string' ? { category: event.category_name } : {}), ...(typeof event.started_at === 'string' ? { startedAt: event.started_at } : {}) } }
  } catch { return null }
}

export type EventSubGateway = {
  createSubscription: (broadcasterUserId: string, type: 'stream.online' | 'stream.offline', callback: string, secret: string) => Promise<{ id: string; status: string }>
  deleteSubscription: (id: string) => Promise<void>
  getStream: (broadcasterUserId: string) => Promise<Pick<EventSubNotification, 'streamId' | 'title' | 'category' | 'startedAt'> | null>
}

export function createEventSubGateway(config: { clientId: string; clientSecret: string }, fetcher: typeof fetch = fetch): EventSubGateway {
  let token: { value: string; expires: number } | undefined
  async function appToken() {
    if (token && token.expires > Date.now() + 60_000) return token.value
    const response = await fetcher('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'client_credentials' }), signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new FoundationError(503)
    const data = await response.json() as { access_token?: string; expires_in?: number }
    if (!data.access_token || !data.expires_in) throw new FoundationError(503)
    token = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 }
    return token.value
  }
  async function request(path: string, init: RequestInit = {}, acceptedStatuses: number[] = []) {
    try {
      const response = await fetcher(`https://api.twitch.tv/helix/${path}`, { ...init, headers: { 'Client-Id': config.clientId, Authorization: `Bearer ${await appToken()}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }, signal: AbortSignal.timeout(10000) })
      if (!response.ok && response.status !== 204 && !acceptedStatuses.includes(response.status)) throw new FoundationError(503)
      return response
    } catch (error) { if (error instanceof FoundationError) throw error; throw new FoundationError(503) }
  }
  return {
    async createSubscription(broadcasterUserId, type, callback, secret) {
      const response = await request('eventsub/subscriptions', { method: 'POST', body: JSON.stringify({ type, version: '1', condition: { broadcaster_user_id: broadcasterUserId }, transport: { method: 'webhook', callback, secret } }) }, [409])
      if (response.status === 409) {
        const existingResponse = await request(`eventsub/subscriptions?user_id=${encodeURIComponent(broadcasterUserId)}`)
        const existing = await existingResponse.json() as { data?: Array<{ id: string; status: string; type: string; condition?: { broadcaster_user_id?: string }; transport?: { callback?: string } }> }
        const subscription = existing.data?.find(value => (value.status === 'enabled' || value.status === 'webhook_callback_verification_pending') && value.type === type && value.condition?.broadcaster_user_id === broadcasterUserId && value.transport?.callback === callback)
        if (subscription) return { id: subscription.id, status: subscription.status }
        throw new FoundationError(503)
      }
      const data = await response.json() as { data?: Array<{ id: string; status: string }> }
      const sub = data.data?.[0]
      if (!sub?.id || !sub.status) throw new FoundationError(503)
      return sub
    },
    async deleteSubscription(id) {
      try {
        const response = await fetcher(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'Client-Id': config.clientId, Authorization: `Bearer ${await appToken()}` }, signal: AbortSignal.timeout(10000) })
        if (!response.ok && response.status !== 404) throw new FoundationError(503)
      } catch (error) { if (error instanceof FoundationError) throw error; throw new FoundationError(503) }
    },
    async getStream(broadcasterUserId) {
      const response = await request(`streams?user_id=${encodeURIComponent(broadcasterUserId)}`)
      const data = await response.json() as { data?: Array<{ id: string; title: string; game_name: string; started_at: string }> }
      const stream = data.data?.[0]
      return stream ? { streamId: stream.id, title: stream.title, category: stream.game_name, startedAt: stream.started_at } : null
    }
  }
}
