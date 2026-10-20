// node tools/season-pass-test.js: Season Pass tiers pay Diamonds and items at once; unboosted, in season only.
const assert = require('assert');
const Module = require('module');
const orig = Module._load;
Module._load = function (req, ...a) { return req === 'firebase-admin' ? { database: () => ({}) } : orig.call(this, req, ...a); };
const xp = require('../functions/xp.js');
const sp = require('../functions/season-pass.js');
const ms = (d) => Date.parse(d + 'T12:00:00Z');
let paid = 0; const pay = (u, n) => { paid += n; u.diamonds = (u.diamonds || 0) + n; };
assert.strictEqual(sp.tierStart(10), 2500); assert.strictEqual(sp.tierStart(50), 20000);
assert.strictEqual(sp.seasonOn('2026-10-31'), null); assert.strictEqual(sp.seasonOn('2026-11-01'), '2026-11'); assert.strictEqual(sp.seasonOn('2026-12-31'), '2026-11'); assert.strictEqual(sp.seasonOn('2027-01-01'), '2027-01'); assert.strictEqual(sp.seasonOn('2027-02-28'), '2027-01'); assert.strictEqual(sp.seasonOn('2027-03-01'), '2027-03'); assert.strictEqual(sp.seasonOn('2027-04-30'), '2027-03'); assert.strictEqual(sp.seasonOn('2027-05-01'), '2027-05'); assert.strictEqual(sp.seasonOn('2027-06-30'), '2027-05'); assert.strictEqual(sp.seasonOn('2027-07-01'), '2027-07'); assert.strictEqual(sp.seasonOn('2027-08-31'), '2027-07'); assert.strictEqual(sp.seasonOn('2027-09-01'), '2027-09'); assert.strictEqual(sp.seasonOn('2027-10-31'), '2027-09'); assert.strictEqual(sp.seasonOn('2027-11-01'), null);
// off-season: nothing
const off = {}; assert.ok(!xp.award(off, [['finish', 500]], ms('2026-10-31'), pay).seasonPass); assert.ok(!off.seasonPass);
// in season: 2,500 XP = tier 10, 10 x 15 + the 5th (60 instead of 15) and 10th (50) bonuses
const u = {}; paid = 0;
const r = xp.award(u, [['win', 2500]], ms('2026-11-02'), pay);
assert.strictEqual(r.seasonPass.tier, 10); assert.strictEqual(u.seasonPass['2026-11'].xp, 2500);
assert.strictEqual(paid - (r.levelUps || []).reduce((s, l) => s + l.reward, 0), 8 * 15 + 60 + 50);
assert.ok(u.ownedCosmetics['back-ss2611-scarab'], 'tier 10 card back granted at once');
assert.ok(u.activityInbox['unlock_back-ss2611-scarab']);
assert.ok(!u.ownedCosmetics['avatar-ss2611-pharaoh']);
// unboosted during an event is not in this window, but backfill never counts
const bf = { matchCounters: { finished: 100 } }; xp.backfill(bf, ms('2026-11-02'), pay); assert.ok(!bf.seasonPass, 'back-dated XP does not fill the pass');
// the whole pass, once; the cap holds
const big = {}; paid = 0; const rb = xp.award(big, [['x', 30000]], ms('2026-12-31'), pay);
assert.strictEqual(rb.seasonPass.tier, 50); assert.strictEqual(big.seasonPass['2026-11'].xp, 20000);
['back-ss2611-scarab', 'avatar-ss2611-pharaoh', 'table-ss2611-egypt'].forEach((id) => assert.ok(big.ownedCosmetics[id], id));
assert.strictEqual(rb.seasonPass.tiers.length, 50);
assert.strictEqual(xp.award(big, [['x', 100]], ms('2026-12-31'), pay).seasonPass.tiers.length, 0, 'past tier 50 nothing more');
// repair
const miss = { seasonPass: { '2026-11': { xp: 9000, tier: 30 } } };
assert.deepStrictEqual(sp.grantReached(miss, ms('2026-12-01')).sort(), ['avatar-ss2611-pharaoh', 'back-ss2611-scarab']);
assert.deepStrictEqual(sp.mailsDue('2026-10-31'), [{ key: '2026-11', when: 'start' }]);
assert.deepStrictEqual(sp.mailsDue('2026-12-30'), [{ key: '2026-11', when: 'end' }]);
assert.deepStrictEqual(sp.mailsDue('2026-11-15'), []); assert.deepStrictEqual(sp.mailsDue('2026-10-30'), []);
console.log('PASS season pass');
// Season 2 (Ice Age): its own tier track and items, same rules
const s2 = {}; const r2 = xp.award(s2, [['win', 2500]], ms('2027-01-05'), pay);
assert.strictEqual(r2.seasonPass.key, '2027-01'); assert.strictEqual(r2.seasonPass.tier, 10);
assert.ok(s2.ownedCosmetics['back-ss2701-mammoth'], 'Season 2 tier 10 card back'); assert.ok(!s2.ownedCosmetics['back-ss2611-scarab']);
assert.deepStrictEqual(sp.mailsDue('2026-12-31'), [{ key: '2027-01', when: 'start' }]);
console.log('season 2 ok');
// Origami Fold is a Season 3 tier 20 reward only (not tier 50, not other seasons)
const fo1 = {}; sp.add(fo1, 20000, ms('2026-12-31'), pay); assert.ok(!fo1.ownedCosmetics['burn-origami'], 'no Origami in Season 1');
const f2 = {}; const rO = xp.award(f2, [['x', 7000]], ms('2027-03-10'), pay); assert.ok(f2.ownedCosmetics['burn-origami'], 'Season 3 tier 20 gives Origami Fold');
assert.ok(rO.seasonPass.tiers.find(t => t.tier === 20).item.id === 'burn-origami');
const f3 = { seasonPass: { '2027-03': { xp: 7000, tier: 20 } } }; sp.grantReached(f3, ms('2027-03-11')); assert.ok(f3.ownedCosmetics['burn-origami'], 'a missed Origami is repaired at sign-in');
console.log('origami ok');
// AmitK test account: every season's pass items at once
{ const a = {}; sp.grantAll(a, ms('2026-10-20')); ['back-ss2611-scarab', 'avatar-ss2705-octopus', 'table-ss2703-shrine', 'burn-origami'].forEach(id => assert.ok(a.ownedCosmetics[id], id)); console.log('grantAll ok'); }
// Tier 40 of every season gives that season's burn
{ const keys = { '2026-11': ['2026-11-02', 'burn-ss2611-sandstorm'], '2027-01': ['2027-01-02', 'burn-ss2701-glacier'], '2027-03': ['2027-03-02', 'burn-ss2703-shuriken'], '2027-05': ['2027-05-02', 'burn-ss2705-whirlpool'], '2027-07': ['2027-07-02', 'burn-ss2707-zeus'], '2027-09': ['2027-09-02', 'burn-ss2709-hex'] };
  Object.values(keys).forEach(([day, id]) => { const u = {}; const r = xp.award(u, [['x', 15000]], ms(day), pay); assert.ok(u.ownedCosmetics[id], id); assert.strictEqual(r.seasonPass.tiers.find(t => t.tier === 40).item.id, id); });
  const none = {}; xp.award(none, [['x', 15000]], ms('2026-11-02'), pay); assert.ok(!none.ownedCosmetics['burn-ss2701-glacier']); console.log('burns ok'); }
