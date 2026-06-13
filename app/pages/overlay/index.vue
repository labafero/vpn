<template>
  <div class="flex flex-col h-screen">
    <div class="h-202.5 bg-green-500"></div>
    <div class="flex flex-col h-67.5 overflow-hidden">
      <OverlayTinker />

      <div
        class="w-full h-full border-t border-red-700 flex items-center px-5 gap-5"
      >
        <div class="bg-elevated aspect-video h-32 rounded-md"></div>
        <div>
          <div class="flex items-center gap-2 text-xl">
            <UBadge v-if="config" variant="soft">
              {{ config.character_name }}
            </UBadge>
            <UBadge v-if="config" variant="soft" icon="lucide:user">
              {{ config.passport_id }}
            </UBadge>
            <UBadge v-if="config" variant="soft" icon="lucide:smartphone">
              {{ config.phone }}
            </UBadge>
          </div>
          <div class="text-4xl mt-2 font-breaking">
            {{ config?.title || "—" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay" });
useHead({ title: "Overlay Jornal" });

const route = useRoute();
const user = useSupabaseUser();
const broadcasterId = computed(
  () => (route.query.broadcaster as string) || user.value?.sub,
);

if (!broadcasterId.value) {
  throw createError({
    statusCode: 400,
    statusMessage: "Parâmetro broadcaster é obrigatório",
  });
}

const { config, fetch } = useBroadcastConfig();

onMounted(() => {
  fetch(broadcasterId.value);
  if (import.meta.client) {
    setInterval(() => {
      fetch(broadcasterId.value);
    }, 30000);
  }
});
</script>

<style></style>
