/**
 * db.mjs — CLI wrapper for supabase.mjs
 *
 * Usage:
 *   node tools/db.mjs get    <table> [filter_json] [fields_json]
 *   node tools/db.mjs getone <table> <id>          [fields_json]
 *   node tools/db.mjs patch  <table> <id>          <fields_json>
 *   node tools/db.mjs create <table> <fields_json> [return_fields_json]
 *   node tools/db.mjs delete <table> <id>
 *   node tools/db.mjs log    <payload_json>
 *   node tools/db.mjs setlock   <table> <id> <lock_field> [status]
 *   node tools/db.mjs clearlock <table> <id> <lock_field> [status]
 *
 * Pass '-' as any JSON argument to read from stdin instead.
 * Output is JSON on stdout. Errors exit with code 1.
 */

import { readFileSync } from 'node:fs';
import {
  getRecords, getRecord, createRecord, patchRecord, deleteRecord,
  logEntry, setLock, clearLock, TABLES,
} from './supabase.mjs';

function readStdin() {
  return readFileSync('/dev/stdin', 'utf8').trim();
}

function arg(val) {
  if (val === undefined || val === null) return undefined;
  const s = val === '-' ? readStdin() : val;
  try { return JSON.parse(s); } catch { return s; }
}

const [,, cmd, ...rest] = process.argv;

async function run() {
  switch (cmd) {
    case 'get': {
      const [table, filterRaw, fieldsRaw] = rest;
      const filter = arg(filterRaw) ?? null;
      const fields = arg(fieldsRaw) ?? null;
      const opts = fields ? { fields } : {};
      return await getRecords(table, filter, opts);
    }
    case 'getone': {
      const [table, id, fieldsRaw] = rest;
      const fields = arg(fieldsRaw) ?? null;
      return await getRecord(table, id, fields);
    }
    case 'patch': {
      const [table, id, fieldsRaw] = rest;
      return await patchRecord(table, id, arg(fieldsRaw));
    }
    case 'create': {
      const [table, fieldsRaw, returnRaw] = rest;
      const returnFields = arg(returnRaw) ?? ['id'];
      return await createRecord(table, arg(fieldsRaw), returnFields);
    }
    case 'delete': {
      const [table, id] = rest;
      return await deleteRecord(table, id);
    }
    case 'log': {
      const payload = arg(rest[0]);
      return await logEntry({ timestamp: new Date().toISOString(), ...payload });
    }
    case 'setlock': {
      const [table, id, lockField, status = null] = rest;
      return await setLock(table, id, lockField, status);
    }
    case 'clearlock': {
      const [table, id, lockField, status = null] = rest;
      return await clearLock(table, id, lockField, status);
    }
    default:
      throw new Error(`Unknown command: ${cmd}. Use get|getone|patch|create|delete|log|setlock|clearlock`);
  }
}

run().then(result => {
  if (result !== undefined) console.log(JSON.stringify(result, null, 2));
}).catch(err => {
  console.error(err.message);
  process.exit(1);
});
