<script setup lang="ts">
type Post = {
  id: number
  title: string
  body: string
  cidade: string
  cover_url: string
}

withDefaults(
  defineProps<{
    posts: Post[]
    label?: string
    responsive?: boolean
  }>(),
  {
    label: 'Em Destaque',
    responsive: false
  }
)
</script>

<template>
  <UCarousel
    v-slot="{ item }"
    loop
    arrows
    :autoplay="{ delay: 10000 }"
    fade
    auto-scroll
    :class="responsive ? 'h-full' : undefined"
    :ui="{
      item: responsive
        ? 'grid grid-cols-1 sm:grid-cols-2 h-full select-none'
        : 'grid grid-cols-2 h-full select-none',
      viewport: responsive ? 'h-full' : undefined,
      container: responsive ? 'h-full' : undefined,
      prev: responsive ? 'start-2 sm:start-2' : undefined,
      next: responsive ? 'end-2 sm:end-2' : undefined
    }"
    :items="posts"
  >
    <div :class="responsive ? 'min-w-0 px-12 py-6 sm:p-10' : 'p-10'">
      <h2
        class="font-bold font-serif"
        :class="responsive ? 'text-xl sm:text-3xl line-clamp-3 wrap-anywhere' : 'text-3xl'"
      >
        {{ item.title }}
      </h2>
      <p
        class="opacity-60 mt-3 text-justify"
        :class="responsive ? 'line-clamp-3 sm:line-clamp-7 wrap-anywhere' : 'line-clamp-7'"
      >
        {{ item.body }}
      </p>
    </div>
    <img
      :src="item.cover_url"
      :alt="item.title"
      class="object-cover w-full"
      :class="responsive ? 'hidden h-full sm:block' : 'h-100'"
    />
  </UCarousel>
</template>
