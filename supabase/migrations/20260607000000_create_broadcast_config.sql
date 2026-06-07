CREATE TABLE broadcast_config (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    character_name TEXT NOT NULL DEFAULT '',
    passport_id TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE broadcast_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can manage their broadcast config"
    ON broadcast_config
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "anyone can read broadcast config"
    ON broadcast_config
    FOR SELECT
    USING (true);
