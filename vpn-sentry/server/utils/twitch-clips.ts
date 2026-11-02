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

function parseClip(r: Record<string, unknown>): ClipMetadata {
  if (
    typeof r.id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(r.id) ||
    typeof r.broadcaster_id !== 'string' ||
    !/^\d+$/.test(r.broadcaster_id) ||
    typeof r.creator_id !== 'string' ||
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
    (r.view_count as number) < 0 ||
    !(
      r.vod_offset === null ||
      (Number.isSafeInteger(r.vod_offset) &&
        (r.vod_offset as number) >= 0 &&
        (r.vod_offset as number) <= 2147483647)
    )
  )
    throw new FoundationError(503)
  return {
    id: r.id,
    broadcasterId: r.broadcaster_id,
    creatorId: r.creator_id,
    title: r.title,
    videoId: r.video_id,
    vodOffset: r.vod_offset as number | null,
    createdAt: r.created_at,
    duration: r.duration,
    language: r.language,
    viewCount: r.view_count as number
  }
}

export function createTwitchClipsGateway(
  config: { clientId: string; encryptionKey: string; keyVersion: string },
  fetcher = fetch
) {
  async function request(path: string, access: ClipAccess) {
    if (!access.credential || !config.clientId) throw new FoundationError(503)
    const token = decryptTokens(
      access.credential,
      config.encryptionKey,
      config.keyVersion
    ).accessToken
    try {
      const response = await fetcher(`https://api.twitch.tv/helix/${path}`, {
        headers: { Authorization: `Bearer ${token}`, 'Client-Id': config.clientId },
        signal: AbortSignal.timeout(10000),
        redirect: 'error'
      })
      if (response.status === 401 || response.status === 403) throw new FoundationError(403)
      if (!response.ok) throw new FoundationError(503)
      const body = await response.json()
      if (!body || typeof body !== 'object' || !Array.isArray(body.data))
        throw new FoundationError(503)
      return body as { data: unknown[]; pagination?: { cursor?: unknown } }
    } catch (error) {
      throw error instanceof FoundationError ? error : new FoundationError(503)
    }
  }
  return {
    async getById(id: string, access: ClipAccess): Promise<ClipMetadata> {
      const body = await request(`clips?id=${encodeURIComponent(id)}`, access)
      if (body.data.length === 0) throw new FoundationError(404)
      if (body.data.length !== 1 || !body.data[0] || typeof body.data[0] !== 'object')
        throw new FoundationError(503)
      const clip = parseClip(body.data[0] as Record<string, unknown>)
      if (clip.id !== id) throw new FoundationError(503)
      return clip
    },
    async listByBroadcaster(input: {
      access: ClipAccess
      startedAt: string
      endedAt: string
      after?: string | null
    }): Promise<{ items: ClipMetadata[]; cursor: string | null }> {
      const started = Date.parse(input.startedAt)
      const ended = Date.parse(input.endedAt)
      if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started)
        throw new FoundationError(400)
      const params = new URLSearchParams({
        broadcaster_id: input.access.broadcasterId,
        first: '100',
        started_at: new Date(started).toISOString(),
        ended_at: new Date(ended).toISOString()
      })
      if (input.after) params.set('after', input.after)
      const body = await request(`clips?${params.toString()}`, input.access)
      const items = body.data.map((row) => {
        if (!row || typeof row !== 'object') throw new FoundationError(503)
        const clip = parseClip(row as Record<string, unknown>)
        if (clip.broadcasterId !== input.access.broadcasterId) throw new FoundationError(503)
        return clip
      })
      const cursor = body.pagination?.cursor
      if (cursor !== undefined && typeof cursor !== 'string') throw new FoundationError(503)
      return { items, cursor: (cursor as string | undefined) ?? null }
    },
    async getBroadcasterCreatedAt(access: ClipAccess): Promise<string> {
      const body = await request(`users?id=${encodeURIComponent(access.broadcasterId)}`, access)
      const user = body.data[0]
      const createdAt =
        user && typeof user === 'object' ? (user as Record<string, unknown>).created_at : null
      if (
        body.data.length !== 1 ||
        !user ||
        typeof user !== 'object' ||
        (user as Record<string, unknown>).id !== access.broadcasterId ||
        typeof createdAt !== 'string' ||
        !Number.isFinite(Date.parse(createdAt))
      )
        throw new FoundationError(503)
      return createdAt as string
    }
  }
}
