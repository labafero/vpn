import type { ClipTranscriptSegment } from './clip-processing'

export type ClipPhraseSnapshot = Array<{
  phraseId: string
  phraseVersion: number
  phrase: string
}>
const maxGapMs = 1200
const negativePrefixes = new Set(['nao', 'nunca', 'nem'])
export const normalizeClipPhrase = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[\p{P}\p{S}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ')

export function detectClipPhrases(segments: ClipTranscriptSegment[], phrases: ClipPhraseSnapshot) {
  if (
    !Array.isArray(segments) ||
    !Array.isArray(phrases) ||
    segments.some(
      (segment) =>
        !segment ||
        !Number.isFinite(segment.startMs) ||
        !Number.isFinite(segment.endMs) ||
        segment.startMs < 0 ||
        segment.endMs < segment.startMs ||
        typeof segment.text !== 'string'
    )
  )
    throw new TypeError('Invalid transcript timestamp or text.')

  const ordered = [...segments].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const detections = new Map<
    string,
    ClipPhraseSnapshot[number] & {
      startMs: number
      endMs: number
    }
  >()

  for (const [index] of ordered.entries()) {
    let combined = ''
    const parts: { start: number; end: number; segmentIndex: number }[] = []
    const precedingContext = ordered
      .slice(Math.max(0, index - 3), index)
      .map((segment) => normalizeClipPhrase(segment.text))
      .join(' ')
    for (let endIndex = index; endIndex < ordered.length; endIndex += 1) {
      if (endIndex > index && ordered[endIndex]!.startMs - ordered[endIndex - 1]!.endMs > maxGapMs)
        break
      const normalized = normalizeClipPhrase(ordered[endIndex]!.text)
      if (!normalized) continue
      const partStart = combined.length + (combined ? 1 : 0)
      combined = `${combined}${combined ? ' ' : ''}${normalized}`
      parts.push({ start: partStart, end: combined.length, segmentIndex: endIndex })
      for (const candidate of phrases) {
        const normalizedPhrase = normalizeClipPhrase(candidate.phrase)
        if (!normalizedPhrase) continue
        let phraseStart = combined.indexOf(normalizedPhrase)
        if (phraseStart < 0) continue
        while (phraseStart >= 0) {
          const before = combined[phraseStart - 1]
          const after = combined[phraseStart + normalizedPhrase.length]
          if ((!before || before === ' ') && (!after || after === ' ')) {
            const priorWords = `${precedingContext} ${combined.slice(0, phraseStart)}`
              .trim()
              .split(' ')
              .filter(Boolean)
            if (!priorWords.length || !negativePrefixes.has(priorWords.at(-1)!)) {
              const firstPart = parts.find(
                (part) => phraseStart >= part.start && phraseStart < part.end
              )
              const lastPart = parts.find(
                (part) =>
                  phraseStart + normalizedPhrase.length - 1 >= part.start &&
                  phraseStart + normalizedPhrase.length - 1 < part.end
              )
              const startMs = ordered[firstPart?.segmentIndex ?? index]!.startMs
              const endMs = ordered[lastPart?.segmentIndex ?? endIndex]!.endMs
              const key = `${candidate.phraseId}:${startMs}:${endMs}`
              if (!detections.has(key))
                detections.set(key, {
                  ...candidate,
                  startMs,
                  endMs
                })
            }
          }
          phraseStart = combined.indexOf(normalizedPhrase, phraseStart + 1)
        }
      }
    }
  }

  return [...detections.values()].sort(
    (a, b) => a.startMs - b.startMs || a.phraseId.localeCompare(b.phraseId)
  )
}
