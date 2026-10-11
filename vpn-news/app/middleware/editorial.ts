export default defineNuxtRouteMiddleware(async () => {
  if (!useSupabaseUser().value) return navigateTo('/login')
  const { refresh } = useEditorialAccess()
  if (!await refresh()) {
    throw createError({ statusCode: 403, statusMessage: 'Acesso restrito à equipe autorizada da redação' })
  }
})
