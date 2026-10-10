<script setup lang="ts">
definePageMeta({ middleware: 'accept-invite', colorMode: 'dark' })
const message = ref('Validando convite…')
const inviteToken = ref('')
const busy = ref(false)
async function accept() {
  if (!inviteToken.value || busy.value) return
  busy.value = true
  message.value = 'Validando convite…'
  try {
    const result = await $fetch<{ sessionId: string }>('/api/sentry/invites/accept', { method: 'POST', headers: { 'X-VPN-CSRF': '1' }, body: { token: inviteToken.value } })
    inviteToken.value = ''
    message.value = 'Convite aceito. Abrindo sessão…'
    await navigateTo(`/sessoes/${result.sessionId}`)
  } catch { message.value = 'Este convite expirou, foi revogado ou já foi utilizado. Se o erro foi temporário, tente novamente.' } finally { busy.value = false }
}
onMounted(async () => {
  const token = sessionStorage.getItem('vpn-pending-invite')
  sessionStorage.removeItem('vpn-pending-invite')
  if (!token) { message.value = 'Abra o link de convite recebido para continuar.'; return }
  inviteToken.value = token
  await accept()
})
</script>

<template><main class="flex min-h-screen items-center justify-center bg-default p-6 text-default"><UCard class="max-w-lg"><h1 class="mb-3 text-2xl font-semibold">Convite para uma sessão privada</h1><p role="status">{{ message }}</p><UButton v-if="inviteToken" class="mt-4" :loading="busy" @click="accept">Tentar novamente</UButton></UCard></main></template>
