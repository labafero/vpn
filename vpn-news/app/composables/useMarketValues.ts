import type { Tables } from '~/types/database.types'
import { parseAmountToCents, amountToDecimal } from '~/utils/marketValues'

export type MarketValue = Tables<'market_values'>

export function useMarketValues() {
  const client = useSupabaseClient()
  const user = useSupabaseUser()
  function owner() {
    if (!user.value?.sub) throw new Error('Entre novamente para continuar')
    return user.value.sub
  }
  async function save(input: { cidade: string; itemId: number; amount: string }): Promise<MarketValue> {
    const { data, error } = await client.from('market_values').insert({
      user_id: owner(), cidade: input.cidade, item_id: input.itemId,
      amount: Number(amountToDecimal(parseAmountToCents(input.amount)))
    }).select().single()
    if (error) throw error
    return data
  }
  async function fetchLatest(filters: { cidade?: string } = {}) {
    let query = client.from('market_values_latest').select('*').eq('user_id', owner()).order('created_at', { ascending: false }).order('id', { ascending: false })
    if (filters.cidade) query = query.eq('cidade', filters.cidade)
    const { data, error } = await query
    if (error) throw error
    return data ?? []
  }
  async function fetchHistory(filters: { cidade: string; itemId: number; from?: string; page: number }): Promise<{ rows: MarketValue[]; total: number }> {
    let query = client.from('market_values').select('*', { count: 'exact' }).eq('user_id', owner()).eq('cidade', filters.cidade).eq('item_id', filters.itemId)
    if (filters.from) query = query.gte('created_at', filters.from)
    const { data, error, count } = await query.order('created_at', { ascending: false }).order('id', { ascending: false }).range((filters.page - 1) * 25, filters.page * 25 - 1)
    if (error) throw error
    return { rows: data ?? [], total: count ?? 0 }
  }
  return { save, fetchLatest, fetchHistory }
}
