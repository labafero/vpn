import { defineEventHandler, getQuery } from 'h3'
import { FoundationError, privateResponse } from '../../../utils/api-error'
import { requireVpnUser } from '../../../utils/auth'
import { getMonitoringService } from '../../../utils/monitoring-runtime'
import { requireMonitoringUuid } from '../../../utils/monitoring-validation'

export default defineEventHandler(event => privateResponse(event, async () => {
  const user = await requireVpnUser(event)
  const query = getQuery(event)
  const channelId = query.channelId
  if (channelId !== undefined && typeof channelId !== 'string') throw new FoundationError(400)
  const validChannelId = channelId === undefined ? undefined : requireMonitoringUuid(channelId)
  const limit = query.limit === undefined ? 25 : Number(query.limit)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (query.cursor !== undefined && (typeof query.cursor !== 'string' || query.cursor.length > 256))) throw new FoundationError(400)
  const page = await getMonitoringService().listSessions(user.userId, user.role === 'vpn_admin', validChannelId, query.cursor as string | undefined, limit)
  return { items: page.items.map(({ ownerId, ...session }) => ({ ...session, canManageInvites: ownerId === user.userId && user.role !== 'vpn_admin' })), nextCursor: page.nextCursor }
}))
