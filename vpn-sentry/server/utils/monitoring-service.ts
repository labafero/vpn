import { createHash, randomBytes } from 'node:crypto'
import { FoundationError } from './api-error'
import type { EventSubGateway, EventSubNotification } from './twitch-eventsub'

export type MonitoringChannel = { id: string; login: string; providerUserId: string; connectionStatus: string; monitoringEnabled: boolean; consentVersion: string | null; subscriptionStatus: string | null }
export type MonitoringSession = { id: string; channelId: string; ownerId: string; streamId: string; title: string; category: string | null; startedAt: string; endedAt: string | null }
export type Invite = { id: string; sessionId: string; expiresAt: string; createdAt: string; revokedAt: string | null; acceptedAt: string | null }
export type MonitoringRepository = {
  channels: (userId: string, admin: boolean) => Promise<MonitoringChannel[]>
  enable: (userId: string, channelId: string, enabled: boolean, consentedAt: string | null) => Promise<{ channel: MonitoringChannel; broadcasterId: string }>
  setSubscription: (channelId: string, type: string, id: string | null, status: string) => Promise<void>
  subscriptions: (channelId: string) => Promise<Array<{ type: 'stream.online' | 'stream.offline'; id: string | null; status: 'pending' | 'enabled' | 'error' }>>
  staleSubscriptions: () => Promise<Array<{ channelId: string; type: 'stream.online' | 'stream.offline'; id: string }>>
  clearSubscription: (channelId: string, type: string, id: string) => Promise<void>
  subscriptionChannel: (subscriptionId: string) => Promise<{ channelId: string; enabled: boolean; broadcasterId: string; eventType: 'stream.online' | 'stream.offline' } | null>
  confirmSubscription: (subscriptionId: string, enabled: boolean) => Promise<void>
  sessions: (userId: string, admin: boolean, channelId: string | undefined, cursor: string | undefined, limit: number) => Promise<{ items: MonitoringSession[]; nextCursor: string | null }>
  session: (id: string) => Promise<MonitoringSession | null>
  applyEvent: (event: EventSubNotification, owner: { channelId: string; ownerId: string } | null) => Promise<void>
  ownerForSubscription: (subscriptionId: string) => Promise<{ channelId: string; ownerId: string; broadcasterId: string; eventType: 'stream.online' | 'stream.offline' } | null>
  createInvite: (sessionId: string, ownerId: string, hash: string, expiresAt: string) => Promise<Invite>
  invites: (sessionId: string, ownerId: string) => Promise<Invite[]>
  revokeInvite: (id: string, ownerId: string, now: string) => Promise<void>
  acceptInvite: (hash: string, userId: string, now: string) => Promise<string>
  canReadSession: (sessionId: string, userId: string, admin: boolean) => Promise<boolean>
  hasInviteAccess: (sessionId: string, userId: string) => Promise<boolean>
  reconcileTargets: () => Promise<Array<{ channelId: string; ownerId: string; broadcasterId: string }>>
  markReconciled: (channelId: string, now: string) => Promise<void>
  cleanEvents: (before: string) => Promise<void>
}

