/**
 * carousel.mjs — LinkedIn carousel (PDF document post) builder.
 *
 * Fetches brand-styled 1080x1350 slide PNGs from the live simonparis.ca OG
 * routes and stitches them into a single PDF at 1080x1350 page size.
 *
 * CLI:
 *   node tools/carousel.mjs manifest.json out.pdf     # PDF (LinkedIn native document post, manual upload)
 *   node tools/carousel.mjs manifest.json out-dir/    # numbered PNGs (Postiz multi-image scheduling)
 *
 * Programmatic:
 *   import { buildCarousel, saveSlides } from './tools/carousel.mjs';
 *   const { pages, bytes, outPath } = await buildCarousel(manifest, 'out.pdf');
 *   const { files } = await saveSlides(manifest, 'out-dir');
 *
 * Manifest shape — an ordered array of slides:
 *   [
 *     { "slide": "cover",     "params": { "name": "...", "score": "6", "pillars": "11202", "k": "1", "total": "7" } },
 *     { "slide": "summary",   "params": { "title": "...", "lines": "a|b|c", ... } },
 *     { "slide": "pillar",    "params": { "pillar": "TOL", "pscore": "0", "heading": "...", "lines": "a|b", ... } },
 *     { "slide": "mechanism", "params": { "heading": "...", "body": "...", ... } },
 *     { "slide": "artifact",  "params": { "heading": "...", "lines": "a|b|c", ... } },
 *     { "slide": "outro",     "params": { "slug": "...", ... } }
 *   ]
 *
 * Route: https://simonparis.ca/api/og/teardown-slide?slide=<type>&<params>
 * Valid slide types: cover | summary | pillar | mechanism | artifact | outro
 *
 * STATE — E (Explicit): every fetched slide passes a validation gate
 * (HTTP 200, content-type image/png, non-empty body) before it is embedded.
 * Any failure throws, naming the slide index and type. No silent continue.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PDFDocument } from 'pdf-lib';

const BASE_URL = process.env.CAROUSEL_BASE_URL ?? 'https://simonparis.ca';
const SLIDE_ROUTE = '/api/og/teardown-slide';
const VALID_SLIDES = new Set(['cover', 'summary', 'pillar', 'mechanism', 'artifact', 'outro']);
const PAGE_W = 1080;
const PAGE_H = 1350;

/** Validate the manifest shape before any network call. Throws on the first problem. */
export function validateManifest(manifest) {
  if (!Array.isArray(manifest) || manifest.length === 0) {
    throw new Error('carousel: manifest must be a non-empty array of { slide, params } objects');
  }
  manifest.forEach((entry, i) => {
    if (!entry || typeof entry !== 'object') {
      throw new Error(`carousel: slide ${i + 1} is not an object`);
    }
    if (!VALID_SLIDES.has(entry.slide)) {
      throw new Error(`carousel: slide ${i + 1} has invalid type "${entry.slide}" (valid: ${[...VALID_SLIDES].join(', ')})`);
    }
    if (entry.params != null && typeof entry.params !== 'object') {
      throw new Error(`carousel: slide ${i + 1} (${entry.slide}) params must be an object`);
    }
  });
}

/** Build the route URL for one manifest entry. */
export function slideUrl(entry) {
  const url = new URL(SLIDE_ROUTE, BASE_URL);
  url.searchParams.set('slide', entry.slide);
  for (const [k, v] of Object.entries(entry.params ?? {})) {
    if (v != null) url.searchParams.set(k, String(v));
  }
  return url.toString();
}

/**
 * Fetch one slide PNG with the Explicit gate:
 * HTTP 200 + content-type image/png + non-empty body, or throw naming the slide.
 */
async function fetchSlide(entry, index) {
  const label = `slide ${index + 1} (${entry.slide})`;
  const url = slideUrl(entry);
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new Error(`carousel: ${label} — fetch failed: ${err.message} — ${url}`);
  }
  if (res.status !== 200) {
    const bodyText = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`carousel: ${label} — HTTP ${res.status}${bodyText ? `: ${bodyText}` : ''} — ${url}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('image/png')) {
    throw new Error(`carousel: ${label} — expected image/png, got "${contentType}" — ${url}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error(`carousel: ${label} — empty PNG body — ${url}`);
  }
  return bytes;
}

/**
 * Save the slides as numbered PNG files (01-cover.png, 02-summary.png, …) —
 * the format schedulers like Postiz accept as a LinkedIn multi-image post.
 * @param {Array<{slide: string, params?: object}>} manifest — ordered slides
 * @param {string} outDir — directory to write PNGs into (created if missing)
 * @returns {Promise<{pages: number, files: string[], urls: string[]}>}
 */
export async function saveSlides(manifest, outDir) {
  validateManifest(manifest);
  const absDir = resolve(outDir);
  await mkdir(absDir, { recursive: true });
  const files = [];
  const urls = [];
  for (let i = 0; i < manifest.length; i++) {
    const png = await fetchSlide(manifest[i], i);
    const file = resolve(absDir, `${String(i + 1).padStart(2, '0')}-${manifest[i].slide}.png`);
    await writeFile(file, png);
    files.push(file);
    urls.push(slideUrl(manifest[i]));
  }
  return { pages: manifest.length, files, urls };
}

/**
 * Build the carousel PDF.
 * @param {Array<{slide: string, params?: object}>} manifest — ordered slides
 * @param {string} outPath — where to write the PDF
 * @returns {Promise<{pages: number, bytes: number, outPath: string}>}
 */
export async function buildCarousel(manifest, outPath) {
  validateManifest(manifest);

  // Fetch sequentially so a failure names the earliest broken slide deterministically.
  const pngs = [];
  for (let i = 0; i < manifest.length; i++) {
    pngs.push(await fetchSlide(manifest[i], i));
  }

  const pdf = await PDFDocument.create();
  pdf.setTitle('STATE Teardown — The Meta Architect');
  pdf.setAuthor('Simon Paris');

  for (let i = 0; i < pngs.length; i++) {
    let image;
    try {
      image = await pdf.embedPng(pngs[i]);
    } catch (err) {
      throw new Error(`carousel: slide ${i + 1} (${manifest[i].slide}) — PNG embed failed: ${err.message}`);
    }
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    // Slides render at exactly 1080x1350; draw full-bleed regardless.
    page.drawImage(image, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });
  }

  const bytes = await pdf.save();
  const absOut = resolve(outPath);
  await mkdir(dirname(absOut), { recursive: true });
  await writeFile(absOut, bytes);
  return { pages: manifest.length, bytes: bytes.length, outPath: absOut };
}

// ---------------------------------------------------------------- CLI
const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isMain) {
  const [manifestPath, outPath] = process.argv.slice(2);
  if (!manifestPath || !outPath) {
    console.error('Usage: node tools/carousel.mjs <manifest.json> <out.pdf | out-dir/>');
    process.exit(1);
  }
  try {
    const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
    if (outPath.toLowerCase().endsWith('.pdf')) {
      const result = await buildCarousel(manifest, outPath);
      console.log(`✅ carousel: ${result.pages} pages, ${result.bytes} bytes → ${result.outPath}`);
    } else {
      const result = await saveSlides(manifest, outPath);
      console.log(`✅ carousel: ${result.pages} PNGs → \n${result.files.map((f) => `   ${f}`).join('\n')}`);
    }
  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}
