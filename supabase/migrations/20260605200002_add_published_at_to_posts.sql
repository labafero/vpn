ALTER TABLE public.posts
  ADD COLUMN published_at timestamp with time zone;

UPDATE public.posts SET published_at = created_at;

ALTER TABLE public.posts
  ALTER COLUMN published_at SET NOT NULL;
