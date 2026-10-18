import { expect, test } from 'vitest'
import { createTwitchClipsGateway } from '../server/utils/twitch-clips'
import { encryptTokens } from '../server/utils/token-crypto'
import type { ClipAccess } from '../server/utils/clip-repository'
const config = {
  clientId: 'client',
  encryptionKey: Buffer.alloc(32, 8).toString('base64'),
  keyVersion: 'v1'
}
const access = {
  credential: encryptTokens(
    { accessToken: 'secret', refreshToken: 'refresh' },
    config.encryptionKey,
    config.keyVersion
  )
} as ClipAccess
const clip = {
  id: 'ClipId',
  broadcaster_id: '123',
  creator_id: '456',
  title: 'Title',
  video_id: '',
  vod_offset: null,
  created_at: '2026-10-18T00:00:00Z',
  duration: 12,
  language: 'pt',
  view_count: 1,
  thumbnail_url: 'https://temporary.invalid/secret'
}
test('Helix request uses fixed official host and returns only allowed metadata', async () => {
  const gateway = createTwitchClipsGateway(config, async (url, options) => {
    expect(url).toBe('https://api.twitch.tv/helix/clips?id=ClipId')
    expect(options?.redirect).toBe('error')
    return Response.json({ data: [clip] })
  })
  const result = await gateway('ClipId', access)
  expect(result).toMatchObject({ id: 'ClipId', broadcasterId: '123', vodOffset: null })
  expect(JSON.stringify(result)).not.toMatch(/secret|temporary/)
})
test.each([401, 403, 429, 500])('sanitizes Helix HTTP %s', async (status) => {
  const gateway = createTwitchClipsGateway(
    config,
    async () => new Response('provider secret', { status })
  )
  await expect(gateway('ClipId', access)).rejects.toMatchObject({
    statusCode: status < 429 ? 403 : 503
  })
})
test('missing clip returns stable 404', async () => {
  await expect(
    createTwitchClipsGateway(config, async () => Response.json({ data: [] }))('ClipId', access)
  ).rejects.toMatchObject({ statusCode: 404 })
})
test.each([
  { ...clip, duration: -1 },
  { ...clip, vod_offset: -1 },
  { ...clip, id: 'other' },
  { ...clip, broadcaster_id: null },
  { ...clip, created_at: 'invalid' }
])('malformed provider metadata is unavailable', async (invalid) => {
  await expect(
    createTwitchClipsGateway(config, async () => Response.json({ data: [invalid] }))(
      'ClipId',
      access
    )
  ).rejects.toMatchObject({ statusCode: 503 })
})
