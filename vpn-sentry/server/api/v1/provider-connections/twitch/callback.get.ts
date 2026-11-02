import { defineEventHandler, getHeader, getQuery, sendRedirect, setHeader } from 'h3'
import { requireVpnUser } from '../../../../utils/auth'
import { FoundationError, privateResponse } from '../../../../utils/api-error'
import { getTwitchOAuthService } from '../../../../utils/twitch-oauth'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    setHeader(event, 'Cache-Control', 'no-store')
    setHeader(event, 'Referrer-Policy', 'no-referrer')
    let stage = 'authenticate_user'
    try {
      const user = await requireVpnUser(event)
      stage = 'read_callback'
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
      stage = 'complete_oauth'
      await service.completeTwitchAuthorization(
        user,
        {
          code: query.code,
          state: query.state,
          browserNonce: getHeader(event, 'x-oauth-nonce') || ''
        },
        ({ stage, statusCode }) => {
          console.error('[twitch_oauth_callback_failed]', { stage, statusCode })
        }
      )
      return sendRedirect(event, `${process.env.NUXT_MONITOR_ORIGIN}/conexao`, 303)
    } catch (error) {
      if (stage !== 'complete_oauth') {
        console.error('[twitch_oauth_callback_failed]', {
          stage,
          statusCode: error instanceof FoundationError ? error.statusCode : 503
        })
      }
      throw error
    }
  })
)
