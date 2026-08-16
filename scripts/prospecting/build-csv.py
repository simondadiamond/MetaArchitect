#!/usr/bin/env python3
"""Stage 4: turn the deep-pass data into the reviewable prospect CSV.

Classification rules (deliberately conservative — a wrong label is worse than
an honest "unknown", and unknowns stay in the list by design):

  pm_tool = yes      a named practice-management platform that runs client-document
                     workflows (TaxDome, Karbon, Canopy, Financial Cents, Jetpack,
                     Liscio, Client Hub, Pixie, Ignition, CCH iFirm, Onvio)
  pm_tool = no       >= 3 public pages scanned (incl. nav pages) with no PM platform
                     found; a file-transfer-only portal (ShareFile, SmartVault,
                     FileCenter, custom upload page) counts as "no" because it does
                     not chase the client for you
  pm_tool = unknown  too little of the site was readable to judge

Nothing here contacts anyone. Output is a file for Simon to review.
"""
import csv
import json
import os
import re
import subprocess
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "funnel/setup-offer/prospects/bookkeepers-2026-08.csv")

# Practice-management platforms: these run the client-document chase.
PM_URL = [
    ("TaxDome", r"taxdome"), ("Karbon", r"karbonhq"), ("Canopy", r"canopytax|canopy\.tax"),
    ("Financial Cents", r"financial-?cents"), ("Jetpack Workflow", r"jetpackworkflow"),
    ("Liscio", r"liscio"), ("Client Hub", r"clienthub\.app"), ("Pixie", r"usepixie"),
    ("Ignition", r"ignitionapp"), ("CCH iFirm", r"cchifirm"), ("Onvio", r"onvio\.ca|onvio\.com"),
]
# File transfer / document capture only: no chasing workflow.
FILE_ONLY_URL = [
    ("ShareFile", r"sharefile"), ("SmartVault", r"smartvault"),
    ("FileCenter", r"filecenterportal"), ("ClientTrack", r"clienttrackportal"),
    ("Dropbox", r"dropbox"), ("Hubdoc", r"hubdoc"), ("Dext", r"dext\.com"),
    ("TaxFolder", r"taxfolder|taxcycle"), ("Google Drive", r"drive\.google"),
]

NAME_STOP = set("""about our us contact info hours service services free call menu coming
soon location locations blog meet main website sections payment methods follow join
business tax case studies bar criminal insurance claims cloud based flexible billing
options time savings local focus industry expertise personalized solutions honest
professionals head office team firm mission process strategy map read more learn get
started book now client clients portal login home news careers privacy terms sitemap
appointment consultation why choose what we do how it works your the and for with new
open closed monday friday saturday sunday phone fax email address suite unit floor
west east north south downtown accounting bookkeeping payroll corporate personal
small business quick links social media follow us""".split())
CITY_WORDS = set("""toronto ottawa vancouver calgary edmonton montreal quebec winnipeg
halifax regina saskatoon victoria kelowna hamilton london windsor barrie oshawa markham
burlington guelph kingston sudbury moncton fredericton charlottetown laval gatineau
sherbrooke surrey abbotsford nanaimo mississauga brampton catharines""".split())

FREE_MAIL = {"gmail.com", "hotmail.com", "hotmail.ca", "yahoo.ca", "yahoo.com",
             "outlook.com", "shaw.ca", "telus.net", "sympatico.ca", "videotron.ca",
             "live.com", "live.ca", "bellnet.ca", "rogers.com", "icloud.com", "aol.com"}


UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")


def http_ok(url):
    p = subprocess.run(
        ["curl", "-sS", "-L", "-o", "/dev/null", "-A", UA, "--max-time", "20",
         "--connect-timeout", "8", "-w", "%{http_code}", url],
        capture_output=True, text=True)
    return p.stdout.strip().startswith(("2", "3"))


