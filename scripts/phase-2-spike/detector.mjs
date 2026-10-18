const punctuation = /[\p{P}\p{S}]+/gu

function normalize(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(punctuation, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function validatePhraseSet(phraseSet) {
  if (
    !phraseSet ||
    phraseSet.version !== 1 ||
    !phraseSet.normalization ||
    !Array.isArray(phraseSet.phrases) ||
    phraseSet.phrases.length === 0 ||
    phraseSet.phrases.some(
      (phrase) =>
        !phrase ||
        typeof phrase.id !== 'string' ||
        !phrase.id.trim() ||
        typeof phrase.text !== 'string' ||
        !normalize(phrase.text)
    )
  ) {
    throw new TypeError('Invalid phrase set: expected version 1 and literal phrases.')
  }
  return phraseSet
}

function validateSegments(segments) {
  if (!Array.isArray(segments)) throw new TypeError('Invalid segments: expected an array.')
  for (const segment of segments) {
    if (
      !segment ||
      !Number.isFinite(segment.startMs) ||
      !Number.isFinite(segment.endMs) ||
      segment.startMs < 0 ||
      segment.endMs < segment.startMs ||
      typeof segment.text !== 'string'
    ) {
      throw new TypeError('Invalid timestamp or text in segment.')
    }
  }
}

function findLiteralMatch(text, phrase) {
  const phraseIndex = text.indexOf(phrase)
  if (phraseIndex < 0) return null
  const before = text[phraseIndex - 1]
  const after = text[phraseIndex + phrase.length]
  if ((before && before !== ' ') || (after && after !== ' ')) return null
  return { start: phraseIndex, end: phraseIndex + phrase.length }
}

export function detectPhrases(segments, phraseSet, { clipId = 'unknown' } = {}) {
  validateSegments(segments)
  validatePhraseSet(phraseSet)
  const ordered = [...segments].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
  const matches = []
  const maxGap = phraseSet.normalization.maximumInterSegmentGapMs
  const forbiddenPrefixes = new Set((phraseSet.normalization.negativePrefixes || []).map(normalize))

  for (const phrase of phraseSet.phrases) {
    const normalizedPhrase = normalize(phrase.text)
    for (let start = 0; start < ordered.length; start += 1) {
      let combined = ''
      const parts = []
      let precedingContext = ''
      for (let previous = start - 1; previous >= 0; previous -= 1) {
        if (ordered[previous + 1].startMs - ordered[previous].endMs > maxGap) break
        const previousText = normalize(ordered[previous].text)
        if (previousText) {
          precedingContext = `${previousText} ${precedingContext}`.trim()
          precedingContext = precedingContext.split(' ').slice(-3).join(' ')
        }
        if (precedingContext.split(' ').length >= 3) break
      }
      for (let end = start; end < ordered.length; end += 1) {
        const segment = ordered[end]
        if (end > start && segment.startMs - ordered[end - 1].endMs > maxGap) break
        const normalizedSegment = normalize(segment.text)
        if (!normalizedSegment) continue
        const partStart = combined.length + (combined ? 1 : 0)
        combined = `${combined}${combined ? ' ' : ''}${normalizedSegment}`
        parts.push({ start: partStart, end: combined.length, segmentIndex: end })
        const span = findLiteralMatch(combined, normalizedPhrase)
        if (!span) continue
        const priorWords = `${precedingContext} ${combined.slice(0, span.start)}`
          .trim()
          .split(' ')
          .filter(Boolean)
        if (priorWords.length && forbiddenPrefixes.has(priorWords.at(-1))) continue

        const firstPart = parts.find((part) => span.start >= part.start && span.start < part.end)
        const lastPart = parts.find((part) => span.end - 1 >= part.start && span.end - 1 < part.end)
        const firstIndex = firstPart?.segmentIndex ?? start
        const lastIndex = lastPart?.segmentIndex ?? end
        const matchingSegments = ordered.slice(firstIndex, lastIndex + 1)
        const confidence = matchingSegments.every((item) => Number.isFinite(item.confidence))
          ? Math.min(...matchingSegments.map((item) => item.confidence))
          : undefined
        matches.push({
          clipId,
          phraseId: phrase.id,
          phraseVersion: phraseSet.version,
          startMs: ordered[firstIndex].startMs,
          endMs: ordered[lastIndex].endMs,
          ...(confidence !== undefined ? { confidence } : {})
        })
        break
      }
    }
  }

  const unique = new Map()
  for (const match of matches) {
    const key = `${match.phraseId}:${match.startMs}:${match.endMs}`
    if (!unique.has(key)) unique.set(key, match)
  }
  return [...unique.values()].sort(
    (a, b) => a.startMs - b.startMs || a.phraseId.localeCompare(b.phraseId)
  )
}
