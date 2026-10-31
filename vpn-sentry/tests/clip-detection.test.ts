import { expect, test } from 'vitest'
import { detectClipPhrases } from '../server/utils/clip-detection'

test('detects versioned literal phrases with timestamps and no transcript in output', () => {
  const result = detectClipPhrases([
    { startMs: 100, endMs: 500, text: 'VOCÊ é' },
    { startMs: 510, endMs: 900, text: 'um inútil!' }
  ])
  expect(result).toEqual([
    {
      phraseId: 'phrase-v1-01',
      phraseVersion: 1,
      phrase: 'você é um inútil',
      startMs: 100,
      endMs: 900
    }
  ])
  expect(JSON.stringify(result)).not.toContain('VOCÊ')
})

test('does not match negated phrases or phrases separated by a long pause', () => {
  expect(
    detectClipPhrases([
      { startMs: 0, endMs: 300, text: 'não' },
      { startMs: 350, endMs: 600, text: 'você é' },
      { startMs: 610, endMs: 900, text: 'um inútil' },
      { startMs: 2000, endMs: 2500, text: 'cala' },
      { startMs: 5000, endMs: 5500, text: 'a boca' }
    ])
  ).toEqual([])
})

test('rejects malformed timestamps from the transcription provider', () => {
  expect(() => detectClipPhrases([{ startMs: 800, endMs: 100, text: 'cala a boca' }])).toThrow(
    /timestamp/i
  )
})
