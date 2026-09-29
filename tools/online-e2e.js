// Online end to end: real signed-in clients play Play Friends and Ranked
// games against the emulators, with the things that go wrong on phones:
// an app closing mid-match (disconnect) and coming back (rejoin), a player
// leaving mid-match, a reload in Ranked. Every game must finish, no card may
// be duplicated in the room, and no page may throw.
//   start the emulators (see CLAUDE.md) with functions/.env.local holding
//   SH_TEST_DB_NS=shithead-pro-default-rtdb, then
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules \
//     node tools/online-e2e.js [scenario,scenario,...]
//   scenarios: casual, casual-disconnect, casual-leave-bot, casual-leave-2p,
//              ranked-reload, ranked-leave (default: all)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT;
const NS = 'shithead-pro-default-rtdb';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const ALL = ['casual', 'casual-disconnect', 'casual-leave-bot', 'casual-leave-2p', 'ranked-reload', 'ranked-leave'];
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const admin = async (p, method = 'GET', v, ns = NS) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner' }, body: v === undefined ? undefined : JSON.stringify(v) })).json();
async function makeUser(email) {
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }) })).json();
  await fetch(`${AUTH}/projects/shithead-pro/accounts:update`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: r.localId, emailVerified: true }) });
  return r.localId;
}
const vals = (x) => (x ? (Array.isArray(x) ? x : Object.values(x)).filter(Boolean) : []);
function roomProblems(room) {
  if (!room || !room.players) return [];
  const seen = new Map(), out = [];
  const add = (c, where) => { if (!c || !c.id) return; if (seen.has(c.id)) out.push(`duplicate ${c.id} in ${seen.get(c.id)} and ${where}`); seen.set(c.id, where); };
  vals(room.players).forEach(p => ['hand', 'faceUp', 'faceDown'].forEach(z => vals(p[z]).forEach(c => add(c, `${p.name}.${z}`))));
  vals(room.discardPile).forEach(c => add(c, 'pile'));
  vals(room.drawPile).forEach(c => add(c, 'deck'));
  return out;
}

