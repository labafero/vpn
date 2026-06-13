<script setup>
useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [{ rel: "icon", href: "/favicon.ico" }],
  htmlAttrs: {
    lang: "pt-BR",
  },
});

const title = "BRN Roleplay";

useSeoMeta({
  title,
  ogTitle: title,
  ogImage: "https://ui.nuxt.com/assets/templates/nuxt/starter-light.png",
  twitterCard: "summary_large_image",
});

const colorMode = useColorMode();

useHead({
  meta: [{
    name: "theme-color",
    content: () => colorMode.value === "dark" ? "#1b1718" : "white",
  }],
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <UToaster />
  </UApp>
</template>
