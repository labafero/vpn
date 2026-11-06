import { FoundationError } from './api-error'
import type { ClipProcessingRepository } from './clip-processing'
import { logClipStage, type ClipStageEvent } from './clip-logging'

const uuid = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i

function strictBody(body: unknown, keys: string[]) {
  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    Object.keys(body).some((key) => !keys.includes(key))
  )
    throw new FoundationError(400)
  return body as Record<string, unknown>
}

export function createClipManualRetryService(
  repository: Pick<
    ClipProcessingRepository,
    'beginManualRetry' | 'completeManualRetryWithCaptions' | 'fallbackManualRetryToOpenAi'
  >,
  logEvent: (event: ClipStageEvent) => void = logClipStage
) {
  function requireIds(channel: string, submissionId: string) {
    if (!uuid.test(channel) || !uuid.test(submissionId)) throw new FoundationError(400)
  }

  function requireRetryToken(value: unknown): string {
    if (typeof value !== 'string' || !uuid.test(value)) throw new FoundationError(400)
    return value
  }

  return {
    async begin(owner: string, channel: string, submissionId: string) {
      requireIds(channel, submissionId)
      const result = await repository.beginManualRetry(owner, channel, submissionId)
      logEvent({
        event: 'clip.stage',
        stage: result.mode === 'captions' ? 'twitch_captions' : 'manual_retry',
        outcome:
          result.mode === 'none' ? 'failed' : result.mode === 'captions' ? 'started' : 'selected',
        submissionId,
        failureCode: result.mode === 'none' ? 'needs_trigger_phrases' : undefined
      })
      return result
    },

    async completeCaptions(owner: string, channel: string, submissionId: string, body: unknown) {
      requireIds(channel, submissionId)
      const input = strictBody(body, ['retryToken', 'segments'])
      const retryToken = requireRetryToken(input.retryToken)
      if (
        !Array.isArray(input.segments) ||
        input.segments.length < 1 ||
        input.segments.length > 300
      )
        throw new FoundationError(400)
      let totalTextLength = 0
      const segments = input.segments.map((segment) => {
        if (
          !segment ||
          typeof segment !== 'object' ||
          Array.isArray(segment) ||
          Object.keys(segment).some((key) => !['startMs', 'endMs', 'text'].includes(key))
        )
          throw new FoundationError(400)
        const value = segment as Record<string, unknown>
        if (
          !Number.isInteger(value.startMs) ||
          !Number.isInteger(value.endMs) ||
          (value.startMs as number) < 0 ||
          (value.endMs as number) < (value.startMs as number) ||
          (value.endMs as number) > 180_000 ||
          typeof value.text !== 'string' ||
          value.text.trim().length < 1 ||
          value.text.length > 1000
        )
          throw new FoundationError(400)
        totalTextLength += value.text.length
        if (totalTextLength > 30_000) throw new FoundationError(400)
        return {
          startMs: value.startMs as number,
          endMs: value.endMs as number,
          text: value.text
        }
      })
      const result = await repository.completeManualRetryWithCaptions(
        owner,
        channel,
        submissionId,
        retryToken,
        segments
      )
      logEvent({
        event: 'clip.stage',
        stage: 'twitch_captions',
        outcome: result.state === 'cancelled_consent' ? 'failed' : 'succeeded',
        submissionId,
        matches: result.matches,
        failureCode: result.state === 'cancelled_consent' ? 'cancelled_consent' : undefined
      })
      return result
    },

    async fallbackToOpenAi(owner: string, channel: string, submissionId: string, body: unknown) {
      requireIds(channel, submissionId)
      const input = strictBody(body, ['retryToken'])
      const retryToken = requireRetryToken(input.retryToken)
      const result = await repository.fallbackManualRetryToOpenAi(
        owner,
        channel,
        submissionId,
        retryToken
      )
      logEvent({
        event: 'clip.stage',
        stage: 'twitch_captions',
        outcome: 'failed',
        submissionId,
        failureCode:
          result.state === 'cancelled_consent' ? 'cancelled_consent' : 'captions_unavailable'
      })
      return { ...result, matches: 0 }
    }
  }
}
