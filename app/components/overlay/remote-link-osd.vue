<template>
  <div
    class="pointer-events-none absolute inset-0 z-20 p-10 font-mono text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)]"
    aria-hidden="true"
  >
    <span
      class="absolute top-7 left-7 h-12 w-12 border-t border-l"
      :class="accentBorder"
    />
    <span
      class="absolute top-7 right-7 h-12 w-12 border-t border-r"
      :class="accentBorder"
    />
    <span
      class="absolute bottom-7 left-7 h-12 w-12 border-b border-l"
      :class="accentBorder"
    />
    <span
      class="absolute right-7 bottom-7 h-12 w-12 border-r border-b"
      :class="accentBorder"
    />

    <div class="flex items-start justify-between">
      <div
        class="border-l-2 bg-black/45 px-4 py-3 backdrop-blur-[2px]"
        :class="accentBorder"
      >
        <div class="flex items-center gap-2 text-sm font-bold tracking-[0.22em]">
          <span
            class="size-2 animate-pulse rounded-full"
            :class="isConnected ? 'bg-cyan-300' : 'bg-red-500'"
          />
          <span :class="accentText">{{ statusLabel }}</span>
        </div>
        <div class="mt-2 flex items-center gap-4 text-[11px] text-white/65">
          <span>NODE {{ nodeId }}</span>
          <span>//</span>
          <span>CH-07</span>
          <span>//</span>
          <span>{{ isConnected ? "ENCRYPTED" : "NO CARRIER" }}</span>
        </div>
      </div>

      <div class="flex items-start gap-5 bg-black/45 px-4 py-3 backdrop-blur-[2px]">
        <div>
          <div class="text-[10px] tracking-[0.2em] text-white/55">UPLINK</div>
          <div class="mt-2 flex h-5 items-end gap-1">
            <span
              v-for="bar in 4"
              :key="bar"
              class="w-1.5"
              :class="[
                `signal-bar-${bar}`,
                isConnected && bar <= uplinkStrength
                  ? 'bg-cyan-300'
                  : 'bg-white/20',
              ]"
            />
          </div>
        </div>

        <div>
          <div class="text-[10px] tracking-[0.2em] text-white/55">PWR</div>
          <div class="mt-2 flex items-center gap-0.5">
            <div
              class="relative flex h-5 w-11 items-center gap-0.5 border border-white/80 p-0.5"
            >
              <span class="h-full flex-1 bg-white/90" />
              <span class="h-full flex-1 bg-white/90" />
              <span class="h-full flex-1 bg-white/90" />
              <span class="h-full flex-1 bg-white/90" />
              <span
                class="absolute top-1/2 -right-1 h-2 w-0.5 -translate-y-1/2 bg-white/80"
              />
            </div>
            <span class="ml-2 text-xs tabular-nums">96%</span>
          </div>
        </div>
      </div>
    </div>

    <div class="absolute top-1/2 left-1/2 size-16 -translate-1/2 opacity-35">
      <span
        class="absolute top-1/2 left-0 h-px w-5 -translate-y-1/2"
        :class="accentBackground"
      />
      <span
        class="absolute top-1/2 right-0 h-px w-5 -translate-y-1/2"
        :class="accentBackground"
      />
      <span
        class="absolute top-0 left-1/2 h-5 w-px -translate-x-1/2"
        :class="accentBackground"
      />
      <span
        class="absolute bottom-0 left-1/2 h-5 w-px -translate-x-1/2"
        :class="accentBackground"
      />
      <span
        class="absolute top-1/2 left-1/2 size-2 -translate-1/2 border"
        :class="accentBorder"
      />
    </div>

    <div
      v-if="!isConnected"
      class="absolute top-1/2 left-1/2 -translate-1/2 border border-red-500/60 bg-black/65 px-7 py-4 text-center backdrop-blur-[2px]"
    >
      <div class="text-lg font-bold tracking-[0.28em] text-red-400">
        LINK LOST
      </div>
      <div class="mt-1 text-[10px] tracking-[0.18em] text-white/55">
        ATTEMPTING REMOTE RECONNECTION
      </div>
    </div>

    <div
      class="absolute bottom-10 left-10 flex items-end gap-5 bg-black/45 px-4 py-3 backdrop-blur-[2px]"
    >
      <div>
        <div class="text-[10px] tracking-[0.2em] text-white/55">FEED</div>
        <div class="mt-1 flex items-center gap-2 text-xs font-bold tracking-widest">
          <span
            class="size-1.5 rounded-full"
            :class="isConnected ? 'animate-pulse bg-red-500' : 'bg-white/25'"
          />
          {{ isConnected ? "LIVE" : "STANDBY" }}
        </div>
      </div>
      <div class="h-8 w-px bg-white/20" />
      <div>
        <div class="text-[10px] tracking-[0.2em] text-white/55">LATENCY</div>
        <div class="mt-1 text-xs tabular-nums">
          {{ isConnected ? `${String(latencyMs).padStart(3, "0")} MS` : "--- MS" }}
        </div>
      </div>
    </div>

    <div class="absolute right-10 bottom-10 bg-black/45 px-4 py-3 text-right">
      <ClientOnly>
        <div>
          <div class="text-[10px] tracking-[0.2em] text-white/55">
            <div>{{ timezone }}</div>
            <div class="mt-1">{{ utcOffset }}</div>
          </div>
          <div class="mt-1 text-xl tracking-wider tabular-nums">
            {{ formattedDateTime }}
          </div>
        </div>
        <template #fallback>
          <div>
            <div class="text-[10px] tracking-[0.2em] text-white/55">
              LOCAL TIME
            </div>
            <div class="mt-1 text-xl tracking-wider tabular-nums">
              ##/##/####, ##:##:##
            </div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    status?: "connected" | "lost";
  }>(),
  {
    status: "connected",
  },
);

