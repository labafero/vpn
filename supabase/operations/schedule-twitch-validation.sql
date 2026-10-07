-- Apply as postgres after provisioning the two Vault secrets described in docs.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $check$
DECLARE
  target text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vpn_sentry_validation_url');
  secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vpn_twitch_cron_secret');
BEGIN
  IF target IS NULL OR target !~ '^https://[^/?#]+/api/internal/twitch/validate$' THEN
    RAISE EXCEPTION 'Configure vpn_sentry_validation_url in Vault with the complete HTTPS endpoint';
  END IF;
  IF secret IS NULL OR length(secret) < 32 THEN
    RAISE EXCEPTION 'Configure vpn_twitch_cron_secret in Vault with at least 32 characters';
  END IF;
END $check$;

SELECT cron.schedule('vpn-twitch-validation', '*/30 * * * *', $job$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vpn_sentry_validation_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'vpn_twitch_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 240000
  );
$job$);
COMMIT;
