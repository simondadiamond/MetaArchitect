#!/usr/bin/env bash
# linkedin-gate.sh — mechanical half of the shared LinkedIn copy gate, as a callable script.
# Canonical spec: .claude/skills/repurpose/references/linkedin-gate.md (judgment checks stay
# with the model; every grep in the "Mechanical checks" section lives HERE — change it here,
# never fork a local variant). Born 2026-07-13 (post-Fable gate build, goal 3df3143e).
#
# Usage:
#   scripts/linkedin-gate.sh <file>            # full gate for a LinkedIn post candidate
#   scripts/linkedin-gate.sh --blog <file>     # prohibitions + AI-tells only (em dashes allowed, no word count)
#   scripts/linkedin-gate.sh --comment <file>  # em-dash / AI-tell / banned-phrase checks only
#   scripts/linkedin-gate.sh --cadence         # /score CTA cadence: prints CARRY or SKIP (network: Supabase REST)
#   scripts/linkedin-gate.sh --self-test       # offline red-green harness
#
# Exit 0 = all checks PASS. Exit 1 = at least one FAIL (or CARRY/SKIP query failed).
# Every mode except --cadence is fully offline.
set -uo pipefail

REPO_ROOT=$(cd "$(dirname "$0")/.." && pwd)

FAILS=0
pass() { echo "PASS $1"; }
fail() { echo "FAIL $1 — $2"; FAILS=$((FAILS+1)); }

# Banned-phrase pattern — verbatim from linkedin-gate.md (brand-summary prohibitions + engagement bait)
BANNED="comment yes|agree\?|thoughts\?|tag (a|someone)|repost if|let that sink in|read that again|excited to share|thrilled to announce|game.chang|revolutionary|groundbreaking|transformational|cutting.edge|state.of.the.art|in today's fast|in the age of ai"
# LinkedIn's publicly named AI-tell shape: "it's not X, it's Y". Match the antithesis with
# contractions expanded and with a period or dash as the pivot, not only a comma —
# "It is not the model. It is the plumbing." is the same tell wearing a different coat.
AI_TELL="(it'?s|it is|this is|that'?s|that is) not( about)? [^.!?]{1,60}[,.—-] *(but )?(it'?s|it is)"

check_em_dash() {  # zero em dashes (Simon's call 2026-07-05; ICP reads them as the ChatGPT signature)
  local n; n=$(grep -c '—' "$1" || true)
  [ "$n" -eq 0 ] && pass "em_dash (0 found)" || fail "em_dash" "$n em dash(es) found; must be 0"
}

check_ai_tell() {
  local hits; hits=$(grep -inE "$AI_TELL" "$1" || true)
  [ -z "$hits" ] && pass "ai_tell (no \"it's not X, it's Y\")" || fail "ai_tell" $'"it\'s not X, it\'s Y" shape found:\n'"$hits"
}

check_banned() {
  local hits; hits=$(grep -inE "$BANNED" "$1" || true)
  [ -z "$hits" ] && pass "banned_phrases (0 hits)" || fail "banned_phrases" $'prohibited phrase(s):\n'"$hits"
}

check_word_count() {  # 180–300 words (post text only, excluding first comment)
  local n; n=$(wc -w < "$1")
  if [ "$n" -ge 180 ] && [ "$n" -le 300 ]; then pass "word_count ($n)"; else fail "word_count" "$n words; must be 180-300"; fi
}

check_hook_len() {  # hook line ≤140 chars (mobile fold)
  local n; n=$(head -1 "$1" | tr -d '\n' | wc -c)
  [ "$n" -le 140 ] && pass "hook_length ($n chars)" || fail "hook_length" "hook line is $n chars; must be <=140"
}

check_markdown_links() {  # LinkedIn strips markdown; URLs must be bare
  local n; n=$(grep -cE '\]\(' "$1" || true)
  [ "$n" -eq 0 ] && pass "markdown_links (0)" || fail "markdown_links" "$n markdown link(s); LinkedIn strips markdown, write URLs bare"
}

check_url_count() {  # max one bare URL in the body (link rule, 2026-07-07)
  local n; n=$(grep -oE 'https?://' "$1" | wc -l)
  [ "$n" -le 1 ] && pass "url_count ($n)" || fail "url_count" "$n URLs; max 1 bare URL in the body"
}

