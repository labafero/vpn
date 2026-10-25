import { beforeEach, expect, test, vi } from 'vitest'

let result: { data: { claims: { sub: string; is_anonymous?: boolean } | null }; error: unknown }
let ready: Promise<void>
const navigate = vi.fn((url: string) => url)
vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
vi.stubGlobal('useSupabaseUser', () => ({ value: null }))
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    vpnAuthUrl: 'https://vpn.labafero.com',
    vpnAppUrls: { monitor: 'https://vpn-monitor.labafero.com' }
  }
}))
vi.stubGlobal('useSupabaseClient', () => ({
  auth: {
    getClaims: async () => {
      await ready
      return result
    }
  }
}))
vi.stubGlobal('navigateTo', navigate)
const { default: middleware } = await import('../app/middleware/auth')

beforeEach(() => {
  result = { data: { claims: { sub: 'verified-user' } }, error: null }
  ready = Promise.resolve()
  navigate.mockClear()
})

test('navigation waits for verified claims when reactive user is still empty after sign-in', async () => {
  let release!: () => void
  ready = new Promise((resolve) => {
    release = resolve
  })
  const pending = middleware({ fullPath: '/conexao?tab=clips' } as never, {} as never)
  release()
  expect(await pending).toBeUndefined()
})

test('missing claims return to central sign-in with the full local route and query', async () => {
  result = { data: { claims: null }, error: new Error('invalid session') }
  const url = String(
    await middleware({ fullPath: '/sessoes/session-1?tab=clips' } as never, {} as never)
  )
  const redirect = new URL(url)

  expect(redirect.origin).toBe('https://vpn.labafero.com')
  expect(redirect.pathname).toBe('/entrar')
  expect(redirect.searchParams.get('return_to')).toBe(
    'https://vpn-monitor.labafero.com/sessoes/session-1?tab=clips'
  )
  expect(navigate).toHaveBeenCalledWith(url, { external: true })
})

test('anonymous claims do not open the private interface', async () => {
  result.data.claims!.is_anonymous = true
  const url = String(await middleware({ fullPath: '/conexao' } as never, {} as never))
  expect(new URL(url).searchParams.get('return_to')).toBe(
    'https://vpn-monitor.labafero.com/conexao'
  )
})
