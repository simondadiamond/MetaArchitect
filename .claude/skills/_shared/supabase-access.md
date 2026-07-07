# Supabase Access — Management API (canonical)

> **Single canonical copy — both teardown skills point here.** Any future fix to this snippet
> happens in THIS file, never in a skill-local fork. The popebot copies of these skills are
> known-unpatched (lessons.md 2026-07-02): edits here do NOT propagate to popebot's container
> volumes — sync those separately if they ever matter again.

Use the Supabase Management API with the access token that persists across workspace volumes.
It can run arbitrary SQL against any schema — no PostgREST exposure required.

**Canonical facts:**

- Project ref: `ashwrqkoijzvakdmfskj`
- Token lookup order: popebot workspace volumes first, then Sterling local (`~/.supabase/access-token`)
- `User-Agent: supabase-cli/2.30.4` — Cloudflare 403 error 1010 blocks python-urllib's default UA (lessons.md 2026-07-02)

```python
import json, glob, os, urllib.request

def _get_token():
    """Token lookup order: popebot workspace volumes first, then Sterling local."""
    paths = glob.glob('/app/data/workspaces/*/.supabase/access-token')  # popebot volumes — dead on Sterling, harmless glob (skill-lint: documented fallback)
    paths += [os.path.expanduser('~/.supabase/access-token')]
    for p in paths:
        if os.path.exists(p):
            return open(p).read().strip()
    raise RuntimeError("No supabase access-token found")

TOKEN = _get_token()
REF   = 'ashwrqkoijzvakdmfskj'

def supabase_sql(query):
    url  = f'https://api.supabase.com/v1/projects/{REF}/database/query'
    body = json.dumps({'query': query}).encode()
    req  = urllib.request.Request(url, data=body, headers={
        'Authorization': f'Bearer {TOKEN}',
        'Content-Type':  'application/json',
        # Cloudflare 403 error 1010 blocks python-urllib's default UA (lessons.md 2026-07-02)
        'User-Agent':    'supabase-cli/2.30.4',
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())
```

**Response contract:** `[]` = DDL success. Array of dicts = SELECT/INSERT result rows.

**Escaping:** single-quote SQL string values with `.replace("'", "''")` — every caller defines
`def esc(v): return (str(v) if v is not None else '').replace("'", "''")`.

Save as `/tmp/teardown_db.py` and import, or inline.