export function createMonitoringService(repository: MonitoringRepository, gateway: EventSubGateway, config: { callback: string; secret: string }, now = () => new Date()) {
  return {
    listChannels: (userId: string, admin: boolean) => repository.channels(userId, admin),
    async setMonitoring(userId: string, channelId: string, enabled: boolean, consent: boolean) {
      if (enabled && consent !== true) throw new FoundationError(400)
      if (enabled) {
        let callback: URL
        try { callback = new URL(config.callback) } catch { throw new FoundationError(503) }
        if (callback.protocol !== 'https:' || config.secret.length < 10 || config.secret.length > 100) throw new FoundationError(503)
      }
      const { channel, broadcasterId } = await repository.enable(userId, channelId, enabled, enabled ? now().toISOString() : null)
      if (!enabled) {
        for (const sub of await repository.subscriptions(channelId)) if (sub.id) {
          try { await gateway.deleteSubscription(sub.id); await repository.clearSubscription(channelId, sub.type, sub.id) } catch { /* Local access is already closed; reconciliation retries remote cleanup. */ }
        }
        return channel
      }
      try {
        for (const type of ['stream.online', 'stream.offline'] as const) {
          const subscription = await gateway.createSubscription(broadcasterId, type, config.callback, config.secret)
          if (subscription.status !== 'webhook_callback_verification_pending' && subscription.status !== 'enabled') throw new Error('subscription rejected')
          await repository.setSubscription(channelId, type, subscription.id, subscription.status === 'enabled' ? 'enabled' : 'pending')
        }
        const stream = await gateway.getStream(broadcasterId)
        if (stream) await repository.applyEvent({ messageId: `reconcile:${stream.streamId}:${stream.startedAt}`, subscriptionId: '', type: 'stream.online', broadcasterUserId: broadcasterId, observedAt: now().toISOString(), ...stream }, { channelId, ownerId: userId })
        await repository.markReconciled(channelId, now().toISOString())
        return channel
      } catch {
        await repository.enable(userId, channelId, false, null)
        for (const sub of await repository.subscriptions(channelId)) if (sub.id) {
          try { await gateway.deleteSubscription(sub.id); await repository.clearSubscription(channelId, sub.type, sub.id) } catch { /* Retry in scheduled reconciliation. */ }
        }
        throw new FoundationError(503)
      }
    },
    listSessions: (userId: string, admin: boolean, channelId?: string, cursor?: string, limit = 25) => repository.sessions(userId, admin, channelId, cursor, limit),
    getSession: (id: string) => repository.session(id),
    async createInvite(sessionId: string, ownerId: string) {
      const session = await repository.session(sessionId)
      if (!session || session.ownerId !== ownerId || session.endedAt) throw new FoundationError(404)
      const token = randomBytes(32).toString('base64url')
      const expiresAt = new Date(now().getTime() + 24 * 60 * 60_000).toISOString()
      const invite = await repository.createInvite(sessionId, ownerId, createHash('sha256').update(token).digest('hex'), expiresAt)
      return { invite, token }
    },
    listInvites: (sessionId: string, ownerId: string) => repository.invites(sessionId, ownerId),
    revokeInvite: (id: string, ownerId: string) => repository.revokeInvite(id, ownerId, now().toISOString()),
    acceptInvite: (token: string, userId: string) => repository.acceptInvite(createHash('sha256').update(token).digest('hex'), userId, now().toISOString()),
    async canReadSession(sessionId: string, userId: string, admin: boolean) { return await repository.canReadSession(sessionId, userId, admin) || await repository.hasInviteAccess(sessionId, userId) },
    async handleEvent(message: EventSubNotification) {
      const owner = await repository.ownerForSubscription(message.subscriptionId)
      if (owner && owner.broadcasterId === message.broadcasterUserId && owner.eventType === message.type) await repository.applyEvent(message, owner)
    },
    confirmSubscription: (subscriptionId: string) => repository.confirmSubscription(subscriptionId, true),
    revokeSubscription: (subscriptionId: string) => repository.confirmSubscription(subscriptionId, false),
    async reconcile() {
      await repository.cleanEvents(new Date(now().getTime() - 14 * 86400000).toISOString())
      const targets = await repository.reconcileTargets()
      let checked = 0
      for (const target of targets) {
        const subscriptions = await repository.subscriptions(target.channelId)
        for (const type of ['stream.online', 'stream.offline'] as const) {
          const current = subscriptions.find(sub => sub.type === type)
          if (current?.id && current.status !== 'error') continue
          try {
            const created = await gateway.createSubscription(target.broadcasterId, type, config.callback, config.secret)
            await repository.setSubscription(target.channelId, type, created.id, created.status === 'enabled' ? 'enabled' : 'pending')
          } catch { await repository.setSubscription(target.channelId, type, null, 'error') }
        }
        const stream = await gateway.getStream(target.broadcasterId)
        const event: EventSubNotification = stream
          ? { messageId: `reconcile:${stream.streamId}:${stream.startedAt}`, subscriptionId: '', type: 'stream.online', broadcasterUserId: target.broadcasterId, observedAt: now().toISOString(), ...stream }
          : { messageId: `reconcile:offline:${target.channelId}:${Math.floor(now().getTime() / 300000)}`, subscriptionId: '', type: 'stream.offline', broadcasterUserId: target.broadcasterId, observedAt: now().toISOString() }
        await repository.applyEvent(event, target)
        await repository.markReconciled(target.channelId, now().toISOString())
        checked++
      }
      for (const stale of await repository.staleSubscriptions()) {
        try { await gateway.deleteSubscription(stale.id); await repository.clearSubscription(stale.channelId, stale.type, stale.id) } catch { /* Retry on the next scheduled reconciliation. */ }
      }
      return { checked }
    }
  }
}
