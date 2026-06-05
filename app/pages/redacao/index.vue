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
    { label: "Em Destaque", value: all.filter((p) => p.destaque).length, icon: "i-lucide-star" },
    { label: "Com Mídia", value: all.filter((p) => p.media_type).length, icon: "i-lucide-video" },
    {
      label: "Última Publicação",
      value: all[0]
        ? new Date(all[0].published_at).toLocaleDateString("pt-BR")
        : "—",
      icon: "i-lucide-calendar",
    },
  ];
});

async function remove(id: number) {
  if (!confirm("Tem certeza que deseja excluir este post?")) return;

  const post = posts.value.find((p) => p.id === id);
  if (!post) return;

  if (post.cover_url) {
    await deleteFile(post.cover_url).catch(() => {});
  }
  if (post.media_url) {
    await deleteFile(post.media_url).catch(() => {});
  }

  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (!error) posts.value = posts.value.filter((p) => p.id !== id);
}
</script>

<template>
  <UDashboardNavbar title="Redação">
    <template #right>
      <UButton to="/redacao/novo"> Novo Post </UButton>
    </template>
  </UDashboardNavbar>

  <div class="p-4 space-y-6">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <UCard v-for="stat in stats" :key="stat.label">
        <div class="flex items-center gap-3">
          <UIcon :name="stat.icon" class="text-2xl text-purple-500 shrink-0" />
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

    <div v-else class="space-y-4">
      <div
        v-for="post in posts"
        :key="post.id"
        class="border rounded-lg p-4 flex items-start gap-4"
      >
        <img
          v-if="post.cover_url"
          :src="post.cover_url"
          alt=""
          class="w-24 h-16 object-cover rounded shrink-0"
        />

        <div class="flex-1 min-w-0">
          <h2 class="font-semibold truncate">
            {{ post.title }}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            {{ new Date(post.published_at).toLocaleDateString("pt-BR") }}
          </p>
          <div class="flex items-center gap-2 mt-1">
            <UBadge v-if="post.destaque" color="warning" size="sm">
              Destaque
            </UBadge>
            <UBadge v-if="post.media_type === 'audio'" color="info" size="sm">
              Áudio
            </UBadge>
            <UBadge
              v-if="post.media_type === 'video'"
              color="warning"
              size="sm"
            >
              Vídeo
            </UBadge>
          </div>
          <p v-if="post.body" class="text-sm text-gray-600 mt-1 line-clamp-2">
            {{ post.body }}
          </p>
          <audio
            v-if="post.media_type === 'audio'"
            :src="post.media_url"
            controls
            class="w-full mt-2"
          />
          <video
            v-if="post.media_type === 'video'"
            :src="post.media_url"
            controls
            class="w-full max-h-32 rounded mt-2"
          />
        </div>

        <div v-if="post.user_id === user?.sub" class="flex gap-1 shrink-0">
          <UButton
            color="neutral"
            variant="outline"
            size="sm"
            :to="`/redacao/${post.id}/editar`"
          >
            Editar
          </UButton>
          <UButton
            color="error"
            variant="outline"
            size="sm"
            @click="remove(post.id)"
          >
            Excluir
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
