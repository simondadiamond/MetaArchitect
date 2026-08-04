#!/usr/bin/env node
// Goals table CRUD: create via Command Center API, append/patch via Supabase REST.
// Replaces repeated inline python/urllib heredocs for goal create/append/patch.
//
// Usage:
//   node scripts/goals-crud.mjs create '<json payload>'
//   node scripts/goals-crud.mjs append <goal-id> "<line to append to description>"
//   node scripts/goals-crud.mjs patch <goal-id> '<json patch fields>'
//   node scripts/goals-crud.mjs get <goal-id>
//
// Env: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (source
// projects/command-center/.env first). CC_API defaults to the live Command Center.

const CC_API = process.env.CC_API || "http://100.105.85.5:3737/api/goals";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — source projects/command-center/.env first");
    process.exit(1);
  }
}

async function create(payloadJson) {
  const payload = JSON.parse(payloadJson);
  const res = await fetch(CC_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok || !body.ok) {
    console.error("create failed:", JSON.stringify(body));
    process.exit(1);
  }
  console.log(body.goal.id);
}

async function get(id) {
  requireSupabaseEnv();
  const hdr = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.${id}&select=*`, { headers: hdr });
  const rows = await res.json();
  if (!rows.length) {
    console.error("no goal found for id", id);
    process.exit(1);
  }
  console.log(JSON.stringify(rows[0], null, 2));
}

async function append(id, line) {
  requireSupabaseEnv();
  const hdr = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.${id}&select=description`, { headers: hdr });
  const rows = await getRes.json();
  if (!rows.length) {
    console.error("no goal found for id", id);
    process.exit(1);
  }
  const newDesc = (rows[0].description || "") + "\n\n" + line;
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...hdr, Prefer: "return=minimal" },
    body: JSON.stringify({ description: newDesc }),
  });
  if (!patchRes.ok) {
    console.error("append failed:", await patchRes.text());
    process.exit(1);
  }
  console.log("appended to", id);
}

async function patch(id, fieldsJson) {
  requireSupabaseEnv();
  const fields = JSON.parse(fieldsJson);
  const hdr = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.${id}`, {
    method: "PATCH",
    headers: hdr,
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    console.error("patch failed:", await res.text());
    process.exit(1);
  }
  console.log("patched", id);
}

const [, , cmd, ...args] = process.argv;
switch (cmd) {
  case "create":
    await create(args[0]);
    break;
  case "get":
    await get(args[0]);
    break;
  case "append":
    await append(args[0], args[1]);
    break;
  case "patch":
    await patch(args[0], args[1]);
    break;
  default:
    console.error("usage: goals-crud.mjs <create|get|append|patch> ...");
    process.exit(1);
}
