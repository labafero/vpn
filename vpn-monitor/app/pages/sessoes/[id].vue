<script setup lang="ts">
import type { AccessInvite, MonitoringSession } from '@vpn/contracts'
import { $fetch as request } from 'ofetch'
definePageMeta({ middleware: 'auth', colorMode: 'dark' })
const route = useRoute()
const session = ref<MonitoringSession | null>(null)
const invites = ref<AccessInvite[]>([])
const createdLink = ref('')
const busy = ref(false)
const message = ref('')
async function load() {
  try {
    const loaded = await request<MonitoringSession>(`/api/sentry/sessions/${route.params.id}`)
    session.value = loaded
    if (loaded.canManageInvites) invites.value = await request<AccessInvite[]>(`/api/sentry/sessions/${route.params.id}/invites`)
  } catch { message.value = 'A sessão não está disponível para esta conta.' }
}
async function createInvite() {
  busy.value = true; message.value = ''
  try {
    const result = await $fetch<{ invite: AccessInvite; token: string }>(`/api/sentry/sessions/${route.params.id}/invites`, { method: 'POST', headers: { 'X-VPN-CSRF': '1' } })
    createdLink.value = `${location.origin}/convites/aceitar#token=${encodeURIComponent(result.token)}`
    await navigator.clipboard.writeText(createdLink.value)
    await load()
  } catch { message.value = 'Não foi possível criar o convite. A sessão precisa estar ao vivo.' } finally { busy.value = false }
}
async function revoke(id: string) {
  busy.value = true
  try { await $fetch(`/api/sentry/invites/${id}`, { method: 'DELETE', headers: { 'X-VPN-CSRF': '1' } }); await load() }
  catch { message.value = 'Não foi possível revogar o convite.' } finally { busy.value = false }
}
onMounted(load)
</script>

<template>
  <main class="min-h-screen bg-default p-6 text-default"><div class="mx-auto max-w-3xl space-y-6 py-10">
    <NuxtLink to="/" class="underline">← Voltar à central</NuxtLink>
    <div v-if="session" class="space-y-5"><header><h1 class="text-3xl font-semibold">{{ session.title || 'Transmissão Twitch' }}</h1><p>{{ session.category || 'Categoria não informada' }} · Iniciada em {{ new Date(session.startedAt).toLocaleString('pt-BR') }}</p><UBadge>{{ session.endedAt ? 'Encerrada' : 'Ao vivo' }}</UBadge></header>
      <UCard v-if="!session.endedAt && session.canManageInvites"><h2 class="mb-2 text-xl font-semibold">Convites temporários</h2><p class="mb-4 text-muted">Cada convite dá acesso somente a esta sessão, expira em 24 horas e pode ser usado uma vez.</p><UButton :loading="busy" @click="createInvite">Criar e copiar convite</UButton><p v-if="createdLink" class="mt-3 break-all text-sm">Link copiado. {{ createdLink }}</p><ul class="mt-4 space-y-2"><li v-for="invite in invites" :key="invite.id" class="flex items-center justify-between gap-3"><span>{{ new Date(invite.expiresAt).toLocaleString('pt-BR') }} · {{ invite.acceptedAt ? 'utilizado' : invite.revokedAt ? 'revogado' : 'disponível' }}</span><UButton v-if="!invite.acceptedAt && !invite.revokedAt" size="sm" color="error" variant="outline" :disabled="busy" @click="revoke(invite.id)">Revogar</UButton></li></ul></UCard>
      <UAlert color="neutral" description="Esta central exibe apenas metadados da transmissão. Não há player de áudio ou vídeo." />
    </div>
    <UAlert v-if="message" color="error" :description="message" role="alert" />
  </div></main>
</template>
