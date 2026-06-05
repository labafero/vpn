<script setup lang="ts">
definePageMeta({ middleware: "auth", layout: "default" });

const route = useRoute();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const { uploadFile, deleteFile, validateFile } = usePostMedia();

type Post = {
  title: string;
  body: string;
  cover_url: string;
  media_url: string | null;
  media_type: "audio" | "video" | null;
  destaque: boolean;
  published_at: string;
  user_id: string;
};

const postId = Number(route.params.id);
const post = ref<Post | null>(null);
const loading = ref(true);

onMounted(async () => {
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();

  loading.value = false;

  if (error || !data) {
    router.push("/redacao");
    return;
  }

  const postData = data as Post;

  if (postData.user_id !== user.value?.sub) {
    router.push("/redacao");
    return;
  }

  post.value = postData;
});

const postFormRef = ref<{ setSubmitting: (v: boolean) => void } | null>(null);

async function handleSubmit(data: {
  title: string;
  body: string;
  coverFile: File | null;
  mediaFile: File | null;
  removeCover: boolean;
  removeMedia: boolean;
  destaque: boolean;
  publishedAt: string;
}) {
  const userId = user.value?.sub;
  if (!userId) throw new Error("Usuário não autenticado");
  const update: {
    title?: string;
    body?: string;
    cover_url?: string;
    media_url?: string | null;
    media_type?: "audio" | "video" | null;
    destaque?: boolean;
    published_at?: string;
  } = {
    title: data.title,
    body: data.body,
    destaque: data.destaque,
    published_at: data.publishedAt,
  };

  if (data.removeCover && data.coverFile) {
    const err = validateFile(data.coverFile, "cover");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    if (post.value?.cover_url) {
      await deleteFile(post.value.cover_url).catch(() => {});
    }
    update.cover_url = await uploadFile(data.coverFile, userId);
  } else if (data.removeCover) {
    if (post.value?.cover_url) {
      await deleteFile(post.value.cover_url).catch(() => {});
    }
    update.cover_url = "";
  } else if (data.coverFile) {
    const err = validateFile(data.coverFile, "cover");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    if (post.value?.cover_url) {
      await deleteFile(post.value.cover_url).catch(() => {});
    }
    update.cover_url = await uploadFile(data.coverFile, userId);
  }

  if (data.removeMedia && data.mediaFile) {
    const err = validateFile(data.mediaFile, "media");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    if (post.value?.media_url) {
      await deleteFile(post.value.media_url).catch(() => {});
    }
    update.media_url = await uploadFile(data.mediaFile, userId);
    update.media_type = data.mediaFile.type.startsWith("video/")
      ? "video"
      : "audio";
  } else if (data.removeMedia) {
    if (post.value?.media_url) {
      await deleteFile(post.value.media_url).catch(() => {});
    }
    update.media_url = null;
    update.media_type = null;
  } else if (data.mediaFile) {
    const err = validateFile(data.mediaFile, "media");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    if (post.value?.media_url) {
      await deleteFile(post.value.media_url).catch(() => {});
    }
    update.media_url = await uploadFile(data.mediaFile, userId);
    update.media_type = data.mediaFile.type.startsWith("video/")
      ? "video"
      : "audio";
  }

  const { error } = await supabase
    .from("posts")
    .update(update)
    .eq("id", postId);

  if (error) {
    postFormRef.value?.setSubmitting(false);
    return;
  }

  router.push("/redacao");
}
</script>

<template>
  <UDashboardNavbar title="Editar Post">
    <template #right>
      <UButton color="neutral" variant="ghost" to="/redacao">
        Cancelar
      </UButton>
    </template>
  </UDashboardNavbar>

  <div class="p-4">
    <p v-if="loading" class="text-gray-500">Carregando...</p>

    <PostForm
      v-else-if="post"
      ref="postFormRef"
      :initial-title="post.title"
      :initial-body="post.body"
      :initial-cover-url="post.cover_url"
      :initial-media-url="post.media_url ?? undefined"
      :initial-media-type="post.media_type"
      :initial-destaque="post.destaque"
      :initial-published-at="post.published_at"
      submit-label="Salvar"
      @submit="handleSubmit"
    />
  </div>
</template>
