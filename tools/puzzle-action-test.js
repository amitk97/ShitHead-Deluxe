// node tools/puzzle-action-test.js: the economy `puzzle` action on an in-memory database. Only a real
// solution pays, once per puzzle per UK week, only this week's puzzle (AmitK may play any).
const assert = require('assert');
const path = require('path');
const Module = require('module');
const tree = {};
const get = (p) => p.split('/').filter(Boolean).reduce((o, k) => (o == null ? o : o[k]), tree);
const setAt = (p, v) => { const ks = p.split('/').filter(Boolean), last = ks.pop(); let o = tree; ks.forEach(k => { o = o[k] = o[k] || {}; }); if (v === null) delete o[last]; else o[last] = v; };
const snap = (v) => ({ exists: () => v != null, val: () => (v == null ? null : JSON.parse(JSON.stringify(v))) });
const fakeDb = { ref: (p) => ({
  once: async () => snap(get(p)),
  set: async (v) => setAt(p, v), update: async (v) => Object.entries(v).forEach(([k, x]) => setAt(`${p}/${k}`, x)), remove: async () => setAt(p, null),
  transaction: async (fn) => { let out = fn(null); const cur = get(p) == null ? null : JSON.parse(JSON.stringify(get(p))); if (out === null || out === undefined) out = fn(cur); const committed = out !== undefined && out !== null; if (committed) setAt(p, out); return { committed, snapshot: snap(get(p)) }; },
  orderByChild: () => ({ startAfter: () => ({ limitToFirst: () => ({ once: async () => snap(null) }) }), equalTo: () => ({ once: async () => snap(null) }), limitToLast: () => ({ once: async () => snap(null) }) })
}) };
const orig = Module._load;
Module._load = function (req, ...a) { return req === 'firebase-admin' || req === 'firebase-admin/app' ? { initializeApp() {}, database: () => fakeDb, getApps: () => [1] } : orig.call(this, req, ...a); };
process.chdir(path.join(__dirname, '../functions'));
const eco = require('../functions/economy.js')._test;
const CAT = require('../functions/catalog.json');
const E = require('../functions/puzzle-engine.js');
(async () => {
  const week = eco.ukWeekKey(new Date()), pz = eco.puzzleOfWeek(week), other = CAT.puzzles.list.find(p => p.id !== pz.id);
  const solve = (p) => E.solve({ hand: p.hand, pile: p.pile, constraint: p.constraint, base: p.base }, 1, p.goal).solutions[0];
  const mk = (uid) => setAt(`users/${uid}`, { username: uid, diamonds: 10 });
  const call = (uid, data, email) => eco.actions.puzzle({ uid, auth: { token: { email, email_verified: true } }, data });
  mk('u1');
  // a wrong answer pays nothing, a real solution pays once
  await assert.rejects(() => call('u1', { id: pz.id, moves: [{ rank: '4', n: 1 }] }, 'a@b.c'), /do not solve/);
  const r1 = await call('u1', { id: pz.id, moves: solve(pz) }, 'a@b.c');
  assert.strictEqual(r1.awarded.reward, CAT.puzzles.reward.diamonds); assert.strictEqual(r1.diamonds, 10 + CAT.puzzles.reward.diamonds);
  assert.ok(get(`users/u1/completedChallenges/puzzle_${week}_${pz.id}`), 'recorded as a completed challenge');
  const r2 = await call('u1', { id: pz.id, moves: solve(pz) }, 'a@b.c');
  assert.ok(r2.already && !r2.awarded && r2.diamonds === r1.diamonds, 'second solve pays nothing');
  // another puzzle is refused for a normal player, allowed for AmitK
  await assert.rejects(() => call('u1', { id: other.id, moves: solve(other) }, 'a@b.c'), /not this week/);
  await assert.rejects(() => call('u1', { id: 'nope', moves: [] }, 'a@b.c'), /Unknown puzzle/);
  mk('amit');
  const r3 = await call('amit', { id: other.id, moves: solve(other) }, 'amirk2197@googlemail.com');
  assert.ok(r3.awarded, 'AmitK can claim any puzzle');
  // a replayed solution with a bigger count than the Hand holds is refused
  const bad = solve(pz).map((m, i) => (i === 0 ? { ...m, n: m.n + 4 } : m));
  mk('u2');
  await assert.rejects(() => call('u2', { id: pz.id, moves: bad }, 'a@b.c'), /do not solve/);
  assert.strictEqual(get('users/u2/diamonds'), 10);
  // with XP on, the solve also pays XP_RULES.puzzle (boosted in a seasonal event)
  require('../functions/xp.js').resetCache(); setAt('config/features/xp', true);
  mk('u3');
  const r4 = await call('u3', { id: pz.id, moves: solve(pz) }, 'a@b.c');
  const boost = require('../functions/xp.js').boostEvent(Date.now()) ? CAT.xp.seasonalBoost : 1;
  assert.strictEqual(r4.xp.gained, Math.round(CAT.xp.puzzle * boost), 'XP paid');
  console.log('PASS puzzle action', pz.id, 'week', week);
})().catch((e) => { console.error(e); process.exit(1); });
