CREATE TABLE private.user_provider_credentials (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider = 'openai'),
  ciphertext text NOT NULL,
  iv text NOT NULL,
  tag text NOT NULL,
  key_version text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, provider)
);

ALTER TABLE private.user_provider_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.user_provider_credentials FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.user_provider_credentials TO vpn_sentry;
CREATE POLICY user_provider_credentials_vpn_sentry_all
  ON private.user_provider_credentials
  TO vpn_sentry
  USING (true)
  WITH CHECK (true);

ALTER TABLE private.clip_submissions
  DROP CONSTRAINT clip_submissions_state_check,
  DROP COLUMN transcription_requested_at;
ALTER TABLE private.clip_submissions
  RENAME COLUMN transcription_attempts TO processing_attempts;

ALTER TABLE private.clip_submissions
  ADD CONSTRAINT clip_submissions_state_check CHECK (state IN (
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
  ));
