import { beforeEach, expect, test } from 'vitest'
import { createTwitchOAuthService } from '../server/utils/twitch-oauth'
import { FoundationError } from '../server/utils/api-error'
import type {
  FoundationRepository,
  StoredConnection,
  AuthorizationTransaction,
  Credential
} from '../server/utils/private-database'

const owner = { userId: '00000000-0000-0000-0000-000000000001', role: 'member' as const }
const config = {
  clientId: 'client',
  clientSecret: 'secret',
  redirectUri: 'https://monitor.test/api/sentry/provider-connections/twitch/callback',
  monitorOrigin: 'https://monitor.test',
  encryptionKey: Buffer.alloc(32, 8).toString('base64'),
  keyVersion: 'v1'
}
let current: StoredConnection | null
let state: AuthorizationTransaction | null
let transactions: Map<string, AuthorizationTransaction>
let consumedStates: Set<string>
let exchangeWait: (() => Promise<void>) | undefined
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
let scopes: string[]
let providerUserId: string
let service: ReturnType<typeof createTwitchOAuthService>

beforeEach(() => {
  current = null
  state = null
  transactions = new Map()
  consumedStates = new Set()
  exchangeWait = undefined
  revoked = 0
  unavailable = false
  wrongClient = false
  failSave = false
  usedIdentity = false
  clock = new Date('2026-10-06T12:00:00Z')
  invalidToken = false
  failValidate = false
  invalidRefresh = false
  refreshed = 0
  scopes = []
  providerUserId = 'twitch-1'
  let lock: Promise<unknown> = Promise.resolve()
  const repository: FoundationRepository = {
    sessionActive: async () => true,
    getRole: async () => 'member',
    getConnection: async () => current,
    createAuthorization: async (value) => {
      state = value
      transactions.set(value.stateHash, value)
    },
    consumeAuthorization: async (hash, nonce, userId, now) => {
      const transaction = transactions.get(hash)
      if (
        consumedStates.has(hash) ||
        !transaction ||
        transaction.nonceHash !== nonce ||
        transaction.userId !== userId ||
        transaction.expiresAt <= now
      )
        return null
      consumedStates.add(hash)
      return transaction
    },
    saveConnection: async (userId, identity, credential, now) => {
      if (usedIdentity) throw new FoundationError(409)
      if (failSave) throw new FoundationError(503)
      current = {
        connection: {
          id: userId,
          provider: 'twitch',
          providerUserId: identity.userId,
          login: identity.login,
          status: 'connected',
          monitoringEnabled: false,
          canReconnect: false,
          consentVersion: 'monitoring-v1',
          consentedAt: now,
          connectedAt: now,
          revokedAt: null
        },
        credential
      }
    },
    async withConnection(userId, operation) {
      const next = lock.then(async () => {
        const snapshot = structuredClone(current)
        try {
          return await operation(current, {
            setStatus: async (status, revokedAt) => {
              if (current) current.connection = { ...current.connection, status, revokedAt }
            },
            saveCredential: async (credential: Credential) => {
              if (current) current.credential = credential
            },
            deleteCredential: async () => {
              if (current) current.credential = null
            },
            audit: async () => {}
          })
        } catch (error) {
          current = snapshot
          throw error
        }
      })
      lock = next.catch(() => {})
      return next
    },
    listWorkUsers: async () => (current ? [owner.userId] : []),
    recordWorkAttempt: async () => {}
  }
  service = createTwitchOAuthService(
    config,
    repository,
    {
      exchange: async () => {
        if (exchangeWait) await exchangeWait()
        if (unavailable) throw new FoundationError(503)
        return { accessToken: 'private-access', refreshToken: 'private-refresh', expiresIn: 3600 }
      },
      validate: async () => {
        if (failValidate) throw new FoundationError(503)
        return invalidToken
          ? null
          : {
              clientId: wrongClient ? 'other' : 'client',
              userId: providerUserId,
              login: 'streamer',
              scopes,
              expiresIn: 3600
            }
      },
      refresh: async () => {
        if (invalidRefresh) throw new FoundationError(401)
        refreshed++
        return { accessToken: 'refreshed-private', refreshToken: 'new-refresh', expiresIn: 3600 }
      },
      revoke: async () => {
        if (unavailable) throw new FoundationError(503)
        revoked++
      }
    },
    () => clock
  )
})

async function begin() {
  const { authorizationUrl } = await service.beginTwitchAuthorization(
    owner,
    { consentVersion: 'monitoring-v1', consentAccepted: true },
    'browser-nonce'
  )
  return {
    code: 'provider-code',
    state: new URL(authorizationUrl).searchParams.get('state')!,
    browserNonce: 'browser-nonce'
  }
}
test('valid callback stores encrypted tokens and does not enable monitoring', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const result = await service.getTwitchConnection(owner)
  expect(result).toMatchObject({
    providerUserId: 'twitch-1',
    monitoringEnabled: false,
    consentVersion: 'monitoring-v1'
  })
  expect(JSON.stringify(result)).not.toMatch(/private-access|refresh|ciphertext/)
  expect(JSON.stringify(current?.credential)).not.toContain('private-access')
})
test('exhausted scheduler budget defers work without changing credentials', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const credential = structuredClone(current?.credential)
  expect(await service.validateStoredConnections(clock, { maxDurationMs: 0 })).toEqual({
    checked: 0,
    expired: 0,
    failed: 0,
    deferred: 1
  })
  expect(current?.credential).toEqual(credential)
})

