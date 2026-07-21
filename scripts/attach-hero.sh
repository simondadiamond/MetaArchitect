#!/bin/bash
# attach-hero.sh <slug> <hero-url> <alt-text-file> [--timeout-min N]
# Polls public.blog_posts for <slug>; when the row exists and has no hero, PATCHes
# hero_image_url + hero_image_alt. Idempotent: exits 0 without writing if a hero is
# already set. JSON body is built by python3 (never shell interpolation — an
# apostrophe in alt text broke the 2026-07-21 original).
# Env: command-center/.env (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).
set -euo pipefail
SLUG="${1:?usage: attach-hero.sh <slug> <hero-url> <alt-text-file> [--timeout-min N]}"
HERO_URL="${2:?hero url required}"
ALT_FILE="${3:?alt text file required}"
TIMEOUT_MIN=120
[ "${4:-}" = "--timeout-min" ] && TIMEOUT_MIN="${5:?minutes}"
[ -r "$ALT_FILE" ] || { echo "alt file not readable: $ALT_FILE"; exit 1; }

set -a; source /home/diamond/projects/MetaArchitect/projects/command-center/.env >/dev/null 2>&1; set +a

for i in $(seq 1 "$TIMEOUT_MIN"); do
  ROW=$(curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/blog_posts?slug=eq.$SLUG&select=id,hero_image_url" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY")
  if [ "$ROW" != "[]" ]; then
    HAS=$(echo "$ROW" | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['hero_image_url'] or '')")
    if [ -n "$HAS" ]; then echo "hero already set: $HAS"; exit 0; fi
    BODY=$(python3 -c "
import json, sys
alt = open(sys.argv[1]).read().strip()
print(json.dumps({'hero_image_url': sys.argv[2], 'hero_image_alt': alt}))
" "$ALT_FILE" "$HERO_URL")
    CODE=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/blog_posts?slug=eq.$SLUG" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
      -H "content-type: application/json" -H "Prefer: return=minimal" -d "$BODY")
    if [ "$CODE" = "204" ]; then echo "hero attached to $SLUG at $(date -Is)"; exit 0; fi
    echo "PATCH failed with $CODE"; exit 1
  fi
  sleep 60
done
echo "timed out after ${TIMEOUT_MIN}m — blog_posts row for $SLUG never appeared"; exit 1
