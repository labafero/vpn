-- Durable one-at-a-time clip processing and minimal detections.
ALTER TABLE private.clip_submissions
  ADD COLUMN transcription_attempts smallint NOT NULL DEFAULT 0
    CHECK (transcription_attempts BETWEEN 0 AND 3),
  ADD COLUMN transcription_requested_at timestamptz,
  ADD COLUMN processing_lease_until timestamptz,
  ADD COLUMN retry_after timestamptz;

CREATE UNIQUE INDEX clip_submissions_single_processing_idx
  ON private.clip_submissions ((true))
  WHERE state = 'processing';

CREATE INDEX clip_submissions_asr_queue_idx
  ON private.clip_submissions (received_at, retry_after)
  WHERE state IN ('pending_captions', 'failed_retryable');

CREATE TABLE private.clip_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES private.clip_submissions(id) ON DELETE CASCADE,
  phrase_id text NOT NULL CHECK (phrase_id ~ '^phrase-v1-[0-9]{2}$'),
  phrase_version smallint NOT NULL CHECK (phrase_version > 0),
  phrase_text text NOT NULL CHECK (length(phrase_text) BETWEEN 1 AND 200),
  source text NOT NULL CHECK (source IN ('captions', 'openai')),
  start_ms integer NOT NULL CHECK (start_ms >= 0),
  end_ms integer NOT NULL CHECK (end_ms >= start_ms),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, phrase_id, phrase_version, start_ms, end_ms)
);

CREATE INDEX clip_detections_submission_idx
  ON private.clip_detections (submission_id, start_ms);

REVOKE ALL ON TABLE private.clip_detections
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.clip_detections
  TO vpn_sentry;
