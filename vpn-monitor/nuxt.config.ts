import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '@vpn/auth'

const authCookieEnvironment =
  process.env.VERCEL_ENV === 'production'
    ? 'production'
    : process.env.VERCEL_ENV === 'preview'
      ? 'preview'
      : 'development'

export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/supabase'],
  compatibilityDate: '2026-06-07',
  supabase: {
    redirect: false,
    cookiePrefix: VPN_AUTH_COOKIE_PREFIX,
    useSsrCookies: true,
    cookieOptions: getSupabaseCookieOptions(authCookieEnvironment),
    clientOptions: { auth: { detectSessionInUrl: false } }
  },
  colorMode: { preference: 'dark' },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    sentryUrl: '',
    sentryProtectionBypassSecret: '',
    monitorOrigin: '',
    public: {
      vpnAuthUrl: process.env.NUXT_PUBLIC_VPN_AUTH_URL || 'https://vpn.labafero.com'
    }
  },
  routeRules: {
    '/auth/callback': { ssr: false }
  }
})