test('explicit consent is required', async () => {
  await expect(
    service.beginTwitchAuthorization(
      owner,
      { consentVersion: 'monitoring-v1', consentAccepted: false },
      'browser-nonce'
    )
  ).rejects.toMatchObject({ statusCode: 400 })
  expect(state).toBeNull()
})
test.each(['missing', 'expired', 'nonce', 'user'])(
  'rejects %s callback without storing tokens',
  async (kind) => {
    const input = await begin()
    if (kind === 'missing') input.state = ''
    if (kind === 'expired') clock = new Date(clock.getTime() + 600001)
    if (kind === 'nonce') input.browserNonce = 'other-browser'
    const user = kind === 'user' ? { ...owner, userId: 'other' } : owner
    await expect(service.completeTwitchAuthorization(user, input)).rejects.toMatchObject({
      statusCode: 400
    })
    expect(current).toBeNull()
  }
)
test('concurrent callbacks consume state only once', async () => {
  const input = await begin()
  const results = await Promise.allSettled([
    service.completeTwitchAuthorization(owner, input),
    service.completeTwitchAuthorization(owner, input)
  ])
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toMatchObject({
    statusCode: 400
  })
})
test.each(['client', 'duplicate', 'save'])(
  'failed %s callback revokes exchanged token',
  async (kind) => {
    const input = await begin()
    wrongClient = kind === 'client'
    usedIdentity = kind === 'duplicate'
    failSave = kind === 'save'
    await expect(service.completeTwitchAuthorization(owner, input)).rejects.toBeInstanceOf(
      FoundationError
    )
    expect(revoked).toBe(1)
    expect(current).toBeNull()
  }
)
test('provider timeout never persists tokens', async () => {
  const input = await begin()
  unavailable = true
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toMatchObject({
    statusCode: 503
  })
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
  await service.completeTwitchAuthorization(owner, await begin())
  unavailable = true
  expect(await service.disconnectTwitch(owner)).toBe('revocation_pending')
  expect(current?.connection.status).toBe('revocation_pending')
  unavailable = false
  await service.validateStoredConnections(clock)
  expect(current?.credential).toBeNull()
  expect(current?.connection.status).toBe('revoked')
})
test('pending revocation credentials are removed after 24 hours', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  unavailable = true
  await service.disconnectTwitch(owner)
  clock = new Date(clock.getTime() + 86400001)
  await service.validateStoredConnections(clock)
  expect(current?.credential).toBeNull()
  expect(current?.connection.status).toBe('revocation_pending')
})
test('worker records invalid token as expired', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  invalidToken = true
  expect((await service.validateStoredConnections(clock)).expired).toBe(1)
  expect(current?.connection.status).toBe('expired')
})
test('concurrent workers refresh expiring token only once', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  clock = new Date(clock.getTime() + 3600000)
  await Promise.all([
    service.validateStoredConnections(clock),
    service.validateStoredConnections(clock)
  ])
  expect(refreshed).toBe(1)
  expect(new Date(current!.credential!.expiresAt).getTime()).toBeGreaterThan(clock.getTime())
})
test('invalid refresh expires and retains encrypted access token for explicit revocation', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  invalidRefresh = true
  clock = new Date(clock.getTime() + 3600000)
  await service.validateStoredConnections(clock)
  expect(current?.credential).not.toBeNull()
  expect(current?.connection.status).toBe('expired')
})
test('invalid refresh allows explicit disconnect and new authorization', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  invalidRefresh = true
  clock = new Date(clock.getTime() + 3600000)
  await service.validateStoredConnections(clock)
  expect(await service.disconnectTwitch(owner)).toBe('revoked')
  expect(await service.disconnectTwitch(owner)).toBe('revoked')
  invalidRefresh = false
  await service.completeTwitchAuthorization(owner, await begin())
  expect((await service.getTwitchConnection(owner))?.status).toBe('connected')
})
test('revocation deadline allows fresh consent without claiming remote revocation', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  unavailable = true
  await service.disconnectTwitch(owner)
  clock = new Date(clock.getTime() + 86400001)
  await service.validateStoredConnections(clock)
  expect((await service.getTwitchConnection(owner))?.status).toBe('revocation_pending')
  expect((await service.getTwitchConnection(owner))?.canReconnect).toBe(true)
  unavailable = false
  await service.completeTwitchAuthorization(owner, await begin())
  expect((await service.getTwitchConnection(owner))?.status).toBe('connected')
})
test('validation outage after refresh preserves rotated credential and counts failure', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  failValidate = true
  clock = new Date(clock.getTime() + 3600000)
  expect((await service.validateStoredConnections(clock)).failed).toBe(1)
  expect(current?.connection.status).toBe('connected')
  expect(refreshed).toBe(1)
  expect(new Date(current!.credential!.expiresAt).getTime()).toBeGreaterThan(clock.getTime())
})

