import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '@vpn/auth'
import { resolveVpnAppUrls } from '@vpn/ui'

const vpnAppEnvironment =
  process.env.VERCEL_ENV === 'preview'
    ? 'preview'
    : process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
      ? 'production'
      : 'development'
const vpnAppUrls = resolveVpnAppUrls(vpnAppEnvironment, {
  monitor:
    process.env.NUXT_PUBLIC_VPN_MONITOR_URL ||
    (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined),
  site: process.env.NUXT_PUBLIC_VPN_SITE_URL,
  news: process.env.NUXT_PUBLIC_VPN_NEWS_URL
})

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
  build: { transpile: ['@vpn/ui'] },
  runtimeConfig: {
    sentryUrl: '',
    sentryProtectionBypassSecret: '',
    monitorOrigin: '',
    public: {
      vpnAuthUrl: process.env.NUXT_PUBLIC_VPN_AUTH_URL || 'https://vpn.labafero.com',
      vpnAppUrls
    }
  },
  routeRules: {
    '/auth/callback': { ssr: false }
  }
})
