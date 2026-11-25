// Account purge: purgeAccount erases everything the privacy policy says it does, and leaves other people's data alone.
// In-memory database like decks-win-test.js. Run: node tools/account-purge-test.js (npm install in functions first).
'use strict';
const assert = require('node:assert/strict');
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
const data = {};
const get = path => path.split('/').filter(Boolean).reduce((v, k) => v?.[k], data) ?? null;
const put = (path, value) => { const ks = path.split('/').filter(Boolean), k = ks.pop(); let p = data; for (const key of ks) p = p[key] ||= {}; if (value == null) delete p[k]; else p[k] = clone(value); };
const snap = (value, key) => ({ key, val: () => clone(value), exists: () => value != null, child: k => snap(value?.[k], k), forEach: fn => Object.entries(value || {}).forEach(([k, v]) => fn(snap(v, k))) });
const database = () => ({ ref: (path = '') => ({
  once: async () => snap(get(path)), set: async v => put(path, v), remove: async () => put(path, null),
  update: async u => { for (const [k, v] of Object.entries(u)) put([path, k].filter(Boolean).join('/'), v); }
}) });
const deletedAuth = [];
const auth = () => ({ deleteUser: async uid => { deletedAuth.push(uid); } });
const adminPath = require.resolve('../functions/node_modules/firebase-admin'); require(adminPath);
const realAdmin = require.cache[adminPath].exports; require.cache[adminPath].exports = { ...realAdmin, database, auth };

(async () => {
  const { purgeAccount } = require('../functions/account');
  const A = 'uidA', B = 'uidB';
  put(`users/${A}`, { username: 'Ann', diamonds: 5 }); put(`users/${B}`, { username: 'Bob', diamonds: 7 });
  put(`publicProfiles/${A}`, { username: 'Ann' }); put(`publicProfiles/${B}`, { username: 'Bob' });
  put(`friends/${A}/${B}`, true); put(`friends/${B}/${A}`, true);
  put(`friendRequests/${B}/${A}`, { at: 1 });
  put(`playerReports/${B}/${A}`, { reason: 'other' });
  put('usernames/ann', A); put('usernames/bob', B);
  put('leaderboard/ann', { rating: 500 }); put('leaderboard/bob', { rating: 600 });
  put(`montyGames/${A}`, { x: 1 }); put(`liveGames/${A}`, { x: 1 });
  put('referralCodes/ABC', { uid: A }); put('referralCodes/XYZ', { uid: B });
  put('health/2026-11-24/s1', { uid: A, fps: 55 }); put('health/2026-11-24/s2', { uid: B, fps: 50 });
  put('series/r1', { host: A, guest: B, status: 'done' });
  put('series/r2', { host: B, guest: A, status: 'cancelled' });
  put('series/r3', { host: A, guest: B, status: 'live' });
  put('series/r4', { host: B, guest: 'uidC', status: 'done' });
  put('rooms/ROOM1', { players: [{ name: 'Ann' }] });

  await purgeAccount(A);

  for (const p of [`users/${A}`, `publicProfiles/${A}`, `friends/${A}`, `friends/${B}/${A}`, `friendRequests/${B}/${A}`,
    `playerReports/${B}/${A}`, 'usernames/ann', 'leaderboard/ann', `montyGames/${A}`, `liveGames/${A}`, 'referralCodes/ABC',
    'health/2026-11-24/s1', 'series/r1', 'series/r2']) assert.equal(get(p), null, `${p} erased`);
  for (const p of [`users/${B}`, `publicProfiles/${B}`, 'usernames/bob', 'leaderboard/bob', 'referralCodes/XYZ',
    'health/2026-11-24/s2', 'series/r3', 'series/r4', 'rooms/ROOM1']) assert.notEqual(get(p), null, `${p} kept`);
  assert.deepEqual(deletedAuth, [A], 'the sign-in is deleted');
  console.log('PASS account purge: erased what the policy lists (incl. Lucky Games state, health records, finished series), kept others, live series and room records');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
