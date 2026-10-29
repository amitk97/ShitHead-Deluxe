// Drop Zone (v503): status, drop, drop all, duplicate items, the card bank (+1 per win, cap 10).
// (header from test-unlock-test) AmitK test switch: economy `testUnlock` grants every cosmetic as server-only `testOwned`, notes what was owned and worn
// before, and turns back cleanly (real purchases untouched, worn test items replaced by the earlier look).
// Run: node tools/test-unlock-test.js (npm install in functions first).
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
  const { actions, dzAward, dzView } = require('../functions/economy')._test;
  put('users/user001', { username: 'Zed', diamonds: 0 });
  let r = await actions.dropzone({ uid: 'user001', data: { op: 'status' } });
  assert.equal(r.cards, 1, 'a new player starts with one card');
  r = await actions.dropzone({ uid: 'user001', data: { op: 'drop', n: 1 } });
  assert.equal(r.drops.length, 1); assert.equal(r.cards, 0);
  const first = r.drops[0];
  assert.equal(get('users/user001/diamonds'), first.kind === 'diamonds' ? first.amount : 1250 * 0 + (first.duplicate ? 1250 : 0));
  r = await actions.dropzone({ uid: 'user001', data: { op: 'drop', n: 1 } });
  assert(r.none, 'no cards, no drop');
  // award: +1 per win, capped at 10
  const user = get('users/user001'); const u = JSON.parse(JSON.stringify(user));
  assert.equal(dzAward(u, 1), true); assert.equal(u.dropzone.cards, 1);
  for (let i = 0; i < 20; i++) dzAward(u, 1);
  assert.equal(u.dropzone.cards, 10, 'the bank holds at most 10');
  assert.equal(dzAward(u, 1), false);
  // a brand new account's first win: start card + the win
  const fresh = {}; dzAward(fresh, 1); assert.equal(fresh.dropzone.cards, 2); assert.equal(dzView({}, false).cards, 1);
  // drop all: spends every card in one write, items become owned or pay the duplicate
  put('users/user002', { username: 'Amy', diamonds: 0, dropzone: { cards: 10, earned: 9, used: 0, at: 1 } });
  r = await actions.dropzone({ uid: 'user002', data: { op: 'drop', n: 10 } });
  assert.equal(r.drops.length, 10); assert.equal(r.cards, 0);
  const sum = r.drops.reduce((a, d) => a + d.paid, 0); assert.equal(get('users/user002/diamonds'), sum);
  const wonItems = r.drops.filter(d => d.kind === 'item' && !d.duplicate);
  for (const d of wonItems) assert(get('users/user002/ownedCosmetics/' + d.itemId), 'item granted');
  // asking for more than you hold only spends what you hold
  put('users/user003', { username: 'Bob', diamonds: 0, dropzone: { cards: 2, earned: 1, used: 0, at: 1 } });
  r = await actions.dropzone({ uid: 'user003', data: { op: 'drop', n: 5 } });
  assert.equal(r.drops.length, 2);
  // an owned item pays 1250
  put('users/user004', { username: 'Cy', diamonds: 0, ownedCosmetics: { 'avatar-dropzone': { cost: 0 }, 'back-dropzone': { cost: 0 } }, dropzone: { cards: 10, earned: 9, used: 0, at: 1 } });
  let dupes = 0; for (let k = 0; k < 40 && !dupes; k++) { put('users/user004/dropzone', { cards: 10, earned: 9, used: 0, at: 1 }); const rr = await actions.dropzone({ uid: 'user004', data: { op: 'drop', n: 10 } }); dupes += rr.drops.filter(d => d.duplicate).length; if (dupes) assert(rr.drops.find(d => d.duplicate).paid === 1250); }
  console.log('PASS: Drop Zone bank, drops, drop all and duplicates');
})().catch(e => { console.error(e); process.exit(1); });
