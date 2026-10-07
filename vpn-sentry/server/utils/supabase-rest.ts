function getSupabaseConfig() {
  const url = process.env.NUXT_PUBLIC_SUPABASE_URL
  const key = process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!url || !key) {
    throw createError({
      statusCode: 503,
      statusMessage: "NUXT_PUBLIC_SUPABASE_URL e NUXT_PUBLIC_SUPABASE_KEY são obrigatórias no Sentry",
    })
  }

  return { url: url.replace(/\/$/, ""), key }
}

export async function querySupabase<T>(resource: string, params: Record<string, string>): Promise<{ data: T }> {
  const { url, key } = getSupabaseConfig()
  const endpoint = new URL(`/rest/v1/${resource}`, url)

  for (const [name, value] of Object.entries(params)) endpoint.searchParams.set(name, value)

  const response = await fetch(endpoint.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `Supabase respondeu ${response.status}`,
    })
  }

  return { data: (await response.json()) as T }
}
