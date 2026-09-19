export type HealthResponse = {
  status: "ok"
  service: "vpn-sentry"
}

export type CityConfig = {
  slug: string
  cidade_nome: string
  jornal_nome: string
  jornal_sigla: string
  cor_primaria: string
  logo_url: string | null
}

export type Post = {
  id: number
  title: string
  body: string
  cidade: string
  cover_url: string
  media_url: string | null
  media_type: string | null
  destaque: boolean
  published_at: string
}

export type ContractsApi = {
  "/health": {
    GET: { response: HealthResponse }
  }
  "/cities": {
    GET: { response: CityConfig[] }
  }
  "/posts": {
    GET: {
      query: { cidade?: string; limit?: number }
      response: Post[]
    }
  }
}
