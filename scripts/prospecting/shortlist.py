#!/usr/bin/env python3
"""Pick the shortlist that goes into the deep pass.

Keeps only rows that are plausibly an owner-operated Canadian bookkeeping /
accounting practice with a real public email, then spreads the picks across
provinces so the list isn't 70% Toronto.
"""
import json
import os
import re
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))

CHAINS = re.compile(
    r"h\s*&?\s*r\s*block|liberty tax|padgett|bdo\b|mnp\b|grant thornton|deloitte|kpmg|"
    r"pricewaterhouse|pwc\b|ernst\s*&\s*young|rsm\b|crowe\b|baker tilly|welch llp|"
    r"doane|softron|money concepts|jackson hewitt|intuit|quickbooks|xero|wave\b|"
    r"freshbooks|adp\b|ceridian|payworks|staples|ups store|registered massage", re.I)

# Must look like an accounting/bookkeeping practice, not a random YP listing.
PRACTICE = re.compile(
    r"bookkeep|book-keep|accounting|accountant|comptab|cpa\b|cga\b|cma\b|tax\b|taxes|"
    r"fiscal|ledger|payroll|financial services|financials|advisory|chartered", re.I)

# Businesses that are clearly not a practice even if the words match.
NOT_PRACTICE = re.compile(
    r"logistics|flower|restaurant|realty|real estate|insurance broker|mortgage|"
    r"law office|barrister|solicitor|immigration|travel|driving school|salon|"
    r"construction|plumbing|roofing|landscap|auto |car wash|dental|clinic|pharmacy|"
    r"university|college|school board|municipal", re.I)

GENERIC_BOX = re.compile(
    r"^(info|admin|contact|hello|office|mail|inquir|enquir|team|service|support|sales|"
    r"reception|general|accounts?|accounting|bookkeeping|book|cs|help|clients?|"
    r"welcome|ask|hi|bonjour|courriel)", re.I)

FREE_MAIL = {"gmail.com", "hotmail.com", "hotmail.ca", "yahoo.ca", "yahoo.com",
             "outlook.com", "shaw.ca", "telus.net", "sympatico.ca", "videotron.ca",
             "live.com", "live.ca", "bellnet.ca", "rogers.com", "icloud.com", "aol.com"}

TARGET = 130
PROV_CAP = {"ON": 42, "BC": 22, "QC": 18, "AB": 18, "SK": 8, "NB": 8, "NS": 8,
            "MB": 6, "PE": 5, "NL": 5}


def dom(u):
    return re.sub(r"^https?://(www\.)?", "", u or "").split("/")[0].lower()


def usable_emails(r):
    out = []
    site = dom(r["website"])
    for e in r["emails"]:
        addr = e["email"]
        if addr.count("@") != 1:
            continue
        local, host = addr.split("@")
        host = host.lower().strip(".")
        if not re.fullmatch(r"[a-z0-9.\-]+\.[a-z]{2,}", host):
            continue
        # only keep addresses on the firm's own domain or a free mailbox the firm
        # publishes itself — anything else is somebody else's address on their page
        if host != site and not host.endswith("." + site) and host not in FREE_MAIL:
            continue
        if re.search(r"(webmaster|noreply|no-reply|privacy|abuse|dmca|careers?|jobs)", local, re.I):
            continue
        out.append(dict(e, generic=bool(GENERIC_BOX.match(local)),
                        free=host in FREE_MAIL, host=host, local=local))
    # prefer own-domain generic box, then own-domain personal, then free mail
    out.sort(key=lambda e: (e["free"], not e["generic"]))
    return out


def score(r, emails):
    s = 0
    name = (r["firm_name"] + " " + (r.get("teaser") or "")).lower()
    if "bookkeep" in name or "comptab" in name or "teneur de livres" in name:
        s += 40                      # core ICP wording
    elif re.search(r"accounting|accountant|cpa", name):
        s += 22
    else:
        s += 8
    if any(not e["free"] for e in emails):
        s += 18                      # address on the firm's own domain
    if r.get("ledger"):
        s += 12                      # QBO/Xero named publicly
    if r.get("portal_generic"):
        s += 6                       # has a client-facing surface worth checking
    if len(r.get("pages_scanned", [])) >= 3:
        s += 6                       # site substantial enough to judge
    if re.search(r"llp|chartered professional accountants of|group inc", name):
        s -= 10                      # skews larger than 1-20
    return s


def main():
    d = json.load(open(os.path.join(HERE, "nb-enriched.json")))
    pool = []
    drop = Counter()
    for r in d:
        if not r["resolves"]:
            drop["site did not resolve"] += 1
            continue
        blob = r["firm_name"] + " " + (r.get("teaser") or "")
        if CHAINS.search(blob):
            drop["national chain / vendor"] += 1
            continue
        if NOT_PRACTICE.search(blob):
            drop["not an accounting practice"] += 1
            continue
        if not PRACTICE.search(blob):
            drop["no practice keyword"] += 1
            continue
        em = usable_emails(r)
        if not em:
            drop["no usable public email"] += 1
            continue
        r = dict(r, usable=em, score=score(r, em))
        pool.append(r)

    pool.sort(key=lambda r: -r["score"])
    per = defaultdict(int)
    picked, overflow = [], []
    for r in pool:
        p = r["search_prov"]
        if per[p] < PROV_CAP.get(p, 4):
            per[p] += 1
            picked.append(r)
        else:
            overflow.append(r)
    picked = (picked + overflow)[:TARGET]

    json.dump(picked, open(os.path.join(HERE, "nb-shortlist.json"), "w"), indent=1)
    print("dropped:", dict(drop))
    print("pool:", len(pool), "-> shortlist:", len(picked))
    print("by province:", dict(Counter(r["search_prov"] for r in picked)))
    print("own-domain email:", sum(1 for r in picked if any(not e["free"] for e in r["usable"])))
    print("bookkeeping-named:",
          sum(1 for r in picked if "bookkeep" in r["firm_name"].lower()
              or "comptab" in r["firm_name"].lower()))


if __name__ == "__main__":
    main()
