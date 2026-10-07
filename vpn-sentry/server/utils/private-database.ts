import postgres from 'postgres'
import type { Me, TwitchConnection } from '@vpn/contracts'
import type { EncryptedTokens } from './token-crypto'
import { FoundationError } from './api-error'

export type Credential = EncryptedTokens & { expiresAt: string; validatedAt: string; retryUntil: string | null }
export type StoredConnection = { connection: TwitchConnection; credential: Credential | null }
export type AuthorizationTransaction = { stateHash: string; userId: string; nonceHash: string; consentVersion: 'monitoring-v1'; expiresAt: string }
export type LockedConnection = {
  setStatus: (status: TwitchConnection['status'], revokedAt: string | null) => Promise<void>
  saveCredential: (credential: Credential) => Promise<void>
  deleteCredential: () => Promise<void>
  audit: (code: 'revocation_failed' | 'authorization_expired') => Promise<void>
}
export type FoundationRepository = {
  sessionActive: (userId: string, sessionId: string) => Promise<boolean>
  getRole: (userId: string) => Promise<Me['role']>
  getConnection: (userId: string) => Promise<StoredConnection | null>
  createAuthorization: (value: AuthorizationTransaction) => Promise<void>
  consumeAuthorization: (stateHash: string, nonceHash: string, userId: string, now: string) => Promise<boolean>
  saveConnection: (userId: string, identity: { userId: string; login: string }, credential: Credential, now: string) => Promise<void>
  withConnection: <T>(userId: string, operation: (value: StoredConnection | null, locked: LockedConnection) => Promise<T>) => Promise<T>
  listWorkUsers: () => Promise<string[]>
  cleanAuthorizations: (now: string) => Promise<void>
}
export type FoundationTransaction = LockedConnection

type Row = {
  id: string; user_id: string; provider_user_id: string; login: string; status: TwitchConnection['status']; consented_at: Date; connected_at: Date; revoked_at: Date | null
  ciphertext: string | null; iv: string; tag: string; key_version: string; expires_at: Date; validated_at: Date; retry_until: Date | null
}
function mapRow(row: Row): StoredConnection {
  return {
    connection: { id: row.id, provider: 'twitch', providerUserId: row.provider_user_id, login: row.login, status: row.status, monitoringEnabled: false, consentVersion: 'monitoring-v1', consentedAt: row.consented_at.toISOString(), connectedAt: row.connected_at.toISOString(), revokedAt: row.revoked_at?.toISOString() ?? null },
    credential: row.ciphertext ? { ciphertext: row.ciphertext, iv: row.iv, tag: row.tag, keyVersion: row.key_version, expiresAt: row.expires_at.toISOString(), validatedAt: row.validated_at.toISOString(), retryUntil: row.retry_until?.toISOString() ?? null } : null
  }
}

