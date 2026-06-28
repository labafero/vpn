<template>
  <div
    class="border-t-2 overflow-hidden w-full h-full p-5 flex flex-col"
    :class="cor.border"
  >
    <OverlayBroadcastStatus />
  </div>
</template>

<script lang="ts" setup>
const { cor, broadcasterId } = useOverlayState();

const supabase = useSupabaseClient();
const { fetchLatest } = useMarketValues();

onMounted(async () => {
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
