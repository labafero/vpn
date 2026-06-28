<script setup lang="ts">
const { latest } = useMarketValues();
const { cor } = useOverlayState();

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
</script>

<template>
  <UMarquee
    class="py-4 border-t border-neutral-700"
    :ui="{
      root: '[--gap:--spacing(1)] [--duration:40s]',
      content: 'w-auto',
    }"
  >
    <UCard
      v-for="(s, i) in stocks"
      :key="i"
      variant="subtle"
      :ui="{ root: 'rounded-none' }"
    >
      <UUser
        :name="s.label"
        :description="s.value"
        :avatar="{
          color:
            s.trend === 'up'
              ? 'success'
              : s.trend === 'down'
                ? 'warning'
                : 'neutral',
          icon:
            s.trend === 'up'
              ? 'i-lucide-chevron-up'
              : s.trend === 'down'
                ? 'i-lucide-chevron-down'
                : 'i-lucide-minus',
        }"
      />
    </UCard>
  </UMarquee>
</template>
