// No Mercy: `matchWin` counts wins (noMercyWins) with no difficulty credit, `matchFinished` counts Queens played
// and Kings' pick-ups; the challenges and The Seer / The Enforcer avatars follow.
// Run: node tools/nomercy-win-test.js (npm install in functions first).
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
  assert.equal(CAT.challengeDefs.noMercyQueens[0].target, 50);
  assert.equal(CAT.earned['avatar-nm-seer'].type, 'nmQueens');
  assert.equal(CAT.earned['avatar-nm-enforcer'].type, 'nmKings');
  put('users/a', { username: 'Ann', diamonds: 0 });
  let t = Date.parse('2026-10-27T12:00:00Z');
  const step = async (fn, uid, data) => { t += 120000; setNow(new Date(t).toISOString()); return fn({ uid, data }); };
  let r = await step(economy.matchWin, 'a', { mode: 'bots', matchId: 'm_plain', difficulty: 'easy' });
  assert.equal(r.noMercyWins, 0);
  for (let i = 1; i <= 10; i++) {
    r = await step(economy.matchWin, 'a', { mode: 'bots', matchId: 'm_n' + i, difficulty: 'easy', noMercy: true });
    assert.equal(r.diamondsAwarded, CAT.matchWinRewards.bots, 'same Diamonds as a Play Computer win');
    assert.equal(r.noMercyWins, i);
    if (i === 1) assert(get('users/a/completedChallenges/first-blood'), 'first win paid');
  }
  assert.equal(get('users/a/difficultyWins/easy'), 1, 'No Mercy wins never add unlock credit');
  assert(get('users/a/completedChallenges/no-mercy-veteran'), 'Veteran at 10');
  // Queens and Kings (bot games are the phone\'s word); a game is capped at 40 of each.
  r = await step(economy.matchFinished, 'a', { matchId: 'f1', noMercy: { queens: 30, kings: 20 } });
  assert.equal(get('users/a/matchCounters/nmQueens'), 30);
  assert(!get('users/a/ownedCosmetics/avatar-nm-seer'));
  r = await step(economy.matchFinished, 'a', { matchId: 'f2', noMercy: { queens: 25, kings: 30 } });
  assert.equal(get('users/a/matchCounters/nmQueens'), 55);
  assert(get('users/a/completedChallenges/sixth-sense'), 'Sixth Sense at 50 Queens');
  assert(get('users/a/completedChallenges/cold-blooded'), 'Cold Blooded at 50 King cards');
  assert(get('users/a/ownedCosmetics/avatar-nm-seer'), 'The Seer unlocked at 50 Queens');
  assert(get('users/a/ownedCosmetics/avatar-nm-enforcer'), 'The Enforcer unlocked at 50 King cards');
  r = await step(economy.matchFinished, 'a', { matchId: 'f3', noMercy: { queens: 999, kings: 0 } });
  assert.equal(get('users/a/matchCounters/nmQueens'), 95, 'a game is capped at 40 Queens');
  // Online: the room decides.
  put('users/b', { username: 'Bo', diamonds: 0 });
  const seats = (n, rank) => Array.from({ length: n }, (_, i) => ({ id: 'p' + i, uid: i === 0 ? 'b' : 'u' + i, finishRank: i === 0 ? rank : i + 1 }));
  put('rooms/123456', { matchId: 'm_room', friendsMode: 'noMercy', players: seats(3, 1) });
  r = await step(economy.matchWin, 'b', { mode: 'online', matchId: 'm_room', roomCode: '123456' });
  assert.equal(r.noMercyWins, 1, 'an online No Mercy room counts');
  put('rooms/123457', { matchId: 'm_room2', friendsMode: 'standard', players: seats(3, 1) });
  await step(economy.matchFinished, 'b', { matchId: 'f9', roomCode: '123457', noMercy: { queens: 10, kings: 10 } });
  assert.equal(get('users/b/matchCounters/nmQueens') || 0, 0, 'a standard room never counts Queens');
  console.log('nomercy-win-test: ok');
})().catch(e => { console.error(e); process.exit(1); });
