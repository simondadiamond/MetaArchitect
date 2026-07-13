#!/usr/bin/env bash
# skill-lint.sh — drift check for skills, agent profiles, and brand docs.
# Born from the 2026-07-07 full-estate audit: every failure class below was found live.
# Run from repo root: ./scripts/skill-lint.sh   (weekly-review runs it every Friday)
# Exit 0 = clean (warnings allowed), exit 1 = at least one FAIL.
set -uo pipefail
cd "$(dirname "$0")/.."

FAILS=0
WARNS=0
SCOPE=".claude brand"                    # skills, agents, commands, brand docs
EXCLUDE='--exclude-dir=archive --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=worktrees --exclude=MIGRATION.md'

fail() { echo "FAIL: $1"; FAILS=$((FAILS+1)); }
warn() { echo "warn: $1"; WARNS=$((WARNS+1)); }

# 1. Pope-agent container paths — don't exist on Sterling (lessons 2026-07-05, audit 2026-07-07)
hits=$(grep -rn $EXCLUDE '/app/data/' $SCOPE 2>/dev/null | grep -v 'skill-lint')
[ -n "$hits" ] && fail $'/app/data/ container paths (dead on Sterling):\n'"$hits"

# 2. Public CTA pointing at /readiness — must be /score (lessons 2026-05-09)
#    Lines that state the rule ("never ... /readiness") are allowed.
hits=$(grep -rniE 'simonparis\.ca/readiness|\]\(/readiness\)' $SCOPE 2>/dev/null | grep -viE 'never|not |don.t|rule|noindex')
[ -n "$hits" ] && fail $'/readiness used as a CTA target (public CTAs go to /score):\n'"$hits"

# 3. Hardcoded model ids in logging snippets — model_version must be "<current model>", not a lie
hits=$(grep -rnE $EXCLUDE "claude-(sonnet|opus|haiku|fable)-[0-9]" $SCOPE 2>/dev/null | grep -viE 'e\.g\.|example|current model')
[ -n "$hits" ] && fail $'hardcoded model_version (traceability data that lies when another model runs):\n'"$hits"

# 4. Stale year anchors in search-query templates (lessons 2026-03-31)
YEAR=$(date +%Y)
hits=$(grep -rnoE $EXCLUDE '"?20[0-9]{2} OR 20[0-9]{2}"?' $SCOPE 2>/dev/null | while IFS= read -r line; do
  years=$(echo "$line" | grep -oE '20[0-9]{2}')
  echo "$years" | grep -q "$YEAR" || echo "$line"
done)
[ -n "$hits" ] && fail $'year-anchored search template without the current year:\n'"$hits"

# 5. Airtable references — migration to Supabase completed May 2026; history belongs in lessons.md only
hits=$(grep -rni $EXCLUDE 'airtable' $SCOPE 2>/dev/null | grep -viE 'airtable-era|formerly|migrated|history|legacy|was airtable|never')
[ -n "$hits" ] && fail $'live Airtable reference (pipeline is Supabase):\n'"$hits"

# 6. docs/roadmap.md — deleted 2026-07-04; roadmap lives in the Supabase goals table
hits=$(grep -rn $EXCLUDE 'docs/roadmap\.md' $SCOPE 2>/dev/null | grep -viE 'deleted|deprecated|formerly|do not')
[ -n "$hits" ] && fail $'reference to deleted docs/roadmap.md:\n'"$hits"

# 7. Hardcoded ages in agent profiles — keep DOBs, derive ages (they drift monthly)
hits=$(grep -rnE '\([0-9.]+ (months|years) old' .claude/agents 2>/dev/null)
[ -n "$hits" ] && warn $'hardcoded age in an agent profile (use DOB, derive age):\n'"$hits"

# 8. Playbook re-verify dates passed?
while IFS= read -r line; do
  f=${line%%:*}; due=$(echo "$line" | grep -oE '20[0-9]{2}-[0-9]{2}' | head -1)
  [ -n "$due" ] && [ "$due" \< "$(date +%Y-%m)" ] && warn "$f re-verify date ($due) has passed — platform claims may be stale"
done < <(grep -rn $EXCLUDE 'Re-verify by' $SCOPE 2>/dev/null)

# --- Checks 9–14 added 2026-07-13 (post-Fable gate inventory, goal 3df3143e) ---
SCOPE_WIDE="$SCOPE CLAUDE.md"            # root CLAUDE.md was the most-drifted file (R10)

# 9. Hook guards must pass their own red-green harness (a broken gate is worse than none)
if [ -x scripts/hooks/test-hooks.sh ]; then
  out=$(bash scripts/hooks/test-hooks.sh 2>&1) || fail $'hook test harness failing:\n'"$(echo "$out" | grep '^FAIL' | head -10)"
else
  warn "scripts/hooks/test-hooks.sh missing or not executable — hook gates unverified"
fi

# 10. Hex colors in agent profiles must come from the brand palette (R3: sitemaster shipped #F97316 for 11 days)
PALETTE='0F0F0F|1A1A1A|1F1F1F|333333|EAEAEA|B4B4B4|777777|E04500|FF5A1A|C97A1A|F85149'
hits=$(grep -rnoE $EXCLUDE '#[0-9A-Fa-f]{6}\b' .claude/agents 2>/dev/null | grep -viE "#($PALETTE)")
[ -n "$hits" ] && fail $'non-palette hex color in an agent profile (brand-summary palette wins):\n'"$hits"

# 11. Hardcoded prices in .claude/ (R5: stale $750 founder rate) — prices live on the live page or one canonical file
hits=$(grep -rnE $EXCLUDE '\$[0-9,]+ ?(USD|CAD)' .claude 2>/dev/null | grep -viE 'read the current price|never assume|example')
[ -n "$hits" ] && fail $'hardcoded price in .claude/ (point at the live page instead):\n'"$hits"

# 12. Bracket placeholders in paste-ready brand docs (lessons 2026-07-06: logo spec shipped [INSERT ...])
hits=$(grep -rnE $EXCLUDE '\[(INSERT|TODO|PLACEHOLDER|YOUR[ _])' brand 2>/dev/null)
[ -n "$hits" ] && fail $'bracket placeholder in a paste-ready brand doc:\n'"$hits"

# 13. Divergent session-close duplicates (R2: coo.md still instructed the old /pattern close after the rewire)
hits=$(grep -rn $EXCLUDE '/pattern' .claude/agents $SCOPE_WIDE 2>/dev/null | grep -v 'session-close')
[ -n "$hits" ] && fail $'/pattern referenced without naming session-close as the canonical close (divergent duplicate):\n'"$hits"

# 14. Postiz API usage outside the canonical tool (P6: both July near-misses were ad-hoc scripts)
hits=$(grep -rn $EXCLUDE -E 'POSTIZ_API_(KEY|URL)|/api/public/v1' scripts .claude projects/Content-Engine --include='*.mjs' --include='*.js' --include='*.sh' --include='*.md' 2>/dev/null \
  | grep -vE 'tools/postiz\.mjs|tools/postiz-comment-nudge\.mjs|weekly-review/scripts/gather\.sh|postiz-update\.sh|skill-lint|gate-inventory|lessons\.md|SETUP\.md|\.env')
[ -n "$hits" ] && fail $'Postiz API used outside tools/postiz.mjs (the only sanctioned path):\n'"$hits"

echo
echo "skill-lint: $FAILS fail(s), $WARNS warning(s)"
[ "$FAILS" -eq 0 ]
