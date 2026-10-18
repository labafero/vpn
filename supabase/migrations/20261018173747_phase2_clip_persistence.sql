-- Metadata-only clip intake. Media is never stored by this migration.
CREATE TABLE private.clip_processing_consents (
  channel_id uuid PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  consent_version text NOT NULL CHECK (consent_version = 'clip-processing-v1'),
  consented_at timestamptz NOT NULL,
  revoked_at timestamptz,
  manual_enabled boolean NOT NULL DEFAULT false,
  scheduled_enabled boolean NOT NULL DEFAULT false,
  CHECK (revoked_at IS NULL OR revoked_at >= consented_at)
);

CREATE TABLE private.clip_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  twitch_clip_id text NOT NULL CHECK (twitch_clip_id ~ '^[A-Za-z0-9_-]{1,100}$'),
  canonical_url text NOT NULL,
  broadcaster_id text,
  creator_id text,
  title text,
  video_id text,
  vod_offset integer CHECK (vod_offset IS NULL OR vod_offset >= 0),
  created_at timestamptz,
  duration_seconds numeric(8,3) CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  language text CHECK (language IS NULL OR length(language) BETWEEN 2 AND 12),
  view_count bigint CHECK (view_count IS NULL OR view_count >= 0),
  capture_mode text NOT NULL CHECK (capture_mode IN ('manual', 'scheduled')),
  state text NOT NULL DEFAULT 'pending_metadata' CHECK (state IN (
    'pending_metadata',
    'pending_captions',
    'needs_transcription_request',
    'pending_asr',
    'processing',
    'completed',
    'no_match',
    'source_unavailable',
    'failed_retryable',
    'failed_terminal',
    'cancelled_consent'
  )),
  received_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  failure_code text CHECK (failure_code IS NULL OR failure_code IN (
    'clip_unavailable',
    'captions_unavailable',
    'transcription_failed',
    'quota_exceeded',
    'unsupported_language',
    'invalid_media',
    'provider_error'
  )),
  UNIQUE (channel_id, twitch_clip_id),
  CHECK (canonical_url = 'https://clips.twitch.tv/' || twitch_clip_id)
);

CREATE INDEX clip_submissions_state_received_idx
  ON private.clip_submissions(state, received_at);
CREATE INDEX clip_submissions_terminal_retention_idx
  ON private.clip_submissions(finished_at)
  WHERE finished_at IS NOT NULL;

REVOKE ALL ON TABLE private.clip_processing_consents, private.clip_submissions
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE private.clip_processing_consents, private.clip_submissions
  TO vpn_sentry;

CREATE FUNCTION private.purge_expired_clip_submissions(p_now timestamptz)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM private.clip_submissions
  WHERE state IN ('completed', 'no_match', 'source_unavailable', 'failed_terminal', 'cancelled_consent')
    AND finished_at <= p_now - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION private.purge_expired_clip_submissions(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.purge_expired_clip_submissions(timestamptz)
  TO vpn_sentry;
