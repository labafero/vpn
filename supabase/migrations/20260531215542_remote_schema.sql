-- Initial schema pulled from remote project

CREATE TABLE IF NOT EXISTS public.posts (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title text NOT NULL,
    body text NOT NULL DEFAULT ''::text,
    cover_url text NOT NULL DEFAULT ''::text,
    user_id uuid NOT NULL DEFAULT auth.uid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    media_url text,
    media_type text CHECK (media_type = ANY (ARRAY['audio'::text, 'video'::text]))
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select own posts"
  ON public.posts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for post media
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('post-media', 'post-media', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

-- Storage RLS policies
CREATE POLICY "upload post-media authenticated"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media');

CREATE POLICY "select post-media public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'post-media');

CREATE POLICY "delete post-media own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND owner_id = auth.uid()::text);
