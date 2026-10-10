import { describe, expect, test, vi } from 'vitest'
import * as auth from '../server/utils/auth'
import { toApiError } from '../server/utils/api-error'

describe('validated VPN identity', () => {
  const id = '00000000-0000-0000-0000-000000000001'
  const config = { url: 'https://example.supabase.co', key: 'publishable' }
  test('missingTokenReturns401', async () => {
    await expect(auth.validateVpnIdentity(undefined, config, vi.fn(), vi.fn())).rejects.toMatchObject({ statusCode: 401 })
  })
  test.each(['forged', 'expired'])('%sTokenReturns401', async token => {
    await expect(auth.validateVpnIdentity(`Bearer ${token}`, config, async () => new Response('{}', { status: 401 }), vi.fn())).rejects.toMatchObject({ statusCode: 401 })
  })
  test('editableMetadataCannotGrantAdmin', async () => {
    const result = await auth.validateVpnIdentity('Bearer token', config, async () => Response.json({ id, user_metadata: { role: 'vpn_admin' } }), async () => 'member')
    expect(result).toEqual({ userId: id, role: 'member' })
  })
  test('removedAdminLosesAccess', async () => {
    let role: 'member' | 'vpn_admin' = 'vpn_admin'
    const fetcher = async () => Response.json({ id })
    const roles = async () => role
    expect((await auth.validateVpnIdentity('Bearer same-token', config, fetcher, roles)).role).toBe('vpn_admin')
    role = 'member'
    expect((await auth.validateVpnIdentity('Bearer same-token', config, fetcher, roles)).role).toBe('member')
  })
  test('upstreamErrorIsSanitized', async () => {
    try {
      await auth.validateVpnIdentity('Bearer secret', config, async () => { throw new Error('secret refresh_token') }, vi.fn())
    } catch (error) {
      const result = toApiError(error, id)
      expect(result.code).toBe('SERVICE_UNAVAILABLE')
      expect(JSON.stringify(result)).not.toMatch(/secret|refresh_token/)
    }
  })
  test('revoked server session is rejected even when JWT validates', async () => {
    await expect(auth.validateVpnIdentity('Bearer token', config, async () => Response.json({ id }), async () => 'member', async () => false)).rejects.toMatchObject({ statusCode: 401 })
  })
})
