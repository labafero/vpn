<script setup lang="ts">
import { TYPE_LABELS, TYPE_FIELDS, type DbRecordType } from "~/composables/useDbRecords";

definePageMeta({ middleware: "auth" });

const { insert } = useDbRecords();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const toast = useToast();
const router = useRouter();

const saving = ref(false);
const type = ref<DbRecordType>("pessoa");
const nome = ref("");
const cidade = ref<string | null>(null);
const dados = ref<Record<string, string>>({});

onMounted(fetchCidades);

const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({ label, value }));

const cidadeOptions = computed(() => [
  { label: "Nenhuma", value: null },
  ...cidades.value.map((c) => ({ label: c.cidade_nome, value: c.slug }))
]);

const fields = computed(() => TYPE_FIELDS[type.value]);

watch(type, () => { dados.value = {}; });

async function handleSave() {
  if (!nome.value.trim()) {
    toast.add({ title: "Nome obrigatório", color: "error" });
    return;
  }
  saving.value = true;
  try {
    const record = await insert({ type: type.value, nome: nome.value.trim(), dados: dados.value, cidade: cidade.value });
    toast.add({ title: "Registro criado", color: "success" });
    router.push(`/redacao/base/${record.id}`);
  } catch {
    toast.add({ title: "Erro ao criar registro", color: "error" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Novo Registro">
        <template #leading>
          <UButton variant="ghost" icon="i-lucide-arrow-left" to="/redacao/base" />
        </template>
        <template #right>
          <UButton :loading="saving" :disabled="saving" @click="handleSave">
            Salvar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 max-w-xl space-y-4">
        <UCard>
          <div class="space-y-4">
            <UFormField label="Tipo">
              <USelect
                v-model="type"
                :items="typeOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Nome" required>
              <UInput v-model="nome" placeholder="Nome do registro" class="w-full" />
            </UFormField>

            <UFormField label="Cidade">
              <USelect
                v-model="cidade"
                :items="cidadeOptions"
                value-key="value"
                label-key="label"
                class="w-full"
              />
            </UFormField>

            <USeparator />

            <UFormField
              v-for="field in fields"
              :key="field.key"
              :label="field.label"
            >
              <USelect
                v-if="field.type === 'select'"
                v-model="dados[field.key]"
                :items="field.options!.map((o) => ({ label: o, value: o }))"
                value-key="value"
                label-key="label"
                class="w-full"
              />
              <UInput
                v-else
                v-model="dados[field.key]"
                :placeholder="field.label"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
