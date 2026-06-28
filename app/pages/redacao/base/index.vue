<script setup lang="ts">
import { TYPE_LABELS, TYPE_COLORS, type DbRecordType } from "~/composables/useDbRecords";

definePageMeta({ middleware: "auth" });

const { records, loading, fetchAll, remove } = useDbRecords();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const toast = useToast();
const router = useRouter();

const search = ref("");
const filterType = ref<DbRecordType | "">("");
const filterCidade = ref("");
const deleteId = ref<number | null>(null);
const deleteModalOpen = ref(false);

onMounted(async () => {
  await Promise.all([fetchAll(), fetchCidades()]);
});

watch([search, filterType, filterCidade], () => {
  fetchAll({
    type: filterType.value || undefined,
    cidade: filterCidade.value || undefined,
    search: search.value || undefined
  });
});

const typeOptions = [
  { label: "Todos os tipos", value: "" },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value }))
];

const cidadeOptions = computed(() => [
  { label: "Todas as cidades", value: "" },
  ...cidades.value.map((c) => ({ label: c.cidade_nome, value: c.slug }))
]);

async function handleDelete() {
  if (!deleteId.value) return;
  try {
    await remove(deleteId.value);
    toast.add({ title: "Registro removido", color: "success" });
  } catch {
    toast.add({ title: "Erro ao remover", color: "error" });
  } finally {
    deleteId.value = null;
    deleteModalOpen.value = false;
  }
}

function exportCsv() {
  const headers = ["Tipo", "Nome", "Cidade", "Atualizado em"];
  const rows = records.value.map((r) => [
    TYPE_LABELS[r.type as DbRecordType] ?? r.type,
    `"${r.nome}"`,
    r.cidade ?? "",
    new Date(r.updated_at).toLocaleDateString("pt-BR")
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "base-de-dados.csv";
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Base de Dados">
        <template #right>
          <UButton variant="outline" icon="i-lucide-download" @click="exportCsv">
            Exportar
          </UButton>
          <UButton icon="i-lucide-plus" to="/redacao/base/novo">
            Novo Registro
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-4">
        <div class="flex flex-wrap gap-2">
          <UInput
            v-model="search"
            icon="i-lucide-search"
            placeholder="Buscar por nome..."
            class="flex-1 min-w-48"
          />
          <USelect
            v-model="filterType"
            :items="typeOptions"
            value-key="value"
            label-key="label"
            class="w-44"
          />
          <USelect
            v-model="filterCidade"
            :items="cidadeOptions"
            value-key="value"
            label-key="label"
            class="w-44"
          />
        </div>

        <UCard>
          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 5" :key="i" class="h-12 rounded-lg" />
          </div>

          <div v-else-if="records.length === 0" class="text-muted text-sm py-6 text-center">
            Nenhum registro encontrado.
          </div>

          <div v-else class="divide-y divide-default">
            <div
              v-for="record in records"
              :key="record.id"
              class="flex items-center gap-3 py-3 px-1 hover:bg-elevated/50 rounded cursor-pointer"
              @click="router.push(`/redacao/base/${record.id}`)"
            >
              <UBadge
                :label="TYPE_LABELS[record.type as DbRecordType]"
                :color="TYPE_COLORS[record.type as DbRecordType]"
                variant="subtle"
                class="shrink-0 w-28 justify-center"
              />
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ record.nome }}</div>
              </div>
              <div class="text-sm text-muted shrink-0">{{ record.cidade ?? "—" }}</div>
              <div class="text-xs text-muted shrink-0 hidden sm:block">
                {{ new Date(record.updated_at).toLocaleDateString("pt-BR") }}
              </div>
              <div class="flex gap-1 shrink-0">
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  :to="`/redacao/base/${record.id}`"
                  @click.stop
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  @click.stop="() => { deleteId = record.id; deleteModalOpen = true; }"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="deleteModalOpen">
    <template #content>
      <div class="p-6 space-y-4">
        <p class="text-sm">Remover este registro? Esta ação não pode ser desfeita.</p>
        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" @click="() => { deleteModalOpen = false; deleteId = null; }">
            Cancelar
          </UButton>
          <UButton color="error" @click="handleDelete">Remover</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
