<script setup lang="ts">
import type { MarketValue } from '~/composables/useMarketValues'
import { formatMarketAmount, historyDirections } from '~/utils/marketValues'

definePageMeta({ middleware: ['auth', 'editorial'] })
const route = useRoute()
const { all: cities, fetchAll } = useCidadeConfig()
const { items, fetchItems } = useMarketItems()
const { fetchLatest, fetchHistory, fetchPreceding } = useMarketValues()
const latest = ref<Awaited<ReturnType<typeof fetchLatest>>>([])
const city = ref('')
const itemId = ref(0)
const period = ref('30')
const page = ref(1)
const history = ref<MarketValue[]>([])
const preceding = ref<MarketValue | null>(null)
const loading = ref(true)
const error = ref('')
let generation = 0
let optionsReady = false
const cityOptions = computed(() => cities.value.map(c => ({ label: c.cidade_nome, value: c.slug })))
const itemOptions = computed(() => items.value.map(i => ({ label: i.name, value: i.id })))
const chartSeries = computed(() => [...history.value].reverse().map(r => ({ at: r.created_at, cents: Math.round(r.amount * 100) })))
const directions = computed(() => historyDirections(history.value, preceding.value))
const rows = computed(() => history.value.slice((page.value - 1) * 25, page.value * 25).map((r, i) => ({
  ...r, date: new Date(r.created_at).toLocaleString('pt-BR'), price: formatMarketAmount(r.amount),
  trend: ({ up: '▲ Alta', down: '▼ Baixa', stable: '— Estável' })[directions.value[(page.value - 1) * 25 + i]!]
})))
const columns = [{ accessorKey: 'date', header: 'Data' }, { accessorKey: 'price', header: 'Valor' }, { accessorKey: 'trend', header: 'Variação no período' }]
async function refresh() {
  const request = ++generation
  loading.value = true
  error.value = ''
  history.value = []
  preceding.value = null
  page.value = 1
  const filters = { cidade: city.value, itemId: itemId.value, from: period.value === 'all' ? undefined : new Date(Date.now() - Number(period.value) * 86400000).toISOString() }
  try {
    const recent = await fetchLatest({ cidade: filters.cidade || undefined })
    const values: MarketValue[] = []
    if (filters.cidade && filters.itemId) {
      let nextPage = 1
      let total = 1
      while (values.length < total) {
        const result = await fetchHistory({ ...filters, page: nextPage++ })
        if (request !== generation) return
        total = result.total
        if (!result.rows.length) break
        values.push(...result.rows)
      }
    }
    const before = values.length ? await fetchPreceding(values[values.length - 1]!) : null
    if (request !== generation) return
    latest.value = recent
    history.value = values
    preceding.value = before
  } catch { if (request === generation) error.value = 'Não foi possível carregar os valores. Tente novamente.' }
  finally { if (request === generation) loading.value = false }
}
async function initialize() {
  try {
    await Promise.all([fetchAll(), fetchItems()])
    optionsReady = true
    city.value = cities.value.find(c => c.slug === route.query.cidade)?.slug ?? cities.value[0]?.slug ?? ''
    itemId.value = items.value.find(i => i.id === Number(route.query.item))?.id ?? items.value[0]?.id ?? 0
    await refresh()
  } catch { error.value = 'Não foi possível carregar cidades e itens'; loading.value = false }
}
onMounted(initialize)
function retry() { return optionsReady ? refresh() : initialize() }
watch([city, itemId, period], refresh)
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Valores de mercado"><template #right><UButton icon="i-lucide-plus" to="/redacao/valores/novo">Registrar valor</UButton></template></UDashboardNavbar></template>
    <template #body>
      <div class="p-4 space-y-5">
        <UAlert v-if="error" color="error" :description="error"><template #actions><UButton @click="retry">Tentar novamente</UButton></template></UAlert>
        <div class="flex flex-wrap gap-3">
          <UFormField label="Cidade"><USelect v-model="city" :items="cityOptions" placeholder="Cidade" class="min-w-40" /></UFormField>
          <UFormField label="Item"><USelectMenu v-model="itemId" aria-label="Item" :items="itemOptions" value-key="value" class="min-w-48" /></UFormField>
          <UFormField label="Período"><USelect v-model="period" :items="[{ label: '7 dias', value: '7' }, { label: '30 dias', value: '30' }, { label: '90 dias', value: '90' }, { label: 'Todo o histórico', value: 'all' }]" /></UFormField>
        </div>
        <USkeleton v-if="loading" class="h-56" />
        <template v-else>
          <UCard><template #header><h2 class="font-semibold">Últimos valores da cidade</h2></template>
            <p v-if="!latest.length" class="text-muted">Nenhum valor cadastrado. Registre o primeiro valor.</p>
            <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><div v-for="entry in latest" :key="entry.id!" class="rounded border border-default p-3"><p class="text-muted">{{ items.find(i => i.id === entry.item_id)?.name }}</p><p class="text-xl font-semibold">{{ formatMarketAmount(entry.amount!) }}</p></div></div>
          </UCard>
          <UCard><template #header><h2 class="font-semibold">Evolução do item selecionado</h2></template><MarketHistoryChart :series="chartSeries" /></UCard>
          <UCard><UTable :data="rows" :columns="columns" /><UPagination v-model:page="page" :total="history.length" :items-per-page="25" class="mt-4" /></UCard>
        </template>
      </div>
    </template>
  </UDashboardPanel>
</template>


