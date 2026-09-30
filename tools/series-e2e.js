// Best of series end to end: two real signed-in game pages against the
// emulators play a Best of 3 in a Play Friends room.
//   full       the host sets it up, the other player accepts, entries are
//              taken, every game counts, the next game starts by itself, the
//              winner is paid 4x the entry, both get the result + Inbox mail
//   back-4     mid-game Bob's app closes; a Medium stand-in plays his seat
//              using the whole turn time; after 4 stand-in turns Bob opens
//              the game again and is put straight back into his seat; the
//              series carries on
//   out-5      Bob stays away: after the stand-in's 5th turn Alice claims
//              the series (Bob is out of that game, Alice is paid); Bob opens
//              the game afterwards and sees what happened
//   functions/.env.local with SH_TEST_DB_NS=shithead-pro-default-rtdb (see
//   CLAUDE.md), start the emulators, then
//   NODE_PATH=$(npm root -g) SH_VIDEO_DEPS=/path/with/node_modules \
//     node tools/series-e2e.js [full,back-4,out-5]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const S = process.env.SH_VIDEO_DEPS || ROOT;
const NS = 'shithead-pro-default-rtdb';
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const ALL = ['full', 'back-4', 'out-5'];
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const admin = async (p, method = 'GET', v, ns = NS) => (await fetch(`http://127.0.0.1:9000/${p}.json?ns=${ns}`, { method, headers: { Authorization: 'Bearer owner' }, body: v === undefined ? undefined : JSON.stringify(v) })).json();
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const vals = (x) => (x ? (Array.isArray(x) ? x : Object.values(x)).filter(Boolean) : []);
async function makeUser(email) {
  const r = await (await fetch(`${AUTH}/accounts:signUp?key=fake`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'secret123', returnSecureToken: true }) })).json();
  await fetch(`${AUTH}/projects/shithead-pro/accounts:update`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' }, body: JSON.stringify({ localId: r.localId, emailVerified: true }) });
  return r.localId;
}
function roomProblems(room) {
  if (!room || !room.players) return [];
  const seen = new Map(), out = [];
  const add = (c, where) => { if (!c || !c.id) return; if (seen.has(c.id)) out.push(`duplicate ${c.id} in ${seen.get(c.id)} and ${where}`); seen.set(c.id, where); };
  vals(room.players).forEach(p => ['hand', 'faceUp', 'faceDown'].forEach(z => vals(p[z]).forEach(c => add(c, `${p.name}.${z}`))));
  vals(room.discardPile).forEach(c => add(c, 'pile'));
  vals(room.drawPile).forEach(c => add(c, 'deck'));
  return out;
}
// Plays this seat's turns quickly (and clicks Accept on a series invite).
const AUTOPLAY = () => {
  if (window.__autoplay) return;
  window.__autoplay = true; window.__lastAct = 0;
  setInterval(() => {
    try {
      if (window.__stopped) return;
      if (state.phase === 'SWAP') { const me = state.players.find(p => p.id === state.localPlayerId); if (me && !me.isReady && me.hand?.length === 3) finishLocalSwap(); return; }
      if (state.phase !== 'PLAY' || state.blindRevealing || state.burnResolving) return;
      const me = state.players.find(p => p.id === state.localPlayerId);
      if (!me || me.hasFinished || me.isBot) return;
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
  // Level 20+ (4,772 XP), XP switched on, Diamonds for the entries.
  const resetUsers = () => admin('', 'PATCH', {
    'config/features/xp': true,
    [`users/${uid.alice}`]: { rating: 500, wins: 0, losses: 0, username: 'Alice', diamonds: 500, xp: { total: 4772, level: 20, backfilled: true, paidLevel: 20, table: 2 } },
    [`users/${uid.bob}`]: { rating: 500, wins: 0, losses: 0, username: 'Bob', diamonds: 500, xp: { total: 4772, level: 20, backfilled: true, paidLevel: 20, table: 2 } },
    'usernames/alice': uid.alice, 'usernames/bob': uid.bob, rooms: null, series: null
  });

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
    if (process.env.SERIES_DEBUG) page.on('console', m => { const t = m.text(); if (/^DBG/.test(t)) console.log(`  ${who} ${t}`); });
    page.on('dialog', d => d.accept().catch(() => {}));
    await page.goto('http://127.0.0.1:8765/index.html');
    await page.waitForTimeout(1500);
    if (signIn) await page.evaluate((email) => firebase.auth().signInWithEmailAndPassword(email, 'secret123'), `${who.toLowerCase()}@test.local`);
    await page.waitForFunction(() => typeof currentUser !== 'undefined' && currentUser && currentUser.uid, null, { timeout: 20000 });
    await page.waitForTimeout(2500);
    await page.evaluate((name) => { const i = document.getElementById('playerNameInput'); if (i) i.value = name; }, who);
    if (process.env.SERIES_DEBUG) await page.evaluate(() => {
      const wrap = (name) => { const f = window[name]; window[name] = function (...a) { console.log(`DBG ${name} phase=${state.phase} match=${(state.matchId || '').slice(0, 12)} v=${state.stateVersion} args=${JSON.stringify(a).slice(0, 80)}`); return f.apply(this, a); }; };
      ['startMultiplayerGame', 'returnToMultiplayerLobby', 'hideMatchEndUI', 'seriesMatchEnded'].forEach(wrap);
    });
    return page;
  };
  const player = async (who) => { const ctx = await newContext(); const page = await openPage(ctx, who, true); return { who, ctx, page }; };
  const diamonds = async (who) => Number(await admin(`users/${uid[who]}/diamonds`)) || 0;
  const results = [];
  const report = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };

  // Alice hosts, Bob joins, Alice starts a Best of 3, Bob accepts from the pop-up.
  const setUpSeries = async (A, B) => {
    await A.page.evaluate(() => initHostRoom());
    await A.page.waitForFunction(() => state.roomCode, null, { timeout: 20000 });
    const code = await A.page.evaluate(() => state.roomCode);
    await A.page.waitForTimeout(1200);
    await B.page.evaluate((c) => { document.getElementById('joinCodeInput').value = c; joinMultiRoom(); }, code);
    await A.page.waitForFunction(() => state.players.length === 2, null, { timeout: 20000 });
    await A.page.waitForTimeout(2500);
    const why = await A.page.evaluate(() => seriesBlockReason());
    if (why) throw new Error(`host can't start a series: ${why}`);
    await A.page.evaluate(() => createSeries(3));
    await B.page.waitForFunction(() => !document.getElementById('seriesModal').classList.contains('hidden'), null, { timeout: 20000 });
    await B.page.evaluate(() => document.getElementById('seriesAcceptBtn').click());
    await A.page.waitForFunction(() => seriesState && seriesState.status === 'live', null, { timeout: 20000 });
    return code;
  };
  const startGame = async (A, B) => {
    await A.page.evaluate(() => document.getElementById('startMultiGameBtn').click());
    for (const p of [A.page, B.page]) await p.evaluate(AUTOPLAY);
    await A.page.waitForFunction(() => state.phase === 'PLAY', null, { timeout: 60000 });
  };
  // Lets the next game count straight away (the server wants 60s between reports).
  const clearGap = (code) => admin(`series/${code}/lastGameAt`, 'PUT', 1);
  const standInOf = (room, name) => vals(room?.players).find(p => p.isBot && new RegExp(`^${name}\\b`).test(p.name || ''));
  // Waits until Bob's stand-in has played n turns (or the game/series ends).
  const waitStandInTurns = async (code, n, ms) => {
    const t0 = Date.now(); let seat = null, room = null;
    while (Date.now() - t0 < ms) {
      room = await admin(`rooms/${code}`);
      seat = standInOf(room, 'Bob');
      if (seat && (seat.substituteMoveCount || 0) >= n) break;
      if (!room || room.phase !== 'PLAY') break;
      await sleep(700);
    }
    return { seat, room, secs: Math.round((Date.now() - t0) / 1000) };
  };

  const scenarios = {
    async full() {
      await resetUsers();
      const A = await player('Alice'), B = await player('Bob');
      const [aPre, bPre] = [await diamonds('alice'), await diamonds('bob')];
      const code = await setUpSeries(A, B);
      await sleep(1500);
      const [a0, b0] = [await diamonds('alice'), await diamonds('bob')];
      report('full: entries taken', aPre - a0 === 30 && bPre - b0 === 30, `Alice ${aPre} → ${a0}, Bob ${bPre} → ${b0}`);
      await clearGap(code);
      await startGame(A, B);
      const problems = new Set(); const games = new Set(); let autoNext = 0, lastMatch = null, hudSeen = false, lastSig = '';
      const t0 = Date.now(); let s = null;
      while (Date.now() - t0 < 600000) {
        const room = await admin(`rooms/${code}`);
        roomProblems(room).forEach(p => problems.add(p));
        s = await admin(`series/${code}`);
        const sig = `${room?.phase} ${room?.matchId?.slice(0, 12)} ` + vals(room?.players).map(p => `${p.name}:${(p.hand || []).length}/${(p.faceUp || []).length}/${(p.faceDown || []).length}#${p.finishRank ?? '-'}`).join(' ') + ` | series ${s?.status} ${JSON.stringify(s?.wins)}`;
        if (sig !== lastSig) { console.log(`  [${Math.round((Date.now() - t0) / 1000)}s v${room?.stateVersion}] ${sig}`); lastSig = sig; }
        if (room?.matchId && room.matchId !== lastMatch) { if (lastMatch) autoNext++; lastMatch = room.matchId; }
        if (room?.phase === 'PLAY' && !hudSeen) hudSeen = await A.page.evaluate(() => !document.getElementById('seriesHud').classList.contains('hidden'));
        Object.keys(s?.games || {}).forEach(g => games.add(g));
        if (s && s.status !== 'live') break;
        if (room?.phase === 'PLAY') await clearGap(code);
        await sleep(400);
      }
      report('full: series finished', s && s.status === 'done', `${s?.status} after ${s?.played} games, ${Math.round((Date.now() - t0) / 1000)}s`);
      report('full: every game counted once', s && Object.keys(s.games || {}).length === s.played, JSON.stringify(s?.games));
      report('full: next game started by itself', autoNext >= 1, `${autoNext} automatic next game(s)`);
      report('full: score shown on the table', hudSeen, hudSeen ? 'pill visible' : 'never saw the pill');
      report('full: no duplicated cards', !problems.size, [...problems].slice(0, 3).join('; ') || 'none');
      await sleep(4000);
      const winner = s?.winner === uid.alice ? 'alice' : 'bob', loser = winner === 'alice' ? 'bob' : 'alice';
      const ledger = async (who) => Object.values((await admin(`users/${uid[who]}/seriesLedger`)) || {}).map(x => x.amount);
      const [wl, ll] = [await ledger(winner), await ledger(loser)];
      report('full: winner paid 120 on top of the entry, loser nothing back', JSON.stringify(wl.sort()) === JSON.stringify([-30, 120].sort()) && JSON.stringify(ll.sort()) === JSON.stringify([-30, 0].sort()), `${winner} ${JSON.stringify(wl)}, ${loser} ${JSON.stringify(ll)}`);
      const [ma, mb] = [await admin(`users/${uid.alice}/activityInbox/series_${s?.id}`), await admin(`users/${uid.bob}/activityInbox/series_${s?.id}`)];
      report('full: both get the result in the Inbox', !!ma && !!mb, `${ma?.won ? 'won' : 'lost'} / ${mb?.won ? 'won' : 'lost'}`);
      const popups = await Promise.all([A.page, B.page].map(p => p.evaluate(() => {
        const m = document.getElementById('seriesModal');
        return !m.classList.contains('hidden') && m.dataset.mode === 'result' ? document.getElementById('seriesModalTitle').textContent : null;
      })));
      report('full: both see the result pop-up', popups.every(Boolean), JSON.stringify(popups));
      const recs = [await admin(`users/${uid.alice}/series`), await admin(`users/${uid.bob}/series`)];
      report('full: nobody is left "in" the series', recs.every(r => !r), JSON.stringify(recs));
      await A.ctx.close(); await B.ctx.close();
    },

    async 'back-4'() {
      await resetUsers();
      const A = await player('Alice'), B = await player('Bob');
      const code = await setUpSeries(A, B);
      await clearGap(code);
      await startGame(A, B);
      await A.page.waitForFunction(() => state.phase === 'PLAY' && (state.stateVersion || 0) > 12, null, { timeout: 90000 });
      const tClose = Date.now();
      await B.page.close();
      const w = await waitStandInTurns(code, 4, 240000);
      const seat = w.seat;
      if (!seat) { report('back-4: stand-in took the seat', false, `no stand-in (room ${w.room?.phase}) after ${w.secs}s`); await A.ctx.close(); await B.ctx.close(); return; }
      report('back-4: a Medium stand-in took Bob\'s seat', seat.difficulty === 'medium' && seat.isSeriesSubstitute, `${seat.name}, ${seat.difficulty}, series stand-in ${!!seat.isSeriesSubstitute}`);
      const secsPerTurn = (Date.now() - tClose) / 1000;
      report('back-4: the stand-in played 4 turns', (seat.substituteMoveCount || 0) >= 4, `${seat.substituteMoveCount} turns, ${Math.round(secsPerTurn)}s after Bob left`);
      const sMid = await admin(`series/${code}`);
      report('back-4: the series is still on', sMid?.status === 'live', sMid?.status);
      // Bob opens the game again (same phone: still signed in).
      const B2 = await openPage(B.ctx, 'Bob', false);
      await B2.evaluate(AUTOPLAY);
      await B2.waitForFunction((code) => state.roomCode === code, code, { timeout: 30000 }).catch(() => {});
      await sleep(3000);
      const back = await B2.evaluate(() => { const me = state.players.find(p => p.id === state.localPlayerId); return { code: state.roomCode, phase: state.phase, name: me?.name, bot: !!me?.isBot, prompt: !document.getElementById('rejoinModal').classList.contains('hidden') }; });
      report('back-4: Bob goes straight back into his seat', back.code === code && back.name === 'Bob' && !back.bot && !back.prompt, JSON.stringify(back));
      const room = await admin(`rooms/${code}`);
      const bobSeat = vals(room?.players).find(p => p.uid === uid.bob);
      report('back-4: the seat is his again in the room', !!bobSeat && !bobSeat.isBot && !bobSeat.conceded, JSON.stringify(bobSeat && { name: bobSeat.name, isBot: bobSeat.isBot, conceded: !!bobSeat.conceded }));
      const sNow = await admin(`series/${code}`);
      report('back-4: the series carries on (no forfeit)', sNow?.status === 'live' && sNow.reason !== 'forfeit', `${sNow?.status} ${sNow?.reason || ''}`);
      // Let the series play out.
      const t0 = Date.now(); let s = sNow;
      while (Date.now() - t0 < 600000 && s?.status === 'live') { const r = await admin(`rooms/${code}`); if (r?.phase === 'PLAY') await clearGap(code); await sleep(1500); s = await admin(`series/${code}`); }
      report('back-4: the series finishes normally', s?.status === 'done' && s.reason === 'won', `${s?.status} ${s?.reason} after ${s?.played} games`);
      await A.ctx.close(); await B.ctx.close();
    },

    async 'out-5'() {
      await resetUsers();
      const A = await player('Alice'), B = await player('Bob');
      const code = await setUpSeries(A, B);
      await clearGap(code);
      await startGame(A, B);
      await A.page.waitForFunction(() => state.phase === 'PLAY' && (state.stateVersion || 0) > 12, null, { timeout: 90000 });
      await B.page.close();
      const w = await waitStandInTurns(code, 5, 300000);
      report('out-5: the stand-in played 5 turns', (w.seat?.substituteMoveCount || 0) >= 5, `${w.seat?.substituteMoveCount} turns in ${w.secs}s (room ${w.room?.phase})`);
      // Alice's phone claims the series after the 5th turn (and once Bob has been away a minute).
      const t0 = Date.now(); let s = null;
      while (Date.now() - t0 < 120000) { s = await admin(`series/${code}`); if (s?.status !== 'live') break; await sleep(1500); }
      report('out-5: Alice is given the series', s?.status === 'done' && s.winner === uid.alice && s.reason === 'forfeit', `${s?.status} ${s?.reason} winner ${s?.winner === uid.alice ? 'Alice' : s?.winner}, ${Math.round((Date.now() - t0) / 1000)}s after the 5th turn`);
      await sleep(3000);
      const room = await admin(`rooms/${code}`);
      const bobSeat = vals(room?.players).find(p => p.uid === uid.bob);
      report('out-5: Bob is out of that game, last place', room?.phase === 'FINISHED' && bobSeat?.conceded && bobSeat.finishRank === 2, `${room?.phase}, Bob #${bobSeat?.finishRank} conceded ${!!bobSeat?.conceded}`);
      const led = Object.values((await admin(`users/${uid.alice}/seriesLedger`)) || {}).map(x => x.amount).sort((x, y) => x - y);
      report('out-5: Alice is paid the pot', JSON.stringify(led) === JSON.stringify([-30, 120]), `ledger ${JSON.stringify(led)}`);
      const aPop = await A.page.evaluate(() => { const m = document.getElementById('seriesModal'); return !m.classList.contains('hidden') ? document.getElementById('seriesModalTitle').textContent + ' / ' + document.getElementById('seriesModalText').textContent : null; });
      report('out-5: Alice sees the result', !!aPop && /won/i.test(aPop), aPop);
      // Bob comes back afterwards.
      const B2 = await openPage(B.ctx, 'Bob', false);
      await B2.waitForFunction(() => !document.getElementById('seriesModal').classList.contains('hidden'), null, { timeout: 12000 }).catch(() => {});
      const bob = await B2.evaluate(() => ({ inRoom: !!state.roomCode, phase: state.phase, banner: document.getElementById('actionBanner')?.textContent || '', popup: !document.getElementById('seriesModal').classList.contains('hidden') ? document.getElementById('seriesModalTitle').textContent : null }));
      const mail = await admin(`users/${uid.bob}/activityInbox/series_${s?.id}`);
      report('out-5: Bob is not put back into the finished game', !bob.inRoom, JSON.stringify(bob));
      report('out-5: Bob is told (Inbox mail)', !!mail && mail.won === false && mail.reason === 'forfeit', JSON.stringify(mail));
      report('out-5: Bob is told when he opens the game', !!bob.popup || /series/i.test(bob.banner), `pop-up ${bob.popup}, banner "${bob.banner}"`);
      await A.ctx.close(); await B.ctx.close();
    }
  };
  for (const name of ALL) {
    if (ONLY.length && !ONLY.includes(name)) continue;
    try { await scenarios[name](); } catch (e) { report(name, false, `threw ${String(e && e.stack || e).slice(0, 400)}`); }
  }
  await browser.close();
  const uniq = [...new Set(errors)];
  if (uniq.length) console.log('page errors:\n  ' + uniq.slice(0, 15).join('\n  '));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed} passed, ${failed} failed, ${uniq.length} distinct page errors`);
  process.exit(failed || uniq.length ? 1 : 0);
})();
