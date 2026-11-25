// Accessibility audit: runs axe-core (WCAG 2 A/AA + best practice) and a 24px target check on the home screen,
// the header pages and a table. AXE_DIR = folder with node_modules/axe-core. Same env as tools/play-store-screenshots.js.
// Retakes the README screenshots (docs/play-store/screenshots/*.png) from the real game
// at 360x640 @3x. Run before each Play Store listing update:
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules node tools/play-store-screenshots.js
// SH_VIDEO_DEPS needs firebase@10.12.0 + canvas-confetti@1.6.0 installed (same as tools/video).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT, file = path.join(ROOT, 'index.html');
(async () => {
  const browser = await chromium.launch(process.env.SH_CHROMIUM ? {executablePath:process.env.SH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']} : {});
  const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 1 });
  const fonts = Object.fromEntries([['Outfit','outfit'],['Cinzel','cinzel'],['Plus Jakarta Sans','plus-jakarta-sans']].map(([name,id])=>[id,{name,file:path.join(S,'node_modules/@fontsource-variable',id,'files',`${id}-latin-wght-normal.woff2`)}]));
  let html=fs.readFileSync(file,'utf8');
  if(Object.values(fonts).every(f=>fs.existsSync(f.file)))html=html.replace(/@import url\('https:\/\/fonts.googleapis.com[^']+'\);/,Object.entries(fonts).map(([id,f])=>`@font-face{font-family:'${f.name}';font-style:normal;font-weight:100 900;src:url('/test-font-${id}.woff2') format('woff2');}`).join('\n'));
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'game.local') {
      const font=u.pathname.match(/^\/test-font-(.+)\.woff2$/);if(font&&fonts[font[1]])return route.fulfill({body:fs.readFileSync(fonts[font[1]].file),contentType:'font/woff2'});
      if (u.pathname === '/index.html' || u.pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
      const local = path.join(path.dirname(file), decodeURIComponent(u.pathname));
      const types = { '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2' };
      if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: types[path.extname(local)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    const m = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
    if (m) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/firebase', m[1])), contentType: 'text/javascript' });
    if (u.pathname.includes('canvas-confetti')) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
    return route.abort();
  });
  const AXE = fs.readFileSync(path.join(process.env.AXE_DIR || ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
  await page.goto('https://game.local/index.html');
  await page.evaluate(() => { localStorage.setItem('shithead_whats_new', '0'); localStorage.setItem('shithead_seen_version', 'x'); localStorage.setItem('shithead_welcome_tour', '1'); });
  await page.goto('https://game.local/index.html');
  await page.waitForTimeout(2500);
  await page.addStyleTag({content: '#eventPopupModal,#seasonMailModal{display:none!important}'});
  const out = {};
  const run = async (name) => {
    await page.evaluate(AXE);
    const r = await page.evaluate(async () => {
      const res = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'], resultTypes: ['violations'] });
      const small = [...document.querySelectorAll('button,a[href],[role=button],input,select')].filter(e => { const b = e.getBoundingClientRect(); return b.width && b.height && e.offsetParent && (b.width < 24 || b.height < 24) && getComputedStyle(e).visibility !== 'hidden'; }).map(e => (e.id || e.className.toString().slice(0, 30) || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
      return { v: res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, ex: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' | ' + (n.any[0] && n.any[0].message || n.failureSummary || '').slice(0, 110)) })), small };
    });
    out[name] = r;
  };
  await run('home');
  for (const [name, sel] of [['settings', '#headerSettingsBtn'], ['guide', '#headerGuideBtn'], ['shop', '#headerShopBtn'], ['custom', '#headerCustomBtn'], ['profile', '#headerProfileBtn'], ['inbox', '#headerInboxBtn']]) {
    await page.evaluate(() => { if (window.resetHomeUI) resetHomeUI(); });
    await page.evaluate((s) => document.querySelector(s).click(), sel); await page.waitForTimeout(1200);
    await run(name);
  }
  await page.evaluate(() => { if (window.resetHomeUI) resetHomeUI(); });
  await page.click('.mc-card[data-mc-mode="cpu"] .mc-go'); await page.waitForTimeout(1200);
  await page.click('#startSingleBtn'); await page.waitForFunction(() => state.phase === 'SWAP', null, { timeout: 15000 }); await page.waitForTimeout(2500);
  await run('table');
  fs.writeFileSync(process.env.A11Y_OUT || '/tmp/a11y.json', JSON.stringify(out, null, 1));
  for (const [k, r] of Object.entries(out)) { console.log('## ' + k + ': ' + r.v.length + ' rules, ' + r.small.length + ' small targets'); r.v.forEach(v => console.log('  ' + v.impact + ' ' + v.id + ' x' + v.n + ' ' + v.ex[0])); }
  await browser.close();
})();
