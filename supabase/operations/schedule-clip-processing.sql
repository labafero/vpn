-- Review and execute only after deploying Sentry with the worker secret configured.
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
  target text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_clip_worker_url');
  secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_clip_worker_secret');
  bypass text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass');
BEGIN
  IF target IS NULL OR target <> 'https://vpn-sentry.labafero.com/api/internal/clips/process' THEN
    RAISE EXCEPTION 'Configure the custom production Sentry clip worker URL in Vault';
  END IF;
  IF secret IS NULL OR length(secret) < 32 THEN
    RAISE EXCEPTION 'Configure vpn_clip_worker_secret in Vault with at least 32 characters';
  END IF;
  IF bypass IS NULL OR length(bypass) = 0 THEN
    RAISE EXCEPTION 'Configure vpn_vercel_cron_bypass in Vault for the protected production deployment';
  END IF;
END $check$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='vpn-clip-processing';
SELECT cron.schedule('vpn-clip-processing', '7,37 * * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_clip_worker_url'),
    headers := jsonb_strip_nulls(jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_clip_worker_secret'),
      'x-vercel-protection-bypass', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass')
    )),
    body := '{}'::jsonb,
    timeout_milliseconds := 240000
  );
$job$);
SELECT cron.alter_job((SELECT jobid FROM cron.job WHERE jobname='vpn-clip-processing'), active := true);
COMMIT;

-- Observe metadata only; do not select request headers or Vault values.
-- SELECT jobid,jobname,schedule,active FROM cron.job WHERE jobname='vpn-clip-processing';
-- SELECT id,status_code,created FROM net._http_response ORDER BY created DESC LIMIT 20;
-- Remove only this job with:
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='vpn-clip-processing';
