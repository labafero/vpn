<template>
  <UMarquee class="px-5 py-2.5 uppercase">
    <span v-for="line in lines" :key="line" class="flex gap-16">
      <span class="text-purple-600">//</span>
      <span>{{ line }}</span>
    </span>
  </UMarquee>
</template>

<script lang="ts" setup>
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
};

const posts = ref<Post[]>([]);
const loading = ref(true);

onMounted(async () => {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(5);

  if (data) posts.value = data as Post[];
  loading.value = false;
});

const lines = computed(() => {
  if (loading.value) return ["Carregando..."];
  if (posts.value.length === 0) return ["Nenhuma matéria encontrada."];

  return posts.value.map((post) => post.title);
});
</script>
