import { createMonitoringService } from './monitoring-service'
import { getMonitoringRepository } from './monitoring-database'
import { createEventSubGateway } from './twitch-eventsub'

export function getMonitoringService() {
  const clientId = process.env.NUXT_TWITCH_CLIENT_ID || ''
  const clientSecret = process.env.NUXT_TWITCH_CLIENT_SECRET || ''
  return createMonitoringService(getMonitoringRepository(), createEventSubGateway({ clientId, clientSecret }), {
    callback: process.env.NUXT_TWITCH_EVENTSUB_CALLBACK || '',
    secret: process.env.NUXT_TWITCH_EVENTSUB_SECRET || ''
  })
}