async function upgrade() {
  const { authorizationUrl } = await service.beginTwitchAuthorization(
    owner,
    {
      consentVersion: 'clip-processing-v1',
      consentAccepted: true,
      capabilities: ['clip_download']
    },
    'browser-nonce'
  )
  expect(new URL(authorizationUrl).searchParams.get('scope')).toBe('channel:manage:clips')
  return {
    code: 'upgrade-code',
    state: new URL(authorizationUrl).searchParams.get('state')!,
    browserNonce: 'browser-nonce'
  }
}
test('upgrade persists validated scopes and periodic refresh preserves the connection', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const connection = structuredClone(current!.connection)
  const input = await upgrade()
  scopes = ['channel:manage:clips']
  await service.completeTwitchAuthorization(owner, input)
  expect(current!.credential!.scopes).toEqual(scopes)
  expect(current!.connection).toEqual(connection)
  clock = new Date(clock.getTime() + 3600000)
  expect((await service.validateStoredConnections(clock)).expired).toBe(0)
  expect(current!.credential!.scopes).toEqual(scopes)
})
test.each(['identity', 'client', 'scope', 'disconnect'])(
  'failed upgrade %s preserves the existing credential',
  async (kind) => {
    await service.completeTwitchAuthorization(owner, await begin())
    const input = await upgrade()
    const previous = structuredClone(current)
    scopes = kind === 'scope' ? [] : ['channel:manage:clips']
    if (kind === 'identity') providerUserId = 'other'
    if (kind === 'client') wrongClient = true
    if (kind === 'disconnect') current!.connection.status = 'revoked'
    await expect(service.completeTwitchAuthorization(owner, input)).rejects.toBeInstanceOf(
      FoundationError
    )
    expect(current!.credential).toEqual(previous!.credential)
    // Twitch may return the token already in use. Never revoke it on a failed upgrade.
    expect(revoked).toBe(0)
  }
)
test('OAuth refusal consumes state while preserving existing connection', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const input = await upgrade()
  const previous = structuredClone(current)
  await service.cancelTwitchAuthorization(owner, input)
  expect(current).toEqual(previous)
  await expect(service.completeTwitchAuthorization(owner, input)).rejects.toMatchObject({
    statusCode: 400
  })
})
test('arbitrary scopes and premature clip creation cannot begin authorization', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  for (const capabilities of [['channel:manage:clips'], ['clip_create'], []]) {
    await expect(
      service.beginTwitchAuthorization(
        owner,
        {
          consentVersion: 'clip-processing-v1',
          consentAccepted: true,
          capabilities
        },
        'browser-nonce'
      )
    ).rejects.toMatchObject({ statusCode: 400 })
  }
})

test('concurrent distinct upgrades cannot overwrite a newly saved credential', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const first = await upgrade()
  // Keep independently issued transactions, as the database does.
  const firstState = structuredClone(state)
  const second = await upgrade()
  scopes = ['channel:manage:clips']
  await service.completeTwitchAuthorization(owner, second)
  state = firstState
  await expect(service.completeTwitchAuthorization(owner, first)).rejects.toMatchObject({
    statusCode: 409
  })
  expect(current!.credential!.scopes).toEqual(scopes)
  expect(revoked).toBe(0)
})

test('overlapping upgrade callbacks serialize and preserve the winning token', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const first = await upgrade()
  const second = await upgrade()
  scopes = ['channel:manage:clips']
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered = 0
  let bothEntered!: () => void
  const both = new Promise<void>((resolve) => {
    bothEntered = resolve
  })
  exchangeWait = async () => {
    if (++entered === 2) bothEntered()
    await gate
  }
  const results = Promise.allSettled([
    service.completeTwitchAuthorization(owner, first),
    service.completeTwitchAuthorization(owner, second)
  ])
  await both
  release()
  const settled = await results
  expect(settled.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
  expect(current!.credential!.scopes).toEqual(scopes)
  expect(revoked).toBe(0)
})
test('disconnect overlapping token exchange cannot be undone by callback', async () => {
  await service.completeTwitchAuthorization(owner, await begin())
  const input = await upgrade()
  scopes = ['channel:manage:clips']
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let entered!: () => void
  const started = new Promise<void>((resolve) => {
    entered = resolve
  })
  exchangeWait = async () => {
    entered()
    await gate
  }
  const completed = service.completeTwitchAuthorization(owner, input)
  const rejected = expect(completed).rejects.toMatchObject({ statusCode: 409 })
  await started
  await service.disconnectTwitch(owner)
  release()
  await rejected
  expect(current!.credential).toBeNull()
  expect(current!.connection.status).toBe('revoked')
})
