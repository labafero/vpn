import { createClipIngestionService } from './clip-ingestion'
import { getClipRepository } from './clip-repository'
import { createTwitchClipsGateway } from './twitch-clips'
export function getClipIngestionService() {
  return createClipIngestionService(
    getClipRepository(),
    createTwitchClipsGateway({
      clientId: process.env.NUXT_TWITCH_CLIENT_ID || '',
      encryptionKey: process.env.NUXT_TOKEN_ENCRYPTION_KEY || '',
      keyVersion: process.env.NUXT_TOKEN_KEY_VERSION || ''
    })
  )
}
