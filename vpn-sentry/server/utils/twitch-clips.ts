import { FoundationError } from './api-error'
import type { ClipAccess } from './clip-repository'
import { decryptTokens } from './token-crypto'
export type ClipMetadata = {
  id: string
  broadcasterId: string
  creatorId: string
  title: string
  videoId: string
  vodOffset: number | null
  createdAt: string
  duration: number
  language: string
  viewCount: number
}
export function createTwitchClipsGateway(
  config: { clientId: string; encryptionKey: string; keyVersion: string },
  fetcher = fetch
) {
  return async (id: string, access: ClipAccess): Promise<ClipMetadata> => {
    if (!access.credential || !config.clientId) throw new FoundationError(503)
    const token = decryptTokens(
      access.credential,
      config.encryptionKey,
      config.keyVersion
    ).accessToken
    try {
      const response = await fetcher(
        `https://api.twitch.tv/helix/clips?id=${encodeURIComponent(id)}`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Client-Id': config.clientId },
          signal: AbortSignal.timeout(10000),
          redirect: 'error'
        }
      )
      if (response.status === 401 || response.status === 403) throw new FoundationError(403)
      if (!response.ok) throw new FoundationError(503)
      const body = await response.json()
      if (!Array.isArray(body.data)) throw new FoundationError(503)
      if (body.data.length === 0) throw new FoundationError(404)
      const r = body.data[0]
      if (
        body.data.length !== 1 ||
        !r ||
        r.id !== id ||
        !/^\d+$/.test(r.broadcaster_id) ||
        !/^\d+$/.test(r.creator_id) ||
        typeof r.title !== 'string' ||
        r.title.length > 10000 ||
        typeof r.video_id !== 'string' ||
        !/^\d*$/.test(r.video_id) ||
        typeof r.created_at !== 'string' ||
        !Number.isFinite(Date.parse(r.created_at)) ||
        typeof r.duration !== 'number' ||
        !Number.isFinite(r.duration) ||
        r.duration < 0 ||
        r.duration >= 100000 ||
        typeof r.language !== 'string' ||
        r.language.length < 2 ||
        r.language.length > 12 ||
        !Number.isSafeInteger(r.view_count) ||
        r.view_count < 0 ||
        !(
          r.vod_offset === null ||
          (Number.isSafeInteger(r.vod_offset) && r.vod_offset >= 0 && r.vod_offset <= 2147483647)
        )
      )
        throw new FoundationError(503)
      return {
        id: r.id,
        broadcasterId: r.broadcaster_id,
        creatorId: r.creator_id,
        title: r.title,
        videoId: r.video_id,
        vodOffset: r.vod_offset,
        createdAt: r.created_at,
        duration: r.duration,
        language: r.language,
        viewCount: r.view_count
      }
    } catch (error) {
      throw error instanceof FoundationError ? error : new FoundationError(503)
    }
  }
}
