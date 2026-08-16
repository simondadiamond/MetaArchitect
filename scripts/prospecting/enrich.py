#!/usr/bin/env python3
"""Stage 2: enrich harvested firms from their own public websites.

Reads nb-yp-raw.json, fetches each firm's homepage plus likely contact/about/team
pages, and records:
  - resolves            : did the site actually load
  - emails              : public addresses found, with the page they came from
  - pm_tool / evidence  : practice-management software signals (TaxDome, Karbon, ...)
  - ledger              : QBO / Xero signals
  - team signals        : team-page person count, "sole"/"we are a team of N" phrasing
Public pages only. Nothing is contacted.
"""
import html
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")

PM_TOOLS = [
    ("TaxDome", r"taxdome"),
    ("Karbon", r"karbonhq|karbon\s+(?:practice|hq)|powered by karbon"),
    ("Canopy", r"canopytax|canopy\.tax"),
    ("Financial Cents", r"financial-cents|financialcents"),
    ("Jetpack Workflow", r"jetpackworkflow|jetpack workflow"),
    ("Keeper", r"keeper\.app|\bkeeper\b\s+(?:app|portal)"),
    ("Client Hub", r"clienthub\.app|client hub"),
    ("Liscio", r"liscio"),
    ("Pixie", r"usepixie|pixie\.hq"),
    ("Content Snare", r"contentsnare|content snare"),
    ("Dext", r"\bdext\b|receipt bank|receiptbank"),
    ("Hubdoc", r"hubdoc"),
    ("SmartVault", r"smartvault"),
]
# Dext/Hubdoc/SmartVault are document-capture, not full PM — tracked separately.
DOC_ONLY = {"Dext", "Hubdoc", "SmartVault"}

PORTAL_GENERIC = r"client portal|secure portal|client login|portal login|client centre|client center"

LEDGER = [("QBO", r"quickbooks|\bqbo\b|intuit"), ("Xero", r"\bxero\b")]

CANDIDATE_PATHS = [
    "", "/contact", "/contact-us", "/contactez-nous", "/about", "/about-us",
    "/team", "/our-team", "/notre-equipe", "/nous-joindre",
]

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
BAD_EMAIL = re.compile(
    r"(example|sentry|wixpress|godaddy|squarespace|@2x|\.png|\.jpe?g|\.gif|\.webp|"
    r"\.svg|\.css|\.js|sentry\.io|domain\.com|yourdomain|email\.com|"
    r"user@|name@|test@)", re.I)
TEAM_PERSON = re.compile(
    r"\b(CPA|CPB|Bookkeeper|Accountant|Partner|Principal|Founder|Owner|President|"
    r"Controller|Manager)\b", re.I)
OWNER_RE = re.compile(
    r"([A-Z][a-z]+(?:\s+[A-Z][a-z'\-]+){1,2})\s*,?\s*(?:is\s+the\s+)?"
    r"(?:—|-|–)?\s*(?:the\s+)?(Owner|Founder|Principal|President|Managing Partner)\b")
OWNER_RE2 = re.compile(
    r"\b(Owner|Founder|Principal|President|Managing Partner)\s*(?:&[^,<]{0,25})?\s*[,:—–-]\s*"
    r"([A-Z][a-z]+(?:\s+[A-Z][a-z'\-]+){1,2})")


def fetch(url, timeout=20):
    p = subprocess.run(
        ["curl", "-sS", "-L", "-A", UA, "--max-time", str(timeout),
         "--connect-timeout", "8", "-w", "\n@@HTTP:%{http_code}", url],
        capture_output=True, text=True, errors="replace")
    body = p.stdout
    code = ""
    m = re.search(r"\n@@HTTP:(\d+)$", body)
    if m:
        code = m.group(1)
        body = body[:m.start()]
    return code, body


def clean_text(h):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h))).strip()


def to_text(h):
    h = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", h)
    return html.unescape(re.sub(r"<[^>]+>", " ", h))


def emails_from(h, page_url):
    found = []
    for m in re.finditer(r'mailto:([^"\'?>\s]+)', h, re.I):
        found.append((html.unescape(m.group(1)).strip(), "mailto", page_url))
    for e in EMAIL_RE.findall(to_text(h)):
        found.append((e.strip(), "page text", page_url))
    out, seen = [], set()
    for e, kind, u in found:
        el = e.lower().strip(".,;:")
        if el in seen or BAD_EMAIL.search(el) or len(el) > 70:
            continue
        seen.add(el)
        out.append({"email": el, "how": kind, "page": u})
    return out


