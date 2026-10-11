<script setup lang="ts">
import { TYPE_LABELS, TYPE_COLORS, type DbRecord, type DbRecordType } from '~/composables/useDbRecords'
import { createLatestLoader } from '~/utils/dbRecordQuery'

definePageMeta({ middleware: ['auth', 'editorial'] })
const { fetchPage, remove } = useDbRecords()
const { all: cidades, fetchAll: fetchCities } = useCidadeConfig()
const { exporting, progress, cancel, exportRecords, exportNotes, exportRelations } = useDbRecordExport()
const toast = useToast()
const records = ref<DbRecord[]>([])
const total = ref(0)
const loading = ref(true)
const error = ref('')
const search = ref('')
const ALL = '__all__'
const filterType = ref<DbRecordType | typeof ALL>(ALL)
const filterCidade = ref(ALL)
const sort = ref<'nome' | 'updated_at'>('updated_at')
const ascending = ref(false)
const page = ref(1)
const deleteId = ref<number | null>(null)
const deleting = ref(false)
const deleteOpen = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
const filters = computed(() => ({ type: filterType.value === ALL ? undefined : filterType.value, cidade: filterCidade.value === ALL ? undefined : filterCidade.value, search: search.value || undefined }))
const typeOptions = [{ label: 'Todos os tipos', value: ALL }, ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value }))]
const cityOptions = computed(() => [{ label: 'Todas as cidades', value: ALL }, ...cidades.value.map(c => ({ label: c.cidade_nome, value: c.slug }))])
const columns = [{ accessorKey: 'nome', header: 'Nome' }, { accessorKey: 'type', header: 'Tipo' }, { accessorKey: 'cidade', header: 'Cidade' }, { accessorKey: 'updated_at', header: 'Atualizado em' }, { id: 'actions', header: 'Ações' }]
const load = createLatestLoader<{ rows: DbRecord[]; total: number; error: string }>(result => {
  records.value = result.rows; total.value = result.total; error.value = result.error; loading.value = false
})
async function refresh() {
  loading.value = true
  const current = { ...filters.value, sort: sort.value, ascending: ascending.value, page: page.value }
  await load(async () => {
    try { return { ...await fetchPage(current), error: '' } }
    catch { return { rows: [], total: 0, error: 'Não foi possível consultar os registros. Confira seu acesso e tente novamente.' } }
  })
}
watch([search, filterType, filterCidade, sort, ascending], () => {
  clearTimeout(timer)
  page.value = 1
  timer = setTimeout(refresh, 300)
})
watch(page, refresh)
onMounted(async () => { try { await fetchCities(); await refresh() } catch { error.value = 'Não foi possível carregar as cidades'; loading.value = false } })
onUnmounted(() => clearTimeout(timer))
async function handleDelete() {
  if (!deleteId.value || deleting.value) return
  deleting.value = true
  try { await remove(deleteId.value); deleteOpen.value = false; await refresh(); toast.add({ title: 'Registro removido', color: 'success' }) }
  catch { toast.add({ title: 'Não foi possível remover o registro', color: 'error' }) }
  finally { deleting.value = false }
}
async function exportData(kind: 'records' | 'notes' | 'relations') {
  try { await ({ records: exportRecords, notes: exportNotes, relations: exportRelations })[kind](filters.value) }
  catch { toast.add({ title: 'Exportação interrompida', description: 'Nenhum arquivo parcial foi baixado. Confira sua autorização e tente novamente.', color: 'error' }) }
}
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Base de Dados"><template #right>
      <UDropdownMenu :items="[{ label: 'Registros (CSV)', onSelect: () => exportData('records') }, { label: 'Notas (CSV)', onSelect: () => exportData('notes') }, { label: 'Relacionamentos (CSV)', onSelect: () => exportData('relations') }]">
        <UButton variant="outline" icon="i-lucide-download" :disabled="exporting">Exportar</UButton>
      </UDropdownMenu><UButton to="/redacao/base/novo" icon="i-lucide-plus">Novo registro</UButton>
    </template></UDashboardNavbar></template>
    <template #body><div class="p-4 space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Buscar nome"><UInput v-model="search" placeholder="Buscar por nome" icon="i-lucide-search" /></UFormField>
        <UFormField label="Tipo"><USelect v-model="filterType" :items="typeOptions" /></UFormField>
        <UFormField label="Cidade"><USelect v-model="filterCidade" :items="cityOptions" /></UFormField>
        <UFormField label="Ordenar por"><USelect v-model="sort" :items="[{ label: 'Atualização', value: 'updated_at' }, { label: 'Nome', value: 'nome' }]" /></UFormField>
        <UCheckbox v-model="ascending" label="Ordem crescente" />
      </div>
      <UAlert v-if="error" color="error" :description="error"><template #actions><UButton @click="refresh">Tentar novamente</UButton></template></UAlert>
      <div v-if="exporting" role="status" class="flex items-center gap-3"><span>Preparando exportação: {{ progress }} registros</span><UButton variant="outline" @click="cancel">Cancelar</UButton></div>
      <UCard>
        <UTable :data="records" :columns="columns" :loading="loading">
          <template #nome-cell="{ row }"><NuxtLink :to="`/redacao/base/${row.original.id}`" class="font-medium text-primary underline">{{ row.original.nome }}</NuxtLink></template>
          <template #type-cell="{ row }"><UBadge :color="TYPE_COLORS[row.original.type]">{{ TYPE_LABELS[row.original.type] }}</UBadge></template>
          <template #cidade-cell="{ row }">{{ cidades.find(c => c.slug === row.original.cidade)?.cidade_nome ?? '—' }}</template>
          <template #updated_at-cell="{ row }">{{ new Date(row.original.updated_at).toLocaleString('pt-BR') }}</template>
          <template #actions-cell="{ row }"><div class="flex gap-2"><UButton :to="`/redacao/base/${row.original.id}`" variant="ghost" icon="i-lucide-pencil" aria-label="Editar registro" /><UButton variant="ghost" color="error" icon="i-lucide-trash-2" aria-label="Remover registro" @click="deleteId = row.original.id; deleteOpen = true" /></div></template>
          <template #empty>Nenhum registro encontrado.</template>
        </UTable>
        <UPagination v-model:page="page" :items-per-page="25" :total="total" class="mt-4" />
      </UCard>
    </div></template>
  </UDashboardPanel>
  <UModal v-model:open="deleteOpen" title="Remover registro" description="O registro, suas notas e seus vínculos serão removidos. Os outros registros relacionados serão preservados.">
    <template #footer><UButton variant="outline" :disabled="deleting" @click="deleteOpen = false">Cancelar</UButton><UButton color="error" :loading="deleting" :disabled="deleting" @click="handleDelete">Remover</UButton></template>
  </UModal>
</template>
