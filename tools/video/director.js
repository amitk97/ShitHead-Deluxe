// Shared harness for the promo / how-to-play recordings.
// Records the promo / how-to-play videos from the real game.
// Run: node tools/video/promo.js | howto.js | bats.js   (needs Playwright + Chromium)
// Output: WebM (VP8) at 780×1688 next to the scripts.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs'), path = require('path');
// Where the Firebase compat SDK (node_modules/firebase/*.js) and
// canvas-confetti are installed locally: `npm i firebase@10.12.0 canvas-confetti@1.6.0`
// in that folder. The recording never touches the internet.
const S = process.env.SH_VIDEO_DEPS || path.join(__dirname, 'deps');

// In-page helpers: captions, highlight boxes, title/end cards, scripted moves.
const PAGE_LIB = `
(() => {
  const css = document.createElement('style');
  css.textContent = \`
    #vCap { position:fixed; left:14px; right:14px; z-index:100000; pointer-events:none; text-align:center;
      font-family:'Outfit','Plus Jakarta Sans',sans-serif; font-weight:900; color:#fff; font-size:23px; line-height:1.15;
      padding:14px 16px; border-radius:20px; background:rgba(2,6,23,.82); border:2px solid #f59e0b;
      box-shadow:0 10px 40px rgba(0,0,0,.6), 0 0 22px rgba(245,158,11,.35); opacity:0; transform:translateY(-14px) scale(.96);
      transition:opacity .28s ease, transform .35s cubic-bezier(.2,1.4,.4,1); }
    #vCap.show { opacity:1; transform:none; }
    #vCap small { display:block; font-size:16px; font-weight:700; color:#fde68a; margin-top:6px; }
    .vHi { position:fixed; z-index:99990; pointer-events:none; border:4px solid #fbbf24; border-radius:18px;
      box-shadow:0 0 0 9999px rgba(2,6,23,.55), 0 0 24px rgba(251,191,36,.9); transition:all .35s ease; }
    #vCard { position:fixed; inset:0; z-index:100001; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
      background:radial-gradient(circle at 50% 38%, rgb(76,29,149), rgb(2,6,23) 65%); opacity:0; transition:opacity .45s ease; text-align:center; padding:24px; }
    #vCard.show { opacity:1; }
    body.v-rec #victoryOverlay, body.v-rec #headerDiamondBtn, body.v-rec #finalStandingsBanner ~ #matchEndButtonRow { display:none !important; }
    #vCard .logo { font-family:'Cinzel',Georgia,serif; font-weight:900; font-size:64px; line-height:1;
      background:linear-gradient(180deg,#f87171,#b91c1c 45%,#5e0a0a); -webkit-background-clip:text; -webkit-text-fill-color:transparent;
      filter:drop-shadow(0 2px 0 #fde047) drop-shadow(0 4px 10px rgba(0,0,0,.9)); }
    #vCard .deluxe { font-family:'Cinzel',Georgia,serif; font-weight:800; letter-spacing:.5em; color:#fbbf24; font-size:20px; margin-top:-6px; }
    #vCard .line { font-family:'Outfit',sans-serif; font-weight:900; color:#fff; font-size:28px; line-height:1.2; }
    #vCard .sub { font-family:'Outfit',sans-serif; font-weight:700; color:#fde68a; font-size:19px; }
    #vCard .url { font-family:'Outfit',sans-serif; font-weight:900; color:#34d399; font-size:26px; padding:10px 18px; border:3px solid #34d399; border-radius:16px; background:rgba(6,78,59,.45); }
    #vCard .big { font-size:88px; line-height:1; }
  \`;
  document.head.appendChild(css);
  const cap = document.createElement('div'); cap.id = 'vCap'; document.body.appendChild(cap);
  window.V = {
    // Captions sit in the band above your hand (over the idle Play button),
    // clear of the seats, the pile and your cards.
    caption(html, pos = 'play') {
      const btn = document.getElementById('playSelectedBtn');
      const r = btn && btn.offsetParent ? btn.getBoundingClientRect() : null;
      cap.style.bottom = ''; cap.style.top = '';
      if (pos === 'play') cap.style.top = r ? Math.max(60, r.top + r.height / 2 - 34) + 'px' : '60%';
      else if (pos === 'top') cap.style.top = '60px';
      else if (pos === 'bottom') cap.style.bottom = '26px';
      cap.innerHTML = html; cap.classList.add('show'); },
    hideCaption() { cap.classList.remove('show'); },
    highlight(selectors, pad = 6) {
      V.clearHighlights();
      [].concat(selectors).forEach((sel) => { const el = document.querySelector(sel); if (!el) return; const r = el.getBoundingClientRect();
        const b = document.createElement('div'); b.className = 'vHi'; Object.assign(b.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' }); document.body.appendChild(b); });
    },
    clearHighlights() { document.querySelectorAll('.vHi').forEach(e => e.remove()); },
    card(html) { let c = document.getElementById('vCard'); if (!c) { c = document.createElement('div'); c.id = 'vCard'; document.body.appendChild(c); }
      c.innerHTML = html; requestAnimationFrame(() => c.classList.add('show')); },
    hideCard() { const c = document.getElementById('vCard'); if (c) c.classList.remove('show'); },
    c: (rank, suit) => ({ id: 'v_' + rank + suit + '_' + Math.random().toString(36).slice(2, 7), rank, suit, isJoker: rank === 'JOKER' }),
    me: () => state.players.find(p => p.id === state.localPlayerId),
    bot: (i) => state.players.filter(p => p.id !== state.localPlayerId)[i],
    // Set everyone's cards and the pile, then redraw.
    scene({ hand, faceUp, faceDown, pile, bots = [], draw, turn = 0 }) {
      const me = V.me();
      if (hand) me.hand = hand.map(([r, s]) => V.c(r, s));
      if (faceUp) me.faceUp = faceUp.map(([r, s], i) => ({ ...V.c(r, s), slotIndex: i }));
      if (faceDown) me.faceDown = faceDown.map(([r, s], i) => ({ ...V.c(r, s), slotIndex: i }));
      bots.forEach((b, i) => { const p = V.bot(i); if (!p) return;
        if (b.hand) p.hand = b.hand.map(([r, s]) => V.c(r, s));
        if (b.faceUp) p.faceUp = b.faceUp.map(([r, s], j) => ({ ...V.c(r, s), slotIndex: j }));
        if (b.faceDown) p.faceDown = b.faceDown.map(([r, s], j) => ({ ...V.c(r, s), slotIndex: j })); });
      if (pile) state.discardPile = pile.map(([r, s]) => V.c(r, s));
      if (draw !== undefined) state.drawPile = draw.map(([r, s]) => V.c(r, s));
      state.activeConstraint = null; state.baseOverrideCard = null; state.currentTurnIndex = turn;
      state.selectedPlayCardIds = [];
      render();
    },
    turnTo(id) { state.currentTurnIndex = state.players.findIndex(p => p.id === id); render(); },
    // Select cards in the hand (visibly), then press Play.
    select(ranks) { const me = V.me(); state.selectedPlayCardIds = []; [].concat(ranks).forEach(r => { const c = me.hand.find(x => x.rank === r && !state.selectedPlayCardIds.includes(x.id)); if (c) state.selectedPlayCardIds.push(c.id); }); render(); },
    playSelected() { document.getElementById('playSelectedBtn')?.click(); },
    botPlay(i, ranks) { const p = V.bot(i); V.turnTo(p.id); const cards = [].concat(ranks).map(r => p.hand.find(c => c.rank === r)).filter(Boolean); executePlayCards(p.id, cards); },
    // Your move: the cards lift as selected, then land on the pile.
    mePlay(ranks) { const me = V.me(); V.turnTo(me.id); V.select(ranks);
      const cards = state.selectedPlayCardIds.map(id => me.hand.find(c => c.id === id)).filter(Boolean);
      setTimeout(() => { state.selectedPlayCardIds = []; executePlayCards(me.id, cards); }, 650); },
    meBlind(slot = 0) { const me = V.me(); V.turnTo(me.id); const c = me.faceDown[slot]; executePlayCards(me.id, [c], true); }
  };
})();
`;

