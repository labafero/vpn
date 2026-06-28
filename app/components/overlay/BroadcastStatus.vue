<template>
  <div class="space-y-2">
    <div class="flex items-center gap-1.5">
      <UIcon name="i-lucide-radio" class="text-primary text-base" />
      <span class="text-sm text-muted uppercase tracking-wider font-medium">
        Status da transmissão
      </span>
    </div>
    <div v-if="characterConfig" class="flex flex-wrap items-center gap-2">
      <UBadge variant="soft" size="md">
        {{ characterConfig.character_name }}
      </UBadge>
      <UBadge variant="soft" size="md" icon="i-lucide-user">
        {{ characterConfig.passport_id }}
      </UBadge>
      <UBadge variant="soft" size="md" icon="i-lucide-smartphone">
        {{ characterConfig.phone }}
      </UBadge>
    </div>
    <div class="text-lg text-default leading-snug">
      {{ broadcastTitle }}
    </div>
  </div>
</template>

<script lang="ts" setup>
const { broadcastTitle, characterConfig } = useOverlayState();
</script>
