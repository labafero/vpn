BEGIN;
SELECT plan(8);
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000031'),('00000000-0000-0000-0000-000000000032');
INSERT INTO market_values(user_id,cidade,item_id,amount,created_at)
SELECT '00000000-0000-0000-0000-000000000031','neon',id,10,'2026-01-01' FROM market_items;
INSERT INTO market_values(user_id,cidade,item_id,amount,created_at)
SELECT '00000000-0000-0000-0000-000000000031','dallas',min(id),20,'2026-01-02' FROM market_items;
INSERT INTO market_values(user_id,cidade,item_id,amount,created_at)
SELECT '00000000-0000-0000-0000-000000000031','dallas',min(id),30,'2026-01-02' FROM market_items;
INSERT INTO market_values(user_id,cidade,item_id,amount,created_at)
SELECT '00000000-0000-0000-0000-000000000031','neon',min(id),11,'2026-01-03'::timestamptz+n*interval '1 second' FROM market_items CROSS JOIN generate_series(1,11) n GROUP BY n;
INSERT INTO market_values(user_id,cidade,item_id,amount,created_at)
SELECT '00000000-0000-0000-0000-000000000032','neon',min(id),999,'2026-01-04' FROM market_items;
SET LOCAL ROLE anon;
SELECT is((SELECT count(*)::integer FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031',NULL)),8,'deduplicates by item across cities before limiting');
SELECT is((SELECT count(*)::integer FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031','neon')),8,'repeated recent quotes do not hide other items');
SELECT is((SELECT count(*)::integer FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031','dallas')),1,'active city filters');
SELECT is((SELECT amount::text FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031','dallas')),'30.00','timestamp ties use descending identity');
SELECT is((SELECT trend FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031','dallas')),'up','trend compares prior value of same city');
SELECT is((SELECT cidade FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031',NULL) ORDER BY created_at DESC LIMIT 1),'neon','no city includes latest origin');
SELECT is((SELECT amount::text FROM get_overlay_market_values('00000000-0000-0000-0000-000000000032',NULL)),'999.00','broadcasters remain isolated');
SELECT is((SELECT count(*)::integer FROM get_overlay_market_values('00000000-0000-0000-0000-000000000031','vice')),0,'empty active city does not fallback');
SELECT * FROM finish();
ROLLBACK;
