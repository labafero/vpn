<script setup lang="ts">
import type {
  ClipConsent,
  ClipSubmissionList,
  ClipSubmissionRecord,
  MonitoringChannel
} from '@vpn/contracts'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })

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

function statusFor(state: string) {
  return statuses[state] || { label: 'Estado desconhecido', color: 'neutral' as const }
}

function formatTimestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

let loadedChannelId: string | null = null
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
        $fetch<ClipSubmissionList>(`/api/sentry/channels/${channel.id}/clips`)
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
            query: { cursor }
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
      query: { cursor }
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
            O sistema usa primeiro a chave OpenAI central e depois sua chave pessoal. Sem nenhuma
            delas, o clip aguarda sem transcrição.
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
        <UButton
          to="/clips/gatilhos"
          variant="outline"
        >
          Configurar frases-gatilho
        </UButton>
      </header>

      <UAlert
        v-if="notice"
        color="success"
        :description="notice"
        role="status"
      />
      <UCard class="text-default">
        <div class="space-y-4">
          <div>
            <h2 class="text-lg font-semibold">Sua chave OpenAI</h2>
            <p class="mt-1 text-sm text-muted">
              Sua chave é criptografada e usada somente se a central não estiver configurada. Nesse
              caso, o consumo é cobrado na sua conta OpenAI; o consumo da chave central é cobrado no
              projeto.
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
            <span v-if="systemOpenAiConfigured">Chave do sistema disponível e usada primeiro.</span>
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
      <UCard
        v-if="clipConsent"
        class="text-default"
      >
        <div class="space-y-4">
          <div>
            <h2 class="text-lg font-semibold">Captura agendada</h2>
            <p class="mt-1 text-sm text-muted">
              A captura futura consulta periodicamente clips novos. Os metadados ficam disponíveis
              para análise; mídia e transcrição integral são temporárias.
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
              Se autorizada, consulta clips desde a criação do canal Twitch até o momento desta
              autorização. A captura futura continua ativa se você recusar ou revogar esta opção.
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
      <UAlert
        v-if="errorMessage"
        color="error"
        :description="errorMessage"
        role="alert"
      />
      <p
        v-if="loading"
        role="status"
        class="text-neutral-300"
      >
        Carregando clips…
      </p>
      <UCard
        v-else-if="!clips.length && !errorMessage"
        class="text-default"
      >
        <h2 class="text-lg font-semibold">Nenhum clip importado ainda</h2>
        <p class="mt-2 text-muted">
          Ative a captura agendada para importar o histórico ou envie um clip manualmente na Conexão
          Twitch.
        </p>
        <UButton
          class="mt-4"
          to="/conexao"
          variant="outline"
        >
          Conexão Twitch
        </UButton>
      </UCard>
      <div
        v-else
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
                {{ formatTimestamp(detection.startMs) }}–{{ formatTimestamp(detection.endMs) }}
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
  </main>
</template>
