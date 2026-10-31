import { expect, test, vi } from 'vitest'
import { createOpenAiTranscriber } from '../server/utils/openai-transcriber'

test('uses the current OpenAI transcription model and normalizes timed segments', async () => {
  const fetcher = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    const form = init?.body as FormData
    expect(init?.headers).toEqual({ Authorization: 'Bearer sk-user-key' })
    expect(form.get('model')).toBe('gpt-transcribe')
    expect(form.get('response_format')).toBe('verbose_json')
    expect(form.get('timestamp_granularities[]')).toBe('segment')
    expect(form.get('languages[]')).toBe('pt')
    expect(form.get('file')).toBeInstanceOf(Blob)
    return Response.json({
      segments: [
        { start: 0.25, end: 1.2, text: 'Você é um inútil.' },
        { start: 1.2, end: 2.4, text: 'cala a boca' }
      ]
    })
  })
  const transcribe = createOpenAiTranscriber(fetcher as typeof fetch)
  await expect(transcribe(new Uint8Array([1, 2, 3]), 'sk-user-key')).resolves.toEqual([
    { startMs: 250, endMs: 1200, text: 'Você é um inútil.' },
    { startMs: 1200, endMs: 2400, text: 'cala a boca' }
  ])
})

test('does not call OpenAI when the user has no key', async () => {
  const fetcher = vi.fn()
  const transcribe = createOpenAiTranscriber(fetcher as typeof fetch)
  await expect(transcribe(new Uint8Array([1]), '')).rejects.toMatchObject({
    code: 'provider_error'
  })
  expect(fetcher).not.toHaveBeenCalled()
})