check_readiness() {  # public CTAs go to /score, never /readiness (lessons.md 2026-05-09)
  local n; n=$(grep -icE 'simonparis\.ca/readiness' "$1" || true)
  [ "$n" -eq 0 ] && pass "no_readiness_cta" || fail "no_readiness_cta" "/readiness referenced; public CTAs go to /score"
}

run_post()    { check_word_count "$1"; check_em_dash "$1"; check_ai_tell "$1"; check_banned "$1"; check_hook_len "$1"; check_markdown_links "$1"; check_url_count "$1"; check_readiness "$1"; }
run_blog()    { check_ai_tell "$1"; check_banned "$1"; check_readiness "$1"; }
run_comment() { check_em_dash "$1"; check_ai_tell "$1"; check_banned "$1"; }

# --- /score CTA cadence (the ONLY networked mode) ---------------------------------
# brand-summary rule: if neither of the last 2 LinkedIn rows in pipeline.posts mentions
# /score, this post carries the soft CTA. Prints CARRY or SKIP.
run_cadence() {
  # command-center is its own gitignored repo — absent from worktrees, so fall back to the primary checkout
  local env_file="$REPO_ROOT/projects/command-center/.env"
  [ -f "$env_file" ] || env_file="$HOME/projects/MetaArchitect/projects/command-center/.env"
  [ -f "$env_file" ] || { echo "FAIL cadence — command-center .env not found"; exit 1; }
  local url key
  url=$(grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_URL)=' "$env_file" | head -1 | cut -d= -f2-)
  key=$(grep -E '^SUPABASE_SERVICE_ROLE_KEY=' "$env_file" | head -1 | cut -d= -f2-)
  [ -n "$url" ] && [ -n "$key" ] || { echo "FAIL cadence — Supabase env missing in $env_file"; exit 1; }
  local resp
  resp=$(curl -sf --max-time 20 \
    "$url/rest/v1/posts?platform=eq.linkedin&status=in.(drafted,scheduled,published)&select=draft_content,first_comment&order=drafted_at.desc.nullslast&limit=2" \
    -H "apikey: $key" -H "Authorization: Bearer $key" -H "Accept-Profile: pipeline") \
    || { echo "FAIL cadence — pipeline.posts query failed (check service / creds)"; exit 1; }
  echo "$resp" | jq -e 'type == "array"' >/dev/null || { echo "FAIL cadence — unexpected response: $(echo "$resp" | head -c 200)"; exit 1; }
  if echo "$resp" | jq -e '[.[] | (.draft_content // "") + (.first_comment // "")] | join(" ") | test("/score")' >/dev/null; then
    echo "SKIP — a recent LinkedIn post already carries /score (last 2 rows checked)"
  else
    echo "CARRY — neither of the last 2 LinkedIn rows mentions /score; this post carries the soft CTA"
  fi
  exit 0
}

