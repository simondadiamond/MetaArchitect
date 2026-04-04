import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, 'state-readiness-checklist.html');
const pdfPath  = join(__dirname, 'state-readiness-checklist.pdf');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });

// Wait for Google Fonts to load
await new Promise(r => setTimeout(r, 2000));

await page.pdf({
  path: pdfPath,
  width: '816px',
  height: '1056px',
  printBackground: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 },
});

await browser.close();
console.log(`PDF saved: ${pdfPath}`);
