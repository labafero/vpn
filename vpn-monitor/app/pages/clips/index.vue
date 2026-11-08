<script setup lang="ts">
import type {
  ClipConsent,
  ClipSubmissionList,
  ClipSubmissionRecord,
  MonitoringChannel
} from '@vpn/contracts'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })

const route = useRoute()
const router = useRouter()
const channels = ref<MonitoringChannel[]>([])
const clips = ref<ClipSubmissionRecord[]>([])
const clipConsent = ref<ClipConsent | null>(null)
const scheduledAccepted = ref(false)
const historyAccepted = ref(false)
const nextCursor = ref<string | null>(null)
const loadedCursors = ref<string[]>([])
const loadingMore = ref(false)
const loading = ref(true)
const refreshing = ref(false)
const openAiConfigured = ref(false)
const systemOpenAiConfigured = ref(false)
const openAiApiKey = ref('')
const savingKey = ref(false)
const errorMessage = ref('')
const notice = ref('')
const stateFilter = ref('')
const captureModeFilter = ref('')
const titleFilter = ref('')

const tabItems: TabsItem[] = [
  { label: 'Clipes', value: 'clipes', slot: 'clipes' },
  { label: 'Gatilhos', value: 'gatilhos', slot: 'gatilhos' },
  { label: 'Chave OpenAI', value: 'openai', slot: 'openai' },
  { label: 'Captura agendada e histórico', value: 'captura', slot: 'captura' }
]
const tabValues = tabItems.map((item) => String(item.value))
const activeTab = computed({
  get: () =>
    typeof route.query.tab === 'string' && tabValues.includes(route.query.tab)
      ? route.query.tab
      : 'clipes',
  set: (tab: string) => router.replace({ query: { ...route.query, tab } })
})
const listFilters = computed(() => ({
  ...(stateFilter.value ? { state: stateFilter.value } : {}),
  ...(captureModeFilter.value ? { captureMode: captureModeFilter.value } : {}),
  ...(titleFilter.value.trim() ? { title: titleFilter.value.trim() } : {})
}))
const hasActiveFilters = computed(() => Object.keys(listFilters.value).length > 0)

const statuses: Record<
  string,
  { label: string; color: 'neutral' | 'warning' | 'success' | 'error' }
> = {
  pending_metadata: { label: 'Recebendo metadados', color: 'neutral' },
  pending_captions: { label: 'Aguardando processamento', color: 'neutral' },
  waiting_capacity: { label: 'Aguardando vaga de análise', color: 'neutral' },
  needs_trigger_phrases: { label: 'Configure frases-gatilho', color: 'warning' },
  needs_openai_key: { label: 'Adicione sua chave OpenAI', color: 'warning' },
  processing: { label: 'Analisando clip', color: 'warning' },
  completed: { label: 'Detecções encontradas', color: 'success' },
  no_match: { label: 'Concluído sem gatilhos', color: 'neutral' },
  source_unavailable: { label: 'Clip indisponível', color: 'error' },
  failed_retryable: { label: 'Falha temporária; nova tentativa automática', color: 'warning' },
  failed_terminal: { label: 'Não foi possível processar', color: 'error' },
  cancelled_consent: { label: 'Cancelado pelo consentimento', color: 'neutral' }
}
const stateOptions = [
  { label: 'Todos os estados', value: '' },
  ...Object.entries(statuses).map(([value, status]) => ({ label: status.label, value }))
]
const captureModeOptions = [
  { label: 'Todos os modos', value: '' },
  { label: 'Captura agendada', value: 'scheduled' },
  { label: 'Envio manual', value: 'manual' }
]

function statusFor(state: string) {
  return statuses[state] || { label: 'Estado desconhecido', color: 'neutral' as const }
}

function formatTimestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

let loadedChannelId: string | null = null
function listQuery(cursor?: string) {
  return { ...listFilters.value, ...(cursor ? { cursor } : {}) }
}

function clearFilters() {
  stateFilter.value = ''
  captureModeFilter.value = ''
  titleFilter.value = ''
}

function reloadFilteredClips() {
  if (refreshing.value || loadingMore.value) {
    filterTimer = setTimeout(reloadFilteredClips, 50)
    return
  }
  loadedCursors.value = []
  clips.value = []
  nextCursor.value = null
  void refresh()
}

