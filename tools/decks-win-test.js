// Multiple Decks: economy `matchWin` counts wins (matchCounters.decksWins) with no difficulty credit,
// `matchFinished` counts Snap Burns and top-three finishes; challenges and the Double Deck avatar follow.
// Run: node tools/decks-win-test.js (npm install in functions first).
'use strict';
const assert = require('node:assert/strict');
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
const data = {};
const get = path => path.split('/').filter(Boolean).reduce((v, k) => v?.[k], data) ?? null;
const put = (path, value) => { const ks = path.split('/').filter(Boolean), k = ks.pop(); let p = data; for (const key of ks) p = p[key] ||= {}; if (value == null) delete p[k]; else p[k] = clone(value); };
const snap = (value, key) => ({ key, val: () => clone(value), exists: () => value != null, child: k => snap(value?.[k], k), forEach: fn => Object.entries(value || {}).forEach(([k, v]) => fn(snap(v, k))) });
const database = () => ({ ref: (path = '') => {
  const ref = { once: async () => snap(get(path)), set: async v => put(path, v), remove: async () => put(path, null),
    update: async u => { for (const [k, v] of Object.entries(u)) put([path, k].filter(Boolean).join('/'), v); },
    child: k => database().ref([path, k].filter(Boolean).join('/')),
    transaction: async fn => { const v = fn(clone(get(path))); if (v !== undefined) put(path, v); return { committed: v !== undefined, snapshot: snap(get(path)) }; },
    orderByChild: () => ref, startAfter: () => ref, limitToFirst: () => ref, limitToLast: () => ref };
  return ref;
} });
const adminPath = require.resolve('../functions/node_modules/firebase-admin'); require(adminPath);
const realAdmin = require.cache[adminPath].exports; require.cache[adminPath].exports = { ...realAdmin, database };
const RealDate = Date;
const setNow = (iso) => { const t = new RealDate(iso).getTime(); global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; };
(async () => {
  const economy = require('../functions/economy')._test.actions;
  const CAT = require('../functions/catalog.json');
  assert.equal(CAT.challengeDefs.decksWins[1].target, 10);
  assert.equal(CAT.earned['avatar-decks'].type, 'decksWins');
  put('users/a', { username: 'Ann', diamonds: 0 });
  let t = Date.parse('2026-10-26T12:00:00Z');
  const step = async (fn, uid, data) => { t += 120000; setNow(new Date(t).toISOString()); return fn({ uid, data }); };
  let r = await step(economy.matchWin, 'a', { mode: 'bots', matchId: 'm_plain', difficulty: 'easy' });
  assert.equal(get('users/a/difficultyWins/easy'), 1);
  assert.equal(r.decksWins, 0);
  for (let i = 1; i <= 10; i++) {
    r = await step(economy.matchWin, 'a', { mode: 'bots', matchId: 'm_d' + i, difficulty: 'easy', decks: true });
    assert.equal(r.diamondsAwarded, CAT.matchWinRewards.bots, 'same Diamonds as a Play Computer win');
    assert.equal(r.decksWins, i);
    if (i === 1) assert(get('users/a/completedChallenges/double-or-nothing'), 'first win paid');
    if (i < 10) assert(!get('users/a/ownedCosmetics/avatar-decks'), 'not before 10 wins');
  }
  assert.equal(get('users/a/difficultyWins/easy'), 1, 'decks wins never add unlock credit');
  assert(get('users/a/completedChallenges/deck-master'), 'Deck Master at 10');
  assert(get('users/a/ownedCosmetics/avatar-decks'), 'Double Deck unlocked at 10');
  // Snap Burns and a top-three finish (bot games are the phone\'s word).
  r = await step(economy.matchFinished, 'a', { matchId: 'f1', decks: { snaps: 6, top3: false } });
  assert.equal(get('users/a/matchCounters/decksSnaps'), 6);
  assert(!get('users/a/completedChallenges/quick-hands'));
  r = await step(economy.matchFinished, 'a', { matchId: 'f2', decks: { snaps: 5, top3: true } });
  assert.equal(get('users/a/matchCounters/decksSnaps'), 11);
  assert(get('users/a/completedChallenges/quick-hands'), 'Quick Hands at 10 snaps');
  assert(get('users/a/completedChallenges/crowd-pleaser'), 'Crowd Pleaser');
  r = await step(economy.matchFinished, 'a', { matchId: 'f3', decks: { snaps: 999, top3: false } });
  assert.equal(get('users/a/matchCounters/decksSnaps'), 41, 'a game is capped at 30 snaps');
  // Online: the room decides.
  put('users/b', { username: 'Bo', diamonds: 0 });
  const seats = (n, rank) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, uid: i === 0 ? 'b' : 'u' + i, finishRank: i === 0 ? rank : i + 1 }));
  put('rooms/123456', { matchId: 'm_room', friendsMode: 'decks', players: seats(6, 1) });
  r = await step(economy.matchWin, 'b', { mode: 'online', matchId: 'm_room', roomCode: '123456' });
  assert.equal(r.decksWins, 1, 'an online decks room counts');
  put('rooms/123457', { matchId: 'm_room2', friendsMode: 'standard', players: seats(4, 1) });
  r = await step(economy.matchWin, 'b', { mode: 'online', matchId: 'm_room2', roomCode: '123457' });
  assert.equal(r.decksWins, 1, 'a standard room does not count');
  put('rooms/123458', { matchId: 'x', friendsMode: 'decks', players: seats(5, 4) });
  await step(economy.matchFinished, 'b', { matchId: 'g1', roomCode: '123458', decks: { snaps: 2, top3: true } });
  assert.equal(get('users/b/matchCounters/decksTop3') || 0, 0, 'top three needs a 6+ table and a real rank');
  assert.equal(get('users/b/matchCounters/decksSnaps'), 2);
  console.log('Multiple Decks reward test passed');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { global.Date = RealDate; require.cache[adminPath].exports = realAdmin; });
