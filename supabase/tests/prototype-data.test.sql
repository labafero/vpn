BEGIN;
SELECT plan(2);

SELECT is(
  (
    SELECT string_agg(name, '|' ORDER BY normalized_name COLLATE "C")
    FROM public.market_items
    WHERE created_by IS NULL
  ),
  'Analgésico|Apartamento padrão|Auto tratamento médico|Bitcoin|Kit de reparo|Kit médico civil|Kit médico policial|Tratamento médico',
  'standard market catalog has the expected entries'
);

SELECT is(
  to_regclass('public.server_clock')::text,
  NULL::text,
  'obsolete server_clock table is absent'
);

SELECT * FROM finish();
ROLLBACK;
