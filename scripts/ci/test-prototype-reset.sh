#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

for dependency in supabase jq python3; do
  command -v "$dependency" >/dev/null || { printf 'Dependência ausente: %s\n' "$dependency" >&2; exit 1; }
done

supabase status >/dev/null

restore_local_database() {
  local status=$?
  trap - EXIT
  if ! supabase db reset --local >/dev/null 2>&1; then
    printf 'Não foi possível restaurar o banco Supabase local após o teste.\n' >&2
    status=1
  fi
  exit "$status"
}
trap restore_local_database EXIT

fixture_user='00000000-0000-0000-0000-000000000099'
supabase db query --local "INSERT INTO auth.users(id) VALUES ('$fixture_user')"
supabase db query --local "INSERT INTO public.market_items(name,created_by) VALUES ('Reset test market item','$fixture_user')"
supabase db query --local "INSERT INTO public.market_values(user_id,cidade,item_id,amount) SELECT '$fixture_user','neon',id,10 FROM public.market_items WHERE normalized_name='reset test market item'"

supabase db query --local --file supabase/operations/reset-prototype-data-cleanup.sql
supabase db query --local --file supabase/seed.sql
supabase db query --local --file supabase/seed.sql

verification_sql="SELECT
  (SELECT count(*) FROM auth.users)=0 AS no_users,
  (SELECT count(*) FROM public.posts)=0 AS no_posts,
  (SELECT count(*) FROM public.city_seasons)=0 AS no_city_seasons,
  (SELECT count(*) FROM public.market_values)=0 AS no_market_values,
  (SELECT count(*) FROM public.city_config)=0 AS no_city_config,
  (SELECT count(*) FROM public.market_items)=8 AS eight_catalog_items,
  (SELECT count(*) FROM public.market_items WHERE created_by IS NULL)=8 AS all_catalog_items_are_defaults,
  (SELECT string_agg(normalized_name, ',' ORDER BY normalized_name COLLATE \"C\") FROM public.market_items)='analgésico,apartamento padrão,auto tratamento médico,bitcoin,kit de reparo,kit médico civil,kit médico policial,tratamento médico' AS exact_catalog"
result_json="$(supabase db query --local --output json "$verification_sql" | python3 -c 'import json,sys; s=sys.stdin.read(); i=s.find("{"); assert i >= 0, "Supabase CLI não retornou JSON"; obj,_=json.JSONDecoder().raw_decode(s[i:]); print(json.dumps(obj))')"
if ! jq -e '.rows[0] | .no_users and .no_posts and .no_city_seasons and .no_market_values and .no_city_config and .eight_catalog_items and .all_catalog_items_are_defaults and .exact_catalog' <<<"$result_json" >/dev/null; then
  printf 'O reset local deixou estado inesperado: %s\n' "$(jq -c '.rows[0]' <<<"$result_json")" >&2
  exit 1
fi

printf 'Reset local verificado: cidades vazias e oito itens padrão de mercado.\n'
