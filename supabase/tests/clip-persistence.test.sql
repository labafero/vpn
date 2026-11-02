BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(47);

INSERT INTO auth.users(id) VALUES
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002');
INSERT INTO public.provider_connections(id,user_id,provider_user_id,login,consent_version,consented_at) VALUES
  ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','twitch-clip-owner','clipowner','monitoring-v1',now());
INSERT INTO public.channels(id,connection_id,owner_id) VALUES
  ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001');

SET LOCAL ROLE anon;
SELECT throws_ok('SELECT * FROM private.clip_processing_consents','42501',NULL,'anon cannot read clip consent');
SELECT throws_ok('SELECT * FROM private.clip_submissions','42501',NULL,'anon cannot read clip submissions');
SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at) VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now())$$,'42501',NULL,'anon cannot insert clip consent');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','AnonWrite123','https://clips.twitch.tv/AnonWrite123','manual','pending_metadata')$$,'42501',NULL,'anon cannot insert clip submissions');
SELECT throws_ok('UPDATE private.clip_processing_consents SET manual_enabled=true','42501',NULL,'anon cannot update clip consent');
SELECT throws_ok('UPDATE private.clip_submissions SET state=''processing''','42501',NULL,'anon cannot update clip submissions');
SELECT throws_ok('DELETE FROM private.clip_processing_consents','42501',NULL,'anon cannot delete clip consent');
SELECT throws_ok('DELETE FROM private.clip_submissions','42501',NULL,'anon cannot delete clip submissions');
SELECT ok(NOT has_table_privilege('anon',(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname='clip_discovery_state'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'anon has no discovery-state privileges');
SELECT ok(NOT has_table_privilege('anon',(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname='clip_trigger_phrases'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'anon has no trigger-phrase privileges');
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM private.clip_processing_consents','42501',NULL,'authenticated cannot read clip consent');
SELECT throws_ok('SELECT * FROM private.clip_submissions','42501',NULL,'authenticated cannot read clip submissions');
SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at) VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now())$$,'42501',NULL,'authenticated cannot insert clip consent');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','AuthWrite123','https://clips.twitch.tv/AuthWrite123','manual','pending_metadata')$$,'42501',NULL,'authenticated cannot insert clip submissions');
SELECT throws_ok('UPDATE private.clip_processing_consents SET manual_enabled=true','42501',NULL,'authenticated cannot update clip consent');
SELECT throws_ok('UPDATE private.clip_submissions SET state=''processing''','42501',NULL,'authenticated cannot update clip submissions');
SELECT throws_ok('DELETE FROM private.clip_processing_consents','42501',NULL,'authenticated cannot delete clip consent');
SELECT throws_ok('DELETE FROM private.clip_submissions','42501',NULL,'authenticated cannot delete clip submissions');
SELECT ok(NOT has_table_privilege('authenticated',(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname='clip_discovery_state'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'authenticated has no discovery-state privileges');
SELECT ok(NOT has_table_privilege('authenticated',(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='private' AND c.relname='clip_trigger_phrases'),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'),'authenticated has no trigger-phrase privileges');
RESET ROLE;

SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at) VALUES ('20000000-0000-0000-0000-000000000001','monitoring-v2',now())$$,'23514',NULL,'only clip-processing consent version is accepted');
SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,scheduled_enabled,scheduled_consent_version,scheduled_consented_at) VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now(),true,'clip-scheduled-v2',now())$$,'23514',NULL,'only clip-scheduled-v1 is accepted');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000099','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata')$$,'23503',NULL,'submission requires an existing channel');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','InvalidState123','https://clips.twitch.tv/InvalidState123','manual','queued')$$,'23514',NULL,'unknown submission state is rejected');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','InvalidMode123','https://clips.twitch.tv/InvalidMode123','automatic','pending_metadata')$$,'23514',NULL,'unknown capture mode is rejected');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','Unfinished123','https://clips.twitch.tv/Unfinished123','manual','completed')$$,'23514',NULL,'terminal submission requires finished_at');

INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled)
VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now()-interval '1 hour',true);
SELECT throws_ok($$UPDATE private.clip_processing_consents SET revoked_at='2026-10-17T00:00:00Z' WHERE channel_id='20000000-0000-0000-0000-000000000001'$$,'23514',NULL,'revocation cannot predate consent');
SELECT is((SELECT revoked_at IS NULL FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),true,'consent starts active');
UPDATE private.clip_processing_consents SET revoked_at=now() WHERE channel_id='20000000-0000-0000-0000-000000000001';
SELECT is((SELECT revoked_at IS NOT NULL FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),true,'revocation remains distinguishable from no consent row');
UPDATE private.clip_processing_consents SET revoked_at=NULL WHERE channel_id='20000000-0000-0000-0000-000000000001';
INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
VALUES ('20000000-0000-0000-0000-000000000001','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata')$$,'23505',NULL,'same channel and clip cannot be submitted twice');