async function refresh(options: { quiet?: boolean } = {}) {
  if (refreshing.value || loadingMore.value) return
  const quiet = options.quiet === true || clips.value.length > 0
  if (quiet) refreshing.value = true
  else loading.value = true
  errorMessage.value = ''
  if (!options.quiet) notice.value = ''
  try {
    channels.value = await $fetch<MonitoringChannel[]>('/api/sentry/channels')
    const credential = await $fetch<{ configured: boolean; systemConfigured: boolean }>(
      '/api/sentry/me/openai-credential'
    )
    openAiConfigured.value = credential.configured
    systemOpenAiConfigured.value = credential.systemConfigured
    const channel = channels.value[0]
    if (channel) {
      if (loadedChannelId !== channel.id) {
        loadedChannelId = channel.id
        loadedCursors.value = []
        clips.value = []
        nextCursor.value = null
      }
      const [consent, list] = await Promise.all([
        $fetch<ClipConsent>(`/api/sentry/channels/${channel.id}/clip-consent`),
        $fetch<ClipSubmissionList>(`/api/sentry/channels/${channel.id}/clips`, {
          query: listQuery()
        })
      ])
      const pages = [list]
      const pageCursors: string[] = []
      const loadedPageCount = loadedCursors.value.length + 1
      while (pages.length < loadedPageCount) {
        const cursor = pages.at(-1)?.nextCursor
        if (!cursor) break
        pageCursors.push(cursor)
        pages.push(
          await $fetch<ClipSubmissionList>(`/api/sentry/channels/${channel.id}/clips`, {
            query: listQuery(cursor)
          })
        )
      }
      clipConsent.value = consent
      const loaded = new Map<string, ClipSubmissionRecord>()
      for (const item of pages.flatMap((page) => page.items))
        if (!loaded.has(item.id)) loaded.set(item.id, item)
      clips.value = [...loaded.values()]
      loadedCursors.value = pageCursors
      nextCursor.value = pages.at(-1)?.nextCursor ?? null
    } else {
      loadedChannelId = null
      loadedCursors.value = []
      clipConsent.value = null
      clips.value = []
      nextCursor.value = null
    }
  } catch {
    errorMessage.value = 'Não foi possível carregar seus clips. Tente novamente.'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

async function loadMore() {
  const channel = channels.value[0]
  const cursor = nextCursor.value
  if (!channel || !cursor || loadingMore.value || refreshing.value) return
  loadingMore.value = true
  try {
    const page = await $fetch<ClipSubmissionList>(`/api/sentry/channels/${channel.id}/clips`, {
      query: listQuery(cursor)
    })
    loadedCursors.value.push(cursor)
    clips.value.push(...page.items)
    nextCursor.value = page.nextCursor
  } catch {
    errorMessage.value = 'Não foi possível carregar mais clips. Tente novamente.'
  } finally {
    loadingMore.value = false
  }
}

let filterTimer: ReturnType<typeof setTimeout> | undefined
watch([stateFilter, captureModeFilter, titleFilter], () => {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(reloadFilteredClips, 250)
})

async function setScheduledConsent(enabled: boolean) {
  const channel = channels.value[0]
  if (!channel || !clipConsent.value || (enabled && !scheduledAccepted.value)) return
  errorMessage.value = ''
  notice.value = ''
  try {
    clipConsent.value = await $fetch<ClipConsent>(
      `/api/sentry/channels/${channel.id}/clip-consent`,
      {
        method: 'PATCH',
        headers: { 'X-VPN-CSRF': '1' },
        body: enabled
          ? {
              scheduledEnabled: true,
              scheduledConsentVersion: 'clip-scheduled-v2',
              scheduledConsentAccepted: true
            }
          : { scheduledEnabled: false }
      }
    )
    scheduledAccepted.value = false
    await refresh()
    notice.value = enabled
      ? 'Captura futura ativada. Clips novos serão consultados periodicamente.'
      : 'Captura agendada desativada. Novas consultas foram interrompidas.'
  } catch {
    errorMessage.value =
      'Não foi possível atualizar a captura agendada. Confira a permissão Twitch e tente novamente.'
  }
}

async function setScheduledHistoryConsent(enabled: boolean) {
  const channel = channels.value[0]
  if (!channel || !clipConsent.value || (enabled && !historyAccepted.value)) return
  errorMessage.value = ''
  notice.value = ''
  try {
    clipConsent.value = await $fetch<ClipConsent>(
      `/api/sentry/channels/${channel.id}/clip-consent`,
      {
        method: 'PATCH',
        headers: { 'X-VPN-CSRF': '1' },
        body: enabled
          ? {
              scheduledHistoryEnabled: true,
              scheduledHistoryConsentVersion: 'clip-history-v1',
              scheduledHistoryConsentAccepted: true
            }
          : { scheduledHistoryEnabled: false }
      }
    )
    historyAccepted.value = false
    await refresh()
    notice.value = enabled
      ? 'A importação histórica começou. O escopo vai da criação do canal Twitch até esta autorização.'
      : 'Importação histórica interrompida. A captura futura continua ativa.'
  } catch {
    errorMessage.value = 'Não foi possível atualizar a importação histórica. Tente novamente.'
  }
}

let refreshTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  void refresh()
  refreshTimer = setInterval(() => {
    if (!loading.value && !refreshing.value && !loadingMore.value) void refresh({ quiet: true })
  }, 30000)
})
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
  if (filterTimer) clearTimeout(filterTimer)
})

