-- Execute manually after the Sentry deployment and Vault secrets are reviewed.
-- Schedules at :15 and :45, between OAuth validation runs at :00 and :30.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $roles$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname IN ('anon', 'authenticated') AND rolcanlogin) THEN
    RAISE EXCEPTION 'Browser roles must not have database LOGIN privileges';
  END IF;
END $roles$;

DO $check$
DECLARE
  target text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_sentry_reconciliation_url');
  secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_twitch_cron_secret');
  bypass text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass');
BEGIN
  IF target IS NULL OR target <> 'https://vpn-sentry.labafero.com/api/internal/twitch/reconcile' THEN
    RAISE EXCEPTION 'Configure the custom production Sentry reconciliation URL in Vault';
  END IF;
  IF secret IS NULL OR length(secret) < 32 THEN
    RAISE EXCEPTION 'Configure vpn_twitch_cron_secret in Vault with at least 32 characters';
  END IF;
  IF bypass IS NULL OR length(bypass) = 0 THEN
    RAISE EXCEPTION 'Configure vpn_vercel_cron_bypass in Vault for the protected production deployment';
  END IF;
END $check$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='vpn-twitch-reconciliation';
SELECT cron.schedule('vpn-twitch-reconciliation', '15,45 * * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_sentry_reconciliation_url'),
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_twitch_cron_secret'),
      'x-vercel-protection-bypass', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass')
    )),
    body := '{}'::jsonb,
    timeout_milliseconds := 240000
  );
$job$);
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='vpn-twitch-reconciliation'), active := true);
COMMIT;

-- Observe metadata only; do not select request headers or Vault values.
-- SELECT jobid,jobname,schedule,active FROM cron.job WHERE jobname='vpn-twitch-reconciliation';
-- SELECT id,status_code,created FROM net._http_response ORDER BY created DESC LIMIT 20;
-- Roll back this operation only with:
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='vpn-twitch-reconciliation';
