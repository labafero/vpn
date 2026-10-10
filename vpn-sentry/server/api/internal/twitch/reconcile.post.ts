import { createHash, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getHeader } from 'h3'
import { FoundationError, privateResponse } from '../../../utils/api-error'
import { getMonitoringService } from '../../../utils/monitoring-runtime'

export default defineEventHandler(event => privateResponse(event, async () => {
  const secret = process.env.NUXT_TWITCH_CRON_SECRET || ''
  if (secret.length < 32) throw new FoundationError(503)
  const authorization = getHeader(event, 'authorization') || ''
  const digest = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))) throw new FoundationError(401)
  return getMonitoringService().reconcile()
}))
