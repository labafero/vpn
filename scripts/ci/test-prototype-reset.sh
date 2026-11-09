#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$repo_root"

for dependency in supabase; do
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

verification_sql="DO \$\$
BEGIN
  IF (SELECT count(*) FROM auth.users) <> 0 THEN RAISE EXCEPTION 'Auth users remain'; END IF;
  IF (SELECT count(*) FROM public.posts) <> 0 THEN RAISE EXCEPTION 'Posts remain'; END IF;
  IF (SELECT count(*) FROM public.city_seasons) <> 0 THEN RAISE EXCEPTION 'City seasons remain'; END IF;
  IF (SELECT count(*) FROM public.market_values) <> 0 THEN RAISE EXCEPTION 'Market values remain'; END IF;
  IF (SELECT count(*) FROM public.city_config) <> 0 THEN RAISE EXCEPTION 'City configuration remains'; END IF;
  IF (SELECT count(*) FROM public.market_items) <> 8 THEN RAISE EXCEPTION 'Expected exactly eight catalog items'; END IF;
  IF (SELECT count(*) FROM public.market_items WHERE created_by IS NULL) <> 8 THEN RAISE EXCEPTION 'Custom market items remain'; END IF;
  IF coalesce((SELECT string_agg(normalized_name, ',' ORDER BY normalized_name COLLATE \"C\") FROM public.market_items), '') <> 'analgésico,apartamento padrão,auto tratamento médico,bitcoin,kit de reparo,kit médico civil,kit médico policial,tratamento médico' THEN RAISE EXCEPTION 'Market catalog does not match the seed'; END IF;
END
\$\$;"
supabase db query --local "$verification_sql"

printf 'Reset local verificado: cidades vazias e oito itens padrão de mercado.\n'
