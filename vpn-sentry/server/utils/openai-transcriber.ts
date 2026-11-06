import { ClipProcessingFailure, type ClipTranscriptSegment } from './clip-processing'
import { logClipStage, type ClipStageEvent } from './clip-logging'

export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024

function providerError(response: Response) {
  const code = (value: unknown) =>
    typeof value === 'string' && /^[a-z0-9_]{1,80}$/i.test(value) ? value : undefined
  const requestId = response.headers.get('x-request-id')
  return response
    .json()
    .catch(() => null)
    .then((payload: unknown) => {
      const error = (payload as { error?: { code?: unknown; type?: unknown } } | null)?.error
      return {
        providerCode: code(error?.code),
        providerType: code(error?.type),
        providerRequestId: requestId && /^[\w.-]{1,128}$/.test(requestId) ? requestId : undefined
      }
    })
}

const exhaustedQuotaCodes = new Set([
  'credit_balance_exhausted',
  'insufficient_quota',
  'organization_usage_limit_exceeded',
  'organization_spend_limit_exceeded',
  'project_spend_limit_exceeded'
])

export function createOpenAiTranscriber(
  fetcher: typeof fetch = fetch,
  logEvent: (event: ClipStageEvent) => void = logClipStage
) {
  return async (
    audio: Uint8Array,
    apiKey: string,
    context: { submissionId?: string; clipId?: string } = {}
  ): Promise<ClipTranscriptSegment[]> => {
    if (!apiKey) throw new ClipProcessingFailure('provider_error', false)
    if (!audio.byteLength || audio.byteLength > MAX_TRANSCRIPTION_BYTES)
      throw new ClipProcessingFailure('invalid_media', false)

    const audioCopy = Uint8Array.from(audio)
    const form = new FormData()
    form.append(
      'file',
      new Blob([audioCopy.buffer as ArrayBuffer], { type: 'video/mp4' }),
      'clip.mp4'
    )
    form.append('model', 'gpt-transcribe')
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'segment')
    form.append('languages[]', 'pt')

    const startedAt = Date.now()
    logEvent({
      event: 'clip.stage',
      stage: 'openai_transcription',
      outcome: 'started',
      ...context
    })
    let response: Response
    try {
      response = await fetcher('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(200_000)
      })
    } catch {
      logEvent({
        event: 'clip.stage',
        stage: 'openai_transcription',
        outcome: 'failed',
        ...context,
        failureCode: 'transcription_failed',
        durationMs: Date.now() - startedAt
      })
      throw new ClipProcessingFailure('transcription_failed', true)
    }
    if (!response.ok) {
      const details = { httpStatus: response.status, ...(await providerError(response)) }
      const quotaFailure =
        details.providerType === 'insufficient_quota' ||
        exhaustedQuotaCodes.has(details.providerCode || '')
      const rateLimited =
        response.status === 429 &&
        (details.providerType === 'rate_limit_error' ||
          details.providerCode === 'rate_limit_exceeded')
      const failureCode = quotaFailure
        ? 'quota_exceeded'
        : rateLimited
          ? 'provider_error'
          : 'transcription_failed'
      const retryable = quotaFailure ? false : rateLimited || response.status >= 500
      logEvent({
        event: 'clip.stage',
        stage: 'openai_transcription',
        outcome: 'failed',
        ...context,
        ...details,
        failureCode,
        durationMs: Date.now() - startedAt
      })
      throw new ClipProcessingFailure(failureCode, retryable, details)
    }

    let payload: { segments?: unknown }
    try {
      payload = (await response.json()) as { segments?: unknown }
    } catch {
      logEvent({
        event: 'clip.stage',
        stage: 'openai_transcription',
        outcome: 'failed',
        ...context,
        httpStatus: response.status,
        failureCode: 'transcription_failed',
        durationMs: Date.now() - startedAt
      })
      throw new ClipProcessingFailure('transcription_failed', true)
    }
    if (!Array.isArray(payload.segments)) {
      logEvent({
        event: 'clip.stage',
        stage: 'openai_transcription',
        outcome: 'failed',
        ...context,
        httpStatus: response.status,
        failureCode: 'transcription_failed',
        durationMs: Date.now() - startedAt
      })
      throw new ClipProcessingFailure('transcription_failed', true)
    }

    const segments = payload.segments.map((segment) => {
      if (
        typeof segment !== 'object' ||
        segment === null ||
        typeof (segment as { start?: unknown }).start !== 'number' ||
        typeof (segment as { end?: unknown }).end !== 'number' ||
        typeof (segment as { text?: unknown }).text !== 'string'
      )
        throw new ClipProcessingFailure('transcription_failed', true)
      return {
        startMs: Math.round((segment as { start: number }).start * 1000),
        endMs: Math.round((segment as { end: number }).end * 1000),
        text: (segment as { text: string }).text
      }
    })
    logEvent({
      event: 'clip.stage',
      stage: 'openai_transcription',
      outcome: 'succeeded',
      ...context,
      httpStatus: response.status,
      durationMs: Date.now() - startedAt
    })
    return segments
  }
}
