CREATE FUNCTION public.get_overlay_market_values(p_broadcaster_id UUID,p_cidade TEXT DEFAULT NULL)
RETURNS TABLE(id BIGINT,item_id BIGINT,item_name TEXT,cidade TEXT,amount NUMERIC,created_at TIMESTAMPTZ,trend TEXT)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
WITH series AS (
  SELECT mv.*, lag(mv.amount) OVER (PARTITION BY mv.user_id,mv.cidade,mv.item_id ORDER BY mv.created_at,mv.id) AS previous
  FROM public.market_values mv WHERE mv.user_id=p_broadcaster_id AND (p_cidade IS NULL OR mv.cidade=p_cidade)
), ranked AS (
  SELECT s.*, row_number() OVER (PARTITION BY s.item_id ORDER BY s.created_at DESC,s.id DESC) AS rank
  FROM series s
)
SELECT r.id,r.item_id,i.name,r.cidade,r.amount,r.created_at,
  CASE WHEN r.previous IS NULL OR r.previous=r.amount THEN 'stable' WHEN r.amount>r.previous THEN 'up' ELSE 'down' END
FROM ranked r JOIN public.market_items i ON i.id=r.item_id
WHERE r.rank=1 ORDER BY r.created_at DESC,r.id DESC LIMIT 10;
$$;
REVOKE ALL ON FUNCTION public.get_overlay_market_values(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_overlay_market_values(UUID,TEXT) TO anon,authenticated;
