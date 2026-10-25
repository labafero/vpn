<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const open = ref(false)
const router = useRouter()

defineShortcuts({
  'g-r': () => router.push('/redacao'),
  'g-n': () => router.push('/redacao/novo'),
  'g-t': () => router.push('/redacao/transmissao'),
  'g-c': () => router.push('/redacao/cidades'),
  'g-b': () => router.push('/redacao/base'),
  'g-v': () => router.push('/redacao/valores')
})

function closeSidebar() {
  if (import.meta.client && window.innerWidth < 1024) {
    open.value = false
  }
}

const links = computed<NavigationMenuItem[]>(() => [
  { label: 'Valores', icon: 'i-lucide-chart-line', to: '/redacao/valores', onSelect: closeSidebar },
  {
    label: 'Redação',
    icon: 'i-lucide-pen-line',
    to: '/redacao',
    onSelect: closeSidebar
  },
  {
    label: 'Novo Post',
    icon: 'i-lucide-plus',
    to: '/redacao/novo',
    onSelect: closeSidebar
  },
  {
    label: 'Transmissão',
    icon: 'i-lucide-radio',
    to: '/redacao/transmissao',
    onSelect: closeSidebar
  },
  {
    label: 'Cidades',
    icon: 'i-lucide-map-pin',
    to: '/redacao/cidades',
    onSelect: closeSidebar
  },
  {
    label: 'Base de Dados',
    icon: 'i-lucide-database',
    to: '/redacao/base',
    onSelect: closeSidebar
  }
])

const searchGroups = computed(() => [
  {
    id: 'go-to',
    label: 'Navegar',
    items: [
      {
        id: 'redacao',
        label: 'Redação',
        icon: 'i-lucide-pen-line',
        to: '/redacao'
      },
      {
        id: 'novo',
        label: 'Novo Post',
        icon: 'i-lucide-plus',
        to: '/redacao/novo'
      },
      {
        id: 'transmissao',
        label: 'Transmissão',
        icon: 'i-lucide-radio',
        to: '/redacao/transmissao'
      },
      {
        id: 'base',
        label: 'Base de Dados',
        icon: 'i-lucide-database',
        to: '/redacao/base'
      }
    ]
  }
])
</script>

<template>
  <div class="min-h-screen bg-vpn-ink text-default">
    <VpnAppNavigation />
    <UDashboardGroup
      unit="rem"
      class="editorial-dashboard"
    >
      <UDashboardSidebar
        id="dashboard"
        v-model:open="open"
        collapsible
        resizable
      >
        <template #default>
          <UDashboardSearchButton label="Buscar" />
          <UNavigationMenu
            :items="links"
            orientation="vertical"
          />
        </template>
      </UDashboardSidebar>

      <UDashboardSearch :groups="searchGroups" />

      <slot />
    </UDashboardGroup>
  </div>
</template>
