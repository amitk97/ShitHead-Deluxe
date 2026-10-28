// Daily Spin: economy `wheel` pays one prize a UK day (Diamonds, XP, or a wheel-only item; a duplicate item pays
// Diamonds), never twice in a day, and leaves XP prizes out of the draw while XP is off.
// Run: node tools/wheel-test.js (npm install in functions first).
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
  const W = CAT.wheel;
  assert.equal(W.prizes.reduce((s, p) => s + p.weight, 0), 1000, 'weights make 1000');
  assert.equal(W.segments.length, 12);
  W.prizes.forEach(p => assert(W.segments.includes(p.id), `${p.id} has a slice`));
  W.prizes.filter(p => p.kind === 'item').forEach(p => assert(CAT.earned[p.itemId] && CAT.earned[p.itemId].type === 'wheel', 'the item has a server rule'));
  const avg = W.prizes.filter(p => p.kind === 'diamonds').reduce((s, p) => s + p.amount * p.weight / 1000, 0);
  assert(avg > 40 && avg < 80, `about 60 Diamonds a day on average (${avg})`);
  put('users/a', { username: 'Ann', diamonds: 0 });
  const day = (n) => { setNow(`2026-11-${String(n).padStart(2, '0')}T12:00:00Z`); };
  day(2);
  let r = await economy.wheel({ uid: 'a', data: { op: 'status' } });
  assert.equal(r.canSpin, true);
  r = await economy.wheel({ uid: 'a', data: { op: 'spin' } });
  assert(r.spin && W.prizes.some(p => p.id === r.spin.prize), 'a real prize');
  assert.equal(r.canSpin, false);
  const first = r.spin, after = get('users/a/diamonds');
  if (first.kind === 'diamonds') assert.equal(after, first.amount, 'Diamonds paid');
  r = await economy.wheel({ uid: 'a', data: { op: 'spin' } });
  assert(r.already, 'not twice in a UK day');
  assert.equal(get('users/a/diamonds'), after, 'no second payment');
  r = await economy.wheel({ uid: 'a', data: { op: 'status' } });
  assert.equal(r.canSpin, false); assert.equal(r.last.id, first.prize);
  day(3);
  r = await economy.wheel({ uid: 'a', data: { op: 'status' } });
  assert.equal(r.canSpin, true, 'a new UK day');
  // Over many players: every prize kind shows up, XP never when XP is off, items grant once then pay the duplicate.
  const seen = new Set(); let itemWins = 0;
  for (let i = 0; i < 4000; i++) {
    put(`users/p${i}`, { username: 'P' + i, diamonds: 0 });
    const x = await economy.wheel({ uid: `p${i}`, data: { op: 'spin' } });
    seen.add(x.spin.prize);
    if (x.spin.kind === 'item') { itemWins++; assert(get(`users/p${i}/ownedCosmetics/${x.spin.itemId}`), 'item owned'); assert(get(`users/p${i}/activityInbox/unlock_${x.spin.itemId}`), 'unlock mail'); }
    assert(!(x.spin.kind === 'xp'), 'XP prizes are out of the draw while XP is off');
  }
  assert(seen.has('d25') && seen.has('d100') && seen.has('d250'), 'common prizes appear');
  assert(itemWins > 0 && itemWins < 200, `item prizes are rare (${itemWins} in 4000)`);
  // A duplicate pays Diamonds instead.
  put('users/dup', { username: 'Dup', diamonds: 0, ownedCosmetics: { 'avatar-wheel': { cost: 0, purchasedAt: 1 }, 'back-wheel': { cost: 0, purchasedAt: 1 } } });
  let dupSeen = false;
  for (let d = 1; d <= 400 && !dupSeen; d++) {
    setNow(`2027-${String(1 + Math.floor(d / 28)).padStart(2, '0')}-${String(1 + (d % 28)).padStart(2, '0')}T12:00:00Z`);
    const x = await economy.wheel({ uid: 'dup', data: { op: 'spin' } });
    if (x.spin && x.spin.kind === 'item') { dupSeen = true; assert(x.spin.duplicate && x.spin.paid === W.dupeDiamonds, 'duplicate pays'); }
  }
  // XP on: XP prizes join the draw and come back with an xp result.
  put('config/features/xp', true); require('../functions/xp').resetCache();
  let xpSeen = null;
  for (let i = 0; i < 600 && !xpSeen; i++) {
    put(`users/x${i}`, { username: 'X' + i, diamonds: 0 });
    const x = await economy.wheel({ uid: `x${i}`, data: { op: 'spin' } });
    if (x.spin.kind === 'xp') xpSeen = { x, i };
  }
  assert(xpSeen && xpSeen.x.xp && xpSeen.x.xp.gained >= 75, 'an XP prize pays XP');
  assert(get(`users/x${xpSeen.i}/xp/total`) >= 75);
  console.log('wheel test passed');
})().catch(e => { console.error(e); process.exit(1); });
