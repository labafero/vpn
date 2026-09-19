function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw createError({
      statusCode: 503,
      statusMessage: "Supabase do Sentry não está configurado",
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
