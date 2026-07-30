#!/usr/bin/env bash
# yt-transcript.sh <youtube-url> <outfile.txt> — download a video's captions and
# write clean plain text. Used by the repurpose skill's Harvest Mode; born from
# the 2026-07-30 podcast-harvest session where this was done by hand.
#
# yt-dlp lives in a persistent user-level venv (~/.local/share/yt-dlp-venv),
# created on first run — system pip is PEP-668 locked on sterling.
# Prefers manual subs over auto-subs; English variants only.
set -euo pipefail

URL="${1:?usage: yt-transcript.sh <youtube-url> <outfile.txt>}"
OUT="${2:?usage: yt-transcript.sh <youtube-url> <outfile.txt>}"
VENV="$HOME/.local/share/yt-dlp-venv"

if [ ! -x "$VENV/bin/yt-dlp" ]; then
  python3 -m venv "$VENV"
  "$VENV/bin/pip" install --quiet yt-dlp
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

"$VENV/bin/yt-dlp" --skip-download --write-subs --write-auto-subs \
  --sub-langs "en.*" --sub-format vtt -o "$TMP/cap" "$URL" >/dev/null 2>&1 || true

VTT="$(ls "$TMP"/cap*.vtt 2>/dev/null | head -1 || true)"
if [ -z "$VTT" ]; then
  echo "yt-transcript: no English captions found for $URL" >&2
  exit 1
fi

python3 - "$VTT" "$OUT" <<'EOF'
import html, re, sys
vtt, out = sys.argv[1], sys.argv[2]
lines, kept = html.unescape(open(vtt, encoding="utf-8").read()).splitlines(), []
for l in lines:
    if "-->" in l or l.startswith(("WEBVTT", "Kind:", "Language:")) or not l.strip():
        continue
    l = re.sub(r"<[^>]+>", "", l).strip()
    if l and (not kept or l != kept[-1]):
        kept.append(l)
# collapse the rolling-caption overlap auto-subs produce
clean = []
for l in kept:
    if clean and (l in clean[-1] or clean[-1] in l):
        clean[-1] = max(l, clean[-1], key=len)
    else:
        clean.append(l)
open(out, "w", encoding="utf-8").write(" ".join(clean))
print(f"{out}: {sum(len(c) for c in clean)} chars")
EOF
