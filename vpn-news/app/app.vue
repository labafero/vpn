<script setup>
import { pt_br } from '@nuxt/ui/locale'

useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/vpn-icon.svg' },
    { rel: 'apple-touch-icon', href: '/vpn-icon.svg' },
    { rel: 'manifest', href: '/site.webmanifest' }
  ],
  htmlAttrs: {
    lang: 'pt-BR'
  }
})

const title = 'Notícias da cidade e do roleplay'
const description =
  'Acompanhe destaques, notícias locais e histórias do universo VPN Roleplay, com cobertura editorial feita pela comunidade.'

useVpnSeoDefaults({
  app: 'news',
  title,
  description
})

const colorMode = useColorMode()

useHead({
  meta: [
    {
      name: 'theme-color',
      content: () => (colorMode.value === 'dark' ? '#1b1718' : 'white')
    }
  ]
})
</script>

<template>
  <UApp :locale="pt_br">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UToaster />
  </UApp>
</template>
