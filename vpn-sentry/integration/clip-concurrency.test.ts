import { randomUUID } from 'node:crypto'
import type postgres from 'postgres'
import { expect, test, vi } from 'vitest'
import { createClipRepository } from '../server/utils/clip-repository'
import { createClipIngestionService } from '../server/utils/clip-ingestion'
import { getFoundationRepository, closePrivateDatabase } from '../server/utils/private-database'
import { createTwitchOAuthService } from '../server/utils/twitch-oauth'
import { encryptTokens } from '../server/utils/token-crypto'
const fixture = vi.hoisted(() => ({ sql: undefined as unknown }))
vi.mock('postgres', () => ({ default: () => fixture.sql }))

test('local PostgreSQL serializes two Sentry connections across duplicates, consent and OAuth withdrawal', async () => {
  const url = process.env.VPN_LOCAL_DATABASE_URL
  if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname))
    throw new Error('VPN_LOCAL_DATABASE_URL must identify a local test database')
  const { default: connect } = await vi.importActual<{ default: typeof postgres }>('postgres')
  const admin = connect(url, { max: 1, onnotice: () => {} })
  const first = connect(url, { max: 1, onnotice: () => {} })
  const second = connect(url, { max: 1, onnotice: () => {} })
  const owner = randomUUID(),
    connectionId = randomUUID(),
    channel = randomUUID()
  const broadcasterId = String(Date.now())
  const config = {
    clientId: 'client',
    clientSecret: 'test-secret',
    redirectUri: 'https://monitor.test/api/sentry/provider-connections/twitch/callback',
    monitorOrigin: 'https://monitor.test',
    encryptionKey: Buffer.alloc(32, 8).toString('base64'),
    keyVersion: 'v1'
  }
  const encrypted = encryptTokens(
    { accessToken: 'old-test-token', refreshToken: 'old-test-refresh' },
    config.encryptionKey,
    config.keyVersion
  )
  try {
    await admin`INSERT INTO auth.users(id) VALUES (${owner})`
    await admin`INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES (${connectionId},${owner},${broadcasterId},'local-concurrency','monitoring-v1',now())`
    await admin`INSERT INTO public.channels(id,connection_id,owner_id) VALUES (${channel},${connectionId},${owner})`
    await admin`INSERT INTO private.provider_credentials(connection_id,ciphertext,iv,tag,key_version,expires_at,validated_at,scopes) VALUES (${connectionId},${encrypted.ciphertext},${encrypted.iv},${encrypted.tag},${encrypted.keyVersion},now()+interval '1 hour',now(),ARRAY['channel:manage:clips'])`
    await first`SET ROLE vpn_sentry`
    await second`SET ROLE vpn_sentry`
    const repoA = createClipRepository(first),
      repoB = createClipRepository(second)
    let access = await repoA.setConsent(owner, channel, true)
    const clip = {
      id: 'LocalConcurrencyClip',
      broadcasterId,
      creatorId: '456',
      title: 'Local fixture',
      videoId: '',
      vodOffset: null,
      createdAt: new Date().toISOString(),
      duration: 12,
      language: 'pt',
      viewCount: 1
    }
    const duplicates = await Promise.all([
      repoA.insert(owner, channel, clip, access),
      repoB.insert(owner, channel, clip, access)
    ])
    expect(duplicates.filter((row) => !row.duplicate)).toHaveLength(1)
    expect(duplicates[0]!.id).toBe(duplicates[1]!.id)
    let entered!: () => void, release!: () => void
    const enteredGate = new Promise<void>((resolve) => {
      entered = resolve
    })
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const ingestion = createClipIngestionService(repoA, async (id) => {
      entered()
      await gate
      return { ...clip, id }
    })
    const inFlight = ingestion.submit(owner, channel, {
      url: 'https://clips.twitch.tv/LocalInFlight'
    })
    const rejected = expect(inFlight).rejects.toMatchObject({ statusCode: 403 })
    await enteredGate
    await repoB.setConsent(owner, channel, false)
    access = await repoB.setConsent(owner, channel, true)
    release()
    await rejected
    expect(await repoA.existing(owner, channel, 'LocalInFlight')).toBeNull()
    expect(await repoA.existing(owner, channel, clip.id)).toMatchObject({
      state: 'cancelled_consent',
      duplicate: true
    })
    expect(access.consent.manualEnabled).toBe(true)

    fixture.sql = first
    vi.stubEnv('NUXT_PRIVATE_DATABASE_URL', url)
    const foundation = getFoundationRepository()
    const oauth = createTwitchOAuthService(config, foundation, {
      exchange: async () => ({
        accessToken: 'new-test-token',
        refreshToken: 'new-test-refresh',
        expiresIn: 3600
      }),
      refresh: async () => {
        throw new Error('not expected')
      },
      validate: async () => ({
        clientId: 'client',
        userId: broadcasterId,
        login: 'local-concurrency',
        scopes: ['channel:manage:clips'],
        expiresIn: 3600
      }),
      revoke: async () => {}
    })
    const user = { userId: owner, role: 'member' as const }
    const authorization = await oauth.beginTwitchAuthorization(
      user,
      {
        consentVersion: 'clip-processing-v1',
        consentAccepted: true,
        capabilities: ['clip_download']
      },
      'local-nonce'
    )
    const pid = (await first`SELECT pg_backend_pid() AS pid`)[0]!.pid
    let pending!: Promise<unknown>
    await second.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      pending = oauth
        .completeTwitchAuthorization(user, {
          code: 'local-code',
          state: new URL(authorization.authorizationUrl).searchParams.get('state')!,
          browserNonce: 'local-nonce'
        })
        .then(
          () => null,
          (error) => error
        )
      let waiting = false
      for (let i = 0; i < 100; i++) {
        const row = (await admin`SELECT wait_event FROM pg_stat_activity WHERE pid=${pid}`)[0]
        if (row?.wait_event === 'advisory') {
          waiting = true
          break
        }
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
      expect(waiting, 'callback must wait for the shared owner advisory lock').toBe(true)
      // Local withdrawal committed while the callback is waiting, matching disconnect phase one.
      await tx`UPDATE public.provider_connections SET status='revocation_pending',revoked_at=now() WHERE id=${connectionId}`
    })
    expect(await pending).toMatchObject({ statusCode: 409 })
    const row = (
      await admin`SELECT pc.status,k.ciphertext FROM public.provider_connections pc JOIN private.provider_credentials k ON k.connection_id=pc.id WHERE pc.id=${connectionId}`
    )[0]!
    expect(row.status).toBe('revocation_pending')
    expect(row.ciphertext).toBe(encrypted.ciphertext)
  } finally {
    await admin`DELETE FROM auth.users WHERE id=${owner}`
    expect((await admin`SELECT id FROM public.channels WHERE id=${channel}`).length).toBe(0)
    await closePrivateDatabase()
    await Promise.all([first.end(), second.end(), admin.end()])
    vi.unstubAllEnvs()
  }
}, 30000)
