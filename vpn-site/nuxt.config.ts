import { getSupabaseCookieOptions, VPN_AUTH_COOKIE_PREFIX } from '@vpn/auth'
import { resolveVpnAppUrls } from '@vpn/ui'

const vpnAppEnvironment =
  process.env.VERCEL_ENV === 'preview'
    ? 'preview'
    : process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
      ? 'production'
      : 'development'

const vpnAppUrls = resolveVpnAppUrls(vpnAppEnvironment, {
  site:
    process.env.NUXT_PUBLIC_VPN_SITE_URL ||
    (process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : undefined),
  news: process.env.NUXT_PUBLIC_VPN_NEWS_URL,
  monitor: process.env.NUXT_PUBLIC_VPN_MONITOR_URL
})

const authCookieEnvironment =
  process.env.VERCEL_ENV === 'production'
    ? 'production'
    : process.env.VERCEL_ENV === 'preview'
      ? 'preview'
      : 'development'

export default defineNuxtConfig({
  extends: ['../packages/ui', '../packages/seo'],
  modules: ['@nuxt/eslint', '@nuxtjs/supabase'],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    authReturnOrigins: process.env.NUXT_AUTH_RETURN_ORIGINS || '',
    public: {
      vpnAuthUrl: process.env.NUXT_PUBLIC_VPN_AUTH_URL || 'https://vpn.labafero.com',
      vpnAppUrls,
      turnstileSiteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || ''
    }
  },
  build: { transpile: ['@vpn/ui'] },
  site: {
    url: vpnAppUrls.site,
    name: 'VPN Roleplay',
    description:
      'Entre no universo da VPN Roleplay: histórias, notícias e uma cidade viva para jogar.',
    defaultLocale: 'pt_BR',
    env: process.env.VERCEL_ENV || process.env.NODE_ENV
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
