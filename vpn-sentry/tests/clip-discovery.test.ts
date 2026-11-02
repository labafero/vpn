import { expect, test, vi } from 'vitest'
import { createClipDiscoveryService } from '../server/utils/clip-discovery'
import type {
  ClipDiscoveryClaim,
  ClipDiscoveryRepository
} from '../server/utils/clip-discovery-repository'
import type { ClipMetadata } from '../server/utils/twitch-clips'

const access = {
  consentRevision: 'revision',
  scheduledRevision: 'scheduled-revision',
  connectionId: 'connection',
  broadcasterId: '123',
  connected: true,
  scopes: ['channel:manage:clips'],
  credential: {
    ciphertext: 'c',
    iv: 'i',
    tag: 't',
    keyVersion: 'v1',
    scopes: ['channel:manage:clips'],
    expiresAt: '2030-01-01T00:00:00Z',
    validatedAt: '2026-01-01T00:00:00Z',
    retryUntil: null
  },
  consent: {
    manualEnabled: false,
    consentVersion: null,
    consentedAt: null,
    revokedAt: null,
    scheduledEnabled: true,
    scheduledConsentVersion: 'clip-scheduled-v1' as const,
    scheduledConsentedAt: '2026-01-01T00:00:00Z',
    scheduledRevokedAt: null
  }
}
const clip: ClipMetadata = {
  id: 'clip',
  broadcasterId: '123',
  creatorId: '456',
  title: 'Clip',
  videoId: '789',
  vodOffset: 1,
  createdAt: '2026-01-01T00:00:00Z',
  duration: 10,
  language: 'pt',
  viewCount: 1
}
function setup(overrides: Partial<ClipDiscoveryClaim> = {}) {
  let claim: ClipDiscoveryClaim | null = {
    ownerId: 'owner',
    channelId: 'channel',
    access,
    phase: 'backfill',
    startedAt: null,
    endedAt: null,
    cursor: null,
    pendingWindows: [],
    itemsInWindow: 0,
    completedAt: null,
    ...overrides
  }
  const initialize = vi.fn(
    async (_current: ClipDiscoveryClaim, window: { startedAt: string; endedAt: string }) => {
      claim = { ...claim!, startedAt: window.startedAt, endedAt: window.endedAt }
      return true
    }
  )
  const advance = vi.fn(
    async (
      _current: ClipDiscoveryClaim,
      input: {
        clips: ClipMetadata[]
        next: Omit<ClipDiscoveryClaim, 'ownerId' | 'channelId' | 'access'>
      }
    ) => {
      claim = { ...claim!, ...input.next }
      return { current: true, discovered: input.clips.length }
    }
  )
  const repository = {
    claimNext: async () => claim,
    initialize,
    advance
  } as unknown as ClipDiscoveryRepository
  const gateway = {
    getBroadcasterCreatedAt: vi.fn(async () => '2020-01-01T00:00:00Z'),
    listByBroadcaster: vi.fn(async () => ({ items: [clip], cursor: null }))
  }
  return { repository, gateway, initialize, advance, getClaim: () => claim }
}

test('initializes a resumable full-history window and imports a page once', async () => {
  const fixture = setup()
  const service = createClipDiscoveryService(
    fixture.repository,
    fixture.gateway,
    () => new Date('2026-11-01T00:00:00Z')
  )
  await expect(service.runNext()).resolves.toMatchObject({ phase: 'backfill', complete: false })
  expect(fixture.initialize).toHaveBeenCalledWith(expect.anything(), {
    startedAt: '2020-01-01T00:00:00.000Z',
    endedAt: '2026-11-01T00:00:00.000Z'
  })
  await expect(service.runNext()).resolves.toMatchObject({
    phase: 'backfill',
    discovered: 1,
    complete: true
  })
  expect(fixture.advance).toHaveBeenCalledOnce()
})

test('splits a saturated query window and preserves the remaining half for restart', async () => {
  const fixture = setup({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-03T00:00:00.000Z',
    itemsInWindow: 900
  })
  fixture.gateway.listByBroadcaster.mockResolvedValue({
    items: Array.from({ length: 100 }, (_, i) => ({ ...clip, id: `clip-${i}` })),
    cursor: 'page-11'
  })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)
  await service.runNext()
  expect(fixture.getClaim()).toMatchObject({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-02T00:00:00.000Z',
    cursor: null,
    pendingWindows: [{ startedAt: '2026-10-02T00:00:00.000Z', endedAt: '2026-10-03T00:00:00.000Z' }]
  })
})

