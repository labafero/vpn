import { describe, expect, test, vi } from 'vitest'
import { completeAuthCallback } from '../src/index'

describe('completeAuthCallback', () => {
  test('exchanges the PKCE code once and preserves a local path and query', async () => {
    const exchange = vi.fn(async () => ({ error: null }))

    await expect(
      completeAuthCallback(exchange, 'pkce-code', '/conexao?tab=clips')
    ).resolves.toEqual({
      ok: true,
      destination: '/conexao?tab=clips'
    })
    expect(exchange).toHaveBeenCalledExactlyOnceWith('pkce-code')
  })

  test('does not exchange a missing code and keeps only a local destination', async () => {
    const exchange = vi.fn(async () => ({ error: null }))

    await expect(completeAuthCallback(exchange, null, '/redacao')).resolves.toEqual({
      ok: false,
      destination: '/redacao'
    })
    expect(exchange).not.toHaveBeenCalled()
  })

  test('returns a generic failure and safe path when the code exchange fails', async () => {
    const exchange = vi.fn(async () => ({ error: new Error('provider response details') }))

    await expect(completeAuthCallback(exchange, 'bad-code', '//evil.example')).resolves.toEqual({
      ok: false,
      destination: '/'
    })
    expect(exchange).toHaveBeenCalledExactlyOnceWith('bad-code')
  })

  test('handles a rejected exchange without exposing the thrown error', async () => {
    const exchange = vi.fn(async () => {
      throw new Error('private provider response')
    })

    await expect(completeAuthCallback(exchange, 'bad-code', '/conexao?tab=clips')).resolves.toEqual(
      { ok: false, destination: '/conexao?tab=clips' }
    )
  })
})
