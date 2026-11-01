type VpnSeoApp = 'site' | 'news' | 'monitor'

interface VpnSeoDefaults {
  app: VpnSeoApp
  title: string
  description: string
}

export function useVpnSeoDefaults({ app, title, description }: VpnSeoDefaults) {
  const appUrls = useRuntimeConfig().public.vpnAppUrls as Record<VpnSeoApp, string>

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ogImage: `${appUrls[app]}/og-image.jpg`,
    ogImageAlt: 'VPN Roleplay — Rede de monitoramento e inteligência para roleplay',
    twitterCard: 'summary_large_image'
  })
}
