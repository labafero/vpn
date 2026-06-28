<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { config, fetch, save: broadcastSave } = useBroadcastConfig();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const user = useSupabaseUser();
const toast = useToast();

const title = ref("");
const cidade = ref<string | null>(null);
const saving = ref(false);

onMounted(async () => {
  await Promise.all([fetch(), fetchCidades()]);
  if (config.value) {
    title.value = config.value.title;
    cidade.value = config.value.cidade ?? null;
  }
});

async function handleSave() {
  saving.value = true;
  try {
    await broadcastSave({ title: title.value, cidade: cidade.value });
    toast.add({ title: "Configuração salva", color: "success" });
  } catch {
    toast.add({ title: "Erro ao salvar", color: "error" });
  } finally {
    saving.value = false;
  }
}

const origin = computed(() => useRequestURL().origin);

const baseParams = computed(() =>
  user.value?.sub ? `broadcaster=${user.value.sub}` : "",
);

const overlayUrl = computed(() =>
  user.value?.sub ? `${origin.value}/overlay?${baseParams.value}` : "",
);

const idleUrl = computed(() =>
  user.value?.sub ? `${origin.value}/overlay/idle?${baseParams.value}` : "",
);

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "Link copiado", color: "success" });
  } catch {
    toast.add({ title: "Erro ao copiar", color: "error" });
  }
}

const cidadeOptions = computed(() => [
  { label: "Sem cidade", value: null },
  ...cidades.value.map((c) => ({ label: c.cidade_nome, value: c.slug })),
]);
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Transmissão">
        <template #right>
          <UButton :loading="saving" :disabled="saving" @click="handleSave">
            Salvar
          </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4 space-y-6">
        <!-- Transmissão -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-radio" class="text-2xl text-primary" />
              <div>
                <div class="text-lg font-bold">Transmissão</div>
                <div class="text-sm text-muted">
                  Título e cidade da transmissão ativa.
                </div>
              </div>
            </div>
          </template>

          <UForm
            :state="{ title, cidade }"
            class="space-y-4"
            @submit="handleSave"
          >
            <UFormField label="Título da Transmissão" required>
              <UInput
                v-model="title"
                placeholder="Ex: Stand-by no Beach Bar"
                class="w-full"
              />
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
          </UForm>
        </UCard>

        <!-- Links dos Overlays -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-link" class="text-xl text-primary" />
              <div>
                <div class="text-lg font-bold">Links dos Overlays</div>
                <div class="text-sm text-muted">
                  Use esses links no OBS como Browser Source. Se uma cidade
                  estiver selecionada, o whitelabel é aplicado automaticamente.
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-3">
            <div>
              <div class="text-sm font-medium mb-1">Jornal</div>
              <div class="flex gap-2">
                <UInput :model-value="overlayUrl" class="flex-1" readonly />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(overlayUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="overlayUrl"
                  target="_blank"
                />
              </div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Monitoramento</div>
              <div class="flex gap-2">
                <UInput :model-value="idleUrl" class="flex-1" readonly />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(idleUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="idleUrl"
                  target="_blank"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
