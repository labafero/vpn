export const VPN_AUTH_COOKIE_PREFIX = 'sb-vpn-auth-token'

export type SupabaseCookieEnvironment = 'development' | 'preview' | 'production'

export interface SupabaseCookieOptions {
  domain?: string
  maxAge: number
  path: '/'
  sameSite: 'lax'
  secure: boolean
}

const FALLBACK_AUTH_PORTAL_URL = 'https://vpn.labafero.com/'
const OAUTH_RESPONSE_PARAMS = [
  'code',
  'access_token',
  'refresh_token',
  'token_hash',
  'error',
  'error_description',
  'error_code',
  'state'
]

function parseSafeAbsoluteUrl(value: string, allowFragment = false): URL | null {
  if (
    value !== value.trim() ||
    value.includes('\\') ||
    (!allowFragment && value.includes('#')) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null
  }

  try {
    const url = new URL(value)
    if (
      (url.protocol !== 'http:' && url.protocol !== 'https:') ||
      url.username ||
      url.password ||
      (!allowFragment && url.hash)
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

function getAllowedOrigins(allowedOrigins: readonly string[]): Set<string> {
  const origins = new Set<string>()
  for (const origin of allowedOrigins) {
    const url = parseSafeAbsoluteUrl(origin)
    if (url && url.pathname === '/' && !url.search) origins.add(url.origin)
  }
  return origins
}

function getSafeFallback(fallback: string, allowedOrigins: Set<string>): string {
  const fallbackUrl = parseSafeAbsoluteUrl(fallback)
  if (fallbackUrl && allowedOrigins.has(fallbackUrl.origin)) return fallbackUrl.href

  const firstAllowedOrigin = allowedOrigins.values().next().value
  return firstAllowedOrigin ? new URL('/', firstAllowedOrigin).href : FALLBACK_AUTH_PORTAL_URL
}

export function resolveAuthReturnTo(
  candidate: string | null | undefined,
  allowedOrigins: readonly string[],
  fallback: string
): string {
  const origins = getAllowedOrigins(allowedOrigins)
  const safeFallback = getSafeFallback(fallback, origins)
  if (!candidate) return safeFallback

  const candidateUrl = parseSafeAbsoluteUrl(candidate)
  if (!candidateUrl || !origins.has(candidateUrl.origin)) return safeFallback
  return candidateUrl.href
}

export function resolveAuthCallbackPath(
  candidate: string | null | undefined,
  fallback = '/auth/callback'
): string {
  const resolvePath = (value: string | null | undefined): string | null => {
    if (
      !value ||
      !value.startsWith('/') ||
      value.startsWith('//') ||
      value.includes('\\') ||
      value.includes('#') ||
      /[\u0000-\u001f\u007f]/.test(value)
    ) {
      return null
    }

    try {
      const base = new URL('https://vpn-auth.invalid')
      const url = new URL(value, base)
      if (url.origin !== base.origin || url.hash) return null
      return `${url.pathname}${url.search}`
    } catch {
      return null
    }
  }

  return resolvePath(candidate) ?? resolvePath(fallback) ?? '/'
}

export function buildAuthCallbackUrl(returnTo: string, callbackPath = '/auth/callback'): string {
  const destination = parseSafeAbsoluteUrl(returnTo, true)
  const callbackUrl = new URL(
    resolveAuthCallbackPath(callbackPath),
    destination?.origin ?? FALLBACK_AUTH_PORTAL_URL
  )

  if (!destination) return callbackUrl.href

  const query = new URLSearchParams(destination.search)
  for (const parameter of OAUTH_RESPONSE_PARAMS) query.delete(parameter)
  const next = `${destination.pathname}${query.size ? `?${query.toString()}` : ''}`
  callbackUrl.searchParams.set('next', next)
  return callbackUrl.href
}

export function buildAuthPortalUrl(
  authPortalUrl: string,
  returnTo?: string,
  page: 'entrar' | 'cadastro' = 'entrar',
  authError = false
): string {
  const portal = parseSafeAbsoluteUrl(authPortalUrl) ?? new URL(FALLBACK_AUTH_PORTAL_URL)
  const url = new URL(page === 'cadastro' ? '/cadastro' : '/entrar', portal.origin)
  if (returnTo) url.searchParams.set('return_to', returnTo)
  if (authError) url.searchParams.set('auth_error', '1')
  return url.href
}

export function getSupabaseCookieOptions(
  environment: SupabaseCookieEnvironment
): SupabaseCookieOptions {
  return {
    ...(environment === 'production' ? { domain: '.labafero.com' } : {}),
    maxAge: 28800,
    path: '/',
    sameSite: 'lax',
    secure: environment !== 'development'
  }
}
