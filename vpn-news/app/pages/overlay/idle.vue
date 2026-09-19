<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <div class="bg-green-500 w-full h-full"></div>
    <OverlayHighlights v-if="initialized" />
    <OverlayTinker v-if="initialized" />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Overlay Monitoramento" });

const { init, initialized } = useOverlayState();

onMounted(() => init());
</script>
