<script setup>
useHead({
  meta: [{ name: "viewport", content: "width=device-width, initial-scale=1" }],
  link: [
    { rel: "icon", type: "image/svg+xml", href: "/vpn-icon.svg" },
    { rel: "apple-touch-icon", href: "/vpn-icon.svg" },
    { rel: "manifest", href: "/site.webmanifest" },
  ],
  htmlAttrs: {
    lang: "pt-BR",
  },
});

const title = "VPN Roleplay";

useSeoMeta({
  title,
  ogTitle: title,
  ogImage: "/vpn-icon.svg",
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
