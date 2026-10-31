import { readFile } from 'node:fs/promises'
import { expect, test, vi } from 'vitest'
import { createTwitchClipDownloader } from '../server/utils/clip-media'
import { encryptTokens } from '../server/utils/token-crypto'
import type { ClipProcessingJob } from '../server/utils/clip-processing'

const encryptionKey = Buffer.alloc(32, 0xab).toString('base64')
const job: ClipProcessingJob = {
  id: 'submission-1',
  ownerId: 'owner-1',
  channelId: 'channel-1',
  clipId: 'ClipId',
  canonicalUrl: 'https://clips.twitch.tv/ClipId',
  broadcasterId: '123',
  durationSeconds: 12,
  consentRevision: 'revision-1',
  credential: {
    ...encryptTokens(
      { accessToken: 'twitch-token', refreshToken: 'refresh-token' },
      encryptionKey,
      'v1'
    ),
    scopes: ['channel:manage:clips'],
    expiresAt: '2027-01-01T00:00:00.000Z',
    validatedAt: '2026-10-31T00:00:00.000Z',
    retryUntil: null
  }
}

test('downloads only the authorized clip using Twitch official metadata and a signed CDN URL', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({
        data: [
          {
            clip_id: 'ClipId',
            landscape_download_url: 'https://production.assets.clips.twitchcdn.net/signed.mp4',
            portrait_download_url: null
          }
        ]
      })
    )
    .mockResolvedValueOnce(
      new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 0, 0, 0, 0]))
    )
  const download = createTwitchClipDownloader(
    { clientId: 'client-id', encryptionKey, keyVersion: 'v1' },
    fetcher as typeof fetch
  )
  const media = await download(job)
  expect(fetcher).toHaveBeenCalledTimes(2)
  const [helixUrl, helixInit] = fetcher.mock.calls[0]!
  expect(String(helixUrl)).toContain('/helix/clips/downloads?')
  expect(String(helixUrl)).toContain('broadcaster_id=123')
  expect(String(helixUrl)).toContain('editor_id=123')
  expect(String(helixUrl)).toContain('clip_id=ClipId')
  expect((helixInit?.headers as Record<string, string>).Authorization).toBe('Bearer twitch-token')
  expect((await readFile(media.path)).byteLength).toBe(12)
  await media.cleanup()
})

test('rejects a signed URL outside the Twitch clip CDN', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      data: [
        {
          clip_id: 'ClipId',
          landscape_download_url: 'https://attacker.example/clip.mp4',
          portrait_download_url: null
        }
      ]
    })
  )
  const download = createTwitchClipDownloader(
    { clientId: 'client-id', encryptionKey, keyVersion: 'v1' },
    fetcher as typeof fetch
  )
  await expect(download(job)).rejects.toMatchObject({ code: 'clip_unavailable' })
  expect(fetcher).toHaveBeenCalledOnce()
})
