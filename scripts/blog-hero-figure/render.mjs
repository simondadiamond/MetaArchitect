#!/usr/bin/env node
// Render a hero-figure SVG to a 2:1 PNG (@2x) with brand fonts baked in.
// Usage: node scripts/blog-hero-figure/render.mjs <figure.svg> <out.png>
import { chromium } from "playwright-core";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const [svgPath, outPath] = process.argv.slice(2);
if (!svgPath || !outPath) {
  console.error("usage: render.mjs <figure.svg> <out.png>");
  process.exit(1);
}

const cache = join(homedir(), ".cache/ms-playwright");
const chromiumDir = readdirSync(cache).find((d) => d.startsWith("chromium-"));
if (!chromiumDir) {
  console.error("no chromium in ~/.cache/ms-playwright — run: npx playwright install chromium");
  process.exit(1);
}

const browser = await chromium.launch({
  executablePath: join(cache, chromiumDir, "chrome-linux64/chrome"),
});
const page = await browser.newPage({
  viewport: { width: 1360, height: 680 },
  deviceScaleFactor: 2,
});
await page.setContent(
  `<!doctype html><html><head>
  <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500;600&family=Merriweather:wght@700&display=swap" rel="stylesheet">
  </head><body style="margin:0;background:#0F0F0F">${readFileSync(svgPath, "utf8")}</body></html>`,
  { waitUntil: "networkidle" }
);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
await page.screenshot({ path: outPath });
await browser.close();
console.log("rendered", outPath);
