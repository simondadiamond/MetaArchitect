#!/usr/bin/env python3
"""Harvest Canadian bookkeeping/accounting practice listings from Yellow Pages Canada.

Stage 1 of the bookkeeper prospect list build: name, city, province, website.
Nothing is contacted; this only reads public directory pages.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
from urllib.parse import unquote

UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")

CITIES = [
    ("Toronto", "ON"), ("Mississauga", "ON"), ("Brampton", "ON"), ("Hamilton", "ON"),
    ("Ottawa", "ON"), ("London", "ON"), ("Kitchener", "ON"), ("Windsor", "ON"),
    ("Barrie", "ON"), ("Oshawa", "ON"), ("Markham", "ON"), ("Burlington", "ON"),
    ("Guelph", "ON"), ("Kingston", "ON"), ("Sudbury", "ON"), ("St Catharines", "ON"),
    ("Calgary", "AB"), ("Edmonton", "AB"), ("Red Deer", "AB"), ("Lethbridge", "AB"),
    ("Vancouver", "BC"), ("Surrey", "BC"), ("Victoria", "BC"), ("Kelowna", "BC"),
    ("Abbotsford", "BC"), ("Nanaimo", "BC"),
    ("Winnipeg", "MB"), ("Regina", "SK"), ("Saskatoon", "SK"),
    ("Halifax", "NS"), ("Moncton", "NB"), ("Fredericton", "NB"), ("Saint John", "NB"),
    ("St John's", "NL"), ("Charlottetown", "PE"),
    ("Montreal", "QC"), ("Quebec", "QC"), ("Laval", "QC"), ("Gatineau", "QC"),
    ("Sherbrooke", "QC"),
]

PAGES = 2

# National chains / franchises / big-4-adjacent — not owner-operated 1-20 staff practices.
EXCLUDE = re.compile(
    r"h&r block|hr block|liberty tax|padgett|bdo canada|mnp llp|^mnp$|grant thornton|"
    r"deloitte|kpmg|pricewaterhouse|pwc |ernst & young|rsm canada|crowe |baker tilly|"
    r"welch llp|doane grant|softron|money concepts|the tax shop|jackson hewitt|"
    r"canada revenue|service canada|staples|walmart", re.I)


def fetch(url, tries=3):
    for n in range(tries):
        p = subprocess.run(
            ["curl", "-sS", "-L", "-A", UA, "--max-time", "30", url],
            capture_output=True, text=True, errors="replace")
        if p.returncode == 0 and len(p.stdout) > 2000:
            return p.stdout
        time.sleep(2 + 2 * n)
    return ""


LISTING_SPLIT = re.compile(r'<div class="listing__content')
NAME_RE = re.compile(r'jsListingName[^>]*?title="See detailed information for [^"]*"[^>]*>(.*?)</a>', re.S)
NAME_FALLBACK = re.compile(r'class="listing__name--link[^"]*"[^>]*>(.*?)</a>', re.S)
CITY_RE = re.compile(r'itemprop="addressLocality"\s*>(.*?)</span>', re.S)
PROV_RE = re.compile(r'itemprop="addressRegion"\s*>(.*?)</span>', re.S)
URL_RE = re.compile(r'href="/gourl/[a-f0-9]+\?redirect=([^"]+)"')
TEASER_RE = re.compile(r'itemprop="description"\s*>(.*?)</article>', re.S)


def clean(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def parse(page_html):
    out = []
    for block in LISTING_SPLIT.split(page_html)[1:]:
        m = NAME_RE.search(block) or NAME_FALLBACK.search(block)
        u = URL_RE.search(block)
        if not m or not u:
            continue
        name = clean(m.group(1))
        website = unquote(u.group(1))
        c = CITY_RE.search(block)
        p = PROV_RE.search(block)
        t = TEASER_RE.search(block)
        out.append({
            "firm_name": name,
            "city": clean(c.group(1)) if c else "",
            "province": clean(p.group(1)) if p else "",
            "website": website,
            "teaser": clean(t.group(1)) if t else "",
        })
    return out


def main():
    rows = []
    for city, prov in CITIES:
        for page in range(1, PAGES + 1):
            url = (f"https://www.yellowpages.ca/search/si/{page}/Bookkeeping/"
                   f"{city.replace(' ', '+')}+{prov}")
            h = fetch(url)
            if not h:
                print(f"  MISS {city} p{page}", file=sys.stderr)
                continue
            got = parse(h)
            for r in got:
                r["search_city"] = city
                r["search_prov"] = prov
            rows.extend(got)
            print(f"  {city} {prov} p{page}: {len(got)}", file=sys.stderr)
            time.sleep(1.2)

    # dedupe by registrable domain
    seen = {}
    for r in rows:
        dom = re.sub(r"^https?://(www\.)?", "", r["website"]).split("/")[0].lower()
        if not dom or EXCLUDE.search(r["firm_name"]):
            continue
        r["domain"] = dom
        seen.setdefault(dom, r)
    final = list(seen.values())
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nb-yp-raw.json")
    with open(out, "w") as f:
        json.dump(final, f, indent=1)
    print(f"{len(rows)} listings -> {len(final)} unique domains -> {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
