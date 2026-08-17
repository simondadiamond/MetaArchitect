#!/usr/bin/env node
/* Render-and-measure harness for the site drafts.  Never reason about the
 * page — render it.  Emits element crops at 3x for the contrast audit
 * (audit-contrast.py reads them), plus overflow / reduced-motion / network
 * results as JSON.
 *
 *   node verify.js fusion.html
 */
const { chromium } = require('/home/diamond/projects/MetaArchitect/node_modules/playwright-core');
const fs = require('fs');
const path = require('path');

const file = path.resolve(process.argv[2] || 'fusion.html');
const OUT = '/tmp/audit';
const URL = 'file://' + file;
const WIDTHS = [360, 390, 768, 1024, 1180, 1440];

/* every text role on the page, with the ground it is expected to paint on */
/* sampled before the nav is hidden for the crop pass (see below) */
const NAV_ROLES = ['.mark', '.nav-links a:not(.btn)', '.nav .btn-sm'];

const ROLES = [
  'h1', '.lede', '.hero-cta .btn', '.quiet', '.figure-note',
  '.status .eyebrow', '.status p',
  '.eyebrow', '.h2', '.sub',
  '.claim b', '.claim span', '.claims-tail',
  '.proc-item .meta', '.proc-item h3', '.proc-item p.body',
  '.card h3', '.card .figure', '.card .figure-alt', '.card .body',
  '.card .list li', '.card .promise', '.card .promise b', '.card .terms',
  '.card .btn-line',
  '.card--mass h3', '.card--mass .figure', '.card--mass .figure-alt',
  '.card--mass .body', '.card--mass .list li', '.card--mass .promise',
  '.card--mass .promise b', '.card--mass .terms', '.card--mass .btn-paper',
  '.after-cards', '.after-cards b', '.rate-note',
  '.card .kicker', '.card--mass .kicker', '.sheet .n', '.sheet .t',
  '.sheet-copy p', '.quote', '.signature', '.prose', '.pull', '.fine a',
  '.practice-copy p', '.note h3', '.note .body', '.sig',
  '.place .eyebrow', '.place p',
  '.qa summary', '.qa .ans p',
  '.close h2', '.close p.body', '.close .btn', '.fine',
  '.foot .mark', '.foot p', '.foot a',
  '#d1 .lbl', '#d1 .hub-t', '#d2 .lbl', '#d2 .rail-t', '#d2 .pill-t', '#d2 .out',
];

/* Kill transitions before forcing the end state, so every crop is of a finished
 * paint.  Waiting a fixed 400ms against a 700ms reveal sampled elements
 * mid-fade and reported a 1.15:1 "failure" on text that computes at 5.61:1 —
 * the audit has to sample the pixel, but it has to sample the FINAL pixel. */
const settle = async (page) => {
  await page.addStyleTag({ content: '*,*::before,*::after{transition:none!important;animation:none!important}' });
  await page.evaluate(() => {
    document.querySelectorAll('.reveal').forEach((e) => e.classList.add('in'));
    document.querySelectorAll('.diagram').forEach((e) => e.classList.add('go'));
    document.querySelectorAll('details').forEach((d) => (d.open = true));
  });
  await page.waitForTimeout(250);
};

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const report = { file, overflow: [], external: [], reducedMotion: {}, crops: [] };

  /* ---- 1. horizontal overflow at every width ---- */
  for (const w of WIDTHS) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(URL, { waitUntil: 'load' });
    await settle(page);
    const m = await page.evaluate(() => {
      const d = document.documentElement;
      let worst = null;
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return;
        const over = r.right - d.clientWidth;
        if (over > 1 && (!worst || over > worst.over)) {
          worst = {
            over: Math.round(over),
            sel: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string'
              ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
          };
        }
      });
      return { scrollW: d.scrollWidth, clientW: d.clientWidth, worst };
    });
    report.overflow.push({ width: w, ...m, pass: m.scrollW <= m.clientW });
    await page.close();
  }

  /* ---- 2. element crops at 3x for the pixel contrast audit ---- */
  for (const [label, width] of [['wide', 1440], ['phone', 390]]) {
    const page = await browser.newPage({
      viewport: { width, height: 1000 },
      deviceScaleFactor: 3,
    });
    await page.goto(URL, { waitUntil: 'load' });
    await settle(page);
    /* The sticky nav is translucent with a backdrop blur.  element.screenshot()
     * scrolls its target into view, and anything that lands under the nav gets
     * captured through it — which reported "PHASE I" as umber at 10% on paper
     * (1.15:1) when it is umber at 100% on band (5.61:1).  Take the nav out for
     * the crop pass; its own roles are sampled from the top of the page anyway. */
    for (const sel of NAV_ROLES) {
      const els = await page.$$(sel);
      for (let i = 0; i < Math.min(els.length, 2); i++) {
        const box = await els[i].boundingBox();
        if (!box || box.width < 2 || box.height < 2) continue;
        const name = `${label}_nav_${sel.replace(/[^a-z0-9]+/gi, '_')}_${i}.png`;
        try { await els[i].screenshot({ path: path.join(OUT, name) }); } catch (e) { continue; }
        report.crops.push({ sel, i, label, width, file: name });
      }
    }
    await page.addStyleTag({ content: '.nav{display:none!important}' });
    for (const sel of ROLES) {
      const els = await page.$$(sel);
      for (let i = 0; i < Math.min(els.length, 2); i++) {
        const box = await els[i].boundingBox();
        if (!box || box.width < 2 || box.height < 2) continue;
        const name = `${label}_${sel.replace(/[^a-z0-9]+/gi, '_')}_${i}.png`;
        try {
          await els[i].screenshot({ path: path.join(OUT, name) });
        } catch (e) { continue; }
        report.crops.push({ sel, i, label, width, file: name });
      }
    }
    await page.close();
  }

  /* ---- 3. reduced motion: everything painted, nothing waiting on scroll ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL, { waitUntil: 'load' });
    await page.waitForTimeout(500);
    report.reducedMotion = await page.evaluate(() => {
      const reveals = [...document.querySelectorAll('.reveal')];
      const hidden = reveals.filter((e) => +getComputedStyle(e).opacity < 0.99).length;
      const paths = [...document.querySelectorAll('.diagram .draw path')];
      const undrawn = paths.filter((p) => {
        const o = getComputedStyle(p).strokeDashoffset;
        return o !== '0px' && o !== '0' && o !== 'none';
      }).length;
      return { reveals: reveals.length, hidden, paths: paths.length, undrawn };
    });
    await page.close();
  }

  /* ---- 4. self-contained: nothing fetched off the machine ---- */
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith('file://') && !u.startsWith('data:')) report.external.push(u);
    });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await settle(page);
    await page.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    overflow: report.overflow,
    reducedMotion: report.reducedMotion,
    external: report.external.length,
    crops: report.crops.length,
  }, null, 2));
})();
