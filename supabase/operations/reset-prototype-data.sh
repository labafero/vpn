#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

usage() {
  cat <<'USAGE'
Uso:
  supabase/operations/reset-prototype-data.sh --project-ref REF --project-name NAME
  supabase/operations/reset-prototype-data.sh --project-ref REF --project-name NAME --apply

Sem --apply, apenas mostra o escopo encontrado. A execução exige digitar
"RESET <nome> <ref>" e cria backup local antes de alterar o projeto.
USAGE
}

project_ref=''
project_name=''
apply=false
while (($#)); do
  case "$1" in
    --project-ref) project_ref="${2:?Falta o valor de --project-ref}"; shift 2 ;;
    --project-name) project_name="${2:?Falta o valor de --project-name}"; shift 2 ;;
    --apply) apply=true; shift ;;
    --help|-h) usage; exit 0 ;;
    *) printf 'Argumento desconhecido: %s\n' "$1" >&2; usage >&2; exit 2 ;;
  esac
done

if [[ ! "$project_ref" =~ ^[a-z0-9]{20}$ || -z "$project_name" ]]; then
  usage >&2
  exit 2
fi

for dependency in supabase jq python3 sha256sum; do
  command -v "$dependency" >/dev/null || { printf 'Dependência ausente: %s\n' "$dependency" >&2; exit 1; }
done

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
job_names="'vpn-twitch-validation','vpn-twitch-reconciliation','vpn-clip-processing','vpn-clip-discovery'"
backup_dir=''
cron_state=''
crons_paused=false

extract_json() {
  python3 -c 'import json,sys; s=sys.stdin.read(); i=s.find("{"); assert i >= 0, "Supabase CLI não retornou JSON"; obj,_=json.JSONDecoder().raw_decode(s[i:]); print(json.dumps(obj))'
}

db_query() {
  local raw
  if ! raw="$(supabase db query --linked --project-ref "$project_ref" --workdir "$repo_root" --output json "$1" 2>&1)"; then
    printf '%s\n' "$raw" | sed -E 's/(PGPASSWORD=).*/\1<redigido>/; s/(password=).*/\1<redigido>/I' >&2
    return 1
  fi
  printf '%s\n' "$raw" | extract_json
}

run_db_file() {
  local sql_file="$1"
  local log_name="$2"
  local log_file="$backup_dir/$log_name"
  if ! supabase db query --linked --project-ref "$project_ref" --workdir "$repo_root" --output json --file "$sql_file" >"$log_file" 2>&1; then
    printf 'Falha ao executar o arquivo SQL %s.\n' "$sql_file" >&2
    sed -E 's/(PGPASSWORD=).*/\1<redigido>/; s/(password=).*/\1<redigido>/I' "$log_file" >&2
    return 1
  fi
}

restore_crons() {
  [[ "$crons_paused" == true ]] || return 0
  while IFS=$'\t' read -r job_id was_active; do
    [[ -n "$job_id" && "$was_active" == true ]] || continue
    db_query "SELECT cron.alter_job(${job_id}, active := true)" >/dev/null
  done <<< "$cron_state"
  crons_paused=false
}

on_exit() {
  local status=$?
  trap - EXIT
  if ((status != 0)) && [[ -n "$backup_dir" && -d "$backup_dir" ]]; then
    printf 'Backup/logs desta tentativa: %s\n' "$backup_dir" >&2
  fi
  if [[ "$crons_paused" == true ]]; then
    if ! restore_crons; then
      printf 'ERRO: não foi possível restaurar o estado original dos crons. Consulte cron.job no projeto %s.\n' "$project_ref" >&2
      status=1
    fi
  fi
  exit "$status"
}

