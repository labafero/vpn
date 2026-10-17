import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import { CORPUS_ROOT } from '../corpus.mjs'

const execFileAsync = promisify(execFile)
const TEMP_ROOT = path.join(CORPUS_ROOT, '..', 'results')

export class TranscriptionProviderError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'TranscriptionProviderError'
    this.code = code
  }
}

function parseWhisperResponse(payload, clipId) {
  if (!payload || !Array.isArray(payload.transcription)) {
    throw new TranscriptionProviderError(
      'PROVIDER_BAD_RESPONSE',
      'A resposta do transcritor local é inválida.'
    )
  }

  const segments = payload.transcription.map((segment) => {
    if (!segment || typeof segment.text !== 'string') {
      throw new TranscriptionProviderError(
        'PROVIDER_BAD_RESPONSE',
        'A resposta do transcritor local é inválida.'
      )
    }

    const startMs = Number.isFinite(segment.offsets?.from) ? segment.offsets.from : undefined
    const endMs = Number.isFinite(segment.offsets?.to) ? segment.offsets.to : undefined
    return {
      ...(startMs !== undefined ? { startMs } : {}),
      ...(endMs !== undefined ? { endMs } : {}),
      text: segment.text.trim()
    }
  })

  return { clipId, segments }
}

function isTimeout(error) {
  return error?.code === 'ETIMEDOUT' || error?.name === 'AbortError'
}

export async function transcribeLocalWhisper(
  clip,
  {
    executable = process.env.WHISPER_CLI_PATH,
    modelPath = process.env.WHISPER_MODEL_PATH,
    language = 'pt',
    tempRoot = TEMP_ROOT,
    runCli = execFileAsync,
    timeoutMs = 180_000,
    now = () => performance.now()
  } = {}
) {
  if (!executable || !modelPath) {
    throw new TranscriptionProviderError(
      'LOCAL_ASR_NOT_CONFIGURED',
      'Configure WHISPER_CLI_PATH e WHISPER_MODEL_PATH para usar o transcritor local.'
    )
  }

  let directory
  let outputPath
  const startedAt = now()

  try {
    await mkdirSafe(tempRoot)
    directory = await mkdtemp(path.join(tempRoot, 'whisper-'))
    const outputBase = path.join(directory, 'result')
    outputPath = `${outputBase}.json`
    await runCli(
      executable,
      ['-m', modelPath, '-f', clip.path, '-l', language, '-ojf', '-np', '-of', outputBase],
      { timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }
    )

    const outputStats = await stat(outputPath)
    if (!outputStats.isFile() || outputStats.size === 0) {
      throw new Error('missing output')
    }
    const payload = JSON.parse(await readFile(outputPath, 'utf8'))
    const parsed = parseWhisperResponse(payload, clip.id)
    return {
      ...parsed,
      provider: 'whisper.cpp',
      model: path.basename(modelPath),
      elapsedMs: Math.max(0, now() - startedAt)
    }
  } catch (error) {
    if (error instanceof TranscriptionProviderError) throw error
    if (isTimeout(error)) {
      throw new TranscriptionProviderError(
        'PROVIDER_TIMEOUT',
        'A transcrição local excedeu o tempo limite.'
      )
    }
    if (error instanceof SyntaxError || error?.message === 'missing output') {
      throw new TranscriptionProviderError(
        'PROVIDER_BAD_RESPONSE',
        'A resposta do transcritor local é inválida.'
      )
    }
    throw new TranscriptionProviderError('PROVIDER_FAILED', 'A transcrição local falhou.')
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true })
  }
}

async function mkdirSafe(directory) {
  const { mkdir } = await import('node:fs/promises')
  await mkdir(directory, { recursive: true })
}
