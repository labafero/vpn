import { describe, expect, test } from 'vitest'
import { resolveAuthReturnTarget } from '../app/utils/auth-actions'

describe('auth return target endpoint policy', () => {
  test('preserves a configured app URL and route', () => {
    expect(
      resolveAuthReturnTarget('https://vpn-monitor.labafero.com/conexao?tab=clips', [
        'https://vpn-monitor.labafero.com'
      ])
    ).toBe('https://vpn-monitor.labafero.com/conexao?tab=clips')
  })

  test('uses the central portal fallback for external and protocol-relative URLs', () => {
    const allowedOrigins = ['http://localhost:3001', 'http://localhost:3002']

    expect(resolveAuthReturnTarget('https://attacker.example/path', allowedOrigins)).toBe(
      'https://vpn.labafero.com/'
    )
    expect(resolveAuthReturnTarget('//attacker.example/path', allowedOrigins)).toBe(
      'https://vpn.labafero.com/'
    )
    expect(resolveAuthReturnTarget(undefined, allowedOrigins)).toBe('https://vpn.labafero.com/')
  })

  test('returns to the current allowed environment when the portal was opened directly', () => {
    const currentOrigin = 'http://localhost:3000'
    const allowedOrigins = [currentOrigin, 'http://localhost:3002']

    expect(resolveAuthReturnTarget(undefined, allowedOrigins, currentOrigin)).toBe(
      `${currentOrigin}/`
    )
    expect(
      resolveAuthReturnTarget('https://attacker.example/path', allowedOrigins, currentOrigin)
    ).toBe(`${currentOrigin}/`)
  })

  test('does not use a current origin until it is explicitly allowed', () => {
    expect(
      resolveAuthReturnTarget(undefined, ['http://localhost:3002'], 'http://localhost:3000')
    ).toBe('https://vpn.labafero.com/')
  })
})
