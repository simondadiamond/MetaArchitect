const { chromium } = require('/home/diamond/projects/MetaArchitect/node_modules/playwright-core');
const path = require('path');
(async () => {
  const file = 'file://' + path.resolve(process.argv[2] || 'fusion.html');
  const b = await chromium.launch();
  for (const [name, w] of [['desk', 1440], ['phone', 390]]) {
    const p = await b.newPage({ viewport: { width: w, height: 1000 } });
    await p.goto(file, { waitUntil: 'load' });
    await p.evaluate(() => {
      document.querySelectorAll('.reveal').forEach(e => e.classList.add('in'));
      document.querySelectorAll('.diagram').forEach(e => e.classList.add('go'));
    });
    await p.waitForTimeout(500);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    console.log(name, w, 'x', h);
    await p.screenshot({ path: `/tmp/audit/shot_${name}_full.png`, fullPage: true });
    for (const [n, sel] of [['hero','.hero'],['problem','#problem'],['sprint','#sprint'],['pricing','#pricing'],['practice','#practice'],['questions','#questions'],['close','.close']]) {
      const el = await p.$(sel);
      if (el) await el.screenshot({ path: `/tmp/audit/shot_${name}_${n}.png` });
    }
    await p.close();
  }
  await b.close();
})();
