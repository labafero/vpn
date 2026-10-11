import type { Database } from '~/types/database.types'
import { createPollingResource } from '~/utils/pollingResource'

type Stock = Database['public']['Functions']['get_overlay_market_values']['Returns'][number]
export function useOverlayStocks(broadcasterId: Ref<string>, cidade: Ref<string | undefined>) {
  const client = useSupabaseClient()
  const stocks = ref<Stock[]>([])
  const loading = ref(false)
  const error = ref(false)
  const resource = createPollingResource<Stock>(async context => {
    loading.value = true
    const [owner, city] = JSON.parse(context) as [string, string | null]
    const { data, error: queryError } = await client.rpc('get_overlay_market_values', { p_broadcaster_id: owner, p_cidade: city ?? undefined })
    if (queryError) throw queryError
    return data ?? []
  }, rows => { stocks.value = rows; loading.value = false; error.value = false }, () => { loading.value = false; error.value = true })
  onMounted(() => {
    watch([broadcasterId, cidade], ([owner, city]) => {
      resource.setContext(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(owner) ? JSON.stringify([owner, city ?? null]) : '')
    }, { immediate: true })
  })
  onUnmounted(resource.dispose)
  return { stocks, loading, error, refresh: resource.refresh }
}
