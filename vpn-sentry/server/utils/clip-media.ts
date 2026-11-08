import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { decryptTokens } from './token-crypto'
import { ClipProcessingFailure, type ClipProcessingJob } from './clip-processing'
import { MAX_TRANSCRIPTION_BYTES } from './openai-transcriber'
import { logClipStage, type ClipStageEvent } from './clip-logging'

function providerRequestId(response: Response) {
  const value = response.headers.get('x-request-id')
  return value && /^[\w.-]{1,128}$/.test(value) ? value : undefined
}

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
  config: {
    clientId: string
    encryptionKey: string
    keyVersion: string
    debug?: boolean
    logEvent?: (event: ClipStageEvent) => void
  },
  fetcher: typeof fetch = fetch
) {
  const debug = config.debug ?? process.env.NUXT_CLIP_DEBUG === 'true'
  const logEvent = config.logEvent ?? logClipStage
  const logDiagnostic = (event: ClipStageEvent) => {
    if (debug) logEvent(event)
  }

  return async (job: ClipProcessingJob) => {
    if (
      !config.clientId ||
      !job.credential.scopes?.includes('channel:manage:clips') ||
      Date.parse(job.credential.expiresAt) <= Date.now()
    )
      throw new ClipProcessingFailure('clip_unavailable', false, {
        diagnosticCode: 'twitch_download_precondition_failed'
      })
    let accessToken: string
    try {
      accessToken = decryptTokens(
        job.credential,
        config.encryptionKey,
        config.keyVersion
      ).accessToken
    } catch {
      throw new ClipProcessingFailure('provider_error', false, {
        diagnosticCode: 'twitch_token_decryption_failed'
      })
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
      throw new ClipProcessingFailure('provider_error', true, {
        diagnosticCode: 'twitch_download_metadata_network_error'
      })
    }
    if (!metadataResponse.ok) {
      throw new ClipProcessingFailure(
        metadataResponse.status === 404 ? 'clip_unavailable' : 'provider_error',
        metadataResponse.status >= 500,
        {
          httpStatus: metadataResponse.status,
          providerRequestId: providerRequestId(metadataResponse),
          diagnosticCode: 'twitch_download_metadata_http_error'
        }
      )
    }

    let payload: unknown
    try {
      payload = await metadataResponse.json()
    } catch {
      throw new ClipProcessingFailure('provider_error', true, {
        httpStatus: metadataResponse.status,
        providerRequestId: providerRequestId(metadataResponse),
        diagnosticCode: 'twitch_download_metadata_invalid_json'
      })
    }
    const data = (payload as { data?: unknown })?.data
    if (!Array.isArray(data) || data.length !== 1 || data[0]?.clip_id !== job.clipId) {
      throw new ClipProcessingFailure('clip_unavailable', false, {
        httpStatus: metadataResponse.status,
        providerRequestId: providerRequestId(metadataResponse),
        diagnosticCode: 'twitch_download_metadata_clip_mismatch'
      })
    }
    const landscapeUrl = data[0]?.landscape_download_url
    const portraitUrl = data[0]?.portrait_download_url
    const landscapeUrlAvailable = typeof landscapeUrl === 'string' && landscapeUrl.length > 0
    const portraitUrlAvailable = typeof portraitUrl === 'string' && portraitUrl.length > 0
    const mediaVariant = landscapeUrlAvailable
      ? 'landscape'
      : portraitUrlAvailable
        ? 'portrait'
        : undefined
    const signedUrl = mediaVariant === 'landscape' ? landscapeUrl : portraitUrl
    logDiagnostic({
      event: 'clip.stage',
      stage: 'twitch_media',
      outcome: mediaVariant ? 'selected' : 'failed',
      submissionId: job.id,
      clipId: job.clipId,
      mediaVariant,
      landscapeUrlAvailable,
      portraitUrlAvailable,
      ...(!mediaVariant ? { diagnosticCode: 'twitch_download_urls_unavailable' } : {})
    })
    if (!mediaVariant)
      throw new ClipProcessingFailure('clip_unavailable', false, {
        httpStatus: metadataResponse.status,
        providerRequestId: providerRequestId(metadataResponse),
        diagnosticCode: 'twitch_download_urls_unavailable'
      })
    let mediaUrl: URL
    try {
      mediaUrl = new URL(signedUrl)
    } catch {
      throw new ClipProcessingFailure('clip_unavailable', false, {
        diagnosticCode: 'twitch_download_url_invalid',
        mediaVariant
      })
    }
    if (
      mediaUrl.protocol !== 'https:' ||
      mediaUrl.hostname !== 'production.assets.clips.twitchcdn.net' ||
      mediaUrl.username ||
      mediaUrl.password
    )
      throw new ClipProcessingFailure('clip_unavailable', false, {
        diagnosticCode: 'twitch_download_url_host_rejected',
        mediaVariant
      })

    let mediaResponse: Response
    try {
      mediaResponse = await fetcher(mediaUrl, {
        signal: AbortSignal.timeout(30_000),
        redirect: 'error'
      })
    } catch {
      throw new ClipProcessingFailure('clip_unavailable', true, {
        diagnosticCode: 'twitch_cdn_network_error',
        mediaVariant
      })
    }
    if (!mediaResponse.ok) {
      throw new ClipProcessingFailure('clip_unavailable', mediaResponse.status >= 500, {
        httpStatus: mediaResponse.status,
        diagnosticCode: 'twitch_cdn_http_error',
        mediaVariant
      })
    }
    let bytes: Buffer
    try {
      bytes = await readBounded(mediaResponse)
    } catch (error) {
      if (error instanceof ClipProcessingFailure)
        throw new ClipProcessingFailure(error.code, error.retryable, {
          httpStatus: mediaResponse.status,
          diagnosticCode:
            error.code === 'invalid_media'
              ? 'twitch_cdn_media_too_large_or_empty'
              : 'twitch_cdn_read_failed',
          mediaVariant
        })
      throw new ClipProcessingFailure('provider_error', true, {
        httpStatus: mediaResponse.status,
        diagnosticCode: 'twitch_cdn_read_failed',
        mediaVariant
      })
    }
    if (bytes.byteLength < 12 || bytes.toString('ascii', 4, 8) !== 'ftyp')
      throw new ClipProcessingFailure('invalid_media', false, {
        diagnosticCode: 'twitch_cdn_invalid_mp4',
        mediaVariant
      })

    const directory = await mkdtemp(path.join(os.tmpdir(), 'vpn-clip-'))
    const mediaPath = path.join(directory, 'clip.mp4')
    try {
      await writeFile(mediaPath, bytes, { flag: 'wx', mode: 0o600 })
    } catch {
      await rm(directory, { recursive: true, force: true })
      throw new ClipProcessingFailure('provider_error', true, {
        diagnosticCode: 'twitch_media_temp_write_failed'
      })
    }
    return {
      path: mediaPath,
      cleanup: () => rm(directory, { recursive: true, force: true })
    }
  }
}
