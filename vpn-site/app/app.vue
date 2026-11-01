<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'pt-BR' },
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/vpn-icon.svg' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ]
})

const title = 'A cidade nunca dorme'
const description =
  'Entre no universo da VPN Roleplay: histórias, notícias e uma cidade viva para jogar.'

useVpnSeoDefaults({
  app: 'site',
  title,
  description
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
