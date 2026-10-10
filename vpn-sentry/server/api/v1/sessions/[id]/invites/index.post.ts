import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3'
import { FoundationError, privateResponse } from '../../../../../utils/api-error'
import { requireVpnUser } from '../../../../../utils/auth'
import { getMonitoringService } from '../../../../../utils/monitoring-runtime'
import { requireMonitoringUuid } from '../../../../../utils/monitoring-validation'

export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  if (user.role === 'vpn_admin') throw new FoundationError(403)
  const result = await getMonitoringService().createInvite(requireMonitoringUuid(getRouterParam(event, 'id')), user.userId)
  setResponseStatus(event, 201)
  return result
}))
