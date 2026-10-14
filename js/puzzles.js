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
      hint: 'Play several of a rank together. Three 8s skip the Rival once, but still count as one play.' },
    { id: 'p10', tier: 2, title: 'Four Sixes', hand: ['6', '8', '6', '6', 'Q'], pile: ['7', '6'], constraint: 'EVEN',
      goal: { type: 'out', maxPlays: 3 },
      hint: 'Three of your 6s on the Pile\'s 6 make four of a kind. After a burn, the Pile is empty and anything goes.' },
    { id: 'p11', tier: 2, title: 'Nothing Beats An Ace', hand: ['6', 'A', '2', '4', '10', '7', '6'], pile: ['A', 'A', 'A'], constraint: null,
      goal: { type: 'pickup', rival: ['Q', 'K', '6'] },
      hint: 'Clear the Pile first, then end your turn on the one card the Rival\'s Hand cannot beat.' },
    { id: 'p12', tier: 3, title: 'Three Threes', hand: ['3', '3', 'J', '3', '10', '10'], pile: ['A', 'A', '2', '8'], constraint: null,
      goal: { type: 'out', maxPlays: 3 },
      hint: 'A 3 takes on the card under it, and over an 8 it skips the Rival. Three 3s together are still one play.' },
    { id: 'p13', tier: 3, title: 'Fives Fall To The Bottom', hand: ['7', '10', '5', '8', '5'], pile: ['8', 'Q', '2', '4'], constraint: null,
      goal: { type: 'out' },
      hint: 'A 5 drops to the bottom card of the Pile, and the bottom card here is an 8.' },
    { id: 'p14', tier: 3, title: 'Seven Or Lower', hand: ['3', '5', '10', '9', '9'], pile: ['8', '2', '7'], constraint: 'LOW7',
      goal: { type: 'out' },
      hint: 'The Pile says 7 or lower, so a 10 cannot go yet. Only a 5 or a 3 helps: look at the bottom of the Pile.' },
    { id: 'p15', tier: 3, title: 'Skip Then Four Kings', hand: ['8', 'K', 'K', '9', 'K', 'K'], pile: ['5', '3', '2', '6', '6'], constraint: 'EVEN',
      goal: { type: 'burn', maxPlays: 3 },
      hint: 'An 8 can go on an even card and skips the Rival. Then look at what four of a kind does.' },
    { id: 'p16', tier: 3, title: 'Eight Then Jack', hand: ['7', '8', '9', 'J', '7', '7', '5'], pile: ['6'], constraint: 'EVEN',
      goal: { type: 'pickup', maxPlays: 3, rival: ['8', 'Q', '4', '4'] },
      hint: 'The Rival holds only even cards. An 8 skips them, then finish on a card that only odd cards can follow.' },
    { id: 'p17', tier: 4, title: 'Four Eights', hand: ['7', '8', '5', '4', '4', '9', '3'], pile: ['8', '8', '8'], constraint: null,
      goal: { type: 'pickup', maxPlays: 3, rival: ['A', 'A', 'Q'] },
      hint: 'Your 8 makes four of a kind with the three on the Pile. Then play the card that limits the Rival to a 7 or lower.' },
    { id: 'p18', tier: 4, title: 'Aces Wild', hand: ['10', '8', 'A', '7', '10', '8'], pile: ['8', 'A', 'A', 'A'], constraint: null,
      goal: { type: 'out', maxPlays: 4 },
      hint: 'One Ace makes four of a kind with the Aces on the Pile. Then each pair goes together as a single play.' },
    { id: 'p19', tier: 4, title: 'Four Sevens', hand: ['7', '7', '8', '10', '7', '7', '3'], pile: ['9', 'A', '3'], constraint: null,
      goal: { type: 'out' },
      hint: 'Clear the Pile with the 10, then four 7s together burn it again. Keep the 8 and the 3 for the end.' },
    { id: 'p20', tier: 5, title: 'Three Queens', hand: ['8', 'Q', 'Q', 'Q', '10', '8', '6'], pile: ['9', '2', 'Q'], constraint: null,
      goal: { type: 'out', maxPlays: 4 },
      hint: 'Three Queens on the Pile\'s Queen make four of a kind. Two 8s together skip the Rival once.' },
    // v356: play from the Face-Up cards, flip Face-Down cards one at a time, or hand the Rival a big Pile with a Joker.
    { id: 'p21', tier: 2, zone: 'faceUp', title: 'Clear Your Face-Up Cards', hand: ['8', '5', '10', 'Q'], pile: ['8', 'A', '3', '2'], constraint: null,
      goal: { type: 'out' },
      hint: 'Your Hand and the Deck are empty, so you play from your Face-Up cards. A 5 drops to the bottom card of the Pile, and the bottom card is an 8.' },
    { id: 'p22', tier: 3, zone: 'faceUp', title: 'Face-Up Four Of A Kind', hand: ['8', '9', '10', '2'], pile: ['K', '2', '2', '2'], constraint: null,
      goal: { type: 'out' },
      hint: 'Three 2s are already on the Pile. Your own 2 makes four of a kind, and a burn gives you another go.' },
    { id: 'p23', tier: 3, zone: 'faceUp', title: 'Even Face-Up Cards', hand: ['7', '10', '8', '8'], pile: ['2', '4', 'J', '7', '6'], constraint: 'EVEN',
      goal: { type: 'out' },
      hint: 'The Pile wants an even card. Two 8s together skip the Rival once, and a 10 clears the way for the 7.' },
    { id: 'p24', tier: 4, zone: 'faceUp', title: 'Five, Three, Eight', hand: ['5', '3', '8', '5'], pile: ['8', 'J', '7', '6', '2'], constraint: null,
      goal: { type: 'out' },
      hint: 'Both 5s drop to the bottom 8. After that the 3 and the 8 both keep the turn, so order the last two with care.' },
    { id: 'p25', tier: 2, zone: 'faceDown', title: 'Flip Them Right', hand: ['3', '5', '10'], pile: ['8', 'K', '2'], constraint: null,
      goal: { type: 'out', single: true },
      hint: 'You remember your Face-Down cards, but you flip them one at a time. Only the first two flips must keep your turn alive.' },
    { id: 'p26', tier: 2, zone: 'faceDown', title: 'Even Flips', hand: ['10', '8', '7'], pile: ['3', '6'], constraint: 'EVEN',
      goal: { type: 'out', single: true },
      hint: 'The Pile wants an even card. Flip the card that fits and skips the Rival, and leave the 7 for last.' },
    { id: 'p27', tier: 3, zone: 'faceDown', title: 'Face-Down Burn', hand: ['3', '9', '8'], pile: ['8', '2', '8', '8'], constraint: null,
      goal: { type: 'out', single: true },
      hint: 'The Pile ends in three 8s. Your 8 makes four of a kind, and the 3 over an 8 keeps your turn too.' },
    { id: 'p28', tier: 3, zone: 'faceDown', title: 'Bottom Eight Flips', hand: ['5', '3', '8'], pile: ['8', 'Q', '2', '3'], constraint: null,
      goal: { type: 'out', single: true },
      hint: 'A 5 drops to the bottom card, which is an 8, and a 3 shows the card under it. Work out which flip comes first.' },
    { id: 'p29', tier: 2, title: 'Jokers Pick Up Six', hand: ['5', '10', 'J', '10', '5', '5', 'JOKER'], pile: ['8', '8', '2'], constraint: null,
      goal: { type: 'joker', min: 6 },
      hint: 'Grow the Pile before the Joker, without a 10, which would burn it. Three 5s drop to the bottom 8 together and skip the Rival.' },
    { id: 'p30', tier: 3, title: 'Joker Hands Over Six', hand: ['3', '10', '3', '8', '10', '10', 'JOKER'], pile: ['7', '3', '6'], constraint: 'EVEN',
      goal: { type: 'joker', min: 6 },
      hint: 'Every card you add before the Joker must keep your turn, and a 10 would burn the Pile. An 8 fits an even card, and a 3 over an 8 skips too.' },
    { id: 'p31', tier: 4, title: 'Biggest Joker Pickup', hand: ['J', '5', '5', '10', '3', '8', 'JOKER'], pile: ['8', 'K', '2'], constraint: null,
      goal: { type: 'joker', min: 7 },
      hint: 'Make the Rival pick up seven cards: the Pile must reach seven before the Joker. Two 5s drop to the bottom 8, then the 8 and the 3 each skip.' },
    { id: 'p32', tier: 4, title: 'Odd Pile, Big Joker', hand: ['10', '5', '5', '8', '6', '8', 'JOKER'], pile: ['8', '2', 'J'], constraint: 'ODD',
      goal: { type: 'joker', min: 7 },
      hint: 'The Pile wants an odd card, so a 5 comes first. Look at the card at the bottom of the Pile, then add both 8s before the Joker.' },
    // v357: end on a 4, and a Rival who has to play before your second turn traps them.
    { id: 'p33', tier: 3, title: 'End On A Four', hand: ['4', '5', '10', '8'], pile: ['8', '3', '2'], constraint: null,
      goal: { type: 'out', last: '4' },
      hint: 'A 4 only goes on a 2, 3, 4, 6 or 7, or on an empty Pile. Save it for the end, and clear the Pile before you play it.' },
    { id: 'p34', tier: 3, title: 'Aces Burn, Five Last', hand: ['3', '10', '8', 'A', '5'], pile: ['A', 'A', 'A'], constraint: null,
      goal: { type: 'out', last: '5' },
      hint: 'Three Aces are on the Pile, so your Ace makes four of a kind. After the burn, order the 8, the 3 and the 10 so each keeps your turn, and leave the 5 for last.' },
    { id: 'p35', tier: 4, title: 'Fives Then A Six', hand: ['8', '5', '5', '10', '6'], pile: ['8', 'Q', 'A', '2', '3'], constraint: null,
      goal: { type: 'out', last: '6' },
      hint: 'Both 5s together drop to the bottom 8 of the Pile and skip the Rival. Then the 8 and the 10 clear the way for the 6.' },
    { id: 'p36', tier: 4, title: 'Two Sevens To Finish', hand: ['3', '5', '10', '7', '7', '8'], pile: ['8', '2', 'J'], constraint: 'ODD',
      goal: { type: 'out', last: '7' },
      hint: 'The Pile wants an odd card, and a 5 is odd and drops to the bottom 8. Then the 8, the 3 and the 10 keep your turn, and both 7s finish it together.' },
    { id: 'p37', tier: 2, title: 'Three Over The Ace', hand: ['J', '2', '8', '3', 'Q'], pile: ['5', '8'], constraint: null,
      goal: { type: 'trap', rival: ['J', '6', 'A', '5', '9'] },
      hint: 'You cannot empty your Hand here, so trap the Rival instead. End your first turn with the Queen (an 8 first is fine): their only card that beats it is the Ace. Then your 3 shows that Ace under it and leaves them stuck.' },
    { id: 'p38', tier: 3, title: 'Five Back To The Ace', hand: ['8', '8', '5', '4', '3'], pile: ['A', '2'], constraint: null,
      goal: { type: 'trap', rival: ['K', 'A', '4'] },
      hint: 'A 5 drops the target to the bottom card of the Pile. That makes the Ace the only card the Rival can play. Your 3 then covers it.' },
    { id: 'p39', tier: 3, title: 'Even Ace, Odd Rival', hand: ['A', '3', '9', 'Q', '8'], pile: ['8', '3', '8'], constraint: null,
      goal: { type: 'trap', rival: ['A', '5', 'K', 'K'] },
      hint: 'You cannot empty your Hand here, so trap the Rival instead. Play your Ace (an 8 first is fine): the Rival\'s Ace is the only card that beats it. Then your 3 covers their Ace and leaves them stuck.' },
    // v358: several turns. When a turn ends the Rival answers (their weakest card that fits, or they pick the Pile up) and you play on.
    { id: 'p40', tier: 4, title: 'Hold Back The Fives', hand: ['A', '7', '8', '3', '10', '5', '5', '5'], pile: ['8', '8', '3'], constraint: null,
      goal: { type: 'out', turns: 2, rival: ['7', 'K', '9', '3', '2'] },
      hint: 'Your first play ends your turn and the Rival answers. After that, three 5s drop to the bottom 8 together, and the 8, the 3 and the 10 keep your turn for the finish.' },
    { id: 'p41', tier: 3, title: 'Four, Then Fives', hand: ['5', '8', '5', '9', '3', '4', '9'], pile: ['8', 'Q', '2'], constraint: null,
      goal: { type: 'out', turns: 2, rival: ['2', '4', 'J', '7', 'J'] },
      hint: 'The 4 ends your first turn. Then your two 5s drop to the bottom 8, and the 8 and the 3 keep the turn until the pair of 9s.' },
    { id: 'p42', tier: 4, title: 'Sevens Open It Up', hand: ['5', '8', '3', '10', '7', '3', '7', '5'], pile: ['A', '3', '2'], constraint: null,
      goal: { type: 'out', turns: 2, rival: ['A', 'K', 'K'] },
      hint: 'A pair of 7s ends the first turn. Once the Rival has played, the 8, both 3s and the 10 keep your turn, and the two 5s finish it.' },
    { id: 'p43', tier: 5, title: 'Three Turns To Finish', hand: ['7', 'K', '6', '5', '3', '8', '5'], pile: ['8', '2', '4', '6', '2'], constraint: null,
      goal: { type: 'out', turns: 3, rival: ['2', '9', '4', '5'] },
      hint: 'The 7 and the 6 each end a turn and let the Rival play. On the last turn your 5s drop to the bottom 8, and then the 8 and the 3 skip.' },
    { id: 'p44', tier: 5, title: 'Ace And Four First', hand: ['A', '5', '5', '4', '2', '8', '2', '3'], pile: ['8', '9', '2', 'K'], constraint: null,
      goal: { type: 'out', turns: 3, rival: ['3', '2', 'Q', '4', '4'] },
      hint: 'The Ace and the 4 each end a turn. In the last turn two 5s drop to the bottom 8, and the 8 and the 3 skip before your pair of 2s.' },
    { id: 'p45', tier: 4, title: 'Three Turn Trap', hand: ['7', '4', 'J', 'A', '10', '8'], pile: ['5', 'Q', 'A', '2'], constraint: null,
      goal: { type: 'trap', turns: 3, rival: ['7', 'A', '10', '5', '4'] },
      hint: 'You cannot clear your Hand in time, so trap the Rival. Your 4, and the run of 10, 8 and Jack, are your first two turns in either order. Keep the 7 for the last turn: it is the card that leaves them stuck.' },
    { id: 'p46', tier: 5, title: 'Use Up Their Cards', hand: ['9', '8', '10', '2', '7', 'A'], pile: ['4', '3', '5'], constraint: null, base: '4',
      goal: { type: 'trap', turns: 3, rival: ['A', '6', 'Q', '5'] },
      hint: 'You cannot clear your Hand in time, so trap the Rival. Your 9 and your 2 each end a turn, with the 10 and the 8 keeping your turn going. Keep the Ace for the last turn: it is the card that leaves them stuck.' }
  ];
  PUZZLES.forEach(p => { p.goal = p.goal || { type: 'out' }; p.base = p.base || null; });
  const GOAL_NAMES = { out: 'Out in one turn', burn: 'Burn the Pile', pickup: 'Rival picks up', joker: 'Joker pickup', trap: 'Trap the Rival' };
  const ZONE_NAMES = { hand: 'Hand', faceUp: 'Face-Up cards', faceDown: 'Face-Down cards' };
  const zoneOf = (p) => p.zone || 'hand';
  const kindName = (p) => (p.goal.last ? `End on a ${p.goal.last}` : p.goal.type === 'out' && p.goal.turns > 1 ? `Out in ${p.goal.turns} turns` : zoneOf(p) === 'faceUp' ? 'Face-Up cards' : zoneOf(p) === 'faceDown' ? 'Face-Down cards' : GOAL_NAMES[p.goal.type]);
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
    const make = (rank) => { const k = used[rank] || 0; used[rank] = k + 1; return rank === 'JOKER' ? { id: `${p.id}_${n++}`, rank, suit: 'JOKER', isJoker: true } : { id: `${p.id}_${n++}`, rank, suit: SUITS[k % 4] }; };
    return { hand: p.hand.map(make), pile: p.pile.map(make) };
  }

  function goalText(p) {
    const g = p.goal, cap = g.maxPlays ? ` Use at most ${g.maxPlays} plays.` : '';
    if (g.type === 'joker') return `Play your Joker so the Rival picks up ${g.min} cards or more, the most there can be. Only plays that give you another go can come first, and a 10 or four of a kind would burn the Pile.` + cap;
    const T = g.turns || (g.type === 'trap' ? 2 : 1);
    if (g.type === 'trap') return `${T === 2 ? 'Two' : 'Three'} turns. Each time your turn ends the Rival has to play a card. On your last turn, end it so they cannot play and must pick up. The Rival always plays their weakest card that fits.` + cap;
    if (g.type === 'out' && T > 1) return `Play every card in your Hand within ${T} turns. When a turn ends, the Rival plays their weakest card that fits, or picks up the Pile if they cannot, and then you play on. Only a burn and an 8 give you another go within a turn.` + cap;
    if (g.last) return `Play every card in your Hand in a single turn, and make the very last card you play a ${g.last}. Only a burn (a 10 or four of a kind) and an 8 give you another go.` + cap;
    const zone = zoneOf(p), only = g.single ? ' Each play is a single card.' : '';
    if (zone === 'faceUp') return 'Your Hand and the Deck are empty, so you play from your Face-Up cards. Play all of them in a single turn. Only a burn and an 8 give you another go.' + only + cap;
    if (zone === 'faceDown') return `Your Face-Down cards stay face down, but you remember them: left to right, ${p.hand.map(rankName).join(', ')}. Flip all of them in a single turn, one card at a time. Only a burn and an 8 give you another go.` + cap;
    if (g.type === 'burn') return 'Burn the Pile in a single turn. A 10 or four of a kind burns it.' + cap;
    if (g.type === 'pickup') return 'End your turn so the Rival has no card to play from the Hand shown. They must pick up the Pile.' + cap;
    return 'Play every card in your Hand in a single turn. Only a burn (a 10 or four of a kind) and an 8 give you another go.' + cap;
  }
  const goalOf = () => puzzle.goal;
  const aRank = (r) => (/^[A8]$/.test(r) ? 'an ' : 'a ') + r;
  const rankName = (r) => (r === 'JOKER' ? 'Joker' : r);
  let modal, puzzle, st, undo, picked, over, current = null, moveLog = [], gaveUp = false;
  // Select All Of A Rank works as in the game: a toggle (starts as your setting), always available.
  let allMode = typeof selectAllOfRank !== 'undefined' ? !!selectAllOfRank : false;
  const $ = (s) => modal.querySelector(s);
  const ranksOf = (cs) => cs.map(c => c.rank);
  const posOf = (s) => ({ hand: ranksOf(s.hand), pile: ranksOf(s.pile), constraint: s.constraint, base: s.base, rival: ranksOf(s.rival), turn: s.turn });

  function load(p) {
    puzzle = p; const d = dealCards(p);
    st = { hand: d.hand, pile: d.pile, constraint: p.constraint, base: p.base, turn: 1, rival: p.goal.rival ? p.goal.rival.map((r, i) => ({ id: 'r' + i, rank: r, suit: SUITS[i % 4] })) : [] };
    undo = []; moveLog = []; { const b = $('#pzRestart'); b.classList.remove('pz-primary'); b.textContent = 'Restart'; } gaveUp = false; picked = new Set(); over = null; plays = 0; say('Tap cards to pick them, then press Play.', '');
    draw(); fit(true);
  }
  let plays = 0;
  function say(text, tone) { const el = $('#pzStatus'); el.textContent = text; el.dataset.tone = tone || ''; const d = $('#pzDoneMsg'); if (d && over === 'won') d.textContent = text; }

  // Cards are the game's own (createCardElement): the equipped deck, frame and card icons apply by themselves.
  function cardEl(c, size, extra = '', faceDown) {
    const el = typeof createCardElement === 'function' ? createCardElement(faceDown ? { ...c, hidden: true } : c, false, picked.has(c.id), false, true) : document.createElement('div');
    el.classList.remove('card-opponent-slot'); el.classList.add(size, 'pz-card'); if (extra) el.classList.add(extra);
    el.dataset.id = c.id; if (!el.dataset.rank) el.dataset.rank = c.rank;
    if (!el.firstChild) el.textContent = faceDown ? '' : c.rank + c.suit; // node tests have no game renderer
    // Puzzle cards show only the rank with its suit under it in the corner: no power icon, no big suit in the middle.
    const ic = el.querySelector && el.querySelector('.card-centre-icon, .card-centre-suit');
    if (ic && !c.isJoker) (ic.parentElement && ic.parentElement !== el ? ic.parentElement : ic).remove();
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
    el.innerHTML = (typeof avatarHtml === 'function' ? avatarHtml(id || 'default', 28) : '') + '<span>' + ZONE_NAMES[puzzle && zoneOf(puzzle)] + '</span>';
  }
  function ruleLine() {
    const top = st.base || E.effTop(ranksOf(st.pile));
    if (!top) return 'The Pile is empty: anything goes.';
    const c = st.constraint || (st.base ? E.constraintOf(st.base) : null);
    const need = c === 'EVEN' ? 'an even card' : c === 'ODD' ? 'an odd card' : c === 'LOW7' ? 'a 7 or lower' : `${top} or higher`;
    const covered = !st.base && st.pile.length && st.pile[st.pile.length - 1].rank === '3' && top !== '3';
    return st.base ? `Dropped to the base ${st.base}. Next card: ${need}.` : `${covered ? `The 3 shows the ${top} under it. ` : ''}Next card: ${need}.`;
  }
  function draw() {
    $('#pzTitle').textContent = puzzle.title;
    $('#pzTier').textContent = `${kindName(puzzle)} · ${TIER_NAMES[puzzle.tier]} ${'★'.repeat(puzzle.tier)}${'☆'.repeat(5 - puzzle.tier)}`;
    $('#pzGoal').textContent = goalText(puzzle);
    $('#pzReward').textContent = `Solve it for ${REWARD_DIAMONDS} Diamonds${typeof XP_RULES !== 'undefined' && XP_RULES.puzzle ? ` and ${XP_RULES.puzzle} XP` : ''}, once a week. Give Up means no reward.`;
    const rv = $('#pzRival'); rv.hidden = !puzzle.goal.rival && puzzle.goal.type !== 'joker';
    if (!rv.hidden) { rv.replaceChildren(); const l = document.createElement('span'); l.className = 'pz-rival-label'; l.textContent = puzzle.goal.type === 'joker' && !st.rival.length ? "Rival's Hand: empty" : "Rival's Hand"; rv.append(l, ...st.rival.map(c => cardEl(c, 'card-opponent-slot'))); }
    const pileEl = $('#pzPile'); pileEl.replaceChildren();
    if (st.pile.length) (st.pile.length > 6 ? [st.pile[0]].concat(st.pile.slice(-4)) : st.pile).forEach(c => pileEl.append(cardEl(c, 'card-table'))); else pileEl.innerHTML = '<span class="pz-empty">Empty Pile</span>';
    paintTable(); paintYou();
    requestAnimationFrame(fit);
    $('#pzRule').textContent = ruleLine();
    const handEl = $('#pzHand'); handEl.replaceChildren();
    if (st.hand.length) st.hand.forEach(c => { const el = cardEl(c, 'card-base', picked.has(c.id) ? 'pz-sel' : '', zoneOf(puzzle) === 'faceDown'); el.tabIndex = 0; el.setAttribute('role', 'button'); handEl.append(el); });
    else handEl.innerHTML = `<span class="pz-empty">${ZONE_NAMES[zoneOf(puzzle)]} cleared</span>`;
    const box = $('.pz-card-box'), won = over === 'won';
    box.classList.toggle('pz-won', won); $('#pzDone').hidden = !won; if (won) $('#pzDoneMsg').textContent = $('#pzStatus').textContent;
    const off = !!over;
    $('#pzPlay').disabled = off || !picked.size; $('#pzAll').setAttribute('aria-pressed', String(allMode));
    $('#pzUndo').disabled = !undo.length; $('#pzHint').disabled = off === 'won';
    const cap = puzzle.goal.maxPlays;
    $('#pzPlays').textContent = (puzzle.goal.turns > 1 || puzzle.goal.type === 'trap') ? `Turn ${st.turn} of ${puzzle.goal.turns || 2} · ${plays} play${plays === 1 ? '' : 's'}` : cap ? `${plays} / ${cap} plays` : plays ? `${plays} play${plays === 1 ? '' : 's'}` : '';
    const list = availablePuzzles(), solved = solvedSet();
    $('#pzPick').innerHTML = list.length > 1
      ? `<span class="pz-note">Test account: every weekly puzzle is open.</span>` + list.map((p, i) => `<button type="button" class="pz-chip ${p.id === puzzle.id ? 'on' : ''}" data-pz="${p.id}" title="${p.title}">${i + 1}${solved[p.id] ? ' ✓' : ''}</button>`).join('')
      : (solved[puzzle.id] ? '<span class="pz-note">Solved. A new puzzle arrives next week.</span>' : '<span class="pz-note">This week’s puzzle. A new one arrives every week.</span>');
  }
  // Everything fits the screen with no scrolling: shrink the cards (CSS --pzw) until the box stops overflowing.
  // The card size is chosen once per puzzle (full = true: open, load, resize) and then only ever shrinks, so the page
  // never changes size while you play. The Hand keeps the height it had at the start for the same reason.
  let fitW = 64, fitTight = false;
  function fit(full) {
    const box = document.querySelector('#puzzlesModal .pz-card-box'); if (!box || !modal || modal.classList.contains('hidden')) return;
    const hand = $('#pzHand');
    if (full === true) { fitW = 64; fitTight = false; hand.style.minHeight = ''; }
    const apply = () => { box.classList.toggle('pz-tight', fitTight); box.style.setProperty('--pzw', fitW + 'px'); return box.scrollHeight <= box.clientHeight + 1; };
    const shrink = (min) => { for (; fitW >= min; fitW -= 2) if (apply()) return true; fitW = min; apply(); return false; };
    if (!apply()) { if (!shrink(44)) { fitTight = true; shrink(26); } } // short screens: drop the extra lines too
    if (full === true) hand.style.minHeight = hand.offsetHeight + 'px';
  }
  window.addEventListener('resize', () => fit(true));
  function toggle(id) {
    if (over) return;
    const c = st.hand.find(x => x.id === id); if (!c) return;
    const same = allMode && !puzzle.goal.single && !c.isJoker ? st.hand.filter(x => x.rank === c.rank) : [c];
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
    const taken = st.pile;
    if (r.burn || r.joker) { st = { ...st, hand: st.hand.filter(c => !picked.has(c.id)), pile: [], constraint: null, base: null, rival: r.joker ? rival.concat(taken) : rival }; }
    else st = { ...st, hand: st.hand.filter(c => !picked.has(c.id)), pile: st.pile.concat(cards), constraint: r.pos.constraint, base: r.pos.base, rival };
    picked = new Set();
    const g = puzzle.goal, win = (pre = '') => { over = 'won'; markSolved(puzzle.id); winFx(); const base = `${pre}Solved in ${plays} play${plays === 1 ? '' : 's'}.`; say(base, 'good'); draw(); claimReward(base); };
    if (g.type === 'joker' && r.joker) {
      if (r.pickup >= g.min) return win(`The Rival picks up ${r.pickup} cards. `);
      over = 'ended'; say(`The Rival picks up only ${r.pickup} cards and you need ${g.min}. Press Try Again.`, 'bad'); draw(); tryAgain(); return;
    }
    if (g.type === 'out' && !st.hand.length) {
      if (g.last && rank !== g.last) { over = 'ended'; say(`Your Hand is empty, but the last card was ${aRank(rank)} and it had to be ${aRank(g.last)}. Press Try Again.`, 'bad'); draw(); tryAgain(); return; }
      return win();
    }
    const T = g.turns || (g.type === 'trap' ? 2 : 1), multi = g.type === 'trap' || (g.type === 'out' && T > 1);
    if (multi) {
      if (!st.hand.length) { over = 'ended'; say('Your Hand is empty before the Rival is trapped. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
      if (!r.again) {
        if (st.turn >= T) {
          const free = g.type === 'trap' ? st.rival.find(c => E.legal(c.rank, r.pos)) : true;
          if (g.type === 'trap' && !free) { st.pile.forEach(c => st.rival.push(c)); st.pile = []; return win('The Rival cannot play and picks up the Pile. '); }
          over = 'ended'; say(g.type === 'trap' ? `The Rival plays ${aRank(free.rank)} and the puzzle is not solved. Press Try Again.` : 'That was your last turn and your Hand is not empty. Press Try Again.', 'bad'); draw(); tryAgain(); return;
        }
        const rt = E.rivalTurn(r.pos, ranksOf(st.rival));
        if (rt.out || (g.type === 'trap' && (!rt.plays.length || rt.stuck))) { over = 'ended'; say(rt.out ? 'The Rival plays out their Hand. Press Try Again.' : 'The Rival picks up before your last turn, but this puzzle needs them to play. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
        if (rt.stuck && !rt.plays.length) { // the Rival picks the Pile up and you play on
          st.rival = st.rival.concat(st.pile); st.pile = []; st.constraint = null; st.base = null; st.turn++;
          say('The Rival cannot play and picks up the Pile. Your turn again.', 'good'); draw(); return;
        }
        let said = [];
        rt.plays.forEach(pl => {
          const cs = st.rival.filter(c => c.rank === pl.rank).slice(0, pl.n);
          st.rival = st.rival.filter(c => !cs.includes(c)); st.pile = pl.burn ? [] : st.pile.concat(cs);
          said.push((pl.n > 1 ? `${pl.n} × ${pl.rank}` : aRank(pl.rank)));
        });
        st.constraint = rt.pos.constraint; st.base = rt.pos.base; st.turn++;
        if (rt.stuck) { st.rival = st.rival.concat(st.pile); st.pile = []; st.constraint = null; st.base = null; said.push('then picks up the Pile'); }
        const ok = E.canStillWin(posOf(st), g, plays);
        say(`The Rival plays ${said.join(', then ')}. Your turn again.${ok ? '' : ' You can no longer reach the goal. Undo or Restart.'}`, ok ? 'good' : 'bad'); draw(); return;
      }
    }
    if (g.type === 'burn' && r.burn) return win();
    if (g.type === 'pickup') {
      if (!st.hand.length) { over = 'ended'; say('Your Hand is empty before the Rival is stuck. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
      if (!r.again) {
        const free = st.rival.find(c => E.legal(c.rank, r.pos));
        if (!free) { st.pile.forEach(c => st.rival.push(c)); st.pile = []; return win('The Rival cannot play and picks up the Pile. '); }
        over = 'ended'; st.rival = st.rival.filter(c => c !== free); st.pile = st.pile.concat(free);
        say(`The Rival plays ${aRank(free.rank)} and your turn is over. Press Try Again.`, 'bad'); draw(); tryAgain(); return;
      }
    }
    if (!r.again) { over = 'ended'; say('Your turn ends here and the Rival plays on, so the puzzle is not solved. Press Try Again.', 'bad'); draw(); tryAgain(); return; }
    if (g.maxPlays && plays >= g.maxPlays) { over = 'ended'; say(`That was play ${plays}, and the goal is not met. Press Try Again.`, 'bad'); draw(); tryAgain(); return; }
    if (!E.canStillWin(Object.assign({}, r.pos, { rival: ranksOf(st.rival), turn: st.turn }), g, plays)) say('You get another go, but you can no longer reach the goal. Undo or Restart.', 'bad');
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
  // The first hint (before any play) explains the idea, a second tap names the move. Once you have played, every hint is about
  // where you are now: the next move from this exact position, and what it does.
  function doHint() {
    const pos = posOf(st), s = E.solve(pos, 1, goalOf(), plays).solutions[0];
    if (!s) { say('No way to the goal from here. Undo or Restart.', 'bad'); return; }
    const key = puzzle.id + ':' + plays;
    if (!plays && $('#pzHint').dataset.n !== key) { say(`Hint: ${puzzle.hint}`, ''); $('#pzHint').dataset.n = key; return; }
    const m = s[0], r = E.play(pos, m.rank, m.n), g = puzzle.goal;
    const effect = r.joker ? 'It hands the Pile to the Rival.' : s.length === 1 ? 'It finishes the puzzle.' : r.burn ? 'It burns the Pile and you go again.' : r.again ? 'It keeps your turn.' : 'It ends your turn, so the Rival answers.';
    say(`Next, play ${m.n} × ${rankName(m.rank)}. ${effect}`, '');
    $('#pzHint').dataset.n = key;
  }
  function giveUp() {
    const s = E.solve({ hand: puzzle.hand, pile: puzzle.pile, constraint: puzzle.constraint, base: puzzle.base }, 1, puzzle.goal).solutions[0];
    gaveUp = true;
    say('Solution: ' + s.map(m => `${m.n} × ${rankName(m.rank)}`).join(', then ') + '.', '');
  }

  function open(id) {
    modal = document.getElementById('puzzlesModal'); if (!modal) return;
    const list = availablePuzzles();
    load(list.find(p => p.id === id) || current || thisWeek()); current = puzzle;
    modal.classList.remove('hidden'); fit(true);
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
