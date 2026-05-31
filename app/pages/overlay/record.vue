<template>
  <div class="bg-linear-to-tr from-black/50 to-[#0E300E] p-5 rounded-md inline-flex flex-col items-end text-white">
    <div>TRANSMITINDO <span class="inline-block w-2.5 h-2.5 bg-[#FF0000] rounded-full"></span></div>
    <div>VPN CONECTADA</div>
    <div>[1642] JACKY TEQUILA</div>
    <ClientOnly>
      <div>{{ formatted }}</div>
      <template #fallback>
        ##/##/####, ##:##:##
      </template>
    </ClientOnly>
  </div>
</template>

<script lang="ts" setup>
const timestamp = ref(0)

const formatted = computed(() => {
  return new Date(timestamp.value).toLocaleString()
})

onMounted(() => {
  if (import.meta.client) {
    setInterval(() => {
      timestamp.value += 1
    }, 1000)
  }
})
</script>

<style></style>