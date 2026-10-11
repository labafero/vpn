<script setup lang="ts">
import * as v from 'valibot'
import { parseAmountToCents, formatMarketAmount } from '~/utils/marketValues'

const emit = defineEmits<{ saved: [selection: { cidade: string; itemId: number }] }>()
const { all: cities, fetchAll } = useCidadeConfig()
const { items, fetchItems, findOrCreateItem } = useMarketItems()
const { save } = useMarketValues()
const step = ref(0)
const state = reactive({ cidade: '', itemId: 0, newName: '', amount: '' })
const createNew = ref(false)
const busy = ref(false)
const error = ref('')
const optionsError = ref('')
const loadingOptions = ref(true)
const titles = ['Cidade', 'Item', 'Valor', 'Revisão']
const cityOptions = computed(() => cities.value.map(c => ({ label: c.cidade_nome, value: c.slug })))
const itemOptions = computed(() => items.value.map(i => ({ label: i.name, value: i.id })))
const selectedItem = computed(() => items.value.find(i => i.id === state.itemId))
const previewAmount = computed(() => {
  try { return formatMarketAmount(parseAmountToCents(state.amount) / 100) } catch { return '' }
})
async function loadOptions() {
  loadingOptions.value = true
  optionsError.value = ''
  try { await Promise.all([fetchAll(), fetchItems()]) }
  catch { optionsError.value = 'Não foi possível carregar cidades e itens. Tente novamente.' }
  finally { loadingOptions.value = false }
}
onMounted(loadOptions)
async function next() {
  error.value = ''
  try {
    if (step.value === 0) {
      v.parse(v.pipe(v.string(), v.minLength(1)), state.cidade)
      if (!cities.value.some(c => c.slug === state.cidade)) throw new Error('Selecione uma cidade')
    }
    if (step.value === 1) {
      if (createNew.value) v.parse(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)), state.newName)
      else if (!selectedItem.value) throw new Error('Selecione um item')
    }
    if (step.value === 2) parseAmountToCents(state.amount)
    step.value++
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Verifique os campos obrigatórios' }
}
async function submit() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    if (createNew.value) {
      const item = await findOrCreateItem(state.newName)
      state.itemId = item.id
      createNew.value = false
    }
    await save({ cidade: state.cidade, itemId: state.itemId, amount: state.amount })
    emit('saved', { cidade: state.cidade, itemId: state.itemId })
  } catch { error.value = 'Não foi possível salvar. Confira sua autorização, cidade e item e tente novamente. Seus dados foram preservados.' }
  finally { busy.value = false }
}
</script>

<template>
  <UCard class="max-w-2xl">
    <template #header><p aria-live="polite">Etapa {{ step + 1 }} de 4 — {{ titles[step] }}</p></template>
    <div class="space-y-5">
      <UAlert v-if="error" color="error" :description="error" />
      <UAlert v-if="optionsError" color="error" :description="optionsError"><template #actions><UButton :loading="loadingOptions" @click="loadOptions">Tentar novamente</UButton></template></UAlert>
      <UFormField v-if="step === 0" label="Cidade" name="cidade" required>
        <USelect v-model="state.cidade" :items="cityOptions" placeholder="Selecione a cidade" class="w-full" />
      </UFormField>
      <template v-if="step === 1">
        <UCheckbox v-model="createNew" label="Cadastrar um novo item" />
        <UFormField v-if="createNew" label="Nome do novo item" name="newName" required>
          <UInput v-model="state.newName" :maxlength="100" class="w-full" />
        </UFormField>
        <UFormField v-else label="Item" name="itemId" required>
          <USelectMenu v-model="state.itemId" aria-label="Item" :items="itemOptions" value-key="value" placeholder="Buscar item" class="w-full" />
        </UFormField>
      </template>
      <UFormField v-if="step === 2" label="Valor em reais" name="amount" description="Use o formato 1.234,56. Zero é permitido." required>
        <UInput v-model="state.amount" inputmode="decimal" placeholder="0,00" class="w-full" />
      </UFormField>
      <dl v-if="step === 3" class="space-y-3">
        <div><dt class="text-muted">Cidade</dt><dd>{{ cities.find(c => c.slug === state.cidade)?.cidade_nome }}</dd></div>
        <div><dt class="text-muted">Item</dt><dd>{{ createNew ? state.newName : selectedItem?.name }}</dd></div>
        <div><dt class="text-muted">Valor</dt><dd class="text-2xl font-semibold">{{ previewAmount }}</dd></div>
      </dl>
    </div>
    <template #footer>
      <div class="flex justify-between gap-3">
        <UButton v-if="step > 0" variant="outline" :disabled="busy" @click="step--; error = ''">Voltar</UButton>
        <UButton v-else variant="outline" to="/redacao/valores">Cancelar</UButton>
        <UButton v-if="step < 3" :disabled="loadingOptions || !!optionsError" @click="next">Continuar</UButton>
        <UButton v-else :loading="busy" :disabled="busy" @click="submit">Salvar valor</UButton>
      </div>
    </template>
  </UCard>
</template>


