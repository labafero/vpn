<script setup lang="ts">
import { corClasses, type CorBrand } from "~/utils/cidadeColors";

definePageMeta({ middleware: "auth" });

const { all, loading, fetchAll, remove } = useCidadeConfig();
const toast = useToast();

onMounted(fetchAll);

const confirmDelete = ref<string | null>(null);
const deleteModalOpen = ref(false);

async function handleDelete(slug: string) {
  try {
    await remove(slug);
    toast.add({ title: "Cidade removida", color: "success" });
  } catch {
    toast.add({ title: "Erro ao remover", color: "error" });
  } finally {
    confirmDelete.value = null;
    deleteModalOpen.value = false;
  }
}
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Cidades">
        <template #right>
          <UButton icon="i-lucide-plus" to="/redacao/cidades/novo">
            Nova Cidade
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 max-w-2xl">
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
                  :to="`/redacao/cidades/${c.slug}`"
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
      </div>
    </template>
  </UDashboardPanel>

  <UModal v-model:open="deleteModalOpen">
    <template #content>
      <div class="p-6 space-y-4">
        <p class="text-sm">
          Remover a cidade <strong>{{ confirmDelete }}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div class="flex gap-2 justify-end">
          <UButton variant="ghost" @click="() => { deleteModalOpen = false; confirmDelete = null }">
            Cancelar
          </UButton>
          <UButton
            color="error"
            @click="() => { if (confirmDelete) handleDelete(confirmDelete) }"
          >
            Remover
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
