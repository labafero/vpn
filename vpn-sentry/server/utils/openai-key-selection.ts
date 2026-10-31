export function getSystemOpenAiApiKey() {
  return process.env.NUXT_OPENAI_API_KEY?.trim() || null
}

export async function resolveOpenAiApiKey(
  systemKey: string | null | undefined,
  getPersonalKey: () => Promise<string | null>
) {
  return systemKey?.trim() || (await getPersonalKey())
}
