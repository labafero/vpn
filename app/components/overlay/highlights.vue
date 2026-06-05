<template>
  <div class="w-full h-full relative overflow-hidden bg-neutral-900">
    <PostSlider
      :posts="destaques"
      :label="destaques.length > 0 ? 'Em Destaque' : 'Última Edição'"
    />
  </div>
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

const destaques = computed(() => posts.value.filter((p) => p.destaque));

onMounted(async () => {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false });

  if (data) posts.value = data as Post[];
  loading.value = false;
});
</script>

<style></style>
