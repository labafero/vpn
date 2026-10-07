<script setup lang="ts">
import type { TwitchConnection } from '@vpn/contracts'

definePageMeta({ middleware: 'auth' })
const connection = ref<TwitchConnection | null>(null)
const consent = ref(false)
const loading = ref(true)
const busy = ref(false)
const message = ref('')
const client = useSupabaseClient()
const statuses = { connected: 'Conectado', expired: 'Autorização expirada', revocation_pending: 'Revogação remota pendente', revoked: 'Desconectado' }

async function refresh() {
  loading.value = true
  message.value = ''
  try { connection.value = await $fetch<TwitchConnection | null>('/api/sentry/provider-connections/twitch') } catch { message.value = 'Não foi possível consultar a conexão. Tente novamente.' } finally { loading.value = false }
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
        <p class="mb-4 text-muted">Vincule seu canal à sua conta VPN. Nesta fase, o monitoramento permanece desativado e nenhum áudio ou vídeo é coletado.</p>
        <div v-if="loading" role="status">Consultando conexão…</div>
        <template v-else>
          <div v-if="connection" class="mb-6 space-y-2">
            <p>Canal: <strong>{{ connection.login }}</strong></p>
            <UBadge color="neutral">{{ statuses[connection.status] }}</UBadge>
            <p v-if="connection.status === 'revocation_pending'" class="text-muted">O uso local está bloqueado. A VPN tentará revogar na Twitch por até 24 horas. Você também pode remover a integração nas configurações da Twitch.</p>
          </div>
          <p v-else class="mb-4 text-muted">Nenhum canal vinculado.</p>
          <template v-if="!connection || connection.status === 'revoked'">
            <UCheckbox v-model="consent" label="Autorizo vincular meu canal Twitch à VPN." description="O administrador VPN pode acessar os metadados da conexão. Posso retirar esta autorização ao desconectar. Nenhum monitoramento é ativado nesta fase." />
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
