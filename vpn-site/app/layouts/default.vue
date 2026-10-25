<script setup lang="ts">
import VpnAppNavigation from '~/components/VpnAppNavigation.vue'
</script>

<template>
  <div class="vpn-site-shell">
    <VpnAppNavigation />
    <slot />
  </div>
</template>

<style scoped>
.vpn-site-shell {
  min-height: 100vh;
  background: var(--vpn-ink, #05090c);
}
</style>
