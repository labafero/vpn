import { mkdir, mkdtemp, rm, stat, truncate, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, expect, test } from 'vitest'
import { CORPUS_ROOT, MAX_CLIP_BYTES, loadCorpus } from '../corpus.mjs'

const manifests = []

afterEach(async () => {
  await Promise.all(
    manifests.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function createCorpus(entries) {
  await mkdir(CORPUS_ROOT, { recursive: true })
  const directory = await mkdtemp(path.join(CORPUS_ROOT, 'test-'))
  manifests.push(directory)
  const clipDirectory = path.join(directory, 'clips')
  await mkdir(clipDirectory, { recursive: true })

  const withPaths = await Promise.all(
    entries.map(async (entry, index) => {
      const clipPath = path.join(clipDirectory, `${index}.${entry.extension ?? 'wav'}`)
      if (entry.fileSize !== undefined) {
        await writeFile(clipPath, '')
        await truncate(clipPath, entry.fileSize)
      } else if (entry.fileExists !== false) {
        await writeFile(clipPath, 'synthetic audio placeholder')
      }

      return {
        id: entry.id ?? `clip-${index}`,
        path: entry.path ?? path.relative(CORPUS_ROOT, clipPath),
        source: entry.source ?? 'synthetic',
        consent: entry.consent ?? {
          status: 'not_required_synthetic',
          reference: 'test-synthetic-source'
        },
        scenario: entry.scenario ?? 'fala positiva para teste',
        expectedPhrases: entry.expectedPhrases ?? ['phrase-v1-01'],
        expectedNegative: entry.expectedNegative ?? []
      }
    })
  )

  const manifestPath = path.join(directory, 'manifest.json')
  await writeFile(manifestPath, JSON.stringify(withPaths))
  return manifestPath
}

test('loads a synthetic clip with opaque metadata and a path inside the corpus root', async () => {
  const manifestPath = await createCorpus([{ id: 'synthetic-01' }])

  const [clip] = await loadCorpus(manifestPath)

  expect(clip).toMatchObject({
    id: 'synthetic-01',
    source: 'synthetic',
    scenario: 'fala positiva para teste',
    expectedPhrases: ['phrase-v1-01'],
    expectedNegative: []
  })
  expect(path.relative(CORPUS_ROOT, clip.path).startsWith('..')).toBe(false)
})

test('rejects a real recording without explicit consent', async () => {
  const manifestPath = await createCorpus([
    {
      source: 'authorized_recording',
      consent: { status: 'pending', reference: 'consent-pending' }
    }
  ])

  await expect(loadCorpus(manifestPath)).rejects.toMatchObject({
    code: 'CORPUS_INVALID_CONSENT'
  })
})

test('rejects a clip path that escapes the local corpus directory', async () => {
  const manifestPath = await createCorpus([{ path: '../../outside.wav' }])

  await expect(loadCorpus(manifestPath)).rejects.toMatchObject({
    code: 'CORPUS_PATH_OUTSIDE_ROOT'
  })
})

test('rejects a missing clip file', async () => {
  const manifestPath = await createCorpus([{ fileExists: false }])

  await expect(loadCorpus(manifestPath)).rejects.toMatchObject({
    code: 'CORPUS_FILE_MISSING'
  })
})

test('rejects an unsupported media extension', async () => {
  const manifestPath = await createCorpus([{ extension: 'exe' }])

  await expect(loadCorpus(manifestPath)).rejects.toMatchObject({
    code: 'CORPUS_UNSUPPORTED_MEDIA'
  })
})

test('rejects a clip above the configured local size limit', async () => {
  const manifestPath = await createCorpus([{ fileSize: MAX_CLIP_BYTES + 1 }])

  const clipDirectory = path.dirname(path.join(path.dirname(manifestPath), 'clips', '0.wav'))
  const clipStats = await stat(path.join(clipDirectory, '0.wav'))
  expect(clipStats.size).toBe(MAX_CLIP_BYTES + 1)
  await expect(loadCorpus(manifestPath)).rejects.toMatchObject({
    code: 'CORPUS_FILE_TOO_LARGE'
  })
})
