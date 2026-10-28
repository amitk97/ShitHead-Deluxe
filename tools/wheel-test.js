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
  // Owned wheel items show in status and pay 1250.
  assert.equal(W.dupeDiamonds, 1250);
  const st = await economy.wheel({ uid: 'dup', data: { op: 'status' } });
  assert.deepEqual(st.owned, { 'avatar-wheel': true, 'back-wheel': true });
  // Three Cards: one play a UK week, the answer stays server-side, the prize under the pick is paid once.
  const M = CAT.monty;
  assert(M && M.big > Math.max(...M.small));
  put('users/m', { username: 'Mo', diamonds: 0 });
  setNow('2027-03-01T12:00:00Z');
  let m = await economy.monty({ uid: 'm', data: { op: 'status' } });
  assert(m.canPlay && !m.started && !m.result);
  const s1 = await economy.monty({ uid: 'm', data: { op: 'start' } });
  assert.equal(s1.swaps.length, M.swaps); assert.equal(s1.bigAt, 1);
  const s2 = await economy.monty({ uid: 'm', data: { op: 'start' } });
  assert.deepEqual(s2.swaps, s1.swaps, 'start again resumes the same shuffle');
  assert(!JSON.stringify(get('users/m') || {}).includes('final'), 'the answer is not on the player record');
  m = await economy.monty({ uid: 'm', data: { op: 'status' } });
  assert(m.started && m.swaps.length === M.swaps);
  const arr = [M.small[0], M.big, M.small[1]];
  const hidden = get('montyGames/m'); const ans = hidden.final;
  assert.deepEqual(ans.slice().sort(), arr.slice().sort());
  const bigPos = ans.indexOf(M.big);
  const pk = await economy.monty({ uid: 'm', data: { op: 'pick', index: bigPos } });
  assert.equal(pk.result.prize, M.big); assert.deepEqual(pk.result.reveal, ans);
  assert.equal(get('users/m/diamonds'), M.big);
  const again = await economy.monty({ uid: 'm', data: { op: 'pick', index: 0 } });
  assert(again.already && get('users/m/diamonds') === M.big, 'no second payout');
  assert((await economy.monty({ uid: 'm', data: { op: 'start' } })).canPlay === false);
  setNow('2027-03-09T12:00:00Z');
  assert((await economy.monty({ uid: 'm', data: { op: 'status' } })).canPlay, 'a new week opens a new game');
  await assert.rejects(() => economy.monty({ uid: 'm', data: { op: 'pick', index: 1 } }), /Start the game/);
  // Scratch Card: one card a UK day; a win shows exactly three of its symbol, a loss never shows three of any.
  const SC = CAT.scratch;
  assert.equal(SC.prizes.reduce((t, p) => t + p.weight, 0), 1000, 'scratch weights make 1000');
  SC.prizes.filter(p => p.kind === 'item').forEach(p => assert(CAT.earned[p.itemId] && CAT.earned[p.itemId].type === 'wheel', 'scratch item has a server rule'));
  const scAvg = SC.prizes.filter(p => p.kind === 'diamonds').reduce((t, p) => t + p.amount * p.weight / 1000, 0);
  assert(scAvg > 35 && scAvg < 50, `about 43 Diamonds a day (${scAvg})`);
  put('users/s', { username: 'Sy', diamonds: 0 });
  setNow('2027-04-01T12:00:00Z');
  let sc = await economy.scratch({ uid: 's', data: { op: 'status' } });
  assert(sc.canPlay && !sc.last);
  sc = await economy.scratch({ uid: 's', data: { op: 'play' } });
  assert.equal(sc.card.grid.length, 9); assert.equal(sc.canPlay, false);
  const paidOnce = get('users/s/diamonds');
  assert((await economy.scratch({ uid: 's', data: { op: 'play' } })).already, 'not twice in a UK day');
  assert.equal(get('users/s/diamonds'), paidOnce, 'no second payment');
  sc = await economy.scratch({ uid: 's', data: { op: 'status' } });
  assert(!sc.canPlay && sc.last.grid.length === 9, 'a reopened card shows the same grid');
  setNow('2027-04-02T12:00:00Z');
  assert((await economy.scratch({ uid: 's', data: { op: 'status' } })).canPlay, 'a new UK day');
  const tally = {}; let itemsWon = 0;
  for (let i = 0; i < 4000; i++) {
    put(`users/c${i}`, { username: 'C' + i, diamonds: 0 });
    const c = (await economy.scratch({ uid: `c${i}`, data: { op: 'play' } })).card;
    c.grid.forEach(x => assert(SC.symbols.includes(x)));
    const L = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const lines = L.filter(l => c.grid[l[0]] === c.grid[l[1]] && c.grid[l[1]] === c.grid[l[2]]);
    const prize = SC.prizes.find(p => p.id === c.prize);
    if (prize.symbol) { assert.equal(lines.length, 1, 'a win shows exactly one line'); assert.equal(c.grid[lines[0][0]], prize.symbol); }
    else assert.equal(lines.length, 0, 'a loss never shows a line');
    tally[c.prize] = (tally[c.prize] || 0) + 1;
    if (c.kind === 'item') { itemsWon++; assert(get(`users/c${i}/ownedCosmetics/${c.itemId}`), 'item owned'); assert(get(`users/c${i}/activityInbox/unlock_${c.itemId}`), 'unlock mail'); }
    else assert.equal(get(`users/c${i}/diamonds`), c.amount, 'Diamonds paid');
  }
  SC.prizes.forEach(p => assert(tally[p.id] > 0, `${p.id} came up in 4000 cards`));
  assert(tally.none > 2000 && tally.none < 2500, `about 56% no match (${tally.none})`);
  put('users/d', { username: 'Du', diamonds: 0, ownedCosmetics: { 'avatar-foil-ace': { cost: 0, purchasedAt: 1 }, 'back-foil-joker': { cost: 0, purchasedAt: 1 } } });
  let dupe = null; setNow('2027-05-01T12:00:00Z');
  for (let i = 0; i < 4000 && !dupe; i++) { put('users/d/scratch', null); put('users/d/diamonds', 0); const c = (await economy.scratch({ uid: 'd', data: { op: 'play' } })).card; if (c.kind === 'item') dupe = c; }
  assert(dupe && dupe.duplicate && get('users/d/diamonds') === SC.dupeDiamonds, 'an owned foil item pays Diamonds');
  console.log('wheel test passed');
})().catch(e => { console.error(e); process.exit(1); });
