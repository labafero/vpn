export default defineNuxtRouteMiddleware(() => {
  if (import.meta.client && window.location.hash.startsWith('#token=')) {
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (token) sessionStorage.setItem('vpn-pending-invite', token)
    history.replaceState(history.state, '', `${location.pathname}${location.search}`)
  }
  if (!useSupabaseUser().value) {
    if (import.meta.client) sessionStorage.setItem('vpn-auth-return', '/convites/aceitar')
    return navigateTo('/login')
  }
})
