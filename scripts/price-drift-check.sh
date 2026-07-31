#!/usr/bin/env bash
# price-drift-check.sh — customer-facing docs must not quote hourly rates that diverge
# from the website's pricing source of truth (lib/pricing.ts).
#
# Born 2026-07-31: an FR outreach template in funnel/setup-offer/acquisition-playbook.md
# offered "150 $/h" against a canonical $125 USD/hr — a hidden 13% discount that reached
# Simon's clipboard (lessons.md 2026-07-29). Scope is deliberately narrow: per-hour rate
# patterns only, in funnel/ and brand/. Comps and derived math opt out per-line with an
# HTML comment containing "price-ok".
#
# Usage: price-drift-check.sh [scan-dir ...]   (default: funnel brand)
# Exit 0 = clean, 1 = drift found, 2 = pricing.ts missing.
set -euo pipefail
cd "$(dirname "$0")/.."

# The website is its own repo, gitignored from MetaArchitect — present only in the
# primary checkout, never in worktrees. Fall back accordingly.
PRICING_TS="projects/simonparis-website/lib/pricing.ts"
[ -f "$PRICING_TS" ] || PRICING_TS="$HOME/projects/MetaArchitect/projects/simonparis-website/lib/pricing.ts"
[ -f "$PRICING_TS" ] || { echo "price-drift-check: lib/pricing.ts not found (checked repo + primary checkout)"; exit 2; }

SCAN_DIRS=("${@:-funnel brand}")

python3 - "$PRICING_TS" ${SCAN_DIRS[@]} << 'PY'
import re, sys, pathlib

pricing = pathlib.Path(sys.argv[1]).read_text()
allowed = {int(m) for m in re.findall(r':\s*(\d+)', pricing)}
allowed |= {v * 2 for v in allowed if v < 1000}  # 2-hour blocks of an hourly rate

# a number (with optional , or space grouping) near a $/currency marker AND an hour marker
HOUR = re.compile(
    r'(?P<num>\d[\d, ]*\d|\d+)\s*(?:\$|USD|CAD|US|CA|\$ ?US|\$ ?CA)?\s*'
    r'(?:USD|CAD|US|CA)?\s*/\s*h(?:r|our|eure)?\b'
    r'|(?:\$|USD)\s*(?P<num2>\d[\d, ]*\d|\d+)\s*(?:USD)?\s*(?:/|per)\s*h(?:r|our)?'
    r'|(?P<num3>\d[\d, ]*\d|\d+)\s*\$\s*(?:US|CA)?\s+de\s+l.heure',
    re.I)

drift = []
for d in sys.argv[2:]:
    root = pathlib.Path(d)
    if not root.exists():
        continue
    for f in root.rglob('*.md'):
        for n, line in enumerate(f.read_text(errors='replace').splitlines(), 1):
            if 'price-ok' in line:
                continue
            for m in HOUR.finditer(line):
                raw = next(g for g in m.groups() if g)
                val = int(re.sub(r'[ ,]', '', raw))
                if val not in allowed:
                    drift.append(f"{f}:{n}: {val}/hr not in pricing.ts — {line.strip()[:120]}")

if drift:
    print("price drift vs lib/pricing.ts (fix the doc, or mark the line 'price-ok' if it is a comp/derived figure):")
    print("\n".join(drift))
    sys.exit(1)
print(f"price-drift-check: clean ({', '.join(sys.argv[2:])} vs {sorted(allowed)})")
PY
