export default defineNuxtConfig({
  modules: ["@nuxt/eslint"],
  compatibilityDate: "2026-06-07",
  ssr: false,
  nitro: {
    preset: process.env.VERCEL ? "vercel" : "node-server",
    vercel: { functions: { maxDuration: 300 } },
  },
})