async function saveOpenAiKey() {
  if (!openAiApiKey.value.trim() || savingKey.value) return
  savingKey.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    await $fetch('/api/sentry/me/openai-credential', {
      method: 'POST',
      headers: { 'X-VPN-CSRF': '1' },
      body: { apiKey: openAiApiKey.value.trim() }
    })
    openAiConfigured.value = true
    openAiApiKey.value = ''
    notice.value = 'Chave pessoal salva como alternativa à chave OpenAI do sistema.'
    await refresh()
  } catch {
    errorMessage.value = 'Não foi possível salvar a chave. Confira o formato e tente novamente.'
  } finally {
    savingKey.value = false
  }
}

async function removeOpenAiKey() {
  savingKey.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    await $fetch('/api/sentry/me/openai-credential', {
      method: 'DELETE',
      headers: { 'X-VPN-CSRF': '1' }
    })
    openAiConfigured.value = false
    notice.value = 'Chave pessoal removida. A chave OpenAI do sistema continua disponível.'
    await refresh()
  } catch {
    errorMessage.value = 'Não foi possível remover a chave. Tente novamente.'
  } finally {
    savingKey.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 sm:py-12">
    <div class="mx-auto max-w-3xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <p class="text-sm uppercase tracking-[0.3em] text-primary">VPN Monitor</p>
          <h1 class="text-3xl font-semibold sm:text-4xl">Seus clips</h1>
          <p class="max-w-2xl text-neutral-300">
            Acompanhe seus clips, ajuste frases-gatilho e controle as configurações da análise e da
            captura do seu canal.
          </p>
        </div>
        <UButton
          color="neutral"
          variant="outline"
          :disabled="loading"
          @click="() => refresh()"
        >
          Atualizar
        </UButton>
      </header>

      <UAlert
        v-if="notice"
        color="success"
        :description="notice"
        role="status"
      />
      <UAlert
        v-if="errorMessage"
        color="error"
        :description="errorMessage"
        role="alert"
      />
      <UTabs
        v-model="activeTab"
        :items="tabItems"
        :unmount-on-hide="false"
        class="w-full"
      >
        <template #openai>
          <div class="space-y-4 pt-5">
            <UCard class="text-default">
              <div class="space-y-4">
                <div>
                  <h2 class="text-lg font-semibold">Sua chave OpenAI</h2>
                  <p class="mt-1 text-sm text-muted">
                    Sua chave é criptografada e usada somente se a central não estiver configurada.
                    Nesse caso, o consumo é cobrado na sua conta OpenAI; o consumo da chave central
                    é cobrado no projeto.
                  </p>
                </div>
                <form
                  class="flex flex-wrap items-end gap-3"
                  @submit.prevent="saveOpenAiKey"
                >
                  <UFormField
                    label="Chave API"
                    class="min-w-64 flex-1"
                  >
                    <UInput
                      v-model="openAiApiKey"
                      type="password"
                      autocomplete="new-password"
                      placeholder="sk-…"
                    />
                  </UFormField>
                  <UButton
                    type="submit"
                    :loading="savingKey"
                    :disabled="!openAiApiKey.trim()"
                  >
                    {{ openAiConfigured ? 'Substituir chave' : 'Salvar chave' }}
                  </UButton>
                  <UButton
                    v-if="openAiConfigured"
                    type="button"
                    color="error"
                    variant="outline"
                    :loading="savingKey"
                    @click="removeOpenAiKey"
                  >
                    Remover
                  </UButton>
                </form>
                <p class="text-sm text-muted">
                  <span v-if="systemOpenAiConfigured">
                    Chave do sistema disponível e usada primeiro.
                  </span>
                  <span v-else>Chave do sistema indisponível.</span>
                  <span v-if="openAiConfigured">Chave pessoal configurada como alternativa.</span>
                  <span v-else>Nenhuma chave pessoal configurada.</span>
                  <a
                    class="ml-2 underline underline-offset-4"
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Gerenciar chaves
                  </a>
                </p>
              </div>
            </UCard>
          </div>
        </template>
        <template #captura>
          <div class="space-y-4 pt-5">
            <UCard
              v-if="clipConsent"
              class="text-default"
            >
              <div class="space-y-4">
                <div>
                  <h2 class="text-lg font-semibold">Captura agendada</h2>
                  <p class="mt-1 text-sm text-muted">
                    A captura futura consulta periodicamente clips novos. Os metadados ficam
                    disponíveis para análise; mídia e transcrição integral são temporárias.
                  </p>
                </div>
                <UAlert
                  v-if="!clipConsent.canDownload"
                  color="warning"
                  title="Permissão Twitch necessária"
                  description="A captura precisa da permissão channel:manage:clips para consultar e baixar clips do seu canal."
                />
                <UCheckbox
                  v-if="!clipConsent.scheduledEnabled"
                  v-model="scheduledAccepted"
                  :disabled="!clipConsent.canDownload"
                  label="Autorizo a captura futura de clips (clip-scheduled-v2)."
                  description="A captura começa nesta autorização e não consulta clips anteriores."
                />
                <div class="flex flex-wrap gap-3">
                  <UButton
                    v-if="clipConsent.scheduledEnabled"
                    color="error"
                    variant="outline"
                    @click="setScheduledConsent(false)"
                  >
                    Desativar captura agendada
                  </UButton>
                  <UButton
                    v-else-if="clipConsent.canDownload"
                    :disabled="!scheduledAccepted"
                    @click="setScheduledConsent(true)"
                  >
                    Ativar captura futura
                  </UButton>
                  <UButton
                    v-else
                    to="/conexao"
                    variant="outline"
                  >
                    Revisar conexão Twitch
                  </UButton>
                  <UBadge
                    v-if="clipConsent.scheduledEnabled"
                    color="success"
                  >
                    Captura agendada ativa
                  </UBadge>
                </div>
                <div
                  v-if="clipConsent.scheduledEnabled"
                  class="space-y-3 border-t border-default pt-4"
                >
                  <h3 class="font-medium">Importação histórica (opcional)</h3>
                  <p class="text-sm text-muted">
                    Se autorizada, consulta clips desde a criação do canal Twitch até o momento
                    desta autorização. A captura futura continua ativa se você recusar ou revogar
                    esta opção.
                  </p>
                  <UCheckbox
                    v-if="!clipConsent.scheduledHistoryEnabled"
                    v-model="historyAccepted"
                    label="Autorizo consultar e importar clips históricos (clip-history-v1)."
                  />
                  <div class="flex flex-wrap items-center gap-3">
                    <UButton
                      v-if="!clipConsent.scheduledHistoryEnabled"
                      :disabled="!historyAccepted"
                      @click="setScheduledHistoryConsent(true)"
                    >
                      Autorizar importação histórica
                    </UButton>
                    <UButton
                      v-else
                      color="error"
                      variant="outline"
                      @click="setScheduledHistoryConsent(false)"
                    >
                      Interromper importação histórica
                    </UButton>
                    <UBadge
                      v-if="clipConsent.scheduledHistoryEnabled"
                      color="success"
                    >
                      Importação histórica autorizada
                    </UBadge>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </template>
        <template #gatilhos>
          <div class="pt-5">
            <ClipTriggerPhrases :channel-id="channels[0]?.id ?? null" />
          </div>
        </template>
        <template #clipes>
          <div class="space-y-4 pt-5">
            <div class="flex flex-wrap items-end gap-3">
              <UFormField label="Estado">
                <USelect
                  v-model="stateFilter"
                  :items="stateOptions"
                  class="min-w-52"
                />
              </UFormField>
              <UFormField label="Modo de captura">
                <USelect
                  v-model="captureModeFilter"
                  :items="captureModeOptions"
                  class="min-w-48"
                />
              </UFormField>
              <UFormField
                label="Buscar título"
                class="min-w-56 flex-1"
              >
                <UInput
                  v-model="titleFilter"
                  type="search"
                  maxlength="200"
                  placeholder="Digite parte do título"
                  class="w-full"
                />
              </UFormField>
              <UButton
                v-if="hasActiveFilters"
                color="neutral"
                variant="ghost"
                @click="clearFilters"
              >
                Limpar filtros
              </UButton>
            </div>
            <p
              v-if="refreshing"
              role="status"
              class="text-sm text-muted"
            >
              Atualizando lista…
            </p>
            <p
              v-if="loading"
              role="status"
              class="text-neutral-300"
            >
              Carregando clips…
            </p>
            <UCard
              v-else-if="!clips.length"
              class="text-default"
            >
              <h2 class="text-lg font-semibold">
                {{
                  hasActiveFilters
                    ? 'Nenhum clip corresponde aos filtros'
                    : 'Nenhum clip importado ainda'
                }}
              </h2>
              <p class="mt-2 text-muted">
                {{
                  hasActiveFilters
                    ? 'Altere ou limpe os filtros para ver outros clips.'
                    : 'Envie um clip manualmente na Conexão Twitch ou confira as opções de captura na aba correspondente.'
                }}
              </p>
              <UButton
                v-if="!hasActiveFilters"
                class="mt-4"
                to="/conexao"
                variant="outline"
              >
                Conexão Twitch
              </UButton>
            </UCard>
            <div
              v-else-if="clips.length"
              class="space-y-4"
            >
              <UCard
                v-for="clip in clips"
                :key="clip.id"
                class="text-default"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0 space-y-1">
                    <h2 class="wrap-anywhere text-lg font-semibold">
                      {{ clip.title || 'Clip Twitch' }}
                    </h2>
                    <p class="text-sm text-muted">
                      Criado em
                      {{
                        clip.createdAt
                          ? new Date(clip.createdAt).toLocaleString('pt-BR')
                          : 'data indisponível'
                      }}
                      <span aria-hidden="true">·</span>
                      {{ clip.captureMode === 'scheduled' ? 'Captura agendada' : 'Envio manual' }}
                      <span
                        v-if="clip.viewCount !== null"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                      <span v-if="clip.viewCount !== null">
                        {{ clip.viewCount.toLocaleString('pt-BR') }} visualizações
                      </span>
                    </p>
                  </div>
                  <UBadge :color="statusFor(clip.state).color">
                    {{ statusFor(clip.state).label }}
                  </UBadge>
                </div>

                <ul
                  v-if="clip.detections.length"
                  class="mt-4 space-y-2 border-t border-default pt-4"
                  aria-label="Gatilhos detectados"
                >
                  <li
                    v-for="(detection, index) in clip.detections"
                    :key="`${detection.phraseId}-${detection.startMs}-${index}`"
                    class="flex flex-wrap items-center gap-x-3 gap-y-1"
                  >
                    <span class="font-medium">{{ detection.phrase }}</span>
                    <span class="font-mono text-sm text-muted">
                      {{ formatTimestamp(detection.startMs) }}–{{
                        formatTimestamp(detection.endMs)
                      }}
                    </span>
                    <UBadge
                      color="neutral"
                      variant="outline"
                    >
                      {{ detection.source === 'openai' ? 'OpenAI' : 'Captions Twitch' }}
                    </UBadge>
                  </li>
                </ul>

                <div class="mt-4 flex flex-wrap items-center gap-3 border-t border-default pt-4">
                  <UButton
                    :to="`/clips/${clip.id}`"
                    variant="outline"
                  >
                    Ver informações e evidências
                  </UButton>
                  <a
                    class="inline-flex min-h-11 items-center underline underline-offset-4"
                    :href="clip.canonicalUrl"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir clip na Twitch
                  </a>
                </div>
              </UCard>
            </div>
            <div
              v-if="nextCursor"
              class="flex justify-center"
            >
              <UButton
                variant="outline"
                :loading="loadingMore"
                :disabled="refreshing"
                @click="loadMore"
              >
                Carregar mais clips
              </UButton>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </main>
</template>
