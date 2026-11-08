import { defineEventHandler, getQuery, getRouterParam } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { getClipIngestionService } from '../../../../utils/clip-runtime'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    const channel = getRouterParam(event, 'id') || ''
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(channel)) throw new FoundationError(400)
    const query = getQuery(event)
    const { cursor, state, captureMode, title } = query
    if (
      (cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 512)) ||
      (state !== undefined && typeof state !== 'string') ||
      (captureMode !== undefined && typeof captureMode !== 'string') ||
      (title !== undefined && typeof title !== 'string')
    )
      throw new FoundationError(400)
    return getClipIngestionService().list(user.userId, channel, {
      cursor: cursor as string | undefined,
      state: state as string | undefined,
      captureMode: captureMode as string | undefined,
      title: title as string | undefined
    })
  })
)