projects_raw="$(supabase projects list --output json 2>&1)" || { printf '%s\n' "$projects_raw" >&2; exit 1; }
projects_json="$(printf '%s\n' "$projects_raw" | extract_json)"
if ! jq -e --arg ref "$project_ref" --arg name "$project_name" '.projects | any(.[]; .ref == $ref and .name == $name and .status == "ACTIVE_HEALTHY")' <<<"$projects_json" >/dev/null; then
  printf 'Projeto não confirmado ou não saudável: ref=%s nome=%s\n' "$project_ref" "$project_name" >&2
  exit 1
fi

counts_sql="SELECT
  (SELECT count(*) FROM auth.users) AS auth_users,
  (SELECT count(*) FROM public.posts) AS posts,
  (SELECT count(*) FROM public.city_seasons) AS city_seasons,
  (SELECT count(*) FROM public.channels) AS channels,
  (SELECT count(*) FROM public.provider_connections) AS provider_connections,
  (SELECT count(*) FROM private.provider_credentials) AS provider_credentials,
  (SELECT count(*) FROM private.clip_submissions) AS clip_submissions,
  (SELECT count(*) FROM private.twitch_eventsub_messages) AS eventsub_messages,
  (SELECT count(*) FROM private.access_invites) AS invites,
  (SELECT count(*) FROM private.twitch_eventsub_subscriptions WHERE subscription_id IS NOT NULL) AS active_eventsub_subscriptions,
  (SELECT count(*) FROM storage.objects) AS storage_objects,
  (SELECT count(*) FROM public.city_config) AS city_config_rows,
  (SELECT count(*) FROM public.market_items) AS market_items,
  (SELECT count(*) FROM public.market_items WHERE created_by IS NULL) AS builtin_market_items,
  (SELECT count(*) FROM public.market_items WHERE created_by IS NULL AND normalized_name IN ('kit médico civil','kit médico policial','analgésico','tratamento médico','auto tratamento médico','apartamento padrão','bitcoin','kit de reparo')) AS standard_market_items,
  (SELECT count(*) FROM public.market_items WHERE created_by IS NOT NULL) AS custom_market_items,
  (SELECT count(*) FROM supabase_migrations.schema_migrations) AS migrations"
counts_json="$(db_query "$counts_sql")"
jq -r --arg name "$project_name" --arg ref "$project_ref" '.rows[0] | "Projeto: \($name) (\($ref))\nContas: \(.auth_users); posts: \(.posts); clips: \(.clip_submissions); canais Twitch: \(.channels)\nMensagens EventSub: \(.eventsub_messages); convites: \(.invites); objetos Storage: \(.storage_objects)\nDados reinicializados: \(.city_config_rows) cidades serão removidas; \(.market_items) itens de mercado serão substituídos pelo seed. Migrations preservadas: \(.migrations)"' <<<"$counts_json"

if [[ "$apply" != true ]]; then
  printf '\nSimulação apenas; nenhuma alteração foi feita. Para executar, repita com --apply.\n'
  exit 0
fi

printf '\nA ação apaga contas, posts, clips e demais dados ligados a usuários, além de todos os objetos Storage, das configurações de cidade e do catálogo de mercado.\n'
printf 'As cidades ficarão sem configuração; os oito itens padrão de mercado serão restaurados pelo seed. Schema, migrations, buckets e segredos do Vault serão mantidos.\n'
read -r -p "Digite RESET ${project_name} ${project_ref} para continuar: " confirmation
[[ "$confirmation" == "RESET ${project_name} ${project_ref}" ]] || { printf 'Confirmação não corresponde; nada foi alterado.\n'; exit 1; }

state_home="${XDG_STATE_HOME:-${HOME:?HOME não definido}/.local/state}"
backup_root="$state_home/vpn-backups"
mkdir -p "$backup_root"
chmod 700 "$backup_root"
safe_project_name="${project_name//[^a-zA-Z0-9._-]/_}"
backup_dir="$backup_root/reset-${safe_project_name}-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$backup_dir"
mkdir -m 700 "$backup_dir/storage"