# --- self-test ---------------------------------------------------------------------
self_test() {
  local dir; dir=$(mktemp -d)
  trap "rm -rf '$dir'" EXIT
  local TPASS=0 TFAIL=0

  expect() {  # expect <name> <mode-flag-or-empty> <file> <pass|fail>
    local name=$1 flag=$2 file=$3 want=$4 got
    if [ -n "$flag" ]; then "$0" "$flag" "$file" >/dev/null 2>&1 && got=pass || got=fail
    else "$0" "$file" >/dev/null 2>&1 && got=pass || got=fail; fi
    if [ "$got" = "$want" ]; then echo "PASS self-test: $name"; TPASS=$((TPASS+1))
    else echo "FAIL self-test: $name — expected $want, got $got"; TFAIL=$((TFAIL+1)); fi
  }

  # good post: 180-300 words, clean hook, one bare URL, no violations
  { echo "Your agent failed at 2am and the logs show nothing. Here is what actually broke."
    echo
    printf 'word%d ' $(seq 1 185); echo
    echo
    echo "Full teardown: https://simonparis.ca/blog/example"
  } > "$dir/good-post.txt"
  expect "good post passes" "" "$dir/good-post.txt" pass

  sed 's/actually broke/actually broke — badly/' "$dir/good-post.txt" > "$dir/bad-emdash.txt"
  expect "em dash fails" "" "$dir/bad-emdash.txt" fail

  sed "s/Here is what actually broke./It's not the model, it's the plumbing./" "$dir/good-post.txt" > "$dir/bad-aitell.txt"
  expect "AI-tell shape fails" "" "$dir/bad-aitell.txt" fail

  sed 's/Here is what actually broke./Excited to share what broke./' "$dir/good-post.txt" > "$dir/bad-banned.txt"
  expect "banned phrase fails" "" "$dir/bad-banned.txt" fail

  { echo "Short hook."; printf 'word%d ' $(seq 1 40); echo; } > "$dir/bad-short.txt"
  expect "under 180 words fails" "" "$dir/bad-short.txt" fail

  { printf 'word%d ' $(seq 1 320); echo; } > "$dir/bad-long.txt"
  expect "over 300 words fails" "" "$dir/bad-long.txt" fail

  { printf 'A very long hook line that keeps going and going: %s and then some more text to push it well past the one hundred and forty character fold limit.\n' "padding padding padding"
    printf 'word%d ' $(seq 1 185); echo; } > "$dir/bad-hook.txt"
  expect "hook >140 chars fails" "" "$dir/bad-hook.txt" fail

  sed 's|https://simonparis.ca/blog/example|[the teardown](https://simonparis.ca/blog/example)|' "$dir/good-post.txt" > "$dir/bad-mdlink.txt"
  expect "markdown link fails" "" "$dir/bad-mdlink.txt" fail

  { cat "$dir/good-post.txt"; echo "Also: https://example.com/two"; } > "$dir/bad-2url.txt"
  expect "two URLs fail" "" "$dir/bad-2url.txt" fail

  sed 's|simonparis.ca/blog/example|simonparis.ca/readiness|' "$dir/good-post.txt" > "$dir/bad-readiness.txt"
  expect "/readiness CTA fails" "" "$dir/bad-readiness.txt" fail

  # blog mode: em dashes and length are fine; banned phrases are not
  { echo "A blog paragraph — with an em dash, which is allowed in long-form."; } > "$dir/blog-good.txt"
  expect "blog: em dash allowed" "--blog" "$dir/blog-good.txt" pass
  { echo "This revolutionary framework is game-changing."; } > "$dir/blog-bad.txt"
  expect "blog: banned phrase fails" "--blog" "$dir/blog-bad.txt" fail

  # comment mode: short is fine; em dash is not
  echo "Seen this exact failure in a payments pipeline. The retry queue was the fix." > "$dir/comment-good.txt"
  expect "comment: short clean passes" "--comment" "$dir/comment-good.txt" pass
  echo "Great point — totally agree with the framing." > "$dir/comment-bad.txt"
  expect "comment: em dash fails" "--comment" "$dir/comment-bad.txt" fail

  echo
  echo "linkedin-gate self-test: $TPASS pass, $TFAIL fail"
  [ "$TFAIL" -eq 0 ]
}

# --- dispatch ------------------------------------------------------------------------
MODE=post FILE=""
case "${1:-}" in
  --self-test) self_test; exit $? ;;
  --cadence)   run_cadence ;;
  --blog)      MODE=blog;    FILE=${2:-} ;;
  --comment)   MODE=comment; FILE=${2:-} ;;
  -*)          echo "usage: linkedin-gate.sh [--blog|--comment] <file> | --cadence | --self-test"; exit 2 ;;
  *)           FILE=${1:-} ;;
esac
[ -n "$FILE" ] && [ -f "$FILE" ] || { echo "usage: linkedin-gate.sh [--blog|--comment] <file> | --cadence | --self-test"; exit 2; }

case "$MODE" in
  post)    run_post "$FILE" ;;
  blog)    run_blog "$FILE" ;;
  comment) run_comment "$FILE" ;;
esac

echo
if [ "$FAILS" -eq 0 ]; then
  echo "linkedin-gate ($MODE): ALL PASS"
else
  echo "linkedin-gate ($MODE): $FAILS FAIL — rewrite the offending line(s) and re-run; never present or save a failing candidate"
fi
[ "$FAILS" -eq 0 ]
