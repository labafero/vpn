-- Apply as postgres. Keep expired OAuth transaction cleanup independent from Twitch validation.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'vpn-twitch-oauth-cleanup';

SELECT cron.schedule(
  'vpn-twitch-oauth-cleanup',
  '17 3 * * *',
  $cleanup$
    DELETE FROM private.oauth_transactions
    WHERE expires_at < now() - interval '24 hours';
  $cleanup$
);
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'vpn-twitch-oauth-cleanup'),
  active := true
);
COMMIT;
