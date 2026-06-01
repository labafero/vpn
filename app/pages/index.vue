<script setup lang="ts">
const supabase = useSupabaseClient();

type Post = {
  id: number;
  title: string;
  body: string;
  cover_url: string;
  media_url: string | null;
  media_type: "audio" | "video" | null;
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
</script>

<template>
  <UPage>
    <UPageHero
      title="VPN"
      :links="[
        {
          label: 'Redação',
          to: '/redacao',
          trailingIcon: 'lucide:arrow-right',
        },
      ]"
    />

    <UPageBody>
      <UContainer>
        <div class="space-y-8">
          <div v-for="post in posts" :key="post.id" class="space-y-2">
            <UBlogPost
              :title="post.title"
              :description="post.body"
              :image="post.cover_url || undefined"
              :date="post.created_at"
            />
            <audio
              v-if="post.media_type === 'audio'"
              :src="post.media_url"
              controls
              class="w-full"
            />
            <video
              v-if="post.media_type === 'video'"
              :src="post.media_url"
              controls
              class="w-full max-h-64 rounded"
            />
          </div>
        </div>
      </UContainer>
    </UPageBody>
  </UPage>
</template>
