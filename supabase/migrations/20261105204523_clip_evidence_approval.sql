ALTER TABLE private.clip_submissions
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT clip_submissions_approval_pair_check
    CHECK ((approved_at IS NULL) = (approved_by IS NULL)),
  ADD CONSTRAINT clip_submissions_approval_requires_completed_check
    CHECK (approved_at IS NULL OR state = 'completed');

CREATE INDEX clip_submissions_approved_channel_created_idx
  ON private.clip_submissions (channel_id, created_at DESC)
  WHERE approved_at IS NOT NULL AND created_at IS NOT NULL;
