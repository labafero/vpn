import { buildAuthPortalUrl, resolveAuthCallbackPath } from '@vpn/auth'

export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  if (!user.value) {
    const config = useRuntimeConfig()
    const returnPath = resolveAuthCallbackPath(to.fullPath, '/')
    const returnTo = new URL(returnPath, useRequestURL().origin).href
    return navigateTo(buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo), {
      external: true
    })
  }
})
