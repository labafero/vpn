import { beforeEach, expect, test, vi } from 'vitest'

let claims: { sub: string } | null = { sub: 'editor-user' }
let user: null | { sub: string } = null
const eq = vi.fn(() => ({
  maybeSingle: async () => ({ data: { user_id: 'editor-user' }, error: null })
}))
const from = vi.fn(() => ({ select: vi.fn(() => ({ eq })) }))

vi.stubGlobal('useSupabaseClient', () => ({
  auth: { getClaims: async () => ({ data: { claims }, error: null }) },
  from
}))
vi.stubGlobal('useSupabaseUser', () => ({ value: user }))
vi.stubGlobal('ref', <T>(value: T) => ({ value }))

const { useEditorialAccess } = await import('../app/composables/useEditorialAccess')

beforeEach(() => {
  claims = { sub: 'editor-user' }
  user = null
  from.mockClear()
  eq.mockClear()
})

test('refresh uses verified claims while reactive user is still empty', async () => {
  const access = useEditorialAccess()

  await expect(access.refresh()).resolves.toBe(true)
  expect(eq).toHaveBeenCalledWith('user_id', 'editor-user')
})