test('splits a saturated result ceiling even when Twitch returns no cursor', async () => {
  const fixture = setup({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-03T00:00:00.000Z',
    itemsInWindow: 900
  })
  fixture.gateway.listByBroadcaster.mockResolvedValue({
    items: Array.from({ length: 100 }, (_, i) => ({ ...clip, id: `clip-${i}` })),
    cursor: null
  })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)
  await service.runNext()
  expect(fixture.getClaim()).toMatchObject({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-02T00:00:00.000Z',
    pendingWindows: [{ startedAt: '2026-10-02T00:00:00.000Z', endedAt: '2026-10-03T00:00:00.000Z' }]
  })
})

test('drains saturated incremental windows before starting a new overlap', async () => {
  const fixture = setup({
    phase: 'incremental',
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-03T00:00:00.000Z',
    itemsInWindow: 900
  })
  fixture.gateway.listByBroadcaster
    .mockResolvedValueOnce({
      items: Array.from({ length: 100 }, (_, i) => ({ ...clip, id: `clip-${i}` })),
      cursor: null
    })
    .mockResolvedValue({ items: [clip], cursor: null })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)

  await service.runNext()
  await service.runNext()
  expect(fixture.getClaim()).toMatchObject({
    phase: 'incremental',
    startedAt: '2026-10-02T00:00:00.000Z',
    endedAt: '2026-10-03T00:00:00.000Z',
    pendingWindows: []
  })
  await service.runNext()
  expect(fixture.getClaim()).toMatchObject({
    phase: 'incremental',
    startedAt: null,
    endedAt: null
  })
})

test('resumes from the persisted Twitch cursor and consumes the next page', async () => {
  const fixture = setup({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-02T00:00:00.000Z'
  })
  fixture.gateway.listByBroadcaster
    .mockResolvedValueOnce({ items: [{ ...clip, id: 'page-one' }], cursor: 'page-two' })
    .mockResolvedValueOnce({ items: [{ ...clip, id: 'page-two' }], cursor: null })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)
  await expect(service.runNext()).resolves.toMatchObject({
    phase: 'backfill',
    discovered: 1,
    complete: false
  })
  expect(fixture.getClaim()?.cursor).toBe('page-two')
  await expect(service.runNext()).resolves.toMatchObject({
    phase: 'backfill',
    discovered: 1,
    complete: true
  })
  expect(fixture.gateway.listByBroadcaster).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({ after: 'page-two' })
  )
})

test('resumes incremental discovery from the last completed scan when its gap exceeds seven days', async () => {
  const fixture = setup({ phase: 'incremental', completedAt: '2026-10-01T00:00:00.000Z' })
  const service = createClipDiscoveryService(
    fixture.repository,
    fixture.gateway,
    () => new Date('2026-11-01T00:00:00.000Z')
  )

  await service.runNext()
  expect(fixture.initialize).toHaveBeenCalledWith(expect.anything(), {
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-11-01T00:00:00.000Z'
  })
})

test('advances the incremental watermark only after the entire window completes', async () => {
  const fixture = setup({
    phase: 'incremental',
    startedAt: '2026-10-25T00:00:00.000Z',
    endedAt: '2026-11-01T00:00:00.000Z',
    completedAt: '2026-10-20T00:00:00.000Z'
  })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)

  await service.runNext()
  expect(fixture.getClaim()).toMatchObject({
    startedAt: null,
    endedAt: null,
    completedAt: '2026-11-01T00:00:00.000Z'
  })
})

test('does not record a page when consent was revoked before checkpoint advance', async () => {
  const fixture = setup({
    startedAt: '2026-10-01T00:00:00.000Z',
    endedAt: '2026-10-02T00:00:00.000Z'
  })
  fixture.advance.mockResolvedValue({ current: false, discovered: 0 })
  const service = createClipDiscoveryService(fixture.repository, fixture.gateway)
  await expect(service.runNext()).resolves.toEqual({
    phase: 'idle',
    discovered: 0,
    complete: false
  })
})
