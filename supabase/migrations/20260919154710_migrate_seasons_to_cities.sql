CREATE TABLE public.city_seasons (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cidade TEXT NOT NULL REFERENCES public.city_config(slug) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 50),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.posts
  ADD COLUMN season_id BIGINT REFERENCES public.city_seasons(id) ON DELETE SET NULL;

INSERT INTO public.city_seasons (cidade, label, ended_at)
SELECT DISTINCT cidade, trim(season), now()
FROM public.posts
WHERE NULLIF(trim(season), '') IS NOT NULL;

UPDATE public.posts AS posts
SET season_id = city_seasons.id
FROM public.city_seasons
WHERE posts.cidade = city_seasons.cidade
  AND trim(posts.season) = city_seasons.label;

CREATE UNIQUE INDEX city_seasons_one_active_per_city
  ON public.city_seasons (cidade)
  WHERE ended_at IS NULL;

ALTER TABLE public.city_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can read city seasons"
  ON public.city_seasons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated can create city seasons"
  ON public.city_seasons FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated can update city seasons"
  ON public.city_seasons FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.posts
  DROP COLUMN season;
