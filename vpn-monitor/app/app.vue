<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'pt-BR' },
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/vpn-icon.svg' }]
})

const title = 'Sessões e transmissões autorizadas'
const description =
  'Conecte sua Twitch, gerencie seus consentimentos e revise sessões, clips e sinais autorizados da VPN Roleplay.'

useVpnSeoDefaults({
  app: 'monitor',
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
