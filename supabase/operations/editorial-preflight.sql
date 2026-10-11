-- Somente leitura. Executar no projeto confirmado antes de autorizar as
-- migrations editoriais; não substitui a aprovação da lista de editores.
BEGIN READ ONLY;

SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;

-- Inventário de autores sem copiar conteúdo ou endereços pessoais.
SELECT created_by AS author_id, count(*) AS records
FROM public.db_records GROUP BY created_by ORDER BY records DESC;
SELECT created_by AS author_id, count(*) AS notes
FROM public.db_record_notes GROUP BY created_by ORDER BY notes DESC;

SELECT
  count(*) FILTER (WHERE char_length(btrim(nome)) NOT BETWEEN 1 AND 200) AS invalid_names,
  count(*) FILTER (WHERE jsonb_typeof(dados) <> 'object' OR EXISTS (
    SELECT 1 FROM jsonb_each(CASE WHEN jsonb_typeof(dados) = 'object' THEN dados ELSE '{}'::jsonb END) entry
    WHERE jsonb_typeof(entry.value) <> 'string' OR char_length(entry.value #>> '{}') > 1000
  )) AS invalid_data
FROM public.db_records;
SELECT count(*) AS invalid_notes FROM public.db_record_notes
WHERE char_length(btrim(body)) NOT BETWEEN 1 AND 5000;

-- Depois de aplicar a migration, estes checks devem ser validados somente
-- após resolver dados incompatíveis sem excluir conteúdo automaticamente.
SELECT conname, convalidated FROM pg_constraint
WHERE conname IN ('db_record_name_valid', 'db_record_data_valid', 'db_record_note_valid');

ROLLBACK;
