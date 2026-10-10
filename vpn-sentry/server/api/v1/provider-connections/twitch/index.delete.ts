import { defineEventHandler, setHeader, setResponseStatus } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { privateResponse } from '../../../../utils/api-error'
import { getTwitchOAuthService } from '../../../../utils/twitch-oauth'

export default defineEventHandler(event => privateResponse(event, async () => {
  setHeader(event, 'Cache-Control', 'no-store')
  const status = await getTwitchOAuthService().disconnectTwitch(await requireVpnUser(event))
  setResponseStatus(event, status === 'revoked' ? 204 : 202)
  return status === 'revoked' ? undefined : { status }
}))
