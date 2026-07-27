<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <div class="bg-green-500 w-full h-full"></div>
    <OverlayHighlights />
    <OverlayStocks />
    <OverlayTinker />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Overlay Monitoramento" });

const { init } = useOverlayState();

onMounted(() => init());
</script>
