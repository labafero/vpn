export default defineNuxtConfig({
  modules: ["@nuxt/eslint"],
  compatibilityDate: "2026-06-07",
  ssr: false,
  nitro: {
    preset: "node-server",
  },
})
