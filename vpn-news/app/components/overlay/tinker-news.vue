<template>
  <UMarquee class="px-5 py-2.5 uppercase">
    <span v-for="post in posts" :key="post.id" class="flex gap-16">
      <span :class="cor.text">//</span>
      <span>
        <span v-if="!cidadeSlug" :class="cor.text">{{ post.cidade }}:</span>
        {{ post.title }}
      </span>
    </span>
  </UMarquee>
</template>

<script lang="ts" setup>
const { cor, cidadeSlug } = useOverlayState();

const supabase = useSupabaseClient();

type Post = {
  id: number;
  title: string;
  body: string;
  cover_url: string;
  destaque: boolean;
  user_id: string;
  created_at: string;
  published_at: string;
  cidade: string;
};

const posts = ref<Post[]>([]);

onMounted(async () => {
  let query = supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(5);

  if (cidadeSlug.value) query = query.ilike("cidade", cidadeSlug.value);

  const { data } = await query;
  if (data) posts.value = data as Post[];
});
</script>
