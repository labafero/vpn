<template>
  <main
    class="grid h-screen w-screen grid-rows-[minmax(0,1fr)_270px] overflow-hidden"
  >
    <div class="min-h-0 bg-green-600" />
    <div class="h-full min-h-0">
      <OverlayRemoteLinkDeck headline-only />
    </div>
  </main>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Deck com manchete aleatória" });

const { init, broadcasterId } = useOverlayState();

if (!broadcasterId.value) {
  throw createError({
    statusCode: 400,
    statusMessage: "Parâmetro broadcaster é obrigatório",
  });
}

onMounted(() => init());
</script>
