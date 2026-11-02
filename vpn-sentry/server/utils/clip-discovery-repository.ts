import type postgres from 'postgres'
import { FoundationError } from './api-error'
import type { ClipAccess } from './clip-repository'
import { getFoundationDatabase, type Credential } from './private-database'
import type { ClipMetadata } from './twitch-clips'

export type DiscoveryWindow = { startedAt: string; endedAt: string }
export type ClipDiscoveryClaim = {
  ownerId: string
  channelId: string
  access: ClipAccess
  phase: 'backfill' | 'incremental'
  startedAt: string | null
  endedAt: string | null
  cursor: string | null
  pendingWindows: DiscoveryWindow[]
  itemsInWindow: number
  completedAt: string | null
}
export type ClipDiscoveryRepository = {
  claimNext(): Promise<ClipDiscoveryClaim | null>
  initialize(claim: ClipDiscoveryClaim, window: DiscoveryWindow): Promise<boolean>
  advance(
    claim: ClipDiscoveryClaim,
    input: {
      clips: ClipMetadata[]
      cursor: string | null
      next: Omit<ClipDiscoveryClaim, 'ownerId' | 'channelId' | 'access'>
    }
  ): Promise<{ current: boolean; discovered: number }>
}

export function createClipDiscoveryRepository(sql: postgres.Sql): ClipDiscoveryRepository {
  async function authorized<T>(work: (tx: postgres.TransactionSql) => Promise<T>) {
    const result = await sql`SELECT current_user AS role`
    if (result[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(work)) as T
  }
  return {
    claimNext: () =>
      authorized(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(271016,2)`
        await tx`INSERT INTO private.clip_discovery_state(channel_id)
          SELECT c.id FROM public.channels c
          JOIN public.provider_connections pc ON pc.id=c.connection_id
          JOIN private.provider_credentials k ON k.connection_id=pc.id
          JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
          WHERE pc.status='connected' AND cc.scheduled_enabled AND cc.scheduled_revoked_at IS NULL
            AND k.expires_at > now() AND 'channel:manage:clips'=ANY(k.scopes)
          ON CONFLICT(channel_id) DO NOTHING`
        const rows =
          await tx`SELECT c.owner_id,c.id AS channel_id,pc.id AS connection_id,pc.provider_user_id,pc.status,k.*,cc.revision AS consent_revision,cc.scheduled_revision,
            cc.manual_enabled,cc.consent_version,cc.consented_at,cc.revoked_at,cc.scheduled_enabled,cc.scheduled_consent_version,cc.scheduled_consented_at,cc.scheduled_revoked_at,
            ds.phase,ds.window_started_at,ds.window_ended_at,ds.pagination_cursor,ds.pending_windows,ds.items_in_window,ds.completed_at
          FROM private.clip_discovery_state ds
          JOIN public.channels c ON c.id=ds.channel_id
          JOIN public.provider_connections pc ON pc.id=c.connection_id AND pc.user_id=c.owner_id AND pc.status='connected'
          JOIN private.provider_credentials k ON k.connection_id=pc.id AND k.expires_at>now() AND 'channel:manage:clips'=ANY(k.scopes)
          JOIN private.clip_processing_consents cc ON cc.channel_id=c.id AND cc.scheduled_enabled AND cc.scheduled_revoked_at IS NULL
          WHERE ds.lease_until IS NULL OR ds.lease_until < now()
          ORDER BY ds.last_checked_at NULLS FIRST,ds.updated_at,ds.channel_id
          FOR UPDATE OF ds SKIP LOCKED LIMIT 1`
        const r = rows[0]
        if (!r) return null
        await tx`UPDATE private.clip_discovery_state SET lease_until=now()+interval '90 seconds',last_checked_at=now(),updated_at=now() WHERE channel_id=${r.channel_id}`
        return {
          ownerId: r.owner_id,
          channelId: r.channel_id,
          access: {
            consentRevision: r.consent_revision,
            scheduledRevision: r.scheduled_revision,
            connectionId: r.connection_id,
            broadcasterId: r.provider_user_id,
            connected: true,
            scopes: r.scopes ?? [],
            credential: {
              ciphertext: r.ciphertext,
              iv: r.iv,
              tag: r.tag,
              keyVersion: r.key_version,
              scopes: r.scopes,
              expiresAt: r.expires_at.toISOString(),
              validatedAt: r.validated_at.toISOString(),
              retryUntil: r.retry_until?.toISOString() ?? null
            } satisfies Credential,
            consent: {
              manualEnabled: r.manual_enabled ?? false,
              consentVersion: r.consent_version ?? null,
              consentedAt: r.consented_at?.toISOString() ?? null,
              revokedAt: r.revoked_at?.toISOString() ?? null,
              scheduledEnabled: r.scheduled_enabled,
              scheduledConsentVersion: r.scheduled_consent_version,
              scheduledConsentedAt: r.scheduled_consented_at?.toISOString() ?? null,
              scheduledRevokedAt: r.scheduled_revoked_at?.toISOString() ?? null
            }
          },
          phase: r.phase,
          startedAt: r.window_started_at?.toISOString() ?? null,
          endedAt: r.window_ended_at?.toISOString() ?? null,
          cursor: r.pagination_cursor,
          pendingWindows: r.pending_windows ?? [],
          itemsInWindow: r.items_in_window,
          completedAt: r.completed_at?.toISOString() ?? null
        } as ClipDiscoveryClaim
      }),
    initialize: (claim, window) =>
      authorized(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${claim.ownerId},0))`
        const rows =
          await tx`UPDATE private.clip_discovery_state ds SET window_started_at=${window.startedAt},window_ended_at=${window.endedAt},pagination_cursor=NULL,items_in_window=0,lease_until=NULL,updated_at=now()
          FROM private.clip_processing_consents cc JOIN public.channels c ON c.id=cc.channel_id
          JOIN public.provider_connections pc ON pc.id=c.connection_id AND pc.status='connected'
          JOIN private.provider_credentials k ON k.connection_id=pc.id
          WHERE ds.channel_id=${claim.channelId} AND c.owner_id=${claim.ownerId} AND cc.channel_id=ds.channel_id
            AND pc.id=${claim.access.connectionId} AND k.expires_at>now() AND 'channel:manage:clips'=ANY(k.scopes)
            AND cc.scheduled_enabled AND cc.scheduled_revoked_at IS NULL AND cc.scheduled_revision=${claim.access.scheduledRevision}
          RETURNING ds.channel_id`
        return rows.length === 1
      }),
    advance: (claim, input) =>
      authorized(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${claim.ownerId},0))`
        const authorized =
          await tx`SELECT c.id FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id
          JOIN private.provider_credentials k ON k.connection_id=pc.id JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
          WHERE c.id=${claim.channelId} AND c.owner_id=${claim.ownerId} AND pc.id=${claim.access.connectionId}
            AND pc.status='connected' AND cc.scheduled_enabled AND cc.scheduled_revoked_at IS NULL
            AND cc.scheduled_revision=${claim.access.scheduledRevision} AND k.expires_at>now() AND 'channel:manage:clips'=ANY(k.scopes)`
        if (!authorized[0]) {
          await tx`UPDATE private.clip_discovery_state SET lease_until=NULL WHERE channel_id=${claim.channelId}`
          return { current: false, discovered: 0 }
        }
        const lease = await tx`SELECT channel_id FROM private.clip_discovery_state
          WHERE channel_id=${claim.channelId} AND lease_until>now() FOR UPDATE`
        if (!lease[0]) return { current: false, discovered: 0 }
        let discovered = 0
        for (const clip of input.clips) {
          if (clip.broadcasterId !== claim.access.broadcasterId) continue
          const inserted =
            await tx`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,broadcaster_id,creator_id,title,video_id,vod_offset,created_at,duration_seconds,language,view_count,capture_mode,state)
            VALUES (${claim.channelId},${clip.id},${'https://clips.twitch.tv/' + clip.id},${clip.broadcasterId},${clip.creatorId},${clip.title},${clip.videoId},${clip.vodOffset},${clip.createdAt},${clip.duration},${clip.language},${clip.viewCount},'scheduled','waiting_capacity')
            ON CONFLICT(channel_id,twitch_clip_id) DO NOTHING RETURNING id`
          discovered += inserted.length
        }
        const next = input.next
        const updated =
          await tx`UPDATE private.clip_discovery_state SET phase=${next.phase},window_started_at=${next.startedAt},window_ended_at=${next.endedAt},pagination_cursor=${next.cursor},pending_windows=${sql.json(next.pendingWindows)},items_in_window=${next.itemsInWindow},lease_until=NULL,last_checked_at=now(),completed_at=${next.completedAt},updated_at=now()
          WHERE channel_id=${claim.channelId} AND lease_until>now() RETURNING channel_id`
        return { current: updated.length === 1, discovered }
      })
  }
}

export const getClipDiscoveryRepository = () =>
  createClipDiscoveryRepository(getFoundationDatabase())
