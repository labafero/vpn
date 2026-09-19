ALTER TABLE public.posts
ADD COLUMN season text
CHECK (char_length(season) <= 50);
