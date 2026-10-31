import { expect, test, vi } from 'vitest'
import {
  ClipProcessingFailure,
  createClipProcessingService,
  type ClipProcessingJob
} from '../server/utils/clip-processing'

function fixture(authorized = true) {
  const job: ClipProcessingJob = {
    id: 'submission-1',
    ownerId: 'owner-1',
    channelId: 'channel-1',
    clipId: 'ClipId',
    canonicalUrl: 'https://clips.twitch.tv/ClipId',
    broadcasterId: '123',
    durationSeconds: 12,
    videoId: 'video-123',
    vodOffset: 45,
    consentRevision: 'revision-1',
    credential: {
      ciphertext: 'ciphertext',
      iv: 'iv',
      tag: 'tag',
      keyVersion: 'v1',
      scopes: ['channel:manage:clips'],
      expiresAt: '2027-01-01T00:00:00.000Z',
      validatedAt: '2026-10-31T00:00:00.000Z',
      retryUntil: null
    }
  }
  const repo = {
    claimNext: vi.fn(async () => job),
    stillAuthorized: vi.fn(async () => authorized),
    cancel: vi.fn(async () => {}),
    finish: vi.fn(async () => true),
    noProvider: vi.fn(async () => {}),
    fail: vi.fn(async () => {})
  }
  const cleanup = vi.fn(async () => {})
  const download = vi.fn(async () => ({ path: '/tmp/clip.mp4', cleanup }))
  const getOpenAiKey = vi.fn(async () => 'sk-user-key')
  const transcribe = vi.fn(async () => [{ startMs: 100, endMs: 900, text: 'Você é um inútil.' }])
  const detect = vi.fn(() => [
    {
      phraseId: 'phrase-v1-01',
      phraseVersion: 1,
      phrase: 'você é um inútil',
      startMs: 100,
      endMs: 900
    }
  ])
  return {
    job,
    repo,
    cleanup,
    download,
    getOpenAiKey,
    transcribe,
    detect,
    service: createClipProcessingService({
      repository: repo,
      download,
      getOpenAiKey,
      transcribe,
      detect,
      maxAttempts: 3
    })
  }
}

test('transcribes a clip with the owner OpenAI key', async () => {
  const f = fixture()
  await expect(f.service.processNext()).resolves.toEqual({ state: 'completed', matches: 1 })
  expect(f.repo.claimNext).toHaveBeenCalledOnce()
  expect(f.download).toHaveBeenCalledWith(f.job)
  expect(f.transcribe).toHaveBeenCalledWith({
    path: '/tmp/clip.mp4',
    clipId: 'ClipId',
    apiKey: 'sk-user-key'
  })
  expect(f.getOpenAiKey).toHaveBeenCalledWith('owner-1')
  expect(f.repo.finish).toHaveBeenCalledWith(f.job, [
    {
      phraseId: 'phrase-v1-01',
      phraseVersion: 1,
      phrase: 'você é um inútil',
      source: 'openai',
      startMs: 100,
      endMs: 900
    }
  ])
  expect(JSON.stringify(f.repo.finish.mock.calls)).not.toContain('Você é um inútil.')
  expect(f.cleanup).toHaveBeenCalledOnce()
})

test('does not download or transcribe after consent is revoked', async () => {
  const f = fixture(false)
  await expect(f.service.processNext()).resolves.toEqual({ state: 'cancelled_consent' })
  expect(f.download).not.toHaveBeenCalled()
  expect(f.transcribe).not.toHaveBeenCalled()
  expect(f.repo.finish).not.toHaveBeenCalled()
  expect(f.repo.cancel).toHaveBeenCalledWith(f.job)
})

test('returns idle when there is no explicitly requested job', async () => {
  const f = fixture()
  f.repo.claimNext.mockResolvedValueOnce(null)
  await expect(f.service.processNext()).resolves.toEqual({ state: 'idle' })
  expect(f.download).not.toHaveBeenCalled()
})

test('records no source when the owner has no OpenAI key', async () => {
  const f = fixture()
  f.getOpenAiKey.mockResolvedValueOnce(null)
  await expect(f.service.processNext()).resolves.toEqual({ state: 'needs_openai_key' })
  expect(f.download).not.toHaveBeenCalled()
  expect(f.transcribe).not.toHaveBeenCalled()
  expect(f.repo.noProvider).toHaveBeenCalledWith(f.job)
})

test('cleans temporary media and schedules only a bounded retry after transcription failure', async () => {
  const f = fixture()
  f.transcribe.mockRejectedValueOnce(new ClipProcessingFailure('transcription_failed', true))
  f.repo.fail.mockResolvedValueOnce('failed_retryable')
  await expect(f.service.processNext()).resolves.toEqual({ state: 'failed_retryable' })
  expect(f.repo.fail).toHaveBeenCalledWith(f.job, 'transcription_failed', true, 3)
  expect(f.cleanup).toHaveBeenCalledOnce()
  expect(f.repo.finish).not.toHaveBeenCalled()
})

test('rechecks consent after download and discards temporary media if it was revoked', async () => {
  const f = fixture()
  f.repo.stillAuthorized.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
  await expect(f.service.processNext()).resolves.toEqual({ state: 'cancelled_consent' })
  expect(f.transcribe).not.toHaveBeenCalled()
  expect(f.repo.cancel).toHaveBeenCalledWith(f.job)
  expect(f.cleanup).toHaveBeenCalledOnce()
})
