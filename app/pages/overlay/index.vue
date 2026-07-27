<template>
  <div class="flex flex-col h-screen">
    <div class="h-202.5 bg-green-500"></div>
    <div class="flex flex-col h-67.5 overflow-hidden">
      <OverlayTinker v-if="initialized" />

      <div
        class="w-full h-full border-t flex items-center px-5 gap-5 border-neutral-700"
      >
        <div class="bg-elevated aspect-video h-32 rounded-md"></div>
        <div>
          <div class="flex items-center gap-2 text-xl">
            <UBadge v-if="characterConfig" variant="subtle" color="neutral">
              {{ characterConfig.character_name }}
            </UBadge>
            <UBadge
              v-if="characterConfig"
              variant="outline"
              color="neutral"
              icon="lucide:id-card"
            >
              {{ characterConfig.passport_id }}
            </UBadge>
            <UBadge
              v-if="characterConfig"
              variant="outline"
              color="neutral"
              icon="lucide:smartphone"
            >
              {{ characterConfig.phone }}
            </UBadge>
          </div>
          <div class="text-4xl mt-2 line-clamp-2">
            {{ broadcastTitle }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay", colorMode: "dark" });
useHead({ title: "Overlay Jornal" });

const { init, initialized, broadcasterId, broadcastTitle, characterConfig } =
  useOverlayState();

if (!broadcasterId.value) {
  throw createError({
    statusCode: 400,
    statusMessage: "Parâmetro broadcaster é obrigatório",
  });
}

onMounted(() => init());
</script>
