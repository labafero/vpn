import { describe, expect, test } from 'vitest'
import {
  buildAuthCallbackUrl,
  buildAuthPortalUrl,
  resolveAuthCallbackPath,
  resolveAuthReturnTo
} from '../src/index'

const allowedOrigins = [
  'https://vpn.labafero.com',
  'https://vpn-monitor.labafero.com',
  'https://vpn-news.labafero.com'
]

describe('resolveAuthReturnTo', () => {
  test('accepts a URL whose origin is explicitly allowed', () => {
    expect(
      resolveAuthReturnTo(
        'https://vpn-monitor.labafero.com/conexao?tab=clips',
        allowedOrigins,
        'https://vpn.labafero.com/'
      )
    ).toBe('https://vpn-monitor.labafero.com/conexao?tab=clips')
  })

  test('rejects unapproved origins, authority paths, userinfo, schemes, backslashes, and fragments', () => {
    const candidates = [
      'https://attacker.example/path',
      '//attacker.example/path',
      'https://vpn.labafero.com@attacker.example/path',
      'https://user:password@vpn.labafero.com/path',
      'javascript:alert(1)',
      'https://vpn.labafero.com\\@attacker.example/path',
      'https://vpn.labafero.com/path#section'
    ]

    for (const candidate of candidates) {
      expect(resolveAuthReturnTo(candidate, allowedOrigins, 'https://vpn.labafero.com/')).toBe(
        'https://vpn.labafero.com/'
      )
    }
  })

  test('uses the fallback for missing targets and fragments, including an empty fragment marker', () => {
    expect(resolveAuthReturnTo(undefined, allowedOrigins, 'https://vpn.labafero.com/')).toBe(
      'https://vpn.labafero.com/'
    )
    expect(
      resolveAuthReturnTo('https://vpn.labafero.com/#', allowedOrigins, 'https://vpn.labafero.com/')
    ).toBe('https://vpn.labafero.com/')
  })
})

describe('buildAuthCallbackUrl', () => {
  test('builds an app callback without a hash or OAuth response parameters', () => {
    const callbackUrl = new URL(
      buildAuthCallbackUrl(
        'https://vpn-monitor.labafero.com/conexao?tab=clips&code=old&state=old#clips'
      )
    )

    expect(callbackUrl.origin).toBe('https://vpn-monitor.labafero.com')
    expect(callbackUrl.pathname).toBe('/auth/callback')
    expect(callbackUrl.searchParams.get('next')).toBe('/conexao?tab=clips')
    expect(callbackUrl.hash).toBe('')
    for (const key of [
      'code',
      'access_token',
      'refresh_token',
      'token_hash',
      'error',
      'error_description',
      'error_code',
      'state'
    ]) {
      expect(callbackUrl.searchParams.has(key)).toBe(false)
    }
  })

  test('accepts only local callback paths', () => {
    expect(resolveAuthCallbackPath('/auth/callback?next=%2Fconexao')).toBe(
      '/auth/callback?next=%2Fconexao'
    )
    expect(resolveAuthCallbackPath('https://attacker.example/auth/callback')).toBe('/auth/callback')
    expect(resolveAuthCallbackPath('//attacker.example/auth/callback')).toBe('/auth/callback')
  })
})

describe('buildAuthPortalUrl', () => {
  test('builds the central login URL and includes an error marker only when requested', () => {
    const returnTo = 'https://vpn-news.labafero.com/redacao?filtro=abertos&pagina=2'
    const loginUrl = new URL(buildAuthPortalUrl('https://vpn.labafero.com', returnTo))
    const errorUrl = new URL(
      buildAuthPortalUrl('https://vpn.labafero.com', returnTo, 'entrar', true)
    )
    const signupUrl = new URL(buildAuthPortalUrl('https://vpn.labafero.com', returnTo, 'cadastro'))

    expect(loginUrl.origin).toBe('https://vpn.labafero.com')
    expect(loginUrl.pathname).toBe('/entrar')
    expect(loginUrl.searchParams.get('return_to')).toBe(returnTo)
    expect(loginUrl.searchParams.has('auth_error')).toBe(false)
    expect(errorUrl.searchParams.get('auth_error')).toBe('1')
    expect(signupUrl.pathname).toBe('/cadastro')
  })
})
