<script setup lang="ts">
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();

type Post = {
  id: number;
  title: string;
  body: string;
  cidade: string;
  cover_url: string;
  media_url: string | null;
  media_type: "audio" | "video" | null;
  destaque: boolean;
  user_id: string;
  created_at: string;
  published_at: string;
};

const posts = ref<Post[]>([]);
const loading = ref(true);

onMounted(async () => {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (data) posts.value = data as Post[];
  loading.value = false;
});

const destaques = computed(() => posts.value.filter((p) => p.destaque));
const normais = computed(() => posts.value.filter((p) => !p.destaque));

const cidades = computed(() => {
  const set = new Set(posts.value.map((p) => p.cidade).filter(Boolean));
  return [...set] as string[];
});

const activeTab = ref("todas");

const filtered = computed(() =>
  activeTab.value === "todas"
    ? normais.value
    : normais.value.filter((p) => p.cidade === activeTab.value),
);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
</script>

<template>
  <div class="min-h-screen bg-zinc-950 text-white">
    <!-- Sticky header -->
    <header class="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b border-red-600">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <span class="font-bold text-base tracking-tight">
          <span class="text-red-500">BRN</span> Roleplay
        </span>
        <UButton
          to="/redacao"
          size="sm"
          color="neutral"
          variant="ghost"
          icon="lucide:pen-line"
          aria-label="Redação"
        />
      </div>
    </header>

    <!-- Loading state -->
    <template v-if="loading">
      <USkeleton class="h-64 sm:h-96 w-full rounded-none" />
      <div class="max-w-5xl mx-auto px-4 py-6">
        <div class="flex gap-2 mb-6">
          <USkeleton v-for="i in 4" :key="i" class="h-8 w-24 rounded-full" />
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <USkeleton v-for="i in 6" :key="i" class="h-56 rounded-xl" />
        </div>
      </div>
    </template>

    <template v-else>
      <!-- Hero slider -->
      <div v-if="destaques.length > 0" class="h-64 sm:h-96">
        <PostSlider :posts="destaques" label="Em Destaque" />
      </div>

      <div class="max-w-5xl mx-auto px-4 py-6">
        <!-- Pills de cidade -->
        <div class="flex gap-2 overflow-x-auto pb-3 mb-6 -mx-4 px-4" style="scrollbar-width: none">
          <button
            class="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="activeTab === 'todas' ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'"
            @click="activeTab = 'todas'"
          >
            Todas
          </button>
          <button
            v-for="cidade in cidades"
            :key="cidade"
            class="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
            :class="activeTab === cidade ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'"
            @click="activeTab = cidade"
          >
            {{ cidade }}
          </button>
        </div>

        <!-- Empty state -->
        <p
          v-if="filtered.length === 0 && destaques.length === 0"
          class="text-zinc-500 text-center py-12"
        >
          Nenhuma matéria disponível.
        </p>
        <p
          v-else-if="filtered.length === 0"
          class="text-zinc-500 text-center py-12"
        >
          Nenhuma matéria nesta categoria.
        </p>

        <!-- Post grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <article
            v-for="post in filtered"
            :key="post.id"
            class="bg-zinc-900 rounded-xl overflow-hidden flex flex-col"
          >
            <!-- Cover -->
            <div class="aspect-video bg-zinc-800 overflow-hidden">
              <img
                v-if="post.cover_url"
                :src="post.cover_url"
                :alt="post.title"
                class="w-full h-full object-cover"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-zinc-700"
              >
                <UIcon name="lucide:newspaper" class="w-8 h-8" />
              </div>
            </div>

            <!-- Content -->
            <div class="p-4 flex flex-col flex-1">
              <div class="flex items-center gap-2 mb-2">
                <span
                  v-if="post.cidade"
                  class="text-xs font-semibold text-red-400 uppercase tracking-wider"
                >
                  {{ post.cidade }}
                </span>
                <UIcon
                  v-if="post.media_type === 'video'"
                  name="lucide:video"
                  class="w-3.5 h-3.5 text-zinc-500"
                />
                <UIcon
                  v-else-if="post.media_type === 'audio'"
                  name="lucide:headphones"
                  class="w-3.5 h-3.5 text-zinc-500"
                />
              </div>

              <h2 class="font-bold text-white leading-snug mb-2 line-clamp-2">
                {{ post.title }}
              </h2>

              <p class="text-zinc-400 text-sm line-clamp-3 flex-1">
                {{ post.body }}
              </p>

              <div class="mt-3 pt-3 border-t border-zinc-800 text-xs text-zinc-500">
                {{ formatDate(post.published_at) }}
              </div>

              <audio
                v-if="post.media_type === 'audio'"
                :src="post.media_url ?? undefined"
                controls
                class="w-full mt-3"
              />
              <video
                v-else-if="post.media_type === 'video'"
                :src="post.media_url ?? undefined"
                controls
                class="w-full mt-3 rounded-lg"
              />
            </div>
          </article>
        </div>
      </div>
    </template>
  </div>
</template>
