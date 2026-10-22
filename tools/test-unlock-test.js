// AmitK test switch: economy `testUnlock` grants every cosmetic as server-only `testOwned`, notes what was owned and worn
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
  const economy = require('../functions/economy')._test.actions;
  const CAT = require('../functions/catalog.json');
  const amit = { token: { email: 'amirk2197@googlemail.com', email_verified: true } };
  const other = { token: { email: 'someone@example.com', email_verified: true } };
  const all = CAT.allCosmeticIds;
  assert(all.length > 200 && all.includes('avatar-twos') && all.includes('back-lvl-inferno') && all.includes('burn-ss2611-sandstorm'), 'the catalog lists every item');
  assert(!all.some(id => CAT.builtIn.includes(id)), 'free built-in items are not listed');
  put('users/amit', { username: 'AmitK', diamonds: 5,
    ownedCosmetics: { [all[0]]: { cost: 0, purchasedAt: 1 }, [all[1]]: { cost: 0, purchasedAt: 1 } },
    equippedCosmetics: { avatar: all[0], cardBack: 'default' } });
  await assert.rejects(() => economy.testUnlock({ uid: 'amit', auth: other, data: { on: true } }), /not available/, 'only AmitK');
  assert.equal(get('users/amit/testOwned'), null);
  let r = await economy.testUnlock({ uid: 'amit', auth: amit, data: { on: true } });
  assert.equal(r.granted, all.length - 2, 'everything not owned is granted');
  assert.equal(Object.keys(get('users/amit/testOwned')).length, all.length - 2);
  assert(!get('users/amit/testOwned')[all[0]], 'what is already owned is not listed as a test unlock');
  assert.deepEqual(get('users/amit/testUnlock/ownedBefore').sort(), [all[0], all[1]].sort(), 'a note of what was owned before');
  assert.equal(get('users/amit/testUnlock/equippedBefore/avatar'), all[0], 'and of what was worn');
  assert.equal(Object.keys(get('users/amit/ownedCosmetics')).length, 2, 'real ownership is not touched');
  r = await economy.testUnlock({ uid: 'amit', auth: amit, data: { on: true } });
  assert.equal(r.granted, 0, 'on twice does nothing');
  // While on: a real purchase of a test item, and wearing test items.
  const bought = all[5], worn = all[7];
  put('users/amit/ownedCosmetics/' + bought, { cost: 10, purchasedAt: 2 });
  put('users/amit/equippedCosmetics/cardBack', worn);
  put('users/amit/equippedCosmetics/tableTheme', bought);
  r = await economy.testUnlock({ uid: 'amit', auth: amit, data: { on: false } });
  assert.equal(get('users/amit/testOwned'), null, 'turning off relocks everything');
  assert(get('users/amit/ownedCosmetics/' + bought), 'a real purchase stays');
  assert.equal(get('users/amit/equippedCosmetics/cardBack'), 'default', 'a worn test item goes back to the earlier look');
  assert.equal(get('users/amit/equippedCosmetics/tableTheme'), bought, 'a really owned item stays worn');
  assert.equal(get('users/amit/equippedCosmetics/avatar'), all[0], 'the earlier avatar is untouched');
  assert.equal(r.restored.cardBack, 'default');
  assert.equal(get('users/amit/testUnlock/on'), false);
  r = await economy.testUnlock({ uid: 'amit', auth: amit, data: { on: false } });
  assert.equal(r.relocked, 0, 'off twice does nothing');
  console.log('test unlock test passed');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => { global.Date = RealDate; require.cache[adminPath].exports = realAdmin; });
