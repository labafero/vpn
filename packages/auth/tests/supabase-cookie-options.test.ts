import { describe, expect, test } from 'vitest'
import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '../src/index'

describe('shared Supabase cookie options', () => {
  test('uses the same prefix and compatible cookie scope for all VPN apps', () => {
    expect(VPN_AUTH_COOKIE_PREFIX).toBe('sb-vpn-auth-token')

    const development = getSupabaseCookieOptions('development')
    const preview = getSupabaseCookieOptions('preview')
    const production = getSupabaseCookieOptions('production')

    for (const options of [development, preview, production]) {
      expect(options).toMatchObject({
        path: '/',
        maxAge: 28800,
        sameSite: 'lax'
      })
    }

    expect(development.domain).toBeUndefined()
    expect(preview.domain).toBeUndefined()
    expect(production.domain).toBe('.labafero.com')
    expect(development.secure).toBe(false)
    expect(preview.secure).toBe(true)
    expect(production.secure).toBe(true)
  })
})
