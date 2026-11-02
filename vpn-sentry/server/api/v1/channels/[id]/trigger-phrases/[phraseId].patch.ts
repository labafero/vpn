import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireVpnUser } from '../../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../../utils/api-error'
import { getClipTriggerPhrases } from '../../../../../utils/clip-runtime'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    const channel = getRouterParam(event, 'id') || ''
    const phraseId = getRouterParam(event, 'phraseId') || ''
    const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i
    if (!uuid.test(channel) || !uuid.test(phraseId)) throw new FoundationError(400)
    return getClipTriggerPhrases().update(user.userId, channel, phraseId, await readBody(event))
  })
)
