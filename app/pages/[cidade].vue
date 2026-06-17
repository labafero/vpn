<script setup lang="ts">
import { corClasses, DEFAULT_COR, DEFAULT_SIGLA, type CorPrimaria } from "~/utils/cidadeColors";

definePageMeta({ layout: "auth" });

const route = useRoute();
const cidade = computed(() => route.params.cidade as string);

const supabase = useSupabaseClient();
const { config: cidadeConfig, fetchBySlug } = useCidadeConfig();

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
  await Promise.all([
    fetchBySlug(cidade.value),
    supabase
      .from("posts")
      .select("*")
      .ilike("cidade", cidade.value)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) posts.value = data as Post[];
      }),
  ]);
  loading.value = false;
});

const cor = computed(
  () => corClasses[(cidadeConfig.value?.cor_primaria as CorPrimaria) ?? DEFAULT_COR],
);
const sigla = computed(() => cidadeConfig.value?.jornal_sigla ?? DEFAULT_SIGLA);

const destaques = computed(() => posts.value.filter((p) => p.destaque));
const normais = computed(() => posts.value.filter((p) => !p.destaque));

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
    <header
      class="sticky top-0 z-50 bg-zinc-950/95 backdrop-blur-sm border-b"
      :class="cor.border"
    >
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="font-bold text-base tracking-tight">
            <span :class="cor.text">{{ sigla }}</span>
          </span>
        </div>
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
        <!-- Empty state -->
        <p
          v-if="normais.length === 0 && destaques.length === 0"
          class="text-zinc-500 text-center py-12"
        >
          Nenhuma matéria disponível em {{ cidadeConfig?.cidade_nome ?? cidade }}.
        </p>

        <!-- Post grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <article
            v-for="post in normais"
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
                  class="text-xs font-semibold uppercase tracking-wider"
                  :class="cor.muted"
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
