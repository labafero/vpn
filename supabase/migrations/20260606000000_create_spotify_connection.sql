CREATE TABLE spotify_connection (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE spotify_connection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can manage their own connection"
    ON spotify_connection
    FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "service_role can read all"
    ON spotify_connection
    FOR SELECT
    USING (true);
