import { defineEventHandler, readBody } from 'h3'
import * as v from 'valibot'
import { FoundationError, privateResponse } from '../../../utils/api-error'
import { requireVpnUser } from '../../../utils/auth'
import { getMonitoringService } from '../../../utils/monitoring-runtime'

const schema = v.object({ token: v.pipe(v.string(), v.minLength(32), v.maxLength(128)) })
export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  const input = v.safeParse(schema, await readBody(event))
  if (!input.success) throw new FoundationError(400)
  return { sessionId: await getMonitoringService().acceptInvite(input.output.token, user.userId) }
}))
