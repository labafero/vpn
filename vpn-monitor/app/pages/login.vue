<script setup lang="ts">
import { buildAuthPortalUrl, resolveAuthCallbackPath } from '@vpn/auth'

definePageMeta({ colorMode: 'dark' })

const route = useRoute()
const config = useRuntimeConfig()
const requestedPath = typeof route.query.return_to === 'string' ? route.query.return_to : null
const returnPath = resolveAuthCallbackPath(requestedPath, '/conexao')
const returnTo = new URL(returnPath, useRequestURL().origin).href

await navigateTo(buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo), { external: true })
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-default p-4 text-muted">
    <p role="status">Redirecionando para entrar na VPN…</p>
  </main>
</template>
