// AmitK dev tools: devPlayers lists accounts, devGrantDiamonds pays and mails a player (AmitK only).
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
(async () => {
  const economy = require('../functions/economy')._test.actions;
  const amit = { token: { email: 'amirk2197@googlemail.com', email_verified: true } };
  const other = { token: { email: 'someone@example.com', email_verified: true } };
  put('users/user001', { username: 'Zed', diamonds: 10 });
  await assert.rejects(() => economy.devGrantLucky({ auth: other, data: { to: 'user001', wheel: 1 } }), /not available/);
  await assert.rejects(() => economy.devGrantLucky({ auth: amit, data: { to: 'user001' } }), /at least one/);
  await economy.devGrantLucky({ auth: amit, data: { to: 'user001', wheel: 2, scratch: 1, monty: 1, drops: 15 } });
  assert.equal(get('users/user001/dropzone/cards'), 16, 'cards go above the cap');
  assert.equal(Object.values(get('users/user001/activityInbox'))[0].type, 'lucky');
  const uid = 'user001', data = { op: 'spin' };
  assert.equal((await economy.wheel({ uid, data: { op: 'status' } })).canSpin, true);
  const a = await economy.wheel({ uid, data }); assert.ok(a.spin && a.canSpin, 'free spin, extras left');
  const b = await economy.wheel({ uid, data }); assert.ok(b.spin && b.canSpin, 'first extra');
  const c = await economy.wheel({ uid, data }); assert.ok(c.spin && !c.canSpin, 'second extra, none left');
  const d = await economy.wheel({ uid, data }); assert.ok(d.already, 'then the day is done');
  const s1 = await economy.scratch({ uid, data: { op: 'play' } }); assert.ok(s1.card && s1.canPlay);
  const s2 = await economy.scratch({ uid, data: { op: 'play' } }); assert.ok(s2.card && !s2.canPlay);
  assert.ok((await economy.scratch({ uid, data: { op: 'play' } })).already);
  const st = await economy.monty({ uid, data: { op: 'start' } }); assert.ok(st.swaps);
  const pk = await economy.monty({ uid, data: { op: 'pick', index: 0 } }); assert.ok(pk.result && pk.canPlay, 'extra left after the free game');
  const st2 = await economy.monty({ uid, data: { op: 'start' } }); assert.ok(st2.swaps, 'the extra game starts');
  const pk2 = await economy.monty({ uid, data: { op: 'pick', index: 1 } }); assert.ok(pk2.result && !pk2.canPlay);
  assert.equal((await economy.monty({ uid, data: { op: 'start' } })).canPlay, false, 'then done for the week');
  console.log('PASS: AmitK can grant extra Lucky Games goes; each is used after the free go, then it stops');
})().catch(e => { console.error(e); process.exit(1); });
