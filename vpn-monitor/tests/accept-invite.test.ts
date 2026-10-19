import { beforeEach, expect, test, vi } from 'vitest'

const stored = new Map<string, string>()
const replaceState = vi.fn()
const navigate = vi.fn((url: string) => url)
let inviteHash = '#token=invite-secret'
vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
vi.stubGlobal('useSupabaseUser', () => ({ value: null }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { vpnAuthUrl: 'https://vpn.labafero.com' } }))
vi.stubGlobal('useRequestURL', () => new URL('https://vpn-monitor.labafero.com/convites/aceitar'))
vi.stubGlobal('navigateTo', navigate)
vi.stubGlobal('sessionStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => stored.set(key, value),
  removeItem: (key: string) => stored.delete(key)
})
vi.stubGlobal('window', {
  location: {
    get hash() {
      return inviteHash
    },
    pathname: '/convites/aceitar',
    search: '?source=email'
  },
  history: { state: { page: 1 }, replaceState }
})
const { default: middleware } = await import('../app/middleware/accept-invite')

beforeEach(() => {
  stored.clear()
  replaceState.mockClear()
  navigate.mockClear()
  inviteHash = '#token=invite-secret'
})

test('stores the invite token only in session storage and returns through the central portal', async () => {
  const url = String(
    await middleware({ fullPath: '/convites/aceitar?source=email' } as never, {} as never)
  )
  const redirect = new URL(url)

  expect(stored.get('vpn-pending-invite')).toBe('invite-secret')
  expect(replaceState).toHaveBeenCalledWith({ page: 1 }, '', '/convites/aceitar?source=email')
  expect(redirect.searchParams.get('return_to')).toBe(
    'https://vpn-monitor.labafero.com/convites/aceitar?source=email'
  )
  expect(url).not.toContain('invite-secret')
  expect(navigate).toHaveBeenCalledWith(url, { external: true })
})
