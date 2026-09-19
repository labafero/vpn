<template>
  <div class="space-y-1.5">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5">
        <UIcon name="i-lucide-hand-heart" class="text-primary text-sm" />
        <span class="text-xs text-muted uppercase tracking-wider font-medium">
          Meta de arrecadação
        </span>
      </div>
      <span class="text-xs text-muted font-mono">
        R$ {{ current }} / R$ {{ target }}
      </span>
    </div>
    <div
      class="h-2 rounded-full bg-elevated overflow-hidden"
    >
      <div
        class="h-full rounded-full transition-all duration-1000 ease-out"
        :class="progressClass"
        :style="{ width: `${pct}%` }"
      />
    </div>
    <div class="flex justify-between text-[11px] text-dimmed">
      <span>{{ pct }}% concluído</span>
      <span v-if="restante > 0">faltam R$ {{ restante }}</span>
      <span v-else class="text-success">meta atingida!</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    current?: number;
    target?: number;
  }>(),
  {
    current: 1250,
    target: 5000,
  },
);

const pct = computed(() =>
  Math.min(100, Math.round((props.current / props.target) * 100)),
);

const restante = computed(() => Math.max(0, props.target - props.current));

const progressClass = computed(() => {
  if (pct.value >= 100) return "bg-success";
  if (pct.value >= 75) return "bg-primary";
  if (pct.value >= 50) return "bg-warning";
  return "bg-muted";
});
</script>
