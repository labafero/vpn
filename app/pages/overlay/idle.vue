<template>
  <div class="flex flex-col h-screen">
    <div class="h-full w-full grid grid-cols-2 grid-rows-2">
      <div class="bg-red-500 w-full h-full"></div>
      <div class="bg-green-500 w-full h-full"></div>
      <div class="bg-blue-500 w-full h-full"></div>
      <div class="bg-amber-500 w-full h-full"></div>
    </div>
    <div class="flex items-center border-t border-purple-600 py-2 px-5">
      <div class="border-l border-purple-600 py-1 pl-4 whitespace-nowrap">
        <span class="text-purple-600">NEON</span>
        TV
      </div>
      <OverlayTinker />
      <div class="flex gap-2 items-center whitespace-nowrap">
        <UBadge color="error" />
        <span>AO VIVO</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup></script>

<style></style>
