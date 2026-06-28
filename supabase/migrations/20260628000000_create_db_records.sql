CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.db_records (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('pessoa', 'empresa_legal', 'empresa_ilegal', 'veiculo')),
  nome       TEXT NOT NULL DEFAULT '',
  dados      JSONB NOT NULL DEFAULT '{}',
  cidade     TEXT REFERENCES public.city_config(slug) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX db_records_type_idx   ON public.db_records (type);
CREATE INDEX db_records_cidade_idx ON public.db_records (cidade);
CREATE INDEX db_records_nome_idx   ON public.db_records USING gin (to_tsvector('portuguese', nome));

CREATE TRIGGER set_db_records_updated_at
  BEFORE UPDATE ON public.db_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.db_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "db_records_auth_read"
  ON public.db_records FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "db_records_auth_insert"
  ON public.db_records FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "db_records_auth_update"
  ON public.db_records FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "db_records_auth_delete"
  ON public.db_records FOR DELETE USING (auth.uid() IS NOT NULL);

-- ---------------------------------------------------------------

CREATE TABLE public.db_record_notes (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  record_id  BIGINT NOT NULL REFERENCES public.db_records(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX db_record_notes_record_id_idx ON public.db_record_notes (record_id);

ALTER TABLE public.db_record_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "db_record_notes_auth_read"
  ON public.db_record_notes FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "db_record_notes_auth_insert"
  ON public.db_record_notes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "db_record_notes_auth_delete"
  ON public.db_record_notes FOR DELETE USING (auth.uid() = created_by);
