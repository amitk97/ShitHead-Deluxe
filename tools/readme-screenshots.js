// Retakes the README screenshots (docs/screenshots/*.png) from the real game
// at 390x844 @2x. Run for every README refresh (every 15 versions from v150):
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules node tools/readme-screenshots.js
// SH_VIDEO_DEPS needs firebase@10.12.0 + canvas-confetti@1.6.0 installed (same as tools/video).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT, file = path.join(ROOT, 'index.html');
(async () => {
  const browser = await chromium.launch(process.env.SH_CHROMIUM ? {executablePath:process.env.SH_CHROMIUM,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']} : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const fonts = Object.fromEntries([['Outfit','outfit'],['Cinzel','cinzel'],['Plus Jakarta Sans','plus-jakarta-sans']].map(([name,id])=>[id,{name,file:path.join(S,'node_modules/@fontsource-variable',id,'files',`${id}-latin-wght-normal.woff2`)}]));
  let html=fs.readFileSync(file,'utf8');
  if(Object.values(fonts).every(f=>fs.existsSync(f.file)))html=html.replace(/@import url\('https:\/\/fonts.googleapis.com[^']+'\);/,Object.entries(fonts).map(([id,f])=>`@font-face{font-family:'${f.name}';font-style:normal;font-weight:100 900;src:url('/test-font-${id}.woff2') format('woff2');}`).join('\n'));
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'game.local') {
      const font=u.pathname.match(/^\/test-font-(.+)\.woff2$/);if(font&&fonts[font[1]])return route.fulfill({body:fs.readFileSync(fonts[font[1]].file),contentType:'font/woff2'});
      if (u.pathname === '/index.html' || u.pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
      const local = path.join(path.dirname(file), decodeURIComponent(u.pathname));
      const types = { '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.js': 'text/javascript' };
      if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: types[path.extname(local)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    const m = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
    if (m) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/firebase', m[1])), contentType: 'text/javascript' });
    if (u.pathname.includes('canvas-confetti')) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
    return route.abort();
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  const log = [];
  const OUT = path.join(ROOT, 'docs/screenshots');
  const snap = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  await page.goto('https://game.local/index.html');
  await page.evaluate(() => { localStorage.setItem('shithead_whats_new', '0'); localStorage.setItem('shithead_seen_version', 'x'); localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true })); localStorage.setItem('shithead_player_name', 'Amit'); });
  await page.goto('https://game.local/index.html');
  await page.waitForTimeout(2500);
  await page.fill('#playerNameInput', 'Amit');
  await page.evaluate(() => { document.querySelector('.bot-count-btn[data-bots="2"]').click(); });
  await page.waitForTimeout(400);
  await snap('home');
  await page.click('#startSingleBtn');
  await page.waitForFunction(() => state.phase === 'SWAP', null, { timeout: 15000 });
  await page.waitForTimeout(3500);
  await snap('swap');
  await page.click('#finishSwapBtn');
  await page.waitForTimeout(1500);
  // let the table play out a little: play the lowest legal card a few times
  for (let i = 0; i < 6; i++) {
    await page.waitForFunction(() => state.players[state.currentTurnIndex]?.id === state.localPlayerId || state.phase !== 'PLAY', null, { timeout: 20000 }).catch(() => {});
    if (await page.evaluate(() => state.phase !== 'PLAY')) break;
    const played = await page.evaluate(() => {
      const me = state.players.find(p => p.id === state.localPlayerId);
      const legal = (me.hand || []).filter(c => isPlayLegal(c, state.discardPile, state.activeConstraint) && c.rank !== '10' && !c.isJoker)
        .sort((a, b) => handSortValue(a) - handSortValue(b));
      if (!legal.length) return false;
      state.selectedPlayCardIds = [legal[0].id]; render();
      document.getElementById('playSelectedBtn').click();
      return true;
    });
    if (!played) break;
    await page.waitForTimeout(2200);
  }
  await page.waitForFunction(() => state.players[state.currentTurnIndex]?.id === state.localPlayerId, null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await snap('table');
  await page.click('#cardRefBtn');
  await page.waitForTimeout(900);
  await snap('card-powers');
  await page.click('#cardRefBtn');
  await page.waitForTimeout(400);
  await page.click('#matrixRefBtn');
  await page.waitForTimeout(900);
  await snap('play-matrix');
  await page.click('#matrixRefCloseBtn');
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.getElementById('rulesModal').classList.remove('hidden');
    const t = [...document.querySelectorAll('#rulesModal .accordion-toggle')].find(b => /Swap Phase/.test(b.textContent));
    t && t.click();
  });
  await page.waitForTimeout(900);
  await snap('guide-swap');
  log.push('ok');
  console.log(log.join('\n')); console.log('errors', errors.slice(0, 5));
  await browser.close();
})();
