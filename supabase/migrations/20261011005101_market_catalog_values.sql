CREATE TABLE public.market_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  normalized_name TEXT GENERATED ALWAYS AS (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) STORED UNIQUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.market_items(name) VALUES
('Kit médico civil'),('Kit médico policial'),('Analgésico'),('Tratamento médico'),
('Auto tratamento médico'),('Apartamento padrão'),('Bitcoin'),('Kit de reparo');

CREATE TABLE public.market_values (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  cidade TEXT NOT NULL REFERENCES public.city_config(slug) ON DELETE RESTRICT,
  item_id BIGINT NOT NULL REFERENCES public.market_items(id) ON DELETE RESTRICT,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0 AND amount <= 999999999999.99),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX market_values_series ON public.market_values(user_id,cidade,item_id,created_at DESC,id DESC);
CREATE INDEX market_values_recent ON public.market_values(user_id,item_id,created_at DESC,id DESC);
CREATE VIEW public.market_values_latest WITH (security_invoker=true) AS
SELECT DISTINCT ON (user_id,cidade,item_id) id,user_id,cidade,item_id,amount,created_at
FROM public.market_values ORDER BY user_id,cidade,item_id,created_at DESC,id DESC;

ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_values ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.market_items,public.market_values,public.market_values_latest FROM anon,authenticated;
GRANT SELECT ON public.market_items,public.market_values,public.market_values_latest TO anon,authenticated;
GRANT INSERT (name,created_by) ON public.market_items TO authenticated;
GRANT INSERT (user_id,cidade,item_id,amount) ON public.market_values TO authenticated;
GRANT USAGE ON SEQUENCE public.market_items_id_seq,public.market_values_id_seq TO authenticated;
CREATE POLICY market_items_read ON public.market_items FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY market_items_insert ON public.market_items FOR INSERT TO authenticated
  WITH CHECK (created_by=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=(SELECT auth.uid())));
CREATE POLICY market_values_read ON public.market_values FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY market_values_insert ON public.market_values FOR INSERT TO authenticated
  WITH CHECK (user_id=(SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=(SELECT auth.uid())));

CREATE FUNCTION public.find_or_create_market_item(p_name TEXT) RETURNS public.market_items
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE found public.market_items;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.editorial_members WHERE user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Acesso editorial necessário' USING ERRCODE='42501';
  END IF;
  INSERT INTO public.market_items(name,created_by)
    VALUES (regexp_replace(btrim(p_name),'\s+',' ','g'),auth.uid())
    ON CONFLICT (normalized_name) DO NOTHING;
  SELECT * INTO STRICT found FROM public.market_items
    WHERE normalized_name=lower(regexp_replace(btrim(p_name),'\s+',' ','g'));
  RETURN found;
END;
$$;
REVOKE ALL ON FUNCTION public.find_or_create_market_item(TEXT) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.find_or_create_market_item(TEXT) TO authenticated;
