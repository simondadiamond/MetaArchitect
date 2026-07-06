#!/usr/bin/env bash
# /weekly-review data gatherer — READ-ONLY. Emits one JSON object on stdout.
# Usage: gather.sh [WEEK_START]   (WEEK_START = a Monday, ISO date; defaults to Monday of current week)
# STATE (E — Explicit): every response is validated before use. Any core-source
# failure prints "FAILED at <stage>: <detail>" to stderr and exits non-zero.
# Optional sources (MailerLite, lessons.md) degrade to {"skipped": true, "reason": ...}.
set -euo pipefail

ROOT=/home/diamond/projects/MetaArchitect
ENV_FILE="$ROOT/projects/command-center/.env"
LESSONS="$ROOT/docs/lessons.md"
TMP=$(mktemp -d /tmp/weekly-review.XXXXXX)
trap 'rm -rf "$TMP"' EXIT

stage="env"
fail() { echo "FAILED at $stage: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "missing $ENV_FILE"
set -a; source "$ENV_FILE"; set +a
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"
[ -n "$SUPABASE_URL" ] && [ -n "$KEY" ] || fail "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set in $ENV_FILE"

WEEK_START="${1:-$(python3 -c 'import datetime as d;t=d.date.today();print((t-d.timedelta(days=t.weekday())).isoformat())')}"
WEEK_END=$(python3 -c "import datetime as d;print((d.date.fromisoformat('$WEEK_START')+d.timedelta(days=7)).isoformat())")
STALE_CUTOFF=$(python3 -c "import datetime as d;print((d.date.today()-d.timedelta(days=14)).isoformat())")
python3 -c "import datetime as d,sys; sys.exit(0 if d.date.fromisoformat('$WEEK_START').weekday()==0 else 1)" \
  || fail "WEEK_START $WEEK_START is not a Monday"

# pg <stage> <rest-path-with-query> <outfile> [schema-profile]
# Validates: curl succeeded AND body is a JSON array (PostgREST errors are objects).
pg() {
  local st="$1" path="$2" out="$3" profile="${4:-public}"
  stage="$st"
  curl -s --max-time 30 "$SUPABASE_URL/rest/v1/$path" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Accept-Profile: $profile" -o "$out" || fail "curl error on $path"
  python3 -c "import json;d=json.load(open('$out'));assert isinstance(d,list),d" 2>/dev/null \
    || fail "response is not a JSON array: $(head -c 300 "$out")"
}

# --- Goals (public schema). Status vocabulary: pending|in_progress|done|blocked|archived ---
pg goals_in_progress "goals?select=id,title,kind,priority,updated_at&status=eq.in_progress&order=updated_at.desc" "$TMP/gip.json"
pg goals_completed   "goals?select=id,title,kind,completed_at&status=eq.done&completed_at=gte.$WEEK_START&completed_at=lt.$WEEK_END" "$TMP/gdone.json"
pg goals_blocked     "goals?select=id,title,kind,updated_at&status=eq.blocked&updated_at=gte.$WEEK_START&updated_at=lt.$WEEK_END" "$TMP/gblk.json"
pg goals_stale       "goals?select=id,title,kind,updated_at&status=eq.in_progress&updated_at=lt.$STALE_CUTOFF&order=updated_at.asc" "$TMP/gstale.json"

# --- Content cadence (pipeline schema — needs Accept-Profile: pipeline) ---
pg posts "posts?select=id,status,pillar,intent,planned_week,drafted_at,published_at,performance_score&or=(and(drafted_at.gte.$WEEK_START,drafted_at.lt.$WEEK_END),and(published_at.gte.$WEEK_START,published_at.lt.$WEEK_END))" "$TMP/posts.json" pipeline

# --- Story pipeline (public schema) ---
pg stories "stories?select=id,title,stage,failed_stage,error,target_repo,updated_at&stage=in.(merged,failed,needs_review)&updated_at=gte.$WEEK_START&updated_at=lt.$WEEK_END&order=updated_at.desc" "$TMP/stories.json"

# --- Leads / ICP conversations (public schema, optional — table lands with story 2d378962; degrade until then) ---
stage="leads"
curl -s --max-time 30 "$SUPABASE_URL/rest/v1/leads?select=id,name,company,channel,source_ref,status,created_at&created_at=gte.$WEEK_START&created_at=lt.$WEEK_END&order=created_at.desc" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/leads.json" \
  || echo '{"skipped": true, "reason": "curl error on leads"}' > "$TMP/leads.json"
python3 -c "import json;d=json.load(open('$TMP/leads.json'));assert isinstance(d,list)" 2>/dev/null \
  || echo '{"skipped": true, "reason": "leads table not available yet (story 2d378962 pending)"}' > "$TMP/leads.json"

# --- Engage queue health (public schema, optional — degrade, don't abort) ---
stage="engage"
curl -s --max-time 30 "$SUPABASE_URL/rest/v1/engage_comments?select=id,status,created_at,updated_at&or=(created_at.gte.$WEEK_START,updated_at.gte.$WEEK_START)&created_at=lt.$WEEK_END&order=created_at.desc" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/engage_comments.json" \
  || echo '[]' > "$TMP/engage_comments.json"
curl -s --max-time 30 "$SUPABASE_URL/rest/v1/engage_posts?select=id,status,error,updated_at&status=eq.error&updated_at=gte.$WEEK_START&updated_at=lt.$WEEK_END" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/engage_errors.json" \
  || echo '[]' > "$TMP/engage_errors.json"
python3 -c "
import json
try:
    c = json.load(open('$TMP/engage_comments.json')); e = json.load(open('$TMP/engage_errors.json'))
    assert isinstance(c, list) and isinstance(e, list)
    out = {
        'drafted_this_week': sum(1 for x in c if x.get('created_at','') >= '$WEEK_START'),
        'engaged': sum(1 for x in c if x.get('status') == 'engaged'),
        'skipped': sum(1 for x in c if x.get('status') == 'skipped'),
        'still_new': sum(1 for x in c if x.get('status') == 'new'),
        'sweep_post_errors': len(e),
    }
except Exception as ex:
    out = {'skipped': True, 'reason': f'engage tables not readable: {ex}'}
json.dump(out, open('$TMP/engage.json','w'))
" || echo '{"skipped": true, "reason": "engage aggregation failed"}' > "$TMP/engage.json"

# --- Lessons (local file, optional — degrade, don't abort) ---
stage="lessons"
if [ -f "$LESSONS" ]; then
  python3 - "$LESSONS" "$WEEK_START" "$WEEK_END" > "$TMP/lessons.json" <<'PYEOF'
import json, re, sys, datetime as d
path, ws, we = sys.argv[1], d.date.fromisoformat(sys.argv[2]), d.date.fromisoformat(sys.argv[3])
out = []
for line in open(path, encoding="utf-8"):
    m = re.match(r"^##\s+(\d{4}-\d{2}-\d{2})\s*[—:-]?\s*(.*)", line)
    if m:
        dt = d.date.fromisoformat(m.group(1))
        if ws <= dt < we:
            out.append({"date": m.group(1), "title": m.group(2).strip()})
print(json.dumps(out))
PYEOF
else
  echo '{"skipped": true, "reason": "docs/lessons.md not found"}' > "$TMP/lessons.json"
fi

# --- MailerLite (optional — degrade, don't abort). Cloudflare blocks default curl UA. ---
stage="mailerlite"
ML_KEY=""
for f in "$ROOT"/projects/simonparis-website/.env "$ROOT"/projects/simonparis-website/.env.local "$ROOT"/projects/simonparis-website/.env.production; do
  [ -f "$f" ] || continue
  v=$(grep -m1 '^MAILERLITE_API_KEY=' "$f" | cut -d= -f2- | tr -d '"' || true)
  case "$v" in ""|*your*|*xxx*|*XXX*|*placeholder*) ;; *) ML_KEY="$v"; break ;; esac
