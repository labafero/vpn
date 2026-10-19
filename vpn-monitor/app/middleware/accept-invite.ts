import { buildAuthPortalUrl, resolveAuthCallbackPath } from '@vpn/auth'

export default defineNuxtRouteMiddleware((to) => {
  if (typeof window !== 'undefined' && window.location.hash.startsWith('#token=')) {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) sessionStorage.setItem('vpn-pending-invite', token)
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`
    )
  }
  if (!useSupabaseUser().value) {
    const config = useRuntimeConfig()
    const currentPath = to.fullPath.split('#', 1)[0]
    const returnPath = resolveAuthCallbackPath(currentPath, '/convites/aceitar')
    const returnTo = new URL(returnPath, useRequestURL().origin).href
    return navigateTo(buildAuthPortalUrl(config.public.vpnAuthUrl, returnTo), {
      external: true
    })
  }
})
