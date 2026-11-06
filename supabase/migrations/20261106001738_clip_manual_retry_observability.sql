ALTER TABLE private.clip_submissions
  ADD COLUMN manual_retry_requested_at timestamptz,
  ADD COLUMN manual_retry_token uuid,
  ADD COLUMN manual_retry_consent_revision text,
  ADD CONSTRAINT clip_submissions_manual_retry_token_check
    CHECK ((manual_retry_token IS NULL) = (manual_retry_consent_revision IS NULL));

CREATE INDEX clip_submissions_manual_retry_queue_idx
  ON private.clip_submissions (manual_retry_requested_at, received_at)
  WHERE state IN ('pending_captions', 'failed_retryable', 'waiting_capacity')
    AND manual_retry_requested_at IS NOT NULL;
