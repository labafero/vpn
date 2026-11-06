import { randomUUID } from 'node:crypto'
import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { getFoundationDatabase, type Credential } from './private-database'
import type { ClipDetection, ClipProcessingJob, ClipProcessingRepository } from './clip-processing'
import type { ClipAccess } from './clip-repository'
import { detectClipPhrases } from './clip-detection'

function hasProcessingAccess(
  access: ClipAccess | null,
  mode: 'manual' | 'scheduled'
): access is ClipAccess & {
  credential: Credential
  consentRevision: string
  scheduledRevision: string
} {
  return Boolean(
    access?.connected &&
    access.credential &&
    Date.parse(access.credential.expiresAt) > Date.now() &&
    access.scopes.includes('channel:manage:clips') &&
    (mode === 'manual'
      ? access.consent.manualEnabled && !access.consent.revokedAt && access.consentRevision
      : access.consent.scheduledEnabled &&
        access.consent.scheduledConsentVersion === 'clip-scheduled-v1' &&
        !access.consent.scheduledRevokedAt &&
        access.scheduledRevision)
  )
}
function accessRevision(access: ClipAccess, mode: 'manual' | 'scheduled') {
  return mode === 'manual' ? access.consentRevision! : access.scheduledRevision!
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

  async function processingAuthorized<T>(
    owner: string,
    work: (tx: postgres.TransactionSql) => Promise<T>
  ) {
    const role = await sql`SELECT current_user AS role`
    if (role[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(271016,1)`
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      return work(tx)
    })) as T
  }

  async function readAccess(tx: postgres.TransactionSql, owner: string, channel: string) {
    const rows =
      await tx`SELECT pc.id,pc.provider_user_id,pc.status,k.*,cc.revision AS consent_revision,cc.scheduled_revision,
      cc.manual_enabled,cc.consent_version,cc.consented_at,cc.revoked_at,cc.scheduled_enabled,cc.scheduled_consent_version,cc.scheduled_consented_at,cc.scheduled_revoked_at
      FROM public.channels c
      JOIN public.provider_connections pc ON pc.id=c.connection_id
      LEFT JOIN private.provider_credentials k ON k.connection_id=pc.id
      LEFT JOIN private.clip_processing_consents cc ON cc.channel_id=c.id
      WHERE c.id=${channel} AND c.owner_id=${owner} AND pc.user_id=${owner}`
    const row = rows[0]
    if (!row) return null
    return {
      consentRevision: row.consent_revision ?? null,
      scheduledRevision: row.scheduled_revision ?? null,
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
        revokedAt: row.revoked_at?.toISOString() ?? null,
        scheduledEnabled: row.scheduled_enabled ?? false,
        scheduledConsentVersion: row.scheduled_consent_version ?? null,
        scheduledConsentedAt: row.scheduled_consented_at?.toISOString() ?? null,
        scheduledRevokedAt: row.scheduled_revoked_at?.toISOString() ?? null
      }
    } satisfies ClipAccess
  }

  async function cancel(tx: postgres.TransactionSql, id: string) {
    await tx`UPDATE private.clip_submissions
      SET state='cancelled_consent',finished_at=now(),processing_lease_until=NULL,retry_after=NULL,
          manual_retry_token=NULL,manual_retry_consent_revision=NULL,manual_retry_requested_at=NULL
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
        while (true) {
          const candidates = await tx`SELECT s.id,s.channel_id,s.capture_mode,c.owner_id
          FROM private.clip_submissions s
          JOIN public.channels c ON c.id=s.channel_id
          WHERE s.state IN ('pending_captions','failed_retryable','waiting_capacity')
            AND s.processing_attempts < 3
            AND (s.retry_after IS NULL OR s.retry_after <= now())
            AND (s.state<>'waiting_capacity' OR
              ((SELECT count(*) FROM private.clip_submissions active WHERE active.channel_id=s.channel_id AND active.state IN ('pending_captions','failed_retryable','processing')) < 3
                AND (SELECT count(*) FROM private.clip_submissions active WHERE active.state IN ('pending_captions','failed_retryable','processing')) < 5))
            AND NOT EXISTS (SELECT 1 FROM private.clip_submissions active WHERE active.state='processing')
          ORDER BY s.manual_retry_requested_at ASC NULLS LAST,s.received_at ASC,s.id ASC
          FOR UPDATE OF s SKIP LOCKED LIMIT 1`
          if (!candidates[0]) return null
          const candidate = candidates[0]
          await tx`SELECT pg_advisory_xact_lock(hashtextextended(${candidate.owner_id},0))`
          const access = await readAccess(tx, candidate.owner_id, candidate.channel_id)
          const captureMode = candidate.capture_mode as 'manual' | 'scheduled'
          if (!hasProcessingAccess(access, captureMode)) {
            await tx`UPDATE private.clip_submissions SET state='cancelled_consent',finished_at=now(),processing_lease_until=NULL,retry_after=NULL
              WHERE channel_id=${candidate.channel_id} AND capture_mode=${captureMode}
                AND state IN ('pending_captions','failed_retryable','waiting_capacity')`
            continue
          }
          const phraseRows =
            await tx`SELECT id,text,version FROM private.clip_trigger_phrases WHERE channel_id=${candidate.channel_id} AND enabled ORDER BY created_at,id`
          if (!phraseRows.length) {
            await tx`UPDATE private.clip_submissions SET state='needs_trigger_phrases',finished_at=NULL
              WHERE channel_id=${candidate.channel_id} AND capture_mode=${captureMode}
                AND state IN ('pending_captions','failed_retryable','waiting_capacity')`
            continue
          }
          const claimed = await tx`UPDATE private.clip_submissions
          SET state='processing',processing_attempts=processing_attempts+1,
              processing_lease_until=now()+interval '250 seconds',retry_after=NULL,
              manual_retry_token=NULL,manual_retry_consent_revision=NULL
          WHERE id=${candidate.id}
            AND state IN ('pending_captions','failed_retryable','waiting_capacity')
            AND processing_attempts < 3
          RETURNING id,twitch_clip_id,canonical_url,broadcaster_id,duration_seconds,video_id,vod_offset,processing_attempts`
          if (!claimed[0]) continue
          return {
            id: claimed[0].id,
            attempt: Number(claimed[0].processing_attempts),
            ownerId: candidate.owner_id,
            channelId: candidate.channel_id,
            clipId: claimed[0].twitch_clip_id,
            canonicalUrl: claimed[0].canonical_url,
            broadcasterId: claimed[0].broadcaster_id,
            durationSeconds: Number(claimed[0].duration_seconds),
            videoId: claimed[0].video_id ?? null,
            vodOffset: claimed[0].vod_offset === null ? null : Number(claimed[0].vod_offset),
            consentRevision: accessRevision(access, captureMode),
            captureMode,
            phrases: phraseRows.map((phrase) => ({
              phraseId: phrase.id,
              phraseVersion: phrase.version,
              phrase: phrase.text
            })),
            credential: access.credential
          }
        }
      })) as ClipProcessingJob | null
    },
    beginManualRetry: (owner: string, channel: string, submissionId: string) =>
      processingAuthorized(owner, async (tx) => {
        const rows =
          await tx`SELECT s.id,s.video_id,s.vod_offset,s.duration_seconds,s.capture_mode,s.state
          FROM private.clip_submissions s
          JOIN public.channels c ON c.id=s.channel_id
          WHERE s.id=${submissionId} AND s.channel_id=${channel} AND c.owner_id=${owner}
          FOR UPDATE OF s`
        const row = rows[0]
        if (!row) throw new FoundationError(404)
        if (
          ![
            'source_unavailable',
            'failed_retryable',
            'failed_terminal',
            'needs_openai_key'
          ].includes(row.state)
        )
          throw new FoundationError(409)
        const active =
          await tx`SELECT 1 FROM private.clip_submissions WHERE state='processing' LIMIT 1`
        if (active[0]) throw new FoundationError(429)
        const access = await readAccess(tx, owner, channel)
        const captureMode = row.capture_mode as 'manual' | 'scheduled'
        if (!hasProcessingAccess(access, captureMode)) throw new FoundationError(403)
        const phraseRows = await tx`SELECT id,text,version FROM private.clip_trigger_phrases
          WHERE channel_id=${channel} AND enabled LIMIT 1`
        if (!phraseRows.length) {
          await tx`UPDATE private.clip_submissions SET state='needs_trigger_phrases',failure_code=NULL,
            finished_at=NULL,processing_lease_until=NULL,retry_after=NULL,manual_retry_token=NULL,
            manual_retry_consent_revision=NULL,manual_retry_requested_at=NULL WHERE id=${submissionId}`
          return {
            state: 'needs_trigger_phrases' as const,
            mode: 'none' as const,
            retryToken: null,
            videoId: row.video_id ?? null,
            vodOffset: row.vod_offset === null ? null : Number(row.vod_offset),
            durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds)
          }
        }

        const hasVod =
          Boolean(row.video_id) && row.vod_offset !== null && Number(row.duration_seconds) > 0
        const retryToken = hasVod ? randomUUID() : null
        const state = hasVod ? 'processing' : 'pending_captions'
        const leaseUntil = hasVod ? new Date(Date.now() + 250_000) : null
        await tx`UPDATE private.clip_submissions SET state=${state},failure_code=NULL,processing_attempts=${hasVod ? 1 : 0},
          finished_at=NULL,processing_lease_until=${leaseUntil},retry_after=NULL,
          manual_retry_requested_at=now(),manual_retry_token=${retryToken},
          manual_retry_consent_revision=${hasVod ? accessRevision(access!, captureMode) : null}
          WHERE id=${submissionId}`
        return {
          state: state as 'processing' | 'pending_captions',
          mode: hasVod ? ('captions' as const) : ('openai' as const),
          retryToken,
          videoId: row.video_id ?? null,
          vodOffset: row.vod_offset === null ? null : Number(row.vod_offset),
          durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds)
        }
      }),
    completeManualRetryWithCaptions: (
      owner: string,
      channel: string,
      submissionId: string,
      retryToken: string,
      segments: { startMs: number; endMs: number; text: string }[]
    ) =>
      processingAuthorized(owner, async (tx) => {
        const rows =
          await tx`SELECT s.capture_mode,s.state,s.manual_retry_token,s.manual_retry_consent_revision,
            s.processing_lease_until
          FROM private.clip_submissions s JOIN public.channels c ON c.id=s.channel_id
          WHERE s.id=${submissionId} AND s.channel_id=${channel} AND c.owner_id=${owner} FOR UPDATE OF s`
        const row = rows[0]
        if (!row) throw new FoundationError(404)
        if (
          row.state !== 'processing' ||
          row.manual_retry_token !== retryToken ||
          !row.processing_lease_until ||
          Date.parse(row.processing_lease_until.toISOString()) <= Date.now()
        )
          throw new FoundationError(409)
        const access = await readAccess(tx, owner, channel)
        const captureMode = row.capture_mode as 'manual' | 'scheduled'
        if (
          !hasProcessingAccess(access, captureMode) ||
          accessRevision(access!, captureMode) !== row.manual_retry_consent_revision
        ) {
          await cancel(tx, submissionId)
          return { state: 'cancelled_consent' as const, matches: 0 }
        }
        const phraseRows = await tx`SELECT id,text,version FROM private.clip_trigger_phrases
          WHERE channel_id=${channel} AND enabled ORDER BY created_at,id`
        if (!phraseRows.length) {
          await tx`UPDATE private.clip_submissions SET state='needs_trigger_phrases',finished_at=NULL,
            processing_lease_until=NULL,manual_retry_token=NULL,manual_retry_consent_revision=NULL,
            manual_retry_requested_at=NULL WHERE id=${submissionId}`
          return { state: 'needs_trigger_phrases' as const, matches: 0 }
        }
        const phraseSnapshot = phraseRows.map((phrase) => ({
          phraseId: phrase.id,
          phraseVersion: phrase.version,
          phrase: phrase.text
        }))
        const detections = detectClipPhrases(segments, phraseSnapshot).map((detection) => ({
          ...detection,
          source: 'captions' as const
        }))
        for (const detection of detections)
          await tx`INSERT INTO private.clip_detections
            (submission_id,phrase_id,phrase_version,phrase_text,source,start_ms,end_ms)
            VALUES (${submissionId},${detection.phraseId},${detection.phraseVersion},${detection.phrase},
              'captions',${detection.startMs},${detection.endMs}) ON CONFLICT DO NOTHING`
        await tx`UPDATE private.clip_submissions SET state=${detections.length ? 'completed' : 'no_match'},
          failure_code=NULL,finished_at=now(),processing_lease_until=NULL,retry_after=NULL,
          manual_retry_token=NULL,manual_retry_consent_revision=NULL,manual_retry_requested_at=NULL
          WHERE id=${submissionId}`
        return {
          state: detections.length ? ('completed' as const) : ('no_match' as const),
          matches: detections.length
        }
      }),
    fallbackManualRetryToOpenAi: (
      owner: string,
      channel: string,
      submissionId: string,
      retryToken: string
    ) =>
      processingAuthorized(owner, async (tx) => {
        const rows =
          await tx`SELECT s.capture_mode,s.state,s.manual_retry_token,s.manual_retry_consent_revision,
            s.processing_lease_until
          FROM private.clip_submissions s JOIN public.channels c ON c.id=s.channel_id
          WHERE s.id=${submissionId} AND s.channel_id=${channel} AND c.owner_id=${owner} FOR UPDATE OF s`
        const row = rows[0]
        if (!row) throw new FoundationError(404)
        if (
          row.state !== 'processing' ||
          row.manual_retry_token !== retryToken ||
          !row.processing_lease_until ||
          Date.parse(row.processing_lease_until.toISOString()) <= Date.now()
        )
          throw new FoundationError(409)
        const access = await readAccess(tx, owner, channel)
        const captureMode = row.capture_mode as 'manual' | 'scheduled'
        if (
          !hasProcessingAccess(access, captureMode) ||
          accessRevision(access!, captureMode) !== row.manual_retry_consent_revision
        ) {
          await cancel(tx, submissionId)
          return { state: 'cancelled_consent' as const }
        }
        await tx`UPDATE private.clip_submissions SET state='pending_captions',failure_code=NULL,
          finished_at=NULL,processing_lease_until=NULL,retry_after=NULL,manual_retry_requested_at=now(),
          manual_retry_token=NULL,manual_retry_consent_revision=NULL WHERE id=${submissionId}`
        return { state: 'pending_captions' as const }
      }),
    stillAuthorized: (job: ClipProcessingJob) =>
      authorized(job.ownerId, async (tx) => {
        const state = await tx`SELECT state FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId}`
        const access = await readAccess(tx, job.ownerId, job.channelId)
        return (
          state[0]?.state === 'processing' &&
          hasProcessingAccess(access, job.captureMode) &&
          accessRevision(access, job.captureMode) === job.consentRevision
        )
      }),
    noProvider: (job: ClipProcessingJob) =>
      authorized(job.ownerId, async (tx) => {
        const access = await readAccess(tx, job.ownerId, job.channelId)
        const state = await tx`SELECT state FROM private.clip_submissions
          WHERE id=${job.id} AND channel_id=${job.channelId} FOR UPDATE`
        if (
          state[0]?.state !== 'processing' ||
          !hasProcessingAccess(access, job.captureMode) ||
          accessRevision(access, job.captureMode) !== job.consentRevision
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
          !hasProcessingAccess(access, job.captureMode) ||
          accessRevision(access, job.captureMode) !== job.consentRevision
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
              failure_code=NULL,processing_lease_until=NULL,retry_after=NULL,manual_retry_requested_at=NULL,
              manual_retry_token=NULL,manual_retry_consent_revision=NULL
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
          !hasProcessingAccess(access, job.captureMode) ||
          accessRevision(access, job.captureMode) !== job.consentRevision
        ) {
          await cancel(tx, job.id)
          return 'cancelled_consent' as const
        }
        if (code === 'clip_unavailable') {
          await tx`UPDATE private.clip_submissions SET state='source_unavailable',failure_code=${code},
            finished_at=now(),processing_lease_until=NULL,retry_after=NULL,manual_retry_token=NULL,
            manual_retry_consent_revision=NULL WHERE id=${job.id}`
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
