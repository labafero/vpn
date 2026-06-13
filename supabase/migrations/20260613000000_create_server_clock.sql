-- Singleton row that anchors Los Santos time to a real-world BRT timestamp.
-- 1 LS day = 48 real minutes, so the multiplier is 30x.
CREATE TABLE public.server_clock (
  id integer PRIMARY KEY DEFAULT 1,
  brt_reference timestamptz NOT NULL DEFAULT now(),
  ls_hours integer NOT NULL DEFAULT 0,
  ls_minutes integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT server_clock_singleton CHECK (id = 1)
);

-- Seed with a neutral anchor (will be overwritten on first sync).
INSERT INTO public.server_clock (id, brt_reference, ls_hours, ls_minutes)
VALUES (1, now(), 0, 0);

-- Overlays run anonymously; authenticated users write.
ALTER TABLE public.server_clock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "server_clock_public_read" ON public.server_clock
  FOR SELECT USING (true);

CREATE POLICY "server_clock_auth_write" ON public.server_clock
  FOR ALL USING (auth.uid() IS NOT NULL);
