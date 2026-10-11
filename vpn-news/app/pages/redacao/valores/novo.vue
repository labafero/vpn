<script setup lang="ts">
definePageMeta({ middleware: ['auth', 'editorial'] })
const router = useRouter()
const toast = useToast()
function saved(selection: { cidade: string; itemId: number }) {
  toast.add({ title: 'Valor registrado', color: 'success' })
  router.push({ path: '/redacao/valores', query: { cidade: selection.cidade, item: selection.itemId } })
}
</script>

<template>
  <UDashboardPanel>
    <template #header><UDashboardNavbar title="Registrar valor" /></template>
    <template #body><div class="p-4"><MarketValueWizard @saved="saved" /></div></template>
  </UDashboardPanel>
</template>

