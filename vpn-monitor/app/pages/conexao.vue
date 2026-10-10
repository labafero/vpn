<script setup lang="ts">
import type { MonitoringChannel, TwitchConnection } from '@vpn/contracts'

definePageMeta({ middleware: 'auth', colorMode: 'dark' })
const connection = ref<TwitchConnection | null>(null)
const channels = ref<MonitoringChannel[]>([])
const consent = ref(false)
const monitoringConsent = ref(false)
const loading = ref(true)
const busy = ref(false)
const message = ref('')
const client = useSupabaseClient()
const statuses = { connected: 'Conectado', expired: 'Autorização expirada', revocation_pending: 'Revogação remota pendente', revoked: 'Desconectado' }
function monitoringStatus(channel: MonitoringChannel) {
  if (!channel.monitoringEnabled) return 'desligado'
  return ({ enabled: 'ativo', pending: 'ativação em andamento', error: 'falha de integração' } as Record<string, string>)[channel.subscriptionStatus || 'pending'] || 'ativação em andamento'
}

async function refresh() {
  loading.value = true
  message.value = ''
  try {
    connection.value = await $fetch<TwitchConnection | null>('/api/sentry/provider-connections/twitch')
    channels.value = await $fetch<MonitoringChannel[]>('/api/sentry/channels')
  } catch { message.value = 'Não foi possível consultar a conexão. Tente novamente.' } finally { loading.value = false }
}
async function setMonitoring(enabled: boolean) {
  if (!channels.value[0] || (enabled && !monitoringConsent.value)) return
  busy.value = true; message.value = ''
  try {
    await $fetch(`/api/sentry/channels/${channels.value[0].id}/monitoring`, { method: 'PATCH', headers: { 'X-VPN-CSRF': '1' }, body: enabled ? { enabled: true, consentVersion: 'monitoring-v2', consentAccepted: true } : { enabled: false } })
    monitoringConsent.value = false
    await refresh()
  } catch { message.value = 'Não foi possível atualizar o monitoramento. Tente novamente.' } finally { busy.value = false }
}
async function connect() {
  if (!consent.value || busy.value || loading.value || message.value) return
  busy.value = true
  try {
    const response = await $fetch<{ authorizationUrl: string }>('/api/sentry/provider-connections/twitch/authorize', { method: 'POST', headers: { 'X-VPN-CSRF': '1' }, body: { consentVersion: 'monitoring-v1', consentAccepted: consent.value } })
    await navigateTo(response.authorizationUrl, { external: true })
  } catch { message.value = 'Não foi possível iniciar a conexão. Verifique o vínculo e tente novamente.'; busy.value = false }
}
async function disconnect() {
  busy.value = true
  try {
    await $fetch('/api/sentry/provider-connections/twitch', { method: 'DELETE', headers: { 'X-VPN-CSRF': '1' } })
    consent.value = false
    await refresh()
  } catch { message.value = 'Não foi possível desconectar. Tente novamente.' } finally { busy.value = false }
}
async function logout() {
  await client.auth.signOut()
  await navigateTo('/login')
}
onMounted(refresh)
</script>

<template>
  <main class="min-h-screen bg-default p-6 text-default">
    <div class="mx-auto max-w-2xl space-y-6 py-10">
      <header class="flex items-center justify-between gap-4">
        <h1 class="text-3xl font-semibold">Conexão Twitch</h1>
        <UButton color="neutral" variant="outline" @click="logout">Sair</UButton>
      </header>
      <UCard>
        <p class="mb-4 text-muted">Vincule seu canal à sua conta VPN. O aceite deste vínculo não ativa o monitoramento; nenhuma captura de áudio ou vídeo é feita.</p>
        <div v-if="loading" role="status">Consultando conexão…</div>
        <template v-else>
          <div v-if="connection" class="mb-6 space-y-2">
            <p>Canal: <strong>{{ connection.login }}</strong></p>
            <UBadge color="neutral">{{ statuses[connection.status] }}</UBadge>
            <p v-if="connection.status === 'revocation_pending'" class="text-muted">O uso local está bloqueado. A VPN tentará revogar na Twitch por até 24 horas. Você também pode remover a integração nas configurações da Twitch.</p>
            <section v-if="connection.status === 'connected' && channels[0]" class="mt-6 space-y-3 border-t border-default pt-5">
              <h2 class="text-lg font-semibold">Monitoramento de sessões</h2>
              <p class="text-muted">A VPN registra somente metadados públicos de transmissões ao vivo: título, categoria e horários. Nenhum áudio ou vídeo é coletado ou reproduzido. Você pode desligar a qualquer momento; isso encerra a sessão local e invalida convites.</p>
              <p>Estado: <strong>{{ monitoringStatus(channels[0]) }}</strong></p>
              <template v-if="!channels[0].monitoringEnabled">
                <UCheckbox v-model="monitoringConsent" label="Aceito o monitoramento privado de sessões (monitoring-v2)." description="Esta autorização é separada do vínculo Twitch e começa desmarcada." />
                <UButton :disabled="!monitoringConsent" :loading="busy" @click="setMonitoring(true)">Ativar monitoramento</UButton>
              </template>
              <UButton v-else color="error" variant="outline" :loading="busy" @click="setMonitoring(false)">Desativar monitoramento</UButton>
            </section>
          </div>
          <p v-else class="mb-4 text-muted">Nenhum canal vinculado.</p>
          <template v-if="!connection || connection.canReconnect">
            <UCheckbox v-model="consent" label="Autorizo vincular meu canal Twitch à VPN." description="O administrador VPN pode acessar os metadados da conexão. Posso retirar esta autorização ao desconectar. O monitoramento tem consentimento separado." />
            <UButton class="mt-6" :disabled="!consent || !!message" :loading="busy" @click="connect">Conectar Twitch</UButton>
          </template>
          <UButton v-else color="error" variant="outline" :loading="busy" @click="disconnect">{{ connection.status === 'revocation_pending' ? 'Tentar revogar novamente' : 'Desconectar e retirar autorização' }}</UButton>
        </template>
        <UAlert v-if="message" class="mt-4" color="error" :description="message" role="alert" />
        <UButton class="mt-4" color="neutral" variant="ghost" :disabled="busy" @click="refresh">Atualizar estado</UButton>
      </UCard>
    </div>
  </main>
</template>
