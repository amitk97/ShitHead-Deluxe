// Weekly Puzzles (v341). Five hand-picked positions (found and checked by tools/puzzle-search.js with
// the solver in js/puzzle-engine.js). One is the puzzle of the week; the AmitK test account always
// has all of them open. No Diamonds or XP yet: paying for puzzles needs the server to check the moves.
(function () {
  const E = window.ShPuzzleEngine;
  const SUITS = ['♠', '♥', '♦', '♣'];
  // hand / pile in ranks (pile bottom → top). `sol` is the one winning line, checked by a dev test.
  const PUZZLES = [
    { id: 'p1', tier: 1, title: 'Burn And Go Again', hand: ['5', '8', '5', '5', '5'], pile: ['8', 'J'], constraint: 'ODD', base: null,
      hint: 'Four of a kind burns the Pile, and a burn gives you another go.' },
    { id: 'p2', tier: 2, title: 'The Hidden Skip', hand: ['5', '10', '9', '5', '5'], pile: ['8', 'J'], constraint: 'ODD', base: null,
      hint: 'A 5 drops to the bottom card of the Pile. If that card is an 8, the 5 skips the Rival too.' },
    { id: 'p3', tier: 3, title: 'See Through The 8', hand: ['8', '10', '4', '3', '4'], pile: [], constraint: null, base: null,
      hint: 'A 3 acts like the card under it. A 3 over an 8 skips the Rival.' },
    { id: 'p4', tier: 4, title: 'Two Plays, One Burn', hand: ['Q', 'Q', '8', '5', '5', '10', '3'], pile: ['2', '2', 'Q', 'Q'], constraint: null, base: null,
      hint: 'The Pile already holds two Queens. Look for the burn that comes before the skips.' },
    { id: 'p5', tier: 5, title: 'Five Ways To Go Again', hand: ['4', '8', '3', '5', '4', '10', '4'], pile: ['7', '4'], constraint: null, base: null,
      hint: 'Start by clearing the Pile. Then every card you play must keep the turn until the last one.' }
  ];
  const TIER_NAMES = ['', 'Warm-up', 'Easy', 'Medium', 'Hard', 'Tricky'];
  const SOLVED_KEY = 'shithead_puzzles_solved';

  // The puzzle of the week: week keys like "2026-W42" count on one after another.
  function puzzleIndexForWeek(weekKey) {
    const m = /^(\d{4})-W(\d{2})$/.exec(weekKey || '');
    if (!m) return 0;
    return ((Number(m[1]) - 2026) * 53 + Number(m[2])) % PUZZLES.length;
  }
  const thisWeek = () => PUZZLES[puzzleIndexForWeek(typeof getUkWeekKey === 'function' ? getUkWeekKey() : '')];
  // AmitK (shop.js isAmitkTestingAccount) is a test account: every weekly puzzle is always open.
  const hasAllPuzzles = () => { try { return !!currentUser && isAmitkTestingAccount({}); } catch { return false; } };
  const availablePuzzles = () => (hasAllPuzzles() ? PUZZLES : [thisWeek()]);

  const solvedSet = () => { try { return JSON.parse(localStorage.getItem(SOLVED_KEY) || '{}'); } catch { return {}; } };
  function markSolved(id) { try { const s = solvedSet(); s[id] = 1; localStorage.setItem(SOLVED_KEY, JSON.stringify(s)); } catch {} }

  // Cards get suits in turn so no rank shows the same suit twice.
  function dealCards(p) {
    const used = {}; let n = 0;
    const make = (rank) => { const k = used[rank] || 0; used[rank] = k + 1; return { id: `${p.id}_${n++}`, rank, suit: SUITS[k % 4] }; };
    return { hand: p.hand.map(make), pile: p.pile.map(make) };
  }

  let modal, puzzle, st, undo, picked, over, current = null;
  const $ = (s) => modal.querySelector(s);
  const ranksOf = (cs) => cs.map(c => c.rank);
  const posOf = (s) => ({ hand: ranksOf(s.hand), pile: ranksOf(s.pile), constraint: s.constraint, base: s.base });

  function load(p) {
    puzzle = p; const d = dealCards(p);
    st = { hand: d.hand, pile: d.pile, constraint: p.constraint, base: p.base };
    undo = []; picked = new Set(); over = null; plays = 0; say('Play your whole Hand in one turn.', '');
    draw();
  }
  let plays = 0;
  function say(text, tone) { const el = $('#pzStatus'); el.textContent = text; el.dataset.tone = tone || ''; }

  const cardHtml = (c, extra = '') => `<span class="pz-card ${c.suit === '♥' || c.suit === '♦' ? 'pz-red' : ''} ${extra}" data-id="${c.id}"><b>${c.rank}</b><i>${c.suit}</i></span>`;
  function ruleLine() {
    const top = st.base || E.effTop(ranksOf(st.pile));
    if (!top) return 'The Pile is empty: anything goes.';
    const c = st.constraint || (st.base ? E.constraintOf(st.base) : null);
    const need = c === 'EVEN' ? 'an even card' : c === 'ODD' ? 'an odd card' : c === 'LOW7' ? 'a 7 or lower' : `${top} or higher`;
    return st.base ? `Dropped to the base ${st.base}. Next card: ${need}.` : `Next card: ${need}.`;
  }
  function draw() {
    $('#pzTitle').textContent = puzzle.title;
    $('#pzTier').textContent = `${TIER_NAMES[puzzle.tier]} · ${'★'.repeat(puzzle.tier)}${'☆'.repeat(5 - puzzle.tier)}`;
    $('#pzPile').innerHTML = st.pile.length ? st.pile.slice(-5).map((c, i) => cardHtml(c, `pz-pile-${i}`)).join('') : '<span class="pz-empty">Empty Pile</span>';
    $('#pzRule').textContent = ruleLine();
    $('#pzHand').innerHTML = st.hand.map(c => cardHtml(c, picked.has(c.id) ? 'pz-sel' : '')).join('') || '<span class="pz-empty">Hand empty</span>';
    $('#pzHand').querySelectorAll('.pz-card').forEach(el => { el.tabIndex = 0; el.setAttribute('role', 'button'); });
    const off = !!over;
    $('#pzPlay').disabled = off || !picked.size; $('#pzAll').disabled = off || !picked.size;
    $('#pzUndo').disabled = !undo.length; $('#pzHint').disabled = off === 'won';
    $('#pzPlays').textContent = plays ? `${plays} play${plays === 1 ? '' : 's'}` : '';
    const list = availablePuzzles(), solved = solvedSet();
    $('#pzPick').innerHTML = list.length > 1
      ? `<span class="pz-note">Test account: every weekly puzzle is open.</span>` + list.map(p => `<button type="button" class="pz-chip ${p.id === puzzle.id ? 'on' : ''}" data-pz="${p.id}">${p.tier}${solved[p.id] ? ' ✓' : ''}</button>`).join('')
      : (solved[puzzle.id] ? '<span class="pz-note">Solved. A new puzzle arrives next week.</span>' : '<span class="pz-note">This week’s puzzle. A new one arrives every week.</span>');
  }
  function toggle(id) {
    if (over) return;
    const c = st.hand.find(x => x.id === id); if (!c) return;
    if (picked.has(id)) picked.delete(id);
    else { if ([...picked].some(pid => st.hand.find(x => x.id === pid).rank !== c.rank)) picked.clear(); picked.add(id); }
    draw();
  }
  function selectAll() {
    const first = st.hand.find(c => picked.has(c.id)); if (!first) return;
    st.hand.forEach(c => { if (c.rank === first.rank) picked.add(c.id); }); draw();
  }
  function doPlay() {
    const cards = st.hand.filter(c => picked.has(c.id)); if (!cards.length || over) return;
    const rank = cards[0].rank, pos = posOf(st);
    if (!E.legal(rank, pos)) { say(`A ${rank} can't go on that. ${ruleLine()}`, 'bad'); return; }
    undo.push(JSON.stringify(st)); plays++;
    const r = E.play(pos, rank, cards.length);
    if (r.burn) { st = { hand: st.hand.filter(c => !picked.has(c.id)), pile: [], constraint: null, base: null }; }
    else st = { hand: st.hand.filter(c => !picked.has(c.id)), pile: st.pile.concat(cards), constraint: r.pos.constraint, base: r.pos.base };
    picked = new Set();
    if (!st.hand.length) { over = 'won'; markSolved(puzzle.id); say(`Solved in ${plays} play${plays === 1 ? '' : 's'}.`, 'good'); draw(); return; }
    if (!r.again) { over = 'ended'; say('Your turn ends here and the Rival plays on. Undo or Restart.', 'bad'); draw(); return; }
    if (!E.canStillWin(r.pos)) say('You get another go, but you can no longer finish. Undo or Restart.', 'bad');
    else say(r.burn ? 'The Pile burns. Go again.' : rank === '8' ? '8 skips the Rival. Go again.' : `${rank} skips the Rival too. Go again.`, 'good');
    draw();
  }
  function doUndo() { if (!undo.length) return; st = JSON.parse(undo.pop()); plays = Math.max(0, plays - 1); picked = new Set(); over = null; say('Undone.', ''); draw(); }
  function doHint() {
    const s = E.solve(posOf(st), 1).solutions[0];
    if (!s) { say('No way to finish from here. Undo or Restart.', 'bad'); return; }
    say(`Hint: ${puzzle.hint}`, ''); // the first hint explains the idea; a second tap names the move
    if ($('#pzHint').dataset.n === puzzle.id + plays) say(`Try playing ${s[0].n} × ${s[0].rank} next.`, '');
    $('#pzHint').dataset.n = puzzle.id + plays;
  }
  function giveUp() {
    const s = E.solve({ hand: puzzle.hand, pile: puzzle.pile, constraint: puzzle.constraint, base: puzzle.base }, 1).solutions[0];
    say('Solution: ' + s.map(m => `${m.n} × ${m.rank}`).join(', then ') + '.', '');
  }

  function open(id) {
    modal = document.getElementById('puzzlesModal'); if (!modal) return;
    const list = availablePuzzles();
    load(list.find(p => p.id === id) || current || thisWeek()); current = puzzle;
    modal.classList.remove('hidden');
  }
  function close() { modal && modal.classList.add('hidden'); }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-puzzles]')) { open(); return; }
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.target === modal || e.target.closest('#pzClose')) { close(); return; }
    const card = e.target.closest('#pzHand .pz-card'); if (card) { toggle(card.dataset.id); return; }
    const chip = e.target.closest('[data-pz]'); if (chip) { open(chip.dataset.pz); return; }
    if (e.target.closest('#pzPlay')) doPlay();
    else if (e.target.closest('#pzAll')) selectAll();
    else if (e.target.closest('#pzUndo')) doUndo();
    else if (e.target.closest('#pzRestart')) { load(puzzle); }
    else if (e.target.closest('#pzHint')) doHint();
    else if (e.target.closest('#pzGiveUp')) giveUp();
  });
  document.addEventListener('keydown', (e) => {
    if (!modal || modal.classList.contains('hidden')) return;
    const card = e.target.closest && e.target.closest('#pzHand .pz-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(card.dataset.id); }
  });

  window.ShPuzzles = { PUZZLES, puzzleIndexForWeek, thisWeek, availablePuzzles, hasAllPuzzles, open, close, dealCards };
})();
