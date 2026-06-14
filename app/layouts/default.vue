<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui"

const open = ref(true);
const router = useRouter();

defineShortcuts({
  "g-r": () => router.push("/redacao"),
  "g-n": () => router.push("/redacao/novo"),
  "g-t": () => router.push("/redacao/transmissao"),
  "g-v": () => router.push("/redacao/valores"),
  "g-c": () => router.push("/redacao/cidades"),
});

function closeSidebar() {
  if (import.meta.client && window.innerWidth < 768) {
    open.value = false;
  }
}

const links = computed<NavigationMenuItem[]>(() => [
  {
    label: "Redação",
    icon: "i-lucide-pen-line",
    to: "/redacao",
    onSelect: closeSidebar,
  },
  {
    label: "Novo Post",
    icon: "i-lucide-plus",
    to: "/redacao/novo",
    onSelect: closeSidebar,
  },
  {
    label: "Spotify",
    icon: "i-lucide-music",
    to: "/redacao/spotify",
    onSelect: closeSidebar,
  },
  {
    label: "Transmissão",
    icon: "i-lucide-radio",
    to: "/redacao/transmissao",
    onSelect: closeSidebar,
  },
  {
    label: "Valores",
    icon: "i-lucide-chart-line",
    to: "/redacao/valores",
    onSelect: closeSidebar,
  },
  {
    label: "Cidades",
    icon: "i-lucide-map-pin",
    to: "/redacao/cidades",
    onSelect: closeSidebar,
  },
]);

const searchGroups = computed(() => [
  {
    id: "go-to",
    label: "Navegar",
    items: [
      {
        id: "redacao",
        label: "Redação",
        icon: "i-lucide-pen-line",
        to: "/redacao",
      },
      {
        id: "novo",
        label: "Novo Post",
        icon: "i-lucide-plus",
        to: "/redacao/novo",
      },
      {
        id: "transmissao",
        label: "Transmissão",
        icon: "i-lucide-radio",
        to: "/redacao/transmissao",
      },
      {
        id: "valores",
        label: "Valores de Mercado",
        icon: "i-lucide-chart-line",
        to: "/redacao/valores",
      },
    ],
  },
]);
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="dashboard" v-model:open="open" collapsible resizable>
      <template #header>
        <div class="flex items-center gap-2 px-2 py-1">
          <span class="text-xl font-bold">BRN Roleplay</span>
        </div>
      </template>

      <template #default>
        <UDashboardSearchButton label="Buscar" />
        <UNavigationMenu :items="links" orientation="vertical" />
      </template>

      <template #footer>
        <UserMenu />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
