import { beforeEach, expect, test } from 'vitest'
import { createTwitchOAuthService } from '../server/utils/twitch-oauth'
import { FoundationError } from '../server/utils/api-error'
import type { FoundationRepository, StoredConnection, AuthorizationTransaction, Credential } from '../server/utils/private-database'

const owner = { userId: '00000000-0000-0000-0000-000000000001', role: 'member' as const }
const config = { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://monitor.test/api/sentry/provider-connections/twitch/callback', monitorOrigin: 'https://monitor.test', encryptionKey: Buffer.alloc(32, 8).toString('base64'), keyVersion: 'v1' }
let current: StoredConnection | null
let state: AuthorizationTransaction | null
let consumed: boolean
let revoked: number
let unavailable: boolean
let wrongClient: boolean
let failSave: boolean
let usedIdentity: boolean
let clock: Date
let invalidToken: boolean
let failValidate: boolean
let invalidRefresh: boolean
let refreshed: number
let service: ReturnType<typeof createTwitchOAuthService>

beforeEach(() => {
  current = null; state = null; consumed = false; revoked = 0; unavailable = false; wrongClient = false; failSave = false; usedIdentity = false
  clock = new Date('2026-10-06T12:00:00Z')
  invalidToken = false; failValidate = false; invalidRefresh = false; refreshed = 0
  let lock: Promise<unknown> = Promise.resolve()
  const repository: FoundationRepository = {
    sessionActive: async () => true,
    getRole: async () => 'member', getConnection: async () => current,
    createAuthorization: async value => { state = value },
    consumeAuthorization: async (hash, nonce, userId, now) => {
      if (consumed || !state || state.stateHash !== hash || state.nonceHash !== nonce || state.userId !== userId || state.expiresAt <= now) return false
      consumed = true; return true
    },
    saveConnection: async (userId, identity, credential, now) => {
      if (usedIdentity) throw new FoundationError(409)
      if (failSave) throw new FoundationError(503)
      current = { connection: { id: userId, provider: 'twitch', providerUserId: identity.userId, login: identity.login, status: 'connected', monitoringEnabled: false, consentVersion: 'monitoring-v1', consentedAt: now, connectedAt: now, revokedAt: null }, credential }
    },
    async withConnection(userId, operation) {
      const next = lock.then(async () => {
        const snapshot = structuredClone(current)
        try { return await operation(current, {
        setStatus: async (status, revokedAt) => { if (current) current.connection = { ...current.connection, status, revokedAt } },
        saveCredential: async (credential: Credential) => { if (current) current.credential = credential },
        deleteCredential: async () => { if (current) current.credential = null },
        audit: async () => {}
        }) } catch (error) { current = snapshot; throw error }
      })
      lock = next.catch(() => {})
      return next
    },
    listWorkUsers: async () => current ? [owner.userId] : [], cleanAuthorizations: async () => {}
  }
  service = createTwitchOAuthService(config, repository, {
    exchange: async () => {
      if (unavailable) throw new FoundationError(503)
      return { accessToken: 'private-access', refreshToken: 'private-refresh', expiresIn: 3600 }
    },
    validate: async () => {
      if (failValidate) throw new FoundationError(503)
      return invalidToken ? null : { clientId: wrongClient ? 'other' : 'client', userId: 'twitch-1', login: 'streamer', scopes: [], expiresIn: 3600 }
    },
    refresh: async () => {
      if (invalidRefresh) throw new FoundationError(401)
      refreshed++
      return { accessToken: 'refreshed-private', refreshToken: 'new-refresh', expiresIn: 3600 }
    },
    revoke: async () => { if (unavailable) throw new FoundationError(503); revoked++ }
  }, () => clock)
})

async function begin() {
  const { authorizationUrl } = await service.beginTwitchAuthorization(owner, { consentVersion: 'monitoring-v1', consentAccepted: true }, 'browser-nonce')
  return { code: 'provider-code', state: new URL(authorizationUrl).searchParams.get('state')!, browserNonce: 'browser-nonce' }
}
test('valid callback stores encrypted tokens and does not enable monitoring', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const result = await service.getTwitchConnection(owner)
  expect(result).toMatchObject({ providerUserId: 'twitch-1', monitoringEnabled: false, consentVersion: 'monitoring-v1' })
  expect(JSON.stringify(result)).not.toMatch(/private-access|refresh|ciphertext/)
  expect(JSON.stringify(current?.credential)).not.toContain('private-access')
})
test('explicit consent is required', async () => {
  await expect(service.beginTwitchAuthorization(owner, { consentVersion: 'monitoring-v1', consentAccepted: false }, 'browser-nonce')).rejects.toMatchObject({ statusCode: 400 })
  expect(state).toBeNull()
})
test.each(['missing', 'expired', 'nonce', 'user'])('rejects %s callback without storing tokens', async kind => {
  const input = await begin()
  if (kind === 'missing') input.state = ''
  if (kind === 'expired') clock = new Date(clock.getTime() + 600001)
  if (kind === 'nonce') input.browserNonce = 'other-browser'
  const user = kind === 'user' ? { ...owner, userId: 'other' } : owner
  await expect(service.completeTwitchAuthorization(user, input)).rejects.toMatchObject({ statusCode: 400 })
  expect(current).toBeNull()
})
test('concurrent callbacks consume state only once', async () => {
  const input = await begin()
  const results = await Promise.allSettled([service.completeTwitchAuthorization(owner, input), service.completeTwitchAuthorization(owner, input)])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toMatchObject({ statusCode: 400 })
})
test.each(['client', 'duplicate', 'save'])('failed %s callback revokes exchanged token', async kind => {
  const input = await begin()
  wrongClient = kind === 'client'; usedIdentity = kind === 'duplicate'; failSave = kind === 'save'
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toBeInstanceOf(FoundationError)
  expect(revoked).toBe(1)
  expect(current).toBeNull()
})
test('provider timeout never persists tokens', async () => {
  const input = await begin(); unavailable = true
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toMatchObject({ statusCode: 503 })
  expect(current).toBeNull()
})
test('disconnect is idempotent and removes credentials', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  expect(await service.disconnectTwitch(owner)).toBe('revoked')
  expect(await service.disconnectTwitch(owner)).toBe('revoked')
  expect(current?.credential).toBeNull()
  expect(revoked).toBe(1)
})
test('failed revocation blocks locally then retries on worker', async () => {
  await service.completeTwitchAuthorization(owner, await begin()); unavailable = true
  expect(await service.disconnectTwitch(owner)).toBe('revocation_pending')
  expect(current?.connection.status).toBe('revocation_pending')
  unavailable = false
  await service.validateStoredConnections(clock)
  expect(current?.credential).toBeNull()
  expect(current?.connection.status).toBe('revoked')
})
test('pending revocation credentials are removed after 24 hours', async () => {
  await service.completeTwitchAuthorization(owner, await begin()); unavailable = true
  await service.disconnectTwitch(owner)
  clock = new Date(clock.getTime() + 86400001)
  await service.validateStoredConnections(clock)
  expect(current?.credential).toBeNull()
  expect(current?.connection.status).toBe('revocation_pending')
})
test('worker records invalid token as expired', async () => {
  await service.completeTwitchAuthorization(owner, await begin()); invalidToken = true
  expect((await service.validateStoredConnections(clock)).expired).toBe(1)
  expect(current?.connection.status).toBe('expired')
})
test('concurrent workers refresh expiring token only once', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  clock = new Date(clock.getTime() + 3600000)
  await Promise.all([service.validateStoredConnections(clock), service.validateStoredConnections(clock)])
  expect(refreshed).toBe(1)
  expect(new Date(current!.credential!.expiresAt).getTime()).toBeGreaterThan(clock.getTime())
})
test('invalid refresh expires and removes credentials', async () => {
  await service.completeTwitchAuthorization(owner, await begin()); invalidRefresh = true
  clock = new Date(clock.getTime() + 3600000)
  await service.validateStoredConnections(clock)
  expect(current?.credential).toBeNull()
  expect(current?.connection.status).toBe('expired')
})
test('validation outage after refresh preserves rotated credential and counts failure', async () => {
  await service.completeTwitchAuthorization(owner, await begin()); failValidate = true
  clock = new Date(clock.getTime() + 3600000)
  expect((await service.validateStoredConnections(clock)).failed).toBe(1)
  expect(current?.connection.status).toBe('connected')
  expect(refreshed).toBe(1)
  expect(new Date(current!.credential!.expiresAt).getTime()).toBeGreaterThan(clock.getTime())
})