UPDATE private.clip_processing_consents
  SET scheduled_enabled=true,scheduled_consent_version='clip-scheduled-v1',scheduled_consented_at=now(),
      scheduled_revoked_at=NULL,scheduled_revision='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  WHERE channel_id='20000000-0000-0000-0000-000000000001';
INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
  VALUES ('20000000-0000-0000-0000-000000000001','ScheduledRevoke123','https://clips.twitch.tv/ScheduledRevoke123','scheduled','waiting_capacity');
INSERT INTO private.clip_discovery_state(channel_id,phase,window_started_at,window_ended_at,pending_windows,pagination_cursor,lease_until,completed_at)
  VALUES ('20000000-0000-0000-0000-000000000001','incremental',now()-interval '1 day',now(),'[{"startedAt":"2026-10-01T00:00:00Z","endedAt":"2026-10-02T00:00:00Z"}]','cursor',now()+interval '1 minute',now()-interval '1 day');
UPDATE public.provider_connections SET status='expired'
  WHERE id='10000000-0000-0000-0000-000000000001';
UPDATE public.provider_connections SET status='revocation_pending'
  WHERE id='10000000-0000-0000-0000-000000000001';
SELECT is((SELECT manual_enabled FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),false,'full connection revocation disables manual consent');
SELECT is((SELECT scheduled_enabled AND scheduled_revoked_at IS NOT NULL FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),false,'full connection revocation disables scheduled consent');
SELECT is((SELECT state FROM private.clip_submissions WHERE twitch_clip_id='UniqueClip123'),'cancelled_consent','full connection revocation cancels manual work');
SELECT is((SELECT state FROM private.clip_submissions WHERE twitch_clip_id='ScheduledRevoke123'),'cancelled_consent','full connection revocation cancels scheduled work');
SELECT is((SELECT phase='backfill' AND window_started_at IS NULL AND window_ended_at IS NULL AND pagination_cursor IS NULL AND pending_windows='[]'::jsonb AND lease_until IS NULL AND completed_at IS NULL FROM private.clip_discovery_state WHERE channel_id='20000000-0000-0000-0000-000000000001'),true,'connection revocation resets the discovery checkpoint');
SELECT ok((SELECT scheduled_revision <> 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),'connection revocation invalidates discovery leases');
SELECT is((SELECT status FROM public.provider_connections WHERE id='10000000-0000-0000-0000-000000000001'),'revocation_pending','connection enters revocation pending state');

SELECT is(has_table_privilege('vpn_sentry','private.clip_submissions','SELECT,INSERT,UPDATE,DELETE'),true,'Sentry has read/write privileges on submissions');
SELECT is(has_table_privilege('vpn_sentry','private.clip_processing_consents','SELECT,INSERT,UPDATE,DELETE'),true,'Sentry has read/write privileges on consent');
SELECT is(has_function_privilege('vpn_sentry','private.purge_expired_clip_submissions(timestamptz)','EXECUTE'),true,'Sentry can invoke retention routine');
SELECT is(has_table_privilege('vpn_sentry','private.clip_discovery_state','SELECT,INSERT,UPDATE,DELETE'),true,'Sentry can operate discovery state');
SELECT is(has_table_privilege('vpn_sentry','private.clip_trigger_phrases','SELECT,INSERT,UPDATE,DELETE'),true,'Sentry can operate trigger phrases');

INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state,received_at,finished_at) VALUES
  ('20000000-0000-0000-0000-000000000001','OldCompleted123','https://clips.twitch.tv/OldCompleted123','manual','completed','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldNoMatch123','https://clips.twitch.tv/OldNoMatch123','manual','no_match','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldUnavailable123','https://clips.twitch.tv/OldUnavailable123','manual','source_unavailable','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldFailed123','https://clips.twitch.tv/OldFailed123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldCancelled123','https://clips.twitch.tv/OldCancelled123','manual','cancelled_consent','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','RecentTerminal123','https://clips.twitch.tv/RecentTerminal123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-21T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldPending123','https://clips.twitch.tv/OldPending123','manual','pending_captions','2026-01-01T00:00:00Z',NULL),
  ('20000000-0000-0000-0000-000000000001','OldProcessing123','https://clips.twitch.tv/OldProcessing123','manual','processing','2026-01-01T00:00:00Z',NULL);
SELECT is(private.purge_expired_clip_submissions('2026-10-18T00:00:00Z'),5,'cleanup returns the number of expired terminal rows deleted');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id IN ('OldCompleted123','OldNoMatch123','OldUnavailable123','OldFailed123','OldCancelled123')),0,'all terminal states older than 90 days are removed');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='RecentTerminal123'),1,'terminal submission newer than 90 days is retained');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='OldPending123'),1,'old pending submission is retained');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='OldProcessing123'),1,'old processing submission with a timestamp is retained by state guard');
SELECT * FROM finish();
ROLLBACK;
