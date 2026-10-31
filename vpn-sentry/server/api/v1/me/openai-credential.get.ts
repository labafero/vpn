import { defineEventHandler } from 'h3'
import { requireVpnUser } from '../../../utils/auth'
import { privateResponse } from '../../../utils/api-error'
import { getOpenAiCredentialRepository } from '../../../utils/openai-credential-repository'
import { getSystemOpenAiApiKey } from '../../../utils/openai-key-selection'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    return {
      configured: await getOpenAiCredentialRepository().has(user.userId),
      systemConfigured: Boolean(getSystemOpenAiApiKey())
    }
  })
)
