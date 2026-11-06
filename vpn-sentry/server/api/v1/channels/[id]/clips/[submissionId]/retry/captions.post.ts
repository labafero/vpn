import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { requireVpnUser } from '../../../../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../../../../utils/api-error'
import { getClipManualRetry } from '../../../../../../../utils/clip-runtime'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    const channel = getRouterParam(event, 'id') || ''
    const submissionId = getRouterParam(event, 'submissionId') || ''
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(channel)) throw new FoundationError(400)
    return getClipManualRetry().completeCaptions(
      user.userId,
      channel,
      submissionId,
      await readBody(event)
    )
  })
)
