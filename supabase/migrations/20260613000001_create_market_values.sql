CREATE TABLE public.market_values (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cidade     TEXT NOT NULL DEFAULT '',
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  trend      TEXT NOT NULL DEFAULT 'stable' CHECK (trend IN ('up', 'down', 'stable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX market_values_user_cidade_label_created
  ON public.market_values (user_id, cidade, label, created_at DESC);

CREATE VIEW public.market_values_latest AS
SELECT DISTINCT ON (user_id, cidade, label)
  id, user_id, cidade, label, value, trend, created_at
FROM public.market_values
ORDER BY user_id, cidade, label, created_at DESC;

ALTER TABLE public.market_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_values_public_read"
  ON public.market_values FOR SELECT USING (true);

CREATE POLICY "market_values_auth_insert"
  ON public.market_values FOR INSERT
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.market_values;
