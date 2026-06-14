<template>
  <UMarquee class="px-5 py-2.5 uppercase">
    <span v-for="post in posts" :key="post.id" class="flex gap-16">
      <span :class="cor.text">//</span>
      <span>
        <span :class="cor.text">{{ post.cidade }}:</span> {{ post.title }}
      </span>
    </span>
  </UMarquee>
</template>

<script lang="ts" setup>
import { corClasses, DEFAULT_COR, type CorPrimaria } from "~/utils/cidadeColors";

const props = defineProps<{
  corKey?: CorPrimaria;
}>();

const cor = computed(() => corClasses[props.corKey ?? DEFAULT_COR]);

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
  const { data } = await supabase
    .from("posts")
    .select("*")
    .order("published_at", { ascending: false })
    .limit(5);

  if (data) posts.value = data as Post[];
});
</script>
