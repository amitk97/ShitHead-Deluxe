// Finds candidate puzzles: random Hands and Piles with exactly one or two winning lines.
//   node tools/puzzle-search.js [out|burn|pickup] [maxPlays]   → prints the hardest, writes /tmp/found-<goal>.json
// Curate by hand, then add the best to PUZZLES in js/puzzles.js (node tools/puzzles-test.js checks them).
const E = require('../js/puzzle-engine.js');
const type = process.argv[2] || 'out', maxPlays = Number(process.argv[3]) || 0;
function rng(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const found = [];
for (let seed = 1; seed <= 300000; seed++) {
  const r = rng(seed), R = E.ORDER, pool = [];
  R.forEach(x => { for (let i = 0; i < 4; i++) pool.push(x); });
  const pick = () => pool.splice(Math.floor(r() * pool.length), 1)[0];
  let pos = { hand: [], pile: [], constraint: null, base: null };
  const pl = (type === 'out' ? 0 : 1) + Math.floor(r() * 5);
  for (let i = 0; i < pl; i++) {
    const c = R.filter(x => x !== '10' && E.legal(x, pos)), x = c[Math.floor(r() * c.length)], q = E.play(pos, x, 1);
    if (q.burn) break; pool.splice(pool.indexOf(x), 1); pos = q.pos;
  }
  const hs = 5 + Math.floor(r() * 3); pos.hand = []; for (let i = 0; i < hs; i++) pos.hand.push(pick());
  const goal = { type }; if (maxPlays) goal.maxPlays = maxPlays;
  if (type === 'pickup') { goal.rival = []; for (let i = 0; i < 3 + Math.floor(r() * 2); i++) goal.rival.push(pick()); }
  const { solutions, nodes } = E.solve(pos, 5, goal);
  if (solutions.length >= 1 && solutions.length <= 2) found.push({ seed, pos, goal, sol: solutions, nodes, len: solutions[0].length });
}
console.log(found.length);
found.sort((a, b) => b.nodes - a.nodes);
for (const f of found.slice(0, 15)) console.log(f.seed, f.nodes, f.len, f.sol.length, 'hand', f.pos.hand.join(' '), '| pile', f.pos.pile.join(' '), f.pos.constraint || '', f.pos.base || '', f.goal.rival ? '| rival ' + f.goal.rival.join(' ') : '', JSON.stringify(f.sol[0].map(m => m.n + 'x' + m.rank)));
require('fs').writeFileSync(`/tmp/found-${type}${maxPlays || ''}.json`, JSON.stringify(found));
