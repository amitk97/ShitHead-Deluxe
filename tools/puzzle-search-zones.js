// Candidate puzzles for the Face-Up, Face-Down and Joker kinds (v356).
//   node tools/puzzle-search-zones.js faceup|facedown|joker|end4|end5|end6|end7|end<rank>|trap|long2|long3|trap3   → prints the hardest, writes <scratch>/zones-<mode>.json
// end4: 'out' where the last card played is a 4; trap: the Rival plays an Ace (TRAP_RANK, default A), then your 3 leaves them stuck.
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
  const size = /^long/.test(mode) ? 6 + Math.floor(r() * 3) : mode === 'facedown' ? 3 : mode === 'faceup' ? 3 + Math.floor(r() * 2) : mode === 'trap' ? 3 + Math.floor(r() * 3) : 4 + Math.floor(r() * 3);
  for (let i = 0; i < size; i++) pos.hand.push(pick());
  let goal = mode === 'facedown' ? { type: 'out', single: true } : { type: 'out' };
  if (mode === 'joker') {
    pos.hand.push('JOKER'); const b = best(pos); if (b < 0) continue;
    const quick = pos.pile.length; if (b < quick + 3) continue;
    goal = { type: 'joker', min: b };
  }
  if (/^end/.test(mode)) goal = { type: 'out', last: mode.slice(3) };
  if (/^long/.test(mode)) { goal = { type: 'out', turns: Number(mode.slice(4)), rival: [] }; for (let i = 0; i < 3 + Math.floor(r() * 3); i++) goal.rival.push(pick()); }
  if (mode === 'trap3') { goal = { type: 'trap', turns: 3, rival: [] }; for (let i = 0; i < 3 + Math.floor(r() * 3); i++) goal.rival.push(pick()); }
  if (mode === 'trap') { goal = { type: 'trap', rival: [] }; for (let i = 0; i < 3 + Math.floor(r() * 3); i++) goal.rival.push(pick()); if (!goal.rival.includes(process.env.TRAP_RANK || 'A')) continue; }
  const { solutions, nodes } = E.solve(pos, 5, goal);
  if ((/^long/.test(mode) || mode === 'trap3') && solutions.length) {
    if (/^long/.test(mode) && E.solve(pos, 1, { type: 'out' }).solutions.length) continue; // must really need more than one turn
    // the Rival must really play in between, and the whole line must be needed (no shorter win)
    if (mode === 'trap3' && E.solve(pos, 1, { type: 'trap', rival: goal.rival }).solutions.length) continue;
    if (/^long/.test(mode) && E.solve(pos, 1, { ...goal, turns: goal.turns - 1 }).solutions.length) continue;
  }
  if (mode === 'trap' && solutions.length) {
    const sol = solutions[0]; let ok = sol.length >= 2 && sol[sol.length - 1].rank === '3';
    if (ok) { // replay to see what the Rival plays after the first turn
      let q = pos, i = 0; while (i < sol.length) { const m = sol[i++]; const x = E.play(q, m.rank, m.n); q = x.pos; if (!x.again) break; }
      const rt = E.rivalTurn(q, goal.rival); ok = rt.plays.length === 1 && rt.plays[0].rank === (process.env.TRAP_RANK || 'A');
    }
    if (!ok) continue;
  }
  if (solutions.length >= 1 && solutions.length <= 2) found.push({ seed, pos, goal, sol: solutions, nodes, len: solutions[0].length });
}
console.log(found.length);
found.sort((a, b) => b.nodes - a.nodes);
for (const f of found.slice(0, 25)) console.log(f.seed, f.nodes, f.len, f.sol.length, 'hand', f.pos.hand.join(' '), '| pile', f.pos.pile.join(' '), f.pos.constraint || '', f.pos.base || '', f.goal.min ? '| min ' + f.goal.min : '', JSON.stringify(f.sol[0].map(m => m.n + 'x' + m.rank)));
require('fs').writeFileSync(`${process.env.TMPDIR || '/tmp/claude-0/-home-user-ShitHead-Deluxe/e6cf8966-43a2-5750-87a3-1dc2b22b7d54/scratchpad'}/zones-${mode}.json`, JSON.stringify(found));
