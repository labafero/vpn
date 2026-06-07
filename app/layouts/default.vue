<script setup lang="ts">
import type { NavigationMenuItem } from "@nuxt/ui";

const open = ref(true);
const router = useRouter();

defineShortcuts({
  "g-r": () => router.push("/redacao"),
  "g-n": () => router.push("/redacao/novo"),
  "g-o": () => router.push("/overlay"),
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
]);

const links2 = computed<NavigationMenuItem[]>(() => [
  {
    label: "Overlay",
    icon: "i-lucide-monitor",
    defaultOpen: true,
    children: [
      {
        label: "Jornal",
        to: "/overlay",
        target: "_blank",
        onSelect: closeSidebar,
      },
      {
        label: "Monitoramento",
        to: "/overlay/idle",
        target: "_blank",
        onSelect: closeSidebar,
      },
    ],
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
        id: "overlay",
        label: "Overlay",
        icon: "i-lucide-monitor",
        to: "/overlay",
        target: "_blank",
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
          <span class="text-xl font-bold">Neon TV</span>
        </div>
      </template>

      <template #default>
        <UDashboardSearchButton label="Buscar" />
        <UNavigationMenu :items="links" orientation="vertical" />
        <USeparator orientation="horizontal" />
        <UNavigationMenu :items="links2" orientation="vertical" />
      </template>

      <template #footer>
        <UserMenu />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="searchGroups" />

    <slot />
  </UDashboardGroup>
</template>
