<script setup lang="ts">
const config = useRuntimeConfig()
const monitorUrl = (config.public.vpnAppUrls as { monitor: string }).monitor
let redirectTimeout: ReturnType<typeof setTimeout>

useHead({ title: 'VPN Sentry' })

onMounted(() => {
  redirectTimeout = setTimeout(() => window.location.replace(monitorUrl), 10_000)
})

onUnmounted(() => clearTimeout(redirectTimeout))
</script>

<template>
  <main class="redirect-page">
    <p>Redirecionando para o VPN Monitor em 10 segundos…</p>
    <a :href="monitorUrl">Clique aqui se o redirecionamento não acontecer.</a>
  </main>
</template>

<style scoped>
.redirect-page {
  display: grid;
  min-height: 100vh;
  align-content: center;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #05090c;
  color: #fff;
  font-family: Inter, sans-serif;
  text-align: center;
}

.redirect-page p {
  margin: 0;
}

.redirect-page a {
  color: #67e8f9;
}
</style>
