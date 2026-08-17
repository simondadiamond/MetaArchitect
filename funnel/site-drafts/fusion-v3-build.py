#!/usr/bin/env python3
"""Build fusion-v3.html from fusion-v3.src.html.

Same inputs and same recipe as fusion-build.py; the two drafts live side by side.

Inlines the two web fonts and the portrait as base64 so the artifact is
self-contained — the verification standard requires zero network requests
outside file:// and data:.

  faces.css  Libre Caslon Text 400/400i/700 + Hanken Grotesk 400/500/600/700,
             already base64-inlined. Kept in the repo on purpose: the earlier
             build read it from /tmp, which does not survive a reboot.
  portrait   cropped taller than 4:5 from the website repo and composited on
             PAPER, not on the petrol plate v1 used.  The source is a true
             cutout — transparent above the shoulders — so it sits on the page
             ground as an editorial portrait rather than as a dark object.
             Desaturated to 42%.
"""
from PIL import Image, ImageEnhance
import base64, io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'fusion-v3.src.html')
OUT = os.path.join(HERE, 'fusion-v3.html')
FACES = os.path.join(HERE, 'faces-v2.css')
# Simon's re-cut, less shadow (2026-08-17).  Canonical copy lives in the
# website repo at public/simon-paris-v3.png; this is a fetched copy so the draft
# builds without reaching into that checkout.
PORTRAIT = os.path.join(HERE, 'simon-paris-v3.png')

for p in (SRC, FACES, PORTRAIT):
    if not os.path.exists(p):
        sys.exit('missing input: ' + p)

# Enhance the SUBJECT, then composite.  Doing it the other way round runs the
# contrast curve over the paper background too, which lifted #F8F6F1 toward
# white and left the portrait sitting in a visible pale rectangle on the page.
im = Image.open(PORTRAIT).convert('RGBA')
alpha = im.getchannel('A')
rgb = im.convert('RGB')
rgb = ImageEnhance.Color(rgb).enhance(0.42)
rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
im = rgb.convert('RGBA'); im.putalpha(alpha)
bg = Image.new('RGBA', im.size, (248, 246, 241, 255))       # --paper, not a plate
im = Image.alpha_composite(bg, im).convert('RGB')
# The source is already 3:4 and framed the way Simon wants it, so the only crop
# is the bottom 7%: the export carries a four-point "edited with AI" sparkle
# watermark near the bottom-right, and a generative-AI watermark on the
# consultant's own portrait is the exact credibility leak this page is fighting.
# Replace with a clean export and drop this crop.
W, H = im.size
im = im.crop((0, 0, W, int(H * 0.93)))
im = im.resize((760, round(760 * im.height / im.width)), Image.LANCZOS)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=84, optimize=True, progressive=True)

html = open(SRC).read()
assert '/*@FONTS@*/' in html and '@PORTRAIT@' in html, 'source lost a build token'
html = html.replace('/*@FONTS@*/', open(FACES).read())
html = html.replace('@PORTRAIT@', 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode())
open(OUT, 'w').write(html)
print('built', OUT, os.path.getsize(OUT) // 1024, 'KB')
