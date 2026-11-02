<script setup lang="ts">
import type { ClipDetail, MonitoringChannel } from '@vpn/contracts'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })
const route = useRoute()
const loading = ref(true)
const errorMessage = ref('')
const clip = ref<ClipDetail | null>(null)
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

onMounted(refresh)
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
          <a
            class="mt-5 inline-flex min-h-11 items-center underline underline-offset-4"
            :href="clip.canonicalUrl"
            target="_blank"
            rel="noreferrer"
          >
            Abrir clip na Twitch
          </a>
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
