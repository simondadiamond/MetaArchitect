#!/usr/bin/env python3
"""Run raw SQL against a Supabase project via the Management API.

Usage:
    scripts/supabase-sql.py "select * from pipeline.logs limit 5"
    scripts/supabase-sql.py --ref <project-ref> "alter table ..."

Token discovery: popebot workspace volumes first, then ~/.supabase/access-token
(the canonical pattern from .claude/skills/_shared/supabase-access.md — edit
there and here together). Response contract: [] = DDL success; list of dicts =
SELECT/INSERT rows. Prints JSON to stdout.
"""
import argparse, glob, json, os, sys, urllib.request

DEFAULT_REF = 'ashwrqkoijzvakdmfskj'  # command-center project


def get_token():
    paths = glob.glob('/app/data/workspaces/*/.supabase/access-token')
    paths += [os.path.expanduser('~/.supabase/access-token')]
    for p in paths:
        if os.path.exists(p):
            return open(p).read().strip()
    raise SystemExit('no supabase access-token found (~/.supabase/access-token)')


def supabase_sql(query, ref):
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{ref}/database/query',
        data=json.dumps({'query': query}).encode(),
        headers={
            'Authorization': f'Bearer {get_token()}',
            'Content-Type': 'application/json',
            # Cloudflare 403 error 1010 blocks python-urllib's default UA
            'User-Agent': 'supabase-cli/2.30.4',
        })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('query', help='SQL to run (single statement or DDL batch)')
    ap.add_argument('--ref', default=os.environ.get('SUPABASE_PROJECT_REF', DEFAULT_REF))
    args = ap.parse_args()
    try:
        print(json.dumps(supabase_sql(args.query, args.ref), indent=2, default=str))
    except urllib.error.HTTPError as e:
        print(f'HTTP {e.code}: {e.read().decode()[:500]}', file=sys.stderr)
        sys.exit(1)
