import { resolveVpnAppUrls } from '@vpn/ui'

const vpnAppEnvironment =
  process.env.VERCEL_ENV === 'preview'
    ? 'preview'
    : process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
      ? 'production'
      : 'development'

const vpnAppUrls = resolveVpnAppUrls(vpnAppEnvironment, {
  monitor: process.env.NUXT_PUBLIC_VPN_MONITOR_URL
})

export default defineNuxtConfig({
  modules: ['@nuxt/eslint'],
  compatibilityDate: '2026-06-07',
  ssr: false,
  runtimeConfig: {
    public: {
      vpnAppUrls
    }
  },
  nitro: {
    preset: process.env.VERCEL ? 'vercel' : 'node-server',
    vercel: { functions: { maxDuration: 300 } }
  }
})
