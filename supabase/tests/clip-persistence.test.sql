BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(12);

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
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT throws_ok('SELECT * FROM private.clip_processing_consents','42501',NULL,'authenticated cannot read clip consent');
SELECT throws_ok('SELECT * FROM private.clip_submissions','42501',NULL,'authenticated cannot read clip submissions');
RESET ROLE;

SELECT throws_ok($$INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at) VALUES ('20000000-0000-0000-0000-000000000001','monitoring-v2',now())$$,'23514',NULL,'only clip-processing consent version is accepted');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000099','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata')$$,'23503',NULL,'submission requires an existing channel');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','InvalidState123','https://clips.twitch.tv/InvalidState123','manual','queued')$$,'23514',NULL,'unknown submission state is rejected');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','InvalidMode123','https://clips.twitch.tv/InvalidMode123','automatic','pending_metadata')$$,'23514',NULL,'unknown capture mode is rejected');

INSERT INTO private.clip_processing_consents(channel_id,consent_version,consented_at,manual_enabled)
VALUES ('20000000-0000-0000-0000-000000000001','clip-processing-v1',now(),true);
SELECT is((SELECT revoked_at IS NULL FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),true,'consent starts active');
UPDATE private.clip_processing_consents SET revoked_at=now() WHERE channel_id='20000000-0000-0000-0000-000000000001';
SELECT is((SELECT revoked_at IS NOT NULL FROM private.clip_processing_consents WHERE channel_id='20000000-0000-0000-0000-000000000001'),true,'revocation remains distinguishable from no consent row');
UPDATE private.clip_processing_consents SET revoked_at=NULL WHERE channel_id='20000000-0000-0000-0000-000000000001';
INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state)
VALUES ('20000000-0000-0000-0000-000000000001','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata');
SELECT throws_ok($$INSERT INTO private.clip_submissions(channel_id,twitch_clip_id,canonical_url,capture_mode,state) VALUES ('20000000-0000-0000-0000-000000000001','UniqueClip123','https://clips.twitch.tv/UniqueClip123','manual','pending_metadata')$$,'23505',NULL,'same channel and clip cannot be submitted twice');

SET LOCAL ROLE vpn_sentry;
SELECT is((SELECT count(*)::integer FROM private.clip_submissions WHERE twitch_clip_id='UniqueClip123'),1,'Sentry can read persisted submissions');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
