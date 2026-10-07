import { expect, test } from 'vitest'
import { createTwitchGateway } from '../server/utils/twitch-oauth'
const config = { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://monitor.test/callback', monitorOrigin: 'https://monitor.test', encryptionKey: '', keyVersion: 'v1' }
const identity = { client_id: 'client', user_id: '1', login: 'owner', expires_in: 3600 }
test('Twitch null scopes normalize to empty permissions for validated identity', async () => {
  const gateway = createTwitchGateway(config, async () => Response.json({ ...identity, scopes: null }))
  expect(await gateway.validate('test-token')).toEqual({ clientId: 'client', userId: '1', login: 'owner', expiresIn: 3600, scopes: [] })
})
test.each([undefined, 'channel:read', 1, {}])('malformed scopes remain rejected: %j', async scopes => {
  const gateway = createTwitchGateway(config, async () => Response.json({ ...identity, scopes }))
  await expect(gateway.validate('test-token')).rejects.toMatchObject({ statusCode: 503 })
})
test('nonempty Twitch permissions remain visible for service scope rejection', async () => {
  const gateway = createTwitchGateway(config, async () => Response.json({ ...identity, scopes: ['channel:read:subscriptions'] }))
  expect((await gateway.validate('test-token'))?.scopes).toEqual(['channel:read:subscriptions'])
})
