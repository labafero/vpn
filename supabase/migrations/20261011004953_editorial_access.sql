CREATE TABLE public.editorial_members (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.editorial_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.editorial_members FROM anon, authenticated;
GRANT SELECT ON public.editorial_members TO authenticated;
CREATE POLICY editorial_members_self ON public.editorial_members FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY db_records_auth_read ON public.db_records;
DROP POLICY db_records_auth_insert ON public.db_records;
DROP POLICY db_records_auth_update ON public.db_records;
DROP POLICY db_records_auth_delete ON public.db_records;
DROP POLICY db_record_notes_auth_read ON public.db_record_notes;
DROP POLICY db_record_notes_auth_insert ON public.db_record_notes;
DROP POLICY db_record_notes_auth_delete ON public.db_record_notes;

REVOKE ALL ON public.db_records, public.db_record_notes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.db_records, public.db_record_notes TO authenticated;
GRANT UPDATE (nome, dados, cidade) ON public.db_records TO authenticated;
GRANT UPDATE (body) ON public.db_record_notes TO authenticated;
GRANT USAGE ON SEQUENCE public.db_records_id_seq, public.db_record_notes_id_seq TO authenticated;

CREATE POLICY editorial_records_read ON public.db_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_records_insert ON public.db_records FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_records_update ON public.db_records FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_records_delete ON public.db_records FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));

CREATE POLICY editorial_notes_read ON public.db_record_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_notes_insert ON public.db_record_notes FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_notes_update ON public.db_record_notes FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
CREATE POLICY editorial_notes_delete ON public.db_record_notes FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id = (SELECT auth.uid())));