async function openGame(outVideo) {
  const browser = await chromium.launch();
  // The game runs in a 390×844 frame (a phone screen) drawn 2× on a
  // 780×1688 page, so the capture is full resolution and still phone layout.
  const ctx = await browser.newContext({ viewport: { width: 780, height: 1688 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const t0 = Date.now();
  // Full-resolution capture: the browser's screencast at device pixels
  // (Playwright's recordVideo only captures CSS pixels, a quarter-size frame).
  const frames = [];
  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    frames.push({ t: metadata.timestamp, data: Buffer.from(data, 'base64') });
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  const gameRoot = path.resolve(__dirname, '../..');
  await page.route('**/*', (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === 'game.local' && u.pathname === '/__host.html') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body style="margin:0;background:#020617;overflow:hidden"><iframe id="g" src="/" style="border:0;width:390px;height:844px;transform:scale(2);transform-origin:0 0;display:block"></iframe></body></html>' });
    }
    if (u.hostname === 'game.local') {
      let p = decodeURIComponent(u.pathname); if (p === '/') p = '/index.html';
      const local = path.join(gameRoot, p);
      const types = { '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png' };
      if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: types[path.extname(local)] || 'application/octet-stream' });
      return route.fulfill({ status: 404, body: 'not found' });
    }
    const m = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
    if (m) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/firebase', m[1])), contentType: 'text/javascript' });
    if (u.pathname.includes('canvas-confetti')) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
    if (u.hostname.includes('fonts.g')) return route.continue().catch(() => route.abort());
    return route.abort();
  });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  // Fresh visitor with the Halloween look, no pop-ups.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('shithead_equipped_cosmetics', JSON.stringify({ tableTheme: 'table-halloween', cardBack: 'back-halloween', frame: 'default', burnEffect: 'burn-halloween', victoryEffect: 'victory-halloween', emotes: 'emotes-halloween', avatar: 'default' }));
      localStorage.setItem('shithead_seen_version', 'v999');
      localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true }));
      localStorage.setItem('shithead_player_name', 'You');
    } catch (e) {}
  });
  await page.goto('https://game.local/__host.html');
  await page.waitForTimeout(2000);
  const frame = page.frames().find(f => f !== page.mainFrame());
  await frame.waitForFunction(() => typeof startSinglePlayerGame === 'function');
  await frame.addScriptTag({ content: PAGE_LIB });
  await frame.evaluate(() => {
    ['whatsNewModal', 'rejoinModal', 'dailyRewardModal'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
    Object.assign(equippedCosmetics, { tableTheme: 'table-halloween', cardBack: 'back-halloween', frame: 'default', burnEffect: 'burn-halloween', victoryEffect: 'victory-halloween', emotes: 'emotes-halloween' });
    applyEquippedCosmetics();
    // Every move happens on cue: bots never take their own turns.
    window.triggerNextTurn = () => { render(); };
    window.scheduleMatchSummary = () => {};
    window.schedulePileInspectHint = () => {};
    document.body.classList.add('v-rec');
  });
  // Scripts talk to the game frame; waits and screenshots use the page.
  const gamePage = {
    evaluate: (fn, arg) => frame.evaluate(fn, arg),
    waitForFunction: (fn, arg, opts) => frame.waitForFunction(fn, arg, opts),
    waitForTimeout: (ms) => page.waitForTimeout(ms),
    screenshot: (opts) => page.screenshot(opts)
  };
  const g = { browser, ctx, page: gamePage, realPage: page, errors, t0, marks: {}, frames, cdp };
  g.mark = (name) => { g.marks[name] = Date.now() / 1000; };
  return g;
}

