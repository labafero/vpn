<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'pt-BR' },
  link: [{ rel: 'icon', type: 'image/svg+xml', href: '/vpn-icon.svg' }]
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
