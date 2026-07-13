#!/usr/bin/env python3
"""scrub-transcripts.py — mask credential literals in Claude session transcripts.

Two hard constraints, both learned the hard way (docs/lessons.md 2026-07-13):

1. SECRETS COME FROM A FILE, NEVER ARGV. The ad-hoc scrubber that cleaned the first leak
   named each secret on its own command line — and every command line is written verbatim
   into the live transcript, so the cleanup re-leaked exactly what it removed. This script
   reads values from a file (one per line) or from named env vars, never prints them, and
   never accepts a secret as an argument.

2. SAME-LENGTH MASKING ONLY. The transcript of the *running* session is append-open by
   Claude Code. A length-changing rewrite shifts byte offsets and corrupts every subsequent
   append. Replacements are therefore 'X' * len(secret), and the script refuses to write if
   the file size would change.

Usage:
  scripts/scrub-transcripts.py --secrets-file <path>   # one secret per line, blank/# ignored
  scripts/scrub-transcripts.py --env KEY1,KEY2         # read values from these env vars
  scripts/scrub-transcripts.py --env-file <path>       # source a .env and scrub all its values
  [--dir <transcripts-dir>]  (default: ~/.claude/projects)
  [--dry-run]                # report counts, change nothing
  [--self-test]

Prints counts only. Rotation is still required afterwards: masking removes the copy, not the
validity of the credential.
"""
import argparse, os, pathlib, re, sys, tempfile


def load_secrets(args) -> list[str]:
    vals: list[str] = []
    if args.secrets_file:
        for line in pathlib.Path(args.secrets_file).read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                vals.append(line)
    if args.env:
        for key in args.env.split(","):
            v = os.environ.get(key.strip())
            if v:
                vals.append(v)
    if args.env_file:
        for line in pathlib.Path(args.env_file).read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            v = line.split("=", 1)[1].strip().strip("'\"")
            if len(v) >= 12:            # ignore ports, flags, short config values
                vals.append(v)
    # Longest first: a secret that contains another must be masked before its substring.
    return sorted({v for v in vals if len(v) >= 8}, key=len, reverse=True)


def scrub(paths, secrets, dry_run: bool) -> tuple[int, int]:
    total, touched = 0, 0
    for f in paths:
        try:
            data = f.read_bytes()
        except OSError:
            continue
        before, hits = len(data), 0
        for s in secrets:
            b = s.encode()
            c = data.count(b)
            if c:
                data = data.replace(b, b"X" * len(b))
                hits += c
        if not hits:
            continue
        if len(data) != before:
            print(f"  REFUSING {f.name}: size would change — that corrupts an append-open transcript")
            continue
        total += hits
        touched += 1
        if not dry_run:
            # Rewrite in place (same inode, same size) so a live append fd stays valid.
            with open(f, "r+b") as fh:
                fh.seek(0)
                fh.write(data)
                fh.flush()
                os.fsync(fh.fileno())
        print(f"  {'would mask' if dry_run else 'masked'} {hits} occurrence(s) in {f.name}")
    return total, touched


def self_test() -> int:
    d = pathlib.Path(tempfile.mkdtemp())
    secret = "sbp_" + "a" * 30
    t = d / "fake.jsonl"
    t.write_text('{"type":"user","text":"token is %s here"}\n' % secret)
    size_before = t.stat().st_size
    sf = d / "secrets.txt"
    sf.write_text(secret + "\n")

    ns = argparse.Namespace(secrets_file=str(sf), env=None, env_file=None)
    secrets = load_secrets(ns)
    ok = 0
    if secrets == [secret]:
        print("PASS self-test: secret loaded from file"); ok += 1
    else:
        print("FAIL self-test: secret not loaded"); return 1

    total, _ = scrub([t], secrets, dry_run=False)
    body = t.read_text()
    if total == 1 and secret not in body:
        print("PASS self-test: secret masked"); ok += 1
    else:
        print("FAIL self-test: secret still present"); return 1
    if t.stat().st_size == size_before:
        print("PASS self-test: file size unchanged (append-safe)"); ok += 1
    else:
        print("FAIL self-test: size changed — would corrupt a live transcript"); return 1
    if "XXXX" in body:
        print("PASS self-test: replacement is same-length mask"); ok += 1
    else:
        print("FAIL self-test: mask missing"); return 1
    print(f"\nscrub-transcripts self-test: {ok} pass, 0 fail")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--secrets-file")
    ap.add_argument("--env")
    ap.add_argument("--env-file")
    ap.add_argument("--dir", default=str(pathlib.Path.home() / ".claude/projects"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()

    if args.self_test:
        return self_test()
    if not (args.secrets_file or args.env or args.env_file):
        ap.error("give --secrets-file, --env or --env-file. Secrets are NEVER passed as arguments.")

    secrets = load_secrets(args)
    if not secrets:
        print("no secrets loaded — nothing to do")
        return 1
    print(f"loaded {len(secrets)} secret value(s) (values never printed)")

    paths = list(pathlib.Path(args.dir).rglob("*.jsonl"))
    total, touched = scrub(paths, secrets, args.dry_run)
    print(f"\n{'would mask' if args.dry_run else 'masked'} {total} occurrence(s) across {touched} file(s) of {len(paths)} scanned")
    if total and not args.dry_run:
        print("Masking removes the copy, not the credential's validity — ROTATE as well.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
