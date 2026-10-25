<script setup lang="ts">
import type { VpnAppUrls } from '@vpn/ui'
import VpnAppBar from '@vpn/ui/VpnAppBar.vue'

const user = useSupabaseUser()
const client = useSupabaseClient()
const config = useRuntimeConfig()
const appUrls = config.public.vpnAppUrls as VpnAppUrls
const authenticated = computed(() => Boolean(user.value?.sub && !user.value.is_anonymous))
const signInHref = '/entrar'

async function signOut() {
  const { error } = await client.auth.signOut()
  if (!error) await navigateTo(appUrls.site, { external: true })
}
</script>

<template>
  <VpnAppBar
    active-app="site"
    :app-urls="appUrls"
    :authenticated="authenticated"
    :account-label="user?.email || undefined"
    :sign-in-href="signInHref"
    @sign-out="signOut"
  />
</template>
