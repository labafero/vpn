<template>
  <section
    class="relative flex h-full w-full overflow-hidden border-t-2 border-cyan-300/80 bg-[#05090c] font-mono text-white"
  >
    <div
      class="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-300 to-transparent"
    />
    <div
      class="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(103,232,249,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
    />

    <div
      class="relative flex w-80 shrink-0 flex-col justify-between border-r border-cyan-300/20 p-6"
    >
      <div>
        <div class="flex items-center gap-3">
          <span class="relative flex size-3">
            <span
              class="absolute inline-flex size-full animate-ping rounded-full bg-cyan-300 opacity-55"
            />
            <span class="relative inline-flex size-3 rounded-full bg-cyan-300" />
          </span>
          <span class="text-sm font-bold tracking-[0.22em] text-cyan-300">
            REMOTE LINK
          </span>
        </div>
        <div class="mt-3 text-[10px] tracking-[0.18em] text-white/45">
          CONNECTION ESTABLISHED
        </div>
      </div>

      <div class="space-y-1 text-[11px] text-white/60">
        <div class="flex justify-between gap-4">
          <span>NODE</span>
          <span class="text-white/90">{{ nodeId }}</span>
        </div>
        <div class="flex justify-between gap-4">
          <span>CHANNEL</span>
          <span class="text-white/90">CH-07 / SECURE</span>
        </div>
        <div class="flex justify-between gap-4">
          <span>NETWORK</span>
          <span class="text-cyan-300">VPN CONNECTED</span>
        </div>
      </div>
    </div>

    <div
      class="relative flex min-w-0 flex-1 flex-col justify-between overflow-hidden p-6"
    >
      <div
        class="flex items-center justify-between gap-4 text-[10px] tracking-[0.2em] text-white/45"
      >
        <div class="flex items-center gap-3">
          <span class="h-px w-8 bg-cyan-300" />
          <span>MONITORING NEWSWIRE</span>
          <span class="animate-pulse text-cyan-300">● DATA STREAM</span>
        </div>
        <span class="tabular-nums">
          {{ String(activeIndex + 1).padStart(2, "0") }} /
          {{ String(Math.max(posts.length, 1)).padStart(2, "0") }}
        </span>
      </div>

      <Transition name="monitor" mode="out-in">
        <div
          :key="activePost?.id ?? 'empty'"
          class="flex min-w-0 items-center gap-5"
        >
          <div
            class="relative h-22 w-38 shrink-0 overflow-hidden border border-cyan-300/25 bg-black/45"
          >
            <img
              v-if="activePost?.cover_url"
              :src="activePost.cover_url"
              alt=""
              class="size-full object-cover opacity-80 grayscale-[25%]"
            />
            <div
              v-else
              class="flex size-full items-center justify-center text-[9px] tracking-[0.18em] text-white/25"
            >
              NO VISUAL
            </div>
            <span
              class="absolute top-1 left-1 size-3 border-t border-l border-cyan-300/80"
            />
            <span
              class="absolute right-1 bottom-1 size-3 border-r border-b border-cyan-300/80"
            />
            <span
              class="absolute right-2 bottom-1.5 text-[8px] tracking-widest text-white/65"
            >
              CAM-07
            </span>
          </div>

          <div class="min-w-0">
            <div
              class="line-clamp-2 text-2xl leading-tight font-medium tracking-tight"
            >
              {{ activeHeadline }}
            </div>
            <div
              class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tracking-wide text-white/45"
            >
              <span class="text-cyan-300">
                SECTOR {{ activePost?.cidade?.toUpperCase() ?? "GLOBAL" }}
              </span>
              <span>//</span>
              <span>SOURCE VPN NEWSNET</span>
              <span>//</span>
              <span>RX {{ formatPostTime(activePost?.published_at) }}</span>
            </div>
          </div>
        </div>
      </Transition>

      <div
        class="flex min-w-0 items-center gap-3 overflow-hidden border-t border-white/10 pt-3 text-[10px] tracking-wide text-white/35"
      >
        <div v-if="posts.length" class="w-0 min-w-0 flex-1 overflow-hidden">
          <UMarquee
            class="w-full min-w-0 overflow-hidden py-0"
            :ui="{
              root: '[--duration:45s]',
              content: 'gap-12',
            }"
            :overlay="false"
          >
            <span
              v-for="post in posts"
              :key="post.id"
              class="flex items-center gap-3 whitespace-nowrap"
            >
              <span class="text-cyan-300/60">//</span>
              <span>{{ post.title }}</span>
            </span>
          </UMarquee>
        </div>
        <span v-else class="text-white/25">NO DATA</span>
      </div>
    </div>

    <div
      class="relative grid w-122 shrink-0 grid-cols-3 border-l border-cyan-300/20"
    >
      <div class="border-r border-b border-white/10 p-5">
        <div class="text-[10px] tracking-[0.2em] text-white/45">UPLINK</div>
        <div class="mt-4 flex h-8 items-end gap-1.5">
          <span
            v-for="bar in 4"
            :key="bar"
            class="w-2 transition-colors duration-300"
            :class="[
              `signal-bar-${bar}`,
              bar <= uplinkStrength ? 'bg-cyan-300' : 'bg-white/15',
            ]"
          />
        </div>
      </div>

      <div class="border-r border-b border-white/10 p-5">
        <div class="text-[10px] tracking-[0.2em] text-white/45">LATENCY</div>
        <div class="mt-4 text-2xl tracking-wider tabular-nums">
          {{ String(latencyMs).padStart(3, "0") }}
          <span class="text-xs text-white/45">MS</span>
        </div>
      </div>

      <div class="border-b border-white/10 p-5">
        <div class="text-[10px] tracking-[0.2em] text-white/45">PWR CORE</div>
        <div class="mt-4 text-2xl tracking-wider tabular-nums">
          96<span class="text-xs text-white/45">%</span>
        </div>
      </div>

      <div class="col-span-3 flex items-center justify-between px-5 py-4">
        <div class="text-[10px] tracking-[0.18em] text-white/45">
          <div>{{ timezone }}</div>
          <div class="mt-1">{{ utcOffset }}</div>
        </div>
        <ClientOnly>
          <div class="text-base tracking-wider tabular-nums">
            {{ formattedDateTime }}
          </div>
          <template #fallback>
            <div class="text-base tracking-wider tabular-nums">
              ##/##/####, ##:##:##
            </div>
          </template>
        </ClientOnly>
      </div>
    </div>
  </section>
