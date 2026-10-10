import { readFileSync, readdirSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { expect, test } from 'vitest'

test('private monitoring data is unavailable through Data API and atomically consumes an invite once', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE auth.sessions(id uuid PRIMARY KEY,user_id uuid REFERENCES auth.users(id),not_after timestamptz); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000021'),('00000000-0000-0000-0000-000000000022'),('00000000-0000-0000-0000-000000000023'); GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
    const foundation = readdirSync('supabase/migrations').find(name => name.endsWith('_foundation_access.sql'))!
    const monitoring = readdirSync('supabase/migrations').find(name => name.endsWith('_fase_1_monitoramento_privado.sql'))!
    await db.exec(readFileSync(`supabase/migrations/${foundation}`, 'utf8'))
    await db.exec(readFileSync(`supabase/migrations/${monitoring}`, 'utf8'))
    await db.exec(`INSERT INTO provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES ('10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021','21','owner','monitoring-v1',now()); INSERT INTO channels(id,connection_id,owner_id,monitoring_enabled,monitoring_consent_version,monitoring_consented_at) VALUES ('20000000-0000-0000-0000-000000000021','10000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021',true,'monitoring-v2',now()); INSERT INTO private.monitoring_sessions(id,channel_id,owner_id,provider_stream_id,title,started_at) VALUES ('30000000-0000-0000-0000-000000000021','20000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021','stream-21','Live',now()); INSERT INTO private.access_invites(session_id,owner_id,token_hash,expires_at) VALUES ('30000000-0000-0000-0000-000000000021','00000000-0000-0000-0000-000000000021','one-use-hash',now()+interval '1 hour');`)
    const accept = (user: string) => db.query(`UPDATE private.access_invites SET accepted_by='${user}',accepted_at=now() WHERE token_hash='one-use-hash' AND accepted_by IS NULL AND revoked_at IS NULL AND expires_at>now() AND session_id IN (SELECT id FROM private.monitoring_sessions WHERE ended_at IS NULL) RETURNING id`)
    expect((await accept('00000000-0000-0000-0000-000000000022')).rows).toHaveLength(1)
    expect((await accept('00000000-0000-0000-0000-000000000023')).rows).toHaveLength(0)
    await db.exec("UPDATE public.provider_connections SET status='expired' WHERE user_id='00000000-0000-0000-0000-000000000021'")
    expect((await db.query('SELECT monitoring_enabled FROM public.channels')).rows[0]?.monitoring_enabled).toBe(false)
    expect((await db.query('SELECT revoked_at FROM private.access_invites')).rows[0]?.revoked_at).not.toBeNull()
    await db.exec("SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000022'; SET ROLE authenticated")
    await expect(db.query('SELECT * FROM private.monitoring_sessions')).rejects.toThrow(/permission denied/)
    await expect(db.query('SELECT * FROM private.access_invites')).rejects.toThrow(/permission denied/)
  } finally { await db.close() }
}, 30000)
