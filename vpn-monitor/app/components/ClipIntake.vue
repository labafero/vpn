<script setup lang="ts">
import * as v from 'valibot'
import type { ClipConsent, ClipSubmission } from '@vpn/contracts'
const props = defineProps<{ channelId: string }>()
const consent = ref<ClipConsent | null>(null)
const accepted = ref(false)
const busy = ref(false)
const loading = ref(true)
const message = ref('')
const success = ref(false)
const form = reactive({ url: '' })
const schema = v.object({
  url: v.pipe(v.string(), v.url('Informe uma URL Twitch válida.'), v.maxLength(2048))
})
const headers = { 'X-VPN-CSRF': '1' }
async function refresh() {
  loading.value = true
  message.value = ''
  try {
    consent.value = await $fetch<ClipConsent>(
      `/api/sentry/channels/${props.channelId}/clip-consent`
    )
  } catch {
    message.value = 'Não foi possível consultar o consentimento para clips.'
  } finally {
    loading.value = false
  }
}
async function authorize() {
  if (!accepted.value || busy.value) return
  busy.value = true
  message.value = ''
  success.value = false
  try {
    const result = await $fetch<{ authorizationUrl: string }>(
      '/api/sentry/provider-connections/twitch/authorize',
      {
        method: 'POST',
        headers,
        body: {
          consentVersion: 'clip-processing-v1',
          consentAccepted: true,
          capabilities: ['clip_download']
        }
      }
    )
    await navigateTo(result.authorizationUrl, { external: true })
  } catch {
    message.value =
      'Não foi possível solicitar a permissão Twitch. Seu vínculo permanece disponível.'
    busy.value = false
  }
}
async function setConsent(enabled: boolean) {
  if (busy.value || (enabled && !accepted.value)) return
  busy.value = true
  message.value = ''
  success.value = false
  try {
    consent.value = await $fetch<ClipConsent>(
      `/api/sentry/channels/${props.channelId}/clip-consent`,
      {
        method: 'PATCH',
        headers,
        body: enabled
          ? { manualEnabled: true, consentVersion: 'clip-processing-v1', consentAccepted: true }
          : { manualEnabled: false }
      }
    )
    accepted.value = false
  } catch {
    message.value =
      'Não foi possível atualizar o consentimento. Atualize o estado e tente novamente.'
  } finally {
    busy.value = false
  }
}
async function submit() {
  if (busy.value) return
  busy.value = true
  message.value = ''
  success.value = false
  try {
    const result = await $fetch<ClipSubmission>(`/api/sentry/channels/${props.channelId}/clips`, {
      method: 'POST',
      headers,
      body: { url: form.url }
    })
    message.value = result.duplicate
      ? 'Este clip já foi enviado. A submissão existente foi preservada.'
      : 'Referência recebida. O clip aguardará seu pedido antes de iniciar a transcrição.'
    success.value = true
    form.url = ''
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode
    message.value =
      (
        {
          400: 'URL inválida. Use o link de um clip Twitch.',
          403: 'Envio recusado. Confira o consentimento, a permissão Twitch e se o clip pertence ao seu canal.',
          404: 'Clip não encontrado na Twitch.'
        } as Record<number, string>
      )[status || 0] || 'Twitch ou VPN indisponível. Tente novamente mais tarde.'
  } finally {
    busy.value = false
  }
}
watch(() => props.channelId, refresh, { immediate: true })
</script>

<template>
  <section
    class="space-y-4 border-t border-default pt-5"
    aria-labelledby="clip-title"
  >
    <h2
      id="clip-title"
      class="text-lg font-semibold"
    >
      Clips do seu canal
    </h2>
    <p class="text-muted">
      Envie clips do seu próprio canal para análise privada de GTA RP +18. VODs e clips têm
      disponibilidade limitada e podem desaparecer; a VPN não garante recuperação futura. A
      transcrição integral e a mídia ficam temporárias durante o processamento.
    </p>
    <p
      v-if="loading"
      role="status"
    >
      Consultando consentimento…
    </p>
    <template v-else-if="consent">
      <p class="text-muted">
        Para permitir o uso de clips, a Twitch solicitará a permissão de gerenciar clips
        (channel:manage:clips), necessária ao download oficial. Esta permissão é separada do
        monitoramento de sessões. A captura agendada ainda está indisponível.
      </p>
      <template v-if="!consent.manualEnabled || !consent.canDownload">
        <UCheckbox
          v-model="accepted"
          :disabled="busy"
          label="Autorizo o uso privado de clips enviados por mim (clip-processing-v1)."
          description="Posso retirar este consentimento a qualquer momento. A VPN mantém referências e metadados; este envio não armazena vídeo."
        />
        <UButton
          v-if="!consent.canDownload"
          :disabled="!accepted"
          :loading="busy"
          @click="authorize"
        >
          Autorizar permissão na Twitch
        </UButton>
        <UButton
          v-else
          :disabled="!accepted"
          :loading="busy"
          @click="setConsent(true)"
        >
          Ativar envio manual
        </UButton>
      </template>
      <UForm
        v-if="consent.manualEnabled && consent.canDownload"
        :schema="schema"
        :state="form"
        class="space-y-3"
        @submit="submit"
      >
        <UFormField
          name="url"
          label="URL do clip Twitch"
          required
          description="Use clips.twitch.tv ou twitch.tv/canal/clip/ID."
        >
          <UInput
            v-model="form.url"
            type="url"
            class="w-full"
            :disabled="busy"
            placeholder="https://clips.twitch.tv/…"
          />
        </UFormField>
        <UButton
          type="submit"
          :loading="busy"
        >
          Enviar clip
        </UButton>
      </UForm>
      <UButton
        v-if="consent.manualEnabled"
        color="error"
        variant="outline"
        :loading="busy"
        @click="setConsent(false)"
      >
        Retirar consentimento e cancelar pendências
      </UButton>
    </template>
    <UAlert
      v-if="message"
      :color="success ? 'success' : 'error'"
      :description="message"
      :role="success ? 'status' : 'alert'"
    />
    <UButton
      color="neutral"
      variant="ghost"
      :disabled="busy || loading"
      @click="refresh"
    >
      Atualizar estado do consentimento
    </UButton>
    <UButton
      to="/clips"
      variant="outline"
    >
      Ver clips e detecções
    </UButton>
  </section>
</template>
