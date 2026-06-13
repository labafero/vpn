<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { config, fetch, save } = useBroadcastConfig();
const { lsLabel, fetch: fetchClock, sync: syncClock } = useServerClock();
const user = useSupabaseUser();
const toast = useToast();

const characterName = ref("");
const passportId = ref("");
const phone = ref("");
const title = ref("");
const saving = ref(false);

const lsTimeInput = ref("");
const syncing = ref(false);

onMounted(async () => {
  await fetch();
  await fetchClock();
  if (config.value) {
    characterName.value = config.value.character_name;
    passportId.value = config.value.passport_id;
    phone.value = config.value.phone;
    title.value = config.value.title;
  }
});

async function handleSync() {
  if (!lsTimeInput.value) return;
  const [h, m] = lsTimeInput.value.split(":").map(Number);
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
    });
    toast.add({ title: "Configuração salva", color: "success" });
  } catch {
    toast.add({ title: "Erro ao salvar", color: "error" });
  } finally {
    saving.value = false;
  }
}

const origin = computed(() => useRequestURL().origin);

const overlayUrl = computed(() => {
  if (!user.value?.sub) return "";
  return `${origin.value}/overlay?broadcaster=${user.value.sub}`;
});

const idleUrl = computed(() => {
  if (!user.value?.sub) return "";
  return `${origin.value}/overlay/idle?broadcaster=${user.value.sub}`;
});

async function copyUrl(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.add({ title: "Link copiado", color: "success" });
  } catch {
    toast.add({ title: "Erro ao copiar", color: "error" });
  }
}
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
            :state="{ characterName, passportId, phone, title }"
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
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </UDashboardPanel>
</template>
