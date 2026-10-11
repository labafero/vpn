CREATE TABLE public.db_record_relations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES public.db_records(id) ON DELETE CASCADE,
  target_id BIGINT NOT NULL REFERENCES public.db_records(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (char_length(btrim(kind)) BETWEEN 1 AND 50),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (source_id<>target_id), UNIQUE(source_id,target_id,kind)
);
CREATE INDEX db_record_relations_target ON public.db_record_relations(target_id);
ALTER TABLE public.db_record_relations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.db_record_relations FROM anon,authenticated;
GRANT SELECT,INSERT,DELETE ON public.db_record_relations TO authenticated;
GRANT USAGE ON SEQUENCE public.db_record_relations_id_seq TO authenticated;
CREATE POLICY editorial_relations_read ON public.db_record_relations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=(SELECT auth.uid())));
CREATE POLICY editorial_relations_insert ON public.db_record_relations FOR INSERT TO authenticated
  WITH CHECK (created_by=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=(SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.db_records WHERE id=source_id) AND EXISTS (SELECT 1 FROM public.db_records WHERE id=target_id));
CREATE POLICY editorial_relations_delete ON public.db_record_relations FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=(SELECT auth.uid())));

ALTER TABLE public.db_records ADD CONSTRAINT db_record_name_valid CHECK (char_length(btrim(nome)) BETWEEN 1 AND 200) NOT VALID;
ALTER TABLE public.db_record_notes ADD CONSTRAINT db_record_note_valid CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000) NOT VALID;
CREATE FUNCTION public.valid_record_data(data JSONB) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $$
SELECT CASE WHEN jsonb_typeof(data)<>'object' THEN false ELSE
  NOT EXISTS (SELECT 1 FROM jsonb_each(data) entry WHERE jsonb_typeof(entry.value)<>'string' OR char_length(entry.value #>> '{}')>1000)
END;
$$;
REVOKE ALL ON FUNCTION public.valid_record_data(JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.valid_record_data(JSONB) TO authenticated;
ALTER TABLE public.db_records ADD CONSTRAINT db_record_data_valid CHECK (public.valid_record_data(dados)) NOT VALID;
