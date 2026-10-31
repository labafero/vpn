import { defineEventHandler, readBody } from 'h3'
import { requireVpnUser } from '../../../utils/auth'
import { FoundationError, privateResponse } from '../../../utils/api-error'
import { getOpenAiCredentialRepository } from '../../../utils/openai-credential-repository'
import { getSystemOpenAiApiKey } from '../../../utils/openai-key-selection'

export default defineEventHandler((event) =>
  privateResponse(event, async () => {
    const user = await requireVpnUser(event)
    const body = await readBody<{ apiKey?: unknown }>(event)
    const apiKey = typeof body?.apiKey === 'string' ? body.apiKey.trim() : ''
    if (!/^sk-[A-Za-z0-9_-]{20,500}$/.test(apiKey)) throw new FoundationError(400)
    await getOpenAiCredentialRepository().save(user.userId, apiKey)
    return { configured: true, systemConfigured: Boolean(getSystemOpenAiApiKey()) }
  })
)
