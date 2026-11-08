import { afterEach, expect, test, vi } from 'vitest'
import { logClipDebug } from '../server/utils/clip-logging'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

test('keeps detailed clip diagnostics disabled by default', () => {
  vi.stubEnv('NUXT_CLIP_DEBUG', 'false')
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
  logClipDebug({ stage: 'clip_discovery', outcome: 'succeeded', resultCount: 3 })
  expect(info).not.toHaveBeenCalled()
})

test('enables only the sanitized diagnostic event when explicitly toggled', () => {
  vi.stubEnv('NUXT_CLIP_DEBUG', 'true')
  const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
  logClipDebug({
    stage: 'openai_transcription',
    outcome: 'succeeded',
    audioBytes: 42,
    segmentCount: 2
  })
  expect(info).toHaveBeenCalledOnce()
  expect(info.mock.calls[0]?.[0]).toContain('"event":"clip.debug"')
  expect(info.mock.calls[0]?.[0]).toContain('"audioBytes":42')
  expect(info.mock.calls[0]?.[0]).not.toContain('secret transcript text')
  expect(info.mock.calls[0]?.[0]).not.toContain('api-key')
})
