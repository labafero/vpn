<script setup lang="ts">
import { normalizarCidadeSlug } from "~/utils/cidadeColors";

definePageMeta({ middleware: "auth", layout: "default" });

const supabase = useSupabaseClient();
const user = useSupabaseUser();
const router = useRouter();
const { uploadFile, validateFile } = usePostMedia();

const postFormRef = ref<{ setSubmitting: (v: boolean) => void } | null>(null);

async function handleSubmit(data: {
  title: string;
  body: string;
  cidade: string;
  season: string;
  coverFile: File | null;
  mediaFile: File | null;
  removeCover: boolean;
  removeMedia: boolean;
  destaque: boolean;
  publishedAt: string;
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
    cidade: normalizarCidadeSlug(data.cidade),
    season: data.season || null,
    cover_url: coverUrl,
    media_url: mediaUrl,
    media_type: mediaType,
    destaque: data.destaque,
    published_at: data.publishedAt || new Date().toISOString(),
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
  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar title="Novo Post"> </UDashboardNavbar>
    </template>

    <template #body>
      <div class="p-4">
        <PostForm ref="postFormRef" @submit="handleSubmit" />
      </div>
    </template>
  </UDashboardPanel>
</template>
