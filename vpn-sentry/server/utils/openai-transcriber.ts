import { ClipProcessingFailure, type ClipTranscriptSegment } from './clip-processing'

export const MAX_TRANSCRIPTION_BYTES = 25 * 1024 * 1024

export function createOpenAiTranscriber(fetcher: typeof fetch = fetch) {
  return async (audio: Uint8Array, apiKey: string): Promise<ClipTranscriptSegment[]> => {
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

    let response: Response
    try {
      response = await fetcher('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(200_000)
      })
    } catch {
      throw new ClipProcessingFailure('transcription_failed', true)
    }
    if (!response.ok)
      throw new ClipProcessingFailure('transcription_failed', response.status >= 500)

    let payload: { segments?: unknown }
    try {
      payload = (await response.json()) as { segments?: unknown }
    } catch {
      throw new ClipProcessingFailure('transcription_failed', true)
    }
    if (!Array.isArray(payload.segments))
      throw new ClipProcessingFailure('transcription_failed', true)

    return payload.segments.map((segment) => {
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
  }
}
