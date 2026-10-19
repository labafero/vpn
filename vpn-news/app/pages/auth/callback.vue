<script setup lang="ts">
import { buildAuthPortalUrl, completeAuthCallback } from '@vpn/auth'

definePageMeta({
  layout: false,
  colorMode: 'dark'
})

useHead({ title: 'Concluindo autenticação — VPN News' })

const route = useRoute()
const client = useSupabaseClient()
const config = useRuntimeConfig()

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : null
  const next = typeof route.query.next === 'string' ? route.query.next : null
  const result = await completeAuthCallback(
    async (authCode) => {
      const { error } = await client.auth.exchangeCodeForSession(authCode)
      return { error }
    },
    code,
    next
  )

  window.history.replaceState(window.history.state, '', window.location.pathname)

  if (result.ok) {
    window.location.replace(result.destination)
    return
  }

  const returnTo = new URL(result.destination, window.location.origin).href
  const portalUrl = buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo, 'entrar', true)
  window.location.replace(portalUrl)
})
</script>

<template>
  <main class="flex min-h-dvh items-center justify-center bg-default px-4 text-default">
    <div
      class="flex items-center gap-3 text-muted"
      role="status"
      aria-live="polite"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-5 animate-spin text-primary"
      />
      <span>Concluindo sua autenticação…</span>
    </div>
  </main>
</template>
