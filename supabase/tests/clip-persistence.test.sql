BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(35);

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
RESET ROLE;

SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at) VALUES ('20000000-0000-0000-0000-000000000001','monitoring-v2',now())$$,'23514',NULL,'only clip-processing consent version is accepted');
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

SET LOCAL ROLE vpn_sentry;
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='UniqueClip123'),1,'Sentry can read persisted submissions');
SELECT is((SELECT count(*)::integer FROM private.clip_processing_consents),1,'Sentry can read persisted consent');
UPDATE private.clip_processing_consents SET scheduled_enabled=true;
SELECT is((SELECT scheduled_enabled FROM private.clip_processing_consents),true,'Sentry can update consent');
DELETE FROM private.clip_processing_consents;
SELECT is((SELECT count(*)::integer FROM private.clip_processing_consents),0,'Sentry can delete consent');
INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled)
VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now(),true);
SELECT is((SELECT count(*)::integer FROM private.clip_processing_consents),1,'Sentry can insert consent');
RESET ROLE;

INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state,received_at,finished_at) VALUES
  ('20000000-0000-0000-0000-000000000001','OldCompleted123','https://clips.twitch.tv/OldCompleted123','manual','completed','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldNoMatch123','https://clips.twitch.tv/OldNoMatch123','manual','no_match','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldUnavailable123','https://clips.twitch.tv/OldUnavailable123','manual','source_unavailable','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldFailed123','https://clips.twitch.tv/OldFailed123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldCancelled123','https://clips.twitch.tv/OldCancelled123','manual','cancelled_consent','2026-07-01T00:00:00Z','2026-07-18T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','RecentTerminal123','https://clips.twitch.tv/RecentTerminal123','manual','failed_terminal','2026-07-01T00:00:00Z','2026-07-21T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldPending123','https://clips.twitch.tv/OldPending123','manual','pending_asr','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z'),
  ('20000000-0000-0000-0000-000000000001','OldProcessing123','https://clips.twitch.tv/OldProcessing123','manual','processing','2026-01-01T00:00:00Z','2026-01-01T00:00:00Z');
SELECT is(private.purge_expired_clip_submissions('2026-10-18T00:00:00Z'),5,'cleanup returns the number of expired terminal rows deleted');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id IN ('OldCompleted123','OldNoMatch123','OldUnavailable123','OldFailed123','OldCancelled123')),0,'all terminal states older than 90 days are removed');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='RecentTerminal123'),1,'terminal submission newer than 90 days is retained');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='OldPending123'),1,'old pending submission is retained');
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='OldProcessing123'),1,'old processing submission with a timestamp is retained by state guard');
SELECT * FROM finish();
ROLLBACK;
