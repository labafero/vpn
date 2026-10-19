import { beforeEach, expect, test, vi } from 'vitest'

let user: { id: string } | null = null
let hasEditorialAccess = false
const navigate = vi.fn((url: string) => url)
vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
vi.stubGlobal('useSupabaseUser', () => ({ value: user }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { vpnAuthUrl: 'https://vpn.labafero.com' } }))
vi.stubGlobal('useRequestURL', () => new URL('https://vpn-news.labafero.com/redacao'))
vi.stubGlobal('useEditorialAccess', () => ({ refresh: async () => hasEditorialAccess }))
vi.stubGlobal('navigateTo', navigate)
vi.stubGlobal('createError', (options: { statusCode: number; statusMessage: string }) =>
  Object.assign(new Error(options.statusMessage), options)
)
const { default: authMiddleware } = await import('../app/middleware/auth')
const { default: editorialMiddleware } = await import('../app/middleware/editorial')

beforeEach(() => {
  user = null
  hasEditorialAccess = false
  navigate.mockClear()
})

test('anonymous requests return to central sign-in with their route and query', async () => {
  const url = String(
    await authMiddleware({ fullPath: '/redacao/novo?cidade=vilavelha' } as never, {} as never)
  )
  const redirect = new URL(url)

  expect(redirect.origin).toBe('https://vpn.labafero.com')
  expect(redirect.pathname).toBe('/entrar')
  expect(redirect.searchParams.get('return_to')).toBe(
    'https://vpn-news.labafero.com/redacao/novo?cidade=vilavelha'
  )
  expect(navigate).toHaveBeenCalledWith(url, { external: true })
})

test('an authenticated user without editorial membership still receives 403', async () => {
  user = { id: 'regular-user' }
  hasEditorialAccess = false

  await expect(editorialMiddleware({} as never, {} as never)).rejects.toMatchObject({
    statusCode: 403,
    statusMessage: 'Acesso restrito à equipe autorizada da redação'
  })
  expect(navigate).not.toHaveBeenCalled()
})

test('an editorial member passes the editorial gate', async () => {
  user = { id: 'editor-user' }
  hasEditorialAccess = true

  await expect(editorialMiddleware({} as never, {} as never)).resolves.toBeUndefined()
})
