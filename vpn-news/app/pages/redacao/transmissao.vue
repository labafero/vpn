<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const { config, fetch, save: broadcastSave } = useBroadcastConfig();
const { all: cidades, fetchAll: fetchCidades } = useCidadeConfig();
const user = useSupabaseUser();
const toast = useToast();
const {
  status: obsStatus,
  error: obsError,
  config: obsConfig,
  metadata: obsMetadata,
  reconnectAttempt,
  connect: connectObs,
  disconnect: disconnectObs,
  updateRememberPassword,
} = useObsConnection();

const title = ref("");
const cidade = ref<string | null>(null);
const saving = ref(false);

const obsBusy = computed(
  () => obsStatus.value === "conectando" || obsStatus.value === "reconectando",
);

const obsStatusLabel = computed(
  () =>
    ({
      desconectado: "Desconectado",
      conectando: "Conectando",
      conectado: "Conectado",
      reconectando: "Reconectando",
      erro: "Erro",
    })[obsStatus.value],
);

const obsStatusColor = computed(() => {
  if (obsStatus.value === "conectado") return "success";
  if (obsStatus.value === "conectando") return "primary";
  if (obsStatus.value === "reconectando") return "warning";
  if (obsStatus.value === "erro") return "error";
  return "neutral";
});

const rememberObsPassword = computed({
  get: () => obsConfig.value.rememberPassword,
  set: (value: boolean) => updateRememberPassword(value),
});

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

async function handleObsConnect() {
  const connected = await connectObs();
  if (connected) {
    toast.add({ title: "OBS conectado", color: "success" });
  }
}

async function handleObsDisconnect() {
  await disconnectObs();
  toast.add({ title: "OBS desconectado", color: "neutral" });
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

const spectrumUrl = computed(() =>
  user.value?.sub ? `${origin.value}/overlay/spectrum?${baseParams.value}` : "",
);

const noSignalUrl = computed(() =>
  user.value?.sub
    ? `${origin.value}/overlay/no-signal?${baseParams.value}`
    : "",
);

const streamSignalUrl = computed(() =>
  user.value?.sub
    ? `${origin.value}/overlay/stream-signal?${baseParams.value}`
    : "",
);

const streamSignalDeckUrl = computed(() =>
  user.value?.sub
    ? `${origin.value}/overlay/stream-signal-deck?${baseParams.value}`
    : "",
);

const streamSignalDeckRandomUrl = computed(() =>
  user.value?.sub
    ? `${origin.value}/overlay/stream-signal-deck-random?${baseParams.value}`
    : "",
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
      <div class="space-y-6">
        <!-- Transmissão -->
        <UCard>
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

        <UCard>
          <template #header>
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="font-semibold">Conexão com o OBS</h2>
                <p class="text-sm text-muted">
                  Conecte este dispositivo diretamente ao OBS WebSocket 5.x.
                </p>
              </div>
              <UBadge :color="obsStatusColor" variant="subtle">
                {{ obsStatusLabel }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-[1fr_10rem]">
              <UFormField label="Endereço" required>
                <UInput
                  v-model="obsConfig.host"
                  placeholder="127.0.0.1"
                  autocomplete="off"
                  :disabled="obsBusy || obsStatus === 'conectado'"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Porta" required>
                <UInput
                  v-model.number="obsConfig.port"
                  type="number"
                  min="1"
                  max="65535"
                  inputmode="numeric"
                  :disabled="obsBusy || obsStatus === 'conectado'"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField label="Senha">
              <UInput
                v-model="obsConfig.password"
                type="password"
                placeholder="Senha configurada no OBS"
                autocomplete="current-password"
                :disabled="obsBusy || obsStatus === 'conectado'"
                class="w-full"
              />
            </UFormField>

            <UCheckbox
              v-model="rememberObsPassword"
              label="Lembrar senha neste dispositivo"
              description="A senha será salva somente no armazenamento local deste navegador."
              :disabled="obsBusy || obsStatus === 'conectado'"
            />

            <UAlert
              v-if="obsError"
              color="error"
              variant="subtle"
              icon="i-lucide-circle-alert"
              :description="obsError.message"
            />

            <div
              v-if="obsStatus === 'reconectando'"
              class="text-sm text-muted"
            >
              Tentativa {{ reconnectAttempt }} de 5 em andamento.
            </div>

            <div
              v-if="obsMetadata"
              class="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted"
            >
              <span>OBS WebSocket {{ obsMetadata.obsWebSocketVersion }}</span>
              <span>RPC {{ obsMetadata.negotiatedRpcVersion }}</span>
            </div>

            <div class="flex justify-end">
              <UButton
                v-if="obsStatus === 'conectado'"
                color="neutral"
                variant="outline"
                icon="i-lucide-unplug"
                @click="handleObsDisconnect"
              >
                Desconectar
              </UButton>
              <UButton
                v-else
                icon="i-lucide-plug"
                :loading="obsBusy"
                :disabled="obsBusy"
                @click="handleObsConnect"
              >
                Conectar
              </UButton>
            </div>
          </div>
        </UCard>

        <UCard
          title="Use esses links no OBS como Browser Source"
          description="Se uma cidade estiver selecionada, o whitelabel é aplicado
        automaticamente."
          variant="subtle"
        >
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
            <div>
              <div class="text-sm font-medium mb-1">Spectrum</div>
              <div class="flex gap-2">
                <UInput :model-value="spectrumUrl" class="flex-1" readonly />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(spectrumUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="spectrumUrl"
                  target="_blank"
                />
              </div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Sem sinal</div>
              <div class="flex gap-2">
                <UInput :model-value="noSignalUrl" class="flex-1" readonly />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(noSignalUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="noSignalUrl"
                  target="_blank"
                />
              </div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Sinal da transmissão</div>
              <div class="flex gap-2">
                <UInput
                  :model-value="streamSignalUrl"
                  class="flex-1"
                  readonly
                />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(streamSignalUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="streamSignalUrl"
                  target="_blank"
                />
              </div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">Deck da transmissão</div>
              <div class="flex gap-2">
                <UInput
                  :model-value="streamSignalDeckUrl"
                  class="flex-1"
                  readonly
                />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(streamSignalDeckUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="streamSignalDeckUrl"
                  target="_blank"
                />
              </div>
            </div>
            <div>
              <div class="text-sm font-medium mb-1">
                Deck com manchete aleatória
              </div>
              <div class="flex gap-2">
                <UInput
                  :model-value="streamSignalDeckRandomUrl"
                  class="flex-1"
                  readonly
                />
                <UButton
                  icon="i-lucide-copy"
                  variant="outline"
                  @click="copyUrl(streamSignalDeckRandomUrl)"
                />
                <UButton
                  icon="i-lucide-square-arrow-out-up-right"
                  variant="outline"
                  :to="streamSignalDeckRandomUrl"
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
