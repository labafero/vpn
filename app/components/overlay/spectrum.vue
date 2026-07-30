<template>
  <div
    class="relative flex items-stretch overflow-hidden border-t border-neutral-700 bg-neutral-950/95"
  >
    <div
      class="absolute inset-x-0 top-0 h-0.5 bg-linear-to-r from-cyan-400 via-fuchsia-500 to-amber-400"
    />

    <div class="flex min-w-0 flex-1 items-center py-2 pl-5">
      <div class="mr-4 flex items-center gap-2 whitespace-nowrap">
        <span class="relative flex size-2.5">
          <span
            class="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75"
          />
          <span class="relative inline-flex size-2.5 rounded-full bg-red-500" />
        </span>
        <span class="text-xs font-bold tracking-[0.2em] text-white uppercase">
          Ao vivo
        </span>
      </div>

      <USeparator orientation="vertical" class="h-7" />
      <OverlayTinkerNews class="min-w-0 flex-1" />
    </div>

    <div
      class="relative flex shrink-0 items-center gap-4 border-l border-neutral-700 px-5 py-2"
    >
      <div class="text-right leading-tight">
        <div class="font-bold tracking-wide uppercase" :class="cor.text">
          {{ sigla }}
        </div>
        <div class="text-xs text-neutral-400">{{ nome }}</div>
      </div>
      <div
        class="h-8 w-1 rounded-full bg-linear-to-b from-cyan-400 via-fuchsia-500 to-amber-400"
      />
    </div>
  </div>
</template>

<script lang="ts" setup>
const { cor, sigla, nome } = useOverlayState();
</script>