def real_names(items):
    out = []
    for n in items:
        n = re.sub(r"^Meet\s+", "", n).strip(" .,-")
        toks = n.split()
        if not (2 <= len(toks) <= 3):
            continue
        low = [t.lower().strip(".,") for t in toks]
        if any(t in NAME_STOP or t in CITY_WORDS for t in low):
            continue
        if not all(re.fullmatch(r"[A-ZÀ-Ý][a-zà-ÿ'\-]*\.?", t) for t in toks):
            continue
        if any(len(t) < 2 for t in low):
            continue
        if n not in out:
            out.append(n)
    # drop "Jen Schmidt" duplicates left by "Meet Jen Schmidt"
    return sorted(set(out))


TEASER_JUNK = re.compile(r"\bmore\.\.\.|see more text|read more|\bmore\b\s*$", re.I)
OWNER_TEASER = re.compile(
    r"(?:owner[/ ]?operator|owner|founder|principal|proprietor|founded by|led by|"
    r"operated by)[,:]?\s+(?:is\s+)?([A-Z][a-zà-ÿ'\-]+\s+[A-Z][a-zà-ÿ'\-]+)")


def clean_teaser(t):
    t = TEASER_JUNK.sub(" ", t)
    return re.sub(r"\s+", " ", t).strip(" .;,-")[:200]


def owner_from_teaser(t):
    m = OWNER_TEASER.search(t or "")
    if not m:
        return ""
    name = m.group(1)
    if any(w.lower() in NAME_STOP or w.lower() in CITY_WORDS for w in name.split()):
        return ""
    return name


def pick_email(usable):
    def rank(e):
        return (e["free"], e["generic"])   # own-domain personal first
    return sorted(usable, key=rank)[0] if usable else None


# Site-builder CDNs serve asset URLs that happen to contain "portal" (Wix's
# thunderbolt bundle carries a DatePickerPortal flag) — those are not client portals.
ASSET_HOST = re.compile(
    r"parastorage\.com|wixstatic\.com|googleapis\.com|gstatic\.com|jsdelivr|unpkg|"
    r"cloudflare|bootstrapcdn|fontawesome|^https?://(static|cdn|assets)\.", re.I)
ASSET_PATH = re.compile(r"\.(js|css|json|png|jpe?g|svg|woff2?|ttf|map)(\?|$)", re.I)


def real_portals(urls):
    return [u for u in urls or []
            if not ASSET_HOST.search(u) and not ASSET_PATH.search(u)]


def classify_pm(r):
    r = dict(r, portal_urls=real_portals(r.get("portal_urls")))
    urls = " ".join(r.get("portal_urls", []))
    for h in r.get("deep_pm", []):
        return "yes", f"{h['tool']} found on {h['page']}"
    for name, pat in PM_URL:
        m = re.search(pat, urls, re.I)
        if m:
            u = next(u for u in r["portal_urls"] if re.search(pat, u, re.I))
            return "yes", f"{name} client portal linked from site: {u}"

    file_only = []
    for name, pat in FILE_ONLY_URL:
        if re.search(pat, urls, re.I):
            file_only.append((name, next(u for u in r["portal_urls"] if re.search(pat, u, re.I))))
    for h in r.get("deep_doc", []):
        if not any(n == h["tool"] for n, _ in file_only):
            file_only.append((h["tool"], h["page"]))

    pages = r.get("deep_pages", [])
    if file_only and len(pages) >= 2:
        n, u = file_only[0]
        return "no", (f"portal is file-transfer/document-capture only ({n}: {u}); "
                      f"no practice-management platform across {len(pages)} pages scanned")
    if r.get("portal_urls") and len(pages) >= 3:
        return "no", (f"client portal is a custom login page ({r['portal_urls'][0]}), not a "
                      f"named PM platform; {len(pages)} pages scanned")
    if len(pages) >= 3:
        return "no", (f"no client-portal or PM-tool reference on {len(pages)} public pages "
                      f"scanned incl. {', '.join(p for p in pages[1:3])}")
    return "unknown", f"only {len(pages)} page(s) readable — not enough to judge"


