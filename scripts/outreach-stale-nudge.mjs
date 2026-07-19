#!/usr/bin/env node
// outreach-stale-nudge.mjs — daily digest of stale prospects, no LLM.
// Reads the unified CRM (public.clients, migration 0023 — public.leads is
// frozen). Stale = status in (new, conversation) and coalesce(last_touch_at,
// created_at) older than 5 days. Sends ONE ntfy digest (names + next_actions);
// silent when nothing is stale. Scheduled daily 08:00 via Command Center
// (kind: script).
//
// Env comes from the command-center .env — read at point of use, never
// committed. --dry-run prints instead of pinging.

import { readFileSync } from "node:fs";

const CC_ENV = "/home/diamond/projects/MetaArchitect/projects/command-center/.env";
const STALE_DAYS = 5;
const dryRun = process.argv.includes("--dry-run");

function envFrom(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

const env = envFrom(CC_ENV);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const owner = env.COMMAND_CENTER_OWNER_ID;
const ntfyUrl = env.NTFY_URL;
if (!url || !key || !owner) {
  console.error("outreach-stale-nudge: missing Supabase env in command-center .env");
  process.exit(1);
}

const res = await fetch(
  `${url}/rest/v1/clients?select=name,status,next_action,last_touch_at,created_at` +
    `&owner_id=eq.${owner}&status=in.(new,conversation)&order=created_at.asc`,
  { headers: { apikey: key, Authorization: `Bearer ${key}` } },
);
if (!res.ok) {
  console.error(`outreach-stale-nudge: clients query failed (${res.status})`);
  process.exit(1);
}
const leads = await res.json();

const cutoff = Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000;
const stale = leads.filter(
  (l) => new Date(l.last_touch_at ?? l.created_at).getTime() < cutoff,
);

if (stale.length === 0) {
  console.log("outreach-stale-nudge: nothing stale");
  process.exit(0);
}

const lines = stale.map(
  (l) => `${l.name} (${l.status}): ${l.next_action ?? "no next action set"}`,
);
const body = lines.join("\n");
const title = `${stale.length} stale prospect${stale.length > 1 ? "s" : ""} (>${STALE_DAYS}d untouched)`;

if (dryRun) {
  console.log(`[dry-run] ${title}\n${body}`);
  process.exit(0);
}

if (!ntfyUrl) {
  console.error("outreach-stale-nudge: NTFY_URL missing; digest not sent");
  console.log(`${title}\n${body}`);
  process.exit(1);
}
const ping = await fetch(ntfyUrl, {
  method: "POST",
  headers: { Title: title },
  body,
  signal: AbortSignal.timeout(10_000),
});
console.log(`outreach-stale-nudge: sent digest (${stale.length} prospects, ntfy ${ping.status})`);
