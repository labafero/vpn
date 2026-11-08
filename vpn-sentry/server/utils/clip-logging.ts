export type ClipStageEvent = {
  event: 'clip.stage'
  stage:
    | 'manual_retry'
    | 'twitch_captions'
    | 'detection_persistence'
    | 'openai_key'
    | 'openai_transcription'
    | 'twitch_metadata'
    | 'twitch_media'
  outcome: 'started' | 'selected' | 'succeeded' | 'failed'
  submissionId?: string
  clipId?: string
  attempt?: number
  keySource?: 'system' | 'owner'
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
}

export function logClipStage(event: ClipStageEvent) {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), ...event }))
}
