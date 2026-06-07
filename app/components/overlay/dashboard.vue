<template>
  <div class="border-t-2 border-primary overflow-hidden w-full h-full p-5 flex flex-col">

    <div class="space-y-2 text-sm mb-3">
      <div class="flex justify-between">
        <span class="text-muted">Brasília</span>
        <ClientOnly>
          <span class="font-mono text-default">{{ brasiliaTime }}</span>
          <template #fallback
            ><span class="font-mono text-default">--:--:--</span></template
          >
        </ClientOnly>
      </div>
      <div class="flex justify-between">
        <span class="text-muted">Los Santos</span>
        <ClientOnly>
          <span class="font-mono text-default">{{ losSantosLabel }}</span>
          <template #fallback
            ><span class="font-mono text-default">--:--</span></template
          >
        </ClientOnly>
      </div>
    </div>

    <div class="border-t border-muted mb-3" />

    <OverlaySpotifyNowPlaying />

    <div class="border-t border-muted my-3" />

    <OverlayGoalDonation />

    <div class="border-t border-muted my-3" />

    <OverlayBroadcastStatus />

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
// LS time reference: current BRT time = 21:37 in Los Santos
const REFERENCE_BRT = new Date();
const REFERENCE_LS = { hours: 21, minutes: 37 };

const now = ref(Date.now());

const brasiliaTime = computed(() => {
  return new Date(now.value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

const losSantos = computed(() => {
  const elapsedMs = now.value - REFERENCE_BRT.getTime();
  const elapsedRealMin = elapsedMs / 60000;
  const elapsedLSMin = elapsedRealMin * 30;
  const totalLSMin =
    REFERENCE_LS.hours * 60 + REFERENCE_LS.minutes + elapsedLSMin;
  const day = Math.floor(totalLSMin / 1440) + 1;
  const timeMin = totalLSMin % 1440;
  const hours = Math.floor(timeMin / 60);
  const minutes = Math.floor(timeMin % 60);
  return { day, hours, minutes };
});

const losSantosLabel = computed(() => {
  const h = String(losSantos.value.hours).padStart(2, "0");
  const m = String(losSantos.value.minutes).padStart(2, "0");
  return `${h}:${m}`;
});

const stocks = [
  { label: "kit médico civil", value: "R$ 10.000", trend: "down" as const },
  { label: "kit médico policial", value: "R$ 4.000", trend: "stable" as const },
  { label: "analgésico", value: "R$ 1.200", trend: "stable" as const },
  { label: "trat. médico", value: "R$ 2.500", trend: "stable" as const },
  { label: "auto. trat. médico", value: "R$ 5.500", trend: "up" as const },
  { label: "apt. padrão", value: "R$ 150.000", trend: "down" as const },
  { label: "bitcoin", value: "R$ 3,40", trend: "stable" as const },
];

onMounted(async () => {
  setInterval(() => {
    now.value = Date.now();
  }, 1000);
});
</script>

<style></style>
