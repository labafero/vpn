export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxtjs/supabase"],
  compatibilityDate: "2026-06-07",
  supabase: { redirect: false },
  colorMode: { preference: 'dark' },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    sentryUrl: '',
    sentryProtectionBypassSecret: '',
    monitorOrigin: ''
  },
})
