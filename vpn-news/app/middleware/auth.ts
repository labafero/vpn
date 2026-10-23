import { buildAuthPortalUrl, resolveAuthCallbackPath } from '@vpn/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const { data, error } = await useSupabaseClient().auth.getClaims()

  if (error || !data?.claims?.sub || data.claims.is_anonymous) {
    const config = useRuntimeConfig()
    const returnPath = resolveAuthCallbackPath(to.fullPath, '/')
    const returnTo = new URL(returnPath, useRequestURL().origin).href
    return navigateTo(buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo), {
      external: true
    })
  }
})
