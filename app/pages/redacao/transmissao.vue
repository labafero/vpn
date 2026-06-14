<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { config, fetch, save } = useBroadcastConfig();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const { lsLabel, fetch: fetchClock, sync: syncClock } = useServerClock();
const user = useSupabaseUser();
const toast = useToast();

const characterName = ref("");
const passportId = ref("");
const phone = ref("");
const title = ref("");
const cidade = ref<string | null>(null);
const saving = ref(false);

const lsTimeInput = ref("");
const syncing = ref(false);

onMounted(async () => {
  await Promise.all([fetch(), fetchClock(), fetchCidades()]);
  if (config.value) {
    characterName.value = config.value.character_name;
    passportId.value = config.value.passport_id;
    phone.value = config.value.phone;
    title.value = config.value.title;
    cidade.value = config.value.cidade ?? null;
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
    await save({
      character_name: characterName.value,
      passport_id: passportId.value,
      phone: phone.value,
      title: title.value,
      cidade: cidade.value,
    });
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

const overlayWhitelabelUrl = computed(() =>
  user.value?.sub
    ? `${origin.value}/overlay?${baseParams.value}&mode=whitelabel`
    : "",
);

const idleUrl = computed(() =>
  user.value?.sub ? `${origin.value}/overlay/idle?${baseParams.value}` : "",
);

const idleWhitelabelUrl = computed(() => {
  if (!user.value?.sub || !cidade.value) return "";
  return `${origin.value}/overlay/idle?${baseParams.value}&cidade=${cidade.value}`;
});

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
          <UButton
            :loading="saving"
            :disabled="saving"
            @click="handleSave"
          >
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
              <UIcon name="i-lucide-radio" class="text-2xl text-primary" />
              <div>
                <div class="text-lg font-bold">Configuração da Transmissão</div>
                <div class="text-sm text-muted">
                  Dados exibidos nos overlays de jornal e monitoramento.
                </div>
              </div>
            </div>
          </template>

          <UForm
            :state="{ characterName, passportId, phone, title, cidade }"
            class="space-y-4"
            @submit="handleSave"
          >
            <UFormField label="Nome do Personagem" required>
              <UInput
                v-model="characterName"
                placeholder="Ex: Jacky Tequila"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Passaporte / ID" required>
              <UInput
                v-model="passportId"
                placeholder="Ex: 1642"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Telefone" required>
              <UInput
                v-model="phone"
                placeholder="Ex: 442-663"
                class="w-full"
              />
            </UFormField>

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
              <span class="font-mono text-default font-bold">{{ lsLabel }}</span>
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

        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-link" class="text-xl text-primary" />
              <div>
                <div class="text-lg font-bold">Links dos Overlays</div>
                <div class="text-sm text-muted">
                  Use esses links no OBS como Browser Source.
                </div>
              </div>
            </div>
          </template>

          <div class="space-y-5">
            <!-- Modo Geral -->
            <div>
              <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Modo Geral</div>
              <div class="space-y-3">
                <div>
                  <div class="text-sm font-medium mb-1">Jornal</div>
                  <div class="flex gap-2">
                    <UInput :model-value="overlayUrl" class="flex-1" readonly />
                    <UButton icon="i-lucide-copy" variant="outline" @click="copyUrl(overlayUrl)" />
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Monitoramento</div>
                  <div class="flex gap-2">
                    <UInput :model-value="idleUrl" class="flex-1" readonly />
                    <UButton icon="i-lucide-copy" variant="outline" @click="copyUrl(idleUrl)" />
                  </div>
                </div>
              </div>
            </div>

            <USeparator />

            <!-- Modo Whitelabel -->
            <div>
              <div class="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Modo Whitelabel</div>
              <p v-if="!cidade" class="text-sm text-muted">
                Selecione uma cidade acima para gerar os links whitelabel.
              </p>
              <div v-else class="space-y-3">
                <div>
                  <div class="text-sm font-medium mb-1">Jornal (whitelabel)</div>
                  <div class="flex gap-2">
                    <UInput :model-value="overlayWhitelabelUrl" class="flex-1" readonly />
                    <UButton icon="i-lucide-copy" variant="outline" @click="copyUrl(overlayWhitelabelUrl)" />
                  </div>
                </div>
                <div>
                  <div class="text-sm font-medium mb-1">Monitoramento (whitelabel)</div>
                  <div class="flex gap-2">
                    <UInput :model-value="idleWhitelabelUrl" class="flex-1" readonly />
                    <UButton icon="i-lucide-copy" variant="outline" @click="copyUrl(idleWhitelabelUrl)" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
