export type ClipStageEvent = {
  event: 'clip.stage' | 'clip.debug'
  stage:
    | 'manual_retry'
    | 'twitch_captions'
    | 'detection_persistence'
    | 'openai_key'
    | 'openai_transcription'
    | 'twitch_metadata'
    | 'twitch_media'
    | 'clip_discovery'
  outcome: 'started' | 'selected' | 'succeeded' | 'failed'
  submissionId?: string
  clipId?: string
  attempt?: number
  keySource?: 'system' | 'owner'
  model?: string
  httpStatus?: number
  providerCode?: string
  providerType?: string
  providerRequestId?: string
  failureCode?: string
  diagnosticCode?: string
  mediaVariant?: 'landscape' | 'portrait'
  mediaHostname?: string
  mediaUrlProtocol?: string
  mediaUrlHasCredentials?: boolean
  landscapeUrlAvailable?: boolean
  portraitUrlAvailable?: boolean
  durationMs?: number
  matches?: number
  startedAt?: string
  endedAt?: string
  resultCount?: number
  cursorPresent?: boolean
  audioBytes?: number
  segmentCount?: number
}

export function logClipStage(event: ClipStageEvent) {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), ...event }))
}

export function logClipDebug(event: Omit<ClipStageEvent, 'event'>) {
  if (process.env.NUXT_CLIP_DEBUG === 'true') logClipStage({ ...event, event: 'clip.debug' })
}
