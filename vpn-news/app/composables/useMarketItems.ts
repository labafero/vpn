import type { Tables } from '~/types/database.types'
import { collectKeysetPages } from '~/utils/dbRecordCsv'

export type MarketItem = Tables<'market_items'>

export function useMarketItems() {
  const client = useSupabaseClient()
  const items = ref<MarketItem[]>([])
  async function fetchItems() {
    const rows = await collectKeysetPages(async (cursor, limit) => {
      const { data, error } = await client.from('market_items').select('*').gt('id', cursor).order('id').limit(limit)
      if (error) throw error
      return data ?? []
    })
    items.value = rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }
  async function findOrCreateItem(name: string): Promise<MarketItem> {
    const { data, error } = await client.rpc('find_or_create_market_item', { p_name: name })
    if (error) throw error
    if (!data) throw new Error('Não foi possível cadastrar o item')
    await fetchItems()
    return data
  }
  return { items, fetchItems, findOrCreateItem }
}
