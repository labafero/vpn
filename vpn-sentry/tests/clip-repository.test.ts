import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type postgres from 'postgres'
import { expect, test } from 'vitest'
import { createClipIngestionService } from '../server/utils/clip-ingestion'
import { createClipRepository } from '../server/utils/clip-repository'
import { createClipProcessingRepository } from '../server/utils/clip-processing-repository'

const owner = '00000000-0000-0000-0000-000000000001'
const channel = '20000000-0000-0000-0000-000000000001'
test('production SQL isolates owners, deduplicates, cancels pending work and never reopens terminal clips', async () => {
  const db = new PGlite()
  try {
    await db.exec(
      `CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE auth.sessions(id uuid,user_id uuid,not_after timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$; INSERT INTO auth.users VALUES ('${owner}');`
    )
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
    await db.exec(`INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES ('10000000-0000-0000-0000-000000000001','${owner}','123','owner','monitoring-v1',now());
      INSERT INTO public.channels(id,connection_id,owner_id) VALUES ('${channel}','10000000-0000-0000-0000-000000000001','${owner}');
      INSERT INTO private.provider_credentials(connection_id,ciphertext,iv,tag,key_version,expires_at,validated_at,scopes) VALUES ('10000000-0000-0000-0000-000000000001','cipher','iv','tag','v1',now()+interval '1 hour',now(),ARRAY['channel:manage:clips']); SET ROLE vpn_sentry;`)
    // Execute production SQL on Postgres; PGlite serializes transactions itself.
    function adapter(client: Pick<PGlite, 'query'>) {
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
    const repo = createClipRepository(adapter(db) as unknown as postgres.Sql)
    expect(await repo.read('00000000-0000-0000-0000-000000000002', channel)).toBeNull()
    const active = await repo.setConsent(owner, channel, true)
    expect(active.consent.manualEnabled).toBe(true)
    const clip = {
      id: 'ClipId',
      broadcasterId: '123',
      creatorId: '456',
      title: 'Title',
      videoId: '',
      vodOffset: null,
      createdAt: '2026-10-18T00:00:00Z',
      duration: 12,
      language: 'pt',
      viewCount: 1
    }
    const parallel = await Promise.all([
      repo.insert(owner, channel, clip, active),
      repo.insert(owner, channel, clip, active)
    ])
    expect(parallel.filter((row) => !row.duplicate)).toHaveLength(1)
    expect(new Set(parallel.map((row) => row.id)).size).toBe(1)
    const first = parallel.find((row) => !row.duplicate)!
    expect(first.state).toBe('pending_captions')
    expect(await repo.insert(owner, channel, clip, active)).toEqual({ ...first, duplicate: true })
    expect(await repo.list(owner, channel)).toMatchObject({
      items: [{ id: first.id, state: 'pending_captions', detections: [] }]
    })
    const processing = createClipProcessingRepository(adapter(db) as unknown as postgres.Sql)
    const queued = await repo.insert(owner, channel, { ...clip, id: 'QueuedClip' }, active)
    const job = await processing.claimNext()
    expect(job).toMatchObject({
      id: first.id,
      clipId: 'ClipId',
      ownerId: owner,
      channelId: channel
    })
    await expect(processing.claimNext()).resolves.toBeNull()
    expect(await processing.stillAuthorized(job!)).toBe(true)
    await expect(
      processing.finish(job!, [
        {
          phraseId: 'phrase-v1-01',
          phraseVersion: 1,
          phrase: 'você é um inútil',
          source: 'openai',
          startMs: 100,
          endMs: 900
        }
      ])
    ).resolves.toBe(true)
    const listed = await repo.list(owner, channel)
    expect(listed.items.find((item) => item.id === first.id)).toMatchObject({
      state: 'completed',
      detections: [
        {
          phraseId: 'phrase-v1-01',
          phrase: 'você é um inútil',
          source: 'openai',
          startMs: 100,
          endMs: 900
        }
      ]
    })
    const nextJob = await processing.claimNext()
    expect(nextJob).toMatchObject({ id: queued.id, clipId: 'QueuedClip' })
    await processing.cancel(nextJob!)
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    let entered!: () => void
    const started = new Promise<void>((resolve) => {
      entered = resolve
    })
    const service = createClipIngestionService(repo, async (id) => {
      entered()
      await gate
      return { ...clip, id }
    })
    const inFlight = service.submit(owner, channel, { url: 'https://clips.twitch.tv/InFlight' })
    const rejected = expect(inFlight).rejects.toMatchObject({ statusCode: 403 })
    await started
    await repo.setConsent(owner, channel, false)
    await repo.setConsent(owner, channel, true)
    release()
    await rejected
    await repo.setConsent(owner, channel, false)
    await expect(
      repo.insert(owner, channel, { ...clip, id: 'AfterRevocation' }, active)
    ).rejects.toMatchObject({ statusCode: 403 })
    const renewed = await repo.setConsent(owner, channel, true)
    const pendingClip = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'PendingAtRevocation' },
      renewed
    )
    await repo.setConsent(owner, channel, false)
    const reenabled = await repo.setConsent(owner, channel, true)
    const duplicate = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'PendingAtRevocation' },
      reenabled
    )
    expect(duplicate).toEqual({ ...pendingClip, state: 'cancelled_consent', duplicate: true })
    const completedDuplicate = await repo.insert(owner, channel, clip, reenabled)
    expect(completedDuplicate).toEqual({ id: first.id, state: 'completed', duplicate: true })
    await expect(
      repo.insert(owner, channel, { ...clip, id: 'OldConsent' }, active)
    ).rejects.toMatchObject({ statusCode: 403 })
    await expect(
      repo.insert(
        owner,
        channel,
        { ...clip, id: 'StaleRevision' },
        { ...renewed, consentRevision: 'old' }
      )
    ).rejects.toMatchObject({ statusCode: 403 })
    await db.exec(`RESET ROLE`)
    expect(
      (await db.query('SELECT finished_at FROM private.clip_submissions')).rows[0]
    ).toHaveProperty('finished_at', expect.any(Date))
  } finally {
    await db.close()
  }
}, 30000)
