import { buildAuthPortalUrl, resolveAuthCallbackPath } from '@vpn/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  // Auth events populate useSupabaseUser asynchronously after sign-in.
  // Await verified claims before deciding whether this navigation can continue.
  const { data, error } = await useSupabaseClient().auth.getClaims()
  if (error || !data?.claims?.sub || data.claims.is_anonymous) {
    const config = useRuntimeConfig()
    const returnPath = resolveAuthCallbackPath(to.fullPath, '/')
    const returnTo = new URL(returnPath, config.public.vpnAppUrls.monitor).href
    return navigateTo(buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo), {
      external: true
    })
  }
})
