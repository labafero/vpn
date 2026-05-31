<template>
  <div class="flex">
    <UMarquee :overlay="false" class="bg-[#361313] text-[#FF0000] px-5 py-2.5 text-3xl uppercase">
      <span v-for="line in lines" :key="line" class="flex gap-16">
        <span>//</span>
        <span>{{ line }}</span>
      </span>
    </UMarquee>
    <div class="bg-[#371A63] flex items-center gap-2 text-[#B78CFB] px-5 py-2.5 text-3xl whitespace-nowrap uppercase">
      <UBadge class="animate-pulse" />
      <span>vpn.labafero.com</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
const supabase = useSupabaseClient();

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
    .order("created_at", { ascending: false })
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
