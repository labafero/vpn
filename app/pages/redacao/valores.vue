<script setup lang="ts">
import type { MarketValueInput } from '~/composables/useMarketValues';

definePageMeta({ middleware: 'auth' });

const { latest, history, fetchLatest, fetchHistory, save } = useMarketValues();
const toast = useToast();
const saving = ref(false);

const rows = ref<MarketValueInput[]>([]);

const DEFAULT_ROWS: MarketValueInput[] = [
  { cidade: '', label: 'kit médico civil', value: 'R$ 10.000', trend: 'down' },
  { cidade: '', label: 'kit médico policial', value: 'R$ 4.000', trend: 'stable' },
  { cidade: '', label: 'analgésico', value: 'R$ 1.200', trend: 'stable' },
  { cidade: '', label: 'trat. médico', value: 'R$ 2.500', trend: 'stable' },
  { cidade: '', label: 'auto. trat. médico', value: 'R$ 5.500', trend: 'up' },
  { cidade: '', label: 'apt. padrão', value: 'R$ 150.000', trend: 'down' },
  { cidade: '', label: 'bitcoin', value: 'R$ 3,40', trend: 'stable' },
];

const trendOptions = [
  { label: '▲ Alta', value: 'up' },
  { label: '— Estável', value: 'stable' },
  { label: '▼ Baixa', value: 'down' },
];

onMounted(async () => {
  await fetchLatest();
  await fetchHistory();
  if (latest.value.length > 0) {
    rows.value = latest.value.map((r) => ({
      cidade: r.cidade ?? '',
      label: r.label ?? '',
      value: r.value ?? '',
      trend: (r.trend ?? 'stable') as MarketValueInput['trend'],
    }));
  } else {
    rows.value = DEFAULT_ROWS.map((r) => ({ ...r }));
  }
});

function addRow() {
  rows.value.push({ cidade: '', label: '', value: '', trend: 'stable' });
}

function removeRow(i: number) {
  rows.value.splice(i, 1);
}

async function handleSave() {
  saving.value = true;
  try {
    await save(rows.value);
    await fetchLatest();
    toast.add({ title: 'Valores salvos', color: 'success' });
  } catch {
    toast.add({ title: 'Erro ao salvar valores', color: 'error' });
  } finally {
    saving.value = false;
  }
}

const historyColumns = [
  { key: 'created_at', label: 'Data' },
  { key: 'cidade', label: 'Cidade' },
  { key: 'label', label: 'Item' },
  { key: 'value', label: 'Valor' },
  { key: 'trend', label: 'Tendência' },
];

const historyRows = computed(() =>
  history.value.slice(0, 10).map((r) => ({
    ...r,
    created_at: new Date(r.created_at).toLocaleString('pt-BR'),
    trend: r.trend === 'up' ? '▲ Alta' : r.trend === 'down' ? '▼ Baixa' : '— Estável',
  }))
);

const accordionItems = [
  { label: 'Histórico recente', value: 'history' },
];
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Valores de Mercado">
        <template #right>
          <UButton :loading="saving" :disabled="saving" @click="handleSave">
            Salvar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-chart-line" class="text-2xl text-primary" />
              <div>
                <div class="text-lg font-bold">Tabela de Preços</div>
                <div class="text-sm text-muted">
                  Cada salvamento insere um novo registro — o histórico é preservado.
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-2">
            <div class="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 text-xs text-muted font-medium px-1">
              <span>Cidade</span>
              <span>Item</span>
              <span>Valor</span>
              <span>Tendência</span>
              <span />
            </div>

            <div
              v-for="(row, i) in rows"
              :key="i"
              class="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-center"
            >
              <UInput v-model="row.cidade" placeholder="Ex: Neon" />
              <UInput v-model="row.label" placeholder="Ex: kit médico civil" />
              <UInput v-model="row.value" placeholder="Ex: R$ 10.000" />
              <USelect
                v-model="row.trend"
                :items="trendOptions"
                value-key="value"
                label-key="label"
                class="w-32"
              />
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                @click="removeRow(i)"
              />
            </div>
          </div>

          <template #footer>
            <UButton
              icon="i-lucide-plus"
              variant="outline"
              size="sm"
              @click="addRow"
            >
              Adicionar item
            </UButton>
          </template>
        </UCard>

        <UAccordion :items="accordionItems">
          <template #history>
            <UCard>
              <UTable :rows="historyRows" :columns="historyColumns" />
            </UCard>
          </template>
        </UAccordion>
      </div>
    </template>
  </UDashboardPanel>
</template>
