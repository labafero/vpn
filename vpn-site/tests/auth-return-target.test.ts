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
    const allowedOrigins = ['http://127.0.0.1:3001', 'http://127.0.0.1:3003']

    expect(resolveAuthReturnTarget('https://attacker.example/path', allowedOrigins)).toBe(
      'https://vpn.labafero.com/'
    )
    expect(resolveAuthReturnTarget('//attacker.example/path', allowedOrigins)).toBe(
      'https://vpn.labafero.com/'
    )
    expect(resolveAuthReturnTarget(undefined, allowedOrigins)).toBe('https://vpn.labafero.com/')
  })
})
