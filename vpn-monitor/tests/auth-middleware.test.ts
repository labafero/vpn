import { beforeEach, expect, test, vi } from 'vitest'
let result: { data: { claims: { sub: string; is_anonymous?: boolean } | null }; error: unknown }
let ready: Promise<void>
vi.stubGlobal('defineNuxtRouteMiddleware', (handler: unknown) => handler)
vi.stubGlobal('useSupabaseUser', () => ({ value: null }))
vi.stubGlobal('useSupabaseClient', () => ({
  auth: {
    getClaims: async () => {
      await ready
      return result
    }
  }
}))
vi.stubGlobal('navigateTo', (path: string) => path)
const { default: middleware } = await import('../app/middleware/auth')
beforeEach(() => {
  result = { data: { claims: { sub: 'verified-user' } }, error: null }
  ready = Promise.resolve()
})
test('navigation waits for verified claims when reactive user is still empty after login', async () => {
  let release!: () => void
  ready = new Promise((resolve) => {
    release = resolve
  })
  const pending = middleware({} as never, {} as never)
  release()
  expect(await pending).toBeUndefined()
})
test('missing or invalid claims return to login', async () => {
  result = { data: { claims: null }, error: new Error('invalid session') }
  expect(await middleware({} as never, {} as never)).toBe('/login')
})
test('anonymous claims do not open the private interface', async () => {
  result.data.claims!.is_anonymous = true
  expect(await middleware({} as never, {} as never)).toBe('/login')
})
