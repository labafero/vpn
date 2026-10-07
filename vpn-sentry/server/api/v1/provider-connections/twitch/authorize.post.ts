import { defineEventHandler, getHeader, readBody, setHeader } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { getTwitchOAuthService } from '../../../../utils/twitch-oauth'

export default defineEventHandler(event => privateResponse(event, async () => {
  setHeader(event, 'Cache-Control', 'no-store')
  const user = await requireVpnUser(event)
  const body = await readBody(event)
  if (!body || Object.keys(body).some(key => !['consentVersion', 'consentAccepted'].includes(key))) throw new FoundationError(400)
  return getTwitchOAuthService().beginTwitchAuthorization(user, body, getHeader(event, 'x-oauth-nonce') || '')
}))