def main():
    rows = json.load(open(os.path.join(HERE, "nb-deep.json")))
    out, dropped = [], Counter()
    for r in rows:
        if not r.get("deep_ok"):
            dropped["site stopped resolving on second pass"] += 1
            continue
        people = real_names(r.get("team_people", []))
        if len(people) > 20:
            dropped["too large (>20 named on team page)"] += 1
            continue
        em = pick_email(r["usable"])
        if not em:
            dropped["no usable email"] += 1
            continue

        pm, pm_ev = classify_pm(r)

        if people:
            staff = (f"{len(people)} named on team page"
                     if len(people) > 1 else "1 named (sole practitioner signal)")
        else:
            staff = "unknown"

        owner = ""
        firm_low = r["firm_name"].lower()
        for p in people:
            parts = [t.lower().strip(".") for t in p.split()]
            if any(len(t) > 3 and t in firm_low for t in parts):
                owner = p
                break
        if not owner and len(people) == 1:
            owner = people[0]
        if not owner and not em["generic"] and not em["free"]:
            lp = re.split(r"[._\-]", em["local"])
            if all(t.isalpha() and len(t) > 2 for t in lp) and 1 <= len(lp) <= 2:
                if any(t in firm_low for t in lp):
                    owner = " ".join(t.capitalize() for t in lp)

        ledger = r.get("deep_ledger") or r.get("ledger") or []
        ledger = "/".join(x for x in ledger if x != "Sage") or ("Sage" if "Sage" in ledger else "unknown")

        src = f"firm website ({em['how']}) — {em['page']}"
        if em["free"]:
            src += " [free mailbox published by the firm]"

        if not owner:
            owner = owner_from_teaser(r.get("teaser") or "")

        notes = []
        teaser = clean_teaser(r.get("teaser") or "")
        if teaser:
            notes.append(teaser)
        if r.get("deep_doc"):
            notes.append("doc tools seen: " + ", ".join(sorted({h["tool"] for h in r["deep_doc"]})))
        if em["generic"]:
            notes.append("shared mailbox, not the owner personally")
        notes.append(f"{len(r.get('deep_pages', []))} pages scanned")

        out.append({
            "firm_name": r["firm_name"],
            "city": r.get("city") or r["search_city"],
            "province": r.get("province") or r["search_prov"],
            "website": r["website"],
            "staff_estimate": staff,
            "owner_name": owner,
            "owner_email": em["email"],
            "email_source": src,
            "pm_tool": pm,
            "pm_evidence": pm_ev,
            "ledger": ledger,
            "notes": "; ".join(notes)[:300],
        })

    # a listing on someone else's directory is not the firm's own site
    kept = []
    for r in out:
        if re.search(r"/(members?|profile|listing|directory)/", r["website"], re.I):
            dropped["directory listing, not a firm site"] += 1
        else:
            kept.append(r)
    out = kept

    # "every website resolves" is an acceptance criterion, so verify it here rather
    # than letting dead rows reach the file
    with ThreadPoolExecutor(max_workers=12) as ex:
        live = list(ex.map(http_ok, [r["website"] for r in out]))
    kept = []
    for r, ok in zip(out, live):
        if ok:
            kept.append(r)
        else:
            dropped["website not resolving"] += 1
    out = kept

    # dedupe by email and by firm name
    seen_mail, seen_name, final = set(), set(), []
    for r in out:
        k1, k2 = r["owner_email"].lower(), r["firm_name"].lower().strip()
        if k1 in seen_mail or k2 in seen_name:
            dropped["duplicate firm/email"] += 1
            continue
        seen_mail.add(k1)
        seen_name.add(k2)
        final.append(r)

    final.sort(key=lambda r: (r["province"], r["city"], r["firm_name"]))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    cols = ["firm_name", "city", "province", "website", "staff_estimate", "owner_name",
            "owner_email", "email_source", "pm_tool", "pm_evidence", "ledger", "notes"]
    with open(OUT, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(final)

    print("rows:", len(final))
    print("dropped:", dict(dropped))
    print("pm_tool:", dict(Counter(r["pm_tool"] for r in final)))
    print("province:", dict(Counter(r["province"] for r in final)))
    print("owner_name filled:", sum(1 for r in final if r["owner_name"]))
    print("staff known:", sum(1 for r in final if r["staff_estimate"] != "unknown"))
    print("ledger known:", sum(1 for r in final if r["ledger"] != "unknown"))
    print("free mailbox:", sum(1 for r in final if "free mailbox" in r["email_source"]))
    print("->", OUT)


if __name__ == "__main__":
    main()
