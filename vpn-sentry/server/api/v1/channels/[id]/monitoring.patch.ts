import { defineEventHandler, getRouterParam, readBody } from 'h3'
import * as v from 'valibot'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { requireVpnUser } from '../../../../utils/auth'
import { getMonitoringService } from '../../../../utils/monitoring-runtime'
import { requireMonitoringUuid } from '../../../../utils/monitoring-validation'

const schema = v.object({ enabled: v.boolean(), consentVersion: v.optional(v.literal('monitoring-v2')), consentAccepted: v.optional(v.literal(true)) })
export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  if (user.role === 'vpn_admin') throw new FoundationError(403)
  const input = v.safeParse(schema, await readBody(event))
  if (!input.success || (input.output.enabled && (input.output.consentVersion !== 'monitoring-v2' || input.output.consentAccepted !== true))) throw new FoundationError(400)
  return getMonitoringService().setMonitoring(user.userId, requireMonitoringUuid(getRouterParam(event, 'id')), input.output.enabled, input.output.consentAccepted === true)
}))
