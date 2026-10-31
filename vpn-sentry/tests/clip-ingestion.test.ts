import { beforeEach, expect, test } from 'vitest'
import { createClipIngestionService, parseTwitchClipUrl } from '../server/utils/clip-ingestion'
import type { ClipAccess, ClipRepository } from '../server/utils/clip-repository'

let access: ClipAccess
let saved: Map<string, { id: string; state: string }>
let service: ReturnType<typeof createClipIngestionService>
let provider: string
let revokeDuringFetch: boolean
beforeEach(() => {
  access = {
    consentRevision: 'revision',
    connectionId: 'connection',
    broadcasterId: '123',
    scopes: ['channel:manage:clips'],
    credential: {} as never,
    connected: true,
    consent: {
      manualEnabled: true,
      consentVersion: 'clip-processing-v1',
      consentedAt: '2026-10-18T00:00:00Z',
      revokedAt: null
    }
  }
  saved = new Map()
  provider = '123'
  revokeDuringFetch = false
  const repo: ClipRepository = {
    existing: async (_owner, _channel, id) => {
      const row = saved.get(id)
      return row ? { ...row, duplicate: true } : null
    },
    read: async (owner, channel) =>
      owner === 'owner' && channel === 'channel' ? structuredClone(access) : null,
    setConsent: async (_owner, _channel, enabled) => {
      access.consent.manualEnabled = enabled
      return structuredClone(access)
    },
    insert: async (_owner, _channel, metadata) => {
      if (!access.consent.manualEnabled) throw Object.assign(new Error(), { statusCode: 403 })
      const existing = saved.get(metadata.id)
      if (existing) return { ...existing, duplicate: true }
      const result = { id: 'submission', state: 'pending_captions' }
      saved.set(metadata.id, result)
      return { ...result, duplicate: false }
    },
    list: async () => ({ items: [] })
  }
  service = createClipIngestionService(repo, async (id) => {
    if (revokeDuringFetch) access.consent.manualEnabled = false
    return {
      id,
      broadcasterId: provider,
      creatorId: 'creator',
      title: 'Title',
      videoId: '',
      vodOffset: null,
      createdAt: '2026-10-18T00:00:00Z',
      duration: 12,
      language: 'pt',
      viewCount: 1
    }
  })
})
test.each([
  'https://clips.twitch.tv/Valid-Id_123?foo=1#fragment',
  'https://clips.twitch.tv/Valid-Id_123?encoded=%2F#fragment',
  'https://www.twitch.tv/streamer/clip/Valid-Id_123',
  'https://twitch.tv/streamer/clip/Valid-Id_123'
])('canonicalizes %s without fetching it', (url) => {
  expect(parseTwitchClipUrl(url)).toEqual({
    id: 'Valid-Id_123',
    canonicalUrl: 'https://clips.twitch.tv/Valid-Id_123'
  })
})
test.each([
  'http://clips.twitch.tv/Id',
  'https://clips.twitch.tv:443/Id',
  'https://evil@clips.twitch.tv/Id',
  'https://clips.twitch.tv.evil/Id',
  'https://clips.twitch.tv/%49d',
  'https://clips.twitch.tv/Id/extra',
  'https://clips.twitch.tv/a/../Id',
  'https://twitch.tv/user/clip/Id/',
  'https://clips.twitch.tv/Id\\evil'
])('rejects ambiguous URL %s', (url) => {
  expect(() => parseTwitchClipUrl(url)).toThrow()
})
test.each(['other', ''])('refuses caller %s without writing', async (owner) => {
  await expect(
    service.submit(owner, 'channel', { url: 'https://clips.twitch.tv/Id' })
  ).rejects.toMatchObject({ statusCode: 403 })
  expect(saved.size).toBe(0)
})
test.each(['consent', 'scope', 'connection', 'broadcaster'])(
  'refuses missing %s without writing',
  async (kind) => {
    if (kind === 'consent') access.consent.manualEnabled = false
    if (kind === 'scope') access.scopes = []
    if (kind === 'connection') access.connected = false
    if (kind === 'broadcaster') provider = 'other'
    await expect(
      service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id' })
    ).rejects.toMatchObject({ statusCode: 403 })
    expect(saved.size).toBe(0)
  }
)
test('duplicate clip returns existing submission without restarting it', async () => {
  const first = await service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id' })
  saved.set('Id', { id: first.id, state: 'completed' })
  expect(
    await service.submit('owner', 'channel', { url: 'https://twitch.tv/user/clip/Id?x=1' })
  ).toEqual({ id: first.id, state: 'completed', duplicate: true })
})
test('revocation during Helix request prevents persistence', async () => {
  revokeDuringFetch = true
  await expect(
    service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id' })
  ).rejects.toMatchObject({ statusCode: 403 })
  expect(saved.size).toBe(0)
})
test('activation requires explicit separate consent and strict payloads', async () => {
  await expect(
    service.setConsent('owner', 'channel', { manualEnabled: true })
  ).rejects.toMatchObject({ statusCode: 400 })
  await expect(
    service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id', owner_id: 'other' })
  ).rejects.toMatchObject({ statusCode: 400 })
})

test('revocation body rejects contradictory consent fields', async () => {
  await expect(
    service.setConsent('owner', 'channel', { manualEnabled: false, consentAccepted: true })
  ).rejects.toMatchObject({ statusCode: 400 })
})

test('duplicate URL is available even when the source clip has disappeared', async () => {
  await service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id' })
  provider = 'unavailable'
  expect(
    await service.submit('owner', 'channel', { url: 'https://clips.twitch.tv/Id' })
  ).toMatchObject({ id: 'submission', duplicate: true })
})

test('clip history is available independently of clip intake', async () => {
  await expect(service.list('owner', 'channel')).resolves.toEqual({ items: [] })
})
