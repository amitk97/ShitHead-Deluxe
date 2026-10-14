// Puzzle rules + solver (v341, goals v342). One player, two-player table, no Deck, no Jokers: a puzzle
// is a Hand and a Pile and one turn to reach a goal (see Goals below); the first goal is to play the whole Hand. Only plays that give you
// another go keep the turn: a 10 or a four of a kind (burn), an 8 (skips the Rival), a 5 played on
// a base 8 and a 3 over an 8. Everything else ends the turn, so it loses. The rules here are a
// copy of isPlayLegal / executePlayCards in app.js (a dev test compares them on random positions).
// Works in the browser (window.ShPuzzleEngine) and in node (module.exports).
(function (root) {
  const VAL = { '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14, '2': 15 };
  const EVENS = ['2', '4', '6', '8', '10', 'Q', 'A'], ODDS = ['3', '5', '7', '9', 'J', 'K'];
  const ORDER = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', '3', 'JOKER'];
  // pos = { hand: [rank…], pile: [rank… bottom → top], constraint: null|'EVEN'|'ODD'|'LOW7', base: rank|null }

  function effTop(pile) {
    for (let i = pile.length - 1; i >= 0; i--) if (pile[i] !== '3') return pile[i];
    return pile[0] || null;
  }
  const constraintOf = (r) => (r === '6' ? 'EVEN' : r === '7' ? 'LOW7' : r === 'J' ? 'ODD' : null);

  function legal(rank, pos) {
    if (rank === 'JOKER') return true;
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
    if (rank === 'JOKER') return { pos: { hand, pile: [], constraint: null, base: null }, again: true, burn: false, joker: true, pickup: pos.pile.length };
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
  function moves(pos, single) {
    const c = counts(pos.hand), out = [];
    for (const r of ORDER) if (c[r] && legal(r, pos)) for (let n = 1; n <= (single || r === 'JOKER' ? 1 : c[r]); n++) out.push({ rank: r, n });
    return out;
  }

  // Goals (every puzzle is ONE turn on a two-player table, no Deck, no Jokers):
  //   { type: 'out' }                     play every card in your Hand
  //   { type: 'burn' }                    burn the Pile (a 10 or four of a kind)
  //   { type: 'pickup', rival: [rank…] }  end your turn so the Rival, whose Hand is shown, has no legal card
//   { type: 'joker', min: N }           play your JOKER when the Pile holds at least N cards: the Rival picks them all up
//   { type: 'trap', rival: [rank…] }    two turns: end your first turn so the Rival has to play (they always play ALL their copies of
//                                       their weakest legal rank), then end your second so they cannot play and pick up
//   { type: 'out', last: '4' }          as 'out', and the very last card you play must be a 4 (or whatever `last` names)
// Any goal may also carry single: true (one card per play, like a Face-Down flip). A Joker is always one card.
  // Any goal may carry maxPlays: the most plays (a play = one or more cards of a rank) you may use.
  const rivalStuck = (pos, rival) => !rival.some(r => legal(r, pos));

  // The Rival's answer to the end of your turn: they play all their copies of their weakest legal rank (power order),
  // again after a go-again play, until a play ends their turn. stuck = nothing legal (they pick the Pile up);
  // out = they emptied their Hand. plays = [{ rank, n, burn }]; pos is the table afterwards (hand = yours).
  function rivalTurn(pos, rivalHand) {
    let p = { hand: rivalHand.slice(), pile: pos.pile, constraint: pos.constraint, base: pos.base };
    const plays = [];
    for (let guard = 0; guard < 12; guard++) {
      const r = ORDER.find(x => p.hand.includes(x) && legal(x, p));
      if (!r) return { stuck: true, out: false, plays, rival: p.hand, pos: { hand: pos.hand, pile: p.pile, constraint: p.constraint, base: p.base } };
      const n = p.hand.filter(x => x === r).length, q = play(p, r, n);
      plays.push({ rank: r, n, burn: q.burn });
      p = q.pos;
      if (!p.hand.length) return { stuck: false, out: true, plays, rival: [], pos: { hand: pos.hand, pile: p.pile, constraint: p.constraint, base: p.base } };
      if (!q.again) break;
    }
    return { stuck: false, out: false, plays, rival: p.hand, pos: { hand: pos.hand, pile: p.pile, constraint: p.constraint, base: p.base } };
  }

  // All winning sequences (each a list of {rank, n}), at most `cap`; also the nodes searched.
  // `used` = plays already made (for maxPlays), so the hint can solve from the middle of an attempt.
  function solve(start, cap = 50, goal = { type: 'out' }, used0 = 0) {
    const memo = new Map(); let nodes = 0; const max = goal.maxPlays || Infinity;
    function go(pos, used, rv, turn) {
      if (goal.type === 'out' && !pos.hand.length) return [[]];
      const k = key(pos) + '#' + (max < Infinity ? used : 0) + (rv ? '@' + rv.join('') + turn : ''); if (memo.has(k)) return memo.get(k);
      nodes++;
      const res = [];
      for (const m of moves(pos, goal.single)) {
        if (used + 1 > max) break;
        const r = play(pos, m.rank, m.n);
        let rest = null;
        if (goal.type === 'trap') {
          if (r.again) { if (r.pos.hand.length) rest = go(r.pos, used + 1, rv, turn); }
          else if (r.pos.hand.length) {
            if (turn === 2) { if (rivalStuck(r.pos, rv)) rest = [[]]; }
            else { const rt = rivalTurn(r.pos, rv); if (rt.plays.length && !rt.stuck && !rt.out) rest = go(rt.pos, used + 1, rt.rival, 2); }
          }
        }
        else if (goal.type === 'joker') { if (r.joker) { if (r.pickup >= goal.min) rest = [[]]; } else if (r.again && r.pos.hand.length) rest = go(r.pos, used + 1); }
        else if (goal.type === 'burn' && r.burn) rest = [[]];
        else if (goal.type === 'pickup' && !r.again && r.pos.hand.length && rivalStuck(r.pos, goal.rival)) rest = [[]];
        else if (r.again && r.pos.hand.length) rest = go(r.pos, used + 1);
        else if (goal.type === 'out' && !r.pos.hand.length) { if (!goal.last || m.rank === goal.last) rest = [[]]; }
        if (!rest) continue;
        for (const s of rest) { res.push([m, ...s]); if (res.length >= cap) break; }
        if (res.length >= cap) break;
      }
      memo.set(k, res); return res;
    }
    const rv0 = goal.type === 'trap' ? (start.rival || goal.rival) : null;
    return { solutions: go(start, used0, rv0, start.turn || 1), nodes };
  }

  // Can the player still win after these plays? Used for the hint and for "this can't work now".
  function canStillWin(pos, goal, used) { return solve(pos, 1, goal, used).solutions.length > 0; }

  // Replays a player's moves against a puzzle: true only if every play is legal, every play but the
  // last gives another go, the play cap holds, and the last play meets the goal. Used by the server
  // before it pays for a puzzle, so the number of cards in a move is checked against the real Hand.
  function verify(start, goal, moves) {
    if (!Array.isArray(moves) || !moves.length || moves.length > 40) return false;
    let pos = start, rv = goal.type === 'trap' ? (goal.rival || []) : null, turn = 1;
    if (goal.maxPlays && moves.length > goal.maxPlays) return false;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i], n = Number(m && m.n), rank = m && m.rank;
      if (!ORDER.includes(rank) || !Number.isInteger(n) || n < 1 || n > (counts(pos.hand)[rank] || 0) || !legal(rank, pos)) return false;
      if ((goal.single || rank === 'JOKER') && n !== 1) return false;
      const r = play(pos, rank, n), last = i === moves.length - 1;
      if (goal.type === 'trap') {
        if (r.again) { if (last || !r.pos.hand.length) return false; pos = r.pos; continue; }
        if (!r.pos.hand.length) return false;
        if (turn === 2) return last && rivalStuck(r.pos, rv);
        if (last) return false;
        const rt = rivalTurn(r.pos, rv);
        if (!rt.plays.length || rt.stuck || rt.out) return false;
        pos = rt.pos; rv = rt.rival; turn = 2; continue;
      }
      if (goal.type === 'joker') { if (r.joker) return last && r.pickup >= goal.min; if (last) return false; }
      if (!last) { if (!r.again || !r.pos.hand.length) return false; pos = r.pos; continue; }
      if (goal.type === 'out') return !r.pos.hand.length && (!goal.last || rank === goal.last);
      if (goal.type === 'burn') return !!r.burn;
      if (goal.type === 'pickup') return !r.again && r.pos.hand.length > 0 && rivalStuck(r.pos, goal.rival || []);
      return false;
    }
    return false;
  }

  const api = { VAL, ORDER, legal, play, moves, solve, verify, canStillWin, rivalStuck, rivalTurn, effTop, constraintOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ShPuzzleEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
