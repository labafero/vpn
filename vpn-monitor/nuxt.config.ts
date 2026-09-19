export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxtjs/supabase"],
  compatibilityDate: "2026-06-07",
  supabase: { redirect: false },
})
