export default defineNuxtRouteMiddleware(async () => {
  // Auth events populate useSupabaseUser asynchronously after sign-in.
  // Await verified claims before deciding whether this navigation can continue.
  const { data, error } = await useSupabaseClient().auth.getClaims()
  if (error || !data?.claims?.sub || data.claims.is_anonymous) return navigateTo('/login')
})
