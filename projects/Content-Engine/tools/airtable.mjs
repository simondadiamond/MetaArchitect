/**
 * Airtable utility module for The Meta Architect content pipeline.
 * Import this in any script instead of rewriting the boilerplate.
 *
 * Usage:
 *   import { getRecords, getAllRecords, patchRecord, createRecord } from './lib/airtable.mjs';
 */

import { config } from 'dotenv';
config({ quiet: true });

const headers = {
  "Authorization": `Bearer ${process.env.AIRTABLE_PAT}`,
  "Content-Type": "application/json"
};

export const BASE = process.env.AIRTABLE_BASE_ID;

export const TABLES = {
  IDEAS:      process.env.AIRTABLE_TABLE_IDEAS,
  POSTS:      process.env.AIRTABLE_TABLE_POSTS,
  HOOKS:      process.env.AIRTABLE_TABLE_HOOKS,
  FRAMEWORKS: process.env.AIRTABLE_TABLE_FRAMEWORKS,
  SNIPPETS:   process.env.AIRTABLE_TABLE_SNIPPETS,
  LOGS:       process.env.AIRTABLE_TABLE_LOGS,
  BRAND:      process.env.AIRTABLE_TABLE_BRAND,
};

/** GET — list with optional filter + sort */
export async function getRecords(tableId, formula = null, sort = []) {
  const params = new URLSearchParams();
  if (formula) params.append("filterByFormula", formula);
  sort.forEach((s, i) => {
    params.append(`sort[${i}][field]`, s.field);
    params.append(`sort[${i}][direction]`, s.direction || "asc");
  });
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}?${params}`, { headers });
  const data = await res.json();
  if (data.error) throw new Error(`Airtable [getRecords]: ${JSON.stringify(data.error)}`);
  return data.records || [];
}

/** GET — paginated (use for large tables) */
export async function getAllRecords(tableId, formula = null) {
  let records = [], offset;
  do {
    const params = new URLSearchParams();
    if (formula) params.append("filterByFormula", formula);
    if (offset) params.append("offset", offset);
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}?${params}`, { headers });
    const data = await res.json();
    if (data.error) throw new Error(`Airtable [getAllRecords]: ${JSON.stringify(data.error)}`);
    records = records.concat(data.records || []);
    offset = data.offset;
  } while (offset);
  return records;
}

/** GET — single record by ID */
export async function getRecord(tableId, recordId) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`, { headers });
  const data = await res.json();
  if (data.error) throw new Error(`Airtable [getRecord]: ${JSON.stringify(data.error)}`);
  return data;
}

/** PATCH — update fields on an existing record */
export async function patchRecord(tableId, recordId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`,
    { method: "PATCH", headers, body: JSON.stringify({ fields }) }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Airtable [patchRecord]: ${JSON.stringify(data.error)}`);
  return data;
}

/** DELETE — remove a record */
export async function deleteRecord(tableId, recordId) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}/${recordId}`,
    { method: "DELETE", headers }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Airtable [deleteRecord]: ${JSON.stringify(data.error)}`);
  return data;
}

/** POST — create a new record */
export async function createRecord(tableId, fields) {
  const res = await fetch(
    `https://api.airtable.com/v0/${BASE}/${tableId}`,
    { method: "POST", headers, body: JSON.stringify({ fields }) }
  );
  const data = await res.json();
  if (data.error) throw new Error(`Airtable [createRecord]: ${JSON.stringify(data.error)}`);
  return data;
}
