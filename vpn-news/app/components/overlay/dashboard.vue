<template>
  <div
    class="border-t-2 overflow-hidden w-full h-full p-5 flex flex-col"
    :class="cor.border"
  >
    <OverlayBroadcastStatus />
  </div>
</template>

<script lang="ts" setup>
const { cor } = useOverlayState();
</script>
