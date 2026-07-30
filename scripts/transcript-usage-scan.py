#!/usr/bin/env python3
# transcript-usage-scan.py — scan recent Claude Code transcripts (~/.claude/projects/*/*.jsonl)
# for skill/plugin/MCP/slash-command usage, hook durations, and permission denials.
# Feeds /doctor-style context-diet and estate audits: "which extensions cost context but never get used".
# Usage: python3 scripts/transcript-usage-scan.py [N]   (N = most-recent transcripts to scan, default 400)
# Born 2026-07-29 (context-diet session).
import sys
LOOKBACK = int(sys.argv[1]) if len(sys.argv) > 1 else 400
import json, glob, os, collections, datetime

files = glob.glob(os.path.expanduser('~/.claude/projects/*/*.jsonl'))
files = [f for f in files if os.path.isfile(f)]
files.sort(key=lambda f: os.path.getmtime(f), reverse=True)
files = files[:LOOKBACK]
if not files:
    print("NO TRANSCRIPTS"); raise SystemExit

mtimes = [os.path.getmtime(f) for f in files]
print("WINDOW: %d sessions, %s .. %s" % (len(files),
    datetime.datetime.fromtimestamp(min(mtimes)).date(),
    datetime.datetime.fromtimestamp(max(mtimes)).date()))

tool_counts = collections.Counter()
mcp_counts = collections.Counter()
skill_counts = collections.Counter()
slash_counts = collections.Counter()
agent_types = collections.Counter()
hook_stats = collections.defaultdict(list)  # (hookName,event) -> durations
hook_timeouts = collections.Counter()
denials = collections.Counter()  # (key, kind)
tooluse_index = {}  # id -> (name, input-command-ish)
pending_lookup = []  # (tool_use_id, kind)

import re
cmdname_re = re.compile(r'<command-name>(/[^<]{1,80})</command-name>')

for f in files:
    try:
        fh = open(f, encoding='utf-8', errors='replace')
    except OSError:
        continue
    for line in fh:
        try:
            obj = json.loads(line)
        except Exception:
            continue
        t = obj.get('type')
        if t == 'assistant':
            msg = obj.get('message') or {}
            for c in (msg.get('content') or []):
                if isinstance(c, dict) and c.get('type') == 'tool_use':
                    name = c.get('name','')
                    tool_counts[name] += 1
                    inp = c.get('input') or {}
                    if name.startswith('mcp__'):
                        parts = name.split('__')
                        if len(parts) >= 2:
                            mcp_counts[parts[1]] += 1
                    elif name == 'Skill':
                        skill_counts[str(inp.get('skill',''))[:60]] += 1
                    elif name in ('Agent','Task'):
                        agent_types[str(inp.get('subagent_type','(default)'))[:60]] += 1
                    key = name
                    if name == 'Bash':
                        cmd = str(inp.get('command',''))
                        toks = cmd.split()
                        key = 'Bash:' + ' '.join(toks[:2])[:60] if toks else 'Bash:'
                    tooluse_index[c.get('id')] = key
        elif t == 'user':
            kind = obj.get('toolDenialKind')
            msg = obj.get('message') or {}
            content = msg.get('content')
            if isinstance(content, str) and '<command-name>' in content:
                m = cmdname_re.search(content)
                if m: slash_counts[m.group(1)] += 1
            ids = []
            texts = []
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, dict):
                        if c.get('type') == 'tool_result':
                            ids.append(c.get('tool_use_id'))
                            tc = c.get('content')
                            if isinstance(tc, str): texts.append((c.get('tool_use_id'), tc, c.get('is_error')))
                            elif isinstance(tc, list):
                                for tcc in tc:
                                    if isinstance(tcc, dict) and tcc.get('type')=='text':
                                        texts.append((c.get('tool_use_id'), tcc.get('text',''), c.get('is_error')))
                        elif c.get('type') == 'text' and '<command-name>' in str(c.get('text','')):
                            m = cmdname_re.search(c.get('text',''))
                            if m: slash_counts[m.group(1)] += 1
            if kind and kind not in ('interrupted','cancelled'):
                for i in ids:
                    denials[(tooluse_index.get(i,'?unknown'), kind)] += 1
            elif kind is None:
                for (i, txt, iserr) in texts:
                    if iserr and txt:
                        if ("The user doesn't want to proceed with this tool use" in txt
                            or txt.startswith('Permission to use') or txt.startswith('Permission for this')):
                            k = tooluse_index.get(i,'?unknown')
                            if not k.startswith('mcp__'):
                                denials[(k,'text-fallback')] += 1
        elif t == 'attachment':
            a = obj.get('attachment') or {}
            at = a.get('type','')
            if at.startswith('hook_'):
                keyh = (a.get('hookName','?'), a.get('hookEvent','?'), at)
                d = a.get('durationMs')
                if at == 'hook_cancelled':
                    if a.get('timedOut'):
                        hook_timeouts[(a.get('hookName','?'), a.get('hookEvent','?'))] += 1
                        if d is not None: hook_stats[keyh[:2]].append(d)
                elif d is not None:
                    hook_stats[keyh[:2]].append(d)
    fh.close()

print("\n=== MCP server calls (normalized) ===")
for k,v in mcp_counts.most_common(): print(f"{v}\t{k}")
print("\n=== Skill tool invocations ===")
for k,v in skill_counts.most_common(): print(f"{v}\t{k}")
print("\n=== Slash commands ===")
for k,v in slash_counts.most_common(30): print(f"{v}\t{k}")
print("\n=== Agent subagent types ===")
for k,v in agent_types.most_common(20): print(f"{v}\t{k}")
print("\n=== Hook durations (name,event): n / median / p95 / max ms ===")
import statistics
for k, ds in sorted(hook_stats.items(), key=lambda kv: -max(kv[1])):
    ds2 = sorted(ds)
    med = statistics.median(ds2)
    p95 = ds2[int(len(ds2)*0.95)-1] if len(ds2)>1 else ds2[-1]
    print(f"{k[0]} @ {k[1]}: n={len(ds2)} med={med:.0f} p95={p95:.0f} max={ds2[-1]:.0f}")
print("\n=== Hook timeouts ===")
for k,v in hook_timeouts.most_common(): print(f"{v}\t{k}")
print("\n=== Denials (pattern, kind) ===")
for (k,kind),v in sorted(denials.items(), key=lambda kv:-kv[1])[:40]: print(f"{v}\t{kind}\t{k}")