const AUTOPLAY = () => {
  if (window.__autoplay) return;
  window.__autoplay = true; window.__lastAct = 0;
  setInterval(() => {
    try {
      if (window.__stopped) return;
      document.getElementById('rejoinYesBtn')?.offsetParent && document.getElementById('rejoinYesBtn').click();
      if (state.phase === 'SWAP') { const me = state.players.find(p => p.id === state.localPlayerId); if (me && !me.isReady && me.hand?.length === 3) finishLocalSwap(); return; }
      if (state.phase !== 'PLAY' || state.blindRevealing || state.burnResolving) return;
      const me = state.players.find(p => p.id === state.localPlayerId);
      if (!me || me.hasFinished) return;
      if (state.pendingFollowUp && state.pendingFollowUp.playerId === me.id) { resolveFollowUpPlay(Math.random() < 0.7); return; }
      const cur = state.players[state.currentTurnIndex];
      if (!cur || cur.id !== me.id) return;
      if (Date.now() - window.__lastAct < 400) return;
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

(async () => {
  for (const ns of [NS, 'shithead-pro']) await admin('', 'DELETE', undefined, ns);
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/shithead-pro/accounts', { method: 'DELETE' });
  await fetch(`http://127.0.0.1:9000/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: fs.readFileSync(path.join(ROOT, 'database.rules.json'), 'utf8') });
  const uid = { alice: await makeUser('alice@test.local'), bob: await makeUser('bob@test.local') };
  const resetUsers = () => admin('', 'PATCH', {
    [`users/${uid.alice}`]: { rating: 500, wins: 0, losses: 0, username: 'Alice' }, [`users/${uid.bob}`]: { rating: 500, wins: 0, losses: 0, username: 'Bob' },
    'usernames/alice': uid.alice, 'usernames/bob': uid.bob
  });
  await resetUsers();

  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  html = html.replace(/const FIREBASE_APP_CHECK_SITE_KEY = '[^']*';/, "const FIREBASE_APP_CHECK_SITE_KEY = '';");
  html = html.replace('firebase.initializeApp(firebaseConfig);', `firebaseConfig.databaseURL = 'https://${NS}.firebaseio.com'; firebase.initializeApp(firebaseConfig); firebase.database().useEmulator('127.0.0.1', 9000); firebase.auth().useEmulator('http://127.0.0.1:9099', { disableWarnings: true }); firebase.app().functions('europe-west1').useEmulator('127.0.0.1', 5001);`);
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });

  const errors = [];
  const newContext = async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.route('**/*', async (route) => {
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
    await ctx.addInitScript(() => { try { localStorage.setItem('shithead_seen_version', 'x'); localStorage.setItem('shithead_reduce_motion', '1'); localStorage.setItem('shithead_whats_new', '0'); } catch (e) {} });
    return ctx;
  };
  const openPage = async (ctx, who, signIn) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(`${who}: ${e.message}`));
    page.on('console', m => { const t = m.text(); if (/AUTO ERR/.test(t)) errors.push(`${who}: ${t}`); });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.waitForTimeout(1500);
    if (signIn) await page.evaluate((email) => firebase.auth().signInWithEmailAndPassword(email, 'secret123'), `${who.toLowerCase()}@test.local`);
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && currentUser.uid, null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    await page.evaluate((name) => { document.getElementById('playerNameInput').value = name; }, who);
    return page;
  };
  const player = async (who) => { const ctx = await newContext(); const page = await openPage(ctx, who, true); return { who, ctx, page }; };
  const clearPopups = (page) => page.evaluate(() => document.querySelectorAll('.fixed.inset-0:not(.hidden)').forEach(el => { if (el.id && !['lobbyScreen', 'rejoinModal'].includes(el.id)) el.classList.add('hidden'); })).catch(() => {});

  // Watches the room until it finishes (or times out), checking cards.
  const watchRoom = async (code, ms, onTick) => {
    const t0 = Date.now(); const problems = new Set(); let room = null;
    while (Date.now() - t0 < ms) {
      room = await admin(`rooms/${code}`);
      roomProblems(room).forEach(p => problems.add(p));
      if (onTick) await onTick(room, Date.now() - t0);
      if (!room || room.phase === 'FINISHED' || room.phase === 'LOBBY') break;
      await new Promise(r => setTimeout(r, 1500));
    }
    return { room, problems: [...problems], secs: Math.round((Date.now() - t0) / 1000) };
  };
  const hostCasual = async (A, B, bots) => {
    await admin('rooms', 'PUT', null);
    await A.page.evaluate(() => initHostRoom());
    await A.page.waitForFunction(() => state.roomCode, null, { timeout: 20000 });
    const code = await A.page.evaluate(() => state.roomCode);
    await A.page.waitForTimeout(1200);
    for (let i = 0; i < bots; i++) { await A.page.evaluate(() => addBotToMultiplayerLobby()); await A.page.waitForTimeout(500); }
    await B.page.evaluate((c) => { document.getElementById('joinCodeInput').value = c; joinMultiRoom(); }, code);
    await A.page.waitForFunction((n) => state.players.length === n, 2 + bots, { timeout: 20000 });
    await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => startMultiplayerGame());
    for (const p of [A.page, B.page]) await p.evaluate(AUTOPLAY);
    await A.page.waitForFunction(() => state.phase === 'PLAY', null, { timeout: 60000 });
    return code;
  };
  const rankedMatch = async (A, B) => {
    await admin('rooms', 'PUT', null); await admin('matchmaking', 'PUT', null);
    for (const u of Object.values(uid)) await admin(`users/${u}/lastRankedOpponent`, 'DELETE');
    await A.page.evaluate(() => findRankedMatch());
    await A.page.waitForTimeout(1500);
    await B.page.evaluate(() => findRankedMatch());
    await A.page.waitForFunction(() => state.phase === 'SWAP' || state.phase === 'PLAY', null, { timeout: 40000 });
    const code = await A.page.evaluate(() => state.roomCode);
    for (const p of [A.page, B.page]) await p.evaluate(AUTOPLAY);
    await A.page.waitForFunction(() => state.phase === 'PLAY', null, { timeout: 60000 });
    return code;
  };
  const midMatch = (page, v = 14) => page.waitForFunction((v) => state.phase === 'PLAY' && (state.stateVersion || 0) > v, v, { timeout: 90000 });
  const results = [];
  const report = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };

  const scenarios = {
    async casual() {
      const A = await player('Alice'), B = await player('Bob');
      const code = await hostCasual(A, B, 0);
      const w = await watchRoom(code, 300000);
      report('casual', w.room?.phase === 'FINISHED' && !w.problems.length, `${w.room?.phase} in ${w.secs}s ${w.problems.slice(0, 3).join('; ')}`);
      await A.ctx.close(); await B.ctx.close();
    },
    // Bob's app closes mid-match: a bot stand-in keeps his seat moving;
    // he reopens the game, rejoins from the prompt and gets his seat back.
    async 'casual-disconnect'() {
      const A = await player('Alice'), B = await player('Bob');
      const code = await hostCasual(A, B, 1);
      await midMatch(A.page);
      await B.page.close();
      let standIn = false;
      // A stand-in bot gets a new seat id and "Bob (Bot)" as its name.
      const w1 = await watchRoom(code, 90000, async (room) => {
        const seat = vals(room?.players).find(p => /^Bob\b/.test(p.name || ''));
        if (seat && seat.isBot) standIn = true;
        if (standIn) throw 'stop';
      }).catch(e => (e === 'stop' ? { room: null, problems: [] } : Promise.reject(e)));
      const phaseNow = (await admin(`rooms/${code}/phase`));
      if (phaseNow === 'FINISHED') { report('casual-disconnect', true, 'match finished before a stand-in was needed'); await A.ctx.close(); await B.ctx.close(); return; }
      report('casual-disconnect: a bot keeps the seat', standIn, standIn ? 'stand-in took over' : 'seat never handed over');
      const B2 = await openPage(B.ctx, 'Bob', false);
      await B2.evaluate(AUTOPLAY);
      await B2.waitForFunction((code) => state.roomCode === code && state.phase === 'PLAY', code, { timeout: 30000 }).catch(() => {});
      const back = await B2.evaluate(() => { const me = state.players.find(p => p.id === state.localPlayerId); return { code: state.roomCode, name: me?.name, bot: !!me?.isBot }; });
      report('casual-disconnect: rejoins his own seat', back.code === code && back.name === 'Bob' && !back.bot, JSON.stringify(back));
      const w = await watchRoom(code, 300000);
      report('casual-disconnect: match finishes', w.room?.phase === 'FINISHED' && !w1.problems.length && !w.problems.length, `${w.room?.phase} ${w.problems.slice(0, 3).join('; ')}`);
      await A.ctx.close(); await B.ctx.close();
    },
    async 'casual-leave-bot'() {
      const A = await player('Alice'), B = await player('Bob');
      const code = await hostCasual(A, B, 1);
      await midMatch(A.page);
      await B.page.evaluate(() => { window.__stopped = true; leaveMultiplayerRoom(); });
      await new Promise(r => setTimeout(r, 4000));
      const seat = vals((await admin(`rooms/${code}`)).players).find(p => /^Bob\b/.test(p.name || ''));
      report('casual-leave-bot: a bot takes the seat', !!seat && !!seat.isBot, JSON.stringify(seat && { name: seat.name, isBot: seat.isBot }));
      const w = await watchRoom(code, 300000);
      report('casual-leave-bot: match finishes', w.room?.phase === 'FINISHED' && !w.problems.length, `${w.room?.phase} in ${w.secs}s`);
      await A.ctx.close(); await B.ctx.close();
    },
    async 'casual-leave-2p'() {
      const A = await player('Alice'), B = await player('Bob');
      const code = await hostCasual(A, B, 0);
      await midMatch(A.page);
      await B.page.evaluate(() => { window.__stopped = true; leaveMultiplayerRoom(); });
      await A.page.waitForFunction(() => state.phase === 'LOBBY' || state.phase === 'FINISHED', null, { timeout: 20000 }).catch(() => {});
      const aPhase = await A.page.evaluate(() => state.phase);
      report('casual-leave-2p: back to the lobby', aPhase === 'LOBBY' || aPhase === 'FINISHED', `Alice sees ${aPhase}, room ${await admin(`rooms/${code}/phase`)}`);
      await A.ctx.close(); await B.ctx.close();
    },
    async 'ranked-reload'() {
      await resetUsers();
      const A = await player('Alice'), B = await player('Bob');
      const code = await rankedMatch(A, B);
      await midMatch(A.page);
      await B.page.reload();
      await B.page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && state.roomCode, null, { timeout: 30000 }).catch(() => {});
      await B.page.evaluate(AUTOPLAY);
      const back = await B.page.evaluate(() => ({ code: state.roomCode, phase: state.phase }));
      report('ranked-reload: rejoins on its own', back.code === code, JSON.stringify(back));
      const w = await watchRoom(code, 360000);
      await new Promise(r => setTimeout(r, 6000));
      const ra = await admin(`users/${uid.alice}/rating`), rb = await admin(`users/${uid.bob}/rating`);
      report('ranked-reload: finishes and is scored', w.room?.phase === 'FINISHED' && !w.problems.length && (ra !== 500 || rb !== 500), `${w.room?.phase} ratings ${ra}/${rb}`);
      await A.ctx.close(); await B.ctx.close();
    },
    async 'ranked-leave'() {
      await resetUsers();
      const A = await player('Alice'), B = await player('Bob');
      const code = await rankedMatch(A, B);
      await midMatch(A.page);
      await B.page.evaluate(() => { window.__stopped = true; leaveMultiplayerRoom(); });
      const w = await watchRoom(code, 200000);
      await new Promise(r => setTimeout(r, 6000));
      const bob = vals(w.room?.players).find(p => p.uid === uid.bob);
      const ra = await admin(`users/${uid.alice}/rating`), rb = await admin(`users/${uid.bob}/rating`);
      report('ranked-leave: the leaver loses, match scored', w.room?.phase === 'FINISHED' && bob?.finishRank === 2 && ra > 500 && rb < 500, `${w.room?.phase} Bob #${bob?.finishRank} ratings ${ra}/${rb}`);
      await A.ctx.close(); await B.ctx.close();
    }
  };
  for (const name of ALL) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    try { await scenarios[name](); } catch (e) { report(name, false, `threw ${String(e).slice(0, 300)}`); }
  }
  await browser.close();
  const uniq = [...new Set(errors)];
  if (uniq.length) console.log('page errors:\n  ' + uniq.slice(0, 15).join('\n  '));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed, ${uniq.length} distinct page errors`);
  process.exit(failed || uniq.length ? 1 : 0);
})();
