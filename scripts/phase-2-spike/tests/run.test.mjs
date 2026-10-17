import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { CORPUS_ROOT } from '../corpus.mjs'
import { calculateMetrics, runBenchmark } from '../run.mjs'

const temporaryDirectories = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

test('calculates per-phrase precision, recall, and false positives using explicit clip labels', () => {
  const clips = [
    { id: 'positive', expectedPhrases: ['phrase-v1-01'], expectedNegative: [] },
    { id: 'negative', expectedPhrases: [], expectedNegative: ['phrase-v1-01'] },
    { id: 'missed', expectedPhrases: ['phrase-v1-01'], expectedNegative: [] }
  ]
  const detections = [
    { clipId: 'positive', phraseId: 'phrase-v1-01' },
    { clipId: 'negative', phraseId: 'phrase-v1-01' }
  ]

  expect(calculateMetrics(clips, detections, ['phrase-v1-01'])).toEqual([
    {
      phraseId: 'phrase-v1-01',
      truePositives: 1,
      falsePositives: 1,
      falseNegatives: 1,
      precision: 0.5,
      recall: 0.5
    }
  ])
})

test('excludes clips without a label from a phrase denominator', () => {
  const clips = [{ id: 'unlabelled', expectedPhrases: [], expectedNegative: [] }]
  expect(calculateMetrics(clips, [], ['phrase-v1-01'])).toEqual([
    {
      phraseId: 'phrase-v1-01',
      truePositives: 0,
      falsePositives: 0,
      falseNegatives: 0,
      precision: null,
      recall: null
    }
  ])
})

test('runs repeated rounds, calculates quality from round one, and writes only opaque clip references', async () => {
  await mkdir(CORPUS_ROOT, { recursive: true })
  const corpusDirectory = await mkdtemp(path.join(CORPUS_ROOT, 'runner-test-'))
  const outputRoot = await mkdtemp(path.join(CORPUS_ROOT, 'runner-output-test-'))
  temporaryDirectories.push(corpusDirectory, outputRoot)
  await writeFile(path.join(corpusDirectory, 'clip.wav'), 'test audio')
  const manifestPath = path.join(corpusDirectory, 'manifest.json')
  await writeFile(
    manifestPath,
    JSON.stringify([
      {
        id: 'human-name-that-must-not-be-written',
        path: path.relative(CORPUS_ROOT, path.join(corpusDirectory, 'clip.wav')),
        source: 'synthetic',
        consent: { status: 'not_required_synthetic', reference: 'test-generation' },
        scenario: 'positive phrase',
        expectedPhrases: ['phrase-v1-01'],
        expectedNegative: []
      }
    ])
  )
  let callCount = 0
  const summary = await runBenchmark({
    manifestPath,
    provider: 'local',
    rounds: 2,
    outputRoot,
    transcribeClip: async (clip) => {
      callCount += 1
      return {
        clipId: clip.id,
        provider: 'whisper.cpp',
        model: 'base',
        elapsedMs: callCount === 1 ? 50 : 70,
        segments: [
          {
            startMs: 100,
            endMs: 1000,
            text: callCount === 1 ? 'você é um inútil' : 'fala diferente sem detecção'
          }
        ]
      }
    }
  })

  expect(summary.metrics[0]).toMatchObject({ truePositives: 1, falseNegatives: 0, recall: 1 })
  expect(summary.latencyMs).toMatchObject({ median: 60, p95: 70, samples: 2 })
  expect(summary.wallClockMs).toBeGreaterThanOrEqual(0)
  expect(summary.timestampCoverage).toBe(1)
  expect(summary.failureRate).toBe(0)
  expect(summary.totalAudioMinutes).toBeNull()

  const files = await readdir(summary.runDirectory)
  const clipOutput = await readFile(
    path.join(
      summary.runDirectory,
      files.find((file) => file.startsWith('round-1-'))
    ),
    'utf8'
  )
  expect(clipOutput).not.toContain('human-name-that-must-not-be-written')
  expect(JSON.parse(clipOutput).clipId).toMatch(/^[a-f0-9]{24}$/)

  const failedRun = await runBenchmark({
    manifestPath,
    provider: 'local',
    rounds: 1,
    outputRoot,
    transcribeClip: async () => {
      throw new Error('private provider details')
    }
  })
  expect(failedRun.failedTranscriptions).toBe(1)
  expect(failedRun.failureRate).toBe(1)
  expect(failedRun.metrics[0]).toMatchObject({ falseNegatives: 1, recall: 0 })
})
