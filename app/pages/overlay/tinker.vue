<template>
  <div class="flex">
    <UMarquee
      :overlay="false"
      class="bg-[#361313] text-[#FF0000] px-5 py-2.5 text-3xl uppercase"
    >
      <span
        v-for="line in lines"
        :key="line"
        class="flex gap-16"
      >
        <span>//</span>
        <span>{{ line }}</span>
      </span>
    </UMarquee>
    <div class="bg-[#371A63] text-[#B78CFB] px-5 py-2.5 text-3xl whitespace-nowrap">
      ÚLTIMAS MATÉRIAS
    </div>
  </div>
</template>

<script lang="ts" setup>
const allPosts = await queryCollection('blog').order('date', 'DESC').all()

const lines = computed(() => {
  return allPosts.map(post => post.title)
})
</script>
