// 2 vs 2 wins: economy `matchWin` counts them (matchCounters.twosWins), pays like a Play Computer win,
// never credits difficulty unlocks, and unlocks the Dream Team avatar + Better Together at 10.
// Run: node tools/twos-win-test.js (npm install in functions first).
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
  assert.equal(CAT.challengeDefs.twosWins[0].target, 10);
  assert.deepEqual(CAT.earned['avatar-twos'] && CAT.earned['avatar-twos'].type, 'twosWins');
  assert(CAT.weeklyRules.some(r => r.from === '2026-W44' && r.pool.some(c => c.id === 'win-twos')), 'weekly Team Player from W44');
  assert(!CAT.weeklyRules.find(r => r.from === '2026-W41').pool.some(c => c.id === 'win-twos'), 'weeks under way keep their pool');
  put('users/a', { username: 'Ann', diamonds: 0 });
  let t = Date.parse('2026-09-25T12:00:00Z');
  const win = async (uid, data) => { t += 120000; setNow(new Date(t).toISOString()); return economy.matchWin({ uid, data }); };
  let r = await win('a', { mode: 'bots', matchId: 'm_plain', difficulty: 'easy' });
  assert.equal(get('users/a/difficultyWins/easy'), 1, 'a normal win counts towards unlocks');
  assert.equal(r.twosWins, 0);
  for (let i = 1; i <= 10; i++) {
    r = await win('a', { mode: 'bots', matchId: 'm_twos' + i, difficulty: 'easy', twos: true });
    assert.equal(r.diamondsAwarded, CAT.matchWinRewards.bots, 'same Diamonds as a Play Computer win');
    assert.equal(r.twosWins, i);
    if (i < 10) assert(!get('users/a/ownedCosmetics/avatar-twos'), 'not before 10 wins');
  }
  assert.equal(get('users/a/difficultyWins/easy'), 1, '2 vs 2 wins never add unlock credit');
  assert(get('users/a/completedChallenges/better-together'), 'Better Together paid at 10');
  assert(get('users/a/ownedCosmetics/avatar-twos'), 'Dream Team unlocked at 10');
  assert(r.newAvatars.some(a => a.id === 'avatar-twos'));
  // Online: the room decides.
  put('users/b', { username: 'Bo', diamonds: 0 });
  const seats = (teams) => teams.map((tm, i) => ({ id: 'p' + i, uid: i === 0 ? 'b' : 'u' + i, finishRank: (tm === 0 || (tm === null && i === 0)) ? 1 : 3, ...(tm === null ? {} : { team: tm }) }));
  put('rooms/123456', { matchId: 'm_room', friendsMode: 'twos', players: seats([0, 1, 0, 1]) });
  r = await win('b', { mode: 'online', matchId: 'm_room', roomCode: '123456' });
  assert.equal(r.twosWins, 1, 'an online 2 vs 2 room counts');
  put('rooms/123457', { matchId: 'm_room2', friendsMode: 'standard', players: seats([null, null, null, null]) });
  r = await win('b', { mode: 'online', matchId: 'm_room2', roomCode: '123457' });
  assert.equal(r.twosWins, 1, 'a standard room does not count, whatever the phone says');
  r = await win('b', { mode: 'online', matchId: 'm_room2b', roomCode: '123456', twos: true }).catch(e => e);
  assert(r instanceof Error, 'a room that is not this match is refused');
  console.log('2 vs 2 win test passed');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { global.Date = RealDate; require.cache[adminPath].exports = realAdmin; });
