// Candidate puzzles for the Face-Up, Face-Down and Joker kinds (v356).
//   node tools/puzzle-search-zones.js faceup|facedown|joker   → prints the hardest, writes <scratch>/zones-<mode>.json
// faceup: 3-4 cards, any plays; facedown: exactly 3 cards, one per play; joker: a JOKER + 4-6 cards, goal = the biggest pickup.
const E = require('../js/puzzle-engine.js');
const mode = process.argv[2] || 'faceup';
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = E.ORDER.filter(x => x !== 'JOKER');
// biggest pickup reachable by playing the Joker last (go-again plays only)
function best(pos, memo = new Map()) {
  const k = pos.hand.slice().sort().join('') + '|' + pos.pile.join(',') + '|' + pos.constraint + '|' + pos.base;
  if (memo.has(k)) return memo.get(k);
  let b = -1;
  for (const m of E.moves(pos)) {
    const r = E.play(pos, m.rank, m.n);
    if (r.joker) b = Math.max(b, r.pickup); else if (r.again && r.pos.hand.length) b = Math.max(b, best(r.pos, memo));
  }
  memo.set(k, b); return b;
}
const found = [];
for (let seed = 1; seed <= 400000; seed++) {
  const r = rng(seed), pool = []; R.forEach(x => { for (let i = 0; i < 4; i++) pool.push(x); });
  const pick = () => pool.splice(Math.floor(r() * pool.length), 1)[0];
  let pos = { hand: [], pile: [], constraint: null, base: null };
  const pl = mode === 'joker' ? Math.floor(r() * 4) : 2 + Math.floor(r() * 4);
  for (let i = 0; i < pl; i++) {
    const c = R.filter(x => x !== '10' && E.legal(x, pos)), x = c[Math.floor(r() * c.length)], q = E.play(pos, x, 1);
    if (q.burn) break; pool.splice(pool.indexOf(x), 1); pos = q.pos;
  }
  const size = mode === 'facedown' ? 3 : mode === 'faceup' ? 3 + Math.floor(r() * 2) : 4 + Math.floor(r() * 3);
  for (let i = 0; i < size; i++) pos.hand.push(pick());
  let goal = mode === 'facedown' ? { type: 'out', single: true } : { type: 'out' };
  if (mode === 'joker') {
    pos.hand.push('JOKER'); const b = best(pos); if (b < 0) continue;
    const quick = pos.pile.length; if (b < quick + 3) continue;
    goal = { type: 'joker', min: b };
  }
  const { solutions, nodes } = E.solve(pos, 5, goal);
  if (solutions.length >= 1 && solutions.length <= 2) found.push({ seed, pos, goal, sol: solutions, nodes, len: solutions[0].length });
}
console.log(found.length);
found.sort((a, b) => b.nodes - a.nodes);
for (const f of found.slice(0, 25)) console.log(f.seed, f.nodes, f.len, f.sol.length, 'hand', f.pos.hand.join(' '), '| pile', f.pos.pile.join(' '), f.pos.constraint || '', f.pos.base || '', f.goal.min ? '| min ' + f.goal.min : '', JSON.stringify(f.sol[0].map(m => m.n + 'x' + m.rank)));
require('fs').writeFileSync(`${process.env.TMPDIR || '/tmp/claude-0/-home-user-ShitHead-Deluxe/e6cf8966-43a2-5750-87a3-1dc2b22b7d54/scratchpad'}/zones-${mode}.json`, JSON.stringify(found));
