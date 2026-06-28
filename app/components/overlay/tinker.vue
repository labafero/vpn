<template>
  <div class="flex items-center border-t py-2 px-5 border-neutral-700">
    <UBadge class="animate-pulse" :class="cor.bg" />
    <OverlayTinkerNews />
    <USeparator orientation="vertical" class="animate-pulse" size="md" />
    <div class="py-1 pl-4 whitespace-nowrap">
      <div>
        <span :class="cor.text" class="font-bold">{{ sigla }}</span>
        <small><i> Roleplay</i></small>
      </div>
      <div class="text-sm">{{ nome }}</div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const { cor, sigla, nome } = useOverlayState();
</script>
