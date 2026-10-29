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
const RealDate = Date;
const setNow = (iso) => { const t = new RealDate(iso).getTime(); global.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; };
(async () => {
  const economy = require('../functions/economy')._test.actions;
  const amit = { token: { email: 'amirk2197@googlemail.com', email_verified: true } };
  const other = { token: { email: 'someone@example.com', email_verified: true } };
  put('publicProfiles/user001', { username: 'Zed', level: 4 }); put('publicProfiles/user002', { username: 'amy', level: 9 });
  put('users/user001', { username: 'Zed', diamonds: 10 });
  await assert.rejects(() => economy.devPlayers({ auth: other }), /not available/);
  const r = await economy.devPlayers({ auth: amit });
  assert.deepEqual(r.players.map(p => p.name), ['amy', 'Zed'], 'sorted, case-insensitive');
  await assert.rejects(() => economy.devGrantDiamonds({ auth: other, data: { to: 'user001', amount: 5 } }), /not available/);
  await assert.rejects(() => economy.devGrantDiamonds({ auth: amit, data: { to: 'user001', amount: 0 } }), /Amount/);
  await assert.rejects(() => economy.devGrantDiamonds({ auth: amit, data: { to: 'user001', amount: 100001 } }), /Amount/);
  const g = await economy.devGrantDiamonds({ auth: amit, data: { to: 'user001', amount: 250, note: 'Thanks for testing' } });
  assert.equal(g.diamonds, 260); assert.equal(get('users/user001/diamonds'), 260);
  const mail = Object.values(get('users/user001/activityInbox'))[0];
  assert.equal(mail.type, 'diamonds'); assert.equal(mail.amount, 250); assert.equal(mail.note, 'Thanks for testing');
  console.log('PASS: dev tools list players and grant Diamonds with a mail, AmitK only');
})().catch(e => { console.error(e); process.exit(1); });
