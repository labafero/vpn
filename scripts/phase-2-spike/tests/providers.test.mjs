import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import { CORPUS_ROOT } from '../corpus.mjs'
import { transcribeHosted } from '../providers/hosted.mjs'
import { transcribeLocalWhisper } from '../providers/local-whisper.mjs'
import { prepareAudio } from '../transcribe.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
  vi.restoreAllMocks()
})

async function createTemporaryDirectory() {
  await mkdir(CORPUS_ROOT, { recursive: true })
  const directory = await mkdtemp(path.join(CORPUS_ROOT, 'provider-test-'))
  temporaryDirectories.push(directory)
  return directory
}

async function createClip(directory, { extension = 'wav', contents = 'source bytes' } = {}) {
  const clipPath = path.join(directory, `source.${extension}`)
  await writeFile(clipPath, contents)
  return { id: 'synthetic-test-01', path: clipPath }
}

function successfulResponse(payload) {
  return {
    ok: true,
    status: 200,
    json: async () => payload
  }
}

test('normalizes a supported clip to temporary mono 16 kHz PCM wav', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory, { extension: 'mp4' })
  const runProcess = vi.fn(async (_executable, args) => {
    await writeFile(args.at(-1), Buffer.alloc(64))
    return { stdout: '', stderr: '' }
  })

  const prepared = await prepareAudio(clip, { tempRoot: directory, runProcess })

  expect(runProcess).toHaveBeenCalledWith(
    'ffmpeg',
    expect.arrayContaining(['-i', clip.path, '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le']),
    expect.any(Object)
  )
  expect((await readFile(prepared.path)).byteLength).toBe(64)
  await prepared.cleanup()
  await expect(stat(prepared.path)).rejects.toMatchObject({ code: 'ENOENT' })
})

test('rejects empty clips before invoking ffmpeg', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory, { contents: '' })
  const runProcess = vi.fn()

  await expect(prepareAudio(clip, { tempRoot: directory, runProcess })).rejects.toMatchObject({
    code: 'AUDIO_EMPTY'
  })
  expect(runProcess).not.toHaveBeenCalled()
})

test('rejects unsupported formats before invoking ffmpeg', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory, { extension: 'exe' })
  const runProcess = vi.fn()

  await expect(prepareAudio(clip, { tempRoot: directory, runProcess })).rejects.toMatchObject({
    code: 'AUDIO_UNSUPPORTED_FORMAT'
  })
  expect(runProcess).not.toHaveBeenCalled()
})

test('maps a decoder failure to a sanitized corrupt-audio error', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory, { contents: 'not audio' })

  await expect(
    prepareAudio(clip, {
      tempRoot: directory,
      runProcess: async () => {
        throw new Error('provider body and secret must not escape')
      }
    })
  ).rejects.toMatchObject({
    code: 'AUDIO_INVALID',
    message: 'Não foi possível ler o áudio do clip.'
  })
})

test('rejects a hosted response without transcript data', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)

  await expect(
    transcribeHosted(clip, {
      apiKey: 'test-key',
      request: async () => successfulResponse({ results: { channels: [] } })
    })
  ).rejects.toMatchObject({ code: 'HOSTED_BAD_RESPONSE' })
})

test('preserves a transcript with unavailable timestamps without inventing timing', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const result = await transcribeHosted(clip, {
    apiKey: 'test-key',
    request: async () =>
      successfulResponse({
        results: {
          channels: [{ alternatives: [{ transcript: 'fala sem tempos', confidence: 0.7 }] }]
        }
      })
  })

  expect(result.clipId).toBe(clip.id)
  expect(result.segments).toEqual([{ text: 'fala sem tempos', confidence: 0.7 }])
})

test('returns no segments for an empty transcript', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const result = await transcribeHosted(clip, {
    apiKey: 'test-key',
    request: async () =>
      successfulResponse({
        results: {
          channels: [{ alternatives: [{ transcript: '   ' }] }]
        }
      })
  })

  expect(result.segments).toEqual([])
})

