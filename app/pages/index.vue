<script setup lang="ts">
const supabase = useSupabaseClient();
const user = useSupabaseUser();

type Post = {
  id: number;
  title: string;
  body: string;
  cover_url: string;
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
    <UPageHero title="VPN" :links="[{ label: 'Redação', to: '/redacao', trailingIcon: 'lucide:arrow-right' }]" />

    <UPageBody>
      <UContainer>
        <UBlogPosts>
          <UBlogPost v-for="(post, index) in posts" :key="index" v-bind="post" />
        </UBlogPosts>
      </UContainer>
    </UPageBody>
  </UPage>
</template>
