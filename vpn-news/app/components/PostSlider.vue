<script setup lang="ts">
type Post = {
  id: number;
  title: string;
  body: string;
  cidade: string;
  cover_url: string;
};

withDefaults(
  defineProps<{
    posts: Post[];
    label?: string;
  }>(),
  {
    label: "Em Destaque",
  },
);

</script>

<template>
  <UCarousel
    v-slot="{ item }"
    loop
    arrows
    :autoplay="{ delay: 10000 }"
    fade
    auto-scroll
    :ui="{
      item: 'grid grid-cols-2 h-full select-none',
    }"
    :items="posts"
  >
    <div class="p-10">
      <h2 class="text-3xl font-bold font-serif">{{ item.title }}</h2>
      <p class="line-clamp-7 opacity-60 mt-3 text-justify">
        {{ item.body }}
      </p>
    </div>
    <img
      :src="item.cover_url"
      :alt="item.title"
      class="object-cover h-100 w-full"
    />
  </UCarousel>
</template>
