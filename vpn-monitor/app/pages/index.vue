<script setup lang="ts">
import type { MonitoringChannel, MonitoringSession, MonitoringSessionPage } from '@vpn/contracts'
definePageMeta({ middleware: 'auth', colorMode: 'dark' })
const channels = ref<MonitoringChannel[]>([])
const sessions = ref<MonitoringSession[]>([])
const nextCursor = ref<string | null>(null)
const loading = ref(true)
const message = ref('')
function monitoringStatus(channel: MonitoringChannel) {
  if (!channel.monitoringEnabled) return 'Monitoramento desligado'
  return ({ enabled: 'Monitoramento ativo', pending: 'Ativação em andamento', error: 'Falha ao inscrever eventos' } as Record<string, string>)[channel.subscriptionStatus || 'pending'] || 'Ativação em andamento'
}
async function load(more = false) {
  loading.value = !more; message.value = ''
  try {
    const [loadedChannels, page] = await Promise.all([$fetch<MonitoringChannel[]>('/api/sentry/channels'), $fetch<MonitoringSessionPage>('/api/sentry/sessions', { query: more && nextCursor.value ? { cursor: nextCursor.value } : {} })])
    channels.value = loadedChannels
    sessions.value = more ? [...sessions.value, ...page.items] : page.items
    nextCursor.value = page.nextCursor
  }
  catch { message.value = 'Não foi possível carregar suas sessões. Tente novamente.' }
  finally { loading.value = false }
}
onMounted(load)
</script>

<template>
  <main class="min-h-screen bg-neutral-950 px-6 py-16 text-white">
    <div class="mx-auto max-w-3xl space-y-4">
      <p class="text-sm uppercase tracking-[0.3em] text-primary">VPN Monitor</p>
      <h1 class="text-4xl font-semibold">Monitoramento privado</h1>
      <p class="text-neutral-300">Acompanhe somente os metadados das sessões autorizadas. Nenhum vídeo ou áudio é reproduzido aqui.</p>
      <div v-if="loading" role="status">Carregando canais e sessões…</div>
      <UAlert v-else-if="message" color="error" :description="message" role="alert" />
      <template v-else>
        <UCard v-for="channel in channels" :key="channel.id" class="text-default">
          <div class="flex items-center justify-between gap-4"><div><strong>{{ channel.login }}</strong><p class="text-muted">{{ monitoringStatus(channel) }}</p></div><UBadge :color="channel.monitoringEnabled && channel.subscriptionStatus === 'enabled' ? 'success' : 'neutral'">{{ channel.connectionStatus }}</UBadge></div>
          <UButton class="mt-3" to="/conexao" variant="outline">Gerenciar monitoramento</UButton>
        </UCard>
        <UCard class="text-default"><h2 class="mb-4 text-xl font-semibold">Sessões recentes</h2><p v-if="!sessions.length" class="text-muted">Nenhuma sessão registrada ainda.</p><ul v-else class="space-y-3"><li v-for="session in sessions" :key="session.id"><NuxtLink class="underline" :to="`/sessoes/${session.id}`">{{ session.title || 'Transmissão Twitch' }} · {{ new Date(session.startedAt).toLocaleString('pt-BR') }}<span v-if="!session.endedAt"> · ao vivo</span></NuxtLink></li></ul><UButton v-if="nextCursor" class="mt-4" variant="outline" :loading="loading" @click="load(true)">Carregar mais sessões</UButton></UCard>
      </template>
      <UButton to="/conexao" variant="outline">Conexão Twitch e consentimento</UButton>
    </div>
  </main>
</template>
