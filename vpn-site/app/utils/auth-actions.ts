import { buildAuthCallbackUrl, resolveAuthReturnTo } from '@vpn/auth'

const AUTH_PORTAL_FALLBACK = 'https://vpn.labafero.com/'

export interface AuthActionResult {
  ok: boolean
}

export interface SignUpActionResult extends AuthActionResult {
  hasSession: boolean
}

export interface AuthActionClient {
  auth: {
    signInWithOAuth(input: {
      provider: 'discord' | 'twitch'
      options: { redirectTo: string }
    }): Promise<{ error: unknown | null }>
    signInWithPassword(input: {
      email: string
      password: string
      options: { captchaToken: string }
    }): Promise<{ error: unknown | null }>
    getClaims(): Promise<{
      data: { claims: { sub?: string; is_anonymous?: boolean } } | null
      error: unknown | null
    }>
    signUp(input: {
      email: string
      password: string
      options: { emailRedirectTo: string; captchaToken: string }
    }): Promise<{
      data: { session: unknown | null }
      error: unknown | null
    }>
  }
}

export async function startOAuth(
  client: AuthActionClient,
  provider: 'discord' | 'twitch',
  callbackUrl: string
): Promise<AuthActionResult> {
  try {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl }
    })
    return { ok: !error }
  } catch {
    return { ok: false }
  }
}

export async function signInWithEmail(
  client: AuthActionClient,
  credentials: { email: string; password: string },
  captchaToken: string
): Promise<AuthActionResult> {
  try {
    const { error } = await client.auth.signInWithPassword({
      ...credentials,
      options: { captchaToken }
    })
    if (error) return { ok: false }
    const { data, error: claimsError } = await client.auth.getClaims()
    return { ok: !claimsError && Boolean(data?.claims?.sub) && !data?.claims?.is_anonymous }
  } catch {
    return { ok: false }
  }
}

export async function signUpWithEmail(
  client: AuthActionClient,
  credentials: { email: string; password: string },
  callbackUrl: string,
  captchaToken: string
): Promise<SignUpActionResult> {
  try {
    const { data, error } = await client.auth.signUp({
      ...credentials,
      options: { emailRedirectTo: callbackUrl, captchaToken }
    })
    return { ok: !error, hasSession: !error && data.session !== null }
  } catch {
    return { ok: false, hasSession: false }
  }
}

export function resolveAuthReturnTarget(
  candidate: string | null | undefined,
  allowedOrigins: readonly string[],
  currentOrigin?: string
): string {
  const currentOriginIsAllowed = currentOrigin && allowedOrigins.includes(currentOrigin)
  const fallback = currentOriginIsAllowed ? new URL('/', currentOrigin).href : AUTH_PORTAL_FALLBACK

  return resolveAuthReturnTo(candidate, allowedOrigins, fallback)
}

export function createAuthCallbackUrl(returnTo: string): string {
  return buildAuthCallbackUrl(returnTo)
}

export async function fetchAuthReturnTarget(candidate: string | null | undefined): Promise<string> {
  const response = await $fetch<{ returnTo: string }>('/api/auth/return-target', {
    query: { return_to: candidate || undefined }
  })
  return response.returnTo
}
