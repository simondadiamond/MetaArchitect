#!/usr/bin/env python3
"""WCAG audit against actually painted pixels, not computed colour tokens.

verify.js writes a 3x crop of every text role to /tmp/audit.  For each crop the
ground is the modal painted pixel and the ink is the painted pixel furthest from
it in luminance.  Sampling the *computed* colour instead is what hid two real
failures in earlier drafts (an element at opacity:.2 painting at 1.28:1) — the
token said one thing and the screen said another.
"""
from PIL import Image
from collections import Counter
import json, os, sys

OUT = '/tmp/audit'
manifest = json.load(open(os.path.join(OUT, 'manifest.json')))


def lin(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (lin(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


# large text = >=18.66px bold or >=24px normal, at 3x those are 56px / 72px tall
LARGE = {'h1', '.h2', '.card .figure', '.card--mass .figure', '.close h2',
         '.claim b', '.claims-tail', '.qa summary', '.card h3', '.card--mass h3',
         '.proc-item h3', '.note h3', '.mark', '.foot .mark', '.sub',
         '#d1 .hub-t', '.card--mass .figure-alt'}

rows, fails = [], []
for c in manifest['crops']:
    p = os.path.join(OUT, c['file'])
    if not os.path.exists(p):
        continue
    im = Image.open(p).convert('RGB')
    px = list(im.getdata())
    if len(px) < 20:
        continue
    ground = Counter(px).most_common(1)[0][0]
    gl = lum(ground)
    # the extreme painted pixel: the one the eye reads as the glyph core
    ink = max(px, key=lambda q: abs(lum(q) - gl))
    ratio = contrast(ink, ground)
    need = 3.0 if c['sel'] in LARGE else 4.5
    row = {
        'sel': c['sel'], 'view': c['label'], 'ink': '#%02X%02X%02X' % ink,
        'ground': '#%02X%02X%02X' % ground, 'ratio': round(ratio, 2), 'need': need,
        'pass': ratio >= need,
    }
    rows.append(row)
    if not row['pass']:
        fails.append(row)

rows.sort(key=lambda r: r['ratio'])
print(f"{'role':34s} {'view':6s} {'ink':8s} {'ground':8s} {'ratio':>6s} {'need':>5s}  ")
for r in rows:
    print(f"{r['sel']:34s} {r['view']:6s} {r['ink']:8s} {r['ground']:8s} "
          f"{r['ratio']:6.2f} {r['need']:5.1f}  {'ok' if r['pass'] else 'FAIL'}")
print(f"\n{len(rows)} roles sampled, {len(fails)} failures")
sys.exit(1 if fails else 0)
