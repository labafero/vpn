<template>
  <div
    class="bg-linear-to-tr w-55 from-black/50 to-[#0E300E] p-5 rounded-md inline-flex flex-col items-end text-white"
  >
    <div>
      REC
      <span class="inline-block w-2.5 h-2.5 bg-[#FF0000] rounded-full" />
    </div>
    <div>VPN CONECTADA</div>
    <ClientOnly>
      <div>{{ formatted }}</div>
      <template #fallback> ##/##/####, ##:##:## </template>
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
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
