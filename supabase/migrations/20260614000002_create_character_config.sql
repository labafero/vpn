CREATE TABLE character_config (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cidade TEXT NOT NULL REFERENCES city_config(slug) ON DELETE CASCADE,
  character_name TEXT NOT NULL DEFAULT '',
  passport_id TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cidade)
);

ALTER TABLE character_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners can manage their character config"
  ON character_config FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "anyone can read character config"
  ON character_config FOR SELECT USING (true);

-- Migra dados existentes de broadcast_config para character_config
INSERT INTO character_config (user_id, cidade, character_name, passport_id, phone)
SELECT bc.user_id, bc.cidade, bc.character_name, bc.passport_id, bc.phone
FROM broadcast_config bc
JOIN city_config cc ON cc.slug = bc.cidade
WHERE bc.cidade IS NOT NULL
  AND (bc.character_name <> '' OR bc.passport_id <> '' OR bc.phone <> '')
ON CONFLICT (user_id, cidade) DO NOTHING;

ALTER TABLE broadcast_config DROP COLUMN character_name;
ALTER TABLE broadcast_config DROP COLUMN passport_id;
ALTER TABLE broadcast_config DROP COLUMN phone;
