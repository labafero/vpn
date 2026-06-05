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
};

const posts = ref<Post[]>([]);
const loading = ref(true);

onMounted(async () => {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (data) posts.value = data as Post[];
  loading.value = false;
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
  <div class="max-w-3xl mx-auto py-8 px-4">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">Redação</h1>
      <UButton to="/redacao/novo"> Novo Post </UButton>
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
            {{ new Date(post.created_at).toLocaleDateString("pt-BR") }}
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