cron_json="$(db_query "SELECT jobid,jobname,active FROM cron.job WHERE jobname IN (${job_names}) ORDER BY jobname")"
[[ "$(jq '.rows | length' <<<"$cron_json")" -eq 4 ]] || { printf 'Esperava encontrar exatamente os quatro crons VPN; limpeza cancelada.\n' >&2; exit 1; }
cron_state="$(jq -r '.rows[] | [.jobid,(.active|tostring)] | @tsv' <<<"$cron_json")"
trap on_exit EXIT

crons_paused=true
db_query "SELECT cron.alter_job(jobid, active := false) FROM cron.job WHERE jobname IN (${job_names}) AND active" >/dev/null

supabase db dump --linked --schema auth,storage,public,private --project-ref "$project_ref" --workdir "$repo_root" --file "$backup_dir/schema.sql" >"$backup_dir/schema.log" 2>&1
supabase db dump --linked --schema auth,storage,public,private --data-only --use-copy --exclude storage.vector_indexes --exclude storage.buckets_vectors --project-ref "$project_ref" --workdir "$repo_root" --file "$backup_dir/data.sql" >"$backup_dir/data.log" 2>&1
[[ -s "$backup_dir/schema.sql" && -s "$backup_dir/data.sql" ]] || { printf 'Dump do banco incompleto; limpeza cancelada. Backup: %s\n' "$backup_dir" >&2; exit 1; }

buckets_json="$(db_query "SELECT id, (SELECT count(*) FROM storage.objects o WHERE o.bucket_id=b.id) AS objects FROM storage.buckets b ORDER BY id")"
while IFS=$'\t' read -r bucket expected_objects; do
  [[ "$bucket" =~ ^[a-zA-Z0-9._-]+$ ]] || { printf 'Nome de bucket fora do formato aceito; limpeza cancelada.\n' >&2; exit 1; }
  bucket_dir="$backup_dir/storage/$bucket"
  mkdir -m 700 "$bucket_dir"
  if ((expected_objects > 0)); then
    supabase storage cp --experimental --recursive --linked --project-ref "$project_ref" "ss:///$bucket" "$bucket_dir" >"$backup_dir/storage-${bucket}.log" 2>&1
  fi
  copied_objects="$(find "$bucket_dir" -type f | wc -l | tr -d ' ')"
  [[ "$copied_objects" -eq "$expected_objects" ]] || { printf 'Backup incompleto no bucket %s (%s/%s arquivos); limpeza cancelada.\n' "$bucket" "$copied_objects" "$expected_objects" >&2; exit 1; }
done < <(jq -r '.rows[] | [.id,(.objects|tostring)] | @tsv' <<<"$buckets_json")

find "$backup_dir" -type f -print0 | sort -z | xargs -0 sha256sum >"$backup_dir/SHA256SUMS"
chmod -R go-rwx "$backup_dir"

connections_json="$(db_query "SELECT count(*) AS connected_without_credential FROM public.provider_connections c WHERE c.status='connected' AND NOT EXISTS (SELECT 1 FROM private.provider_credentials k WHERE k.connection_id=c.id)")"
connected_without_credential="$(jq -r '.rows[0].connected_without_credential' <<<"$connections_json")"
((connected_without_credential == 0)) || { printf 'Há conexões Twitch sem credencial revogável; limpeza cancelada. Backup: %s\n' "$backup_dir" >&2; exit 1; }

