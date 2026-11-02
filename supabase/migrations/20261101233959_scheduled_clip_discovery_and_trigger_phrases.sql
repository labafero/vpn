ALTER TABLE private.clip_processing_consents
  ADD COLUMN scheduled_consent_version text,
  ADD COLUMN scheduled_consented_at timestamptz,
  ADD COLUMN scheduled_revoked_at timestamptz,
  ADD COLUMN scheduled_revision uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD CONSTRAINT clip_scheduled_consent_version_check
    CHECK (scheduled_consent_version IS NULL OR scheduled_consent_version = 'clip-scheduled-v1'),
  ADD CONSTRAINT clip_scheduled_consent_timestamps_check
    CHECK (
      (scheduled_enabled AND scheduled_consent_version = 'clip-scheduled-v1' AND scheduled_consented_at IS NOT NULL AND scheduled_revoked_at IS NULL)
      OR (NOT scheduled_enabled AND (scheduled_revoked_at IS NULL OR scheduled_consented_at IS NULL OR scheduled_revoked_at >= scheduled_consented_at))
    );

ALTER TABLE private.clip_submissions
  DROP CONSTRAINT clip_submissions_state_check,
  ADD CONSTRAINT clip_submissions_state_check CHECK (state IN (
    'pending_metadata', 'pending_captions', 'needs_transcription_request', 'needs_openai_key', 'pending_asr',
    'processing', 'waiting_capacity', 'needs_trigger_phrases', 'completed', 'no_match',
    'source_unavailable', 'failed_retryable', 'failed_terminal', 'cancelled_consent'
  ));

ALTER TABLE private.clip_detections
  DROP CONSTRAINT clip_detections_phrase_id_check,
  ADD CONSTRAINT clip_detections_phrase_id_check
    CHECK (phrase_id ~ '^(phrase-v1-[0-9]{2}|[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12})$');

CREATE TABLE private.clip_discovery_state (
  channel_id uuid PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  phase text NOT NULL DEFAULT 'backfill' CHECK (phase IN ('backfill', 'incremental')),
  window_started_at timestamptz,
  window_ended_at timestamptz,
  pending_windows jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(pending_windows) = 'array'),
  items_in_window integer NOT NULL DEFAULT 0 CHECK (items_in_window >= 0),
  pagination_cursor text,
  lease_until timestamptz,
  last_checked_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (window_ended_at IS NULL OR window_started_at IS NULL OR window_ended_at > window_started_at)
);

CREATE TABLE private.clip_trigger_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  text text NOT NULL CHECK (length(btrim(text)) BETWEEN 1 AND 200),
  normalized_text text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, normalized_text)
);

CREATE INDEX clip_trigger_phrases_enabled_idx
  ON private.clip_trigger_phrases(channel_id, enabled, created_at);

REVOKE ALL ON TABLE private.clip_discovery_state, private.clip_trigger_phrases
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.clip_discovery_state, private.clip_trigger_phrases
  TO vpn_sentry;

-- Consent is independently revocable by capture mode. Only matching work is cancelled.
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
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clip_processing_consents_cancel_matching_work
  AFTER UPDATE OF manual_enabled, scheduled_enabled ON private.clip_processing_consents
  FOR EACH ROW EXECUTE FUNCTION private.revoke_clip_work_for_consent();

CREATE FUNCTION private.revoke_clips_on_connection_revocation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.status NOT IN ('revocation_pending', 'revoked') AND NEW.status IN ('revocation_pending', 'revoked') THEN
    UPDATE private.clip_processing_consents cc
      SET manual_enabled=false,
          revoked_at=CASE WHEN cc.manual_enabled THEN now() ELSE cc.revoked_at END,
          scheduled_enabled=false,
          scheduled_revoked_at=CASE WHEN cc.scheduled_enabled THEN now() ELSE cc.scheduled_revoked_at END,
          scheduled_revision=gen_random_uuid()
      FROM public.channels c
      WHERE c.connection_id=NEW.id AND cc.channel_id=c.id;

    UPDATE private.clip_discovery_state ds
      SET phase='backfill', window_started_at=NULL, window_ended_at=NULL,
          pending_windows='[]'::jsonb, items_in_window=0,
          pagination_cursor=NULL, lease_until=NULL, completed_at=NULL, updated_at=now()
      FROM public.channels c
      WHERE c.connection_id=NEW.id AND ds.channel_id=c.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.revoke_clips_on_connection_revocation()
  FROM PUBLIC, anon, authenticated, vpn_sentry;
CREATE TRIGGER revoke_clips_on_connection_revocation
  AFTER UPDATE OF status ON public.provider_connections
  FOR EACH ROW EXECUTE FUNCTION private.revoke_clips_on_connection_revocation();
