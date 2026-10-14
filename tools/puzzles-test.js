// node tools/puzzles-test.js: every weekly puzzle has one or two winning lines, the week picks rotate, AmitK sees all.
const assert = require('assert');
global.window = global; global.addEventListener = () => {}; global.requestAnimationFrame = () => {}; global.document = { addEventListener() {}, getElementById() { return null; }, querySelectorAll() { return []; } };
global.localStorage = { getItem() { return null; }, setItem() {} };
window.ShPuzzleEngine = require('../js/puzzle-engine.js');
global.currentUser = { email: 'amirk2197@googlemail.com' };
global.isAmitkTestingAccount = (p = {}) => String(p.username || '').toLowerCase() === 'amitk' || String(currentUser?.email || '').toLowerCase() === 'amirk2197@googlemail.com';
global.getUkWeekKey = () => '2026-W42';
require('../js/puzzles.js');
const E = window.ShPuzzleEngine, P = window.ShPuzzles;
const tierNodes = [];
for (const p of P.PUZZLES) {
  assert.ok(p.hand.length >= (p.zone === 'faceDown' ? 3 : 4) && p.hand.length <= 8, p.id + ' hand size');
  assert.ok(!p.zone || ['faceUp', 'faceDown'].includes(p.zone), p.id + ' zone');
  assert.ok(p.zone !== 'faceDown' || (p.hand.length === 3 && p.goal.single), p.id + ' face-down: three cards, one per play');
  assert.ok(p.goal.type !== 'joker' || (p.hand.filter(r => r === 'JOKER').length === 1 && p.goal.min > p.pile.length), p.id + ' one Joker, a pickup above the Pile');
  const { solutions, nodes } = E.solve({ hand: p.hand, pile: p.pile, constraint: p.constraint, base: p.base }, 5, p.goal);
  assert.ok(solutions.length >= 1 && solutions.length <= 2, `${p.id} has ${solutions.length} solutions`);
  assert.ok(p.hand.length + p.pile.length > 0 && ['2','3','4','5','6','7','8','9','10','J','Q','K','A'].every(r => p.hand.concat(p.pile, p.goal.rival || []).filter(x => x === r).length <= 4), p.id + ' no more than four of a rank');
  // dealt cards never repeat rank+suit
  const d = P.dealCards(p), ids = d.hand.concat(d.pile).map(c => c.rank + c.suit);
  assert.strictEqual(new Set(ids).size, ids.length, p.id + ' duplicate card');
  tierNodes.push(nodes);
}
// harder tiers search more (not strictly, but the last is harder than the first)
assert.ok(tierNodes[4] > tierNodes[0], 'tier 5 is harder than tier 1');
assert.deepStrictEqual(P.PUZZLES.map(p => p.goal.type), ['out', 'out', 'out', 'out', 'out', 'burn', 'pickup', 'pickup', 'out', 'out', 'pickup', 'out', 'out', 'out', 'burn', 'pickup', 'pickup', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'out', 'joker', 'joker', 'joker', 'joker', 'out', 'out', 'out', 'out', 'trap', 'trap', 'trap', 'out', 'out', 'out', 'out', 'out', 'trap', 'trap'], 'goal types');
assert.strictEqual(new Set(P.PUZZLES.map(p => p.id)).size, P.PUZZLES.length, 'unique ids');
assert.strictEqual(new Set(P.PUZZLES.map(p => JSON.stringify([p.hand, p.pile, p.goal]))).size, P.PUZZLES.length, 'no duplicate positions');
assert.ok(P.PUZZLES.every(p => p.hint && p.title && p.hint.length > 30), 'every puzzle has a title and a hint');
assert.ok(P.PUZZLES.every(p => p.tier >= 1 && p.tier <= 5 && P.goalText(p).length > 20));
assert.ok(P.PUZZLES.filter(p => p.goal.type === 'pickup').every(p => p.goal.rival.length >= 3), 'rival hands shown');
assert.ok(P.PUZZLES.filter(p => p.goal.maxPlays).length >= 2, 'some puzzles cap the plays');
// the week picks rotate through all five, one a week
const seen = new Set(); for (let w = 1; w <= P.PUZZLES.length; w++) seen.add(P.puzzleIndexForWeek('2026-W' + String(w).padStart(2, '0')));
assert.strictEqual(seen.size, P.PUZZLES.length);
// AmitK (a test account) always has all five; everyone else only this week's
assert.strictEqual(P.availablePuzzles().length, P.PUZZLES.length);
global.currentUser = { email: 'someone@example.com' };
assert.strictEqual(P.availablePuzzles().length, 1);
global.currentUser = null;
assert.strictEqual(P.availablePuzzles().length, 1);
// engine spot checks of the rules the puzzles lean on
assert.ok(E.play({ hand: ['3'], pile: ['8'], constraint: null, base: null }, '3', 1).again, '3 over an 8 skips');
assert.ok(E.play({ hand: ['5'], pile: ['8', 'J'], constraint: 'ODD', base: null }, '5', 1).again, '5 on a base 8 skips');
assert.ok(!E.play({ hand: ['5'], pile: ['9'], constraint: null, base: null }, '5', 1).again, '5 on a base 9 does not');
assert.ok(!E.legal('3', { hand: [], pile: ['6'], constraint: 'EVEN', base: null }), '3 on a 6 is refused');
// goal checks: a burn goal is met by a 10, a maxPlays cap bites, a pickup needs the Rival stuck
assert.strictEqual(E.solve({ hand: ['10'], pile: ['K'], constraint: null, base: null }, 5, { type: 'burn' }).solutions.length, 1);
assert.strictEqual(E.solve({ hand: ['5', '10'], pile: ['8', 'J'], constraint: 'ODD', base: null }, 5, { type: 'burn', maxPlays: 1 }).solutions.length, 0, 'cap of one play');
assert.strictEqual(E.solve({ hand: ['5', '10'], pile: ['8', 'J'], constraint: 'ODD', base: null }, 5, { type: 'burn', maxPlays: 2 }).solutions.length, 1);
assert.ok(E.rivalStuck({ hand: [], pile: ['7'], constraint: 'LOW7', base: null }, ['J', '10', 'A']), 'LOW7 stops J, 10 and A');
assert.ok(!E.rivalStuck({ hand: [], pile: ['7'], constraint: 'LOW7', base: null }, ['4']));
// Joker + single-card rules: the Joker leaves the Pile to the Rival, one card per flip
const J = (hand, pile, goal, c = null) => E.solve({ hand, pile, constraint: c, base: null }, 5, goal).solutions.length;
assert.ok(J(['8', '8', 'JOKER'], ['7'], { type: 'joker', min: 3 }) >= 1 && J(['8', '8', 'JOKER'], ['7'], { type: 'joker', min: 4 }) === 0, 'Joker pickup counts the Pile only');
assert.strictEqual(E.play({ hand: ['JOKER'], pile: ['K', 'K'], constraint: null, base: null }, 'JOKER', 1).pickup, 2);
assert.ok(E.legal('JOKER', { hand: [], pile: ['7'], constraint: 'LOW7', base: null }), 'Joker goes on anything');
assert.ok(J(['8', '8', '3'], ['7'], { type: 'out', single: true }) >= 1 && J(['8', '8', '3'], ['7'], { type: 'out' }) > J(['8', '8', '3'], ['7'], { type: 'out', single: true }), 'single plays leave out the pairs');
assert.ok(!E.verify({ hand: ['8', '8', '3'], pile: ['7'], constraint: null, base: null }, { type: 'out', single: true }, [{ rank: '8', n: 2 }, { rank: '3', n: 1 }]), 'a single-card goal refuses two cards');
// End-on-a-4 and the two-turn trap
assert.strictEqual(E.solve({ hand: ['10', '4'], pile: ['9'], constraint: null, base: null }, 5, { type: 'out', last: '4' }).solutions.length, 1);
assert.strictEqual(E.solve({ hand: ['4', '10'], pile: ['9'], constraint: null, base: null }, 5, { type: 'out', last: '10' }).solutions.length, 0, 'the 4 cannot end it on a 10 goal here');
const trap = { type: 'trap', rival: ['A', 'Q', '9', '5'] }, tp = { hand: ['K', '3', '7', '9'], pile: ['5'], constraint: null, base: null };
assert.ok(E.verify(tp, trap, [{ rank: 'K', n: 1 }, { rank: '3', n: 1 }]), 'K ends turn one, the Rival must play their Ace, the 3 traps them');
assert.ok(!E.verify(tp, trap, [{ rank: 'K', n: 1 }]), 'one turn is not enough');
assert.ok(!E.verify(tp, trap, [{ rank: '7', n: 1 }, { rank: '9', n: 1 }]), 'a Rival with a legal answer is not trapped');
assert.deepStrictEqual(E.rivalTurn({ hand: [], pile: ['K'], constraint: null, base: null }, ['A', 'Q', '9']).plays, [{ rank: 'A', n: 1, burn: false }], 'the Rival plays their weakest legal rank');
// several turns: the Rival answers between them (or picks the Pile up when stuck) and the line must still empty the Hand
const lg = { type: 'out', turns: 2, rival: ['A', '9', '5'] }, lp = { hand: ['K', '4', '6', '9'], pile: ['5'], constraint: null, base: null };
assert.ok(E.solve(lp, 5, { type: 'out' }).solutions.length === 0, 'cannot be done in one turn');
assert.ok(P.PUZZLES.filter(p => p.goal.turns > 1).length >= 5, 'several multi-turn puzzles');
assert.ok(P.PUZZLES.filter(p => p.goal.turns > 1).every(p => E.solve({ hand: p.hand, pile: p.pile, constraint: p.constraint, base: p.base }, 1, { type: p.goal.type, rival: p.goal.rival, turns: p.goal.turns - 1 }).solutions.length === 0), 'every multi-turn puzzle needs all its turns');
// verify(): the server's replay of a player's moves
const ok = (p, moves) => E.verify({ hand: p.hand, pile: p.pile, constraint: p.constraint || null, base: p.base || null }, p.goal, moves);
for (const p of P.PUZZLES) {
  const sol = E.solve({ hand: p.hand, pile: p.pile, constraint: p.constraint, base: p.base }, 5, p.goal).solutions;
  sol.forEach(s => assert.ok(ok(p, s), p.id + ' its own solution verifies'));
  assert.ok(!ok(p, []), 'no moves');
  assert.ok(!ok(p, [{ rank: 'A', n: 9 }]), 'more cards than held');
  assert.ok(!ok(p, [...sol[0], sol[0][0]]), p.id + ' extra move after the goal');
  if (sol[0].length > 1) assert.ok(!ok(p, sol[0].slice(0, -1)), p.id + ' stopping early is not a win');
  assert.ok(!ok(p, sol[0].map(m => ({ ...m, n: m.n + 0.5 }))), 'fractional counts');
}
// a catalog entry exists for each puzzle and the server's copy of the engine is the same file
const fs = require('fs'), path = require('path');
const page = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8'), sw = fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8');
for (const f of ['js/puzzle-engine.js', 'js/puzzles.js', 'css/puzzles.css']) {
  assert.ok(new RegExp(f.replace('.', '\\.') + '\\?v=[0-9a-f]{12}"').test(page), f + ' is hash-stamped in index.html (node tools/stamp-assets.js)');
  assert.ok(sw.length > 5000 && sw.includes(f + '?v='), f + ' is listed in sw.js');
}
assert.strictEqual(fs.readFileSync(path.join(__dirname, '../functions/puzzle-engine.js'), 'utf8'), fs.readFileSync(path.join(__dirname, '../js/puzzle-engine.js'), 'utf8'), 'functions/puzzle-engine.js must equal js/puzzle-engine.js (cp it)');
const cat = require('../functions/catalog.json').puzzles;
assert.deepStrictEqual(cat, JSON.parse(JSON.stringify(P.catalog())), 'catalog.puzzles matches the game (node tools/export-catalog.js)');
assert.ok(cat.reward.diamonds > 0 && require('../functions/catalog.json').xp.puzzle > 0, 'rewards are set');
console.log('PASS puzzles', tierNodes.join(','));
