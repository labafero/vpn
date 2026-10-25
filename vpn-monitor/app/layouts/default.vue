<script setup lang="ts">
import VpnAppNavigation from '~/components/VpnAppNavigation.vue'
</script>

<template>
  <div class="min-h-screen bg-vpn-ink text-default">
    <VpnAppNavigation />
    <slot />
  </div>
</template>