test('requires a hosted provider credential before making a request', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const request = vi.fn()

  await expect(transcribeHosted(clip, { apiKey: '', request })).rejects.toMatchObject({
    code: 'HOSTED_CREDENTIAL_MISSING'
  })
  expect(request).not.toHaveBeenCalled()
})

test('transcribes with Deepgram opt-out and preserves utterance timestamps and confidence', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const request = vi.fn(async (url, options) => {
    expect(String(url)).toContain('model=nova-3')
    expect(String(url)).toContain('language=pt-BR')
    expect(String(url)).toContain('mip_opt_out=true')
    expect(options.headers.Authorization).toBe('Token test-key')
    expect(options.headers['Content-Type']).toBe('audio/wav')
    expect(Buffer.isBuffer(options.body)).toBe(true)
    return successfulResponse({
      results: {
        utterances: [{ start: 1.25, end: 2.75, transcript: 'frase de teste', confidence: 0.91 }]
      }
    })
  })

  const result = await transcribeHosted(clip, { apiKey: 'test-key', request })

  expect(result).toMatchObject({ provider: 'deepgram', model: 'nova-3', clipId: clip.id })
  expect(result.segments).toEqual([
    { startMs: 1250, endMs: 2750, text: 'frase de teste', confidence: 0.91 }
  ])
})

test('does not include a hosted response body in sanitized provider errors', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const request = async () => ({ ok: false, status: 403, text: async () => 'secret response body' })

  await expect(transcribeHosted(clip, { apiKey: 'test-key', request })).rejects.toMatchObject({
    code: 'HOSTED_REQUEST_FAILED',
    message: 'O provedor de transcrição recusou a solicitação.'
  })
})

test('maps hosted timeouts to a sanitized timeout error', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const request = async () => {
    const error = new Error('timeout details must not escape')
    error.name = 'AbortError'
    throw error
  }

  await expect(transcribeHosted(clip, { apiKey: 'test-key', request })).rejects.toMatchObject({
    code: 'PROVIDER_TIMEOUT'
  })
})

test('requires a configured local Whisper binary and model', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const runCli = vi.fn()

  await expect(transcribeLocalWhisper(clip, { runCli })).rejects.toMatchObject({
    code: 'LOCAL_ASR_NOT_CONFIGURED'
  })
  expect(runCli).not.toHaveBeenCalled()
})

test('parses Whisper JSON segment timings and omits unavailable confidence', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const runCli = vi.fn(async (_executable, args) => {
    const outputBase = args[args.indexOf('-of') + 1]
    await writeFile(
      `${outputBase}.json`,
      JSON.stringify({
        transcription: [{ offsets: { from: 250, to: 1750 }, text: ' frase local ' }]
      })
    )
    return { stdout: '', stderr: '' }
  })

  const result = await transcribeLocalWhisper(clip, {
    executable: '/runtime/whisper-cli',
    modelPath: '/runtime/ggml-base.bin',
    tempRoot: directory,
    runCli
  })

  expect(result).toMatchObject({ provider: 'whisper.cpp', model: 'ggml-base.bin', clipId: clip.id })
  expect(result.segments).toEqual([{ startMs: 250, endMs: 1750, text: 'frase local' }])
  expect(runCli).toHaveBeenCalledWith(
    '/runtime/whisper-cli',
    expect.arrayContaining(['-l', 'pt', '-ojf', '-np', '-f', clip.path]),
    expect.any(Object)
  )
})

test('maps malformed local Whisper output to a sanitized response error', async () => {
  const directory = await createTemporaryDirectory()
  const clip = await createClip(directory)
  const runCli = async (_executable, args) => {
    await writeFile(`${args[args.indexOf('-of') + 1]}.json`, '{broken private output')
    return { stdout: 'private transcript', stderr: 'secret diagnostic' }
  }

  await expect(
    transcribeLocalWhisper(clip, {
      executable: '/runtime/whisper-cli',
      modelPath: '/runtime/ggml-base.bin',
      tempRoot: directory,
      runCli
    })
  ).rejects.toMatchObject({ code: 'PROVIDER_BAD_RESPONSE' })
})
