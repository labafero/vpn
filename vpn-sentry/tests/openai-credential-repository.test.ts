import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type postgres from 'postgres'
import { expect, test } from 'vitest'
import { createOpenAiCredentialRepository } from '../server/utils/openai-credential-repository'

const owner = '00000000-0000-0000-0000-000000000001'
const other = '00000000-0000-0000-0000-000000000002'
const encryptionKey = Buffer.alloc(32, 9).toString('base64')

test('stores each user key encrypted, owner-scoped, replaceable, and removable', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE auth.sessions(id uuid,user_id uuid,not_after timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      INSERT INTO auth.users VALUES ('${owner}'),('${other}');`)
    for (const suffix of [
      '_foundation_access.sql',
      '_fase_1_monitoramento_privado.sql',
      '_phase2_clip_persistence.sql',
      '_clip_ingestion_oauth.sql',
      '_clip_processing_worker.sql',
      '_per_user_openai_transcription_credentials.sql'
    ]) {
      const name = readdirSync('supabase/migrations').find((name) => name.endsWith(suffix))!
      await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'))
    }
    await db.exec('SET ROLE vpn_sentry')
    const adapter = (client: Pick<PGlite, 'query'>) => {
      const tagged = async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = strings.reduce(
          (text, part, index) => text + (index ? `$${index}` : '') + part,
          ''
        )
        return (await client.query(query, values)).rows
      }
      return Object.assign(tagged, {
        begin: async (work: (tx: unknown) => Promise<unknown>) =>
          db.transaction((tx) => work(adapter(tx)))
      })
    }
    const repository = createOpenAiCredentialRepository(adapter(db) as unknown as postgres.Sql, {
      encryptionKey,
      keyVersion: 'v1'
    })
    const first = 'sk-proj-first-user-secret-0123456789'
    const second = 'sk-proj-replacement-secret-0123456789'
    await repository.save(owner, first)
    await expect(repository.has(owner)).resolves.toBe(true)
    await expect(repository.has(other)).resolves.toBe(false)
    await expect(repository.getForProcessing(owner)).resolves.toBe(first)
    const stored = await db.query<{ ciphertext: string }[]>(
      `SELECT ciphertext FROM private.user_provider_credentials WHERE user_id='${owner}'`
    )
    expect(stored.rows[0]!.ciphertext).not.toBe(first)
    await repository.save(owner, second)
    await expect(repository.getForProcessing(owner)).resolves.toBe(second)
    await repository.remove(owner)
    await expect(repository.has(owner)).resolves.toBe(false)
    await expect(repository.getForProcessing(owner)).resolves.toBeNull()
  } finally {
    await db.close()
  }
})
