<script setup lang="ts">
import { CORES_DISPONIVEIS, corClasses, type CorBrand } from "~/utils/cidadeColors";
import type { Tables } from "~/types/database.types";

definePageMeta({ middleware: "auth" });

const { all, loading, fetchAll, save, remove } = useCidadeConfig();
const toast = useToast();

onMounted(fetchAll);

const editing = ref<Tables<"city_config"> | null>(null);
const saving = ref(false);
const confirmDelete = ref<string | null>(null);
const deleteModalOpen = ref(false);

const form = reactive({
  slug: "",
  cidade_nome: "",
  jornal_nome: "",
  jornal_sigla: "",
  cor_primaria: "red" as CorBrand,
  logo_url: "",
});

const isNew = computed(() => !editing.value);

function startNew() {
  editing.value = null;
  Object.assign(form, {
    slug: "",
    cidade_nome: "",
    jornal_nome: "",
    jornal_sigla: "",
    cor_primaria: "red",
    logo_url: "",
  });
}

function startEdit(c: Tables<"city_config">) {
  editing.value = c;
  Object.assign(form, {
    slug: c.slug,
    cidade_nome: c.cidade_nome,
    jornal_nome: c.jornal_nome,
    jornal_sigla: c.jornal_sigla,
    cor_primaria: c.cor_primaria as CorBrand,
    logo_url: c.logo_url ?? "",
  });
}

watch(
  () => form.cidade_nome,
  (val) => {
    if (isNew.value) {
      form.slug = val.toLowerCase().trim().replace(/\s+/g, "-");
    }
  },
);

async function handleSave() {
  if (!form.slug || !form.cidade_nome || !form.jornal_nome || !form.jornal_sigla) {
    toast.add({ title: "Preencha todos os campos obrigatórios", color: "error" });
    return;
  }
  saving.value = true;
  try {
    await save({
      slug: form.slug,
      cidade_nome: form.cidade_nome,
      jornal_nome: form.jornal_nome,
      jornal_sigla: form.jornal_sigla,
      cor_primaria: form.cor_primaria,
      logo_url: form.logo_url || null,
    });
    toast.add({ title: "Cidade salva", color: "success" });
    await fetchAll();
    startNew();
  } catch {
    toast.add({ title: "Erro ao salvar", color: "error" });
  } finally {
    saving.value = false;
  }
}

async function handleDelete(slug: string) {
  try {
    await remove(slug);
    toast.add({ title: "Cidade removida", color: "success" });
    if (editing.value?.slug === slug) startNew();
  } catch {
    toast.add({ title: "Erro ao remover", color: "error" });
  } finally {
    confirmDelete.value = null;
    deleteModalOpen.value = false;
  }
}

const previewCor = computed(() => corClasses[form.cor_primaria as CorBrand] ?? corClasses.red);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Cidades">
        <template #right>
          <UButton icon="i-lucide-plus" @click="startNew">Nova Cidade</UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Lista -->
        <UCard>
          <template #header>
            <span class="font-semibold">Cidades Configuradas</span>
          </template>

          <div v-if="loading" class="space-y-2">
            <USkeleton v-for="i in 4" :key="i" class="h-14 rounded-lg" />
          </div>

          <div v-else-if="all.length === 0" class="text-muted text-sm py-4 text-center">
            Nenhuma cidade configurada.
          </div>

          <ul v-else class="divide-y divide-default">
            <li
              v-for="c in all"
              :key="c.slug"
              class="flex items-center gap-3 py-3"
            >
              <span
                class="w-3 h-3 rounded-full shrink-0"
                :class="corClasses[c.cor_primaria as CorBrand]?.bg ?? 'bg-zinc-600'"
              />
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">{{ c.cidade_nome }}</div>
                <div class="text-xs text-muted truncate">
                  {{ c.jornal_sigla }} · {{ c.jornal_nome }}
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <UButton
                  size="xs"
                  variant="ghost"
                  icon="i-lucide-pencil"
                  @click="startEdit(c)"
                />
                <UButton
                  size="xs"
                  variant="ghost"
                  color="error"
                  icon="i-lucide-trash-2"
                  @click="() => { confirmDelete = c.slug; deleteModalOpen = true }"
                />
              </div>
            </li>
          </ul>
        </UCard>

        <!-- Formulário -->
        <div class="space-y-4">
          <UCard>
            <template #header>
              <span class="font-semibold">{{ isNew ? "Nova Cidade" : `Editar — ${editing?.cidade_nome}` }}</span>
            </template>

            <div class="space-y-4">
              <UFormField label="Nome da Cidade" required>
                <UInput v-model="form.cidade_nome" placeholder="Ex: Neon" class="w-full" />
              </UFormField>

              <UFormField label="Slug (URL)" required>
                <UInput
                  v-model="form.slug"
                  placeholder="Ex: neon"
                  :readonly="!isNew"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Nome do Jornal" required>
                <UInput v-model="form.jornal_nome" placeholder="Ex: Neon TV" class="w-full" />
              </UFormField>

              <UFormField label="Sigla" required>
                <UInput v-model="form.jornal_sigla" placeholder="Ex: NTV" class="w-full max-w-32" />
              </UFormField>

              <UFormField label="Cor Principal">
                <div class="flex flex-wrap gap-2 mt-1">
                  <button
                    v-for="cor in CORES_DISPONIVEIS"
                    :key="cor"
                    type="button"
                    class="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    :class="[
                      corClasses[cor].bg,
                      form.cor_primaria === cor ? 'border-white scale-110' : 'border-transparent',
                    ]"
                    :title="cor"
                    @click="form.cor_primaria = cor"
                  />
                </div>
              </UFormField>

              <UFormField label="Logo URL (opcional)">
                <UInput v-model="form.logo_url" placeholder="https://..." class="w-full" />
              </UFormField>
            </div>

            <template #footer>
              <UButton :loading="saving" class="w-full" @click="handleSave">
                Salvar
              </UButton>
            </template>
          </UCard>

          <!-- Preview -->
          <UCard>
            <template #header>
              <span class="font-semibold text-sm text-muted">Preview do header</span>
            </template>
            <div
              class="rounded-lg overflow-hidden border"
              :class="previewCor.border"
            >
              <div
                class="bg-zinc-950 px-4 h-12 flex items-center justify-between border-b"
                :class="previewCor.border"
              >
                <span class="font-bold text-sm tracking-tight text-white">
                  <span :class="previewCor.text">{{ form.jornal_sigla || "TV" }}</span>
                  {{ form.jornal_nome || "Roleplay" }}
                </span>
                <UIcon name="lucide:pen-line" class="w-4 h-4 text-zinc-500" />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="deleteModalOpen">
    <template #content>
      <div class="p-6 space-y-4">
        <p class="text-sm">Remover a cidade <strong>{{ confirmDelete }}</strong>? Esta ação não pode ser desfeita.</p>
        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" @click="() => { deleteModalOpen = false; confirmDelete = null }">Cancelar</UButton>
          <UButton color="error" @click="() => { if (confirmDelete) handleDelete(confirmDelete) }">Remover</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
