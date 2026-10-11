<script setup lang="ts">
import type { DbRecordRelation } from '~/composables/useDbRecordRelations'

const props = defineProps<{ recordId: number }>()
const { fetchRelations, addRelation, removeRelation } = useDbRecordRelations()
const { fetchPage, fetchOne } = useDbRecords()
const links = ref<DbRecordRelation[]>([])
const names = ref<Record<number, string>>({})
const options = ref<{ label: string; value: number }[]>([])
const search = ref('')
const target = ref<number>()
const kind = ref('trabalha em')
const busy = ref(false)
const error = ref('')
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined
async function searchTargets() {
  const request = ++generation
  try {
    const result = await fetchPage({ search: search.value, sort: 'nome', ascending: true, page: 1 })
    if (request === generation) options.value = result.rows.filter(r => r.id !== props.recordId).map(r => ({ label: r.nome, value: r.id }))
  } catch { if (request === generation) error.value = 'Não foi possível buscar registros' }
}
async function refresh() {
  try {
    links.value = await fetchRelations(props.recordId)
    const ids = [...new Set(links.value.flatMap(l => [l.source_id, l.target_id]))]
    const records = await Promise.all(ids.map(fetchOne))
    names.value = Object.fromEntries(records.map(r => [r.id, r.nome]))
  } catch { error.value = 'Não foi possível carregar os relacionamentos' }
}
onMounted(async () => { await Promise.all([refresh(), searchTargets()]) })
watch(search, () => { clearTimeout(timer); timer = setTimeout(searchTargets, 300) })
onUnmounted(() => { generation++; clearTimeout(timer) })
async function add() {
  if (busy.value || !target.value) return
  busy.value = true
  error.value = ''
  try { await addRelation({ sourceId: props.recordId, targetId: target.value, kind: kind.value }); target.value = undefined; await refresh() }
  catch { error.value = 'Não foi possível criar o vínculo. Confira os registros e evite duplicações.' }
  finally { busy.value = false }
}
const removeId = ref<number | null>(null)
const removeOpen = ref(false)
async function remove() {
  if (!removeId.value || busy.value) return
  busy.value = true
  try { await removeRelation(removeId.value); removeOpen.value = false; await refresh() }
  catch { error.value = 'Não foi possível remover o vínculo' }
  finally { busy.value = false }
}
</script>

<template>
  <UCard><template #header><h2 class="font-semibold">Relacionamentos</h2></template>
    <div class="space-y-4">
      <UAlert v-if="error" color="error" :description="error" />
      <p v-if="!links.length" class="text-muted">Nenhum relacionamento cadastrado.</p>
      <div v-for="link in links" :key="link.id" class="flex items-center gap-2">
        <NuxtLink :to="`/redacao/base/${link.source_id}`" class="text-primary underline">{{ names[link.source_id] ?? link.source_id }}</NuxtLink>
        <span>{{ link.kind }} →</span>
        <NuxtLink :to="`/redacao/base/${link.target_id}`" class="text-primary underline">{{ names[link.target_id] ?? link.target_id }}</NuxtLink>
        <UButton variant="ghost" color="error" icon="i-lucide-unlink" aria-label="Remover relacionamento" @click="removeId = link.id; removeOpen = true" />
      </div>
      <UFormField label="Registro relacionado"><USelectMenu v-model="target" v-model:search-term="search" aria-label="Registro relacionado" :items="options" value-key="value" :ignore-filter="true" placeholder="Buscar por nome" class="w-full" /></UFormField>
      <UFormField label="Relação"><UInput v-model="kind" :maxlength="50" placeholder="Ex.: trabalha em" class="w-full" /></UFormField>
      <UButton :disabled="!target || !kind.trim() || busy" :loading="busy" @click="add">Adicionar relacionamento</UButton>
    </div>
  </UCard>
  <UModal v-model:open="removeOpen" title="Remover relacionamento" description="Apenas o vínculo será removido; os registros serão preservados."><template #footer><UButton variant="outline" @click="removeOpen = false">Cancelar</UButton><UButton color="error" :loading="busy" @click="remove">Remover vínculo</UButton></template></UModal>
</template>

