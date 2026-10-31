import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { decryptTokens } from './token-crypto'
import { ClipProcessingFailure, type ClipProcessingJob } from './clip-processing'
import { MAX_TRANSCRIPTION_BYTES } from './openai-transcriber'

async function readBounded(response: Response) {
  const declared = Number(response.headers.get('content-length') || 0)
  if (declared > MAX_TRANSCRIPTION_BYTES) throw new ClipProcessingFailure('invalid_media', false)
  if (!response.body) throw new ClipProcessingFailure('invalid_media', false)
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_TRANSCRIPTION_BYTES) {
        await reader.cancel()
        throw new ClipProcessingFailure('invalid_media', false)
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, total)
}

export function createTwitchClipDownloader(
  config: { clientId: string; encryptionKey: string; keyVersion: string },
  fetcher: typeof fetch = fetch
) {
  return async (job: ClipProcessingJob) => {
    if (
      !config.clientId ||
      !job.credential.scopes?.includes('channel:manage:clips') ||
      Date.parse(job.credential.expiresAt) <= Date.now()
    )
      throw new ClipProcessingFailure('clip_unavailable', false)
    let accessToken: string
    try {
      accessToken = decryptTokens(
        job.credential,
        config.encryptionKey,
        config.keyVersion
      ).accessToken
    } catch {
      throw new ClipProcessingFailure('provider_error', false)
    }

    const query = new URLSearchParams({
      broadcaster_id: job.broadcasterId,
      editor_id: job.broadcasterId,
      clip_id: job.clipId
    })
    let metadataResponse: Response
    try {
      metadataResponse = await fetcher(`https://api.twitch.tv/helix/clips/downloads?${query}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Client-Id': config.clientId
        },
        signal: AbortSignal.timeout(15_000),
        redirect: 'error'
      })
    } catch {
      throw new ClipProcessingFailure('provider_error', true)
    }
    if (!metadataResponse.ok)
      throw new ClipProcessingFailure(
        metadataResponse.status === 404 ? 'clip_unavailable' : 'provider_error',
        metadataResponse.status >= 500
      )

    let payload: unknown
    try {
      payload = await metadataResponse.json()
    } catch {
      throw new ClipProcessingFailure('provider_error', true)
    }
    const data = (payload as { data?: unknown })?.data
    if (!Array.isArray(data) || data.length !== 1 || data[0]?.clip_id !== job.clipId)
      throw new ClipProcessingFailure('clip_unavailable', false)
    const signedUrl = data[0]?.landscape_download_url
    let mediaUrl: URL
    try {
      mediaUrl = new URL(signedUrl)
    } catch {
      throw new ClipProcessingFailure('clip_unavailable', false)
    }
    if (
      mediaUrl.protocol !== 'https:' ||
      mediaUrl.hostname !== 'production.assets.clips.twitchcdn.net' ||
      mediaUrl.username ||
      mediaUrl.password
    )
      throw new ClipProcessingFailure('clip_unavailable', false)

    let mediaResponse: Response
    try {
      mediaResponse = await fetcher(mediaUrl, {
        signal: AbortSignal.timeout(30_000),
        redirect: 'error'
      })
    } catch {
      throw new ClipProcessingFailure('clip_unavailable', true)
    }
    if (!mediaResponse.ok)
      throw new ClipProcessingFailure('clip_unavailable', mediaResponse.status >= 500)
    const bytes = await readBounded(mediaResponse)
    if (bytes.byteLength < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp')
      throw new ClipProcessingFailure('invalid_media', false)

    const directory = await mkdtemp(path.join(os.tmpdir(), 'vpn-clip-'))
    const mediaPath = path.join(directory, 'clip.mp4')
    try {
      await writeFile(mediaPath, bytes, { flag: 'wx', mode: 0o600 })
    } catch {
      await rm(directory, { recursive: true, force: true })
      throw new ClipProcessingFailure('provider_error', true)
    }
    return {
      path: mediaPath,
      cleanup: () => rm(directory, { recursive: true, force: true })
    }
  }
}
