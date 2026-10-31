import { expect, test, vi } from 'vitest'
import { resolveOpenAiApiKey } from '../server/utils/openai-key-selection'

test('uses the system key first and does not read the personal key', async () => {
  const getPersonalKey = vi.fn(async () => 'sk-user-key')
  await expect(resolveOpenAiApiKey('sk-system-key', getPersonalKey)).resolves.toBe('sk-system-key')
  expect(getPersonalKey).not.toHaveBeenCalled()
})

test('uses the personal key when no system key is configured', async () => {
  await expect(resolveOpenAiApiKey('', async () => 'sk-user-key')).resolves.toBe('sk-user-key')
  await expect(resolveOpenAiApiKey(null, async () => null)).resolves.toBeNull()
})
