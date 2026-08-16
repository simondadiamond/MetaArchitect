#!/usr/bin/env python3
"""Stage 5: check the CSV against the goal's acceptance criteria before Simon sees it.

Re-resolves every website live, confirms every email domain actually accepts mail
(MX lookup), and re-checks the per-row rules. Read-only: sends nothing, writes nothing
except this report.
"""
import csv
import os
import re
import subprocess
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

CSV = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "funnel/setup-offer/prospects/bookkeepers-2026-08.csv")
COLS = ["firm_name", "city", "province", "website", "staff_estimate", "owner_name",
        "owner_email", "email_source", "pm_tool", "pm_evidence", "ledger", "notes"]
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")


def resolves(url):
    p = subprocess.run(["curl", "-sS", "-L", "-o", "/dev/null", "-A", UA,
                        "--max-time", "20", "--connect-timeout", "8",
                        "-w", "%{http_code}", url],
                       capture_output=True, text=True)
    return url, p.stdout.strip()


def has_mx(domain):
    p = subprocess.run(["dig", "+short", "MX", domain], capture_output=True, text=True)
    if p.stdout.strip():
        return domain, True
    p = subprocess.run(["dig", "+short", "A", domain], capture_output=True, text=True)
    return domain, bool(p.stdout.strip())


def main():
    rows = list(csv.DictReader(open(CSV)))
    problems = []

    if list(rows[0].keys()) != COLS:
        problems.append(f"column mismatch: {list(rows[0].keys())}")

    names = Counter(r["firm_name"].strip().lower() for r in rows)
    mails = Counter(r["owner_email"].strip().lower() for r in rows)
    doms = Counter(re.sub(r"^https?://(www\.)?", "", r["website"]).split("/")[0].lower()
                   for r in rows)
    for label, c in (("firm_name", names), ("owner_email", mails), ("domain", doms)):
        dupes = [k for k, v in c.items() if v > 1]
        if dupes:
            problems.append(f"duplicate {label}: {dupes}")

    for i, r in enumerate(rows, start=2):
        if r["pm_tool"] not in ("yes", "no", "unknown"):
            problems.append(f"row {i}: bad pm_tool {r['pm_tool']!r}")
        if r["pm_tool"] in ("yes", "no") and not r["pm_evidence"].strip():
            problems.append(f"row {i}: pm_tool={r['pm_tool']} with no pm_evidence")
        if r["owner_email"] and not r["email_source"].strip():
            problems.append(f"row {i}: email with no email_source")
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[a-z]{2,}", r["owner_email"], re.I):
            problems.append(f"row {i}: malformed email {r['owner_email']!r}")
        if "guess" in r["email_source"].lower() and "guessed" not in r["email_source"].lower():
            problems.append(f"row {i}: guess-ish source not labelled 'guessed'")

    print(f"rows: {len(rows)}")
    print("resolving every website live...")
    codes = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        for u, c in ex.map(resolves, [r["website"] for r in rows]):
            codes[u] = c
    bad = {u: c for u, c in codes.items() if not (c.startswith("2") or c.startswith("3"))}
    print(f"  ok: {len(codes) - len(bad)} / {len(codes)}")
    for u, c in bad.items():
        print(f"  NOT RESOLVING [{c}] {u}")

    print("checking email domains accept mail...")
    edoms = sorted({r["owner_email"].split("@")[1].lower() for r in rows})
    mx = {}
    with ThreadPoolExecutor(max_workers=12) as ex:
        for d, ok in ex.map(has_mx, edoms):
            mx[d] = ok
    nomx = [d for d, ok in mx.items() if not ok]
    print(f"  domains with MX/A: {len(edoms) - len(nomx)} / {len(edoms)}")
    if nomx:
        print("  NO MX:", nomx)

    print("\npm_tool:", dict(Counter(r["pm_tool"] for r in rows)))
    print("province:", dict(sorted(Counter(r["province"] for r in rows).items())))
    print("staff known:", sum(1 for r in rows if r["staff_estimate"] != "unknown"))
    print("owner_name filled:", sum(1 for r in rows if r["owner_name"]))
    print("ledger known:", sum(1 for r in rows if r["ledger"] != "unknown"))
    print("guessed emails:", sum(1 for r in rows if "guessed" in r["email_source"].lower()))
    print("shared mailbox rows:",
          sum(1 for r in rows if "shared mailbox" in r["notes"]))

    print("\nPROBLEMS:" if problems else "\nNo rule violations.")
    for p in problems:
        print("  -", p)
    return 1 if problems or bad or nomx else 0


if __name__ == "__main__":
    sys.exit(main())