let repository: FoundationRepository | undefined
let database: ReturnType<typeof postgres> | undefined
export function getFoundationRepository(): FoundationRepository {
  if (repository) return repository
  const url = process.env.NUXT_PRIVATE_DATABASE_URL
  if (!url) throw new FoundationError(503)
  database = postgres(url, { max: 5, idle_timeout: 20, connect_timeout: 10, prepare: false, onnotice: () => {} })
  const sql = database
  async function requireDatabaseRole() {
    const rows = await sql<{ role: string }[]>`SELECT current_user AS role`
    if (rows[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
  }

  async function readConnection(tx: postgres.Sql | postgres.TransactionSql, userId: string, lock = false): Promise<StoredConnection | null> {
    const rows = await tx<Row[]>`
      SELECT c.*, k.ciphertext, k.iv, k.tag, k.key_version, k.expires_at, k.validated_at, k.retry_until
      FROM public.provider_connections c LEFT JOIN private.provider_credentials k ON k.connection_id = c.id
      WHERE c.user_id = ${userId} ${lock ? tx`FOR UPDATE OF c` : tx``}
    `
    return rows[0] ? mapRow(rows[0]) : null
  }
  async function writeCredential(tx: postgres.Sql | postgres.TransactionSql, id: string, value: Credential) {
    await tx`
      INSERT INTO private.provider_credentials(connection_id,ciphertext,iv,tag,key_version,expires_at,validated_at,retry_until)
      VALUES (${id},${value.ciphertext},${value.iv},${value.tag},${value.keyVersion},${value.expiresAt},${value.validatedAt},${value.retryUntil})
      ON CONFLICT(connection_id) DO UPDATE SET ciphertext=excluded.ciphertext,iv=excluded.iv,tag=excluded.tag,key_version=excluded.key_version,expires_at=excluded.expires_at,validated_at=excluded.validated_at,retry_until=excluded.retry_until
    `
  }
  repository = {
    async sessionActive(userId, sessionId) {
      await requireDatabaseRole()
      const rows = await sql<{ active: boolean }[]>`SELECT private.vpn_session_active(${userId}::uuid, ${sessionId}::uuid) AS active`
      return rows[0]?.active === true
    },
    async getRole(userId) {
      await requireDatabaseRole()
      const rows = await sql<{ role: Me['role'] }[]>`SELECT role FROM public.user_roles WHERE user_id=${userId}`
      return rows[0]?.role ?? 'member'
    },
    async getConnection(userId) { await requireDatabaseRole(); return readConnection(sql, userId) },
    async createAuthorization(value) {
      await requireDatabaseRole()
      await sql`INSERT INTO private.oauth_transactions(state_hash,user_id,browser_nonce_hash,consent_version,expires_at) VALUES (${value.stateHash},${value.userId},${value.nonceHash},${value.consentVersion},${value.expiresAt})`
    },
    async consumeAuthorization(stateHash, nonceHash, userId, now) {
      await requireDatabaseRole()
      const rows = await sql`UPDATE private.oauth_transactions SET consumed_at=${now} WHERE state_hash=${stateHash} AND browser_nonce_hash=${nonceHash} AND user_id=${userId} AND expires_at>${now} AND consumed_at IS NULL RETURNING state_hash`
      return rows.length === 1
    },
    async saveConnection(userId, identity, credential, now) {
      await requireDatabaseRole()
      try {
        await sql.begin(async tx => {
          // Serializes first connections too, where there is no row to lock yet.
          await tx`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`
          const current = await readConnection(tx, userId, true)
          if (current && current.connection.status !== 'revoked') throw new FoundationError(409)
          const rows = await tx<{ id: string }[]>`
            INSERT INTO public.provider_connections(user_id,provider_user_id,login,consent_version,consented_at,connected_at)
            VALUES (${userId},${identity.userId},${identity.login},'monitoring-v1',${now},${now})
            ON CONFLICT(user_id) DO UPDATE SET provider_user_id=excluded.provider_user_id,login=excluded.login,status='connected',consented_at=excluded.consented_at,connected_at=excluded.connected_at,revoked_at=NULL RETURNING id
          `
          const id = rows[0]!.id
          await tx`INSERT INTO public.channels(connection_id,owner_id) VALUES (${id},${userId}) ON CONFLICT(connection_id) DO NOTHING`
          await writeCredential(tx, id, credential)
        })
      } catch (error) {
        if (error instanceof FoundationError) throw error
        if (error instanceof postgres.PostgresError && error.code === '23505') throw new FoundationError(409)
        throw new FoundationError(503)
      }
    },
    async withConnection<T>(userId: string, operation: (value: StoredConnection | null, locked: LockedConnection) => Promise<T>): Promise<T> {
      await requireDatabaseRole()
      const result = await sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${userId}, 0))`
        const value = await readConnection(tx, userId, true)
        const id = value?.connection.id
        const requireId = () => { if (!id) throw new FoundationError(400); return id }
        return operation(value, {
          async setStatus(status, revokedAt) { await tx`UPDATE public.provider_connections SET status=${status},revoked_at=${revokedAt} WHERE id=${requireId()}` },
          saveCredential: credential => writeCredential(tx, requireId(), credential),
          async deleteCredential() { await tx`DELETE FROM private.provider_credentials WHERE connection_id=${requireId()}` },
          async audit(code) { await tx`INSERT INTO private.foundation_audit(connection_id,code) VALUES (${requireId()},${code})` }
        })
      })
      return result as T
    },
    async listWorkUsers() {
      await requireDatabaseRole()
      const rows = await sql<{ user_id: string }[]>`SELECT c.user_id FROM public.provider_connections c JOIN private.provider_credentials k ON k.connection_id=c.id WHERE c.status IN ('connected','expired','revocation_pending')`
      return rows.map(row => row.user_id)
    },
    async cleanAuthorizations(now) { await requireDatabaseRole(); await sql`DELETE FROM private.oauth_transactions WHERE expires_at < ${now}::timestamptz - interval '24 hours'` }
  }
  return repository
}

export async function closePrivateDatabase() {
  await database?.end({ timeout: 5 })
  database = undefined
  repository = undefined
}
