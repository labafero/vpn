export type VpnAppId = 'site' | 'news' | 'monitor'
export type VpnAppUrls = Record<VpnAppId, string>

export interface VpnAppLink {
  id: VpnAppId
  label: string
  href: string
  active: boolean
}

const APP_LABELS: Record<VpnAppId, string> = {
  site: 'Site',
  news: 'News',
  monitor: 'Monitor'
}

const DEVELOPMENT_URLS: VpnAppUrls = {
  site: 'http://localhost:3000',
  news: 'http://localhost:3001',
  monitor: 'http://localhost:3002'
}

const PRODUCTION_URLS: VpnAppUrls = {
  site: 'https://vpn.labafero.com',
  news: 'https://vpn-news.labafero.com',
  monitor: 'https://vpn-monitor.labafero.com'
}

function validateAppOrigin(app: VpnAppId, value: string, environment: string): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${app} must be an HTTP(S) origin.`)
  }

  const localHttp =
    environment === 'development' &&
    url.protocol === 'http:' &&
    ['127.0.0.1', 'localhost'].includes(url.hostname)
  const secureHttp = url.protocol === 'https:'
  const isOriginOnly =
    url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password

  if ((!secureHttp && !localHttp) || !isOriginOnly) {
    throw new Error(`${app} must be an HTTP(S) origin.`)
  }

  return url.origin
}

export function resolveVpnAppUrls(
  environment: 'development' | 'production' | 'preview',
  overrides: Partial<VpnAppUrls> = {}
): VpnAppUrls {
  const defaults = environment === 'development' ? DEVELOPMENT_URLS : PRODUCTION_URLS

  return {
    site: validateAppOrigin('site', overrides.site ?? defaults.site, environment),
    news: validateAppOrigin('news', overrides.news ?? defaults.news, environment),
    monitor: validateAppOrigin('monitor', overrides.monitor ?? defaults.monitor, environment)
  }
}

export function createVpnAppLinks(active: VpnAppId, urls: VpnAppUrls): VpnAppLink[] {
  return (['site', 'news', 'monitor'] as const).map((id) => ({
    id,
    label: APP_LABELS[id],
    href: urls[id],
    active: id === active
  }))
}
