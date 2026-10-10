import { defineEventHandler, getRouterParam } from 'h3'
import { FoundationError, privateResponse } from '../../../utils/api-error'
import { requireVpnUser } from '../../../utils/auth'
import { getMonitoringService } from '../../../utils/monitoring-runtime'
import { requireMonitoringUuid } from '../../../utils/monitoring-validation'

export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  const service = getMonitoringService()
  const id = requireMonitoringUuid(getRouterParam(event, 'id'))
  const session = await service.getSession(id)
  if (!session || !await service.canReadSession(id, user.userId, user.role === 'vpn_admin')) throw new FoundationError(404)
  const { ownerId, ...visibleSession } = session
  return { ...visibleSession, canManageInvites: ownerId === user.userId && user.role !== 'vpn_admin' }
}))
