// Event login bonus: the economy `streak` claim pays +eventLoginBonus only on UK days an event is live.
// Run: node tools/event-login-test.js (npm install in functions first).
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
  assert.equal(CAT.eventLoginBonus, 30);
  put('users/a', { username: 'Ann', diamonds: 0 });
  setNow('2026-10-20T12:00:00Z'); // Halloween is live
  let r = await economy.streak({ uid: 'a' });
  assert.deepEqual(r.claimed.bonus, { event: 'halloween', name: 'Halloween', amount: 30 });
  assert.equal(r.diamonds, CAT.dailyStreakRewards[0] + 30, 'daily reward + event bonus');
  r = await economy.streak({ uid: 'a' });
  assert.equal(r.claimed, null, 'the same day pays nothing, so the bonus cannot repeat');
  assert.equal(get('users/a/diamonds'), CAT.dailyStreakRewards[0] + 30);
  put('users/b', { username: 'Bob', diamonds: 0 });
  setNow('2026-09-25T12:00:00Z'); // no event
  r = await economy.streak({ uid: 'b' });
  assert.equal(r.claimed.bonus, undefined);
  assert.equal(r.diamonds, CAT.dailyStreakRewards[0], 'no event, no bonus');
  put('users/c', { username: 'Cy', diamonds: 0 });
  setNow('2026-11-02T23:30:00Z'); // last Halloween day (both end days count)
  r = await economy.streak({ uid: 'c' });
  assert(r.claimed.bonus, 'the end day still pays');
  console.log('event login test passed');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { global.Date = RealDate; require.cache[adminPath].exports = realAdmin; });
