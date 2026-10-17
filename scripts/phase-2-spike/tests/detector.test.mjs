import { readFile } from 'node:fs/promises'
import { expect, test } from 'vitest'
import { detectPhrases } from '../detector.mjs'

const phraseSet = JSON.parse(await readFile(new URL('../phrases.v1.json', import.meta.url), 'utf8'))

test('matches literal phrases after case, accent, and punctuation normalization', () => {
  const result = detectPhrases(
    [{ startMs: 100, endMs: 1200, text: 'VOCÊ é um inútil!!!', confidence: 0.87 }],
    phraseSet,
    { clipId: 'opaque-clip' }
  )

  expect(result).toEqual([
    {
      clipId: 'opaque-clip',
      phraseId: 'phrase-v1-01',
      phraseVersion: 1,
      startMs: 100,
      endMs: 1200,
      confidence: 0.87
    }
  ])
})

test('matches a phrase split across adjacent timed segments', () => {
  const result = detectPhrases(
    [
      { startMs: 100, endMs: 500, text: 'você é' },
      { startMs: 510, endMs: 900, text: 'um inútil' }
    ],
    phraseSet,
    { clipId: 'split-clip' }
  )

  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ phraseId: 'phrase-v1-01', startMs: 100, endMs: 900 })
})

test('timestamps the phrase segments instead of unrelated preceding speech', () => {
  const result = detectPhrases(
    [
      { startMs: 0, endMs: 300, text: 'olá' },
      { startMs: 350, endMs: 500, text: 'você é' },
      { startMs: 510, endMs: 900, text: 'um inútil' }
    ],
    phraseSet,
    { clipId: 'timestamp-clip' }
  )

  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({ startMs: 350, endMs: 900 })
})

test('does not match semantic variants, negation, or a phrase split by a long pause', () => {
  const result = detectPhrases(
    [
      { startMs: 0, endMs: 900, text: 'Você não é um inútil.' },
      { startMs: 1000, endMs: 1500, text: 'você é incapaz' },
      { startMs: 2000, endMs: 2300, text: 'você é' },
      { startMs: 5000, endMs: 5400, text: 'um inútil' }
    ],
    phraseSet,
    { clipId: 'negative-clip' }
  )

  expect(result).toEqual([])
})

test('does not lose a negative prefix when ASR splits it into a preceding segment', () => {
  const result = detectPhrases(
    [
      { startMs: 100, endMs: 300, text: 'não' },
      { startMs: 350, endMs: 700, text: 'você é' },
      { startMs: 710, endMs: 1000, text: 'um inútil' }
    ],
    phraseSet,
    { clipId: 'split-negation' }
  )

  expect(result).toEqual([])
})

test('returns distinct matches without leaking transcript text and preserves absent confidence', () => {
  const result = detectPhrases(
    [
      { startMs: 0, endMs: 800, text: 'Você é um inútil.' },
      { startMs: 1000, endMs: 1900, text: 'você é um inútil?' }
    ],
    phraseSet,
    { clipId: 'repeat-clip' }
  )

  expect(result).toHaveLength(2)
  expect(result.map(({ startMs, endMs }) => [startMs, endMs])).toEqual([
    [0, 800],
    [1000, 1900]
  ])
  expect(result[0]).not.toHaveProperty('confidence')
  expect(result[0]).not.toHaveProperty('text')
})

test('rejects malformed timestamps and an invalid versioned phrase set', () => {
  expect(() =>
    detectPhrases([{ startMs: 100, endMs: 50, text: 'Você é um inútil' }], phraseSet)
  ).toThrow(/timestamp/i)
  expect(() => detectPhrases([], { version: 2, phrases: [] })).toThrow(/phrase set/i)
})
