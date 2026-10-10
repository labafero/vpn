import { FoundationError } from './api-error'
import { getFoundationDatabase } from './private-database'
import type { Invite, MonitoringChannel, MonitoringRepository, MonitoringSession } from './monitoring-service'

let instance: MonitoringRepository | undefined
type SessionRow = { id: string; channel_id: string; owner_id: string; provider_stream_id: string; title: string; category: string | null; started_at: Date | string; ended_at: Date | string | null }
type ChannelRow = { id: string; login: string; provider_user_id: string; connection_status: string; monitoring_enabled: boolean; monitoring_consent_version: string | null; subscription_status: string | null }
type InviteRow = { id: string; session_id: string; expires_at: Date | string; created_at: Date | string; revoked_at: Date | string | null; accepted_at: Date | string | null }
export function getMonitoringRepository(): MonitoringRepository {
  if (instance) return instance
  const sql = getFoundationDatabase()
  const requireRole = async () => {
    const rows = await sql<{ role: string }[]>`SELECT current_user AS role`
    if (rows[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
  }
  const mapSession = (r: SessionRow): MonitoringSession => ({ id: r.id, channelId: r.channel_id, ownerId: r.owner_id, streamId: r.provider_stream_id, title: r.title, category: r.category, startedAt: new Date(r.started_at).toISOString(), endedAt: r.ended_at ? new Date(r.ended_at).toISOString() : null })
  const mapChannel = (r: ChannelRow): MonitoringChannel => ({ id: r.id, login: r.login, providerUserId: r.provider_user_id, connectionStatus: r.connection_status, monitoringEnabled: r.monitoring_enabled, consentVersion: r.monitoring_consent_version, subscriptionStatus: r.subscription_status })
  const mapInvite = (r: InviteRow): Invite => ({ id: r.id, sessionId: r.session_id, expiresAt: new Date(r.expires_at).toISOString(), createdAt: new Date(r.created_at).toISOString(), revokedAt: r.revoked_at ? new Date(r.revoked_at).toISOString() : null, acceptedAt: r.accepted_at ? new Date(r.accepted_at).toISOString() : null })
  instance = {
    async channels(userId, admin) { await requireRole(); const rows = await sql<ChannelRow[]>`SELECT c.id, pc.login, pc.provider_user_id, pc.status AS connection_status, c.monitoring_enabled, c.monitoring_consent_version, (SELECT CASE WHEN count(*) FILTER (WHERE status='error')>0 THEN 'error' WHEN count(*) FILTER (WHERE status='enabled')=2 AND c.monitoring_reconciled_at IS NOT NULL THEN 'enabled' WHEN count(*)>0 THEN 'pending' ELSE NULL END FROM private.twitch_eventsub_subscriptions es WHERE es.channel_id=c.id) AS subscription_status FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id WHERE (${admin} OR c.owner_id=${userId}) ORDER BY pc.login`; return rows.map(mapChannel) },
    async enable(userId, channelId, enabled, consentedAt) {
      await requireRole()
      try {
        const rows = await sql.begin(async tx => {
          await tx`SELECT pg_advisory_xact_lock(hashtextextended(${userId},0))`
          const updated = await tx<ChannelRow[]>`UPDATE public.channels c SET monitoring_enabled=${enabled}, monitoring_consent_version=CASE WHEN ${enabled} THEN 'monitoring-v2' ELSE NULL END, monitoring_consented_at=CASE WHEN ${enabled} THEN ${consentedAt}::timestamptz ELSE NULL END, monitoring_reconciled_at=NULL FROM public.provider_connections pc WHERE c.connection_id=pc.id AND c.id=${channelId} AND c.owner_id=${userId} AND pc.status='connected' AND (${!enabled} OR c.monitoring_consent_version IS NULL OR c.monitoring_consent_version='monitoring-v2') RETURNING c.id, pc.login, pc.provider_user_id, pc.status AS connection_status, c.monitoring_enabled, c.monitoring_consent_version, NULL::text AS subscription_status`
          if (!updated[0]) throw new FoundationError(404)
          if (!enabled) {
            await tx`UPDATE private.monitoring_sessions SET ended_at=now() WHERE channel_id=${channelId} AND ended_at IS NULL`
            await tx`UPDATE private.access_invites SET revoked_at=now() WHERE session_id IN (SELECT id FROM private.monitoring_sessions WHERE channel_id=${channelId}) AND revoked_at IS NULL`
            await tx`UPDATE private.twitch_eventsub_subscriptions SET status='pending', updated_at=now() WHERE channel_id=${channelId}`
          } else {
            await tx`INSERT INTO private.twitch_eventsub_subscriptions(channel_id,event_type,status) VALUES (${channelId},'stream.online','pending'),(${channelId},'stream.offline','pending') ON CONFLICT(channel_id,event_type) DO UPDATE SET status='pending',updated_at=now()`
          }
          return updated
        })
        return { channel: mapChannel(rows[0]!), broadcasterId: rows[0]!.provider_user_id as string }
      } catch (error) { if (error instanceof FoundationError) throw error; throw new FoundationError(503) }
    },
    async setSubscription(channelId, type, id, status) { await requireRole(); await sql`UPDATE private.twitch_eventsub_subscriptions SET subscription_id=${id},status=${status},updated_at=now() WHERE channel_id=${channelId} AND event_type=${type}` },
    async subscriptions(channelId) { await requireRole(); const rows = await sql`SELECT event_type,subscription_id AS id,status FROM private.twitch_eventsub_subscriptions WHERE channel_id=${channelId}`; return rows.map(r => ({ type: r.event_type as 'stream.online'|'stream.offline', id: r.id as string|null, status: r.status as 'pending'|'enabled'|'error' })) },
    async staleSubscriptions() { await requireRole(); const rows = await sql`SELECT es.channel_id,es.event_type,es.subscription_id FROM private.twitch_eventsub_subscriptions es JOIN public.channels c ON c.id=es.channel_id JOIN public.provider_connections pc ON pc.id=c.connection_id WHERE es.subscription_id IS NOT NULL AND (NOT c.monitoring_enabled OR pc.status<>'connected')`; return rows.map(r => ({ channelId: r.channel_id as string, type: r.event_type as 'stream.online'|'stream.offline', id: r.subscription_id as string })) },
    async clearSubscription(channelId, type, id) { await requireRole(); await sql`UPDATE private.twitch_eventsub_subscriptions SET subscription_id=NULL,status='pending',updated_at=now() WHERE channel_id=${channelId} AND event_type=${type} AND subscription_id=${id}` },
    async subscriptionChannel(subscriptionId) { await requireRole(); const rows = await sql`SELECT es.channel_id,es.event_type,c.monitoring_enabled,pc.provider_user_id FROM private.twitch_eventsub_subscriptions es JOIN public.channels c ON c.id=es.channel_id JOIN public.provider_connections pc ON pc.id=c.connection_id WHERE es.subscription_id=${subscriptionId} AND es.status='enabled' AND c.monitoring_enabled AND c.monitoring_consent_version='monitoring-v2' AND pc.status='connected'`; return rows[0] ? { channelId: rows[0].channel_id as string, eventType: rows[0].event_type as 'stream.online'|'stream.offline', enabled: rows[0].monitoring_enabled as boolean, broadcasterId: rows[0].provider_user_id as string } : null },
    async confirmSubscription(subscriptionId, enabled) { await requireRole(); await sql`UPDATE private.twitch_eventsub_subscriptions es SET status=CASE WHEN ${enabled} AND EXISTS(SELECT 1 FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id WHERE c.id=es.channel_id AND c.monitoring_enabled AND c.monitoring_consent_version='monitoring-v2' AND pc.status='connected') THEN 'enabled' ELSE 'error' END,updated_at=now() WHERE es.subscription_id=${subscriptionId}` },
    async sessions(userId, admin, channelId, cursor, limit) {
      await requireRole()
      let position: { at: string; id: string } | null = null
      if (cursor) {
        try { const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { at?: unknown; id?: unknown }; if (typeof value.at !== 'string' || typeof value.id !== 'string' || !Number.isFinite(Date.parse(value.at)) || !/^[\da-f-]{36}$/i.test(value.id)) throw new Error(); position = { at: value.at, id: value.id } } catch { throw new FoundationError(400) }
      }
      const rows = await sql<SessionRow[]>`SELECT * FROM private.monitoring_sessions WHERE (${admin} OR owner_id=${userId} OR id IN (SELECT ai.session_id FROM private.access_invites ai JOIN private.monitoring_sessions shared ON shared.id=ai.session_id WHERE ai.accepted_by=${userId} AND ai.accepted_at IS NOT NULL AND ai.revoked_at IS NULL AND ai.expires_at>now() AND shared.ended_at IS NULL)) AND (${channelId ?? null}::uuid IS NULL OR channel_id=${channelId ?? null}::uuid) AND (${position?.at ?? null}::timestamptz IS NULL OR (started_at,id)<(${position?.at ?? null}::timestamptz,${position?.id ?? null}::uuid)) ORDER BY started_at DESC,id DESC LIMIT ${limit + 1}`
      const items = rows.slice(0, limit).map(mapSession)
      const last = items.at(-1)
      return { items, nextCursor: rows.length > limit && last ? Buffer.from(JSON.stringify({ at: last.startedAt, id: last.id })).toString('base64url') : null }
    },
    async session(id) { await requireRole(); const rows = await sql<SessionRow[]>`SELECT * FROM private.monitoring_sessions WHERE id=${id}`; return rows[0] ? mapSession(rows[0]) : null },
    async ownerForSubscription(subscriptionId) { const sub = await this.subscriptionChannel(subscriptionId); if (!sub) return null; await requireRole(); const rows = await sql`SELECT owner_id FROM public.channels WHERE id=${sub.channelId}`; return rows[0] ? { channelId: sub.channelId, ownerId: rows[0].owner_id as string, broadcasterId: sub.broadcasterId, eventType: sub.eventType } : null },
    async applyEvent(event, owner) {
      if (!owner) return
      await requireRole()
      await sql.begin(async tx => {
        const inserted = await tx`INSERT INTO private.twitch_eventsub_messages(message_id,message_type) VALUES (${event.messageId},${event.type}) ON CONFLICT DO NOTHING RETURNING message_id`
        if (!inserted.length) return
        const active = await tx`SELECT id,started_at FROM private.monitoring_sessions WHERE channel_id=${owner.channelId} AND ended_at IS NULL FOR UPDATE`
        if (event.type === 'stream.online' && event.streamId && event.startedAt) {
          if (active[0] && new Date(active[0].started_at).getTime() >= Date.parse(event.startedAt)) return
          if (active[0]) await tx`UPDATE private.monitoring_sessions SET ended_at=${event.startedAt}::timestamptz WHERE id=${active[0].id}`
          await tx`INSERT INTO private.monitoring_sessions(channel_id,owner_id,provider_stream_id,title,category,started_at) VALUES (${owner.channelId},${owner.ownerId},${event.streamId},${event.title ?? ''},${event.category ?? null},${event.startedAt}) ON CONFLICT(provider_stream_id) DO NOTHING`
        } else if (event.type === 'stream.offline' && active[0] && new Date(active[0].started_at).getTime() <= Date.parse(event.observedAt)) {
          await tx`UPDATE private.monitoring_sessions SET ended_at=GREATEST(started_at,${event.observedAt}::timestamptz) WHERE id=${active[0].id}`
          await tx`UPDATE private.access_invites SET revoked_at=now() WHERE session_id=${active[0].id} AND revoked_at IS NULL`
        }
      })
    },
    async createInvite(sessionId, ownerId, hash, expiresAt) { await requireRole(); const rows = await sql<InviteRow[]>`INSERT INTO private.access_invites(session_id,owner_id,token_hash,expires_at) SELECT id,owner_id,${hash},${expiresAt} FROM private.monitoring_sessions WHERE id=${sessionId} AND owner_id=${ownerId} AND ended_at IS NULL RETURNING id,session_id,expires_at,created_at,revoked_at,accepted_at`; if (!rows[0]) throw new FoundationError(404); return mapInvite(rows[0]) },
    async invites(sessionId, ownerId) { await requireRole(); const rows = await sql<InviteRow[]>`SELECT id,session_id,expires_at,created_at,revoked_at,accepted_at FROM private.access_invites WHERE session_id=${sessionId} AND owner_id=${ownerId} ORDER BY created_at DESC`; return rows.map(mapInvite) },
    async revokeInvite(id, ownerId, now) { await requireRole(); await sql`UPDATE private.access_invites SET revoked_at=${now} WHERE id=${id} AND owner_id=${ownerId} AND revoked_at IS NULL` },
    async acceptInvite(hash, userId, now) { await requireRole(); const rows = await sql`UPDATE private.access_invites ai SET accepted_by=${userId},accepted_at=${now} FROM private.monitoring_sessions s WHERE ai.token_hash=${hash} AND ai.session_id=s.id AND ai.owner_id<>${userId} AND ai.accepted_at IS NULL AND ai.revoked_at IS NULL AND ai.expires_at>${now} AND s.ended_at IS NULL RETURNING ai.session_id`; if (!rows[0]) throw new FoundationError(410); return rows[0].session_id as string },
    async canReadSession(sessionId, userId, admin) { await requireRole(); const rows = await sql`SELECT EXISTS(SELECT 1 FROM private.monitoring_sessions WHERE id=${sessionId} AND (owner_id=${userId} OR ${admin})) AS allowed`; return rows[0]?.allowed === true },
    async hasInviteAccess(sessionId, userId) { await requireRole(); const rows = await sql`SELECT EXISTS(SELECT 1 FROM private.access_invites ai JOIN private.monitoring_sessions s ON s.id=ai.session_id WHERE ai.session_id=${sessionId} AND ai.accepted_by=${userId} AND ai.accepted_at IS NOT NULL AND ai.revoked_at IS NULL AND ai.expires_at>now() AND s.ended_at IS NULL) AS allowed`; return rows[0]?.allowed === true },
    async reconcileTargets() { await requireRole(); const rows = await sql`SELECT c.id AS channel_id,c.owner_id,pc.provider_user_id AS broadcaster_id FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id WHERE c.monitoring_enabled AND c.monitoring_consent_version='monitoring-v2' AND pc.status='connected'`; return rows.map(r => ({ channelId: r.channel_id as string, ownerId: r.owner_id as string, broadcasterId: r.broadcaster_id as string })) },
    async markReconciled(channelId, now) { await requireRole(); await sql`UPDATE public.channels SET monitoring_reconciled_at=${now} WHERE id=${channelId} AND monitoring_enabled AND monitoring_consent_version='monitoring-v2'` },
    async cleanEvents(before) { await requireRole(); await sql`DELETE FROM private.twitch_eventsub_messages WHERE received_at < ${before}::timestamptz` }
  }
  return instance
}
