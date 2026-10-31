import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { getFoundationDatabase, type Credential } from './private-database'
import type { ClipDetection, ClipProcessingJob, ClipProcessingRepository } from './clip-processing'
import type { ClipAccess } from './clip-repository'

function hasProcessingAccess(access: ClipAccess | null): access is ClipAccess & {
  credential: Credential
  consentRevision: string
} {
  return Boolean(
    access?.connected &&
    access.credential &&
    access.scopes.includes('channel:manage:clips') &&
    access.consent.manualEnabled &&
    !access.consent.revokedAt &&
    access.consentRevision
  )
}

export function createClipProcessingRepository(sql: postgres.Sql): ClipProcessingRepository {
  async function authorized<T>(owner: string, work: (tx: postgres.TransactionSql) => Promise<T>) {
    const role = await sql`SELECT current_user AS role`
    if (role[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      return work(tx)
    })) as T
  }

  async function readAccess(tx: postgres.TransactionSql, owner: string, channel: string) {
    const rows =
      await tx`SELECT pc.id,pc.provider_user_id,pc.status,k.*,cc.revision AS consent_revision,
      cc.manual_enabled,cc.consent_version,cc.consented_at,cc.revoked_at
      FROM public.channels c
      JOIN public.provider_connections pc ON pc.id=c.connection_id
      LEFT JOIN private.provider_credentials k ON k.connection_id=pc.id
      LEFT JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
      WHERE c.id=${channel} AND c.owner_id=${owner} AND pc.user_id=${owner}`
    const row = rows[0]
    if (!row) return null
    return {
      consentRevision: row.consent_revision ?? null,
      connectionId: row.id,
      broadcasterId: row.provider_user_id,
      connected: row.status === 'connected',
      scopes: row.scopes ?? [],
      credential: row.ciphertext
        ? ({
            ciphertext: row.ciphertext,
            iv: row.iv,
            tag: row.tag,
            keyVersion: row.key_version,
            scopes: row.scopes,
            expiresAt: row.expires_at.toISOString(),
            validatedAt: row.validated_at.toISOString(),
            retryUntil: row.retry_until?.toISOString() ?? null
          } satisfies Credential)
        : null,
      consent: {
        manualEnabled: row.manual_enabled ?? false,
        consentVersion: row.consent_version ?? null,
        consentedAt: row.consented_at?.toISOString() ?? null,
        revokedAt: row.revoked_at?.toISOString() ?? null
      }
    } satisfies ClipAccess
  }

  async function cancel(tx: postgres.TransactionSql, id: string) {
    await tx`UPDATE private.clip_submissions
      SET state='cancelled_consent',finished_at=now(),processing_lease_until=NULL,retry_after=NULL
      WHERE id=${id} AND state NOT IN ('completed','no_match','source_unavailable','failed_terminal','cancelled_consent')`
  }

  return {
    claimNext: async (): Promise<ClipProcessingJob | null> => {
      const lock = await sql`SELECT current_user AS role`
      if (lock[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
      return (await sql.begin(async (tx) => {
        // Claims serialize globally and a partial unique index protects the lease after commit.
        await tx`SELECT pg_advisory_xact_lock(271016,1)`
        await tx`UPDATE private.clip_submissions
          SET state=CASE WHEN processing_attempts >= 3 THEN 'failed_terminal' ELSE 'failed_retryable' END,
              failure_code='provider_error',
              finished_at=CASE WHEN processing_attempts >= 3 THEN now() ELSE NULL END,
              retry_after=CASE WHEN processing_attempts >= 3 THEN NULL ELSE now()+interval '1 minute' END,
              processing_lease_until=NULL
          WHERE state='processing' AND processing_lease_until < now()`
        const candidates = await tx`SELECT s.id,s.channel_id,c.owner_id
          FROM private.clip_submissions s
          JOIN public.channels c ON c.id=s.channel_id
          WHERE s.state IN ('pending_captions','failed_retryable')
            AND (s.retry_after IS NULL OR s.retry_after <= now())
            AND NOT EXISTS (SELECT 1 FROM private.clip_submissions active WHERE active.state='processing')
          ORDER BY s.received_at ASC,s.id ASC
          FOR UPDATE OF s SKIP LOCKED LIMIT 1`
        if (!candidates[0]) return null
        const candidate = candidates[0]
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${candidate.owner_id},0))`
        const access = await readAccess(tx, candidate.owner_id, candidate.channel_id)
        if (!hasProcessingAccess(access)) {
          await cancel(tx, candidate.id)
          return null
        }
        const claimed = await tx`UPDATE private.clip_submissions
          SET state='processing',processing_attempts=processing_attempts+1,
              processing_lease_until=now()+interval '250 seconds',retry_after=NULL
          WHERE id=${candidate.id}
            AND state IN ('pending_captions','failed_retryable')
            AND processing_attempts < 3
          RETURNING id,twitch_clip_id,canonical_url,broadcaster_id,duration_seconds,video_id,vod_offset`
        if (!claimed[0]) return null
        return {
          id: claimed[0].id,
          ownerId: candidate.owner_id,
          channelId: candidate.channel_id,
          clipId: claimed[0].twitch_clip_id,
          canonicalUrl: claimed[0].canonical_url,
          broadcasterId: claimed[0].broadcaster_id,
          durationSeconds: Number(claimed[0].duration_seconds),
          videoId: claimed[0].video_id ?? null,
          vodOffset: claimed[0].vod_offset === null ? null : Number(claimed[0].vod_offset),
          consentRevision: access.consentRevision,
          credential: access.credential
        }
      })) as ClipProcessingJob | null
    },
    stillAuthorized: (job: ClipProcessingJob) =>
      authorized(job.ownerId, async (tx) => {
        const state = await tx`SELECT state FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId}`
        const access = await readAccess(tx, job.ownerId, job.channelId)
        return (
          state[0]?.state === 'processing' &&
          hasProcessingAccess(access) &&
          access.consentRevision === job.consentRevision
        )
      }),
    noProvider: (job: ClipProcessingJob) =>
      authorized(job.ownerId, async (tx) => {
        const access = await readAccess(tx, job.ownerId, job.channelId)
        const state = await tx`SELECT state FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId} FOR UPDATE`
        if (
          state[0]?.state !== 'processing' ||
          !hasProcessingAccess(access) ||
          access.consentRevision !== job.consentRevision
        ) {
          await cancel(tx, job.id)
          return
        }
        await tx`UPDATE private.clip_submissions SET state='needs_openai_key',
          failure_code=NULL,finished_at=NULL,processing_lease_until=NULL,retry_after=NULL
          WHERE id=${job.id} AND state='processing'`
      }),
    cancel: (job: ClipProcessingJob) => authorized(job.ownerId, (tx) => cancel(tx, job.id)),
    finish: (job: ClipProcessingJob, detections: ClipDetection[]) =>
      authorized(job.ownerId, async (tx) => {
        const access = await readAccess(tx, job.ownerId, job.channelId)
        const state = await tx`SELECT state FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId} FOR UPDATE`
        if (
          state[0]?.state !== 'processing' ||
          !hasProcessingAccess(access) ||
          access.consentRevision !== job.consentRevision
        ) {
          await cancel(tx, job.id)
          return false
        }
        for (const detection of detections)
          await tx`INSERT INTO private.clip_detections
            (submission_id,phrase_id,phrase_version,phrase_text,source,start_ms,end_ms)
            VALUES (${job.id},${detection.phraseId},${detection.phraseVersion},${detection.phrase},${detection.source},${detection.startMs},${detection.endMs})
            ON CONFLICT DO NOTHING`
        await tx`UPDATE private.clip_submissions
          SET state=${detections.length ? 'completed' : 'no_match'},finished_at=now(),
              failure_code=NULL,processing_lease_until=NULL,retry_after=NULL
          WHERE id=${job.id} AND state='processing'`
        return true
      }),
    fail: (job: ClipProcessingJob, code: string, retryable: boolean, maxAttempts: number) =>
      authorized(job.ownerId, async (tx) => {
        const state = await tx`SELECT state,processing_attempts FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId} FOR UPDATE`
        const access = await readAccess(tx, job.ownerId, job.channelId)
        if (
          state[0]?.state !== 'processing' ||
          !hasProcessingAccess(access) ||
          access.consentRevision !== job.consentRevision
        ) {
          await cancel(tx, job.id)
          return 'cancelled_consent' as const
        }
        if (code === 'clip_unavailable') {
          await tx`UPDATE private.clip_submissions SET state='source_unavailable',failure_code=${code},
            finished_at=now(),processing_lease_until=NULL,retry_after=NULL WHERE id=${job.id}`
          return 'source_unavailable' as const
        }
        if (retryable && state[0].processing_attempts < maxAttempts) {
          const retryDelay = code === 'quota_exceeded' ? '15 minutes' : '1 minute'
          await tx`UPDATE private.clip_submissions SET state='failed_retryable',failure_code=${code},
            finished_at=NULL,retry_after=now()+${retryDelay}::interval,
            processing_lease_until=NULL WHERE id=${job.id}`
          return 'failed_retryable' as const
        }
        await tx`UPDATE private.clip_submissions SET state='failed_terminal',failure_code=${code},
          finished_at=now(),retry_after=NULL,processing_lease_until=NULL WHERE id=${job.id}`
        return 'failed_terminal' as const
      })
  } satisfies ClipProcessingRepository
}

export const getClipProcessingRepository = () =>
  createClipProcessingRepository(getFoundationDatabase())
