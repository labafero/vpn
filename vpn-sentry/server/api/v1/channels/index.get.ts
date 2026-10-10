import { defineEventHandler } from 'h3'
import { privateResponse } from '../../../utils/api-error'
import { requireVpnUser } from '../../../utils/auth'
import { getMonitoringService } from '../../../utils/monitoring-runtime'

export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  return getMonitoringService().listChannels(user.userId, user.role === 'vpn_admin')
}))
