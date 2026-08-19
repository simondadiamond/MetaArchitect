#!/usr/bin/env python3
"""Enumerate session-sweep candidates per session-sweep.md §1. Read-only."""
import json, os, sys, glob, datetime, re

PROJECTS = os.path.expanduser("~/.claude/projects")
LEDGER = os.path.expanduser("~/projects/brain/.reconciler/processed.json")
GRACE_H = 24
CAP = int(sys.argv[1]) if len(sys.argv) > 1 else 10

SCHEDULE_NAMES = ("blog-pipeline-dispatch", "convert-dispatch", "call-prep", "session-recap",
                  "weekly-brief", "weekly-review", "repurpose", "night-build", "engage",
                  "engage-replies", "case-study-capture", "reconciler", "session-sweep",
                  "clients-sweep", "outreach", "harvest", "teardown-research")


def schedule_cmd(text):
    """Return the dispatcher command name if the first user turn is a schedule prompt."""
    m = re.search(r"<command-name>\s*/?([a-z0-9:-]+)\s*</command-name>", text, re.I)
    name = m.group(1) if m else None
    if not name:
        m2 = re.match(r"\s*/([a-z0-9:-]+)", text, re.I)
        name = m2.group(1) if m2 else None
    if name and name.lower() in SCHEDULE_NAMES:
        return name
    return None

ledger = {e["path"]: e["lastLineTimestamp"] for e in json.load(open(LEDGER))}

def first_last(path):
    """(first_ts, last_ts, first_user_text) — reads head + tail only."""
    first_ts = last_ts = None
    first_user = None
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        # head: scan up to 400KB for first timestamp + first user turn
        head = f.read(min(size, 400_000)).decode("utf-8", "replace").split("\n")
        for line in head:
            if not line.strip():
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if not isinstance(o, dict):
                continue
            if first_ts is None and o.get("timestamp"):
                first_ts = o["timestamp"]
            if first_user is None and o.get("type") == "user":
                m = o.get("message") or {}
                c = m.get("content")
                if isinstance(c, str):
                    first_user = c
                elif isinstance(c, list):
                    for p in c:
                        if isinstance(p, dict) and p.get("type") == "text":
                            first_user = p.get("text")
                            break
            if first_ts and first_user:
                break
        # tail: last 400KB for last timestamp
        f.seek(max(0, size - 400_000))
        tail = f.read().decode("utf-8", "replace").split("\n")
        for line in reversed(tail):
            if not line.strip():
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if isinstance(o, dict) and o.get("timestamp"):
                last_ts = o["timestamp"]
                break
    return first_ts, last_ts, (first_user or "").strip()

now = datetime.datetime.now(datetime.timezone.utc)
cands, skipped = [], {"processed": 0, "grace": 0, "worktree": 0, "schedule": 0, "fork": 0}
stubs = []
processed_first_ts = set()

# collect first-line timestamps of already-processed transcripts for fork dedupe
all_files = []
for d in sorted(os.listdir(PROJECTS)):
    dp = os.path.join(PROJECTS, d)
    if not os.path.isdir(dp):
        continue
    for f in sorted(glob.glob(os.path.join(dp, "*.jsonl"))):
        all_files.append((d, f))

meta = {}
for d, f in all_files:
    try:
        meta[f] = first_last(f)
    except Exception as e:
        meta[f] = (None, None, f"<err {e}>")

for d, f in all_files:
    if f in ledger:
        ft = meta[f][0]
        if ft:
            processed_first_ts.add(ft)

for d, f in all_files:
    ft, lt, fu = meta[f]
    if "story-worktrees" in d:
        skipped["worktree"] += 1
        if f not in ledger:
            stubs.append((f, "story-worktrees", lt))
        continue
    if lt is None:
        if f not in ledger:
            stubs.append((f, "no-timestamp-stub", None))
        continue
    if f in ledger and ledger[f] >= lt:
        skipped["processed"] += 1
        continue
    age = (now - datetime.datetime.fromisoformat(lt.replace("Z", "+00:00"))).total_seconds() / 3600
    if age < GRACE_H:
        skipped["grace"] += 1
        continue
    sc = schedule_cmd(fu)
    if sc:
        skipped["schedule"] += 1
        stubs.append((f, "schedule-fired:/" + sc, lt))
        continue
    if f not in ledger and ft and ft in processed_first_ts:
        skipped["fork"] += 1
        stubs.append((f, "resume-fork", lt))
        continue
    cands.append({"path": f, "dir": d, "first": ft, "last": lt,
                  "size": os.path.getsize(f), "firstUser": fu[:200]})

cands.sort(key=lambda c: c["last"])
print(json.dumps({"skipped": skipped, "stubs": stubs,
                  "candidateCount": len(cands),
                  "candidates": cands[:CAP],
                  "deferred": len(cands) - min(len(cands), CAP)}, indent=1))
