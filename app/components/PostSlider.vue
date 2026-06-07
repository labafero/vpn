<script setup lang="ts">
type Post = {
  id: number
  title: string
  body: string
  cover_url: string
}

const props = withDefaults(defineProps<{
  posts: Post[]
  label?: string
}>(), {
  label: 'Em Destaque',
})

const currentSlide = ref(0)

let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (postsLength.value <= 1) return
  intervalId = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % postsLength.value
  }, 10000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})

const postsLength = computed(() => props.posts.length)

watch(postsLength, (len) => {
  if (currentSlide.value >= len) currentSlide.value = 0
})
</script>

<template>
  <div class="relative overflow-hidden h-full w-full bg-neutral-900">
    <div v-if="posts.length > 0" class="h-full">
      <div
        class="flex h-full transition-transform duration-500 ease-in-out"
        :style="{ transform: `translateX(-${currentSlide * 100}%)` }"
      >
        <div
          v-for="post in posts"
          :key="post.id"
          class="min-w-full h-full shrink-0 relative"
        >
          <img
            v-if="post.cover_url"
            :src="post.cover_url"
            alt=""
            class="absolute inset-0 w-full h-full object-contain"
          />
          <div class="absolute inset-0 bg-black/60" />
          <div class="relative z-10 h-full flex items-center p-6">
            <div>
              <div class="uppercase text-xs text-white/60 mb-1 tracking-wider">
                {{ label }}
              </div>
              <div class="text-2xl font-bold leading-tight mb-2 text-white truncate max-w-prose">
                {{ post.title }}
              </div>
              <div class="text-white/80 line-clamp-5 max-w-prose">
                {{ post.body }}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="posts.length > 1"
        class="absolute bottom-4 left-4 flex gap-1.5 z-20"
      >
        <button
          v-for="(_, idx) in posts"
          :key="idx"
          class="w-2 h-2 rounded-full transition-all duration-300"
          :class="idx === currentSlide ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60'"
          @click="currentSlide = idx"
        />
      </div>
    </div>
    <div
      v-else
      class="flex items-center justify-center text-white/50 h-full text-sm"
    >
      Nenhum destaque no momento.
    </div>
  </div>
</template>
