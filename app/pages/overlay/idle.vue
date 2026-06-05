<template>
  <div class="flex flex-col h-screen">
    <div class="flex-1 w-full grid grid-cols-2 grid-rows-2">
      <!-- OBS Game Capture Placeholder -->
      <div
        class="col-span-2 bg-neutral-900 w-full h-full flex items-center justify-center select-none"
      >
        <div class="text-center text-white/20">
          <div class="text-lg uppercase tracking-[0.3em]">Servidor Online</div>
          <div class="text-xs tracking-[0.2em] mt-2">CAM 01</div>
        </div>
      </div>

      <!-- Breaking News -->
      <div class="w-full h-full relative overflow-hidden bg-neutral-900">
        <PostSlider
          :posts="destaques"
          :label="destaques.length > 0 ? 'Em Destaque' : 'Última Edição'"
        />
      </div>

      <!-- Dashboard -->
      <OverlayDashboard />
    </div>

    <OverlayTinker />
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
};

const posts = ref<Post[]>([]);
const loading = ref(true);

const destaques = computed(() => posts.value.filter((p) => p.destaque));

onMounted(async () => {
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (data) posts.value = data as Post[];
  loading.value = false;
});
</script>
