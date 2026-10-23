import { describe, expect, test, vi } from 'vitest'
import { signInWithEmail, signUpWithEmail, startOAuth } from '../app/utils/auth-actions'

function createAuthClient(
  options: {
    oauthError?: unknown
    signInError?: unknown
    signUpError?: unknown
    signUpSession?: unknown | null
  } = {}
) {
  return {
    auth: {
      signInWithOAuth: vi.fn().mockResolvedValue({ error: options.oauthError ?? null }),
      signInWithPassword: vi.fn().mockResolvedValue({ error: options.signInError ?? null }),
      getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: { session: options.signUpSession ?? null },
        error: options.signUpError ?? null
      })
    }
  }
}

describe('central auth actions', () => {
  test('starts Discord and Twitch OAuth with the validated app callback URL', async () => {
    const client = createAuthClient()
    const callbackUrl = 'https://vpn-monitor.labafero.com/auth/callback?next=%2Fconexao'

    expect(await startOAuth(client, 'discord', callbackUrl)).toEqual({ ok: true })
    expect(await startOAuth(client, 'twitch', callbackUrl)).toEqual({ ok: true })
    expect(client.auth.signInWithOAuth).toHaveBeenNthCalledWith(1, {
      provider: 'discord',
      options: { redirectTo: callbackUrl }
    })
    expect(client.auth.signInWithOAuth).toHaveBeenNthCalledWith(2, {
      provider: 'twitch',
      options: { redirectTo: callbackUrl }
    })
  })

  test('returns a generic failure for provider and password sign-in errors', async () => {
    const client = createAuthClient({
      oauthError: new Error('private provider detail'),
      signInError: new Error('private auth detail')
    })

    expect(await startOAuth(client, 'discord', 'https://vpn.labafero.com/auth/callback')).toEqual({
      ok: false
    })
    expect(
      await signInWithEmail(client, { email: 'pessoa@example.com', password: 'senha-segura' })
    ).toEqual({
      ok: false
    })
  })

  test('verifies the new password session before returning success', async () => {
    const client = createAuthClient()

    expect(
      await signInWithEmail(client, { email: 'pessoa@example.com', password: 'senha-segura' })
    ).toEqual({
      ok: true
    })
    expect(client.auth.getClaims).toHaveBeenCalledOnce()
  })

  test('sends signup confirmation to the callback and distinguishes immediate session from email confirmation', async () => {
    const callbackUrl = 'https://vpn-news.labafero.com/auth/callback?next=%2Fredacao'
    const immediateClient = createAuthClient({ signUpSession: { user: { id: 'user-1' } } })
    const pendingClient = createAuthClient()
    const credentials = { email: 'pessoa@example.com', password: 'senha-segura' }

    expect(await signUpWithEmail(immediateClient, credentials, callbackUrl)).toEqual({
      ok: true,
      hasSession: true
    })
    expect(await signUpWithEmail(pendingClient, credentials, callbackUrl)).toEqual({
      ok: true,
      hasSession: false
    })
    expect(immediateClient.auth.signUp).toHaveBeenCalledWith({
      ...credentials,
      options: { emailRedirectTo: callbackUrl }
    })
  })

  test('does not expose raw signup errors', async () => {
    const client = createAuthClient({ signUpError: new Error('email already registered') })

    expect(
      await signUpWithEmail(
        client,
        { email: 'pessoa@example.com', password: 'senha-segura' },
        'https://vpn.labafero.com/auth/callback'
      )
    ).toEqual({ ok: false, hasSession: false })
  })
})