const route = useRoute();
const now = ref(Date.now());
const timezone = ref("LOCAL TIME");
const uplinkStrength = ref(4);
const latencyMs = ref(24);
let clockInterval: ReturnType<typeof setInterval> | undefined;
let telemetryInterval: ReturnType<typeof setInterval> | undefined;

const isConnected = computed(() => props.status === "connected");
const statusLabel = computed(() =>
  isConnected.value ? "REMOTE LINK ACTIVE" : "REMOTE LINK LOST",
);
const accentText = computed(() =>
  isConnected.value ? "text-cyan-300" : "text-red-400",
);
const accentBorder = computed(() =>
  isConnected.value ? "border-cyan-300/70" : "border-red-500/70",
);
const accentBackground = computed(() =>
  isConnected.value ? "bg-cyan-300" : "bg-red-500",
);
const nodeId = computed(() => {
  const broadcaster = route.query.broadcaster;
  if (typeof broadcaster !== "string" || !broadcaster) return "VPN-REMOTE";
  return broadcaster.slice(0, 8).toUpperCase();
});

const formattedDateTime = computed(() =>
  new Date(now.value).toLocaleString("pt-BR", { hour12: false }),
);
const utcOffset = computed(() => {
  const offsetMinutes = -new Date(now.value).getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = Math.floor(Math.abs(offsetMinutes) / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (Math.abs(offsetMinutes) % 60).toString().padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
});

function updateTelemetry() {
  const jitter = Math.round((Math.random() - 0.5) * 18);
  latencyMs.value = Math.min(78, Math.max(14, latencyMs.value + jitter));

  if (latencyMs.value < 30) uplinkStrength.value = 4;
  else if (latencyMs.value < 48) uplinkStrength.value = 3;
  else if (latencyMs.value < 64) uplinkStrength.value = 2;
  else uplinkStrength.value = 1;
}

onMounted(() => {
  timezone.value = Intl.DateTimeFormat()
    .resolvedOptions()
    .timeZone.replaceAll("_", " ")
    .toUpperCase();

  clockInterval = setInterval(() => {
    now.value = Date.now();
  }, 1000);

  telemetryInterval = setInterval(updateTelemetry, 900);
});

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (telemetryInterval) clearInterval(telemetryInterval);
});
</script>

<style scoped>
.signal-bar-1 {
  height: 25%;
}

.signal-bar-2 {
  height: 50%;
}

.signal-bar-3 {
  height: 75%;
}

.signal-bar-4 {
  height: 100%;
}
</style>
