<template>
  <div class="flex flex-col h-screen">
    <div class="flex-1 w-full grid grid-cols-2 grid-rows-2">
      <!-- OBS Game Capture Placeholder -->
      <div class="col-span-2 bg-green-500 w-full h-full"></div>

      <OverlayHighlights />

      <OverlayDashboard />
    </div>

    <OverlayTinker />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay" });
useHead({
  title: "Overlay Monitoramento",
});
</script>
