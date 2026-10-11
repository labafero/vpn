export function useEditorialAccess() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  const authorized = ref(false)
  const loading = ref(false)

  async function refresh() {
    authorized.value = false
    if (!user.value?.sub) return false
    loading.value = true
    try {
      const { data, error } = await client.from('editorial_members').select('user_id').eq('user_id', user.value.sub).maybeSingle()
      if (error) throw error
      authorized.value = Boolean(data)
      return authorized.value
    } finally {
      loading.value = false
    }
  }

  return { authorized, loading, refresh }
}
