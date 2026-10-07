import { randomBytes, randomUUID } from 'node:crypto'
import { defineEventHandler, getRouterParam, getHeader, getMethod, getQuery, getCookie, setCookie, deleteCookie, readBody, setHeader, setResponseStatus, sendRedirect } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import { allowSentryRequest } from '../../utils/sentry-proxy'

export default defineEventHandler(async event => {
  setHeader(event, 'Cache-Control', 'no-store')
  setHeader(event, 'Referrer-Policy', 'no-referrer')
  const path = getRouterParam(event, 'path') || ''
  const method = getMethod(event)
  const config = useRuntimeConfig(event)
  const origin = config.monitorOrigin
  const fail = (status: number, code: string, message: string) => {
    setResponseStatus(event, status)
    return { code, message, requestId: randomUUID() }
  }
  if (!origin || !config.sentryUrl) return fail(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.')
  if (!allowSentryRequest(path, method, getHeader(event, 'origin'), getHeader(event, 'x-vpn-csrf'), origin)) return fail(400, 'INVALID_REQUEST', 'Solicitação inválida.')
  const callback = path.endsWith('/callback')
  try {
    const client = await serverSupabaseClient(event)
    const { data: session } = await client.auth.getSession()
    if (!session.session?.access_token) return fail(401, 'UNAUTHORIZED', 'Entre na sua conta VPN para continuar.')
    const { data: identity, error } = await client.auth.getUser(session.session.access_token)
    if (error || !identity.user || identity.user.is_anonymous) return fail(401, 'UNAUTHORIZED', 'Entre na sua conta VPN para continuar.')
    const url = new URL(`${config.sentryUrl.replace(/\/$/, '')}/${path}`)
    if (callback) {
      const query = getQuery(event)
      for (const key of ['code', 'state', 'error']) if (typeof query[key] === 'string') url.searchParams.set(key, query[key])
    }
    const authorize = path.endsWith('/authorize')
    const nonce = authorize ? randomBytes(32).toString('base64url') : getCookie(event, 'vpn-oauth-nonce') || ''
    const headers: Record<string, string> = { Authorization: `Bearer ${session.session.access_token}` }
    if (authorize || callback) headers['X-OAuth-Nonce'] = nonce
    let body: string | undefined
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(await readBody(event))
    }
    const response = await fetch(url, { method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) })
    if (callback) deleteCookie(event, 'vpn-oauth-nonce', { path: '/api/sentry/provider-connections/twitch' })
    if (response.status === 303) {
      if (!callback || response.headers.get('location') !== `${origin}/conexao`) return fail(503, 'SERVICE_UNAVAILABLE', 'Resposta de conexão inválida.')
      return sendRedirect(event, `${origin}/conexao`, 303)
    }
    if (response.status === 204) { setResponseStatus(event, 204); return }
    if (!response.ok) {
      const status = [400, 401, 409, 503].includes(response.status) ? response.status : 503
      const errors: Record<number, [string, string]> = {
        400: ['INVALID_REQUEST', 'Conexão recusada ou inválida. Inicie novamente.'],
        401: ['UNAUTHORIZED', 'Entre na sua conta VPN para continuar.'],
        409: ['CONNECTION_CONFLICT', 'Desconecte o vínculo existente antes de conectar outro canal.'],
        503: ['SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível.']
      }
      const [code, message] = errors[status]!
      return fail(status, code, message)
    }
    const result = await response.json()
    if (authorize) {
      if (typeof result.authorizationUrl !== 'string' || new URL(result.authorizationUrl).origin !== 'https://id.twitch.tv') return fail(503, 'SERVICE_UNAVAILABLE', 'Resposta de conexão inválida.')
      setCookie(event, 'vpn-oauth-nonce', nonce, { httpOnly: true, sameSite: 'lax', secure: origin.startsWith('https:'), maxAge: 600, path: '/api/sentry/provider-connections/twitch' })
    }
    setResponseStatus(event, response.status)
    return result
  } catch {
    if (callback) deleteCookie(event, 'vpn-oauth-nonce', { path: '/api/sentry/provider-connections/twitch' })
    return fail(503, 'SERVICE_UNAVAILABLE', 'Serviço temporariamente indisponível. Tente novamente.')
  }
})
