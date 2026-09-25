// Two real clients (signed in, real Ranked matchmaking) play full Ranked
// games against the emulators, picking random legal moves (plus snaps,
// Bonus Draws and idle turns so the opponent's timeout auto-play runs).
// The auditRankedRoom trigger checks every write: honest games must give
// no findings, and each scripted cheat must be caught.
//   start the emulators (see CLAUDE.md), then
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules \
//     node tools/ranked-audit-games.js <games> [idleChance] [cheat,cheat,...]
//   cheats (one per game, in order): dump | crown | push
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT;
const NS = 'shithead-pro-default-rtdb';
const GAMES = Number(process.argv[2] || 2), IDLE = Number(process.argv[3] || 0), CHEATS = (process.argv[4] || '').split(',').filter(Boolean);
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
async function makeUser(email, pw) {
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw, returnSecureToken: true }) })).json();
  await fetch(`${AUTH}/projects/shithead-pro/accounts:update`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: r.localId, emailVerified: true }) });
  return r.localId;
}
const admin = async (p, method = 'GET', v, ns = NS) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner' }, body: v === undefined ? undefined : JSON.stringify(v) })).json();

(async () => {
  for (const ns of [NS, 'shithead-pro']) await admin('', 'DELETE', undefined, ns);
  await fetch(`http://127.0.0.1:9099/emulator/v1/projects/shithead-pro/accounts`, { method: 'DELETE' });
  const rules = fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8');
  await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules });
  const alice = await makeUser('alice@test.local', 'secret123');
  const bob = await makeUser('bob@test.local', 'secret123');
  await admin('', 'PATCH', { [`users/${alice}`]: { rating: 500, wins: 0, losses: 0, username: 'Alice' }, [`users/${bob}`]: { rating: 500, wins: 0, losses: 0, username: 'Bob' }, 'usernames/alice': alice, 'usernames/bob': bob });

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/const FIREBASE_APP_CHECK_SITE_KEY = '[^']*';/, "const FIREBASE_APP_CHECK_SITE_KEY = '';");
  html = html.replace('firebase.initializeApp(firebaseConfig);', `firebaseConfig.databaseURL = 'https://${NS}.firebaseio.com'; firebase.initializeApp(firebaseConfig); firebase.database().useEmulator('127.0.0.1', 9000); firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); firebase.app().functions('europe-west1').useEmulator('127.0.0.1', 5001);`);
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  const mk = async (email, name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    page.on('console', m => { const t = m.text(); if (/AUTO ERR/.test(t)) errs.push(t); });
    await page.route('**/*', async (route) => {
      const u = new URL(route.request().url());
      if (u.hostname === '127.0.0.1' && u.port !== '8765') { try { return route.fulfill({ response: await route.fetch() }); } catch (e) { return route.abort(); } }
      if (u.hostname === '127.0.0.1' && u.port === '8765') {
        if (u.pathname === '/index.html' || u.pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
        const local = path.join(ROOT, decodeURIComponent(u.pathname));
        const types = { '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.js': 'text/javascript', '.json': 'application/json' };
        if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: types[path.extname(local)] || 'application/octet-stream' });
        return route.fulfill({ status: 404, body: '' });
      }
      const m = u.pathname.match(/firebasejs\/[\d.]+\/(firebase-[a-z-]+\.js)$/);
      if (m) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/firebase', m[1])), contentType: 'text/javascript' });
      if (u.pathname.includes('canvas-confetti')) return route.fulfill({ body: fs.readFileSync(path.join(S, 'node_modules/canvas-confetti/dist/confetti.browser.js')), contentType: 'text/javascript' });
      return route.abort();
    });
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.evaluate(() => { localStorage.setItem('shithead_seen_version', 'x'); localStorage.setItem('shithead_reduce_motion', '1'); });
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.waitForTimeout(1500);
    const res = await page.evaluate(({ email }) => firebase.auth().signInWithEmailAndPassword(email, 'secret123').then(u => 'ok ' + u.user.uid, e => 'ERR ' + e.code + ' ' + e.message), { email });
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && currentUser.uid, null, { timeout: 20000 }).catch(async () => { console.log('signin', res, errs.slice(0, 3), await page.evaluate(() => [typeof currentUser, firebase.auth().currentUser && firebase.auth().currentUser.uid])); throw new Error('no sign-in'); });
    await page.waitForTimeout(1500);
    await page.evaluate((name) => { document.getElementById('playerNameInput').value = name; document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(el => { if (el.id && el.id !== 'lobbyScreen') el.classList.add('hidden'); }); }, name);
    return { page, ctx, errs };
  };
  const AUTOPLAY = (idle) => {
    window.__turnKey = null; window.__idleThis = false; window.__lastAct = 0;
    setInterval(() => {
      try {
        if (state.phase === 'SWAP') { const me = state.players.find(p => p.id === state.localPlayerId); if (me && !me.isReady && me.hand?.length === 3) finishLocalSwap(); return; }
        if (state.phase !== 'PLAY' || state.blindRevealing || state.burnResolving) return;
        const me = state.players.find(p => p.id === state.localPlayerId);
        if (!me || me.hasFinished) return;
        if (state.pendingFollowUp && state.pendingFollowUp.playerId === me.id) { resolveFollowUpPlay(Math.random() < 0.7); return; }
        const cur = state.players[state.currentTurnIndex];
        if (!cur) return;
        if (cur.id !== me.id) { if (Math.random() < 0.3) executeLocalSnapBurn(); return; }
        const key = `${state.stateVersion}|${state.turnDeadline}`;
        if (key !== window.__turnKey) { window.__turnKey = key; window.__idleThis = Math.random() < idle; }
        if (window.__idleThis) return;
        if (Date.now() - window.__lastAct < 500) return;
        window.__lastAct = Date.now();
        const hand = me.hand || [], up = me.faceUp || [], down = me.faceDown || [];
        if (!hand.length && !up.length && down.length && !(state.drawPile || []).length) { executePlayCards(me.id, [down[0]], true); return; }
        const moves = getLegalMovesForPlayer(me, state.discardPile, state.activeConstraint);
        if (!moves.length) { executePickup(me.id); return; }
        const byRank = {};
        moves.forEach(c => { const k = c.isJoker ? 'JOKER' : c.rank; (byRank[k] = byRank[k] || []).push(c); });
        const ranks = Object.keys(byRank);
        const r = ranks[Math.floor(Math.random() * ranks.length)];
        executePlayCards(me.id, r === 'JOKER' ? [byRank[r][0]] : byRank[r]);
      } catch (e) { console.log('AUTO ERR', e.message); }
    }, 200);
  };
  let totalHard = 0, totalSoft = 0;
  for (let g = 1; g <= GAMES; g++) {
    await admin('matchmaking', 'PUT', null);
    await admin('rooms', 'PUT', null); // or the accounts rejoin the last finished room
    for (const u of [alice, bob]) await admin(`users/${u}/lastRankedOpponent`, 'DELETE'); // matchmaking avoids an instant rematch
    const A = await mk('alice@test.local', 'Alice'), B = await mk('bob@test.local', 'Bob');
    await A.page.evaluate(() => findRankedMatch());
    await A.page.waitForTimeout(1500);
    await B.page.evaluate(() => findRankedMatch());
    await A.page.waitForFunction(() => state.phase === 'SWAP' || state.phase === 'PLAY', null, { timeout: 30000 }).catch(() => {});
    const code = await A.page.evaluate(() => state.roomCode);
    for (const p of [A.page, B.page]) await p.evaluate(AUTOPLAY, IDLE);
    const t0 = Date.now();
    let phase = '';
    const cheat = CHEATS[g - 1];
    if (cheat) {
      await A.page.waitForFunction(() => state.phase === 'PLAY' && (state.stateVersion || 0) > 12, null, { timeout: 60000 }).catch(() => {});
      const did = await A.page.evaluate((kind) => {
        const me = state.players.find(p => p.id === state.localPlayerId);
        const other = state.players.find(p => p.id !== state.localPlayerId);
        if (kind === 'dump') { state.discardPile.push(...me.hand); me.hand = []; }
        if (kind === 'crown') { me.hasFinished = true; me.finishRank = 1; other.hasFinished = true; other.finishRank = 2; state.phase = 'FINISHED'; }
        if (kind === 'push') { other.hand.push(...state.discardPile, state.drawPile.pop()); state.discardPile = []; }
        syncFirebaseGameState();
        return kind;
      }, cheat);
      console.log(`   cheat played: ${did}`);
    }
    while (Date.now() - t0 < 360000) {
      await A.page.waitForTimeout(2000);
      phase = await A.page.evaluate(() => state.phase).catch(() => '?');
      if (phase === 'FINISHED' || phase === 'LOBBY') break;
    }
    await A.page.waitForTimeout(2500);
    const room = await admin(`rooms/${code}`);
    let audit = null;
    for (const ns of [NS, 'shithead-pro']) { const a = await admin(`rankedAudit/${code}`, 'GET', undefined, ns); if (a) audit = a; }
    const matches = audit ? Object.values(audit) : [];
    const findings = matches.flatMap(m => Object.values(m.findings || {}));
    const hard = findings.filter(f => f.hard), soft = findings.filter(f => !f.hard);
    totalHard += hard.length; totalSoft += soft.length;
    const seenCount = matches.reduce((n, m) => n + Object.keys(m.seen || {}).length, 0);
    console.log(`game ${g}: room ${code} phase ${phase} in ${Math.round((Date.now() - t0) / 1000)}s, v${room && room.stateVersion}, audit seen ${seenCount} writers, hard ${hard.length}, soft ${soft.length}`);
    if (hard.length && process.env.AUDIT_DEBUG_OUT) fs.writeFileSync(`${process.env.AUDIT_DEBUG_OUT}-${code}.json`, JSON.stringify(matches, null, 1));
    [...hard, ...soft].slice(0, 12).forEach(f => console.log('   ', f.hard ? 'HARD' : 'soft', f.kind, f.seat || '', f.detail, 'by', (f.by || '').slice(0, 6), 'v' + f.stateVersion));
    if (A.errs.length || B.errs.length) console.log('   page errors:', [...A.errs, ...B.errs].slice(0, 4));
    await A.ctx.close(); await B.ctx.close();
  }
  console.log(`\nTOTAL hard ${totalHard}, soft ${totalSoft}`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
