<template>
  <ClientOnly>
    <div v-if="loading" class="flex items-center gap-3">
      <USkeleton class="size-12 rounded-lg shrink-0" />
      <div class="flex-1 space-y-1.5 min-w-0">
        <USkeleton class="h-4 w-3/4" />
        <USkeleton class="h-3 w-1/2" />
      </div>
    </div>

    <div
      v-else-if="track?.playing && track.track_name"
      class="flex items-center gap-3"
    >
      <img
        :src="track.cover_url"
        alt=""
        class="size-12 rounded-lg object-cover shrink-0"
      />
      <div class="min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5">
          <UIcon name="i-simple-icons-spotify" class="text-green-500 text-sm" />
          <span class="text-[10px] text-muted uppercase tracking-wider font-medium">
            Tocando agora
          </span>
        </div>
        <div class="text-sm font-bold truncate text-default">
          {{ track.track_name }}
        </div>
        <div class="text-xs text-muted truncate">
          {{ track.artist }}
        </div>
      </div>
    </div>

    <div v-else class="flex items-center gap-3">
      <div
        class="size-12 rounded-lg bg-elevated flex items-center justify-center shrink-0"
      >
        <UIcon name="i-lucide-music" class="text-xl text-muted" />
      </div>
      <div class="min-w-0">
        <div class="flex items-center gap-1.5 mb-0.5">
          <UIcon name="i-simple-icons-spotify" class="text-green-500 text-sm" />
          <span class="text-[10px] text-muted uppercase tracking-wider font-medium">
            Tocando agora
          </span>
        </div>
        <div class="text-sm text-muted">Nada tocando no momento</div>
      </div>
    </div>

    <template #fallback>
      <div class="flex items-center gap-3">
        <div
          class="size-12 rounded-lg bg-elevated flex items-center justify-center shrink-0"
        >
          <UIcon name="i-lucide-music" class="text-xl text-muted" />
        </div>
        <div class="flex-1 space-y-1.5 min-w-0">
          <div class="h-4 w-3/4 bg-elevated rounded" />
          <div class="h-3 w-1/2 bg-elevated rounded" />
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<script setup lang="ts">
type TrackData = {
  playing: boolean;
  track_name?: string;
  artist?: string;
  cover_url?: string;
};

const track = ref<TrackData | null>(null);
const loading = ref(true);

async function fetchNowPlaying() {
  try {
    const data = await $fetch("/api/spotify/now-playing");
    track.value = data as TrackData;
  } catch {
    track.value = { playing: false };
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchNowPlaying();
  setInterval(fetchNowPlaying, 15000);
});
</script>
