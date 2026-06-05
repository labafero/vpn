<script setup lang="ts">
definePageMeta({ middleware: "auth" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const { uploadFile, validateFile } = usePostMedia();

const postFormRef = ref<{ setSubmitting: (v: boolean) => void } | null>(null);

async function handleSubmit(data: {
  title: string;
  body: string;
  coverFile: File | null;
  mediaFile: File | null;
  removeCover: boolean;
  removeMedia: boolean;
  destaque: boolean;
}) {
  const userId = user.value?.sub;
  if (!userId) throw new Error("Usuário não autenticado");

  let coverUrl = "";
  let mediaUrl: string | null = null;
  let mediaType: "audio" | "video" | null = null;

  if (data.coverFile) {
    const err = validateFile(data.coverFile, "cover");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    coverUrl = await uploadFile(data.coverFile, userId);
  }

  if (data.mediaFile) {
    const err = validateFile(data.mediaFile, "media");
    if (err) {
      postFormRef.value?.setSubmitting(false);
      return;
    }
    mediaUrl = await uploadFile(data.mediaFile, userId);
    mediaType = data.mediaFile.type.startsWith("video/") ? "video" : "audio";
  }

  const { error } = await supabase.from("posts").insert({
    title: data.title,
    body: data.body,
    cover_url: coverUrl,
    media_url: mediaUrl,
    media_type: mediaType,
    destaque: data.destaque,
    user_id: userId,
  });

  if (error) {
    postFormRef.value?.setSubmitting(false);
    return;
  }

  router.push("/redacao");
}
</script>

<template>
  <div class="max-w-3xl mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-6">Novo Post</h1>
    <PostForm ref="postFormRef" @submit="handleSubmit" />
  </div>
</template>
