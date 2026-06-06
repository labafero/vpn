<template>
  <div class="flex flex-col h-screen">
    <div class="h-[70vh] bg-neutral-700"></div>
    <div class="flex flex-col h-67.5">
      <!-- topbar -->
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

      <!-- content -->
      <div class="flex border-t border-slate-700 h-full">
        <!-- box left -->
        <div class="h-full flex flex-col justify-between p-5">
          <div>
            <div class="uppercase text-purple-600">Edição</div>
            <div class="opacity-70">Análise, gameplay e interação.</div>
          </div>
          <div>
            <ClientOnly>
              <div>{{ formatted }}</div>
              <template #fallback> ##/##/####, ##:##:## </template>
            </ClientOnly>
          </div>
        </div>

        <!-- box center -->
        <div class="w-full border-x border-slate-700 flex items-center px-5 gap-5">
          <div class="bg-black aspect-video h-40"></div>
          <div>
            <div class="text-xl">
              Neon TV
            </div>
            <div>Informação, análise e entretenimento ao vivo - direto do estúdio para você.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
definePageMeta({ layout: "overlay" });
useHead({
  title: "Overlay Jornal",
});

const now = ref(Date.now());

const formatted = computed(() => {
  return new Date(now.value).toLocaleString("pt-BR");
});

onMounted(() => {
  if (import.meta.client) {
    setInterval(() => {
      now.value = Date.now();
    }, 1000);
  }
});
</script>

<style></style>