#!/usr/bin/env bash
# /weekly-review insert — writes one row to public.weekly_reviews via PostgREST.
# Usage: insert-review.sh <payload.json>
# Behavior:
#   - Validates the payload (E — Explicit) before any network call.
#   - If the table is missing (PostgREST error code PGRST205, parsed from the JSON
#     error object — never grepped from the body, which may legitimately mention
#     the string), retries once after 5s (2 attempts total).
#   - On table-missing exhaustion: writes summary_md to the fallback path, exits 2.
#   - On success: prints the inserted row (JSON, includes id), exits 0.
#   - Any other failure: prints "FAILED at insert: ..." to stderr, exits 1.
set -euo pipefail

ROOT=/home/diamond/projects/MetaArchitect
ENV_FILE="$ROOT/projects/command-center/.env"
FALLBACK="$ROOT/projects/Content-Engine/.tmp/weekly-review-fallback.md"
PAYLOAD="${1:?usage: insert-review.sh <payload.json>}"

set -a; source "$ENV_FILE"; set +a
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:?}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:?}"

# Validation gate — never send a malformed review (E — Explicit).
python3 - "$PAYLOAD" <<'PYEOF'
import json, sys
p = json.load(open(sys.argv[1]))
required = ["week_start", "title", "summary_md", "metrics", "flags", "next_actions"]
missing = [k for k in required if k not in p]
assert not missing, f"payload missing keys: {missing}"
assert isinstance(p["metrics"], dict), "metrics must be an object"
assert isinstance(p["flags"], list), "flags must be an array of strings"
assert isinstance(p["next_actions"], list), "next_actions must be an array of strings"
assert len(p["summary_md"].strip()) > 100, "summary_md suspiciously short"
for k in ["posts_published", "posts_target", "stories_merged", "stories_failed",
          "goals_completed", "goals_stale"]:
    assert k in p["metrics"], f"metrics missing required key: {k}"
PYEOF

ATTEMPTS=2
for attempt in $(seq 1 $ATTEMPTS); do
  resp=$(curl -s --max-time 30 -X POST "$SUPABASE_URL/rest/v1/weekly_reviews" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "content-type: application/json" -H "Prefer: return=representation" \
    -d @"$PAYLOAD") || { echo "FAILED at insert: curl error (attempt $attempt)" >&2; exit 1; }
  # Table-missing check: parse the JSON error object's code field — a success body is
  # an array, and a summary_md that merely mentions "PGRST205" must not trip this.
  if echo "$resp" | python3 -c 'import json,sys; d=json.load(sys.stdin); sys.exit(0 if isinstance(d,dict) and d.get("code")=="PGRST205" else 1)' 2>/dev/null; then
    echo "attempt $attempt/$ATTEMPTS: weekly_reviews table not found — retry in 5s" >&2
    [ "$attempt" -lt "$ATTEMPTS" ] && sleep 5
    continue
  fi
  if echo "$resp" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert isinstance(d,list) and d[0].get("id")' 2>/dev/null; then
    echo "$resp"
    exit 0
  fi
  echo "FAILED at insert: unexpected response: $(echo "$resp" | head -c 400)" >&2
  exit 1
done

mkdir -p "$(dirname "$FALLBACK")"
python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["summary_md"])' "$PAYLOAD" > "$FALLBACK"
echo "weekly_reviews table missing after $ATTEMPTS attempts — review saved to $FALLBACK" >&2
exit 2
