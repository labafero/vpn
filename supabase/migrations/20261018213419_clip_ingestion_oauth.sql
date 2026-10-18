-- Validated OAuth grants remain private; no browser grants are introduced.
ALTER TABLE private.provider_credentials ADD COLUMN scopes text[] NOT NULL DEFAULT '{}';
ALTER TABLE private.oauth_transactions
  DROP CONSTRAINT oauth_transactions_consent_version_check,
  ADD COLUMN connection_id uuid,
  ADD COLUMN provider_user_id text,
  ADD COLUMN required_scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN credential_fingerprint text,
  ADD CONSTRAINT oauth_transactions_consent_version_check CHECK (consent_version IN ('monitoring-v1', 'clip-processing-v1')),
  ADD CONSTRAINT oauth_transactions_upgrade_check CHECK (
    (consent_version = 'monitoring-v1' AND connection_id IS NULL AND provider_user_id IS NULL AND credential_fingerprint IS NULL AND cardinality(required_scopes) = 0)
    OR (consent_version = 'clip-processing-v1' AND connection_id IS NOT NULL AND provider_user_id IS NOT NULL AND credential_fingerprint IS NOT NULL AND cardinality(required_scopes) > 0)
  );
-- No FK: expired/replayed callbacks must remain consumed even after a disconnect/deletion.

-- Distinguish revoke/reaccept even within the same timestamp precision window.
ALTER TABLE private.clip_processing_consents ADD COLUMN revision uuid NOT NULL DEFAULT gen_random_uuid();
