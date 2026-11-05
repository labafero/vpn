import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { getFoundationDatabase, type Credential } from './private-database'
import { requireClipAccess, requireScheduledClipAccess } from './clip-ingestion'
import type { ClipMetadata } from './twitch-clips'

export type ClipConsent = {
  manualEnabled: boolean
  consentVersion: 'clip-processing-v1' | null
  consentedAt: string | null
  revokedAt: string | null
  scheduledEnabled: boolean
  scheduledConsentVersion: 'clip-scheduled-v1' | null
  scheduledConsentedAt: string | null
  scheduledRevokedAt: string | null
}
export type ClipAccess = {
  consentRevision: string | null
  scheduledRevision: string | null
  connectionId: string
  broadcasterId: string
  connected: boolean
  scopes: string[]
  credential: Credential | null
  consent: ClipConsent
}
export type ClipDetectionRecord = {
  phraseId: string
  phraseVersion: number
  phrase: string
  source: 'captions' | 'openai'
  startMs: number
  endMs: number
}
export type ClipSubmissionRecord = {
  id: string
  clipId: string
  canonicalUrl: string
  videoId: string | null
  vodOffset: number | null
  title: string | null
  creatorId: string | null
  createdAt: string | null
  durationSeconds: number | null
  language: string | null
  viewCount: number | null
  captureMode: 'manual' | 'scheduled'
  state: string
  failureCode: string | null
  receivedAt: string
  approvedAt: string | null
  detections: ClipDetectionRecord[]
}
export type ClipRepository = {
  existing: (
    owner: string,
    channel: string,
    id: string
  ) => Promise<{ id: string; state: string; duplicate: boolean } | null>
  read: (owner: string, channel: string) => Promise<ClipAccess | null>
  setConsent: (owner: string, channel: string, enabled: boolean) => Promise<ClipAccess>
  setScheduledConsent: (owner: string, channel: string, enabled: boolean) => Promise<ClipAccess>
  insert: (
    owner: string,
    channel: string,
    metadata: ClipMetadata,
    previous: ClipAccess
  ) => Promise<{ id: string; state: string; duplicate: boolean }>
  insertDiscovered: (
    owner: string,
    channel: string,
    metadata: ClipMetadata,
    previous: ClipAccess
  ) => Promise<{ id: string; state: string; duplicate: boolean }>
  list: (
    owner: string,
    channel: string,
    cursor?: string | null
  ) => Promise<{ items: ClipSubmissionRecord[]; nextCursor: string | null }>
  detail: (owner: string, channel: string, submissionId: string) => Promise<ClipSubmissionRecord>
  setEvidenceApproval: (
    owner: string,
    channel: string,
    submissionId: string,
    approved: boolean
  ) => Promise<{ approvedAt: string | null }>
}
export function createClipRepository(sql: postgres.Sql): ClipRepository {
  function encodeCursor(createdAt: string, id: string) {
    return Buffer.from(JSON.stringify({ createdAt, id })).toString('base64url')
  }
  function decodeCursor(cursor: string | null | undefined) {
    if (!cursor) return null
    try {
      const value = JSON.parse(Buffer.from(cursor, 'base64url').toString())
      if (
        typeof value.createdAt !== 'string' ||
        !Number.isFinite(Date.parse(value.createdAt)) ||
        typeof value.id !== 'string'
      )
        throw new Error()
      return { createdAt: value.createdAt, id: value.id }
    } catch {
      throw new FoundationError(400)
    }
  }
  async function read(
    tx: postgres.Sql | postgres.TransactionSql,
    owner: string,
    channel: string
  ): Promise<ClipAccess | null> {
    const rows =
      await tx`SELECT pc.id,pc.provider_user_id,pc.status,k.*,cc.revision AS consent_revision,cc.scheduled_revision,cc.manual_enabled,cc.consent_version,cc.consented_at,cc.revoked_at,cc.scheduled_enabled,cc.scheduled_consent_version,cc.scheduled_consented_at,cc.scheduled_revoked_at
      FROM public.channels c JOIN public.provider_connections pc ON pc.id=c.connection_id
      LEFT JOIN private.provider_credentials k ON k.connection_id=pc.id
      LEFT JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
      WHERE c.id=${channel} AND c.owner_id=${owner} AND pc.user_id=${owner}`
    const r = rows[0]
    if (!r) return null
    return {
      consentRevision: r.consent_revision ?? null,
      scheduledRevision: r.scheduled_revision ?? null,
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
        revokedAt: r.revoked_at?.toISOString() ?? null,
        scheduledEnabled: r.scheduled_enabled ?? false,
        scheduledConsentVersion: r.scheduled_consent_version ?? null,
        scheduledConsentedAt: r.scheduled_consented_at?.toISOString() ?? null,
        scheduledRevokedAt: r.scheduled_revoked_at?.toISOString() ?? null
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
    list: (owner, channel, cursor) =>
      authorized(owner, async (tx) => {
        const owned =
          await tx`SELECT 1 FROM public.channels WHERE id=${channel} AND owner_id=${owner}`
        if (!owned[0]) throw new FoundationError(403)
        const decoded = decodeCursor(cursor)
        const rows =
          await tx`SELECT s.id,s.twitch_clip_id,s.canonical_url,s.video_id,s.vod_offset,s.title,s.state,s.failure_code,s.received_at,s.approved_at,s.creator_id,s.created_at,s.duration_seconds,s.language,s.view_count,s.capture_mode,
          COALESCE(json_agg(json_build_object(
            'phraseId',d.phrase_id,'phraseVersion',d.phrase_version,'phrase',d.phrase_text,
            'source',d.source,'startMs',d.start_ms,'endMs',d.end_ms
          ) ORDER BY d.start_ms) FILTER (WHERE d.id IS NOT NULL),'[]'::json) AS detections
          FROM private.clip_submissions s
          JOIN public.channels c ON c.id=s.channel_id
          LEFT JOIN private.clip_detections d ON d.submission_id=s.id
          WHERE s.channel_id=${channel} AND c.owner_id=${owner}
            AND (${decoded?.createdAt ?? null}::timestamptz IS NULL OR (COALESCE(s.created_at,s.received_at),s.id) < (${decoded?.createdAt ?? null}::timestamptz,${decoded?.id ?? null}::uuid))
          GROUP BY s.id ORDER BY COALESCE(s.created_at,s.received_at) DESC,s.id DESC LIMIT 51`
        const hasMore = rows.length > 50
        const page = rows.slice(0, 50)
        const last = page.at(-1)
        return {
          items: page.map((row) => ({
            id: row.id,
            clipId: row.twitch_clip_id,
            canonicalUrl: row.canonical_url,
            videoId: row.video_id ?? null,
            vodOffset: row.vod_offset === null ? null : Number(row.vod_offset),
            title: row.title ?? null,
            creatorId: row.creator_id ?? null,
            createdAt: row.created_at?.toISOString() ?? null,
            durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
            language: row.language ?? null,
            viewCount: row.view_count === null ? null : Number(row.view_count),
            captureMode: row.capture_mode,
            state: row.state,
            failureCode: row.failure_code ?? null,
            receivedAt: row.received_at.toISOString(),
            approvedAt: row.approved_at?.toISOString() ?? null,
            detections: row.detections ?? []
          })),
          nextCursor:
            hasMore && last
              ? encodeCursor((last.created_at ?? last.received_at).toISOString(), last.id)
              : null
        }
      }),
    detail: (owner, channel, submissionId) =>
      authorized(owner, async (tx) => {
        const rows =
          await tx`SELECT s.id,s.twitch_clip_id,s.canonical_url,s.video_id,s.vod_offset,s.title,s.state,s.failure_code,s.received_at,s.approved_at,s.creator_id,s.created_at,s.duration_seconds,s.language,s.view_count,s.capture_mode,
          COALESCE(json_agg(json_build_object('phraseId',d.phrase_id,'phraseVersion',d.phrase_version,'phrase',d.phrase_text,'source',d.source,'startMs',d.start_ms,'endMs',d.end_ms) ORDER BY d.start_ms) FILTER (WHERE d.id IS NOT NULL),'[]'::json) AS detections
          FROM private.clip_submissions s JOIN public.channels c ON c.id=s.channel_id
          LEFT JOIN private.clip_detections d ON d.submission_id=s.id
          WHERE s.channel_id=${channel} AND s.id=${submissionId} AND c.owner_id=${owner} GROUP BY s.id`
        if (!rows[0]) throw new FoundationError(404)
        const row = rows[0]
        return {
          id: row.id,
          clipId: row.twitch_clip_id,
          canonicalUrl: row.canonical_url,
          videoId: row.video_id ?? null,
          vodOffset: row.vod_offset === null ? null : Number(row.vod_offset),
          title: row.title ?? null,
          creatorId: row.creator_id ?? null,
          createdAt: row.created_at?.toISOString() ?? null,
          durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
          language: row.language ?? null,
          viewCount: row.view_count === null ? null : Number(row.view_count),
          captureMode: row.capture_mode,
          state: row.state,
          failureCode: row.failure_code ?? null,
          receivedAt: row.received_at.toISOString(),
          approvedAt: row.approved_at?.toISOString() ?? null,
          detections: row.detections ?? []
        }
      }),
    setEvidenceApproval: (owner, channel, submissionId, approved) =>
      authorized(owner, async (tx) => {
        const rows = await tx`
          UPDATE private.clip_submissions s
          SET approved_at=CASE WHEN ${approved} THEN COALESCE(s.approved_at,now()) ELSE NULL END,
              approved_by=CASE WHEN ${approved} THEN COALESCE(s.approved_by,${owner}::uuid) ELSE NULL END
          FROM public.channels c
          WHERE s.id=${submissionId} AND s.channel_id=${channel}
            AND c.id=s.channel_id AND c.owner_id=${owner}
            AND s.state='completed'
          RETURNING s.approved_at`
        if (!rows[0]) {
          const owned =
            await tx`SELECT 1 FROM public.channels WHERE id=${channel} AND owner_id=${owner}`
          if (!owned[0]) throw new FoundationError(403)
          throw new FoundationError(404)
        }
        return { approvedAt: rows[0].approved_at?.toISOString() ?? null }
      }),
    setConsent: (owner, channel, enabled) =>
      authorized(owner, async (tx) => {
        const access = await read(tx, owner, channel)
        if (!access) throw new FoundationError(403)
        if (enabled) requireClipAccess(access, false)
        await tx`INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,revoked_at,manual_enabled,scheduled_enabled)
        VALUES (${channel},'clip-processing-v1',now(),CASE WHEN ${enabled} THEN NULL ELSE now() END,${enabled},false)
        ON CONFLICT(channel_id) DO UPDATE SET consented_at=CASE WHEN ${enabled} THEN now() ELSE private.clip_processing_consents.consented_at END,
        revoked_at=CASE WHEN ${enabled} THEN NULL ELSE now() END,manual_enabled=${enabled},revision=gen_random_uuid()`
        return (await read(tx, owner, channel))!
      }),
    setScheduledConsent: (owner, channel, enabled) =>
      authorized(owner, async (tx) => {
        const access = await read(tx, owner, channel)
        if (!access) throw new FoundationError(403)
        if (enabled) {
          if (
            !access.connected ||
            !access.credential ||
            Date.parse(access.credential.expiresAt) <= Date.now() ||
            !access.scopes.includes('channel:manage:clips')
          )
            throw new FoundationError(403)
        }
        await tx`INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,revoked_at,manual_enabled,scheduled_enabled,scheduled_consent_version,scheduled_consented_at,scheduled_revoked_at)
        VALUES (${channel},'clip-processing-v1',now(),now(),false,${enabled},CASE WHEN ${enabled} THEN 'clip-scheduled-v1' ELSE NULL END,CASE WHEN ${enabled} THEN now() ELSE NULL END,CASE WHEN ${enabled} THEN NULL ELSE now() END)
        ON CONFLICT(channel_id) DO UPDATE SET
          scheduled_enabled=${enabled},
          scheduled_consent_version=CASE WHEN ${enabled} THEN 'clip-scheduled-v1' ELSE private.clip_processing_consents.scheduled_consent_version END,
          scheduled_consented_at=CASE WHEN ${enabled} THEN now() ELSE private.clip_processing_consents.scheduled_consented_at END,
          scheduled_revoked_at=CASE WHEN ${enabled} THEN NULL ELSE now() END,
          scheduled_revision=gen_random_uuid()`
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
      }),
    insertDiscovered: (owner, channel, clip, previous) =>
      authorized(owner, async (tx) => {
        const access = await read(tx, owner, channel)
        requireScheduledClipAccess(access)
        if (
          access.connectionId !== previous.connectionId ||
          access.broadcasterId !== clip.broadcasterId ||
          access.scheduledRevision !== previous.scheduledRevision
        )
          throw new FoundationError(403)
        const inserted =
          await tx`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,broadcaster_id,creator_id,title,video_id,vod_offset,created_at,duration_seconds,language,view_count,capture_mode,state)
          VALUES (${channel},${clip.id},${'https://clips.twitch.tv/' + clip.id},${clip.broadcasterId},${clip.creatorId},${clip.title},${clip.videoId},${clip.vodOffset},${clip.createdAt},${clip.duration},${clip.language},${clip.viewCount},'scheduled','waiting_capacity')
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
