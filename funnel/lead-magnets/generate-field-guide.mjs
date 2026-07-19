import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const variant = process.argv[2] === 'fr' ? 'fr' : 'en';
const base = variant === 'fr' ? 'state-field-guide-fr' : 'state-field-guide';
const htmlPath = join(__dirname, `${base}.html`);
const pdfPath = join(__dirname, `${base}.pdf`);
const previewDir = join(__dirname, '.preview', variant);
mkdirSync(previewDir, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 816, height: 1200 });
await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

// Wait for Google Fonts to load
await new Promise((r) => setTimeout(r, 2000));

const pageHandles = await page.$$('.page');
console.log(`Found ${pageHandles.length} .page sections`);

for (let i = 0; i < pageHandles.length; i++) {
  const box = await pageHandles[i].boundingBox();
  const overflow = box.height > 1060 ? `*** OVERFLOW +${Math.round(box.height - 1056)}px ***` : 'OK';
  console.log(`page ${String(i + 1).padStart(2, '0')}: height=${Math.round(box.height)}px  ${overflow}`);
  await pageHandles[i].screenshot({ path: join(previewDir, `page-${String(i + 1).padStart(2, '0')}.png`) });
}

await page.pdf({
  path: pdfPath,
  printBackground: true,
  preferCSSPageSize: true,
});

await browser.close();
console.log(`PDF saved: ${pdfPath}`);
