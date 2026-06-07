<template>
  <div class="flex flex-col h-screen">
    <div class="h-202.5 bg-green-500"></div>
    <div class="flex flex-col h-67.5 overflow-hidden">
      <OverlayTinker />

      <div
        class="w-full h-full border-t border-purple-900 flex items-center px-5 gap-5"
      >
        <div class="bg-elevated aspect-video h-32 rounded-md"></div>
        <div>
          <div class="flex items-center gap-2 text-xl">
            <UBadge variant="soft">Jacky Tequila</UBadge>
            <UBadge variant="soft" icon="lucide:user">1642</UBadge>
            <UBadge variant="soft" icon="lucide:smartphone">442-663</UBadge>
          </div>
          <div class="text-4xl mt-2 font-breaking">
            Alimentando a base de dados da Cidade: valores de serviços e
            produtos.
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

onMounted(() => {
  if (import.meta.client) {
    setInterval(() => {
      now.value = Date.now();
    }, 1000);
  }
});
</script>

<style></style>
