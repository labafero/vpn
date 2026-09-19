<script setup lang="ts">
type Highlight = {
  id: number;
  title: string;
  body: string;
  cover_url: string;
};

defineProps<{
  posts: Highlight[];
}>();
</script>

<template>
  <div class="relative">
    <div class="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <article
        v-for="(post, index) in posts"
        :id="`cidade-destaque-${index}`"
        :key="post.id"
        class="grid min-w-full snap-start grid-cols-1 md:grid-cols-2 bg-elevated"
      >
        <div class="order-2 flex flex-col justify-center p-7 sm:p-10 md:order-1">
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Destaque {{ index + 1 }} de {{ posts.length }}</span>
          <h3 class="mt-3 text-2xl font-bold text-highlighted sm:text-3xl">{{ post.title }}</h3>
          <p class="mt-3 line-clamp-7 text-sm leading-relaxed text-muted sm:text-base">{{ post.body }}</p>
        </div>
        <div class="order-1 aspect-video overflow-hidden bg-muted md:order-2 md:aspect-auto md:min-h-80">
          <img v-if="post.cover_url" :src="post.cover_url" :alt="post.title" class="h-full w-full object-cover" loading="lazy" />
          <div v-else class="flex h-full items-center justify-center text-dimmed">
            <UIcon name="i-lucide-newspaper" class="size-10" />
          </div>
        </div>
      </article>
    </div>

    <nav v-if="posts.length > 1" aria-label="Controles dos destaques" class="pointer-events-none absolute inset-x-0 bottom-4 flex justify-between px-4 sm:px-6">
      <a
        v-for="(post, index) in posts"
        :key="`controls-${post.id}`"
        :href="`#cidade-destaque-${index === 0 ? posts.length - 1 : index - 1}`"
        :aria-label="`Destaque anterior a ${post.title}`"
        class="pointer-events-auto hidden size-9 items-center justify-center rounded-full border border-default bg-default/90 text-default shadow-sm transition hover:bg-accented focus-visible:outline-2 focus-visible:outline-offset-2 first:flex"
      >
        <UIcon name="i-lucide-arrow-left" class="size-4" />
      </a>
      <a
        v-for="(post, index) in posts"
        :key="`next-${post.id}`"
        :href="`#cidade-destaque-${index === posts.length - 1 ? 0 : index + 1}`"
        :aria-label="`Próximo destaque: ${post.title}`"
        class="pointer-events-auto hidden size-9 items-center justify-center rounded-full border border-default bg-default/90 text-default shadow-sm transition hover:bg-accented focus-visible:outline-2 focus-visible:outline-offset-2 last:flex"
      >
        <UIcon name="i-lucide-arrow-right" class="size-4" />
      </a>
    </nav>
  </div>
</template>
