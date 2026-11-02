import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { expect, test, vi } from 'vitest'
import { createClipDiscoveryService } from '../server/utils/clip-discovery'
import { createClipDiscoveryRepository } from '../server/utils/clip-discovery-repository'
import { createClipProcessingService } from '../server/utils/clip-processing'
import { createClipProcessingRepository } from '../server/utils/clip-processing-repository'
import { createClipRepository } from '../server/utils/clip-repository'
import {
  createClipTriggerPhraseRepository,
  createClipTriggerPhrasesService
} from '../server/utils/clip-trigger-phrases'
import { detectClipPhrases } from '../server/utils/clip-detection'
import type { ClipMetadata } from '../server/utils/twitch-clips'

test('local PostgreSQL imports historical clips, applies versioned phrases and returns evidence details', async () => {
  const url = process.env.VPN_LOCAL_DATABASE_URL
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname))
    throw new Error('VPN_LOCAL_DATABASE_URL must identify a local test database')
  const admin = postgres(url, { max: 1, onnotice: () => {} })
  const sentry = postgres(url, { max: 1, onnotice: () => {} })
  const owner = randomUUID()
  const connectionId = randomUUID()
  const channelId = randomUUID()
  const broadcasterId = String(Date.now())
  const clip: ClipMetadata = {
    id: `Historical${randomUUID().replaceAll('-', '').slice(0, 16)}`,
    broadcasterId,
    creatorId: '456789',
    title: 'Clip histórico local',
    videoId: '987654',
    vodOffset: 12,
    createdAt: '2026-01-01T10:00:00.000Z',
    duration: 15.25,
    language: 'pt',
    viewCount: 42
  }
  try {
    await admin`INSERT INTO auth.users(id) VALUES (${owner})`
    await admin`INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES (${connectionId},${owner},${broadcasterId},'local-clip-proof','monitoring-v1',now())`
    await admin`INSERT INTO public.channels(id,connection_id,owner_id) VALUES (${channelId},${connectionId},${owner})`
    await admin`INSERT INTO private.provider_credentials(connection_id,ciphertext,iv,tag,key_version,expires_at,validated_at,scopes) VALUES (${connectionId},'synthetic-cipher','synthetic-iv','synthetic-tag','v1',now()+interval '1 hour',now(),ARRAY['channel:manage:clips'])`
    await sentry`SET ROLE vpn_sentry`
    const clips = createClipRepository(sentry)
    await clips.setScheduledConsent(owner, channelId, true)

    const discoveryRepository = createClipDiscoveryRepository(sentry)
    const discovery = createClipDiscoveryService(discoveryRepository, {
      getBroadcasterCreatedAt: async () => '2020-01-01T00:00:00.000Z',
      listByBroadcaster: async () => ({ items: [clip], cursor: null })
    })
    await expect(discovery.runNext()).resolves.toMatchObject({ phase: 'backfill', complete: false })
    await expect(discovery.runNext()).resolves.toMatchObject({
      phase: 'backfill',
      discovered: 1,
      complete: true
    })
    expect(await clips.list(owner, channelId)).toMatchObject({
      items: [{ clipId: clip.id, captureMode: 'scheduled', state: 'waiting_capacity' }]
    })

    const phraseService = createClipTriggerPhrasesService(createClipTriggerPhraseRepository(sentry))
    const phrase = await phraseService.create(owner, channelId, { text: 'chega de mentir' })
    const temporaryCleanup = vi.fn(async () => {})
    const processing = createClipProcessingService({
      repository: createClipProcessingRepository(sentry),
      download: async () => ({ path: '/tmp/synthetic-clip.mp4', cleanup: temporaryCleanup }),
      getOpenAiKey: async () => 'synthetic-openai-key',
      transcribe: async () => [{ startMs: 1400, endMs: 2300, text: 'Chega de mentir!' }],
      detect: detectClipPhrases
    })
    await expect(processing.processNext()).resolves.toMatchObject({
      state: 'completed',
      matches: 1
    })
    expect(temporaryCleanup).toHaveBeenCalledOnce()
    const listed = await clips.list(owner, channelId)
    const submissionId = listed.items[0]?.id
    expect(submissionId).toBeDefined()
    const detail = await clips.detail(owner, channelId, submissionId!)
    expect(detail).toMatchObject({
      clipId: clip.id,
      state: 'completed',
      detections: [
        {
          phraseId: phrase.id,
          phraseVersion: 1,
          phrase: 'chega de mentir',
          source: 'openai',
          startMs: 1400,
          endMs: 2300
        }
      ]
    })
    expect(JSON.stringify(detail)).not.toMatch(/transcript|synthetic-openai-key|synthetic-cipher/)

    await clips.setScheduledConsent(owner, channelId, false)
    await expect(discovery.runNext()).resolves.toEqual({
      phase: 'idle',
      discovered: 0,
      complete: false
    })
    expect((await clips.read(owner, channelId))?.consent.scheduledEnabled).toBe(false)
  } finally {
    await admin`DELETE FROM auth.users WHERE id=${owner}`
    await Promise.all([sentry.end(), admin.end()])
  }
}, 30000)
