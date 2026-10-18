import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { getFoundationDatabase, type Credential } from './private-database'
import { requireClipAccess } from './clip-ingestion'
import type { ClipMetadata } from './twitch-clips'

export type ClipConsent = {
  manualEnabled: boolean
  consentVersion: 'clip-processing-v1' | null
  consentedAt: string | null
  revokedAt: string | null
}
export type ClipAccess = {
  consentRevision: string | null
  connectionId: string
  broadcasterId: string
  connected: boolean
  scopes: string[]
  credential: Credential | null
  consent: ClipConsent
}
export type ClipRepository = {
  existing: (
    owner: string,
    channel: string,
    id: string
  ) => Promise<{ id: string; state: string; duplicate: boolean } | null>
  read: (owner: string, channel: string) => Promise<ClipAccess | null>
  setConsent: (owner: string, channel: string, enabled: boolean) => Promise<ClipAccess>
  insert: (
    owner: string,
    channel: string,
    metadata: ClipMetadata,
    previous: ClipAccess
  ) => Promise<{ id: string; state: string; duplicate: boolean }>
}
export function createClipRepository(sql: postgres.Sql): ClipRepository {
  async function read(
    tx: postgres.Sql | postgres.TransactionSql,
    owner: string,
    channel: string
  ): Promise<ClipAccess | null> {
    const rows =
      await tx`SELECT pc.id,pc.provider_user_id,pc.status,k.*,cc.revision AS consent_revision,cc.manual_enabled,cc.consent_version,cc.consented_at,cc.revoked_at
      FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id
      LEFT JOIN private.provider_credentials k ON k.connection_id=pc.id
      LEFT JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
      WHERE c.id=${channel} AND c.owner_id=${owner} AND pc.user_id=${owner}`
    const r = rows[0]
    if (!r) return null
    return {
      consentRevision: r.consent_revision ?? null,
      connectionId: r.id,
      broadcasterId: r.provider_user_id,
      connected: r.status === 'connected',
      scopes: r.scopes ?? [],
      credential: r.ciphertext
        ? {
            ciphertext: r.ciphertext,
            iv: r.iv,
            tag: r.tag,
            keyVersion: r.key_version,
            scopes: r.scopes,
            expiresAt: r.expires_at.toISOString(),
            validatedAt: r.validated_at.toISOString(),
            retryUntil: r.retry_until?.toISOString() ?? null
          }
        : null,
      consent: {
        manualEnabled: r.manual_enabled ?? false,
        consentVersion: r.consent_version ?? null,
        consentedAt: r.consented_at?.toISOString() ?? null,
        revokedAt: r.revoked_at?.toISOString() ?? null
      }
    }
  }
  async function authorized<T>(owner: string, work: (tx: postgres.TransactionSql) => Promise<T>) {
    const role = await sql`SELECT current_user AS role`
    if (role[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(async (tx) => {
      // Shared with disconnect, OAuth upgrades, refresh and all consent writes.
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      return work(tx)
    })) as T
  }
  return {
    existing: (owner, channel, id) =>
      authorized(owner, async (tx) => {
        requireClipAccess(await read(tx, owner, channel))
        const rows =
          await tx`SELECT id,state FROM private.clip_submissions WHERE channel_id=${channel} AND twitch_clip_id=${id}`
        return rows[0] ? { id: rows[0].id, state: rows[0].state, duplicate: true } : null
      }),
    read: (owner, channel) => authorized(owner, (tx) => read(tx, owner, channel)),
    setConsent: (owner, channel, enabled) =>
      authorized(owner, async (tx) => {
        const access = await read(tx, owner, channel)
        if (!access) throw new FoundationError(403)
        if (enabled) requireClipAccess(access, false)
        await tx`INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,revoked_at,manual_enabled,scheduled_enabled)
        VALUES (${channel},'clip-processing-v1',now(),CASE WHEN ${enabled} THEN NULL ELSE now() END,${enabled},false)
        ON CONFLICT(channel_id) DO UPDATE SET consented_at=CASE WHEN ${enabled} THEN now() ELSE private.clip_processing_consents.consented_at END,
        revoked_at=CASE WHEN ${enabled} THEN NULL ELSE now() END,manual_enabled=${enabled},scheduled_enabled=false,revision=gen_random_uuid()`
        if (!enabled)
          await tx`UPDATE private.clip_submissions SET state='cancelled_consent',finished_at=now()
        WHERE channel_id=${channel} AND state NOT IN ('completed','no_match','source_unavailable','failed_terminal','cancelled_consent')`
        return (await read(tx, owner, channel))!
      }),
    insert: (owner, channel, clip, previous) =>
      authorized(owner, async (tx) => {
        const access = await read(tx, owner, channel)
        requireClipAccess(access)
        if (
          access.connectionId !== previous.connectionId ||
          access.broadcasterId !== clip.broadcasterId ||
          access.consentRevision !== previous.consentRevision
        )
          throw new FoundationError(403)
        const inserted =
          await tx`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,broadcaster_id,creator_id,title,video_id,vod_offset,created_at,duration_seconds,language,view_count,capture_mode,state)
        VALUES (${channel},${clip.id},${'https://clips.twitch.tv/' + clip.id},${clip.broadcasterId},${clip.creatorId},${clip.title},${clip.videoId},${clip.vodOffset},${clip.createdAt},${clip.duration},${clip.language},${clip.viewCount},'manual','pending_captions')
        ON CONFLICT(channel_id,twitch_clip_id) DO NOTHING RETURNING id,state`
        if (inserted[0]) return { id: inserted[0].id, state: inserted[0].state, duplicate: false }
        const existing =
          await tx`SELECT id,state FROM private.clip_submissions WHERE channel_id=${channel} AND twitch_clip_id=${clip.id}`
        if (!existing[0]) throw new FoundationError(503)
        return { id: existing[0].id, state: existing[0].state, duplicate: true }
      })
  }
}
export const getClipRepository = () => createClipRepository(getFoundationDatabase())
