UPDATE private.clip_submissions
SET state = 'pending_captions', finished_at = NULL
WHERE state NOT IN (
  'pending_metadata',
  'pending_captions',
  'needs_openai_key',
  'processing',
  'completed',
  'no_match',
  'source_unavailable',
  'failed_retryable',
  'failed_terminal',
  'cancelled_consent'
);

ALTER TABLE private.clip_detections
  DROP CONSTRAINT IF EXISTS clip_detections_source_check;

UPDATE private.clip_detections
SET source = 'openai'
WHERE source NOT IN ('captions', 'openai');

ALTER TABLE private.clip_detections
  ADD CONSTRAINT clip_detections_source_check CHECK (source IN ('captions', 'openai'));
