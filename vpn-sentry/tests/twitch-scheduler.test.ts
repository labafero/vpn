import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { expect, test, vi } from 'vitest'
import { closePrivateDatabase, getFoundationRepository, type StoredConnection } from '../server/utils/private-database'
import { createTwitchOAuthService } from '../server/utils/twitch-oauth'
import { encryptTokens } from '../server/utils/token-crypto'

const fixture = vi.hoisted(() => ({ sql: undefined as unknown }))
vi.mock('postgres', () => ({ default: () => fixture.sql }))

test.each(['provider timeout', 'connection lock timeout'])('scheduler advances past %s without falsifying validation time', async failure => {
  const db = new PGlite()
  const startedAt = new Date('2026-10-07T12:00:00Z')
  const validatedAt = '2026-10-07T11:00:00.000Z'
  let elapsed = startedAt.getTime()
  const ids = Array.from({ length: 21 }, (_, index) => `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`)
  const healthyId = ids[20]!
  const config = { clientId: 'client', clientSecret: 'secret', redirectUri: 'https://monitor.test/api/sentry/provider-connections/twitch/callback', monitorOrigin: 'https://monitor.test', encryptionKey: Buffer.alloc(32, 8).toString('base64'), keyVersion: 'v1' }
  const credential = { ...encryptTokens({ accessToken: 'access', refreshToken: 'refresh' }, config.encryptionKey, config.keyVersion), expiresAt: '2026-10-08T12:00:00.000Z', validatedAt, retryUntil: '2026-10-08T12:00:00.000Z' }
  try {
    await db.exec(`
      CREATE ROLE vpn_sentry;
      CREATE SCHEMA private;
      CREATE TABLE public.provider_connections(id uuid PRIMARY KEY, user_id uuid NOT NULL, status text NOT NULL);
      CREATE TABLE private.provider_credentials(connection_id uuid PRIMARY KEY, validated_at timestamptz NOT NULL);
    `)
    await db.exec(readFileSync('supabase/migrations/20261007124000_twitch_validation_attempts.sql', 'utf8'))
    for (const id of ids) {
      await db.query('INSERT INTO public.provider_connections VALUES ($1, $1, $2)', [id, id === healthyId ? 'connected' : 'revocation_pending'])
      await db.query('INSERT INTO private.provider_credentials(connection_id, validated_at) VALUES ($1, $2)', [id, validatedAt])
    }
    await db.exec(`
      GRANT USAGE ON SCHEMA public, private TO vpn_sentry;
      GRANT SELECT ON public.provider_connections TO vpn_sentry;
      GRANT SELECT, UPDATE ON private.provider_credentials TO vpn_sentry;
      SET ROLE vpn_sentry;
    `)
    // Execute the production repository's ordering and attempt writes in Postgres.
    const sql = async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.reduce((text, part, index) => text + (index ? `$${index}` : '') + part, '')
      return (await db.query(query, values)).rows
    }
    fixture.sql = Object.assign(sql, { end: async () => {} })
    vi.stubEnv('NUXT_PRIVATE_DATABASE_URL', 'postgres://scheduler-test')
    vi.spyOn(Date, 'now').mockImplementation(() => elapsed)
    const repository = getFoundationRepository()
    repository.cleanAuthorizations = async () => {}
    repository.withConnection = async (id, operation) => {
      if (failure === 'connection lock timeout' && id !== healthyId) {
        elapsed += 5000
        throw new Error('lock timeout')
      }
      const value: StoredConnection = {
        connection: { id, provider: 'twitch', providerUserId: id, login: 'streamer', status: id === healthyId ? 'connected' : 'revocation_pending', monitoringEnabled: false, canReconnect: false, consentVersion: 'monitoring-v1', consentedAt: validatedAt, connectedAt: validatedAt, revokedAt: id === healthyId ? null : validatedAt },
        credential: { ...credential }
      }
      return operation(value, {
        setStatus: async () => { throw new Error('Unexpected status change') },
        deleteCredential: async () => { throw new Error('Unexpected credential removal') },
        audit: async () => { throw new Error('Unexpected audit') },
        saveCredential: async updated => {
          await db.query('UPDATE private.provider_credentials SET validated_at = $1 WHERE connection_id = $2', [updated.validatedAt, id])
        }
      })
    }
    const validate = vi.fn(async () => ({ clientId: config.clientId, userId: healthyId, login: 'streamer', scopes: [], expiresIn: 3600 }))
    const service = createTwitchOAuthService(config, repository, {
      exchange: async () => { throw new Error('Unexpected exchange') },
      refresh: async () => { throw new Error('Unexpected refresh') },
      validate,
      revoke: async () => { elapsed += 10000; throw new Error('provider timeout') }
    })
    const maxDurationMs = failure === 'connection lock timeout' ? 100000 : 200000
    expect(await service.validateStoredConnections(startedAt, { maxDurationMs })).toEqual({ checked: 0, expired: 0, failed: 20, deferred: 1 })
    expect(validate).not.toHaveBeenCalled()
    expect((await repository.listWorkUsers())[0]).toBe(healthyId)
    const beforeRetry = await db.query<{ validated_at: Date; last_attempt_at: Date | null }>('SELECT validated_at, last_attempt_at FROM private.provider_credentials WHERE connection_id <> $1', [healthyId])
    expect(beforeRetry.rows).toHaveLength(20)
    expect(beforeRetry.rows.every(row => row.validated_at.toISOString() === validatedAt && row.last_attempt_at !== null)).toBe(true)

    elapsed = startedAt.getTime() + 30 * 60 * 1000
    const secondRun = new Date(elapsed)
    expect(await service.validateStoredConnections(secondRun, { maxDurationMs })).toMatchObject({ checked: 1, expired: 0, deferred: 0 })
    expect(validate).toHaveBeenCalledOnce()
    const healthy = await db.query<{ validated_at: Date }>('SELECT validated_at FROM private.provider_credentials WHERE connection_id = $1', [healthyId])
    expect(healthy.rows[0]!.validated_at.toISOString()).toBe(secondRun.toISOString())
    const failures = await db.query<{ validated_at: Date }>('SELECT validated_at FROM private.provider_credentials WHERE connection_id <> $1', [healthyId])
    expect(failures.rows.every(row => row.validated_at.toISOString() === validatedAt)).toBe(true)
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    await closePrivateDatabase()
    fixture.sql = undefined
    await db.close()
  }
}, 30000)
