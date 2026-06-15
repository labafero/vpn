<template>
  <div class="flex flex-col h-screen">
    <div class="h-202.5 bg-green-500"></div>
    <div class="flex flex-col h-67.5 overflow-hidden">
      <OverlayTinker :city-config="cityConfig" />

      <div
        class="w-full h-full border-t flex items-center px-5 gap-5"
        :class="cor.border"
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
          <div class="text-4xl mt-2 font-breaking">
            {{ config?.title || "—" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  corClasses,
  DEFAULT_COR,
  type CorPrimaria,
} from "~/utils/cidadeColors";

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
const { config: cityConfig, fetchBySlug } = useCidadeConfig();
const { config: characterConfig, fetch: characterFetch } = useCharacterConfig();

onMounted(async () => {
  await fetch(broadcasterId.value);

  if (config.value?.cidade) {
    await Promise.all([
      fetchBySlug(config.value.cidade),
      characterFetch(config.value.cidade, broadcasterId.value),
    ]);
  }
});

const cor = computed(
  () =>
    corClasses[(cityConfig.value?.cor_primaria as CorPrimaria) ?? DEFAULT_COR],
);
</script>
