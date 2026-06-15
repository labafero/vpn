<template>
  <div class="flex flex-col h-screen">
    <div class="flex-1 w-full grid grid-cols-2 grid-rows-2">
      <!-- OBS Game Capture Placeholder -->
      <div class="col-span-2 bg-green-500 w-full h-full"></div>

      <OverlayHighlights :cor-key="corKey" :cidade="cidadeSlug" />

      <OverlayDashboard :cor-key="corKey" />
    </div>

    <OverlayTinker :city-config="cityConfig" />
  </div>
</template>

<script lang="ts" setup>
import { DEFAULT_COR, type CorPrimaria } from "~/utils/cidadeColors";

definePageMeta({ layout: "overlay" });
useHead({ title: "Overlay Monitoramento" });

const route = useRoute();
const user = useSupabaseUser();

const broadcasterId = computed(
  () => (route.query.broadcaster as string) || user.value?.sub,
);

const { config, fetch } = useBroadcastConfig();
const { config: cityConfig, fetchBySlug } = useCidadeConfig();

onMounted(async () => {
  await fetch(broadcasterId.value);

  if (config.value?.cidade) {
    await fetchBySlug(config.value.cidade);
  }
});

const cidadeSlug = computed(() => config.value?.cidade ?? undefined);

const corKey = computed<CorPrimaria>(
  () => (cityConfig.value?.cor_primaria as CorPrimaria) ?? DEFAULT_COR,
);
</script>
