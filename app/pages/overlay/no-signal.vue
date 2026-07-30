<template>
  <main
    class="relative h-screen w-screen overflow-hidden bg-neutral-950 text-white"
  >
    <OverlaySpectrumMotion force-no-signal class="h-full w-full" />
    <OverlayRemoteLinkOsd status="lost" />
  </main>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Sem sinal" });
</script>
