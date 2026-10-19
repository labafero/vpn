// https://nuxt.com/docs/api/configuration/nuxt-config
import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '@vpn/auth'

type CitySlugRow = {
  slug: string
}

const RESERVED_ROOT_ROUTES = new Set(['login', 'overlay', 'redacao'])
const authCookieEnvironment =
  process.env.VERCEL_ENV === 'production'
    ? 'production'
    : process.env.VERCEL_ENV === 'preview'
      ? 'preview'
      : 'development'

async function fetchStaticCityRoutes() {
  const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NUXT_PUBLIC_SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'NUXT_PUBLIC_SUPABASE_URL e NUXT_PUBLIC_SUPABASE_KEY são obrigatórias para gerar as LPs estáticas.'
    )
  }

  const endpoint = new URL('/rest/v1/city_config', supabaseUrl)
  endpoint.searchParams.set('select', 'slug')
  endpoint.searchParams.set('order', 'slug.asc')

  const response = await fetch(endpoint, {
    headers: { apikey: supabaseKey }
  })

  if (!response.ok) {
    throw new Error(
      `Não foi possível consultar as cidades para o build (${response.status} ${response.statusText}).`
    )
  }

  const cities = (await response.json()) as CitySlugRow[]

  return cities
    .map(({ slug }) => slug.trim())
    .filter((slug) => slug && !RESERVED_ROOT_ROUTES.has(slug))
    .map((slug) => `/${encodeURIComponent(slug)}`)
}

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/icon', '@nuxtjs/supabase'],

  devtools: {
    enabled: false
  },

  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      vpnAuthUrl: process.env.NUXT_PUBLIC_VPN_AUTH_URL || 'https://vpn.labafero.com'
    }
  },
  routeRules: { '/auth/callback': { ssr: false } },

  compatibilityDate: '2026-06-07',

  vite: {
    optimizeDeps: {
      include: ['valibot']
    }
  },

  hooks: {
    async 'nitro:build:before'(nitro) {
      const cityRoutes = await fetchStaticCityRoutes()
      const routeRules = { ...nitro.options.routeRules }

      for (const route of cityRoutes) {
        routeRules[route] = {
          ...routeRules[route],
          prerender: true,
          noScripts: true
        }
      }

      nitro.options.routeRules = routeRules
      nitro.options.prerender.routes = [
        ...new Set([...nitro.options.prerender.routes, ...cityRoutes])
      ]
      nitro.options._config.routeRules = routeRules
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  supabase: {
    redirect: false,
    cookiePrefix: VPN_AUTH_COOKIE_PREFIX,
    useSsrCookies: true,
    cookieOptions: getSupabaseCookieOptions(authCookieEnvironment),
    clientOptions: { auth: { detectSessionInUrl: false } }
  }
})
