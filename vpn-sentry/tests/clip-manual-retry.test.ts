import { expect, test, vi } from 'vitest'
import { createClipManualRetryService } from '../server/utils/clip-manual-retry'

const channel = '20000000-0000-0000-0000-000000000001'
const submission = '30000000-0000-0000-0000-000000000001'
const retryToken = '40000000-0000-0000-0000-000000000001'

function fixture() {
  const repository = {
    beginManualRetry: vi.fn(async () => ({
      state: 'processing' as const,
      mode: 'captions' as const,
      retryToken,
      videoId: 'vod-123',
      vodOffset: 90,
      durationSeconds: 20
    })),
    completeManualRetryWithCaptions: vi.fn(async () => ({
      state: 'completed' as const,
      matches: 1
    })),
    fallbackManualRetryToOpenAi: vi.fn(async () => ({ state: 'pending_captions' as const }))
  }
  const logEvent = vi.fn()
  return { repository, logEvent, service: createClipManualRetryService(repository, logEvent) }
}

test('begins one retry and logs no retry token or caption content', async () => {
  const f = fixture()
  await expect(f.service.begin('owner', channel, submission)).resolves.toMatchObject({
    mode: 'captions',
    retryToken
  })
  expect(f.repository.beginManualRetry).toHaveBeenCalledWith('owner', channel, submission)
  expect(f.logEvent).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'clip.stage', stage: 'twitch_captions', outcome: 'started' })
  )
  expect(JSON.stringify(f.logEvent.mock.calls)).not.toContain(retryToken)
})

test('rejects extra caption fields before reaching the repository', async () => {
  const f = fixture()
  await expect(
    f.service.completeCaptions('owner', channel, submission, {
      retryToken,
      transcript: 'must not be accepted',
      segments: [{ startMs: 0, endMs: 100, text: 'caption' }]
    })
  ).rejects.toMatchObject({ statusCode: 400 })
  expect(f.repository.completeManualRetryWithCaptions).not.toHaveBeenCalled()
})

test('accepts bounded caption segments but logs no caption text', async () => {
  const f = fixture()
  const body = {
    retryToken,
    segments: [{ startMs: 0, endMs: 100, text: 'caption text is transient' }]
  }
  await expect(f.service.completeCaptions('owner', channel, submission, body)).resolves.toEqual({
    state: 'completed',
    matches: 1
  })
  expect(f.repository.completeManualRetryWithCaptions).toHaveBeenCalledWith(
    'owner',
    channel,
    submission,
    retryToken,
    body.segments
  )
  expect(JSON.stringify(f.logEvent.mock.calls)).not.toContain('caption text is transient')
})

test('rejects empty caption segments and invalid retry tokens', async () => {
  const f = fixture()
  await expect(
    f.service.completeCaptions('owner', channel, submission, { retryToken, segments: [] })
  ).rejects.toMatchObject({ statusCode: 400 })
  await expect(
    f.service.fallbackToOpenAi('owner', channel, submission, { retryToken: 'invalid' })
  ).rejects.toMatchObject({ statusCode: 400 })
  expect(f.repository.fallbackManualRetryToOpenAi).not.toHaveBeenCalled()
})
