import type { Credential } from './private-database'
import type { ClipPhraseSnapshot } from './clip-detection'
import type { OpenAiCredential } from './openai-key-selection'
import { logClipStage, type ClipStageEvent } from './clip-logging'

export type ClipProcessingJob = {
  id: string
  attempt?: number
  ownerId: string
  channelId: string
  clipId: string
  canonicalUrl: string
  broadcasterId: string
  durationSeconds: number
  videoId: string | null
  vodOffset: number | null
  consentRevision: string
  captureMode: 'manual' | 'scheduled'
  phrases: ClipPhraseSnapshot
  credential: Credential
}

export type ClipTranscriptSegment = {
  startMs: number
  endMs: number
  text: string
}

export type ClipDetection = {
  phraseId: string
  phraseVersion: number
  phrase: string
  source: 'captions' | 'openai'
  startMs: number
  endMs: number
}

export type TemporaryClip = { path: string; cleanup: () => Promise<void> }

export type ClipProcessingRepository = {
  claimNext: () => Promise<ClipProcessingJob | null>
  beginManualRetry: (
    owner: string,
    channel: string,
    submissionId: string
  ) => Promise<{
    state: 'processing' | 'pending_captions' | 'needs_trigger_phrases'
    mode: 'captions' | 'openai' | 'none'
    retryToken: string | null
    videoId: string | null
    vodOffset: number | null
    durationSeconds: number | null
  }>
  completeManualRetryWithCaptions: (
    owner: string,
    channel: string,
    submissionId: string,
    retryToken: string,
    segments: ClipTranscriptSegment[]
  ) => Promise<{
    state: 'completed' | 'no_match' | 'needs_trigger_phrases' | 'cancelled_consent'
    matches: number
  }>
  fallbackManualRetryToOpenAi: (
    owner: string,
    channel: string,
    submissionId: string,
    retryToken: string
  ) => Promise<{ state: 'pending_captions' | 'cancelled_consent' }>
  stillAuthorized: (job: ClipProcessingJob) => Promise<boolean>
  cancel: (job: ClipProcessingJob) => Promise<void>
  finish: (job: ClipProcessingJob, detections: ClipDetection[]) => Promise<boolean>
  noProvider: (job: ClipProcessingJob) => Promise<void>
  fail: (
    job: ClipProcessingJob,
    code: string,
    retryable: boolean,
    maxAttempts: number
  ) => Promise<'failed_retryable' | 'failed_terminal' | 'source_unavailable' | 'cancelled_consent'>
}

export class ClipProcessingFailure extends Error {
  constructor(
    readonly code: string,
    readonly retryable = true,
    readonly diagnostics: Pick<
      ClipStageEvent,
      | 'httpStatus'
      | 'providerCode'
      | 'providerType'
      | 'providerRequestId'
      | 'diagnosticCode'
      | 'mediaVariant'
    > = {}
  ) {
    super('O processamento do clip falhou.')
    this.name = 'ClipProcessingFailure'
  }
}

export function createClipProcessingService(deps: {
  repository: ClipProcessingRepository
  download: (job: ClipProcessingJob) => Promise<TemporaryClip>
  getOpenAiKey: (ownerId: string) => Promise<OpenAiCredential | null>
  transcribe: (input: {
    path: string
    submissionId: string
    clipId: string
    apiKey: string
  }) => Promise<ClipTranscriptSegment[]>
  detect: (
    segments: ClipTranscriptSegment[],
    phrases: ClipPhraseSnapshot
  ) => Omit<ClipDetection, 'source'>[]
  maxAttempts?: number
  logEvent?: (event: ClipStageEvent) => void
}) {
  const maxAttempts = deps.maxAttempts ?? 3
  const logEvent = deps.logEvent ?? logClipStage

  return {
    async processNext(): Promise<
      | { state: 'idle' }
      | { state: 'cancelled_consent' }
      | { state: 'source_unavailable' }
      | { state: 'needs_openai_key' }
      | { state: 'completed' | 'no_match'; matches: number }
      | { state: 'failed_retryable' | 'failed_terminal' }
    > {
      const job = await deps.repository.claimNext()
      if (!job) return { state: 'idle' }

      if (!(await deps.repository.stillAuthorized(job))) {
        await deps.repository.cancel(job)
        return { state: 'cancelled_consent' }
      }

      let media: TemporaryClip | undefined
      try {
        const credential = await deps.getOpenAiKey(job.ownerId)
        if (!credential) {
          logEvent({
            event: 'clip.stage',
            stage: 'openai_key',
            outcome: 'failed',
            submissionId: job.id,
            clipId: job.clipId,
            failureCode: 'needs_openai_key'
          })
          await deps.repository.noProvider(job)
          return { state: 'needs_openai_key' }
        }
        logEvent({
          event: 'clip.stage',
          stage: 'openai_key',
          outcome: 'selected',
          submissionId: job.id,
          clipId: job.clipId,
          keySource: credential.source
        })
        const downloadStartedAt = Date.now()
        logEvent({
          event: 'clip.stage',
          stage: 'twitch_media',
          outcome: 'started',
          submissionId: job.id,
          clipId: job.clipId,
          attempt: job.attempt
        })
        try {
          media = await deps.download(job)
        } catch (error) {
          const failure =
            error instanceof ClipProcessingFailure
              ? error
              : new ClipProcessingFailure('provider_error', true)
          logEvent({
            event: 'clip.stage',
            stage: 'twitch_media',
            outcome: 'failed',
            submissionId: job.id,
            clipId: job.clipId,
            attempt: job.attempt,
            failureCode: failure.code,
            ...failure.diagnostics,
            durationMs: Date.now() - downloadStartedAt
          })
          throw failure
        }
        logEvent({
          event: 'clip.stage',
          stage: 'twitch_media',
          outcome: 'succeeded',
          submissionId: job.id,
          clipId: job.clipId,
          attempt: job.attempt,
          durationMs: Date.now() - downloadStartedAt
        })
        if (!(await deps.repository.stillAuthorized(job))) {
          await deps.repository.cancel(job)
          return { state: 'cancelled_consent' }
        }
        const segments = await deps.transcribe({
          path: media.path,
          submissionId: job.id,
          clipId: job.clipId,
          apiKey: credential.apiKey
        })
        const detections = deps.detect(segments, job.phrases).map((detection) => ({
          ...detection,
          source: 'openai' as const
        }))
        if (!(await deps.repository.finish(job, detections))) {
          logEvent({
            event: 'clip.stage',
            stage: 'detection_persistence',
            outcome: 'failed',
            submissionId: job.id,
            clipId: job.clipId,
            failureCode: 'cancelled_consent'
          })
          return { state: 'cancelled_consent' }
        }
        logEvent({
          event: 'clip.stage',
          stage: 'detection_persistence',
          outcome: 'succeeded',
          submissionId: job.id,
          clipId: job.clipId,
          matches: detections.length
        })
        return { state: detections.length ? 'completed' : 'no_match', matches: detections.length }
      } catch (error) {
        const failure =
          error instanceof ClipProcessingFailure
            ? error
            : new ClipProcessingFailure('provider_error', true)
        const state = await deps.repository.fail(job, failure.code, failure.retryable, maxAttempts)
        return { state }
      } finally {
        if (media) await media.cleanup().catch(() => {})
      }
    }
  }
}
