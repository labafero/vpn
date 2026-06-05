<template>
  <div class="flex flex-col h-screen">
    <div class="flex-1 w-full grid grid-cols-2 grid-rows-2">
      <!-- OBS Game Capture Placeholder -->
      <div
        class="col-span-2 bg-neutral-900 w-full h-full flex items-center justify-center select-none"
      >
        <div class="text-center text-white/20">
          <div class="text-lg uppercase tracking-[0.3em]">Servidor Online</div>
          <div class="text-xs tracking-[0.2em] mt-2">CAM 01</div>
        </div>
      </div>

      <!-- Breaking News -->
      <OverlayHighlights />

      <!-- Dashboard -->
      <OverlayDashboard />
    </div>

    <OverlayTinker />
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay" });
</script>
