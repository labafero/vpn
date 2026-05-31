<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const route = useRoute();
const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();

type Post = {
  title: string;
  body: string;
  cover_url: string;
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

  if (postData.user_id !== user.value?.id) {
    router.push("/redacao");
    return;
  }

  post.value = postData;
});

const postFormRef = ref<{ setSubmitting: (v: boolean) => void } | null>(null);

async function handleSubmit(data: {
  title: string;
  body: string;
  cover_url: string;
}) {
  const { error } = await supabase.from("posts").update(data).eq("id", postId);

  if (error) {
    postFormRef.value?.setSubmitting(false);
    return;
  }

  router.push("/redacao");
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-6">Editar Post</h1>

    <p v-if="loading" class="text-gray-500">Carregando...</p>

    <PostForm
      v-else-if="post"
      ref="postFormRef"
      :initial-title="post.title"
      :initial-body="post.body"
      :initial-cover-url="post.cover_url"
      submit-label="Salvar"
      @submit="handleSubmit"
    />
  </div>
</template>
