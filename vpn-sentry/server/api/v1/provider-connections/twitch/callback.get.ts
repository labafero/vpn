import { defineEventHandler, getHeader, getQuery, sendRedirect, setHeader } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { getTwitchOAuthService } from '../../../../utils/twitch-oauth'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Referrer-Policy', 'no-referrer')
    const user = await requireVpnUser(event)
    const query = getQuery(event)
    if (typeof query.state !== 'string') throw new FoundationError(400)
    const service = getTwitchOAuthService()
    if (query.error) {
      await service.cancelTwitchAuthorization(user, {
        state: query.state,
        browserNonce: getHeader(event, 'x-oauth-nonce') || ''
      })
      setHeader(event, 'X-OAuth-Result', 'declined')
      return sendRedirect(event, `${process.env.NUXT_MONITOR_ORIGIN}/conexao`, 303)
    }
    if (typeof query.code !== 'string') throw new FoundationError(400)
    await service.completeTwitchAuthorization(user, {
      code: query.code,
      state: query.state,
      browserNonce: getHeader(event, 'x-oauth-nonce') || ''
    })
    return sendRedirect(event, `${process.env.NUXT_MONITOR_ORIGIN}/conexao`, 303)
  })
)