db_query "UPDATE public.channels SET monitoring_enabled=false; UPDATE public.provider_connections SET status='revocation_pending',revoked_at=coalesce(revoked_at,now()) WHERE status<>'revocation_pending' AND EXISTS (SELECT 1 FROM private.provider_credentials k WHERE k.connection_id=public.provider_connections.id)" >/dev/null
pending_json="$(db_query "SELECT (SELECT count(*) FROM public.provider_connections WHERE status='revocation_pending') AS pending,(SELECT count(*) FROM private.provider_credentials) AS credentials")"
pending="$(jq -r '.rows[0].pending' <<<"$pending_json")"
if ((pending > 0)); then
  db_query "SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_sentry_validation_url'),headers := jsonb_strip_nulls(jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_twitch_cron_secret'),'x-vercel-protection-bypass',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass'))),body := '{}'::jsonb,timeout_milliseconds := 240000) AS request_id" >/dev/null
  for _ in {1..24}; do
    pending_json="$(db_query "SELECT (SELECT count(*) FROM public.provider_connections WHERE status='revocation_pending') AS pending,(SELECT count(*) FROM private.provider_credentials) AS credentials")"
    pending="$(jq -r '.rows[0].pending' <<<"$pending_json")"
    credentials="$(jq -r '.rows[0].credentials' <<<"$pending_json")"
    ((pending == 0 && credentials == 0)) && break
    sleep 5
  done
  ((pending == 0 && credentials == 0)) || { printf 'Revogação Twitch não foi confirmada; nada mais foi apagado. Backup: %s\n' "$backup_dir" >&2; exit 1; }
fi

subscriptions="$(jq -r '.rows[0].active_eventsub_subscriptions' <<<"$counts_json")"
if ((subscriptions > 0)); then
  db_query "SELECT net.http_post(url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_sentry_reconciliation_url'),headers := jsonb_strip_nulls(jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_twitch_cron_secret'),'x-vercel-protection-bypass',(SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='vpn_vercel_cron_bypass'))),body := '{}'::jsonb,timeout_milliseconds := 240000) AS request_id" >/dev/null
  for _ in {1..24}; do
    subscriptions="$(jq -r '.rows[0].active_eventsub_subscriptions' <<<"$(db_query "SELECT count(*) AS active_eventsub_subscriptions FROM private.twitch_eventsub_subscriptions WHERE subscription_id IS NOT NULL")")"
    ((subscriptions == 0)) && break
    sleep 5
  done
  ((subscriptions == 0)) || { printf 'Inscrições EventSub remotas ainda não foram confirmadas como removidas. Backup: %s\n' "$backup_dir" >&2; exit 1; }
fi

while IFS=$'\t' read -r bucket expected_objects; do
  if ((expected_objects > 0)); then
    supabase storage rm --experimental --yes --recursive --linked --project-ref "$project_ref" "ss:///$bucket" >"$backup_dir/storage-delete-${bucket}.log" 2>&1
  fi
done < <(jq -r '.rows[] | [.id,(.objects|tostring)] | @tsv' <<<"$buckets_json")

run_db_file "$repo_root/supabase/operations/reset-prototype-data-cleanup.sql" reset-cleanup.log
run_db_file "$repo_root/supabase/seed.sql" market-items-seed.log

after_json="$(db_query "$counts_sql")"
if ! jq -e '.rows[0] | .auth_users==0 and .posts==0 and .city_seasons==0 and .channels==0 and .provider_connections==0 and .provider_credentials==0 and .clip_submissions==0 and .eventsub_messages==0 and .invites==0 and .active_eventsub_subscriptions==0 and .storage_objects==0 and .city_config_rows==0 and .market_items==8 and .builtin_market_items==8 and .standard_market_items==8 and .custom_market_items==0' <<<"$after_json" >/dev/null; then
  printf 'Pós-verificação falhou; confira o projeto %s e o backup %s.\n' "$project_ref" "$backup_dir" >&2
  exit 1
fi
for field in migrations; do
  [[ "$(jq -r ".rows[0].$field" <<<"$counts_json")" == "$(jq -r ".rows[0].$field" <<<"$after_json")" ]] || { printf 'A pós-verificação detectou alteração inesperada em %s.\n' "$field" >&2; exit 1; }
done

restore_crons
printf 'Limpeza concluída. Backup local: %s\n' "$backup_dir"
