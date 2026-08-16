#!/usr/bin/env python3
"""Build fusion.html from fusion.src.html.

Inlines the two web fonts and the portrait as base64 so the artifact is
self-contained — the verification standard requires zero network requests
outside file:// and data:.

  faces.css  Libre Caslon Text 400/400i/700 + Hanken Grotesk 400/500/600/700,
             already base64-inlined. Kept in the repo on purpose: the earlier
             build read it from /tmp, which does not survive a reboot.
  portrait   cropped 4:5 from the website repo, composited on petrol (the
             source is a rim-lit cutout with transparency), desaturated to 42%.
"""
from PIL import Image, ImageEnhance
import base64, io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'fusion.src.html')
OUT = os.path.join(HERE, 'fusion.html')
FACES = os.path.join(HERE, 'faces.css')
PORTRAIT = '/home/diamond/projects/MetaArchitect/projects/simonparis-website/public/simon-paris.png'

for p in (SRC, FACES, PORTRAIT):
    if not os.path.exists(p):
        sys.exit('missing input: ' + p)

im = Image.open(PORTRAIT).convert('RGBA')
bg = Image.new('RGBA', im.size, (16, 46, 51, 255))          # --ink plate
im = Image.alpha_composite(bg, im).convert('RGB')
W, H = im.size
w = int(H * 0.8)                                            # 4:5
left = max(0, min(W - w, 660 - w // 2))
im = im.crop((left, 0, left + w, H)).resize((760, 950), Image.LANCZOS)
im = ImageEnhance.Color(im).enhance(0.42)
im = ImageEnhance.Contrast(im).enhance(1.06)
buf = io.BytesIO()
im.save(buf, 'JPEG', quality=84, optimize=True, progressive=True)

html = open(SRC).read()
assert '/*@FONTS@*/' in html and '@PORTRAIT@' in html, 'source lost a build token'
html = html.replace('/*@FONTS@*/', open(FACES).read())
html = html.replace('@PORTRAIT@', 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode())
open(OUT, 'w').write(html)
print('built', OUT, os.path.getsize(OUT) // 1024, 'KB')
