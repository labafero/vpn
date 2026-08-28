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
const nomeCidade = computed(() => cidadeConfig.value?.cidade_nome ?? cidade.value);
const nomeJornal = computed(() => cidadeConfig.value?.jornal_nome ?? "Notícias da cidade");
const logoUrl = computed(() => cidadeConfig.value?.logo_url ?? "");

useSeoMeta({
  title: () => `${nomeJornal.value} · ${nomeCidade.value}`,
  description: () => `As principais notícias de ${nomeCidade.value}, com cobertura local em tempo real.`,
  ogTitle: () => `${nomeJornal.value} · ${nomeCidade.value}`,
});

const destaques = computed(() => posts.value.filter((p) => p.destaque));
const normais = computed(() => posts.value.filter((p) => !p.destaque));
const totalComMidia = computed(
  () => posts.value.filter((post) => post.media_url || post.cover_url).length,
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
  <div class="min-h-screen bg-default text-default">
    <!-- Sticky header -->
    <header
      class="sticky top-0 z-50 bg-default/90 backdrop-blur-sm border-b"
      :class="cor.border"
    >
      <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <img v-if="logoUrl" :src="logoUrl" :alt="`Logo ${nomeJornal}`" class="size-9 rounded-lg object-cover" />
          <div>
            <span class="block text-xs font-semibold uppercase tracking-[0.2em]" :class="cor.muted">{{ sigla }}</span>
            <span class="block text-sm font-semibold text-highlighted">{{ nomeCidade }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <UButton to="/" size="sm" color="neutral" variant="ghost" icon="i-lucide-globe-2" class="hidden sm:inline-flex">
            Todas as cidades
          </UButton>
          <UButton to="/redacao" size="sm" color="neutral" variant="ghost" icon="i-lucide-pen-line" aria-label="Redação" />
        </div>
      </div>
    </header>

    <!-- Loading state -->
    <template v-if="loading">
      <USkeleton class="h-80 sm:h-[30rem] w-full rounded-none" />
      <div class="max-w-6xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <USkeleton v-for="i in 6" :key="i" class="h-56 rounded-xl" />
        </div>
      </div>
    </template>

    <template v-else>
      <section class="relative overflow-hidden border-b border-muted">
        <div class="absolute inset-0 opacity-20 pointer-events-none" :class="cor.bg" />
        <div class="relative max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <div class="max-w-3xl space-y-5">
            <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em]" :class="cor.muted">
              <span class="size-2 rounded-full" :class="cor.bg" />
              Cobertura local · {{ nomeCidade }}
            </div>
            <h1 class="text-4xl sm:text-6xl font-black tracking-tight text-highlighted">{{ nomeJornal }}</h1>
            <p class="text-lg sm:text-xl text-muted max-w-2xl">A cidade em movimento, contada por quem está na rua. Notícias, bastidores e os fatos que mudam o ritmo de {{ nomeCidade }}.</p>
            <div class="flex flex-wrap gap-3 pt-2">
              <UButton to="#ultimas" size="lg" :class="cor.bg" trailing-icon="i-lucide-arrow-down">Ler últimas notícias</UButton>
              <UButton to="/" size="lg" color="neutral" variant="outline">Explorar a VPN</UButton>
            </div>
          </div>
        </div>
      </section>

      <div class="max-w-6xl mx-auto px-4 py-10 space-y-10">
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          <UCard :ui="{ body: 'p-4 sm:p-5' }">
            <p class="text-xs uppercase tracking-wider text-muted">Matérias publicadas</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ posts.length }}</p>
          </UCard>
          <UCard :ui="{ body: 'p-4 sm:p-5' }">
            <p class="text-xs uppercase tracking-wider text-muted">Em destaque</p>
            <p class="mt-1 text-2xl font-bold" :class="cor.text">{{ destaques.length }}</p>
          </UCard>
          <UCard class="col-span-2 md:col-span-1" :ui="{ body: 'p-4 sm:p-5' }">
            <p class="text-xs uppercase tracking-wider text-muted">Cobertura multimídia</p>
            <p class="mt-1 text-2xl font-bold text-highlighted">{{ totalComMidia }}</p>
          </UCard>
        </div>

        <section v-if="destaques.length > 0" aria-labelledby="destaques-title" class="space-y-4">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em]" :class="cor.muted">Agora</p>
              <h2 id="destaques-title" class="text-2xl sm:text-3xl font-bold text-highlighted">O que está movimentando {{ nomeCidade }}</h2>
            </div>
          </div>
          <div class="h-72 sm:h-[26rem] overflow-hidden rounded-2xl border border-muted bg-elevated">
            <PostSlider :posts="destaques" label="Em destaque" />
          </div>
        </section>

        <section id="ultimas" aria-labelledby="ultimas-title" class="space-y-5">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em]" :class="cor.muted">Arquivo vivo</p>
              <h2 id="ultimas-title" class="text-2xl sm:text-3xl font-bold text-highlighted">Últimas notícias</h2>
            </div>
            <span class="text-sm text-muted">{{ normais.length }} matérias</span>
          </div>
        <!-- Empty state -->
        <p
          v-if="normais.length === 0 && destaques.length === 0"
          class="text-muted text-center py-12 rounded-2xl border border-dashed border-muted"
        >
          Nenhuma matéria disponível em {{ cidadeConfig?.cidade_nome ?? cidade }}.
        </p>

        <!-- Post grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <article
            v-for="post in normais"
            :key="post.id"
            class="group bg-elevated rounded-2xl overflow-hidden flex flex-col border border-muted transition-colors hover:border-accented"
          >
            <!-- Cover -->
            <div class="aspect-video bg-muted overflow-hidden">
              <img
                v-if="post.cover_url"
                :src="post.cover_url"
                :alt="post.title"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-dimmed"
              >
                <UIcon name="lucide:newspaper" class="w-8 h-8" />
              </div>
            </div>

            <!-- Content -->
            <div class="p-5 flex flex-col flex-1">
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

              <h3 class="font-bold text-highlighted leading-snug mb-2 line-clamp-2">
                {{ post.title }}
              </h3>

              <p class="text-muted text-sm line-clamp-3 flex-1">
                {{ post.body }}
              </p>

              <div class="mt-4 pt-3 border-t border-muted text-xs text-muted">
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
        </section>

        <footer class="pt-4 border-t border-muted flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted">
          <span>{{ nomeJornal }} · {{ nomeCidade }}</span>
          <UButton to="/" color="neutral" variant="link" trailing-icon="i-lucide-arrow-right">Voltar para a cobertura geral</UButton>
        </footer>
      </div>
    </template>
  </div>
</template>
