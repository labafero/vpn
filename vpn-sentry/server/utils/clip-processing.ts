import type { Credential } from './private-database'

export type ClipProcessingJob = {
  id: string
  ownerId: string
  channelId: string
  clipId: string
  canonicalUrl: string
  broadcasterId: string
  durationSeconds: number
  videoId: string | null
  vodOffset: number | null
  consentRevision: string
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
    readonly retryable = true
  ) {
    super('O processamento do clip falhou.')
    this.name = 'ClipProcessingFailure'
  }
}

export function createClipProcessingService(deps: {
  repository: ClipProcessingRepository
  download: (job: ClipProcessingJob) => Promise<TemporaryClip>
  getOpenAiKey: (ownerId: string) => Promise<string | null>
  transcribe: (input: {
    path: string
    clipId: string
    apiKey: string
  }) => Promise<ClipTranscriptSegment[]>
  detect: (segments: ClipTranscriptSegment[]) => Omit<ClipDetection, 'source'>[]
  maxAttempts?: number
}) {
  const maxAttempts = deps.maxAttempts ?? 3

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
        const apiKey = await deps.getOpenAiKey(job.ownerId)
        if (!apiKey) {
          await deps.repository.noProvider(job)
          return { state: 'needs_openai_key' }
        }
        media = await deps.download(job)
        if (!(await deps.repository.stillAuthorized(job))) {
          await deps.repository.cancel(job)
          return { state: 'cancelled_consent' }
        }
        const segments = await deps.transcribe({ path: media.path, clipId: job.clipId, apiKey })
        const detections = deps.detect(segments).map((detection) => ({
          ...detection,
          source: 'openai' as const
        }))
        if (!(await deps.repository.finish(job, detections))) return { state: 'cancelled_consent' }
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
