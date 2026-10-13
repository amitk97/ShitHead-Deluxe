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
      hint: 'Start by clearing the Pile. Then every card you play must keep the turn until the last one.' },
    { id: 'p6', tier: 2, title: 'Burn It Down', hand: ['10', '8', '5', '3', '3', 'K', '9'], pile: ['8', 'J'], constraint: 'ODD',
      goal: { type: 'burn', maxPlays: 2 },
      hint: 'A 10 can\'t go on a Jack. Find a card that drops the target somewhere a 10 can land.' },
    { id: 'p7', tier: 3, title: 'Lock The Rival Out', hand: ['6', '5', '6', '6', '8', '3', '7'], pile: ['6'], constraint: 'EVEN',
      goal: { type: 'pickup', rival: ['J', 'J', '10'] },
      hint: 'Burn first, then finish with a card that sets a limit the Rival\'s cards cannot meet.' },
    { id: 'p8', tier: 3, title: 'Odd Man Out', hand: ['A', '5', 'J', '4', '7', '2', '9'], pile: ['8', 'J', 'J', 'J'], constraint: 'ODD',
      goal: { type: 'pickup', rival: ['10', 'Q', 'Q', '2'] },
      hint: 'A Jack stops a 10 and a 2 as well as every even card. Get the turn back before you play it.' },
    { id: 'p9', tier: 5, title: 'Four Plays To Freedom', hand: ['10', '8', '8', '3', '5', '8', '10'], pile: [], constraint: null,
      goal: { type: 'out', maxPlays: 4 },
      hint: 'Play several of a rank together. Three 8s skip the Rival once, but still count as one play.' }
  ];
  PUZZLES.forEach(p => { p.goal = p.goal || { type: 'out' }; p.base = p.base || null; });
  const GOAL_NAMES = { out: 'Out in one turn', burn: 'Burn the Pile', pickup: 'Rival picks up' };
  const TIER_NAMES = ['', 'Warm-up', 'Easy', 'Medium', 'Hard', 'Tricky'];
  // Paid once per puzzle per UK week, checked by the server (economy `puzzle`). Diamonds here, XP in XP_RULES.puzzle.
  const REWARD_DIAMONDS = 50;
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
  const solvedThisWeek = () => !!solvedSet()[thisWeek().id];
  // The More Modes row and a pinned Puzzles shortcut say when this week's puzzle is done.
  function refreshBadges() {
    document.querySelectorAll('[data-open-puzzles]').forEach(b => { b.textContent = solvedThisWeek() ? 'Solved ✓' : 'Play'; });
    window.ShHomeCarousel?.repaintPins?.();
  }
  function markSolved(id) { try { const s = solvedSet(); s[id] = 1; localStorage.setItem(SOLVED_KEY, JSON.stringify(s)); } catch {} refreshBadges(); }

  // Cards get suits in turn so no rank shows the same suit twice.
  function dealCards(p) {
    const used = {}; let n = 0;
    const make = (rank) => { const k = used[rank] || 0; used[rank] = k + 1; return { id: `${p.id}_${n++}`, rank, suit: SUITS[k % 4] }; };
    return { hand: p.hand.map(make), pile: p.pile.map(make) };
  }

  function goalText(p) {
    const g = p.goal, cap = g.maxPlays ? ` Use at most ${g.maxPlays} plays.` : '';
    if (g.type === 'burn') return 'Burn the Pile in a single turn. A 10 or four of a kind burns it.' + cap;
    if (g.type === 'pickup') return 'End your turn so the Rival has no card to play from the Hand shown. They must pick up the Pile.' + cap;
    return 'Play every card in your Hand in a single turn. Only a burn (a 10 or four of a kind) and an 8 give you another go.' + cap;
  }
  const goalOf = () => puzzle.goal;
  let modal, puzzle, st, undo, picked, over, current = null, moveLog = [], gaveUp = false;
  // Select All Of A Rank works as in the game: a toggle (starts as your setting), always available.
  let allMode = typeof selectAllOfRank !== 'undefined' ? !!selectAllOfRank : false;
  const $ = (s) => modal.querySelector(s);
  const ranksOf = (cs) => cs.map(c => c.rank);
  const posOf = (s) => ({ hand: ranksOf(s.hand), pile: ranksOf(s.pile), constraint: s.constraint, base: s.base });

  function load(p) {
    puzzle = p; const d = dealCards(p);
    st = { hand: d.hand, pile: d.pile, constraint: p.constraint, base: p.base, rival: p.goal.type === 'pickup' ? p.goal.rival.map((r, i) => ({ id: 'r' + i, rank: r, suit: SUITS[i % 4] })) : [] };
    undo = []; moveLog = []; { const b = $('#pzRestart'); b.classList.remove('pz-primary'); b.textContent = 'Restart'; } gaveUp = false; picked = new Set(); over = null; plays = 0; say('Tap cards to pick them, then press Play.', '');
    draw();
  }
  let plays = 0;
  function say(text, tone) { const el = $('#pzStatus'); el.textContent = text; el.dataset.tone = tone || ''; const d = $('#pzDoneMsg'); if (d && over === 'won') d.textContent = text; }

  // Cards are the game's own (createCardElement): the equipped deck, frame and card icons apply by themselves.
  function cardEl(c, size, extra = '') {
    const el = typeof createCardElement === 'function' ? createCardElement(c, false, picked.has(c.id), false, true) : document.createElement('div');
    el.classList.remove('card-opponent-slot'); el.classList.add(size, 'pz-card'); if (extra) el.classList.add(extra);
    el.dataset.id = c.id; if (!el.dataset.rank) el.dataset.rank = c.rank;
    if (!el.firstChild) el.textContent = c.rank + c.suit; // node tests have no game renderer
    return el;
  }
  const equippedTableId = () => (typeof homeBackdropTableId === 'function' ? homeBackdropTableId() : 'default');
  // The equipped table, drawn the way the home screen draws it.
  function paintTable() {
    const t = document.querySelector('#puzzlesModal .pz-table'); if (!t || typeof homeBackdropCss !== 'function') return;
    const id = equippedTableId(), look = homeBackdropCss(id);
    if (t.dataset.table !== id) { t.dataset.table = id; t.style.background = look.bg; t.style.backgroundSize = look.size || 'auto'; }
    if (typeof ShTableScenes !== 'undefined') ShTableScenes.draw(t, id);
  }
  function paintYou() {
    const el = $('#pzYou'); if (!el) return;
    const id = typeof equippedCosmetics !== 'undefined' ? equippedCosmetics.avatar : 'default';
    el.innerHTML = (typeof avatarHtml === 'function' ? avatarHtml(id || 'default', 28) : '') + '<span>Hand</span>';
  }
  function ruleLine() {
    const top = st.base || E.effTop(ranksOf(st.pile));
    if (!top) return 'The Pile is empty: anything goes.';
    const c = st.constraint || (st.base ? E.constraintOf(st.base) : null);
    const need = c === 'EVEN' ? 'an even card' : c === 'ODD' ? 'an odd card' : c === 'LOW7' ? 'a 7 or lower' : `${top} or higher`;
    return st.base ? `Dropped to the base ${st.base}. Next card: ${need}.` : `Next card: ${need}.`;
  }
  function draw() {
    $('#pzTitle').textContent = puzzle.title;
    $('#pzTier').textContent = `${GOAL_NAMES[puzzle.goal.type]} · ${TIER_NAMES[puzzle.tier]} ${'★'.repeat(puzzle.tier)}${'☆'.repeat(5 - puzzle.tier)}`;
    $('#pzGoal').textContent = goalText(puzzle);
    $('#pzReward').textContent = `Solve it for ${REWARD_DIAMONDS} Diamonds${typeof XP_RULES !== 'undefined' && XP_RULES.puzzle ? ` and ${XP_RULES.puzzle} XP` : ''}, once a week. Give Up means no reward.`;
    const rv = $('#pzRival'); rv.hidden = puzzle.goal.type !== 'pickup';
    if (!rv.hidden) { rv.replaceChildren(); const l = document.createElement('span'); l.className = 'pz-rival-label'; l.textContent = "Rival's Hand"; rv.append(l, ...st.rival.map(c => cardEl(c, 'card-opponent-slot'))); }
    const pileEl = $('#pzPile'); pileEl.replaceChildren();
    if (st.pile.length) st.pile.slice(-5).forEach(c => pileEl.append(cardEl(c, 'card-table'))); else pileEl.innerHTML = '<span class="pz-empty">Empty Pile</span>';
    paintTable(); paintYou();
    requestAnimationFrame(fit);
    $('#pzRule').textContent = ruleLine();
    const handEl = $('#pzHand'); handEl.replaceChildren();
    if (st.hand.length) st.hand.forEach(c => { const el = cardEl(c, 'card-base', picked.has(c.id) ? 'pz-sel' : ''); el.tabIndex = 0; el.setAttribute('role', 'button'); handEl.append(el); });
    else handEl.innerHTML = '<span class="pz-empty">Hand empty</span>';
    const box = $('.pz-card-box'), won = over === 'won';
    box.classList.toggle('pz-won', won); $('#pzDone').hidden = !won; if (won) $('#pzDoneMsg').textContent = $('#pzStatus').textContent;
    const off = !!over;
    $('#pzPlay').disabled = off || !picked.size; $('#pzAll').setAttribute('aria-pressed', String(allMode));
    $('#pzUndo').disabled = !undo.length; $('#pzHint').disabled = off === 'won';
    const cap = puzzle.goal.maxPlays;
    $('#pzPlays').textContent = cap ? `${plays} / ${cap} plays` : plays ? `${plays} play${plays === 1 ? '' : 's'}` : '';
    const list = availablePuzzles(), solved = solvedSet();
    $('#pzPick').innerHTML = list.length > 1
      ? `<span class="pz-note">Test account: every weekly puzzle is open.</span>` + list.map((p, i) => `<button type="button" class="pz-chip ${p.id === puzzle.id ? 'on' : ''}" data-pz="${p.id}" title="${p.title}">${i + 1}${solved[p.id] ? ' ✓' : ''}</button>`).join('')
      : (solved[puzzle.id] ? '<span class="pz-note">Solved. A new puzzle arrives next week.</span>' : '<span class="pz-note">This week’s puzzle. A new one arrives every week.</span>');
  }
  // Everything fits the screen with no scrolling: shrink the cards (CSS --pzw) until the box stops overflowing.
  function fit() {
    const box = document.querySelector('#puzzlesModal .pz-card-box'); if (!box || !modal || modal.classList.contains('hidden')) return;
    const shrink = (min) => { for (let w = 64; w >= min; w -= 2) { box.style.setProperty('--pzw', w + 'px'); if (box.scrollHeight <= box.clientHeight + 1) return true; } return false; };
    box.classList.remove('pz-tight');
    if (!shrink(44)) { box.classList.add('pz-tight'); shrink(26); } // short screens: drop the extra lines too
  }
  window.addEventListener('resize', fit);
  function toggle(id) {
    if (over) return;
    const c = st.hand.find(x => x.id === id); if (!c) return;
    const same = allMode ? st.hand.filter(x => x.rank === c.rank) : [c];
    const wasOn = picked.has(id);
    if (!wasOn && [...picked].some(pid => st.hand.find(x => x.id === pid).rank !== c.rank)) picked.clear();
    same.forEach(x => (wasOn ? picked.delete(x.id) : picked.add(x.id)));
    draw();
  }
  // The player's equipped Burn and Victory effects, with their own sounds. Calm or off when the settings say so.
  function burnFx() {
    try {
      if (typeof triggerEquippedBurnEffect !== 'function') return;
      const r = $('#pzPile').getBoundingClientRect(), layer = document.getElementById('burnFxLayer');
      if (layer) { layer.style.zIndex = '120'; setTimeout(() => { layer.style.zIndex = ''; }, 2400); } // above the puzzle page
      const me = { id: state && state.localPlayerId };
      audio.burn(burnEffectIdFor(me));
      triggerEquippedBurnEffect(r.left + r.width / 2, r.top + r.height / 2, me, $('#pzPile .pz-card:last-child'));
    } catch (e) { console.warn('Puzzle burn effect skipped', e); }
  }
  function winFx() {
    try { if (typeof triggerEquippedVictoryEffect === 'function') triggerEquippedVictoryEffect({ id: state && state.localPlayerId, finishRank: 1 }); } catch (e) { console.warn('Puzzle victory effect skipped', e); }
  }
  function doPlay() {
    const cards = st.hand.filter(c => picked.has(c.id)); if (!cards.length || over) return;
    const rank = cards[0].rank, pos = posOf(st);
    if (!E.legal(rank, pos)) { say(`A ${rank} can't go on that. ${ruleLine()}`, 'bad'); return; }
    undo.push(JSON.stringify(st)); moveLog.push({ rank, n: cards.length }); plays++;
    const r = E.play(pos, rank, cards.length);
    if (r.burn) burnFx();
    const rival = st.rival;
    if (r.burn) { st = { hand: st.hand.filter(c => !picked.has(c.id)), pile: [], constraint: null, base: null, rival }; }
    else st = { hand: st.hand.filter(c => !picked.has(c.id)), pile: st.pile.concat(cards), constraint: r.pos.constraint, base: r.pos.base, rival };
    picked = new Set();
    const g = puzzle.goal, win = (pre = '') => { over = 'won'; markSolved(puzzle.id); winFx(); const base = `${pre}Solved in ${plays} play${plays === 1 ? '' : 's'}.`; say(base, 'good'); draw(); claimReward(base); };
    if (g.type === 'out' && !st.hand.length) return win();
    if (g.type === 'burn' && r.burn) return win();
    if (g.type === 'pickup') {
      if (!st.hand.length) { over = 'ended'; say('Your Hand is empty before the Rival is stuck. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
      if (!r.again) {
        const free = st.rival.find(c => E.legal(c.rank, r.pos));
        if (!free) { st.pile.forEach(c => st.rival.push(c)); st.pile = []; return win('The Rival cannot play and picks up the Pile. '); }
        over = 'ended'; st.rival = st.rival.filter(c => c !== free); st.pile = st.pile.concat(free);
        say(`The Rival plays a ${free.rank} and your turn is over. Press Try Again.`, 'bad'); draw(); tryAgain(); return;
      }
    }
    if (!r.again) { over = 'ended'; say('Your turn ends here and the Rival plays on, so the puzzle is not solved. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
    if (g.maxPlays && plays >= g.maxPlays) { over = 'ended'; say(`That was play ${plays}, and the goal is not met. Press Try Again.`, 'bad'); draw(); tryAgain(); return; }
    if (!E.canStillWin(r.pos, g, plays)) say('You get another go, but you can no longer reach the goal. Undo or Restart.', 'bad');
    else say(r.burn ? 'The Pile burns. Go again.' : rank === '8' ? '8 skips the Rival. Go again.' : `${rank} skips the Rival too. Go again.`, 'good');
    draw();
  }
  // Signed in and not given up: the server replays the moves and pays once per puzzle per week.
  function claimReward(base) {
    const xpAmt = (typeof XP_RULES !== 'undefined' && XP_RULES.puzzle) || 0, prize = `${REWARD_DIAMONDS} Diamonds${xpAmt ? ` and ${xpAmt} XP` : ''}`;
    if (typeof currentUser === 'undefined' || !currentUser) { say(`${base} Sign in to earn ${prize} for each weekly puzzle.`, 'good'); return; }
    if (gaveUp) return;
    const id = puzzle.id, moves = moveLog.slice();
    if (typeof callEconomy !== 'function') return;
    callEconomy('puzzle', { id, moves }).then((res) => {
      if (Number.isFinite(Number(res.diamonds))) challengeEconomy.diamonds = Number(res.diamonds);
      if (res.awarded) { applyServerClaims([res.awarded]); noteXpResult(res.xp); if (puzzle && puzzle.id === id && over === 'won') say(`${base} +${res.awarded.reward} Diamonds${res.xp && res.xp.gained ? `, +${res.xp.gained} XP` : ''}.`, 'good'); }
      else if (res.already && puzzle && puzzle.id === id && over === 'won') say(`${base} Already rewarded this week.`, 'good');
    }).catch((e) => { console.warn('Puzzle reward refused', e && e.message); });
  }
  // A failed attempt says so and offers Restart; Undo still steps back one play.
  function tryAgain() { const b = $('#pzRestart'); b.classList.add('pz-primary'); b.textContent = 'Try Again'; }
  function doUndo() { if (!undo.length) return; st = JSON.parse(undo.pop()); moveLog.pop(); plays = Math.max(0, plays - 1); picked = new Set(); over = null; { const b = $('#pzRestart'); b.classList.remove('pz-primary'); b.textContent = 'Restart'; } say('Undone.', ''); draw(); }
  function doHint() {
    const s = E.solve(posOf(st), 1, goalOf(), plays).solutions[0];
    if (!s) { say('No way to the goal from here. Undo or Restart.', 'bad'); return; }
    say(`Hint: ${puzzle.hint}`, ''); // the first hint explains the idea; a second tap names the move
    if ($('#pzHint').dataset.n === puzzle.id + plays) say(`Try playing ${s[0].n} × ${s[0].rank} next.`, '');
    $('#pzHint').dataset.n = puzzle.id + plays;
  }
  function giveUp() {
    const s = E.solve({ hand: puzzle.hand, pile: puzzle.pile, constraint: puzzle.constraint, base: puzzle.base }, 1, puzzle.goal).solutions[0];
    gaveUp = true;
    say('Solution: ' + s.map(m => `${m.n} × ${m.rank}`).join(', then ') + '.', '');
  }

  function open(id) {
    modal = document.getElementById('puzzlesModal'); if (!modal) return;
    const list = availablePuzzles();
    load(list.find(p => p.id === id) || current || thisWeek()); current = puzzle;
    modal.classList.remove('hidden'); fit();
  }
  function close() { modal && modal.classList.add('hidden'); }

  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-open-puzzles]')) { open(); return; }
    if (!modal || modal.classList.contains('hidden')) return;
    if (e.target === modal || e.target.closest('#pzClose')) { close(); return; }
    const card = e.target.closest('#pzHand .pz-card'); if (card) { toggle(card.dataset.id); return; }
    const chip = e.target.closest('[data-pz]'); if (chip) { open(chip.dataset.pz); return; }
    if (e.target.closest('#pzDoneClose')) close();
    else if (e.target.closest('#pzAgain')) load(puzzle);
    else if (e.target.closest('#pzPlay')) doPlay();
    else if (e.target.closest('#pzAll')) { allMode = !allMode; draw(); }
    else if (e.target.closest('#pzUndo')) doUndo();
    else if (e.target.closest('#pzRestart')) { load(puzzle); }
    else if (e.target.closest('#pzHint')) doHint();
    else if (e.target.closest('#pzGiveUp')) giveUp();
    else if (e.target.closest('#pzHow')) { close(); if (typeof openGuideSection === 'function') openGuideSection('puzzles'); }
  });
  document.addEventListener('keydown', (e) => {
    if (!modal || modal.classList.contains('hidden')) return;
    const card = e.target.closest && e.target.closest('#pzHand .pz-card');
    if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(card.dataset.id); }
  });

  // What the server needs (catalog export): the puzzles in rotation order and the reward.
  const catalog = () => ({ reward: { diamonds: REWARD_DIAMONDS },
    list: PUZZLES.map(p => ({ id: p.id, name: p.title, hand: p.hand, pile: p.pile, constraint: p.constraint || null, base: p.base || null, goal: p.goal })) });
  window.ShPuzzles = { catalog, REWARD_DIAMONDS, solvedThisWeek, PUZZLES, GOAL_NAMES, goalText, puzzleIndexForWeek, thisWeek, availablePuzzles, hasAllPuzzles, open, close, dealCards };
  modal = document.getElementById('puzzlesModal');
  refreshBadges();
})();
