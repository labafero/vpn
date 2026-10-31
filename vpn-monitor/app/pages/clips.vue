<script setup lang="ts">
import type { ClipSubmissionList, ClipSubmissionRecord, MonitoringChannel } from '@vpn/contracts'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })

const channels = ref<MonitoringChannel[]>([])
const clips = ref<ClipSubmissionRecord[]>([])
const loading = ref(true)
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

async function refresh() {
  loading.value = true
  errorMessage.value = ''
  notice.value = ''
  try {
    channels.value = await $fetch<MonitoringChannel[]>('/api/sentry/channels')
    const credential = await $fetch<{ configured: boolean; systemConfigured: boolean }>(
      '/api/sentry/me/openai-credential'
    )
    openAiConfigured.value = credential.configured
    systemOpenAiConfigured.value = credential.systemConfigured
    const channel = channels.value[0]
    clips.value = channel
      ? (await $fetch<ClipSubmissionList>(`/api/sentry/channels/${channel.id}/clips`)).items
      : []
  } catch {
    errorMessage.value = 'Não foi possível carregar seus clips. Tente novamente.'
  } finally {
    loading.value = false
  }
}

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

onMounted(refresh)
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
          @click="refresh"
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
        <h2 class="text-lg font-semibold">Nenhum clip enviado ainda</h2>
        <p class="mt-2 text-muted">Envie a URL de um clip do seu canal pela Conexão Twitch.</p>
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
                Recebido em {{ new Date(clip.receivedAt).toLocaleString('pt-BR') }}
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
    </div>
  </main>
</template>
