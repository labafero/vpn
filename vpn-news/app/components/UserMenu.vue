<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const colorMode = useColorMode()
const router = useRouter()

const items = computed(() => [
  {
    label: user.value?.email || 'Usuário',
    slot: 'account',
    type: 'label' as const,
  },
  { type: 'separator' as const },
  {
    label: 'Aparência',
    children: [
      {
        label: 'Claro',
        icon: 'i-lucide-sun',
        onSelect: () => { colorMode.preference = 'light' },
      },
      {
        label: 'Escuro',
        icon: 'i-lucide-moon',
        onSelect: () => { colorMode.preference = 'dark' },
      },
      {
        label: 'Sistema',
        icon: 'i-lucide-monitor',
        onSelect: () => { colorMode.preference = 'system' },
      },
    ],
  },
  { type: 'separator' as const },
  {
    label: 'Sair',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await supabase.auth.signOut()
      router.push('/login')
    },
  },
])
</script>

<template>
  <UDropdownMenu :items="items" :content="{ side: 'top', align: 'end' }">
    <UButton color="neutral" variant="ghost" class="w-full justify-start gap-2">
      <UAvatar :alt="user?.email || 'U'" size="xs" />
      <span class="truncate">{{ user?.email || 'Usuário' }}</span>
    </UButton>
  </UDropdownMenu>
</template>