done
if [ -z "$ML_KEY" ]; then
  echo '{"skipped": true, "reason": "no MAILERLITE_API_KEY in simonparis-website/.env*"}' > "$TMP/ml.json"
else
  if curl -s --max-time 30 "https://connect.mailerlite.com/api/groups?limit=50" \
       -H "Authorization: Bearer $ML_KEY" -H "Accept: application/json" \
       -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0" \
       -o "$TMP/ml_raw.json" \
     && python3 -c "import json;d=json.load(open('$TMP/ml_raw.json'));assert isinstance(d.get('data'),list)" 2>/dev/null; then
    python3 - "$TMP/ml_raw.json" > "$TMP/ml.json" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))["data"]
groups = [{"name": g.get("name"), "active_count": g.get("active_count")} for g in d]
total = sum(g["active_count"] or 0 for g in groups)
print(json.dumps({"groups": groups, "subscribers_total": total}))
PYEOF
  else
    echo '{"skipped": true, "reason": "MailerLite API call failed or returned invalid JSON"}' > "$TMP/ml.json"
  fi
fi

# --- Previous review (for subscribers_delta; optional — table may not exist yet) ---
stage="previous_review"
curl -s --max-time 30 "$SUPABASE_URL/rest/v1/weekly_reviews?select=week_start,metrics&week_start=lt.$WEEK_START&order=week_start.desc&limit=1" \
  -H "apikey: $KEY" -H "Authorization: Bearer $KEY" -o "$TMP/prev.json" || echo '[]' > "$TMP/prev.json"
python3 -c "import json;d=json.load(open('$TMP/prev.json'));assert isinstance(d,list)" 2>/dev/null || echo '[]' > "$TMP/prev.json"

# --- Assemble ---
stage="assemble"
python3 - "$TMP" "$WEEK_START" "$WEEK_END" "$STALE_CUTOFF" <<'PYEOF'
import json, sys
t, ws, we, sc = sys.argv[1:5]
load = lambda n: json.load(open(f"{t}/{n}"))
print(json.dumps({
    "week_start": ws, "week_end": we, "stale_cutoff": sc,
    "goals": {
        "in_progress": load("gip.json"),
        "completed_this_week": load("gdone.json"),
        "newly_blocked": load("gblk.json"),
        "stale_in_progress": load("gstale.json"),
    },
    "posts": load("posts.json"),
    "stories": load("stories.json"),
    "leads": load("leads.json"),
    "engage": load("engage.json"),
    "lessons": load("lessons.json"),
    "mailerlite": load("ml.json"),
    "previous_review": load("prev.json"),
}, indent=2))
PYEOF
