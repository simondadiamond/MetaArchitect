#!/usr/bin/env python3
"""Stage 3b: second look at firms whose sites yielded too few readable pages.

Homepages built as JS apps or single-page sites give the deep pass nothing to
follow, which parks the firm at pm_tool=unknown. This pass tries the sitemap and
a list of conventional paths so those rows get judged on evidence rather than on
how the site happens to be built.
"""
import html
import json
import os
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")

PATHS = ["/contact", "/contact-us", "/contact.html", "/contactez-nous", "/nous-joindre",
         "/about", "/about-us", "/about.html", "/a-propos", "/qui-sommes-nous",
         "/services", "/our-services", "/services.html", "/team", "/our-team",
         "/client-portal", "/portal", "/clients", "/login"]

WANT = re.compile(r"contact|about|team|equipe|équipe|propos|joindre|service|portal|"
                  r"client|login|staff|pricing|tarif", re.I)

PM_ALL = [
    ("TaxDome", r"taxdome"), ("Karbon", r"karbonhq|powered by karbon"),
    ("Canopy", r"canopytax|canopy\.tax"), ("Financial Cents", r"financial-?cents"),
    ("Jetpack Workflow", r"jetpackworkflow"), ("Liscio", r"liscio"),
    ("Client Hub", r"clienthub\.app"), ("Pixie", r"usepixie"),
    ("Ignition", r"ignitionapp"), ("CCH iFirm", r"cchifirm"),
    ("Onvio", r"onvio\.(ca|com)"), ("SmartVault", r"smartvault"),
    ("ShareFile", r"sharefile"), ("Hubdoc", r"hubdoc"), ("Dext", r"dext\.com"),
    ("TaxFolder", r"taxfolder|taxcycle"), ("FileCenter", r"filecenterportal"),
    ("ClientTrack", r"clienttrackportal"),
]
DOC_ONLY = {"SmartVault", "ShareFile", "Hubdoc", "Dext", "TaxFolder", "FileCenter",
            "ClientTrack"}
PORTAL_LINK = re.compile(r"portal|client.?login|secure.?(login|upload|file)|espace.?client",
                         re.I)
LEDGER = [("QBO", r"quickbooks|\bqbo\b|intuit"), ("Xero", r"\bxero\b")]


def fetch(url, timeout=15):
    p = subprocess.run(["curl", "-sS", "-L", "-A", UA, "--max-time", str(timeout),
                        "--connect-timeout", "7", "-w", "\n@@HTTP:%{http_code}", url],
                       capture_output=True, text=True, errors="replace")
    body, code = p.stdout, ""
    m = re.search(r"\n@@HTTP:(\d+)$", body)
    if m:
        code, body = m.group(1), body[:m.start()]
    return code, body


def to_text(h):
    h = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))


def retry(r):
    base = r["website"].rstrip("/")
    if not base.startswith("http"):
        base = "https://" + base
    root = re.match(r"(https?://[^/]+)", base).group(1)
    have = set(r.get("deep_pages", []))

    urls = []
    for smap in ("/sitemap.xml", "/sitemap_index.xml", "/page-sitemap.xml"):
        c, b = fetch(root + smap, timeout=12)
        if b and "<" in b:
            for m in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", b):
                u = m.group(1)
                if u.endswith(".xml"):
                    c2, b2 = fetch(u, timeout=12)
                    if b2:
                        for m2 in re.finditer(r"<loc>\s*([^<\s]+)\s*</loc>", b2):
                            if WANT.search(m2.group(1)):
                                urls.append(m2.group(1))
                elif WANT.search(u):
                    urls.append(u)
        if urls:
            break
    urls = [u for u in dict.fromkeys(urls) if u not in have][:6]
    if len(urls) < 4:
        urls += [root + p for p in PATHS if root + p not in have and root + p not in urls]

    added, tried = [], 0
    for u in urls:
        if len(added) >= 5 or tried >= 14:
            break
        tried += 1
        c, b = fetch(u)
        if not b or len(b) < 500 or (c or "").startswith(("4", "5")):
            continue
        if re.search(r"page not found|404 error|nothing found here", to_text(b)[:2500], re.I):
            continue
        added.append((u, b))

    for u, b in added:
        r["deep_pages"].append(u)
        blob = (b + " " + to_text(b)).lower()
        for name, pat in PM_ALL:
            mm = re.search(pat, blob)
            if mm:
                sn = re.sub(r"\s+", " ", blob[max(0, mm.start() - 70):mm.end() + 70])[:180]
                bucket = "deep_doc" if name in DOC_ONLY else "deep_pm"
                if not any(h["tool"] == name for h in r[bucket]):
                    r[bucket].append({"tool": name, "page": u, "snippet": sn})
        for m in re.finditer(r'href=["\']([^"\'#]+)["\']', b, re.I):
            href = m.group(1)
            if PORTAL_LINK.search(href) and not href.startswith(("mailto:", "tel:")):
                full = href if href.startswith("http") else root + "/" + href.lstrip("/")
                if full not in r["portal_urls"]:
                    r["portal_urls"].append(full)
        led = set(r.get("deep_ledger") or [])
        for lname, lpat in LEDGER:
            if re.search(lpat, blob):
                led.add(lname)
        r["deep_ledger"] = sorted(led)
    r["retried"] = True
    r["retry_added"] = len(added)
    return r


def main():
    rows = json.load(open(os.path.join(HERE, "nb-deep.json")))
    thin = [r for r in rows if len(r.get("deep_pages", [])) < 3]
    rest = [r for r in rows if len(r.get("deep_pages", [])) >= 3]
    print(f"retrying {len(thin)} thin rows", flush=True)
    fixed, done = [], 0
    with ThreadPoolExecutor(max_workers=10) as ex:
        for r in ex.map(retry, thin):
            fixed.append(r)
            done += 1
            if done % 10 == 0:
                print(f"  {done}/{len(thin)}", flush=True)
    allrows = rest + fixed
    json.dump(allrows, open(os.path.join(HERE, "nb-deep.json"), "w"), indent=1)
    gained = sum(r["retry_added"] for r in fixed)
    still = sum(1 for r in fixed if len(r["deep_pages"]) < 3)
    print(f"added {gained} pages | still thin: {still}", flush=True)


if __name__ == "__main__":
    main()
