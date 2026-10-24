export function useEditorialAccess() {
  const client = useSupabaseClient()
  const authorized = ref(false)
  const loading = ref(false)

  async function refresh() {
    authorized.value = false
    const { data, error: claimsError } = await client.auth.getClaims()
    const userId = data?.claims?.sub
    if (claimsError || !userId || data?.claims?.is_anonymous) return false
    loading.value = true
    try {
      const { data, error } = await client
        .from('editorial_members')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      authorized.value = Boolean(data)
      return authorized.value
    } finally {
      loading.value = false
    }
  }

  return { authorized, loading, refresh }
}