def enrich(row):
    base = row["website"].rstrip("/")
    if not base.startswith("http"):
        base = "https://" + base
    res = dict(row)
    res.update(resolves=False, emails=[], pm_hits=[], doc_hits=[], portal_generic=False,
               ledger=[], pages_scanned=[], team_count=0, owner_guess="", http="")
    ledger_hits = set()

    code, home = fetch(base)
    if not home or (code and code.startswith(("4", "5")) and len(home) < 500):
        # try http:// and non-www / www flip
        alts = []
        if base.startswith("https://www."):
            alts.append("https://" + base[12:])
        elif base.startswith("https://"):
            alts.append("https://www." + base[8:])
        for a in alts:
            code, home = fetch(a)
            if home and len(home) > 500:
                base = a
                break
    res["http"] = code
    if not home or len(home) < 400:
        return res
    res["resolves"] = True

    pages = {base: home}
    # follow real in-site links whose href or anchor text looks like contact/about/team
    root = re.match(r"(https?://[^/]+)", base).group(1)
    wanted = re.compile(
        r"contact|about|team|equipe|équipe|joindre|propos|qui-sommes|our-story|"
        r"a-propos|staff|people", re.I)
    cands = []
    for m in re.finditer(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', home, re.S | re.I):
        href, label = m.group(1), clean_text(m.group(2))
        if not (wanted.search(href) or wanted.search(label)):
            continue
        if href.startswith("mailto:") or href.startswith("tel:"):
            continue
        u = href if href.startswith("http") else (
            root + href if href.startswith("/") else base + "/" + href.lstrip("./"))
        if not u.startswith(root) or u.rstrip("/") == base.rstrip("/"):
            continue
        if u not in cands:
            cands.append(u)
    for u in cands[:4]:
        c, b = fetch(u, timeout=15)
        if b and len(b) > 400 and not (c or "").startswith("4"):
            pages[u] = b

    all_text = ""
    for u, b in pages.items():
        if not b:
            continue
        res["pages_scanned"].append(u)
        res["emails"].extend(emails_from(b, u))
        t = to_text(b)
        all_text += "\n" + t
        blob = (b + " " + t).lower()
        for name, pat in PM_TOOLS:
            if re.search(pat, blob):
                snippet = ""
                mm = re.search(pat, blob)
                if mm:
                    snippet = blob[max(0, mm.start() - 60):mm.end() + 60].replace("\n", " ")
                    snippet = re.sub(r"\s+", " ", snippet)[:160]
                entry = {"tool": name, "page": u, "snippet": snippet}
                (res["doc_hits"] if name in DOC_ONLY else res["pm_hits"]).append(entry)
        if re.search(PORTAL_GENERIC, blob):
            res["portal_generic"] = True
        for lname, lpat in LEDGER:
            if re.search(lpat, blob):
                ledger_hits.add(lname)
        if re.search(r"/team|our-team|notre-equipe", u):
            res["team_count"] = max(res["team_count"], len(TEAM_PERSON.findall(t)))

    # dedupe emails, keep first occurrence
    seen, ded = set(), []
    for e in res["emails"]:
        if e["email"] in seen:
            continue
        seen.add(e["email"])
        ded.append(e)
    res["emails"] = ded

    m = None  # regex owner-name extraction proved too noisy to trust; done conservatively at CSV time
    if m:
        g = m.groups()
        cand = g[0] if (g[0][0].isupper() and " " in g[0]) else g[1]
        res["owner_guess"] = re.sub(r"\s+", " ", cand).strip()
    res["ledger"] = sorted(ledger_hits)
    res["text_len"] = len(all_text)
    res["staff_words"] = re.findall(
        r"(?:team of (?:over )?\w+|sole proprietor|solo bookkeeper|our team of \w+|"
        r"\d+\+? (?:staff|employees|team members|professionals))", all_text, re.I)[:3]
    return res


def main():
    rows = json.load(open(os.path.join(HERE, "nb-yp-raw.json")))
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else len(rows)
    rows = rows[:limit]
    out = []
    done = 0
    with ThreadPoolExecutor(max_workers=12) as ex:
        for r in ex.map(enrich, rows):
            out.append(r)
            done += 1
            if done % 25 == 0:
                print(f"  {done}/{len(rows)}", file=sys.stderr)
    p = os.path.join(HERE, "nb-enriched.json")
    json.dump(out, open(p, "w"), indent=1)
    ok = sum(1 for r in out if r["resolves"])
    withmail = sum(1 for r in out if r["emails"])
    pm = sum(1 for r in out if r["pm_hits"])
    print(f"{len(out)} rows | resolves={ok} | with email={withmail} | pm_tool hits={pm} -> {p}",
          file=sys.stderr)


if __name__ == "__main__":
    main()
