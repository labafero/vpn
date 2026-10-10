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
    const migration = readdirSync('supabase/migrations').find(name => name.endsWith('_foundation_access.sql'))!
    await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'))
    const monitoringMigration = readdirSync('supabase/migrations').find(name => name.endsWith('_fase_1_monitoramento_privado.sql'))!
    await db.exec(readFileSync(`supabase/migrations/${monitoringMigration}`, 'utf8'))
    await db.exec(`
      INSERT INTO public.user_roles VALUES ('00000000-0000-0000-0000-000000000003', 'vpn_admin');
      INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES
      ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','twitch-1','owner','monitoring-v1',now());
      INSERT INTO public.channels(id,connection_id,owner_id) VALUES
      ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');
    `)
    async function asUser(id: number) {
      await db.exec(`RESET ROLE; SET request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000${id}'; SET ROLE authenticated;`)
    }
    await asUser(1)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(1)
    await expect(db.exec("UPDATE provider_connections SET user_id='00000000-0000-0000-0000-000000000002'")).rejects.toThrow(/permission denied/)
    await expect(db.exec("INSERT INTO user_roles VALUES ('00000000-0000-0000-0000-000000000001','vpn_admin')")).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM private.provider_credentials')).rejects.toThrow(/permission denied/)
    await asUser(2)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(0)
    expect((await db.query('SELECT * FROM channels')).rows).toHaveLength(0)
    await asUser(3)
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(1)
    await db.exec("RESET ROLE; DELETE FROM user_roles WHERE role='vpn_admin'; SET ROLE authenticated;")
    expect((await db.query('SELECT * FROM provider_connections')).rows).toHaveLength(0)
    await db.exec('RESET ROLE; SET ROLE anon;')
    await expect(db.query('SELECT * FROM provider_connections')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE;')
    await expect(db.exec('UPDATE channels SET monitoring_enabled=true')).rejects.toThrow(/check constraint/)
    await db.exec("UPDATE channels SET monitoring_consent_version='monitoring-v2', monitoring_consented_at=now(), monitoring_enabled=true")
    expect((await db.query('SELECT monitoring_enabled FROM channels')).rows[0]?.monitoring_enabled).toBe(true)
    await db.exec(`
      INSERT INTO private.monitoring_sessions(id,channel_id,owner_id,provider_stream_id,title,started_at)
      VALUES ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','stream-1','Live',now());
      INSERT INTO private.access_invites(session_id,owner_id,token_hash,expires_at)
      VALUES ('30000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','hash-1',now()+interval '1 hour');
      UPDATE private.access_invites SET accepted_by='00000000-0000-0000-0000-000000000002',accepted_at=now()
      WHERE token_hash='hash-1' AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now();
    `)
    const secondAccept = await db.query("UPDATE private.access_invites SET accepted_by='00000000-0000-0000-0000-000000000003',accepted_at=now() WHERE token_hash='hash-1' AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at>now() RETURNING id")
    expect(secondAccept.rows).toHaveLength(0)
    await asUser(1)
    await expect(db.query('SELECT * FROM private.monitoring_sessions')).rejects.toThrow(/permission denied/)
    await db.exec('RESET ROLE; SET ROLE anon;')
    await expect(db.query('SELECT * FROM private.monitoring_sessions')).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM private.access_invites')).rejects.toThrow(/permission denied/)
  } finally { await db.close() }
}, 30000)
