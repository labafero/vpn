import { createClipIngestionService } from './clip-ingestion'
import { getClipRepository } from './clip-repository'
import { createTwitchClipsGateway } from './twitch-clips'
import { createClipProcessingService } from './clip-processing'
import { getClipProcessingRepository } from './clip-processing-repository'
import { createTwitchClipDownloader } from './clip-media'
import { createOpenAiTranscriber } from './openai-transcriber'
import { getOpenAiCredentialRepository } from './openai-credential-repository'
import { getSystemOpenAiApiKey, resolveOpenAiApiKey } from './openai-key-selection'
import { detectClipPhrases } from './clip-detection'
import { readFile } from 'node:fs/promises'
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

export function getClipProcessingService() {
  const config = {
    clientId: process.env.NUXT_TWITCH_CLIENT_ID || '',
    encryptionKey: process.env.NUXT_TOKEN_ENCRYPTION_KEY || '',
    keyVersion: process.env.NUXT_TOKEN_KEY_VERSION || ''
  }
  const transcribe = createOpenAiTranscriber()
  return createClipProcessingService({
    repository: getClipProcessingRepository(),
    download: createTwitchClipDownloader(config),
    getOpenAiKey: (ownerId) =>
      resolveOpenAiApiKey(getSystemOpenAiApiKey(), () =>
        getOpenAiCredentialRepository().getForProcessing(ownerId)
      ),
    transcribe: async ({ path, clipId, apiKey }) => {
      void clipId
      return transcribe(await readFile(path), apiKey)
    },
    detect: detectClipPhrases,
    maxAttempts: 3
  })
}
