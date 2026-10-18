import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { promisify } from 'node:util'
import { CORPUS_ROOT, MAX_CLIP_BYTES, SUPPORTED_MEDIA_EXTENSIONS, loadCorpus } from './corpus.mjs'
import { transcribeHosted } from './providers/hosted.mjs'
import { transcribeLocalWhisper } from './providers/local-whisper.mjs'

const execFileAsync = promisify(execFile)
const scriptDirectory = path.dirname(new URL(import.meta.url).pathname)
const projectRoot = path.resolve(scriptDirectory, '../..')
const DEFAULT_TEMP_ROOT = path.join(projectRoot, '.superpowers/runtime/phase-2-spike/normalized')
const DEFAULT_RESULT_ROOT = path.join(projectRoot, '.superpowers/runtime/phase-2-spike/results')

export class AudioPreparationError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'AudioPreparationError'
    this.code = code
  }
}

function isTimeout(error) {
  return (
    error?.code === 'ETIMEDOUT' ||
    error?.name === 'AbortError' ||
    error?.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER'
  )
}

export async function prepareAudio(
  clip,
  {
    ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg',
    tempRoot = DEFAULT_TEMP_ROOT,
    runProcess = execFileAsync,
    timeoutMs = 120_000
  } = {}
) {
  if (!clip || typeof clip.path !== 'string') {
    throw new AudioPreparationError(
      'AUDIO_MISSING',
      'O arquivo de áudio do clip não está disponível.'
    )
  }

  const extension = path.extname(clip.path).toLowerCase()
  if (!SUPPORTED_MEDIA_EXTENSIONS.has(extension)) {
    throw new AudioPreparationError(
      'AUDIO_UNSUPPORTED_FORMAT',
      'O formato do clip não é compatível.'
    )
  }

  let sourceStats
  try {
    sourceStats = await stat(clip.path)
  } catch {
    throw new AudioPreparationError(
      'AUDIO_MISSING',
      'O arquivo de áudio do clip não está disponível.'
    )
  }
  if (!sourceStats.isFile()) {
    throw new AudioPreparationError(
      'AUDIO_MISSING',
      'O arquivo de áudio do clip não está disponível.'
    )
  }
  if (sourceStats.size === 0) {
    throw new AudioPreparationError('AUDIO_EMPTY', 'O clip está vazio.')
  }
  if (sourceStats.size > MAX_CLIP_BYTES) {
    throw new AudioPreparationError('AUDIO_TOO_LARGE', 'O clip excede o limite local de tamanho.')
  }

  await mkdir(tempRoot, { recursive: true })
  const temporaryDirectory = await mkdtemp(path.join(tempRoot, 'audio-'))
  const outputPath = path.join(temporaryDirectory, 'audio.wav')

  try {
    await runProcess(
      ffmpegPath,
      [
        '-nostdin',
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-i',
        clip.path,
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-c:a',
        'pcm_s16le',
        outputPath
      ],
      { timeout: timeoutMs, maxBuffer: 1024 * 1024 }
    )
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    if (isTimeout(error)) {
      throw new AudioPreparationError(
        'AUDIO_TIMEOUT',
        'A conversão do clip excedeu o tempo limite.'
      )
    }
    throw new AudioPreparationError('AUDIO_INVALID', 'Não foi possível ler o áudio do clip.')
  }

  try {
    const outputStats = await stat(outputPath)
    if (!outputStats.isFile() || outputStats.size <= 44) {
      throw new Error('invalid output')
    }
  } catch {
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw new AudioPreparationError('AUDIO_INVALID', 'Não foi possível ler o áudio do clip.')
  }

  return {
    path: outputPath,
    cleanup: () => rm(temporaryDirectory, { recursive: true, force: true })
  }
}

export async function transcribe(clip, { provider, ...options } = {}) {
  const prepared = await prepareAudio(clip, options.audio)
  try {
    const normalizedClip = { ...clip, path: prepared.path }
    if (provider === 'local') {
      return await transcribeLocalWhisper(normalizedClip, options.local)
    }
    if (provider === 'hosted') {
      return await transcribeHosted(normalizedClip, options.hosted)
    }
    throw new AudioPreparationError(
      'PROVIDER_UNSUPPORTED',
      'O provedor de transcrição não é compatível.'
    )
  } finally {
    await prepared.cleanup()
  }
}

function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--manifest') options.manifestPath = argv[++index]
    else if (argv[index] === '--provider') options.provider = argv[++index]
  }
  if (!options.manifestPath || !['local', 'hosted'].includes(options.provider)) {
    throw new AudioPreparationError(
      'CLI_USAGE',
      'Uso: node scripts/phase-2-spike/transcribe.mjs --manifest <path> --provider <local|hosted>'
    )
  }
  return options
}

export async function runTranscriptionCli(argv = process.argv.slice(2)) {
  const { manifestPath, provider } = parseArguments(argv)
  const clips = await loadCorpus(manifestPath)
  await mkdir(DEFAULT_RESULT_ROOT, { recursive: true })
  const summaries = []

  for (const clip of clips) {
    const result = await transcribe(clip, { provider })
    const opaqueName = createHash('sha256').update(clip.id).digest('hex').slice(0, 24)
    const resultPath = path.join(DEFAULT_RESULT_ROOT, `${opaqueName}.json`)
    await writeFile(resultPath, JSON.stringify(result, null, 2), { mode: 0o600 })
    summaries.push({
      clipId: opaqueName,
      provider: result.provider,
      model: result.model,
      elapsedMs: result.elapsedMs,
      segmentCount: result.segments.length,
      resultPath
    })
  }

  return summaries
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
) {
  runTranscriptionCli()
    .then((summaries) => process.stdout.write(`${JSON.stringify(summaries)}\n`))
    .catch((error) => {
      process.stderr.write(`${error?.message || 'Falha sanitizada na transcrição.'}\n`)
      process.exitCode = 1
    })
}
