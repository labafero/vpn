<script setup lang="ts">
import type { ClipDetail, MonitoringChannel } from '@vpn/contracts'
import { captureTwitchCaptions } from '../../utils/twitch-captions'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })
const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const clip = ref<ClipDetail | null>(null)
const selectedDetectionIndex = ref(0)
const embedParent = ref('')
const updatingApproval = ref(false)
const retrying = ref(false)
const retryMessage = ref('')
const retryError = ref('')
const capturingCaptions = ref(false)
const retryPlayerId = 'clip-retry-twitch-player'
const statusLabels: Record<string, string> = {
  pending_metadata: 'Recebendo metadados',
  pending_captions: 'Aguardando processamento',
  waiting_capacity: 'Aguardando vaga de análise',
  needs_trigger_phrases: 'Configure frases-gatilho',
  needs_openai_key: 'Aguardando uma chave OpenAI',
  processing: 'Analisando clip',
  completed: 'Detecções encontradas',
  no_match: 'Concluído sem gatilhos',
  source_unavailable: 'Clip indisponível',
  failed_retryable: 'Falha temporária; nova tentativa automática',
  failed_terminal: 'Não foi possível processar',
  cancelled_consent: 'Cancelado pelo consentimento'
}
function formatTimestamp(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function formatTwitchTime(seconds: number) {
  const wholeSeconds = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(wholeSeconds / 3600)
  const minutes = Math.floor((wholeSeconds % 3600) / 60)
  const remainder = wholeSeconds % 60
  return `${hours ? `${hours}h` : ''}${minutes ? `${minutes}m` : ''}${remainder}s`
}

const selectedEvidenceSeconds = computed(() => {
  const detection = clip.value?.detections[selectedDetectionIndex.value]
  return clip.value?.vodOffset === null || clip.value?.vodOffset === undefined
    ? null
    : clip.value.vodOffset + (detection?.startMs ?? 0) / 1000
})
const twitchPlayerUrl = computed(() => {
  if (!clip.value?.videoId || selectedEvidenceSeconds.value === null || !embedParent.value)
    return null
  const url = new URL('https://player.twitch.tv/')
  url.searchParams.set('video', `v${clip.value.videoId}`)
  url.searchParams.set('time', formatTwitchTime(selectedEvidenceSeconds.value))
  url.searchParams.set('autoplay', 'false')
  url.searchParams.set('parent', embedParent.value)
  return url.toString()
})
function twitchVideoUrl(startSeconds: number) {
  if (!clip.value?.videoId) return ''
  const url = new URL(`https://www.twitch.tv/videos/${clip.value.videoId}`)
  url.searchParams.set('t', formatTwitchTime(startSeconds))
  return url.toString()
}

const canRetry = computed(
  () =>
    clip.value &&
    ['source_unavailable', 'failed_retryable', 'failed_terminal', 'needs_openai_key'].includes(
      clip.value.state
    )
)

const failureMessage = computed(() => {
  if (clip.value?.failureCode === 'quota_exceeded')
    return 'A chave OpenAI não tem créditos disponíveis ou atingiu o limite de gastos. Confira o faturamento e os limites do projeto OpenAI antes de tentar novamente.'
  if (clip.value?.state === 'needs_openai_key')
    return 'Não há chave OpenAI configurada para processar este clip.'
  return clip.value?.failureCode
    ? `Falha registrada: ${clip.value.failureCode}. Você pode tentar novamente.`
    : ''
})

async function retryClip() {
  if (!clip.value || retrying.value) return
  const currentClip = clip.value
  retrying.value = true
  retryMessage.value = ''
  retryError.value = ''
  let channel: MonitoringChannel | undefined
  try {
    channel = (await $fetch<MonitoringChannel[]>('/api/sentry/channels'))[0]
    if (!channel) throw new Error('Canal ausente')
    const retry = await $fetch<{
      mode: 'captions' | 'openai' | 'none'
      state: string
      retryToken: string | null
      videoId: string | null
      vodOffset: number | null
      durationSeconds: number | null
    }>(`/api/sentry/channels/${channel.id}/clips/${currentClip.id}/retry`, {
      method: 'POST',
      headers: { 'X-VPN-CSRF': '1' }
    })
    if (retry.mode === 'none') {
      retryMessage.value = 'Configure ao menos uma frase-gatilho antes de tentar novamente.'
    } else if (retry.mode === 'openai') {
      retryMessage.value = 'Nova tentativa enviada para a fila de transcrição OpenAI.'
    } else if (
      retry.retryToken &&
      retry.videoId &&
      retry.vodOffset !== null &&
      retry.durationSeconds !== null
    ) {
      capturingCaptions.value = true
      retryMessage.value = 'Reproduzindo o VOD para procurar legendas da Twitch…'
      await nextTick()
      const segments = await captureTwitchCaptions({
        elementId: retryPlayerId,
        videoId: retry.videoId,
        vodOffset: retry.vodOffset,
        durationSeconds: retry.durationSeconds
      }).catch(() => [])
      if (segments.length) {
        const result = await $fetch<{ state: string; matches: number }>(
          `/api/sentry/channels/${channel.id}/clips/${currentClip.id}/retry/captions`,
          {
            method: 'POST',
            headers: { 'X-VPN-CSRF': '1' },
            body: { retryToken: retry.retryToken, segments }
          }
        )
        retryMessage.value =
          result.state === 'completed'
            ? `${result.matches} evidência(s) encontrada(s) nas legendas da Twitch.`
            : result.state === 'no_match'
              ? 'Legendas encontradas, mas nenhuma frase-gatilho apareceu neste clip.'
              : 'A análise foi interrompida porque o consentimento mudou.'
      } else {
        const result = await $fetch<{ state: string }>(
          `/api/sentry/channels/${channel.id}/clips/${currentClip.id}/retry/openai`,
          {
            method: 'POST',
            headers: { 'X-VPN-CSRF': '1' },
            body: { retryToken: retry.retryToken }
          }
        )
        retryMessage.value =
          result.state === 'cancelled_consent'
            ? 'A análise foi interrompida porque o consentimento mudou.'
            : 'A Twitch não disponibilizou legendas para este trecho. O clip foi enviado para transcrição OpenAI.'
      }
    }
  } catch {
    retryError.value = 'Não foi possível iniciar ou concluir a nova tentativa. Tente novamente.'
  } finally {
    capturingCaptions.value = false
    retrying.value = false
    await refresh()
  }
}

async function refresh() {
  loading.value = true
  errorMessage.value = ''
  try {
    const channels = await $fetch<MonitoringChannel[]>('/api/sentry/channels')
    const channel = channels[0]
    if (!channel) throw new Error('Canal ausente')
    clip.value = await $fetch<ClipDetail>(
      `/api/sentry/channels/${channel.id}/clips/${route.params.id}`
    )
  } catch {
    errorMessage.value = 'Não foi possível carregar as informações deste clip.'
  } finally {
    loading.value = false
  }
}

async function toggleApproval() {
  if (!clip.value || updatingApproval.value) return
  updatingApproval.value = true
  errorMessage.value = ''
  try {
    const channel = (await $fetch<MonitoringChannel[]>('/api/sentry/channels'))[0]
    if (!channel) throw new Error('Canal ausente')
    const result = await $fetch<{ approvedAt: string | null }>(
      `/api/sentry/channels/${channel.id}/clips/${route.params.id}`,
      {
        method: 'PATCH',
        headers: { 'X-VPN-CSRF': '1' },
        body: { approved: !clip.value.approvedAt }
      }
    )
    clip.value.approvedAt = result.approvedAt
  } catch {
    errorMessage.value = 'Não foi possível atualizar esta evidência.'
  } finally {
    updatingApproval.value = false
  }
}

onMounted(refresh)
onMounted(() => {
  embedParent.value = window.location.hostname
})
</script>

<template>
  <main class="min-h-screen bg-neutral-950 px-4 py-8 text-white sm:px-6 sm:py-12">
    <div class="mx-auto max-w-3xl space-y-6">
      <header class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-2">
          <p class="text-sm uppercase tracking-[0.3em] text-primary">VPN Monitor · evidências</p>
          <h1 class="text-3xl font-semibold sm:text-4xl">Detalhes do clip</h1>
        </div>
        <UButton
          to="/clips"
          variant="outline"
        >
          Voltar aos clips
        </UButton>
      </header>

      <p
        v-if="loading"
        role="status"
        class="text-muted"
      >
        Carregando informações…
      </p>
      <UAlert
        v-else-if="errorMessage"
        color="error"
        :description="errorMessage"
        role="alert"
      />
      <template v-else-if="clip">
        <p
          v-if="retryMessage"
          role="status"
          class="text-sm text-muted"
        >
          {{ retryMessage }}
        </p>
        <UCard class="text-default">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="wrap-anywhere text-2xl font-semibold">
                {{ clip.title || 'Clip Twitch' }}
              </h2>
              <p class="mt-2 text-sm text-muted">
                Criado em
                {{
                  clip.createdAt
                    ? new Date(clip.createdAt).toLocaleString('pt-BR')
                    : 'data indisponível'
                }}
                · {{ clip.captureMode === 'scheduled' ? 'Captura agendada' : 'Envio manual' }}
              </p>
            </div>
            <UBadge color="neutral">{{ statusLabels[clip.state] || 'Estado desconhecido' }}</UBadge>
          </div>
          <dl class="mt-5 grid gap-4 border-t border-default pt-5 sm:grid-cols-2">
            <div>
              <dt class="text-sm text-muted">Criador</dt>
              <dd class="font-mono">{{ clip.creatorId || 'Indisponível' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Idioma</dt>
              <dd>{{ clip.language || 'Indisponível' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Duração</dt>
              <dd>
                {{
                  clip.durationSeconds === null
                    ? 'Indisponível'
                    : `${clip.durationSeconds.toFixed(1)} s`
                }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Visualizações</dt>
              <dd>
                {{
                  clip.viewCount === null ? 'Indisponível' : clip.viewCount.toLocaleString('pt-BR')
                }}
              </dd>
            </div>
            <div>
              <dt class="text-sm text-muted">VOD</dt>
              <dd>{{ clip.videoId || 'Não disponível' }}</dd>
            </div>
            <div>
              <dt class="text-sm text-muted">Offset no VOD</dt>
              <dd>
                {{
                  clip.vodOffset === null
                    ? 'Não disponível'
                    : `${formatTimestamp(clip.vodOffset * 1000)}`
                }}
              </dd>
            </div>
          </dl>
          <section class="mt-5 border-t border-default pt-4">
            <h3 class="text-lg font-semibold">Trecho do VOD</h3>
            <p class="mt-1 text-sm text-muted">
              A reprodução começa sem áudio e sem reprodução automática. Use os controles do player
              para iniciar.
            </p>
            <iframe
              v-if="twitchPlayerUrl"
              class="mt-4 aspect-video min-h-[300px] w-full min-w-[400px] rounded-lg bg-neutral-900"
              :src="twitchPlayerUrl"
              title="Player oficial da Twitch no trecho do VOD"
              allowfullscreen
            />
            <p
              v-else
              role="status"
              class="mt-4 text-sm text-muted"
            >
              Não é possível abrir o trecho do VOD porque o vídeo ou o offset não está disponível. O
              link canônico do clip e os timestamps das evidências continuam disponíveis.
            </p>
          </section>
          <a
            class="mt-5 inline-flex min-h-11 items-center underline underline-offset-4"
            :href="clip.canonicalUrl"
            target="_blank"
            rel="noreferrer"
          >
            Abrir clip na Twitch
          </a>
          <section
            v-if="canRetry"
            class="mt-5 space-y-3 border-t border-default pt-4"
            aria-labelledby="retry-heading"
          >
            <h2
              id="retry-heading"
              class="text-lg font-semibold"
            >
              Nova tentativa de processamento
            </h2>
            <p class="text-sm text-muted">
              Primeiro verificamos as legendas do VOD da Twitch. Se não estiverem disponíveis,
              tentamos transcrever o áudio com OpenAI.
            </p>
            <p
              v-if="failureMessage"
              class="text-sm text-warning"
            >
              {{ failureMessage }}
            </p>
            <UAlert
              v-if="retryError"
              color="error"
              :description="retryError"
              role="alert"
            />
            <div
              v-if="capturingCaptions"
              :id="retryPlayerId"
              class="min-h-[300px] min-w-[400px] max-w-full overflow-hidden rounded-lg bg-neutral-900"
            />
            <UButton
              :loading="retrying"
              :disabled="retrying"
              @click="retryClip"
            >
              Tentar novamente
            </UButton>
          </section>
          <div
            v-if="clip.state === 'completed'"
            class="mt-5 border-t border-default pt-4"
          >
            <p class="mb-3 text-sm text-muted">
              {{
                clip.approvedAt
                  ? 'Este clip está aprovado como evidência.'
                  : 'Aprove este clip para incluí-lo na sessão compartilhada.'
              }}
            </p>
            <UButton
              :loading="updatingApproval"
              :color="clip.approvedAt ? 'neutral' : 'primary'"
              :variant="clip.approvedAt ? 'outline' : 'solid'"
              @click="toggleApproval"
            >
              {{ clip.approvedAt ? 'Remover aprovação' : 'Aprovar como evidência' }}
            </UButton>
          </div>
        </UCard>

        <UCard class="text-default">
          <h2 class="text-xl font-semibold">Evidências detectadas</h2>
          <p class="mt-1 text-sm text-muted">
            Cada intervalo aponta para o trecho do clip em que a frase foi encontrada. O sistema não
            mantém a transcrição integral.
          </p>
          <ul
            v-if="clip.detections.length"
            class="mt-5 divide-y divide-default"
          >
            <li
              v-for="(detection, index) in clip.detections"
              :key="`${detection.phraseId}-${detection.startMs}-${index}`"
              class="flex flex-wrap items-center gap-3 py-4"
            >
              <span class="font-medium">{{ detection.phrase }}</span>
              <span class="font-mono text-sm text-muted">
                {{ formatTimestamp(detection.startMs) }}–{{ formatTimestamp(detection.endMs) }}
              </span>
              <UBadge
                color="neutral"
                variant="outline"
              >
                {{ detection.source === 'openai' ? 'OpenAI' : 'Legendas Twitch' }}
              </UBadge>
              <span class="text-xs text-muted">Versão {{ detection.phraseVersion }}</span>
              <div
                v-if="clip.videoId && clip.vodOffset !== null"
                class="flex flex-wrap items-center gap-3"
              >
                <UButton
                  size="sm"
                  variant="outline"
                  :aria-pressed="selectedDetectionIndex === index"
                  @click="selectedDetectionIndex = index"
                >
                  Carregar trecho no player
                </UButton>
                <a
                  class="inline-flex min-h-11 items-center underline underline-offset-4"
                  :href="twitchVideoUrl(clip.vodOffset + detection.startMs / 1000)"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir trecho na Twitch
                </a>
              </div>
            </li>
          </ul>
          <p
            v-else
            class="mt-4 text-muted"
          >
            {{
              clip.state === 'needs_trigger_phrases'
                ? 'Configure frases-gatilho para iniciar a análise.'
                : 'Nenhuma evidência disponível neste estado.'
            }}
          </p>
          <UButton
            v-if="clip.state === 'needs_trigger_phrases'"
            class="mt-4"
            to="/clips/gatilhos"
            variant="outline"
          >
            Configurar frases-gatilho
          </UButton>
        </UCard>
      </template>
    </div>
  </main>
</template>
