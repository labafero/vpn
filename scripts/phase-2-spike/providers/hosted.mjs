import { readFile } from 'node:fs/promises'

export class HostedTranscriptionError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'HostedTranscriptionError'
    this.code = code
  }
}

function isTimeout(error) {
  return (
    error?.name === 'AbortError' ||
    error?.code === 'ETIMEDOUT' ||
    error?.code === 'UND_ERR_CONNECT_TIMEOUT'
  )
}

function confidence(value) {
  return Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined
}

function timedSegment(segment) {
  if (
    typeof segment.transcript !== 'string' ||
    !segment.transcript.trim() ||
    !Number.isFinite(segment.start) ||
    !Number.isFinite(segment.end) ||
    segment.start < 0 ||
    segment.end < segment.start
  ) {
    return null
  }
  return {
    startMs: Math.round(segment.start * 1000),
    endMs: Math.round(segment.end * 1000),
    text: segment.transcript.trim(),
    ...(confidence(segment.confidence) !== undefined
      ? { confidence: confidence(segment.confidence) }
      : {})
  }
}

function normalizeResponse(payload, clipId) {
  const utterances = payload?.results?.utterances
  if (Array.isArray(utterances) && utterances.length > 0) {
    const segments = utterances.map(timedSegment)
    if (segments.some((segment) => segment === null)) {
      throw new HostedTranscriptionError(
        'HOSTED_BAD_RESPONSE',
        'A resposta do provedor de transcrição é inválida.'
      )
    }
    return { clipId, segments }
  }

  const alternative = payload?.results?.channels?.[0]?.alternatives?.[0]
  if (typeof alternative?.transcript !== 'string') {
    throw new HostedTranscriptionError(
      'HOSTED_BAD_RESPONSE',
      'A resposta do provedor de transcrição é inválida.'
    )
  }

  if (Array.isArray(alternative.words) && alternative.words.length > 0) {
    const segments = alternative.words.map((word) => {
      const segment = timedSegment({
        transcript: word.word,
        start: word.start,
        end: word.end,
        confidence: word.confidence
      })
      if (!segment) {
        throw new HostedTranscriptionError(
          'HOSTED_BAD_RESPONSE',
          'A resposta do provedor de transcrição é inválida.'
        )
      }
      return segment
    })
    return { clipId, segments }
  }

  if (!alternative.transcript.trim()) return { clipId, segments: [] }

  return {
    clipId,
    segments: [
      {
        text: alternative.transcript.trim(),
        ...(confidence(alternative.confidence) !== undefined
          ? { confidence: confidence(alternative.confidence) }
          : {})
      }
    ]
  }
}

export async function transcribeHosted(
  clip,
  {
    apiKey = process.env.DEEPGRAM_API_KEY,
    request = fetch,
    timeoutMs = 120_000,
    now = () => performance.now()
  } = {}
) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) {
    throw new HostedTranscriptionError(
      'HOSTED_CREDENTIAL_MISSING',
      'Configure DEEPGRAM_API_KEY para usar o provedor hospedado.'
    )
  }

  const audio = await readFile(clip.path).catch(() => {
    throw new HostedTranscriptionError(
      'AUDIO_MISSING',
      'O áudio temporário do clip não está disponível.'
    )
  })
  const url = new URL('https://api.deepgram.com/v1/listen')
  url.searchParams.set('model', 'nova-3')
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('utterances', 'true')
  url.searchParams.set('mip_opt_out', 'true')
  url.searchParams.set('punctuate', 'true')

  const startedAt = now()
  let response
  try {
    response = await request(url, {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'audio/wav'
      },
      body: audio,
      signal: AbortSignal.timeout(timeoutMs)
    })
  } catch (error) {
    if (isTimeout(error)) {
      throw new HostedTranscriptionError(
        'PROVIDER_TIMEOUT',
        'A transcrição hospedada excedeu o tempo limite.'
      )
    }
    throw new HostedTranscriptionError(
      'HOSTED_REQUEST_FAILED',
      'Não foi possível acessar o provedor de transcrição.'
    )
  }

  if (!response?.ok) {
    throw new HostedTranscriptionError(
      'HOSTED_REQUEST_FAILED',
      'O provedor de transcrição recusou a solicitação.'
    )
  }

  let payload
  try {
    payload = await response.json()
  } catch {
    throw new HostedTranscriptionError(
      'HOSTED_BAD_RESPONSE',
      'A resposta do provedor de transcrição é inválida.'
    )
  }

  const normalized = normalizeResponse(payload, clip.id)
  return {
    ...normalized,
    provider: 'deepgram',
    model: 'nova-3',
    elapsedMs: Math.max(0, now() - startedAt)
  }
}