</template>

<script lang="ts" setup>
import type { Tables } from "~/types/database.types";

const route = useRoute();
const supabase = useSupabaseClient();
const { broadcastConfig, broadcastTitle, cidadeSlug, initialized } =
  useOverlayState();

const now = ref(Date.now());
const timezone = ref("LOCAL TIME");
const uplinkStrength = ref(4);
const latencyMs = ref(24);
const posts = ref<
  Pick<
    Tables<"posts">,
    "id" | "title" | "cidade" | "published_at" | "cover_url"
  >[]
>([]);
const activeIndex = ref(0);
let clockInterval: ReturnType<typeof setInterval> | undefined;
let telemetryInterval: ReturnType<typeof setInterval> | undefined;
let newsInterval: ReturnType<typeof setInterval> | undefined;

const activePost = computed(() => posts.value[activeIndex.value]);
const activeHeadline = computed(() => {
  if (broadcastConfig.value?.title === "random-found") {
    return broadcastTitle.value;
  }

  return activePost.value?.title ?? "AGUARDANDO NOVOS DADOS DA REDE";
});

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

function formatPostTime(value?: string | null) {
  if (!value) return "--:--";
  return new Date(value).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchNews() {
  let query = supabase
    .from("posts")
    .select("id, title, cidade, published_at, cover_url")
    .order("published_at", { ascending: false })
    .limit(6);

  if (cidadeSlug.value) {
    query = query.ilike("cidade", cidadeSlug.value);
  }

  const { data, error } = await query;

  if (error) {
    console.warn("Não foi possível carregar o feed de monitoramento", error);
    return;
  }

  posts.value = data ?? [];
  activeIndex.value = 0;
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
  newsInterval = setInterval(() => {
    if (posts.value.length > 1) {
      activeIndex.value = (activeIndex.value + 1) % posts.value.length;
    }
  }, 10000);
});

watch(
  [initialized, cidadeSlug],
  ([ready]) => {
    if (ready) void fetchNews();
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (clockInterval) clearInterval(clockInterval);
  if (telemetryInterval) clearInterval(telemetryInterval);
  if (newsInterval) clearInterval(newsInterval);
});
</script>

<style scoped>
.monitor-enter-active,
.monitor-leave-active {
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

.monitor-enter-from {
  opacity: 0;
  transform: translateX(12px);
}

.monitor-leave-to {
  opacity: 0;
  transform: translateX(-12px);
}

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
