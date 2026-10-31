import type postgres from 'postgres'
import { FoundationError } from './api-error'
import { decryptSecret, encryptSecret, type EncryptedSecret } from './token-crypto'
import { getFoundationDatabase } from './private-database'

export function createOpenAiCredentialRepository(
  sql: postgres.Sql,
  config: { encryptionKey: string; keyVersion: string }
) {
  async function authorized<T>(owner: string, work: (tx: postgres.TransactionSql) => Promise<T>) {
    const role = await sql`SELECT current_user AS role`
    if (role[0]?.role !== 'vpn_sentry') throw new FoundationError(503)
    return (await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${owner},0))`
      return work(tx)
    })) as T
  }

  return {
    has: (owner: string) =>
      authorized(owner, async (tx) => {
        const rows = await tx`SELECT 1 FROM private.user_provider_credentials
          WHERE user_id=${owner} AND provider='openai'`
        return Boolean(rows[0])
      }),
    getForProcessing: (owner: string) =>
      authorized(owner, async (tx) => {
        const rows = await tx<
          EncryptedSecret[]
        >`SELECT ciphertext,iv,tag,key_version AS "keyVersion"
          FROM private.user_provider_credentials WHERE user_id=${owner} AND provider='openai'`
        return rows[0] ? decryptSecret(rows[0], config.encryptionKey, config.keyVersion) : null
      }),
    save: (owner: string, apiKey: string) =>
      authorized(owner, async (tx) => {
        const encrypted = encryptSecret(apiKey, config.encryptionKey, config.keyVersion)
        await tx`INSERT INTO private.user_provider_credentials
          (user_id,provider,ciphertext,iv,tag,key_version,updated_at)
          VALUES (${owner},'openai',${encrypted.ciphertext},${encrypted.iv},${encrypted.tag},${encrypted.keyVersion},now())
          ON CONFLICT (user_id,provider) DO UPDATE SET ciphertext=excluded.ciphertext,
            iv=excluded.iv,tag=excluded.tag,key_version=excluded.key_version,updated_at=now()`
        await tx`UPDATE private.clip_submissions s
          SET state='pending_captions',processing_attempts=0,finished_at=NULL,retry_after=NULL
          FROM public.channels c
          WHERE c.id=s.channel_id AND c.owner_id=${owner} AND s.state='needs_openai_key'`
      }),
    remove: (owner: string) =>
      authorized(
        owner,
        (tx) => tx`DELETE FROM private.user_provider_credentials
        WHERE user_id=${owner} AND provider='openai'`
      )
  }
}

export const getOpenAiCredentialRepository = () =>
  createOpenAiCredentialRepository(getFoundationDatabase(), {
    encryptionKey: process.env.NUXT_TOKEN_ENCRYPTION_KEY || '',
    keyVersion: process.env.NUXT_TOKEN_KEY_VERSION || ''
  })
