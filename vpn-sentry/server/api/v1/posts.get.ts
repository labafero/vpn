import type { Post } from "@vpn/contracts"
import { querySupabase } from "../../utils/supabase-rest"

export default defineEventHandler(async (event): Promise<Post[]> => {
  const query = getQuery(event)
  const cidade = typeof query.cidade === "string" ? query.cidade.trim() : ""
  const requestedLimit = Number(query.limit ?? 50)
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50

  const params: Record<string, string> = {
    select: "id,title,body,cidade,cover_url,media_url,media_type,destaque,published_at",
    published_at: "not.is.null",
    order: "published_at.desc",
    limit: String(limit),
  }

  if (cidade) params.cidade = `eq.${cidade}`

  const { data } = await querySupabase<Post[]>("posts", params)
  return data
})
