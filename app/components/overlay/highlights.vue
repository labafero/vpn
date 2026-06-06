<template>
  <div class="w-full h-full relative overflow-hidden bg-neutral-900">
    <div v-if="loading" class="h-full w-full p-6 flex flex-col justify-center">
      <USkeleton class="h-3 w-20 mb-4" />
      <USkeleton class="h-8 w-3/4 mb-3" />
      <USkeleton class="h-4 w-full mb-2" />
      <USkeleton class="h-4 w-5/6 mb-2" />
      <USkeleton class="h-4 w-2/3" />
    </div>
    <PostSlider
      v-else
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
