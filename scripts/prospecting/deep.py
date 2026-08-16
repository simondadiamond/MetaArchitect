#!/usr/bin/env python3
"""Stage 3: deep pass over the shortlist.

For each shortlisted firm, re-fetch the homepage plus every client-portal / login /
team / about / services link, so that:
  - pm_tool = yes is backed by a named tool and the page it was found on
  - pm_tool = no means "we actually looked at the portal/login surface and there
    is no practice-management tool there", not "we only read the homepage"
  - staff_estimate comes from counting real person entries on a team page
Public pages only. Nothing is contacted.
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

PM_TOOLS = [
    ("TaxDome", r"taxdome"),
    ("Karbon", r"karbonhq|powered by karbon|karbon practice"),
    ("Canopy", r"canopytax|canopy\.tax|client\.canopy"),
    ("Financial Cents", r"financial-cents|financialcents"),
    ("Jetpack Workflow", r"jetpackworkflow|jetpack workflow"),
    ("Keeper", r"keeper\.app"),
    ("Client Hub", r"clienthub\.app"),
    ("Liscio", r"liscio"),
    ("Pixie", r"usepixie"),
    ("Content Snare", r"contentsnare|content snare"),
    ("Ignition", r"ignitionapp\.com"),
    ("Karbon-hosted portal", r"portal\.karbonhq"),
    ("TaxCycle portal", r"taxcycle|taxfolder"),
    ("SmartVault", r"smartvault"),
    ("ShareFile", r"sharefile\.com"),
    ("Dext", r"dext\.com|receiptbank|receipt-bank"),
    ("Hubdoc", r"hubdoc"),
]
# Document-capture / file-transfer only — these do NOT run the client-chase workflow,
# so they must not disqualify a firm. Recorded, but scored separately.
DOC_ONLY = {"SmartVault", "ShareFile", "Dext", "Hubdoc", "TaxCycle portal"}

PORTAL_LINK = re.compile(r"portal|client.?login|secure.?(login|upload|file)|clienthub|"
                         r"client.?centre|client.?center|espace.?client", re.I)
NAV_LINK = re.compile(r"contact|about|team|equipe|équipe|joindre|propos|qui-sommes|"
                      r"staff|people|services|pricing|tarif", re.I)
LEDGER = [("QBO", r"quickbooks|\bqbo\b|intuit"), ("Xero", r"\bxero\b"),
          ("Sage", r"\bsage\s?(50|300|accounting)")]

ROLE = (r"CPA|CPB|CGA|CMA|CA\b|Bookkeeper|Accountant|Partner|Principal|Founder|Owner|"
        r"President|Controller|Manager|Associate|Technician|Comptable|Teneur")
PERSON_HEAD = re.compile(
    r"<(h[1-6]|strong|b)[^>]*>\s*([A-Z][a-zÀ-ÿ'\-]+(?:\s+[A-Z][a-zÀ-ÿ'\-\.]+){1,2})\s*"
    r"(?:,\s*(?:%s))?\s*</\1>" % ROLE)
PERSON_TEXT = re.compile(
    r"\b([A-Z][a-zÀ-ÿ'\-]+(?:\s+[A-Z][a-zÀ-ÿ'\-\.]+){1,2})\s*,\s*(?:%s)\b" % ROLE)


def fetch(url, timeout=18):
    p = subprocess.run(
        ["curl", "-sS", "-L", "-A", UA, "--max-time", str(timeout),
         "--connect-timeout", "8", "-w", "\n@@HTTP:%{http_code}", url],
        capture_output=True, text=True, errors="replace")
    body, code = p.stdout, ""
    m = re.search(r"\n@@HTTP:(\d+)$", body)
    if m:
        code, body = m.group(1), body[:m.start()]
    return code, body


def to_text(h):
    h = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", h)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", h)))


def deep(row):
    base = row["website"].rstrip("/")
    if not base.startswith("http"):
        base = "https://" + base
    out = dict(row)
    out.update(deep_pages=[], deep_pm=[], deep_doc=[], portal_urls=[], team_people=[],
               team_page="", deep_ledger=[], deep_emails=[], deep_ok=False)

    code, home = fetch(base)
    if not home or len(home) < 400:
        return out
    out["deep_ok"] = True
    root = re.match(r"(https?://[^/]+)", base).group(1)

    portal, nav = [], []
    for m in re.finditer(r'<a[^>]+href=["\']([^"\'#]+)["\'][^>]*>(.*?)</a>', home, re.S | re.I):
        href, label = m.group(1), to_text(m.group(2)).strip()
        if href.startswith(("mailto:", "tel:", "javascript")):
            continue
        u = href if href.startswith("http") else (
            root + href if href.startswith("/") else base + "/" + href.lstrip("./"))
        if PORTAL_LINK.search(href) or PORTAL_LINK.search(label):
            # external portal links are the strongest signal — keep them even off-domain
            if u not in portal:
                portal.append(u)
        elif u.startswith(root) and (NAV_LINK.search(href) or NAV_LINK.search(label)):
            if u not in nav and u.rstrip("/") != base.rstrip("/"):
                nav.append(u)
    out["portal_urls"] = portal[:6]

    pages = {base: home}
    for u in portal[:4]:
        if u.startswith(root):
            c, b = fetch(u)
            if b and len(b) > 300:
                pages[u] = b
    for u in nav[:5]:
        c, b = fetch(u)
        if b and len(b) > 400 and not (c or "").startswith("4"):
            pages[u] = b

    ledger = set()
    for u, b in pages.items():
        out["deep_pages"].append(u)
        blob = (b + " " + to_text(b)).lower()
        for name, pat in PM_TOOLS:
            mm = re.search(pat, blob)
            if mm:
                sn = re.sub(r"\s+", " ", blob[max(0, mm.start() - 70):mm.end() + 70])[:180]
                (out["deep_doc"] if name in DOC_ONLY else out["deep_pm"]).append(
                    {"tool": name, "page": u, "snippet": sn})
        for lname, lpat in LEDGER:
            if re.search(lpat, blob):
                ledger.add(lname)
        if re.search(r"team|equipe|équipe|about|propos|staff|people", u, re.I):
            people = set()
            for m in PERSON_HEAD.finditer(b):
                people.add(m.group(2).strip())
            for m in PERSON_TEXT.finditer(to_text(b)):
                people.add(m.group(1).strip())
            if len(people) > len(out["team_people"]):
                out["team_people"] = sorted(people)
                out["team_page"] = u
    # portal URLs that live on a vendor domain are decisive even if unfetched
    for u in portal:
        for name, pat in PM_TOOLS:
            if re.search(pat, u, re.I):
                if not any(h["tool"] == name for h in out["deep_pm"] + out["deep_doc"]):
                    (out["deep_doc"] if name in DOC_ONLY else out["deep_pm"]).append(
                        {"tool": name, "page": base, "snippet": f"client-portal link -> {u}"})
    out["deep_ledger"] = sorted(ledger)
    return out


def main():
    rows = json.load(open(os.path.join(HERE, "nb-shortlist.json")))
    out, done = [], 0
    with ThreadPoolExecutor(max_workers=12) as ex:
        for r in ex.map(deep, rows):
            out.append(r)
            done += 1
            if done % 20 == 0:
                print(f"  {done}/{len(rows)}", flush=True)
    json.dump(out, open(os.path.join(HERE, "nb-deep.json"), "w"), indent=1)
    print(f"{len(out)} deep rows | pm={sum(1 for r in out if r['deep_pm'])} | "
          f"doc={sum(1 for r in out if r['deep_doc'])} | "
          f"team pages={sum(1 for r in out if r['team_people'])}", flush=True)


if __name__ == "__main__":
    main()
