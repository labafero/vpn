-- Review before applying as postgres; this schedules metadata-only cleanup.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'vpn-clip-submission-retention';

SELECT cron.schedule(
  'vpn-clip-submission-retention',
  '17 3 * * *',
  $cleanup$
    SELECT private.purge_expired_clip_submissions(now());
  $cleanup$
);
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'vpn-clip-submission-retention'),
  active := true
);
COMMIT;

-- Observe only the scheduled job metadata; do not activate this in production as part of issue #14.
-- SELECT jobid,jobname,schedule,active FROM cron.job WHERE jobname='vpn-clip-submission-retention';
-- Remove the job with:
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='vpn-clip-submission-retention';
