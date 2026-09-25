// Writes functions/catalog.json from the game's own tables
// (serverEconomyCatalog() in index.html), so the server charges and pays
// exactly what the Shop and Challenges show. Run after changing any price,
// reward or challenge:  node tools/export-catalog.js
// Needs Playwright (npm i -g playwright) and the Firebase compat SDK /
// canvas-confetti in SH_VIDEO_DEPS (see CLAUDE.md → Promo videos), or it
// fetches them from the CDN.
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const deps = process.env.SH_VIDEO_DEPS;
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'game.local') {
      const file = path.join(ROOT, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
      return fs.existsSync(file) ? route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.html') ? 'text/html' : undefined }) : route.fulfill({ status: 404, body: '' });
    }
    const fb = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
    if (fb && deps) return route.fulfill({ body: fs.readFileSync(path.join(deps, 'node_modules/firebase', fb[1])), contentType: 'text/javascript' });
    if (u.pathname.includes('canvas-confetti') && deps) return route.fulfill({ body: fs.readFileSync(path.join(deps, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
    if (fb || u.pathname.includes('canvas-confetti')) return route.continue();
    return route.abort();
  });
  await page.goto('https://game.local/index.html');
  await page.waitForFunction(() => typeof serverEconomyCatalog === 'function');
  const catalog = await page.evaluate(() => serverEconomyCatalog());
  fs.writeFileSync(path.join(ROOT, 'functions/catalog.json'), JSON.stringify(catalog, null, 1) + '\n');
  console.log(`functions/catalog.json: ${Object.keys(catalog.items).length} items, ${Object.keys(catalog.earned).length} earned pictures`);
  await browser.close();
})();
