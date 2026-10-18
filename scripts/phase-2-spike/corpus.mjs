import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '../..')

export const CORPUS_ROOT = path.join(projectRoot, '.superpowers/runtime/phase-2-spike/corpus')
export const MAX_CLIP_BYTES = 100 * 1024 * 1024

export const SUPPORTED_MEDIA_EXTENSIONS = new Set([
  '.flac',
  '.m4a',
  '.mkv',
  '.mp3',
  '.mp4',
  '.ogg',
  '.wav',
  '.webm'
])

export class CorpusValidationError extends Error {
  constructor(code) {
    super('Corpus local inválido.')
    this.name = 'CorpusValidationError'
    this.code = code
  }
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return (
    relative === '' ||
    (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))
  )
}

function validateEntry(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
    throw new CorpusValidationError('CORPUS_INVALID_MANIFEST')
  }

  const validSource = entry.source === 'synthetic' || entry.source === 'authorized_recording'
  const validConsent =
    entry.consent &&
    typeof entry.consent.reference === 'string' &&
    entry.consent.reference.trim().length > 0 &&
    ((entry.source === 'synthetic' && entry.consent.status === 'not_required_synthetic') ||
      (entry.source === 'authorized_recording' && entry.consent.status === 'explicit'))

  if (!validSource || !validConsent) {
    throw new CorpusValidationError('CORPUS_INVALID_CONSENT')
  }

  if (
    typeof entry.id !== 'string' ||
    !entry.id.trim() ||
    typeof entry.path !== 'string' ||
    !entry.path.trim() ||
    typeof entry.scenario !== 'string' ||
    !entry.scenario.trim() ||
    !Array.isArray(entry.expectedPhrases) ||
    !entry.expectedPhrases.every((phraseId) => typeof phraseId === 'string' && phraseId.trim()) ||
    !Array.isArray(entry.expectedNegative) ||
    !entry.expectedNegative.every((phraseId) => typeof phraseId === 'string' && phraseId.trim())
  ) {
    throw new CorpusValidationError('CORPUS_INVALID_MANIFEST')
  }
}

export async function loadCorpus(manifestPath) {
  let corpusRoot
  let resolvedManifest
  let manifest

  try {
    corpusRoot = await realpath(CORPUS_ROOT)
    resolvedManifest = await realpath(manifestPath)
    if (!isWithin(corpusRoot, resolvedManifest)) {
      throw new CorpusValidationError('CORPUS_PATH_OUTSIDE_ROOT')
    }
    manifest = JSON.parse(await readFile(resolvedManifest, 'utf8'))
  } catch (error) {
    if (error instanceof CorpusValidationError) throw error
    throw new CorpusValidationError('CORPUS_INVALID_MANIFEST')
  }

  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new CorpusValidationError('CORPUS_INVALID_MANIFEST')
  }

  const clips = []

  for (const entry of manifest) {
    validateEntry(entry)

    const extension = path.extname(entry.path).toLowerCase()
    if (!SUPPORTED_MEDIA_EXTENSIONS.has(extension)) {
      throw new CorpusValidationError('CORPUS_UNSUPPORTED_MEDIA')
    }

    const candidatePath = path.resolve(corpusRoot, entry.path)
    if (!isWithin(corpusRoot, candidatePath)) {
      throw new CorpusValidationError('CORPUS_PATH_OUTSIDE_ROOT')
    }

    let clipPath
    let clipStats
    try {
      clipPath = await realpath(candidatePath)
      if (!isWithin(corpusRoot, clipPath)) {
        throw new CorpusValidationError('CORPUS_PATH_OUTSIDE_ROOT')
      }
      clipStats = await stat(clipPath)
    } catch (error) {
      if (error instanceof CorpusValidationError) throw error
      throw new CorpusValidationError('CORPUS_FILE_MISSING')
    }

    if (!clipStats.isFile() || clipStats.size === 0) {
      throw new CorpusValidationError('CORPUS_FILE_MISSING')
    }
    if (clipStats.size > MAX_CLIP_BYTES) {
      throw new CorpusValidationError('CORPUS_FILE_TOO_LARGE')
    }

    clips.push({
      id: entry.id,
      path: clipPath,
      source: entry.source,
      consent: entry.consent,
      scenario: entry.scenario,
      expectedPhrases: entry.expectedPhrases,
      expectedNegative: entry.expectedNegative
    })
  }

  return clips
}
