// Event leaderboard: board writes from seasonWins and the prize payout (in-memory database).
// Run: node tools/event-board-test.js (npm install in functions first).
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
const boards = require('../functions/boards');
(async () => {
  const seasons = require('../functions/seasons');
  const [start, end] = seasons.seasonalWindowsForYear('halloween', 2026)[0];
  const key = `halloween-${start.getFullYear()}`;
  const during = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 3, 12).getTime();
  const after = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1, 12).getTime();
  // Board entries are written only for an event board that exists on the day (the real clock decides, so pin it).
  const realNow = Date.now; Date.now = () => during;
  const names = ['Ann', 'Bob', 'Cat', 'Dan', 'Eve', 'Fay'], wins = [30, 20, 20, 8, 5, 4];
  for (let i = 0; i < names.length; i++) {
    put(`users/u${i}`, { username: names[i], diamonds: 100, seasonWins: { [key]: wins[i] } });
    await boards.onUserChanged(`u${i}`, { username: names[i], seasonWins: { [key]: wins[i] - 1 } }, get(`users/u${i}`));
  }
  assert.equal(get(`boards/event_${key}/u0/count`), 30);
  assert.equal(get(`boards/event_${key}/u5/count`), 4);
  assert(boards.boardPaths('u0').includes(`boards/event_${key}/u0`));
  Date.now = realNow;
  assert.equal(boards.eventPrizeFor(1, 30), 1000);
  assert.equal(boards.eventPrizeFor(3, 20), 400);
  assert.equal(boards.eventPrizeFor(10, 5), 200);
  assert.equal(boards.eventPrizeFor(11, 99), 0);
  assert.equal(boards.eventPrizeFor(1, 4), 0, 'fewer than the minimum wins earns nothing');
  assert.deepEqual(await boards.payEventPrizes(during), [], 'nothing is paid while the event is live');
  const paid = await boards.payEventPrizes(after);
  // Ann 1st (1000), Bob and Cat share 2nd (600 each), Dan 4th (200), Eve 5th with 5 wins (200), Fay under 5 wins: nothing.
  assert.deepEqual(paid.map(p => [p.uid, p.rank, p.reward]), [['u0', 1, 1000], ['u1', 2, 600], ['u2', 2, 600], ['u3', 4, 200], ['u4', 5, 200]]);
  assert.equal(get('users/u0/diamonds'), 1100);
  assert.equal(get('users/u5/diamonds'), 100);
  assert.equal(get(`users/u0/activityInbox/event_${key}/type`), 'eventPrize');
  assert.equal(get(`users/u0/activityInbox/event_${key}/rank`), 1);
  assert.deepEqual(await boards.payEventPrizes(after), [], 'the event is paid once');
  put(`eventPrizes/${key}/done`, null);
  assert.deepEqual(await boards.payEventPrizes(after), [], 'per-player markers stop a double payment');
  assert.equal(get('users/u0/diamonds'), 1100);
  put('users/u9', { username: 'Gone', diamonds: 0, deletion: { requestedAt: 1, purgeAt: 2 } }); put(`boards/event_${key}/u9`, { name: 'Gone', count: 50 });
  put(`eventPrizes/${key}`, null);
  const again = await boards.payEventPrizes(after);
  assert(!again.some(p => p.uid === 'u9'), 'a deleted account is not paid');
  console.log('event board test passed');
})().catch(e => { console.error(e); process.exit(1); });
