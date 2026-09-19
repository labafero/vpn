<template>
  <div class="flex h-screen flex-col">
    <div class="h-202.5 bg-green-500" />
    <div class="flex h-67.5 flex-col overflow-hidden">
      <OverlaySpectrum v-if="initialized" />

      <OverlaySpectrumMotion />
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Overlay Spectrum" });

const { init, initialized, broadcasterId } = useOverlayState();

if (!broadcasterId.value) {
  throw createError({
    statusCode: 400,
    statusMessage: "Parâmetro broadcaster é obrigatório",
  });
}

onMounted(() => init());
</script>
