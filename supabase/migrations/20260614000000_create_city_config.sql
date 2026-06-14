CREATE TABLE city_config (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  cidade_nome  TEXT NOT NULL,
  jornal_nome  TEXT NOT NULL,
  jornal_sigla TEXT NOT NULL DEFAULT 'TV',
  cor_primaria TEXT NOT NULL DEFAULT 'zinc',
  logo_url     TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE city_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON city_config FOR SELECT USING (true);
CREATE POLICY "auth write" ON city_config FOR ALL USING (auth.role() = 'authenticated');

INSERT INTO city_config (slug, cidade_nome, jornal_nome, jornal_sigla, cor_primaria) VALUES
  ('neon',     'Neon',     'Neon TV',           'NTV', 'purple'),
  ('nordeste', 'Nordeste', 'Nordeste News',      'NNW', 'green'),
  ('dallas',   'Dallas',   'Burn News',          'BRN', 'red'),
  ('vice',     'Vice',     'Radar Vice News',    'RVN', 'pink');
