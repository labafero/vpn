import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import type postgres from 'postgres'
import { expect, test } from 'vitest'
import { createClipIngestionService } from '../server/utils/clip-ingestion'
import { createClipRepository } from '../server/utils/clip-repository'
import { createClipProcessingRepository } from '../server/utils/clip-processing-repository'
import { createClipDiscoveryRepository } from '../server/utils/clip-discovery-repository'
import {
  createClipTriggerPhraseRepository,
  createClipTriggerPhrasesService
} from '../server/utils/clip-trigger-phrases'

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
      '_per_user_openai_transcription_credentials.sql',
      '_scheduled_clip_discovery_and_trigger_phrases.sql',
      '_clip_evidence_approval.sql',
      '_clip_manual_retry_observability.sql'
    ]) {
      const name = readdirSync('supabase/migrations').find((name) => name.endsWith(suffix))!
      await db.exec(readFileSync(`supabase/migrations/${name}`, 'utf8'))
    }
    await db.exec(`INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES ('10000000-0000-0000-0000-000000000001','${owner}','123','owner','monitoring-v1',now());
      INSERT INTO public.channels(id,connection_id,owner_id) VALUES ('${channel}','10000000-0000-0000-0000-000000000001','${owner}');
      INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled,scheduled_enabled,scheduled_consent_version,scheduled_consented_at)
      VALUES ('${channel}','clip-processing-v1',now(),false,true,'clip-scheduled-v1',now());`)
    const historyMigration = readdirSync('supabase/migrations').find((name) =>
      name.endsWith('_separate_clip_history_consent.sql')
    )!
    await db.exec(readFileSync(`supabase/migrations/${historyMigration}`, 'utf8'))
    await db.exec(`
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
    await expect(
      db.query(
        `SELECT scheduled_enabled,scheduled_consent_version FROM private.clip_processing_consents WHERE channel_id='${channel}'`
      )
    ).resolves.toMatchObject({
      rows: [{ scheduled_enabled: false, scheduled_consent_version: null }]
    })
    expect(await repo.read('00000000-0000-0000-0000-000000000002', channel)).toBeNull()
    const consentService = createClipIngestionService(repo, async () => ({
      id: 'Unused',
      broadcasterId: '123',
      creatorId: '456',
      title: 'Title',
      videoId: '',
      vodOffset: null,
      createdAt: '2026-10-18T00:00:00Z',
      duration: 12,
      language: 'pt',
      viewCount: 1
    }))
    await expect(
      consentService.setConsent(owner, channel, {
        scheduledEnabled: true,
        scheduledConsentVersion: 'clip-scheduled-v1',
        scheduledConsentAccepted: true
      })
    ).rejects.toMatchObject({ statusCode: 400 })
    await expect(
      consentService.setConsent(owner, channel, {
        scheduledEnabled: true,
        scheduledConsentVersion: 'clip-scheduled-v2',
        scheduledConsentAccepted: true
      })
    ).resolves.toMatchObject({ manualEnabled: false, scheduledEnabled: true })
    const scheduledOnly = await repo.setScheduledConsent(owner, channel, true)
    expect(scheduledOnly.consent).toMatchObject({
      manualEnabled: false,
      scheduledEnabled: true,
      scheduledConsentVersion: 'clip-scheduled-v2'
    })
    await expect(
      consentService.setConsent(owner, channel, {
        scheduledHistoryEnabled: true,
        scheduledHistoryConsentVersion: 'clip-history-v1',
        scheduledHistoryConsentAccepted: true
      })
    ).resolves.toMatchObject({ scheduledEnabled: true, scheduledHistoryEnabled: true })
    await expect(
      consentService.setConsent(owner, channel, { scheduledHistoryEnabled: false })
    ).resolves.toMatchObject({ scheduledEnabled: true, scheduledHistoryEnabled: false })
    const both = await repo.setConsent(owner, channel, true)
    expect(both.consent).toMatchObject({ manualEnabled: true, scheduledEnabled: true })
    const manualOnly = await repo.setScheduledConsent(owner, channel, false)
    expect(manualOnly.consent).toMatchObject({ manualEnabled: true, scheduledEnabled: false })
    const scheduledAgain = await repo.setScheduledConsent(owner, channel, true)
    expect(scheduledAgain.consent.manualEnabled).toBe(true)
    const revokedManual = await repo.setConsent(owner, channel, false)
    expect(revokedManual.consent).toMatchObject({ manualEnabled: false, scheduledEnabled: true })
    await db.exec(`UPDATE private.provider_credentials SET scopes=ARRAY[]::text[]`)
    await expect(repo.setScheduledConsent(owner, channel, true)).rejects.toMatchObject({
      statusCode: 403
    })
    await db.exec(`UPDATE private.provider_credentials SET scopes=ARRAY['channel:manage:clips']`)
    await expect(
      repo.setScheduledConsent('00000000-0000-0000-0000-000000000002', channel, true)
    ).rejects.toMatchObject({ statusCode: 403 })
    const active = await repo.setConsent(owner, channel, true)
    expect(active.consent.scheduledEnabled).toBe(true)
    const phrases = createClipTriggerPhrasesService(
      createClipTriggerPhraseRepository(adapter(db) as unknown as postgres.Sql)
    )
    const phrase = await phrases.create(owner, channel, { text: ' Você é um inútil! ' })
    expect(phrase).toMatchObject({ text: 'Você é um inútil!', version: 1, enabled: true })
    await expect(
      phrases.create(owner, channel, { text: 'você é um inútil' })
    ).rejects.toMatchObject({ statusCode: 400 })
    const edited = await phrases.update(owner, channel, phrase.id, { text: 'Chega de mentir' })
    expect(edited).toMatchObject({ version: 2, text: 'Chega de mentir' })
    await phrases.deactivate(owner, channel, phrase.id)
    const reenabledPhrase = await phrases.create(owner, channel, { text: 'Chega de mentir' })
    expect(reenabledPhrase).toMatchObject({ id: phrase.id, version: 3, enabled: true })
    expect(active.consent.manualEnabled).toBe(true)
    const unconfiguredOwner = '00000000-0000-0000-0000-000000000003'
    const unconfiguredConnection = '10000000-0000-0000-0000-000000000003'
    const unconfiguredChannel = '20000000-0000-0000-0000-000000000003'
    await db.exec(`RESET ROLE;
      INSERT INTO auth.users(id) VALUES ('${unconfiguredOwner}');
      INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at)
        VALUES ('${unconfiguredConnection}','${unconfiguredOwner}','789','unconfigured','monitoring-v1',now());
      INSERT INTO public.channels(id,connection_id,owner_id)
        VALUES ('${unconfiguredChannel}','${unconfiguredConnection}','${unconfiguredOwner}');
      INSERT INTO private.provider_credentials(connection_id,ciphertext,iv,tag,key_version,expires_at,validated_at,scopes)
        VALUES ('${unconfiguredConnection}','cipher','iv','tag','v1',now()+interval '1 hour',now(),ARRAY['channel:manage:clips']);
      SET ROLE vpn_sentry;`)
    const unconfiguredConsent = await repo.setScheduledConsent(
      unconfiguredOwner,
      unconfiguredChannel,
      true
    )
    expect(unconfiguredConsent.consent.scheduledEnabled).toBe(true)
    const discovery = createClipDiscoveryRepository(adapter(db) as unknown as postgres.Sql)
    const firstDiscovery = await discovery.claimNext()
    expect(firstDiscovery?.channelId).toBe(channel)
    await db.query(
      `UPDATE private.clip_discovery_state SET lease_until=now()-interval '1 second' WHERE channel_id='${channel}'`
    )
    const nextDiscovery = await discovery.claimNext()
    expect(nextDiscovery?.channelId).toBe(unconfiguredChannel)
    await db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,broadcaster_id,capture_mode,state,received_at) VALUES
      ('${unconfiguredChannel}','OldUnconfigured1','https://clips.twitch.tv/OldUnconfigured1','789','scheduled','waiting_capacity',now()-interval '1 hour'),
      ('${unconfiguredChannel}','OldUnconfigured2','https://clips.twitch.tv/OldUnconfigured2','789','scheduled','waiting_capacity',now()-interval '59 minutes')`)
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
    await expect(repo.setEvidenceApproval(owner, channel, queued.id, true)).rejects.toMatchObject({
      statusCode: 404
    })
    const job = await processing.claimNext()
    expect(job).toMatchObject({
      id: first.id,
      clipId: 'ClipId',
      ownerId: owner,
      channelId: channel
    })
    const unconfigured = await db.query(
      `SELECT state FROM private.clip_submissions WHERE channel_id='${unconfiguredChannel}' ORDER BY twitch_clip_id`
    )
    expect(unconfigured.rows).toEqual([
      { state: 'needs_trigger_phrases' },
      { state: 'needs_trigger_phrases' }
    ])
    await expect(processing.claimNext()).resolves.toBeNull()
    expect(await processing.stillAuthorized(job!)).toBe(true)
    await expect(
      processing.finish(job!, [
        {
          phraseId: phrase.id,
          phraseVersion: 3,
          phrase: 'Chega de mentir',
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
          phraseId: phrase.id,
          phraseVersion: 3,
          phrase: 'Chega de mentir',
          source: 'openai',
          startMs: 100,
          endMs: 900
        }
      ]
    })
    await expect(repo.setEvidenceApproval(owner, channel, first.id, true)).resolves.toMatchObject({
      approvedAt: expect.any(String)
    })
    expect(
      (await repo.list(owner, channel)).items.find((item) => item.id === first.id)
    ).toMatchObject({
      approvedAt: expect.any(String)
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
    const retryableWithVod = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'RetryWithVod', videoId: 'vod-123', vodOffset: 40 },
      reenabled
    )
    await db.exec(
      `UPDATE private.clip_submissions SET state='source_unavailable',failure_code='clip_unavailable',processing_attempts=3,finished_at=now() WHERE id='${retryableWithVod.id}'`
    )
    await expect(
      processing.beginManualRetry(
        '00000000-0000-0000-0000-000000000002',
        channel,
        retryableWithVod.id
      )
    ).rejects.toMatchObject({ statusCode: 404 })
    const twitchRetry = await processing.beginManualRetry(owner, channel, retryableWithVod.id)
    expect(twitchRetry).toMatchObject({
      state: 'processing',
      mode: 'captions',
      videoId: 'vod-123',
      vodOffset: 40,
      retryToken: expect.any(String)
    })
    await expect(
      processing.completeManualRetryWithCaptions(
        owner,
        channel,
        retryableWithVod.id,
        '00000000-0000-0000-0000-000000000000',
        [{ startMs: 0, endMs: 1000, text: 'Chega de mentir; trecho integral sensível' }]
      )
    ).rejects.toMatchObject({ statusCode: 409 })
    await expect(
      processing.completeManualRetryWithCaptions(
        owner,
        channel,
        retryableWithVod.id,
        twitchRetry.retryToken!,
        [{ startMs: 0, endMs: 1000, text: 'Chega de mentir; trecho integral sensível' }]
      )
    ).resolves.toMatchObject({ state: 'completed', matches: 1 })
    expect(await repo.detail(owner, channel, retryableWithVod.id)).toMatchObject({
      state: 'completed',
      detections: [{ source: 'captions', phrase: 'Chega de mentir', startMs: 0, endMs: 1000 }]
    })
    const savedTranscript = await db.query(
      `SELECT phrase_text FROM private.clip_detections WHERE submission_id='${retryableWithVod.id}'`
    )
    expect(savedTranscript.rows).not.toContainEqual({
      phrase_text: 'Chega de mentir; trecho integral sensível'
    })

    const autoQueued = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'AutoQueuedOld' },
      reenabled
    )
    await db.exec(
      `UPDATE private.clip_submissions SET received_at=now()-interval '2 hours' WHERE id='${autoQueued.id}'`
    )
    const retryWithoutVod = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'RetryWithoutVod', videoId: '', vodOffset: null },
      reenabled
    )
    await db.exec(
      `UPDATE private.clip_submissions SET state='source_unavailable',failure_code='clip_unavailable',processing_attempts=3,finished_at=now() WHERE id='${retryWithoutVod.id}'`
    )
    await expect(
      processing.beginManualRetry(owner, channel, retryWithoutVod.id)
    ).resolves.toMatchObject({
      state: 'pending_captions',
      mode: 'openai',
      retryToken: null
    })
    const prioritized = await processing.claimNext()
    expect(prioritized).toMatchObject({ id: retryWithoutVod.id, clipId: 'RetryWithoutVod' })
    await processing.cancel(prioritized!)
    const fallbackClip = await repo.insert(
      owner,
      channel,
      { ...clip, id: 'RetryFallbackVod', videoId: 'vod-456', vodOffset: 90 },
      reenabled
    )
    await db.exec(
      `UPDATE private.clip_submissions SET state='source_unavailable',failure_code='clip_unavailable',processing_attempts=3,finished_at=now() WHERE id='${fallbackClip.id}'`
    )
    const fallbackSession = await processing.beginManualRetry(owner, channel, fallbackClip.id)
    expect(fallbackSession).toMatchObject({ mode: 'captions', state: 'processing' })
    await expect(
      processing.fallbackManualRetryToOpenAi(
        owner,
        channel,
        fallbackClip.id,
        fallbackSession.retryToken!
      )
    ).resolves.toEqual({ state: 'pending_captions' })
    const fallbackJob = await processing.claimNext()
    expect(fallbackJob).toMatchObject({ id: fallbackClip.id, clipId: 'RetryFallbackVod' })
    await processing.cancel(fallbackJob!)
    await repo.setConsent(owner, channel, false)
    await db.exec(
      `UPDATE private.clip_submissions SET state='source_unavailable',failure_code='clip_unavailable',finished_at=now() WHERE id='${retryableWithVod.id}'`
    )
    await expect(
      processing.beginManualRetry(owner, channel, retryableWithVod.id)
    ).rejects.toMatchObject({ statusCode: 403 })
    await db.exec(`RESET ROLE`)
    expect(
      (
        await db.query(
          `SELECT finished_at FROM private.clip_submissions WHERE id='${pendingClip.id}'`
        )
      ).rows[0]
    ).toHaveProperty('finished_at', expect.any(Date))
  } finally {
    await db.close()
  }
}, 30000)
