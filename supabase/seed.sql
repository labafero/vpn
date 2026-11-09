INSERT INTO public.market_items (name, created_by) VALUES
  ('Kit médico civil', NULL),
  ('Kit médico policial', NULL),
  ('Analgésico', NULL),
  ('Tratamento médico', NULL),
  ('Auto tratamento médico', NULL),
  ('Apartamento padrão', NULL),
  ('Bitcoin', NULL),
  ('Kit de reparo', NULL)
ON CONFLICT (normalized_name) DO NOTHING;
