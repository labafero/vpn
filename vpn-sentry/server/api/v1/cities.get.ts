import type { CityConfig } from "@vpn/contracts"
import { querySupabase } from "../../utils/supabase-rest"

export default defineEventHandler(async (): Promise<CityConfig[]> => {
  const { data } = await querySupabase<CityConfig[]>("city_config", {
    select: "slug,cidade_nome,jornal_nome,jornal_sigla,cor_primaria,logo_url",
    order: "cidade_nome.asc",
  })

  return data
})