async function finish(g, outVideo, { fps = 30, from = 'start', lead = 0.45 } = {}) {
  await g.realPage.waitForTimeout(300);
  await g.cdp.send('Page.stopScreencast').catch(() => {});
  await g.ctx.close(); await g.browser.close();
  // Constant-rate timeline from the (irregular) screencast frames.
  const frames = g.frames.sort((a, b) => a.t - b.t);
  const start = (g.marks[from] || frames[0].t) + lead, end = frames[frames.length - 1].t;
  const { spawn } = require('child_process');
  const ffErr = [];
  const ff = spawn(process.env.FFMPEG || '/opt/pw-browsers/ffmpeg-1011/ffmpeg-linux', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-c:v', 'libvpx', '-b:v', '4M', '-crf', '6', '-qmin', '2', '-qmax', '24', '-an', outVideo]);
  ff.stderr.on('data', d => ffErr.push(String(d)));
  ff.stdin.on('error', () => {});
  let closed = false, closeCode = null;
  const done = new Promise((res) => ff.on('close', (code) => { closed = true; closeCode = code; res(); }));
  let i = 0, count = 0;
  for (let t = start; t <= end && !closed; t += 1 / fps) {
    while (i + 1 < frames.length && frames[i + 1].t <= t) i++;
    if (!ff.stdin.write(frames[i].data)) await Promise.race([new Promise(r => ff.stdin.once('drain', r)), done]);
    count++;
  }
  ff.stdin.end();
  await done;
  if (closeCode !== 0) throw new Error('ffmpeg failed ' + closeCode + ': ' + ffErr.join(''));
  console.log(`frames captured ${frames.length}, written ${count} (${(count / fps).toFixed(1)}s)`);
  if (g.errors.length) console.log('page errors:', g.errors.slice(0, 5));
}

const wait = (page, ms) => page.waitForTimeout(ms);
module.exports = { openGame, finish, wait };
