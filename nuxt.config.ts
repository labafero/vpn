// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui", "@nuxt/icon", "@nuxtjs/supabase"],

  devtools: {
    enabled: false,
  },

  css: ["~/assets/css/main.css"],

  runtimeConfig: {
    spotifyClientSecret: "",
    spotifyRedirectUri: "",
    public: {
      spotifyClientId: "",
    },
  },

  devServer: {
    host: "0.0.0.0",
    port: 3000,
  },

  compatibilityDate: "2026-06-07",

  vite: {
    optimizeDeps: {
      include: ["valibot"],
    },
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
      },
    },
  },

  supabase: {
    redirect: false,
  },
});
