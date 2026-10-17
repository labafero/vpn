import { randomUUID, createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { loadCorpus } from './corpus.mjs'
import { detectPhrases } from './detector.mjs'
import { transcribe } from './transcribe.mjs'

const execFileAsync = promisify(execFile)
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '../..')
const phraseSetPath = path.join(scriptDirectory, 'phrases.v1.json')
const runtimeRoot = path.join(projectRoot, '.superpowers/runtime/phase-2-spike')
const DEEPGRAM_COST_USD_PER_MINUTE = 0.0052

function opaqueClipId(id) {
  return createHash('sha256').update(id).digest('hex').slice(0, 24)
}

function finiteRate(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null
}

export function calculateMetrics(clips, detections, phraseIds) {
  return phraseIds.map((phraseId) => {
    let truePositives = 0
    let falsePositives = 0
    let falseNegatives = 0
    for (const clip of clips) {
      const positive = clip.expectedPhrases.includes(phraseId)
      const negative = clip.expectedNegative.includes(phraseId)
      if (!positive && !negative) continue
      const predicted = detections.some(
        (detection) => detection.clipId === clip.id && detection.phraseId === phraseId
      )
      if (positive && predicted) truePositives += 1
      else if (positive) falseNegatives += 1
      else if (negative && predicted) falsePositives += 1
    }
    return {
      phraseId,
      truePositives,
      falsePositives,
      falseNegatives,
      precision: finiteRate(truePositives, truePositives + falsePositives),
      recall: finiteRate(truePositives, truePositives + falseNegatives)
    }
  })
}

function median(values) {
  if (!values.length) return null
  const ordered = [...values].sort((a, b) => a - b)
  const middle = Math.floor(ordered.length / 2)
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2
}

function percentile(values, rank) {
  if (!values.length) return null
  const ordered = [...values].sort((a, b) => a - b)
  return ordered[Math.max(0, Math.ceil(rank * ordered.length) - 1)]
}

async function probeDurationMs(filePath, ffprobePath = process.env.FFPROBE_PATH || 'ffprobe') {
  try {
    const { stdout } = await execFileAsync(
      ffprobePath,
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        filePath
      ],
      { timeout: 10_000, maxBuffer: 1024 * 1024 }
    )
    const seconds = Number(stdout.trim())
    return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null
  } catch {
    return null
  }
}

function publicCorpusHash(clips) {
  const metadata = clips.map(
    ({ id, source, consent, scenario, expectedPhrases, expectedNegative }) => ({
      id,
      source,
      consentStatus: consent.status,
      scenario,
      expectedPhrases,
      expectedNegative
    })
  )
  return createHash('sha256').update(JSON.stringify(metadata)).digest('hex')
}

export async function runBenchmark({
  manifestPath,
  provider,
  rounds = 3,
  outputRoot = path.join(runtimeRoot, 'runs'),
  transcribeClip = transcribe
} = {}) {
  if (
    typeof manifestPath !== 'string' ||
    !manifestPath ||
    !['local', 'hosted'].includes(provider)
  ) {
    throw new TypeError(
      'Uso: node scripts/phase-2-spike/run.mjs --manifest <path> --provider <local|hosted> [--rounds <n>]'
    )
  }
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > 10) {
    throw new TypeError('O número de rodadas deve estar entre 1 e 10.')
  }

  const clips = await loadCorpus(manifestPath)
  const phraseSet = JSON.parse(await readFile(phraseSetPath, 'utf8'))
  const runId = randomUUID()
  const runDirectory = path.join(outputRoot, runId)
  await mkdir(runDirectory, { recursive: true, mode: 0o700 })
  const latencies = []
  const benchmarkStartedAt = performance.now()
  const detections = []
  let totalSegments = 0
  let timedSegments = 0
  let confidentSegments = 0
  let failedCount = 0
  let durationMs = 0
  let clipsWithDuration = 0

  for (let round = 1; round <= rounds; round += 1) {
    for (const clip of clips) {
      const clipDuration = await probeDurationMs(clip.path)
      if (clipDuration !== null) {
        durationMs += clipDuration
        clipsWithDuration += 1
      }
      try {
        const result = await transcribeClip(clip, { provider })
        latencies.push(result.elapsedMs)
        const segments = result.segments || []
        totalSegments += segments.length
        timedSegments += segments.filter(
          (segment) => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs)
        ).length
        confidentSegments += segments.filter((segment) =>
          Number.isFinite(segment.confidence)
        ).length
        const timed = segments.filter(
          (segment) => Number.isFinite(segment.startMs) && Number.isFinite(segment.endMs)
        )
        const clipDetections = detectPhrases(timed, phraseSet, { clipId: clip.id })
        if (round === 1) detections.push(...clipDetections)
        const opaqueName = opaqueClipId(clip.id)
        await writeFile(
          path.join(runDirectory, `round-${round}-${opaqueName}.json`),
          JSON.stringify({
            clipId: opaqueName,
            provider: result.provider,
            model: result.model,
            elapsedMs: result.elapsedMs,
            segments,
            detections: clipDetections.map((detection) => ({ ...detection, clipId: opaqueName }))
          }),
          { mode: 0o600 }
        )
      } catch {
        failedCount += 1
      }
    }
  }

  const phraseIds = phraseSet.phrases.map(({ id }) => id)
  const metrics = calculateMetrics(clips, detections, phraseIds)
  const metadata = {
    runId,
    provider,
    model: provider === 'hosted' ? 'deepgram/nova-3' : 'whisper.cpp/base',
    phraseVersion: phraseSet.version,
    corpusSha256: publicCorpusHash(clips),
    rounds,
    clipCount: clips.length,
    attemptedTranscriptions: rounds * clips.length,
    failedTranscriptions: failedCount,
    failureRate: finiteRate(failedCount, rounds * clips.length),
    latencyMs: {
      median: median(latencies),
      min: latencies.length ? Math.min(...latencies) : null,
      max: latencies.length ? Math.max(...latencies) : null,
      p95: percentile(latencies, 0.95),
      samples: latencies.length
    },
    wallClockMs: Math.max(0, performance.now() - benchmarkStartedAt),
    timestampCoverage: finiteRate(timedSegments, totalSegments),
    confidenceCoverage: finiteRate(confidentSegments, totalSegments),
    totalAudioMinutes: clipsWithDuration === rounds * clips.length ? durationMs / 60_000 : null,
    estimatedCostUsd:
      provider === 'hosted' && clipsWithDuration === rounds * clips.length
        ? Number(((durationMs / 60_000) * DEEPGRAM_COST_USD_PER_MINUTE).toFixed(6))
        : null,
    estimatedCostUsdPerAudioMinute: provider === 'hosted' ? DEEPGRAM_COST_USD_PER_MINUTE : null,
    metrics,
    runDirectory
  }
  await writeFile(path.join(runDirectory, 'summary.json'), JSON.stringify(metadata, null, 2), {
    mode: 0o600
  })
  return metadata
}

function parseArguments(argv) {
  const options = {}
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--manifest') options.manifestPath = argv[++index]
    else if (argv[index] === '--provider') options.provider = argv[++index]
    else if (argv[index] === '--rounds') options.rounds = Number(argv[++index])
  }
  return options
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runBenchmark(parseArguments(process.argv.slice(2)))
    .then((summary) => process.stdout.write(`${JSON.stringify(summary)}\n`))
    .catch((error) => {
      process.stderr.write(`${error?.message || 'Falha sanitizada no benchmark.'}\n`)
      process.exitCode = 1
    })
}
