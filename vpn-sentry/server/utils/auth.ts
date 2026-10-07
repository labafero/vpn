import { getHeader, type H3Event } from 'h3'
import type { Me } from '@vpn/contracts'
import { FoundationError } from './api-error'
import { getFoundationRepository } from './private-database'

export async function validateVpnIdentity(
  authorization: string | undefined,
  config: { url: string; key: string },
  fetcher: typeof fetch,
  getRole: (userId: string) => Promise<Me['role']>,
  sessionActive: (userId: string, authorization: string) => Promise<boolean> = async () => true
): Promise<Me> {
  if (!authorization || !/^Bearer [\w.-]+$/.test(authorization)) throw new FoundationError(401)
  if (!config.url || !config.key) throw new FoundationError(503)
  let response: Response
  try {
    response = await fetcher(new URL('/auth/v1/user', config.url), {
      headers: { apikey: config.key, Authorization: authorization },
      signal: AbortSignal.timeout(10000)
    })
  } catch { throw new FoundationError(503) }
  if (response.status === 401 || response.status === 403) throw new FoundationError(401)
  if (!response.ok) throw new FoundationError(503)
  let user: { id?: string; is_anonymous?: boolean }
  try { user = await response.json() } catch { throw new FoundationError(503) }
  if (!user.id || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(user.id) || user.is_anonymous) throw new FoundationError(401)
  try {
    if (!await sessionActive(user.id, authorization)) throw new FoundationError(401)
    return { userId: user.id, role: await getRole(user.id) }
  } catch (error) { throw error instanceof FoundationError ? error : new FoundationError(503) }
}

export function requireVpnUser(event: H3Event): Promise<Me> {
  return validateVpnIdentity(getHeader(event, 'authorization'), {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL || '',
    key: process.env.NUXT_PUBLIC_SUPABASE_KEY || ''
  }, fetch, id => getFoundationRepository().getRole(id), async (userId, authorization) => {
    // Decode only after the Auth server has verified the token and its owner.
    try {
      const payload = JSON.parse(Buffer.from(authorization.slice(7).split('.')[1] || '', 'base64url').toString('utf8')) as { session_id?: string }
      if (!payload.session_id || !/^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(payload.session_id)) return false
      return getFoundationRepository().sessionActive(userId, payload.session_id)
    } catch { return false }
  })
}
