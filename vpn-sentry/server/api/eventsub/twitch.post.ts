import { defineEventHandler, getHeader, readRawBody, setHeader, setResponseStatus } from 'h3'
import { getMonitoringService } from '../../utils/monitoring-runtime'
import { getMonitoringRepository } from '../../utils/monitoring-database'
import { verifyTwitchWebhook } from '../../utils/twitch-eventsub'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  const rawBody = await readRawBody(event, 'utf8')
  if (!rawBody || rawBody.length > 65536) { setResponseStatus(event, 400); return { code: 'INVALID_EVENTSUB' } }
  const secret = process.env.NUXT_TWITCH_EVENTSUB_SECRET || ''
  const headers = Object.fromEntries(['id', 'timestamp', 'signature', 'type'].map(suffix => [`twitch-eventsub-message-${suffix}`, getHeader(event, `twitch-eventsub-message-${suffix}`)]))
  const message = verifyTwitchWebhook(headers, rawBody, secret)
  if (!message) { setResponseStatus(event, 400); return { code: 'INVALID_EVENTSUB' } }
  try {
    if (message.type === 'webhook_callback_verification') {
      await getMonitoringRepository().confirmSubscription(message.subscriptionId, true)
      setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
      return message.challenge
    }
    if (message.type === 'revocation') {
      await getMonitoringRepository().confirmSubscription(message.subscriptionId, false)
      return { received: true }
    }
    await getMonitoringService().handleEvent(message.notification)
    return { received: true }
  } catch { setResponseStatus(event, 503); return { code: 'SERVICE_UNAVAILABLE' } }
})
