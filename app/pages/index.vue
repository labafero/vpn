<script setup lang="ts">
definePageMeta({ layout: "auth" });

const supabase = useSupabaseClient();

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

const destaques = computed(() => posts.value.filter((p) => p.destaque));
const normais = computed(() => posts.value.filter((p) => !p.destaque));
</script>

<template>
  <UPage>
    <UPageHero
      title="BRN Roleplay"
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
        <div v-if="loading" class="text-gray-500">Carregando...</div>

        <template v-else>
          <div v-if="destaques.length > 0" class="h-80 mb-8 rounded-lg overflow-hidden">
            <PostSlider :posts="destaques" label="Em Destaque" />
          </div>

          <div class="space-y-8">
            <div v-for="post in normais" :key="post.id" class="space-y-2">
              <UBlogPost
                :title="post.title"
                :description="post.body"
                :image="post.cover_url || undefined"
                :date="post.published_at"
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

            <p v-if="normais.length === 0 && destaques.length === 0" class="text-gray-500">
              Nenhum post ainda.
            </p>
          </div>
        </template>
      </UContainer>
    </UPageBody>
  </UPage>
</template>
