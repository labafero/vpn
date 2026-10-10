import { defineEventHandler, getRouterParam } from 'h3'
import { FoundationError, privateResponse } from '../../../../../utils/api-error'
import { requireVpnUser } from '../../../../../utils/auth'
import { getMonitoringService } from '../../../../../utils/monitoring-runtime'
import { requireMonitoringUuid } from '../../../../../utils/monitoring-validation'

export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  if (user.role === 'vpn_admin') throw new FoundationError(403)
  const id = requireMonitoringUuid(getRouterParam(event, 'id'))
  const session = await getMonitoringService().getSession(id)
  if (!session || session.ownerId !== user.userId) throw new FoundationError(404)
  return getMonitoringService().listInvites(id, user.userId)
}))
