<script setup lang="ts">
useHead({
  htmlAttrs: { lang: "pt-BR" },
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/vpn-icon.svg" },
    { rel: "manifest", href: "/site.webmanifest" }
  ]
})

useSeoMeta({
  title: "VPN Roleplay — A cidade nunca dorme",
  description: "Entre no universo da VPN Roleplay: histórias, notícias e uma cidade viva para jogar.",
  ogTitle: "VPN Roleplay — A cidade nunca dorme",
  ogDescription: "Um universo vivo de histórias, personagens e notícias em tempo real.",
  ogImage: "/vpn-icon.svg",
  twitterCard: "summary"
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
