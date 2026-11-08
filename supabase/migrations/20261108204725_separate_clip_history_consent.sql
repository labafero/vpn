ALTER TABLE private.clip_processing_consents
  DROP CONSTRAINT clip_scheduled_consent_version_check,
  DROP CONSTRAINT clip_scheduled_consent_timestamps_check,
  ADD COLUMN scheduled_history_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN scheduled_history_consent_version text,
  ADD COLUMN scheduled_history_consented_at timestamptz,
  ADD COLUMN scheduled_history_revoked_at timestamptz;

-- Existing v1 grants combined historical and future capture. Require explicit v2
-- reauthorization so they cannot silently gain a different consent scope.
UPDATE private.clip_processing_consents
SET scheduled_enabled=false,
    scheduled_consent_version=NULL,
    scheduled_revoked_at=CASE WHEN scheduled_enabled THEN now() ELSE scheduled_revoked_at END,
    scheduled_history_enabled=false,
    scheduled_history_revoked_at=CASE WHEN scheduled_history_enabled THEN now() ELSE scheduled_history_revoked_at END,
    scheduled_revision=gen_random_uuid();

ALTER TABLE private.clip_processing_consents
  ADD CONSTRAINT clip_scheduled_consent_version_check
    CHECK (scheduled_consent_version IS NULL OR scheduled_consent_version = 'clip-scheduled-v2'),
  ADD CONSTRAINT clip_scheduled_consent_timestamps_check
    CHECK (
      (scheduled_enabled AND scheduled_consent_version = 'clip-scheduled-v2' AND scheduled_consented_at IS NOT NULL AND scheduled_revoked_at IS NULL)
      OR (NOT scheduled_enabled AND (scheduled_revoked_at IS NULL OR scheduled_consented_at IS NULL OR scheduled_revoked_at >= scheduled_consented_at))
    ),
  ADD CONSTRAINT clip_scheduled_history_consent_check
    CHECK (
      (scheduled_history_consent_version IS NULL OR scheduled_history_consent_version = 'clip-history-v1')
      AND ((scheduled_history_enabled AND scheduled_enabled AND scheduled_history_consent_version = 'clip-history-v1' AND scheduled_history_consented_at IS NOT NULL AND scheduled_history_revoked_at IS NULL)
      OR (NOT scheduled_history_enabled AND (scheduled_history_revoked_at IS NULL OR scheduled_history_consented_at IS NULL OR scheduled_history_revoked_at >= scheduled_history_consented_at))
      )
    );

ALTER TABLE private.clip_discovery_state ALTER COLUMN phase SET DEFAULT 'incremental';
UPDATE private.clip_discovery_state
SET phase='incremental', window_started_at=NULL, window_ended_at=NULL,
    pending_windows='[]'::jsonb, items_in_window=0, pagination_cursor=NULL,
    completed_at=NULL, lease_until=NULL, updated_at=now();

CREATE OR REPLACE FUNCTION private.revoke_clip_work_for_consent()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD.manual_enabled AND NOT NEW.manual_enabled THEN
    UPDATE private.clip_submissions SET state='cancelled_consent', finished_at=now()
    WHERE channel_id=NEW.channel_id AND capture_mode='manual'
      AND state NOT IN ('completed','no_match','source_unavailable','failed_terminal','cancelled_consent');
  END IF;
  IF OLD.scheduled_enabled AND NOT NEW.scheduled_enabled THEN
    UPDATE private.clip_submissions SET state='cancelled_consent', finished_at=now()
    WHERE channel_id=NEW.channel_id AND capture_mode='scheduled'
      AND state NOT IN ('completed','no_match','source_unavailable','failed_terminal','cancelled_consent');
    UPDATE private.clip_discovery_state SET lease_until=NULL,updated_at=now()
    WHERE channel_id=NEW.channel_id;
  END IF;
  IF OLD.scheduled_history_enabled AND NOT NEW.scheduled_history_enabled AND NEW.scheduled_enabled THEN
    UPDATE private.clip_submissions SET state='cancelled_consent', finished_at=now()
    WHERE channel_id=NEW.channel_id AND capture_mode='scheduled'
      AND (created_at IS NULL OR created_at <= NEW.scheduled_history_consented_at)
      AND state NOT IN ('completed','no_match','source_unavailable','failed_terminal','cancelled_consent');
    UPDATE private.clip_discovery_state SET phase='incremental',window_started_at=NULL,
      window_ended_at=NULL,pending_windows='[]'::jsonb,items_in_window=0,
      pagination_cursor=NULL,completed_at=NULL,lease_until=NULL,updated_at=now()
    WHERE channel_id=NEW.channel_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER clip_processing_consents_cancel_matching_work ON private.clip_processing_consents;
CREATE TRIGGER clip_processing_consents_cancel_matching_work
  AFTER UPDATE OF manual_enabled, scheduled_enabled, scheduled_history_enabled
  ON private.clip_processing_consents
  FOR EACH ROW EXECUTE FUNCTION private.revoke_clip_work_for_consent();
