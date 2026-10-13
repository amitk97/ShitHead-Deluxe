// node tools/puzzles-test.js: every weekly puzzle has one or two winning lines, the week picks rotate, AmitK sees all.
const assert = require('assert');
global.window = global; global.document = { addEventListener() {}, getElementById() { return null; } };
global.localStorage = { getItem() { return null; }, setItem() {} };
window.ShPuzzleEngine = require('../js/puzzle-engine.js');
global.currentUser = { email: 'amirk2197@googlemail.com' };
global.isAmitkTestingAccount = (p = {}) => String(p.username || '').toLowerCase() === 'amitk' || String(currentUser?.email || '').toLowerCase() === 'amirk2197@googlemail.com';
global.getUkWeekKey = () => '2026-W42';
require('../js/puzzles.js');
const E = window.ShPuzzleEngine, P = window.ShPuzzles;
const tierNodes = [];
for (const p of P.PUZZLES) {
  assert.ok(p.hand.length >= 5 && p.hand.length <= 8, p.id + ' hand size');
  const { solutions, nodes } = E.solve({ hand: p.hand, pile: p.pile, constraint: p.constraint, base: p.base }, 5);
  assert.ok(solutions.length >= 1 && solutions.length <= 2, `${p.id} has ${solutions.length} solutions`);
  assert.ok(p.hand.length + p.pile.length > 0 && ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].every(r => p.hand.concat(p.pile).filter(x => x === r).length <= 4), p.id + ' no more than four of a rank');
  // dealt cards never repeat rank+suit
  const d = P.dealCards(p), ids = d.hand.concat(d.pile).map(c => c.rank + c.suit);
  assert.strictEqual(new Set(ids).size, ids.length, p.id + ' duplicate card');
  tierNodes.push(nodes);
}
// harder tiers search more (not strictly, but the last is harder than the first)
assert.ok(tierNodes[4] > tierNodes[0], 'tier 5 is harder than tier 1');
assert.deepStrictEqual(P.PUZZLES.map(p => p.tier), [1, 2, 3, 4, 5]);
// the week picks rotate through all five, one a week
const seen = new Set(); for (let w = 1; w <= 5; w++) seen.add(P.puzzleIndexForWeek('2026-W' + String(w).padStart(2, '0')));
assert.strictEqual(seen.size, 5);
// AmitK (a test account) always has all five; everyone else only this week's
assert.strictEqual(P.availablePuzzles().length, 5);
global.currentUser = { email: 'someone@example.com' };
assert.strictEqual(P.availablePuzzles().length, 1);
global.currentUser = null;
assert.strictEqual(P.availablePuzzles().length, 1);
// engine spot checks of the rules the puzzles lean on
assert.ok(E.play({ hand: ['3'], pile: ['8'], constraint: null, base: null }, '3', 1).again, '3 over an 8 skips');
assert.ok(E.play({ hand: ['5'], pile: ['8', 'J'], constraint: 'ODD', base: null }, '5', 1).again, '5 on a base 8 skips');
assert.ok(!E.play({ hand: ['5'], pile: ['9'], constraint: null, base: null }, '5', 1).again, '5 on a base 9 does not');
assert.ok(!E.legal('3', { hand: [], pile: ['6'], constraint: 'EVEN', base: null }), '3 on a 6 is refused');
console.log('PASS puzzles', tierNodes.join(','));
