<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const { deleteFile } = usePostMedia();

type Post = {
  id: number;
  title: string;
  body: string;
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

const stats = computed(() => {
  const all = posts.value;
  return [
    { label: "Total de Posts", value: all.length, icon: "i-lucide-file-text" },
    {
      label: "Em Destaque",
      value: all.filter((p) => p.destaque).length,
      icon: "i-lucide-star",
    },
    {
      label: "Com Mídia",
      value: all.filter((p) => p.media_type).length,
      icon: "i-lucide-video",
    },
    {
      label: "Última Publicação",
      value: all[0]
        ? new Date(all[0].published_at).toLocaleDateString("pt-BR")
        : "—",
      icon: "i-lucide-calendar",
    },
  ];
});
</script>

<template>
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Redação">
        <template #right>
          <UButton to="/redacao/novo"> Novo Post </UButton>
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <div class="space-y-6">
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <UCard v-for="stat in stats" :key="stat.label">
            <div class="flex items-center gap-3">
              <UIcon :name="stat.icon" class="text-2xl" />
              <div>
                <div class="text-sm text-muted">{{ stat.label }}</div>
                <div class="text-xl font-bold">{{ stat.value }}</div>
              </div>
            </div>
          </UCard>
        </div>

        <p v-if="loading" class="text-gray-500">Carregando...</p>

        <p v-else-if="posts.length === 0" class="text-gray-500">
          Nenhum post ainda.
        </p>

        <div v-else class="grid grid-cols-2 gap-3">
          <UBlogPost
            v-for="post in posts"
            :key="post.id"
            orientation="vertical"
            :image="post.cover_url"
            :description="post.title"
            :to="`/redacao/${post.id}/editar`"
            :ui="{ description: 'line-clamp-1' }"
          />
        </div>
      </div>
    </template>
  </UDashboardPanel>
</template>
