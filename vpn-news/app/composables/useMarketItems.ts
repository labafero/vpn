import type { Tables } from '~/types/database.types'

export type MarketItem = Tables<'market_items'>

export function useMarketItems() {
  const client = useSupabaseClient()
  const items = ref<MarketItem[]>([])
  async function fetchItems() {
    const { data, error } = await client.from('market_items').select('*').order('name')
    if (error) throw error
    items.value = data ?? []
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
