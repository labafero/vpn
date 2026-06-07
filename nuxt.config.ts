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

  compatibilityDate: "2026-05-31",

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
