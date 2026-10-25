import { describe, expect, it } from 'vitest'
import { createVpnAppLinks, resolveVpnAppUrls } from '../src/index'

describe('VPN app navigation', () => {
  it('uses the shared local development origins', () => {
    expect(resolveVpnAppUrls('development')).toEqual({
      site: 'http://localhost:3000',
      news: 'http://localhost:3001',
      monitor: 'http://localhost:3002'
    })
  })

  it('uses official origins in production and accepts environment overrides', () => {
    expect(resolveVpnAppUrls('production')).toEqual({
      site: 'https://vpn.labafero.com',
      news: 'https://vpn-news.labafero.com',
      monitor: 'https://vpn-monitor.labafero.com'
    })

    expect(
      resolveVpnAppUrls('preview', {
        site: 'https://vpn-site-pr-42.vercel.app',
        news: 'https://vpn-news-pr-42.vercel.app',
        monitor: 'https://vpn-monitor-pr-42.vercel.app'
      })
    ).toEqual({
      site: 'https://vpn-site-pr-42.vercel.app',
      news: 'https://vpn-news-pr-42.vercel.app',
      monitor: 'https://vpn-monitor-pr-42.vercel.app'
    })
  })

  it('rejects destinations that are not safe app origins', () => {
    expect(() =>
      resolveVpnAppUrls('preview', {
        site: 'javascript:alert(1)'
      })
    ).toThrow('site must be an HTTP(S) origin')

    expect(() =>
      resolveVpnAppUrls('preview', {
        news: 'http://public.example.test'
      })
    ).toThrow('news must be an HTTP(S) origin')
  })

  it('orders links Site, News, Monitor and marks only the current app active', () => {
    const links = createVpnAppLinks('news', {
      site: 'https://vpn.labafero.com',
      news: 'https://vpn-news.labafero.com',
      monitor: 'https://vpn-monitor.labafero.com'
    })

    expect(links).toEqual([
      { id: 'site', label: 'Site', href: 'https://vpn.labafero.com', active: false },
      { id: 'news', label: 'News', href: 'https://vpn-news.labafero.com', active: true },
      { id: 'monitor', label: 'Monitor', href: 'https://vpn-monitor.labafero.com', active: false }
    ])
  })
})
