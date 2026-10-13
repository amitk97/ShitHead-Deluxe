// Puzzle rules + solver (v341, goals v342). One player, two-player table, no Deck, no Jokers: a puzzle
// is a Hand and a Pile and one turn to reach a goal (see Goals below); the first goal is to play the whole Hand. Only plays that give you
// another go keep the turn: a 10 or a four of a kind (burn), an 8 (skips the Rival), a 5 played on
// a base 8 and a 3 over an 8. Everything else ends the turn, so it loses. The rules here are a
// copy of isPlayLegal / executePlayCards in app.js (a dev test compares them on random positions).
// Works in the browser (window.ShPuzzleEngine) and in node (module.exports).
(function (root) {
  const VAL = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, '2': 15 };
  const EVENS = ['2', '4', '6', '8', '10', 'Q', 'A'], ODDS = ['3', '5', '7', '9', 'J', 'K'];
  const ORDER = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3'];
  // pos = { hand: [rank…], pile: [rank… bottom → top], constraint: null|'EVEN'|'ODD'|'LOW7', base: rank|null }

  function effTop(pile) {
    for (let i = pile.length - 1; i >= 0; i--) if (pile[i] !== '3') return pile[i];
    return pile[0] || null;
  }
  const constraintOf = (r) => (r === '6' ? 'EVEN' : r === '7' ? 'LOW7' : r === 'J' ? 'ODD' : null);

  function legal(rank, pos) {
    let top = effTop(pos.pile), c = pos.constraint;
    if (pos.base) { top = pos.base; if (!c) c = constraintOf(top); }
    if (!top) c = null;
    if (rank === '2') return top !== 'J';
    if (rank === '3') return top !== '6';
    if (rank === '10') return top !== '7' && top !== 'J';
    if (top === '2') return true;
    if (c === 'EVEN') return EVENS.includes(rank);
    if (c === 'ODD') return ODDS.includes(rank);
    if (c === 'LOW7') return VAL[rank] <= 7 || rank === '2' || rank === '3';
    if (!top) return true;
    if (rank === '4') return ['2', '3', '4', '6', '7'].includes(top);
    return VAL[rank] >= VAL[top];
  }

  // Plays n cards of one rank. Returns the new position, whether you go again, and whether it burned.
  function play(pos, rank, n) {
    const hand = pos.hand.slice();
    for (let i = 0; i < n; i++) hand.splice(hand.indexOf(rank), 1);
    const pile = pos.pile.concat(Array(n).fill(rank));
    const L = pile.length;
    if (L >= 4 && pile.slice(-4).every(r => r === rank)) return { pos: { hand, pile: [], constraint: null, base: null }, again: true, burn: true };
    if (rank === '10') return { pos: { hand, pile: [], constraint: null, base: null }, again: true, burn: true };
    let constraint = constraintOf(rank), base = null, again = rank === '8';
    if (rank === '5') { base = pile[0]; if (base === '8') again = true; }
    if (rank === '3') {
      constraint = pos.constraint; base = pos.base;
      const under = base || effTop(pile.filter(r => r !== '3'));
      if (under === '8') again = true;
    }
    return { pos: { hand, pile, constraint, base }, again, burn: false };
  }

  const counts = (hand) => { const m = {}; hand.forEach(r => { m[r] = (m[r] || 0) + 1; }); return m; };
  const key = (p) => p.hand.slice().sort().join('') + '|' + p.pile.join(',') + '|' + (p.constraint || '') + '|' + (p.base || '');

  // Every move from a position: [{ rank, n }] (any number of one rank, legal as the first card).
  function moves(pos) {
    const c = counts(pos.hand), out = [];
    for (const r of ORDER) if (c[r] && legal(r, pos)) for (let n = 1; n <= c[r]; n++) out.push({ rank: r, n });
    return out;
  }

  // Goals (every puzzle is ONE turn on a two-player table, no Deck, no Jokers):
  //   { type: 'out' }                     play every card in your Hand
  //   { type: 'burn' }                    burn the Pile (a 10 or four of a kind)
  //   { type: 'pickup', rival: [rank…] }  end your turn so the Rival, whose Hand is shown, has no legal card
  // Any goal may carry maxPlays: the most plays (a play = one or more cards of a rank) you may use.
  const rivalStuck = (pos, rival) => !rival.some(r => legal(r, pos));

  // All winning sequences (each a list of {rank, n}), at most `cap`; also the nodes searched.
  // `used` = plays already made (for maxPlays), so the hint can solve from the middle of an attempt.
  function solve(start, cap = 50, goal = { type: 'out' }, used0 = 0) {
    const memo = new Map(); let nodes = 0; const max = goal.maxPlays || Infinity;
    function go(pos, used) {
      if (goal.type === 'out' && !pos.hand.length) return [[]];
      const k = key(pos) + '#' + (max < Infinity ? used : 0); if (memo.has(k)) return memo.get(k);
      nodes++;
      const res = [];
      for (const m of moves(pos)) {
        if (used + 1 > max) break;
        const r = play(pos, m.rank, m.n);
        let rest = null;
        if (goal.type === 'burn' && r.burn) rest = [[]];
        else if (goal.type === 'pickup' && !r.again && r.pos.hand.length && rivalStuck(r.pos, goal.rival)) rest = [[]];
        else if (r.again && r.pos.hand.length) rest = go(r.pos, used + 1);
        else if (goal.type === 'out' && !r.pos.hand.length) rest = [[]];
        if (!rest) continue;
        for (const s of rest) { res.push([m, ...s]); if (res.length >= cap) break; }
        if (res.length >= cap) break;
      }
      memo.set(k, res); return res;
    }
    return { solutions: go(start, used0), nodes };
  }

  // Can the player still win after these plays? Used for the hint and for "this can't work now".
  function canStillWin(pos, goal, used) { return solve(pos, 1, goal, used).solutions.length > 0; }

  const api = { VAL, ORDER, legal, play, moves, solve, canStillWin, rivalStuck, effTop, constraintOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ShPuzzleEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
