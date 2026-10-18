import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { expect, test } from 'vitest'

test('foundation RLS isolates owners and immediately reflects admin removal', async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE auth.sessions(id uuid PRIMARY KEY, user_id uuid REFERENCES auth.users(id), not_after timestamptz);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      INSERT INTO auth.users VALUES
      ('00000000-0000-0000-0000-000000000001'),
      ('00000000-0000-0000-0000-000000000002'),
      ('00000000-0000-0000-0000-000000000003');
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
    `)
    const migration = readdirSync('supabase/migrations').find((name) =>
      name.endsWith('_foundation_access.sql')
    )!
    await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
    const monitoringMigration = readdirSync('supabase/migrations').find((name) =>
      name.endsWith('_fase_1_monitoramento_privado.sql')
    )!
    await db.exec(readFileSync(`supabase/migrations/${monitoringMigration}`, 'utf8'))
    const clipMigration = readdirSync('supabase/migrations').find((name) =>
      name.endsWith('_phase2_clip_persistence.sql')
    )!
    await db.exec(readFileSync(`supabase/migrations/${clipMigration}`, 'utf8'))
    const ingestionMigration = readdirSync('supabase/migrations').find((name) =>
      name.endsWith('_clip_ingestion_oauth.sql')
    )!
    await db.exec(readFileSync(`supabase/migrations/${ingestionMigration}`, 'utf8'))
    await db.exec(`
      INSERT INTO public.user_roles VALUES ('00000000-0000-0000-0000-000000000003', 'vpn_admin');
      INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES
      ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','twitch-1','owner','monitoring-v1',now());
      INSERT INTO public.channels(id,connection_id,owner_id) VALUES
      ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
      INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled)
      VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now(),true);
      INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
      VALUES ('20000000-0000-0000-0000-000000000001','PgliteClip123','https://clips.twitch.tv/PgliteClip123','manual','pending_metadata');
    `)
    await expect(
      db.exec(`INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at)
        VALUES ('20000000-0000-0000-0000-000000000001','monitoring-v2',now())`)
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
        VALUES ('20000000-0000-0000-0000-000000000001','PgliteClip123','https://clips.twitch.tv/PgliteClip123','manual','pending_metadata')`)
    ).rejects.toThrow(/unique constraint/)
    await expect(
      db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
        VALUES ('20000000-0000-0000-0000-000000000001','PgliteInvalidState','https://clips.twitch.tv/PgliteInvalidState','manual','queued')`)
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
        VALUES ('20000000-0000-0000-0000-000000000001','PgliteInvalidMode','https://clips.twitch.tv/PgliteInvalidMode','scheduled_auto','pending_metadata')`)
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
        VALUES ('20000000-0000-0000-0000-000000000001','PgliteUnfinished','https://clips.twitch.tv/PgliteUnfinished','manual','completed')`)
    ).rejects.toThrow(/check constraint/)
    await expect(
      db.exec("UPDATE private.clip_processing_consents SET revoked_at='2020-01-01T00:00:00Z'")
    ).rejects.toThrow(/check constraint/)
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`RESET ROLE; SET ROLE ${role};`)
      for (const statement of [
        'SELECT * FROM private.clip_processing_consents',
        'SELECT * FROM private.clip_submissions',
        `INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at)
          VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now())`,
        `INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
          VALUES ('20000000-0000-0000-0000-000000000001','BrowserWrite123','https://clips.twitch.tv/BrowserWrite123','manual','pending_metadata')`,
        'UPDATE private.clip_processing_consents SET manual_enabled=false',
        "UPDATE private.clip_submissions SET state='processing'",
        'DELETE FROM private.clip_processing_consents',
        'DELETE FROM private.clip_submissions'
      ]) {
        await expect(db.query(statement)).rejects.toThrow(/permission denied/)
      }
    }
    async function asUser(id: number) {
      await db.exec(
        `RESET ROLE; SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000${id}'; SET ROLE authenticated;`
      )
    }
    await asUser(1)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(1)
    await expect(
      db.exec("UPDATE provider_connections SET user_id='00000000-0000-0000-0000-000000000002'")
    ).rejects.toThrow(/permission denied/)
    await expect(
      db.exec("INSERT INTO user_roles VALUES ('00000000-0000-0000-0000-000000000001','vpn_admin')")
    ).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM private.provider_credentials')).rejects.toThrow(
      /permission denied/
    )
    await asUser(2)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(0)
    expect((await db.query('SELECT * FROM channels')).rows).toHaveLength(0)
    await asUser(3)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(1)
    await db.exec(
      "RESET ROLE; DELETE FROM user_roles WHERE role='vpn_admin'; SET ROLE authenticated;"
    )
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(0)
    await db.exec('RESET ROLE; SET ROLE anon;')
    await expect(db.query('SELECT * FROM provider_connections')).rejects.toThrow(
      /permission denied/
    )
    await expect(db.query('SELECT * FROM private.clip_processing_consents')).rejects.toThrow(
      /permission denied/
    )
    await expect(db.query('SELECT * FROM private.clip_submissions')).rejects.toThrow(
      /permission denied/
    )
    await db.exec('RESET ROLE; SET ROLE authenticated;')
    await expect(
      db.query("SELECT private.purge_expired_clip_submissions('2026-10-18T00:00:00Z'::timestamptz)")
    ).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE;')
    await db.exec('SET ROLE vpn_sentry;')
    expect((await db.query('SELECT * FROM private.clip_submissions')).rows).toHaveLength(1)
    expect((await db.query('SELECT * FROM private.clip_processing_consents')).rows).toHaveLength(1)
    await db.exec(
      "UPDATE private.clip_processing_consents SET scheduled_enabled=true; DELETE FROM private.clip_processing_consents; INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled) VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now(),true);"
    )
    expect(
      (
        await db.query(
          "SELECT private.purge_expired_clip_submissions('2026-10-18T00:00:00Z'::timestamptz) AS purged"
        )
      ).rows[0]?.purged
    ).toBe(0)
    await expect(
      db.exec(`INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
        VALUES ('20000000-0000-0000-0000-000000000099','MissingChannel123','https://clips.twitch.tv/MissingChannel123','manual','pending_metadata')`)
    ).rejects.toThrow(/foreign key constraint/)
    await db.exec('RESET ROLE;')
    await expect(db.exec('UPDATE channels SET monitoring_enabled=true')).rejects.toThrow(
      /check constraint/
    )
    await db.exec(
      "UPDATE channels SET monitoring_consent_version='monitoring-v2', monitoring_consented_at=now(), monitoring_enabled=true"
    )
    expect(
      (await db.query('SELECT monitoring_enabled FROM channels')).rows[0]?.monitoring_enabled
    ).toBe(true)
    await db.exec(`
      INSERT INTO private.monitoring_sessions(id,channel_id,owner_id,provider_stream_id,title,started_at)
      VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','stream-1','Live',now());
      INSERT INTO private.access_invites(session_id,owner_id,token_hash,expires_at)
      VALUES ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','hash-1',now()+interval '1 hour');
      UPDATE private.access_invites SET accepted_by='00000000-0000-0000-0000-000000000002',accepted_at=now()
      WHERE token_hash='hash-1' AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now();
    `)
    const secondAccept = await db.query(
      "UPDATE private.access_invites SET accepted_by='00000000-0000-0000-0000-000000000003',accepted_at=now() WHERE token_hash='hash-1' AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() RETURNING id"
    )
    expect(secondAccept.rows).toHaveLength(0)
    await asUser(1)
    await expect(db.query('SELECT * FROM private.monitoring_sessions')).rejects.toThrow(
      /permission denied/
    )
    await db.exec('RESET ROLE; SET ROLE anon;')
    await expect(db.query('SELECT * FROM private.monitoring_sessions')).rejects.toThrow(
      /permission denied/
    )
    await expect(db.query('SELECT * FROM private.access_invites')).rejects.toThrow(
      /permission denied/
    )
    await db.exec('RESET ROLE;')
    await db.exec(`
      INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state,received_at,finished_at) VALUES
      ('20000000-0000-0000-0000-000000000001','OldTerminal123','https://clips.twitch.tv/OldTerminal123','manual','completed','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldNoMatch123','https://clips.twitch.tv/OldNoMatch123','manual','no_match','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldUnavailable123','https://clips.twitch.tv/OldUnavailable123','manual','source_unavailable','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldFailed123','https://clips.twitch.tv/OldFailed123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldCancelled123','https://clips.twitch.tv/OldCancelled123','manual','cancelled_consent','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','RecentTerminal123','https://clips.twitch.tv/RecentTerminal123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-21T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldPending123','https://clips.twitch.tv/OldPending123','manual','pending_asr','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
      ('20000000-0000-0000-0000-000000000001','OldProcessing123','https://clips.twitch.tv/OldProcessing123','manual','processing','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
    `)
    const purged = await db.query<{ purged: number }>(
      "SELECT private.purge_expired_clip_submissions('2026-10-18T00:00:00Z'::timestamptz) AS purged"
    )
    expect(purged.rows[0]?.purged).toBe(5)
    expect(
      (
        await db.query(
          "SELECT id FROM private.clip_submissions WHERE twitch_clip_id IN ('OldTerminal123','OldNoMatch123','OldUnavailable123','OldFailed123','OldCancelled123')"
        )
      ).rows
    ).toHaveLength(0)
    expect(
      (
        await db.query(
          "SELECT id FROM private.clip_submissions WHERE twitch_clip_id='RecentTerminal123'"
        )
      ).rows
    ).toHaveLength(1)
    expect(
      (
        await db.query(
          "SELECT id FROM private.clip_submissions WHERE twitch_clip_id='OldPending123'"
        )
      ).rows
    ).toHaveLength(1)
    expect(
      (
        await db.query(
          "SELECT id FROM private.clip_submissions WHERE twitch_clip_id='OldProcessing123'"
        )
      ).rows
    ).toHaveLength(1)
  } finally {
    await db.close()
  }
}, 30000)
