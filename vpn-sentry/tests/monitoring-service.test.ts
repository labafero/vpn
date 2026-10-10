import { expect, test, vi } from 'vitest'
import { createMonitoringService, type MonitoringRepository } from '../server/utils/monitoring-service'
import { FoundationError } from '../server/utils/api-error'

function repository(overrides: Partial<MonitoringRepository> = {}) {
  return {
    channels: vi.fn(async () => []), enable: vi.fn(async (_userId: string, _channelId: string, enabled: boolean) => ({ channel: { id: 'channel', login: 'canal', providerUserId: '42', connectionStatus: 'connected', monitoringEnabled: enabled, consentVersion: enabled ? 'monitoring-v2' : null, subscriptionStatus: null }, broadcasterId: '42' })),
    setSubscription: vi.fn(async () => {}), subscriptions: vi.fn(async () => []), staleSubscriptions: vi.fn(async () => []), clearSubscription: vi.fn(async () => {}), subscriptionChannel: vi.fn(async () => null), confirmSubscription: vi.fn(async () => {}), sessions: vi.fn(async () => []), session: vi.fn(async () => null), applyEvent: vi.fn(async () => {}), ownerForSubscription: vi.fn(async () => null), createInvite: vi.fn(), invites: vi.fn(async () => []), revokeInvite: vi.fn(async () => {}), acceptInvite: vi.fn(async () => 'session'), canReadSession: vi.fn(async () => false), hasInviteAccess: vi.fn(async () => false), reconcileTargets: vi.fn(async () => []), markReconciled: vi.fn(async () => {}), cleanEvents: vi.fn(async () => {}),
    ...overrides
  } as unknown as MonitoringRepository
}
const gateway = { createSubscription: vi.fn(async (_id: string, _type: 'stream.online' | 'stream.offline') => ({ id: 'sub', status: 'enabled' })), deleteSubscription: vi.fn(async () => {}), getStream: vi.fn(async () => null) }

test('monitoring requires explicit v2 consent and completes both EventSub subscriptions before initial reconcile', async () => {
  const repo = repository()
  const service = createMonitoringService(repo, gateway, { callback: 'https://vpn-sentry.labafero.com/api/eventsub/twitch', secret: 'x'.repeat(32) }, () => new Date('2026-10-10T12:00:00Z'))
  await expect(service.setMonitoring('owner', 'channel', true, false)).rejects.toBeInstanceOf(FoundationError)
  expect(repo.enable).not.toHaveBeenCalled()
  await service.setMonitoring('owner', 'channel', true, true)
  expect(gateway.createSubscription).toHaveBeenCalledTimes(2)
  expect(repo.markReconciled).toHaveBeenCalledWith('channel', '2026-10-10T12:00:00.000Z')
})

test('EventSub data is ignored unless broadcaster and event type match the owned subscription', async () => {
  const repo = repository({ ownerForSubscription: vi.fn(async () => ({ channelId: 'channel', ownerId: 'owner', broadcasterId: '42', eventType: 'stream.online' })) })
  const service = createMonitoringService(repo, gateway, { callback: 'https://callback.test', secret: 'x'.repeat(32) })
  await service.handleEvent({ messageId: 'm1', subscriptionId: 'sub', type: 'stream.offline', broadcasterUserId: '42', observedAt: new Date().toISOString() })
  await service.handleEvent({ messageId: 'm2', subscriptionId: 'sub', type: 'stream.online', broadcasterUserId: 'other', observedAt: new Date().toISOString() })
  expect(repo.applyEvent).not.toHaveBeenCalled()
})

test('scheduled reconciliation checks only eligible targets and records a completed sync', async () => {
  const repo = repository({ reconcileTargets: vi.fn(async () => [{ channelId: 'channel', ownerId: 'owner', broadcasterId: '42' }]) })
  const provider = { ...gateway, getStream: vi.fn(async () => ({ streamId: 'live-1', title: 'Live', category: 'News', startedAt: '2026-10-10T11:00:00Z' })) }
  const service = createMonitoringService(repo, provider, { callback: 'https://callback.test', secret: 'x'.repeat(32) }, () => new Date('2026-10-10T12:00:00Z'))
  expect(await service.reconcile()).toEqual({ checked: 1 })
  expect(provider.getStream).toHaveBeenCalledWith('42')
  expect(repo.applyEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'stream.online', streamId: 'live-1' }), expect.objectContaining({ channelId: 'channel', ownerId: 'owner' }))
  expect(repo.markReconciled).toHaveBeenCalledWith('channel', '2026-10-10T12:00:00.000Z')
})
