<template>
  <div class="border-t-2 border-primary overflow-hidden w-full h-full p-5 flex flex-col">

    <div class="space-y-2 mb-3">
      <div class="flex justify-between">
        <span class="text-muted">Brasília</span>
        <ClientOnly>
          <span class="font-mono text-lg text-default font-bold">{{ brasiliaTime }}</span>
          <template #fallback
            ><span class="font-mono text-lg text-default font-bold">--:--:--</span></template
          >
        </ClientOnly>
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Los Santos</span>
        <ClientOnly>
          <span class="font-mono text-lg text-default font-bold">{{ losSantosLabel }}</span>
          <template #fallback
            ><span class="font-mono text-lg text-default font-bold">--:--</span></template
          >
        </ClientOnly>
      </div>
    </div>

    <div class="border-t border-muted mb-3" />

    <OverlaySpotifyNowPlaying />

    <div class="border-t border-muted my-3" />

    <OverlayBroadcastStatus :broadcaster-id="broadcasterId" />

    <div class="border-t border-muted my-3" />

    <div class="flex-1 flex items-end overflow-hidden">
      <UMarquee
        class="text-xs"
        :overlay="false"
        :ui="{ root: '[--duration:40s]' }"
      >
        <UCard v-for="(s, i) in stocks" :key="i" variant="soft">
          <div class="text-default">{{ s.label }}</div>
          <div class="font-mono text-default">{{ s.value }}</div>
          <span
            :class="
              s.trend === 'up'
                ? 'text-success'
                : s.trend === 'down'
                  ? 'text-error'
                  : 'text-muted'
            "
          >
            {{ s.trend === "up" ? "▲" : s.trend === "down" ? "▼" : "—" }}
          </span>
        </UCard>
      </UMarquee>
    </div>
  </div>
</template>

<script lang="ts" setup>
const now = ref(Date.now());
const route = useRoute();
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const { lsLabel: losSantosLabel, fetch: fetchClock } = useServerClock();
const { latest, fetchLatest } = useMarketValues();

const broadcasterId = computed(
  () => (route.query.broadcaster as string) || user.value?.sub || "",
);

const brasiliaTime = computed(() => {
  return new Date(now.value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

const FALLBACK_STOCKS = [
  { label: "kit médico civil", value: "R$ 10.000", trend: "down" as const },
  { label: "kit médico policial", value: "R$ 4.000", trend: "stable" as const },
  { label: "analgésico", value: "R$ 1.200", trend: "stable" as const },
  { label: "trat. médico", value: "R$ 2.500", trend: "stable" as const },
  { label: "auto. trat. médico", value: "R$ 5.500", trend: "up" as const },
  { label: "apt. padrão", value: "R$ 150.000", trend: "down" as const },
  { label: "bitcoin", value: "R$ 3,40", trend: "stable" as const },
];

const stocks = computed(() => {
  if (latest.value.length === 0) return FALLBACK_STOCKS;
  return latest.value.map((r) => ({
    label: r.cidade ? `${r.cidade} · ${r.label ?? ""}` : (r.label ?? ""),
    value: r.value ?? "",
    trend: (r.trend ?? "stable") as "up" | "down" | "stable",
  }));
});

onMounted(async () => {
  setInterval(() => {
    now.value = Date.now();
  }, 1000);
  await fetchClock();
  await fetchLatest(broadcasterId.value);

  supabase
    .channel("market_values_overlay")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "market_values",
        filter: `user_id=eq.${broadcasterId.value}`,
      },
      () => fetchLatest(broadcasterId.value),
    )
    .subscribe();
});

onUnmounted(() => {
  supabase.removeAllChannels();
});
</script>

<style></style>
