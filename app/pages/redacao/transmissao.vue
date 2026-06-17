<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { config, fetch, save: broadcastSave } = useBroadcastConfig();
const {
  config: characterConfig,
  fetch: characterFetch,
  save: characterSave,
} = useCharacterConfig();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const { lsLabel, fetch: fetchClock, sync: syncClock } = useServerClock();
const user = useSupabaseUser();
const toast = useToast();

const title = ref("");
const cidade = ref<string | null>(null);
const characterName = ref("");
const passportId = ref("");
const phone = ref("");
const saving = ref(false);

const lsTimeInput = ref("");
const syncing = ref(false);

onMounted(async () => {
  await Promise.all([fetch(), fetchClock(), fetchCidades()]);
  if (config.value) {
    title.value = config.value.title;
    cidade.value = config.value.cidade ?? null;
  }
});

watch(cidade, async (newCidade) => {
  if (newCidade) {
    await characterFetch(newCidade);
    characterName.value = characterConfig.value?.character_name ?? "";
    passportId.value = characterConfig.value?.passport_id ?? "";
    phone.value = characterConfig.value?.phone ?? "";
  } else {
    characterName.value = "";
    passportId.value = "";
    phone.value = "";
  }
});

async function handleSync() {
  if (!lsTimeInput.value) return;
  const [h = 0, m = 0] = lsTimeInput.value.split(":").map(Number);
  syncing.value = true;
  const error = await syncClock(h, m);
  if (error) {
    toast.add({ title: "Erro ao sincronizar", color: "error" });
  } else {
    toast.add({ title: "Horário de LS sincronizado", color: "success" });
    lsTimeInput.value = "";
  }
  syncing.value = false;
}

async function handleSave() {
  saving.value = true;
  try {
    await broadcastSave({ title: title.value, cidade: cidade.value });
    if (cidade.value) {
      await characterSave({
        cidade: cidade.value,
        character_name: characterName.value,
        passport_id: passportId.value,
        phone: phone.value,
      });
    }
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

const cidadeLabel = computed(
  () => cidades.value.find((c) => c.slug === cidade.value)?.cidade_nome ?? "",
);
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

        <!-- Personagem -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-user" class="text-2xl text-primary" />
              <div>
                <div class="text-lg font-bold">
                  Personagem
                  <span v-if="cidadeLabel" class="text-muted font-normal"
                    >— {{ cidadeLabel }}</span
                  >
                </div>
                <div class="text-sm text-muted">
                  <template v-if="cidade">
                    Dados do personagem para esta cidade. Salvos por cidade.
                  </template>
                  <template v-else>
                    Selecione uma cidade acima para editar o personagem.
                  </template>
                </div>
              </div>
            </div>
          </template>

          <UForm
            :state="{ characterName, passportId, phone }"
            class="space-y-4"
            @submit="handleSave"
          >
            <UFormField label="Nome do Personagem">
              <UInput
                v-model="characterName"
                placeholder="Ex: Jacky Tequila"
                class="w-full"
                :disabled="!cidade"
              />
            </UFormField>

            <UFormField label="Passaporte / ID">
              <UInput
                v-model="passportId"
                placeholder="Ex: 1642"
                class="w-full"
                :disabled="!cidade"
              />
            </UFormField>

            <UFormField label="Telefone">
              <UInput
                v-model="phone"
                placeholder="Ex: 442-663"
                class="w-full"
                :disabled="!cidade"
              />
            </UFormField>
          </UForm>
        </UCard>

        <!-- Horário de LS -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-clock" class="text-xl text-primary" />
              <div>
                <div class="text-lg font-bold">Horário de Los Santos</div>
                <div class="text-sm text-muted">
                  Sincronize o relógio do servidor com o horário atual de LS.
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="text-sm text-muted">
              Horário calculado agora:
              <span class="font-mono text-default font-bold">{{
                lsLabel
              }}</span>
            </div>
            <div class="flex items-end gap-3">
              <UFormField label="Horário de LS agora (HH:MM)">
                <UInput v-model="lsTimeInput" type="time" class="w-full" />
              </UFormField>
              <UButton
                :loading="syncing"
                :disabled="!lsTimeInput"
                icon="i-lucide-refresh-cw"
                @click="handleSync"
              >
                Sincronizar
              </UButton>
            </div>
          </div>
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
