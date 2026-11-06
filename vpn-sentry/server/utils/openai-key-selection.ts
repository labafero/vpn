export type OpenAiKeySource = 'system' | 'owner'
export type OpenAiCredential = { apiKey: string; source: OpenAiKeySource }

export function getSystemOpenAiApiKey() {
  return process.env.NUXT_OPENAI_API_KEY?.trim() || null
}

export async function resolveOpenAiApiKey(
  systemKey: string | null | undefined,
  getPersonalKey: () => Promise<string | null>
) {
  const system = systemKey?.trim()
  if (system) return { apiKey: system, source: 'system' } satisfies OpenAiCredential
  const personal = await getPersonalKey()
  return personal ? ({ apiKey: personal, source: 'owner' } satisfies OpenAiCredential) : null
}
