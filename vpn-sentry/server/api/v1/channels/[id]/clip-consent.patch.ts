import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { getClipIngestionService } from '../../../../utils/clip-runtime'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    const channel = getRouterParam(event, 'id') || ''
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(channel)) throw new FoundationError(400)
    return getClipIngestionService().setConsent(user.userId, channel, await readBody(event))
  })
)
