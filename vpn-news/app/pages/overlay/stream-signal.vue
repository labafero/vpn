<template>
  <main class="relative h-screen w-screen overflow-hidden bg-green-600">
    <OverlayRemoteLinkOsd />
  </main>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({
  title: "Sinal da transmissão",
  htmlAttrs: { style: "background: transparent" },
  bodyAttrs: { style: "background: transparent" },
});
</script>
