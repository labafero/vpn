-- Advance the queue on attempts without claiming successful token validation.
ALTER TABLE private.provider_credentials ADD COLUMN last_attempt_at timestamptz;
CREATE INDEX provider_credentials_last_attempt_idx ON private.provider_credentials(last_attempt_at);
