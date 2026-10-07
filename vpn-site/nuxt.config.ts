export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui'],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  compatibilityDate: '2026-06-07',
  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
