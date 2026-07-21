#!/bin/bash
# pipeline-rest.sh '<rest-query>' [--schema pipeline] [--method PATCH --data '<json>']
# Authed Supabase REST call against the command-center project, loading its .env at
# point of use. Examples:
#   pipeline-rest.sh 'posts?status=eq.drafted&select=id,source_angle_name' --schema pipeline
#   pipeline-rest.sh 'blog_posts?slug=eq.foo&select=status'
#   pipeline-rest.sh 'goals?id=eq.<uuid>' --method PATCH --data '{"status":"done"}'
set -euo pipefail
QUERY="${1:?usage: pipeline-rest.sh '<rest-query>' [--schema pipeline] [--method M --data JSON]}"
shift
SCHEMA="" METHOD="GET" DATA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --schema) SCHEMA="$2"; shift 2 ;;
    --method) METHOD="$2"; shift 2 ;;
    --data)   DATA="$2"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done
set -a; source /home/diamond/projects/MetaArchitect/projects/command-center/.env >/dev/null 2>&1; set +a
ARGS=(-s -X "$METHOD" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/$QUERY"
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
[ -n "$SCHEMA" ] && { ARGS+=(-H "Accept-Profile: $SCHEMA"); [ "$METHOD" != "GET" ] && ARGS+=(-H "Content-Profile: $SCHEMA"); }
[ -n "$DATA" ] && ARGS+=(-H "content-type: application/json" -H "Prefer: return=minimal" -d "$DATA")
curl "${ARGS[@]}"
