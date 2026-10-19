import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '@vpn/auth'

const authCookieEnvironment =
  process.env.VERCEL_ENV === 'production'
    ? 'production'
    : process.env.VERCEL_ENV === 'preview'
      ? 'preview'
      : 'development'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase'],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    authReturnOrigins: process.env.NUXT_AUTH_RETURN_ORIGINS || '',
    public: {
      vpnAuthUrl: process.env.NUXT_PUBLIC_VPN_AUTH_URL || 'https://vpn.labafero.com'
    }
  },
  routeRules: { '/auth/callback': { ssr: false } },
  compatibilityDate: '2026-06-07',
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
