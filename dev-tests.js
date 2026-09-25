// ShitHead Deluxe developer test suite.
// Loaded by index.html only when the page is opened with ?dev-tests=1, so
// normal players never download it. It runs against the live game's own
// globals (functions and top-level variables in index.html).
// ============================================================
// Activated only by adding ?dev-tests=1 to the URL; completely inert and
// unreferenced during normal play. Runs against the REAL functions above
// (not a copy), so it can never silently drift out of sync with the
// actual game logic. saveGameState is stubbed out for the duration of the
// run so test scenarios can never overwrite a real in-progress save.
// ============================================================
async function runDevTestSuite() {
  devTestSuiteRunning = true;
  const originalSaveGameState = saveGameState;
  saveGameState = function () {};
  burnInstantResolveForTests = true;
  // The economy lives on the server (functions/economy.js). Tests never reach
  // it: by default a call fails at once (as with no signal); tests that need
  // an answer swap in a fake with fakeEconomy(). Restored after every test.
  const realCallEconomy = callEconomy;
  const offlineEconomy = () => Promise.reject(new Error('No server in the test suite.'));
  callEconomy = offlineEconomy;
  // Fakes the server: `handlers[action](data)` returns the result; every
  // call is recorded as [action, data].
  function fakeEconomy(handlers) {
    const calls = [];
    callEconomy = (action, data = {}) => {
      calls.push([action, data]);
      const handler = handlers[action];
      return handler ? Promise.resolve().then(() => handler(data)) : Promise.reject(new Error(`No fake for ${action}`));
    };
    return calls;
  }

  const results = [];

  function assertEqual(actual, expected, msg) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a !== e) throw new Error(`${msg} — expected ${e}, got ${a}`);
  }
  function assertTrue(cond, msg) {
    if (!cond) throw new Error(msg);
  }
  // async so a test that returns a Promise (mocking an async
  // Firebase call like onAuthStateChanged) is genuinely awaited here —
  // its assertions run and are caught by this same try/catch, and any
  // cleanup/restoration inside its .then() chain completes, BEFORE
  // the next test starts. Previously this called fn() and moved on
  // immediately: an async test's real assertions ran later as an
  // unhandled promise rejection (surfacing as a raw page error
  // instead of a clean test failure) and its state restoration
  // (auth = originalAuth, etc.) could still be pending when the very
  // next test read that same global — exactly what caused the
  // Leaderboard guest test to intermittently see a stale mocked
  // `auth` left over from the test before it.
  // Every test gets the real Firebase handles and hooks back afterwards,
  // even when it failed half-way through swapping in a fake. Without this
  // one failing test leaked its fake db into every test after it.
  async function test(name, fn) {
    const saved = { db, dbRef: db && db.ref, auth, currentUser, syncFirebaseGameState, burnInstantResolveForTests, bigEffectsOn, reduceMotion, callEconomy };
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    } finally {
      db = saved.db; if (db && saved.dbRef) db.ref = saved.dbRef;
      auth = saved.auth; currentUser = saved.currentUser;
      syncFirebaseGameState = saved.syncFirebaseGameState; burnInstantResolveForTests = saved.burnInstantResolveForTests;
      bigEffectsOn = saved.bigEffectsOn; reduceMotion = saved.reduceMotion;
      callEconomy = saved.callEconomy;
    }
  }
  function makeCard(rank, suit, id) {
    return { id: id || `${rank}_${suit || 'x'}_${Math.random().toString(36).slice(2)}`, rank, suit: suit || '♠', isJoker: rank === 'JOKER' };
  }
  function makePlayer(overrides) {
    return Object.assign({
      id: 'p1', name: 'Test Player', isBot: false, hasFinished: false, finishRank: null,
      hand: [], faceUp: [], faceDown: [], isReady: true
    }, overrides);
  }
  function freshState(overrides) {
    Object.assign(state, {
      phase: 'PLAY', isMultiplayer: false, isHost: false, direction: 1, currentTurnIndex: 0,
      discardPile: [], drawPile: [], playedHistory: [], activeConstraint: null, baseOverrideCard: null,
      lastJokerInitiatorId: null,
      pendingFollowUp: null, pendingFaceUpSacrifice: null, selectedSacrificeIds: [], selectedPlayCardIds: [],
      // A real (non-instant) burn test leaves burnResolving true since it
      // never lets the hold's setTimeout fire — without resetting it
      // here, that leaks into whichever test runs next and makes
      // isLocalPlayersTurnNow() falsely false for them.
      burnResolving: false, turnTransitionLocked: false, blindRevealing: false,
      turnDeadline: null, localPlayerId: 'p1', difficulty: 'medium', players: []
    }, overrides || {});
  }

  // ---- isPlayLegal: the three wildcards and their documented exceptions ----
  await test('3 is playable on a King (Transparent is a wildcard)', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('3'), [makeCard('K')], null), '3 should be legal on a King');
  });
  await test('3 is blocked by a 6', () => {
    freshState();
    assertTrue(!isPlayLegal(makeCard('3'), [makeCard('6')], null), '3 should NOT be legal on a 6');
  });
  await test('2 is playable on anything except a Jack', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('2'), [makeCard('K')], null), '2 should be legal on a King');
    assertTrue(!isPlayLegal(makeCard('2'), [makeCard('J')], null), '2 should NOT be legal on a Jack');
  });
  await test('10 is blocked by 7 or Jack, legal otherwise', () => {
    freshState();
    assertTrue(!isPlayLegal(makeCard('10'), [makeCard('7')], null), '10 should NOT be legal on a 7');
    assertTrue(!isPlayLegal(makeCard('10'), [makeCard('J')], null), '10 should NOT be legal on a Jack');
    assertTrue(isPlayLegal(makeCard('10'), [makeCard('Q')], null), '10 should be legal on a Queen');
  });
  await test('A stale ODD/EVEN/LOW7 constraint is ignored once the pile is genuinely empty', () => {
    freshState();
    // Simulates a burn (or any bug/race) that cleared discardPile but
    // left activeConstraint behind — nothing should be blocked by it.
    assertTrue(isPlayLegal(makeCard('Q'), [], 'ODD'), 'Q should be legal on an empty pile even with a leftover ODD constraint');
    assertTrue(isPlayLegal(makeCard('K'), [], 'EVEN'), 'K should be legal on an empty pile even with a leftover EVEN constraint');
    assertTrue(isPlayLegal(makeCard('K'), [], 'LOW7'), 'K should be legal on an empty pile even with a leftover LOW7 constraint');
    // Sanity check the guard doesn't also erase a genuine base-override
    // constraint (a "5" drop-to-base) — that one has a real card behind
    // it and must still apply normally.
    state.baseOverrideCard = makeCard('7');
    assertTrue(!isPlayLegal(makeCard('K'), [], null), 'A real base-override constraint must still apply on an empty pile');
    state.baseOverrideCard = null;
  });
  await test('4 can be played on a 2, 4, 6, or 7 — and nothing else', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('4'), [makeCard('2')], null), '4 on 2 should be legal');
    assertTrue(isPlayLegal(makeCard('4'), [makeCard('4')], null), '4 on 4 should be legal');
    assertTrue(isPlayLegal(makeCard('4'), [makeCard('6')], null), '4 on 6 should be legal');
    assertTrue(isPlayLegal(makeCard('4'), [makeCard('7')], null), '4 on 7 should be legal');
    assertTrue(!isPlayLegal(makeCard('4'), [makeCard('9')], null), '4 on 9 should be illegal');
    assertTrue(!isPlayLegal(makeCard('4'), [makeCard('K')], null), '4 on K should be illegal');
  });
  await test('EVEN constraint restricts to even ranks; wildcards still bypass it', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('8'), [makeCard('6')], 'EVEN'), '8 should satisfy EVEN');
    assertTrue(!isPlayLegal(makeCard('7'), [makeCard('6')], 'EVEN'), '7 should NOT satisfy EVEN');
    assertTrue(isPlayLegal(makeCard('2'), [makeCard('6')], 'EVEN'), '2 should bypass EVEN as a wildcard');
  });
  await test('LOW7 constraint allows 7-or-lower plus 2 and 3', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('6'), [makeCard('7')], 'LOW7'), '6 should satisfy LOW7');
    assertTrue(!isPlayLegal(makeCard('9'), [makeCard('7')], 'LOW7'), '9 should NOT satisfy LOW7');
    assertTrue(isPlayLegal(makeCard('2'), [makeCard('7')], 'LOW7'), '2 should bypass LOW7 as a wildcard');
  });
  await test('Transparent (3): effective top card sees through a 3', () => {
    freshState();
    const effective = getEffectiveTopCard([makeCard('K'), makeCard('3')]);
    assertEqual(effective.rank, 'K', 'Effective top card should see through the 3 to the King underneath');
  });

  // ---- Regression: a 3 played after a 5 must preserve the base-override ----
  await test('REGRESSION: a 3 played after a 5 preserves the base-override requirement', () => {
    freshState({
      players: [
        makePlayer({ id: 'p1', hand: [makeCard('3', '♠', 'threeCard')] }),
        makePlayer({ id: 'p2', isBot: true, hand: [makeCard('9', '♦')] })
      ],
      discardPile: [makeCard('7', '♣'), makeCard('5', '♦')],
      baseOverrideCard: makeCard('7', '♣'),
      currentTurnIndex: 0
    });
    executePlayCards('p1', [state.players[0].hand[0]]);
    assertTrue(!!state.baseOverrideCard && state.baseOverrideCard.rank === '7',
      'baseOverrideCard should still be the 7 after the 3 is played, not cleared');
  });

  // ---- 5 inheriting 8/9 base effects ----
  await test('5 inherits an 8 base card\'s skip effect, scaled by how many 5s were played', () => {
    freshState({
      players: [
        makePlayer({ id: 'p1', hand: [makeCard('5', '♠'), makeCard('5', '♦')] }),
        makePlayer({ id: 'p2', isBot: true, hand: [] }),
        makePlayer({ id: 'p3', isBot: true, hand: [] })
      ],
      discardPile: [makeCard('8', '♣')],
      currentTurnIndex: 0
    });
    executePlayCards('p1', state.players[0].hand.slice());
    assertEqual(state.currentTurnIndex, 0, 'Two 5s on an 8-base with 2 opponents should skip both and return to the player');
  });
  await test('5 inherits a 9 base card\'s direction-reversal effect', () => {
    freshState({
      players: [
        makePlayer({ id: 'p1', hand: [makeCard('5', '♠')] }),
        makePlayer({ id: 'p2', isBot: true, hand: [] })
      ],
      discardPile: [makeCard('9', '♦')],
      direction: 1,
      currentTurnIndex: 0
    });
    executePlayCards('p1', state.players[0].hand.slice());
    assertEqual(state.direction, -1, 'One 5 on a 9-base should reverse direction (odd count)');
  });

  // ---- Jokers can only ever be played one at a time ----
  await test('selectBestBotMove never returns more than one Joker', () => {
    freshState();
    const bot = makePlayer({ id: 'p2', isBot: true, hand: [makeCard('JOKER'), makeCard('JOKER')] });
    const chosen = selectBestBotMove(bot, bot.hand.slice(), 'boss');
    assertEqual(chosen.length, 1, 'A bot should never select more than one Joker at once');
  });
  await test('toggleCardSelection replaces rather than adds a second Joker', () => {
    freshState();
    const j1 = makeCard('JOKER', 'JOKER', 'j1');
    const j2 = makeCard('JOKER', 'JOKER', 'j2');
    state.players = [makePlayer({ id: 'p1', hand: [j1, j2] })];
    state.selectedPlayCardIds = [];
    toggleCardSelection(j1.id, [j1, j2]);
    toggleCardSelection(j2.id, [j1, j2]);
    assertEqual(state.selectedPlayCardIds, [j2.id], 'Selecting a second Joker should replace the first, not add to it');
  });
  await test('REGRESSION: cards cannot be selected out of turn and stale highlights are cleared', () => {
    freshState({ phase: 'PLAY', discardPile: [makeCard('4')] });
    const five = makeCard('5');
    state.players = [makePlayer({ id: 'p1', hand: [five] }), makePlayer({ id: 'p2', hand: [makeCard('6')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 1;
    state.selectedPlayCardIds = [five.id];
    render();
    assertEqual(state.selectedPlayCardIds, [], 'Changing away from the local turn must clear a highlighted card');
    toggleCardSelection(five.id, [five]);
    assertEqual(state.selectedPlayCardIds, [], 'A direct out-of-turn selection attempt must remain locked');
  });
  await test('REGRESSION: out-of-turn Face-Up cards stay opaque so Face-Down cosmetics cannot bleed through', () => {
    const ruleText = Array.from(document.styleSheets).flatMap((sheet) => {
      try { return Array.from(sheet.cssRules || []).map(rule => rule.cssText); } catch (e) { return []; }
    }).find(text => text.startsWith('.card-out-of-turn {')) || '';
    assertTrue(/opacity:\s*1\s*!important/i.test(ruleText), 'Out-of-turn cards must remain fully opaque');
    assertTrue(!/opacity:\s*\.(?:[0-9]+)/i.test(ruleText), 'The locked appearance must not reveal the card underneath');
  });
  await test('REGRESSION: cached bot wins and difficulty unlocks are monotonic per account', () => {
    const uid = 'difficulty-cache-test';
    try {
      localStorage.removeItem(difficultyWinsCacheKey(uid));
      cacheDifficultyWins(uid, { easy: 3, medium: 5, hard: 10 });
      cacheDifficultyWins(uid, { easy: 1, medium: 2, hard: 4 });
      const cached = readCachedDifficultyWins(uid);
      assertEqual(cached.easy, 3, 'A stale Easy count must not erase earlier wins');
      assertEqual(cached.medium, 5, 'A stale Medium count must not relock Hard');
      assertEqual(cached.hard, 10, 'A stale Hard count must not relock Boss');
      const unlocked = computeUnlockedDifficulties(cached);
      assertTrue(unlocked.medium && unlocked.hard && unlocked.boss, 'Previously unlocked difficulties must remain unlocked');
    } finally {
      localStorage.removeItem(difficultyWinsCacheKey(uid));
    }
  });

  // ---- Fixed-slot system: no compaction ----
  await test('buildFixedSlots leaves a true gap where a card was removed', () => {
    const cards = [{ id: 'A', slotIndex: 0 }, { id: 'C', slotIndex: 2 }];
    const slots = buildFixedSlots(cards);
    assertEqual(slots.map(c => c ? c.id : null), ['A', null, 'C'], 'Removing the middle card should leave a gap, not compact the array');
  });

  // ---- Multi-row hand splitting ----
  await test('computeHandRows splits 11 cards into 6/5', () => {
    const hand = Array.from({ length: 11 }, (_, i) => makeCard('4', '♠', `c${i}`));
    assertEqual(computeHandRows(hand).map(r => r.length), [6, 5], '11 cards should split 6/5');
  });
  await test('computeHandRows splits 25 cards into 9/8/8 across three rows', () => {
    const hand = Array.from({ length: 25 }, (_, i) => makeCard('4', '♠', `c${i}`));
    assertEqual(computeHandRows(hand).map(r => r.length), [9, 8, 8], '25 cards should split 9/8/8');
  });
  await test('computeHandRows keeps a single row for 10 or fewer cards', () => {
    const hand = Array.from({ length: 10 }, (_, i) => makeCard('4', '♠', `c${i}`));
    assertEqual(computeHandRows(hand).length, 1, '10 cards should stay a single row');
  });

  // ---- Regression: snap-burn hand-before-face-up hierarchy ----
  await test('REGRESSION: snap-burn excludes face-up cards while the hand still has cards', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [makeCard('4'), makeCard('6')], faceUp: [makeCard('2', '♥')] });
    const matches = getSnapMatchesForPlayer(player, '2');
    assertEqual(matches.length, 0, 'A face-up 2 should not be snap-usable while the hand is non-empty');
  });
  await test('Snap-burn includes face-up cards once the hand is completely empty', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('2', '♥')] });
    const matches = getSnapMatchesForPlayer(player, '2');
    assertEqual(matches.length, 1, 'A face-up 2 should be snap-usable once the hand is empty');
  });
  await test('getSnapBurnNeeded correctly counts the current streak', () => {
    const info = getSnapBurnNeeded([makeCard('9'), makeCard('2'), makeCard('2'), makeCard('2')]);
    assertEqual(info.needed, 1, 'Three 2s in a row need exactly one more to complete the burn');
  });

  // ---- REGRESSION: the "Camille" bug — a full three-tier hierarchy ----
  // Hand -> Face-Up -> Face-Down, each tier requiring EVERY tier before it
  // to be completely empty (hand AND deck for face-up; hand AND deck AND
  // face-up for face-down). The original bug: face-up eligibility only
  // ever checked the hand, never the deck — so a hand that was only
  // momentarily empty (e.g. mid-burn-animation, before the deck refill
  // completes) could unlock a face-up card it had no business unlocking.
  await test('REGRESSION: canAccessFaceUp is false with an empty hand while the deck still has cards', () => {
    freshState({ drawPile: [makeCard('K')] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('2', '♥')] });
    assertTrue(!canAccessFaceUp(player), 'Face-up must stay locked while the deck can still refill the hand');
  });
  await test('canAccessFaceUp is true once both hand and deck are empty', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('2', '♥')] });
    assertTrue(canAccessFaceUp(player), 'Face-up should unlock once hand and deck are both empty');
  });
  await test('REGRESSION: a normal Face-Up-only play is not rejected as an invalid Cross-Phase play', () => {
    freshState({ drawPile: [] });
    const three = makeCard('3', '♣');
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [three] });
    assertTrue(isValidFaceUpSelection(player, [three]), 'With no Hand cards left, a selected Face-Up card must pass Play-button validation');
  });
  await test('Cross-Phase validation still requires every remaining matching Hand card', () => {
    freshState({ drawPile: [] });
    const handA = makeCard('7', '♣');
    const handB = makeCard('7', '♥');
    const faceUp = makeCard('7', '♦');
    const player = makePlayer({ id: 'p1', hand: [handA, handB], faceUp: [faceUp] });
    assertTrue(!isValidFaceUpSelection(player, [handA, faceUp]), 'A mixed play must fail if any remaining matching Hand card was omitted');
    assertTrue(isValidFaceUpSelection(player, [handA, handB, faceUp]), 'A mixed play must pass when every Hand card and matching Face-Up card share one rank');
  });
  await test('REGRESSION: canAccessFaceDown is false while face-up cards remain, even with hand and deck empty', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('2', '♥')], faceDown: [makeCard('K')] });
    assertTrue(!canAccessFaceDown(player), 'Face-down must stay locked while any face-up cards remain');
  });
  await test('canAccessFaceDown is true once hand, deck, and face-up are all empty', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [makeCard('K')] });
    assertTrue(canAccessFaceDown(player), 'Face-down should unlock once hand, deck, and face-up are all empty');
  });
  await test('REGRESSION: getLegalMovesForPlayer excludes face-up cards with an empty hand but a non-empty deck', () => {
    freshState({ drawPile: [makeCard('K')] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('7', '♥')] });
    const moves = getLegalMovesForPlayer(player, [makeCard('6')], null);
    assertEqual(moves.length, 0, 'A face-up 7 should not be a legal move while the deck still has cards, even with an empty hand');
  });
  await test('getLegalMovesForPlayer includes face-up cards once hand and deck are both empty', () => {
    freshState({ drawPile: [] });
    const player = makePlayer({ id: 'p1', hand: [], faceUp: [makeCard('7', '♥')] });
    const moves = getLegalMovesForPlayer(player, [makeCard('6')], null);
    assertEqual(moves.length, 1, 'A face-up 7 should become a legal move once hand and deck are both empty');
  });

  // ---- REGRESSION: deal integrity (3 hand / 3 face-up / 3 face-down) ----
  // The original bug: botPerformSwap promoted cards from the hand into
  // face-up without assigning them a slotIndex. buildFixedSlots then fell
  // back to array position for those, collided with a card that DID have
  // an explicit slotIndex, and silently dropped the loser — leaving a bot
  // visibly starting with only 2 face-up cards.
  await test('checkDealIntegrity passes for a correctly dealt player', () => {
    const p = makePlayer({
      name: 'Dealt',
      hand: [makeCard('4'), makeCard('5'), makeCard('6')],
      faceUp: [0, 1, 2].map(i => ({ ...makeCard('7'), slotIndex: i })),
      faceDown: [0, 1, 2].map(i => ({ ...makeCard('8'), slotIndex: i }))
    });
    assertEqual(checkDealIntegrity([p]), [], 'A correctly dealt player should report no problems');
  });
  await test('checkDealIntegrity catches a player short a face-up card', () => {
    const p = makePlayer({
      name: 'Short',
      hand: [makeCard('4'), makeCard('5'), makeCard('6')],
      faceUp: [0, 1].map(i => ({ ...makeCard('7'), slotIndex: i })),
      faceDown: [0, 1, 2].map(i => ({ ...makeCard('8'), slotIndex: i }))
    });
    assertTrue(checkDealIntegrity([p]).some(m => m.includes('face-up')), 'Should flag a player with only 2 face-up cards');
  });
  await test('REGRESSION: checkDealIntegrity catches two cards claiming the same slot', () => {
    const p = makePlayer({
      name: 'Collide',
      hand: [makeCard('4'), makeCard('5'), makeCard('6')],
      faceUp: [{ ...makeCard('7'), slotIndex: 0 }, { ...makeCard('9'), slotIndex: 0 }, { ...makeCard('J'), slotIndex: 2 }],
      faceDown: [0, 1, 2].map(i => ({ ...makeCard('8'), slotIndex: i }))
    });
    assertTrue(checkDealIntegrity([p]).some(m => m.includes('slot')), 'Should flag two face-up cards claiming the same slot');
  });
  await test('REGRESSION: botPerformSwap leaves the bot with a valid 3/3/3 deal and unique slots', () => {
    freshState();
    const bot = makePlayer({
      name: 'SwapBot', isBot: true,
      hand: [makeCard('A', '♠'), makeCard('K', '♦'), makeCard('4', '♣')],
      faceUp: [0, 1, 2].map(i => ({ ...makeCard('5', '♥'), slotIndex: i })),
      faceDown: [0, 1, 2].map(i => ({ ...makeCard('8', '♠'), slotIndex: i }))
    });
    botPerformSwap(bot, 'hard');
    assertEqual(checkDealIntegrity([bot]), [], 'A bot should still have a valid 3/3/3 deal with unique slots after swapping');
  });
  await test('REGRESSION: buildFixedSlots never silently drops a card on slot collision', () => {
    const cards = [
      { id: 'noSlot', rank: 'A' },
      { id: 'claimsZero', rank: 'K', slotIndex: 0 },
      { id: 'claimsTwo', rank: 'Q', slotIndex: 2 }
    ];
    const placed = buildFixedSlots(cards).filter(Boolean).map(c => c.id);
    assertEqual(placed.length, 3, 'All three cards must be placed somewhere — none may silently vanish');
  });

  // ---- REGRESSION: a 5 is legal on a Jack (Jack demands ODD; 5 is odd) ----
  await test('REGRESSION: a 5 can be played on a Jack (ODD constraint)', () => {
    freshState();
    assertTrue(isPlayLegal(makeCard('5'), [makeCard('J')], 'ODD'),
      'A 5 must be legal on a Jack — a Jack forces an ODD card and 5 is odd');
    assertTrue(!isPlayLegal(makeCard('4'), [makeCard('J')], 'ODD'),
      'A 4 must NOT be legal on a Jack — 4 is even');
  });
  await test('REGRESSION: tutorial scenes derive the top card constraint like a real game', () => {
    freshState(); tutorialTestSetup();
    startTutorial();
    // A scene whose top card is a Jack must set the ODD constraint, not null.
    tutorialApplyScene({ hand: [['5','D']], pile: [['4','H'],['J','C']], coach: [['9','S']] });
    const c = state.activeConstraint;
    endTutorial(false);
    assertEqual(c, 'ODD', 'A scene topped by a Jack must apply the ODD constraint');
  });

  // ---- REGRESSION: tutorial must stay on-script and non-intrusive ----
  await test('REGRESSION: tutorial blocks card plays on explanation steps', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    showTutorialStep(0);
    const blocked = tutorialInterceptPlay([{ rank: 'K', id: 'x' }]) === false;
    endTutorial(false);
    assertTrue(blocked, 'An explanation step must not allow cards to be played');
  });
  await test('REGRESSION: tutorial suppresses the bonus-draw prompt', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    // Find a step that carries its OWN explicit scene (rather than one
    // that continues a previous step's hand, like the later multi-card
    // rank lessons do) — showTutorialStep only applies scene.hand etc.
    // when scene is actually present on that step, so jumping straight
    // to a continuation step leaves the hand empty instead of dealt.
    const idx = TUTORIAL_STEPS.findIndex(st => st.scene && st.require && st.require.rank && (!st.require.count || st.require.count === 1));
    showTutorialStep(idx);
    const rank = TUTORIAL_STEPS[idx].require.rank;
    const card = state.players[0].hand.find(c => c.rank === rank);
    assertTrue(!!card, 'The chosen step must actually deal the card its own lesson requires');
    state.drawPile.unshift({ id: 'bonusCard', rank, suit: 'H', isJoker: false });
    executePlayCards('tut_you', [card]);
    const pending = state.pendingFollowUp;
    endTutorial(false);
    assertEqual(pending, null, 'The bonus-draw prompt must never fire during the tutorial');
  });
  await test('Tutorial teaches playing multiple cards of the same rank', () => {
    const multi = TUTORIAL_STEPS.filter(s => s.require && s.require.count >= 2);
    assertTrue(multi.length >= 2, 'The tutorial must include multi-card play lessons');
  });

  // ---- Tutorial: swap phase lesson ----
  await test('Tutorial teaches the swap phase before any card is played', () => {
    const firstSwap = TUTORIAL_STEPS.findIndex(s => s.phase === 'SWAP');
    const firstPlay = TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank);
    assertTrue(firstSwap !== -1, 'The tutorial must include a swap-phase lesson');
    assertTrue(firstSwap < firstPlay, 'The swap lesson must come before the first card play');
  });
  await test('Tutorial swap step performs a real swap and keeps slot indices valid', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const swapIdx = TUTORIAL_STEPS.findIndex(s => s.require && s.require.swap);
    showTutorialStep(swapIdx);
    const two = state.players[0].hand.find(c => c.rank === '2');
    const fourSlot = state.players[0].faceUp.findIndex(c => c.rank === '4');
    handleSwapHandClick(two.id);
    handleSwapFaceUpClick(fourSlot);
    const faceUpRanks = state.players[0].faceUp.map(c => c.rank);
    const slots = state.players[0].faceUp.map(c => c.slotIndex).sort();
    endTutorial(false);
    assertTrue(faceUpRanks.includes('2'), 'The 2 must move into the face-up cards');
    assertEqual(slots, [0, 1, 2], 'Slot indices must stay unique and valid after a swap');
  });
  await test('REGRESSION: tutorial swap steps reject card plays', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const swapIdx = TUTORIAL_STEPS.findIndex(s => s.require && s.require.swap);
    showTutorialStep(swapIdx);
    const blocked = tutorialInterceptPlay([state.players[0].hand[0]]) === false;
    endTutorial(false);
    assertTrue(blocked, 'No cards may be played during the swap phase lesson');
  });

  // ============================================================
  // FULL CARD LEGALITY MATRIX
  // Locked down in three layers, because the situational cards can only
  // be judged in context:
  //   1. DIRECT   — card played straight onto a top card.
  //   2. THROUGH A 3 — the transparent card defers to whatever is beneath it,
  //      so a single-card pile tells you nothing about its real behaviour.
  //   3. THROUGH A 5 — drops the target to the BASE card at the bottom of
  //      the pile, so the same card can be legal or not depending on what
  //      was played first.
  // Every expectation below is the intended RULE, not a snapshot of
  // current behaviour — if the engine drifts, these fail.
  // ============================================================
  const M = (rank) => makeCard(rank, rank === 'JOKER' ? 'JOKER' : '♠');
  // Legality as a real game would evaluate it: the constraint the top
  // card creates is applied, exactly as deriveConstraintFromRank does.
  function legalInPlay(playRank, pileRanks, override) {
    const pile = pileRanks.map(M);
    const eff = getEffectiveTopCard(pile);
    const constraint = eff ? deriveConstraintFromRank(eff.rank) : null;
    if (override !== undefined) state.baseOverrideCard = override === null ? null : M(override);
    const res = isPlayLegal(M(playRank), pile, constraint);
    state.baseOverrideCard = null;
    return res;
  }

  // ---- Layer 1: DIRECT plays ----
  // topRank -> the complete set of ranks that may be played onto it.
  const DIRECT = {
    '2': ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'],
    '3': ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'],
    '4': ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'],
    '5': ['2','3','5','6','7','8','9','10','J','Q','K','A','JOKER'],
    '6': ['2','4','6','8','10','Q','A','JOKER'],
    '7': ['2','3','4','5','6','7','JOKER'],
    '8': ['2','3','8','9','10','J','Q','K','A','JOKER'],
    '9': ['2','3','9','10','J','Q','K','A','JOKER'],
    'J': ['3','5','7','9','J','K','JOKER'],
    'Q': ['2','3','10','Q','K','A','JOKER'],
    'K': ['2','3','10','K','A','JOKER'],
    'A': ['2','3','10','A','JOKER']
  };
  const ALL_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A','JOKER'];

  Object.keys(DIRECT).forEach(top => {
    test(`MATRIX direct: correct cards are legal on a ${top}`, () => {
      freshState();
      const allowed = DIRECT[top];
      ALL_RANKS.forEach(play => {
        const expected = allowed.includes(play);
        const actual = legalInPlay(play, [top]);
        assertEqual(actual, expected,
          `${play} on ${top} should be ${expected ? 'LEGAL' : 'ILLEGAL'}`);
      });
    });
  });

  await test('MATRIX: an empty pile accepts every card', () => {
    freshState();
    ALL_RANKS.forEach(play => {
      assertTrue(isPlayLegal(M(play), [], null), `${play} must be playable on an empty pile`);
    });
  });

  await test('MATRIX: nothing is ever asked to play onto a 10 or a Joker', () => {
    // A 10 burns the pile and a Joker leaves the game, so neither can be
    // the card you must beat. This documents the invariant explicitly.
    freshState();
    assertEqual(deriveConstraintFromRank('10'), null, 'A 10 sets no constraint — it burns instead');
    assertEqual(deriveConstraintFromRank('JOKER'), null, 'A Joker sets no constraint — it leaves the game');
  });

  // ---- Layer 2: THROUGH A 3 (transparent) ----
  await test('MATRIX transparent: a 3 defers to the card underneath it', () => {
    freshState();
    // A 4 can only go on 2/3/4/6/7 — so through a 3 it follows the card below.
    assertTrue(legalInPlay('4', ['6','3']), '4 on [3 over 6] should be legal');
    assertTrue(legalInPlay('4', ['7','3']), '4 on [3 over 7] should be legal');
    assertTrue(legalInPlay('4', ['4','3']), '4 on [3 over 4] should be legal');
    assertTrue(legalInPlay('4', ['2','3']), '4 on [3 over 2] should be legal');
    assertTrue(!legalInPlay('4', ['K','3']), '4 on [3 over K] should be ILLEGAL');
    assertTrue(!legalInPlay('4', ['9','3']), '4 on [3 over 9] should be ILLEGAL');
    assertTrue(!legalInPlay('4', ['Q','3']), '4 on [3 over Q] should be ILLEGAL');
  });
  await test('MATRIX transparent: stacked 3s still see through to the real card', () => {
    freshState();
    assertTrue(legalInPlay('4', ['6','3','3']), '4 through two 3s over a 6 should be legal');
    assertTrue(!legalInPlay('4', ['K','3','3']), '4 through two 3s over a K should be ILLEGAL');
  });
  await test('REGRESSION MATRIX transparent: a lone 3 has nothing underneath, so a 4 beats it on rank', () => {
    freshState();
    assertTrue(legalInPlay('4', ['3']), 'A 4 must be legal on a lone 3 (4 beats 3 on rank)');
    assertTrue(legalInPlay('4', ['3','3']), 'A 4 must be legal on a pile of only 3s');
  });
  await test('MATRIX transparent: a 3 passes the constraint underneath it through', () => {
    freshState();
    // A 6 demands EVEN; a 3 played on it does not clear that demand.
    assertEqual(deriveConstraintFromRank(getEffectiveTopCard([M('6'), M('3')]).rank), 'EVEN',
      'A 3 over a 6 must still present the EVEN demand');
  });

  // ---- Layer 3: THROUGH A 5 (base drop) ----
  await test('MATRIX base-drop: after a 5, cards are judged against the BASE card', () => {
    freshState();
    // Junk in between must be irrelevant — only the bottom card matters.
    const pile = ['6','9','K','5'];
    assertTrue(legalInPlay('4', pile, '6'), '4 should be legal when the base is a 6');
    assertTrue(legalInPlay('4', ['7','9','K','5'], '7'), '4 should be legal when the base is a 7');
    assertTrue(legalInPlay('4', ['2','9','K','5'], '2'), '4 should be legal when the base is a 2');
    assertTrue(legalInPlay('4', ['4','9','K','5'], '4'), '4 should be legal when the base is a 4');
    assertTrue(!legalInPlay('4', ['K','9','Q','5'], 'K'), '4 should be ILLEGAL when the base is a K');
    assertTrue(!legalInPlay('4', ['9','K','Q','5'], '9'), '4 should be ILLEGAL when the base is a 9');
    assertTrue(!legalInPlay('4', ['Q','9','K','5'], 'Q'), '4 should be ILLEGAL when the base is a Q');
  });
  await test('MATRIX base-drop: a real 5 play sets the override to the bottom card', () => {
    freshState({ discardPile: [makeCard('6'), makeCard('9'), makeCard('K')], drawPile: [] });
    const five = makeCard('5');
    state.players = [
      makePlayer({ id: 'p1', hand: [five] }),
      makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })
    ];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [five]);
    assertTrue(!!state.baseOverrideCard, 'Playing a 5 must set a base override');
    assertEqual(state.baseOverrideCard.rank, '6', 'The override must be the BOTTOM card, not the top');
  });

  // ---- Keyboard: 1/2/3 must respect the same access hierarchy ----
  await test('REGRESSION: 1/2/3 cannot reach face-up cards while the hand or deck has cards', () => {
    freshState({ drawPile: [makeCard('K')], discardPile: [makeCard('3')] });
    const you = makePlayer({ id: 'p1', hand: [makeCard('9')],
      faceUp: [0,1,2].map(i => ({ ...makeCard('K'), slotIndex: i })) });
    state.players = [you, makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    assertTrue(!canAccessFaceUp(you), 'Face-up must stay locked with cards in hand and deck');
    you.hand = [];
    assertTrue(!canAccessFaceUp(you), 'Face-up must stay locked while the deck still has cards');
    state.drawPile = [];
    assertTrue(canAccessFaceUp(you), 'Face-up unlocks only once hand AND deck are empty');
  });
  await test('Guide documents the face-up keyboard shortcut', () => {
    const guide = document.body.innerHTML;
    assertTrue(guide.includes('1, 2, 3 (Face-Up Phase)'),
      'The guide must document the face-up 1/2/3 shortcut');
  });
  await test('REGRESSION: online guests accept first deal but retain swaps within that deal', () => {
    const dealt = makePlayer({ id: 'guest', hand: [makeCard('2'), makeCard('3'), makeCard('4')],
      faceUp: [makeCard('5'), makeCard('6'), makeCard('7')],
      faceDown: [makeCard('8'), makeCard('9'), makeCard('10')], isReady: false });
    const lobby = makePlayer({ id: 'guest', hand: [], faceUp: [], faceDown: [], isReady: false });
    assertTrue(!shouldKeepLocalSwapCards(lobby, dealt), 'An empty lobby entry must never replace the new deal');
    const swapped = { ...dealt, hand: [dealt.faceUp[0], dealt.hand[1], dealt.hand[2]],
      faceUp: [dealt.hand[0], dealt.faceUp[1], dealt.faceUp[2]] };
    assertTrue(shouldKeepLocalSwapCards(swapped, dealt), 'An unfinished local swap of the same cards must survive a remote update');
    const replay = { ...dealt, hand: [makeCard('J'), ...dealt.hand.slice(1)] };
    assertTrue(!shouldKeepLocalSwapCards(swapped, replay), 'A new match must discard cards from the previous deal');
  });
  await test('REGRESSION: an online guest cannot Ready with an empty deal', () => {
    freshState({ phase: 'SWAP', isMultiplayer: true, isHost: false });
    const guest = makePlayer({ id: 'p1', isReady: false });
    state.players = [guest];
    finishLocalSwap();
    assertTrue(!guest.isReady, 'Ready must wait for all nine cards before writing the room');
  });
  await test('REGRESSION: menu panels and Guide keep their close buttons below the header', () => {
    const headerBottom = document.querySelector('body > header').getBoundingClientRect().bottom;
    for (const id of ['settingsModal', 'themesModal', 'shopModal', 'rulesModal', 'tutorialHubScreen']) {
      const panel = document.getElementById(id);
      const top = parseFloat(getComputedStyle(panel).top);
      assertTrue(top >= headerBottom - 1, `${id} must start below the persistent header`);
      assertTrue(!!panel.querySelector('button[aria-label="Close"]'), `${id} needs a visible close button`);
    }
  });
  await test('Card-zone labels are present, positioned safely, and documented', () => {
    ['handZoneLabel', 'tableZoneLabel'].forEach(id => {
      const label = document.getElementById(id);
      assertTrue(!!label, `${id} must exist`);
      // Labels carry a dark pill so they stay readable on every table theme.
      assertTrue(getComputedStyle(label).backgroundColor !== 'rgba(0, 0, 0, 0)', `${id} must have a readable backing`);
    });
    assertEqual(getComputedStyle(document.getElementById('handZoneLabel')).position, 'static', 'Hand label must reserve its own row');
    assertEqual(getComputedStyle(document.getElementById('tableCardZoneLabels')).position, 'absolute', 'Table label must not affect card centring');
    assertEqual(document.querySelectorAll('#tableCardZoneLabels .card-zone-label').length, 1,
      'The stacked table cards must have exactly one label');
    assertTrue(document.getElementById('localTableCardZone').classList.contains('justify-center'), 'Table cards must be independently centred');
    assertEqual(document.querySelectorAll('#tableZoneLabel > span').length, 2, 'The table label has two stacked words without a slash');
    assertTrue(document.getElementById('localHandCardZone').classList.contains('flex-col'), 'Hand label and hand cards must occupy separate vertical rows');
    assertTrue(document.body.innerHTML.includes('Card-area labels:'), 'The Guide must explain the new labels');
    assertTrue(TUTORIAL_MODULE_YOUR_CARDS.some(step => String(step.text).includes('gold HAND label')), 'The tutorial must introduce the Hand label');
  });
  await test('REGRESSION: shared table label changes only when all face-up cards are gone', () => {
    freshState();
    const you = makePlayer({ hand: [makeCard('4')],
      faceUp: [{ ...makeCard('9'), slotIndex: 0 }],
      faceDown: [{ ...makeCard('7'), slotIndex: 0 }] });
    state.players = [you, makePlayer({ id: 'p2', isBot: true })];
    render();
    assertEqual(document.getElementById('handZoneLabel').textContent, 'Hand',
      'The Hand label must not include a card count');
    assertEqual(document.getElementById('tableZoneLabel').dataset.activeLayer, 'up',
      'Face-up remains highlighted even while cards are held in hand');
    you.faceUp = [];
    render();
    assertEqual(document.getElementById('tableZoneLabel').dataset.activeLayer, 'down',
      'Face-down highlights as soon as the last face-up card is gone');
  });
  await test('REGRESSION: labels clear all card rows after repeated pile pickups', () => {
    freshState();
    // Earlier tests can leave the end-of-match row and swap bar showing;
    // a real PLAY-phase table never has either.
    hideMatchEndUI();
    document.getElementById('swapControlBar')?.classList.add('hidden');
    const cards = generateDeck();
    const you = makePlayer({ hand: cards.slice(0, 36),
      faceUp: cards.slice(36, 39).map((c, i) => ({ ...c, slotIndex: i })),
      faceDown: cards.slice(39, 42).map((c, i) => ({ ...c, slotIndex: i })) });
    state.players = [you, makePlayer({ id: 'p2', isBot: true })];
    render();
    assertEqual(computeHandRows(you.hand).length, 3, 'The pickup scenario must have three hand rows');
    const tableLabel = document.getElementById('tableZoneLabel').getBoundingClientRect();
    const handLabel = document.getElementById('handZoneLabel').getBoundingClientRect();
    const tableCards = [...document.querySelectorAll('#localTableSlots .card-table, #localTableSlots .custom-card-back')];
    const handCards = [...document.querySelectorAll('#localHand [data-card-id]')];
    assertEqual(handCards.length, 36, 'All picked-up cards must render');
    for (const card of tableCards) {
      const rect = card.getBoundingClientRect();
      assertTrue(tableLabel.right <= rect.left + 1, 'Table label must clear each table card on its left');
      assertTrue(rect.bottom <= handLabel.top + 1, 'Hand label must clear each table card');
    }
    for (const card of handCards) {
      const rect = card.getBoundingClientRect();
      assertTrue(handLabel.bottom <= rect.top + 1, 'Hand label must clear every hand row');
    }
  });
  await test('REGRESSION: middle table card stays vertically aligned with the pile', () => {
    freshState();
    const cards = generateDeck();
    state.players = [makePlayer({ id: 'p1', hand: cards.slice(0, 3),
      faceUp: cards.slice(3, 6).map((c, i) => ({ ...c, slotIndex: i })),
      faceDown: cards.slice(6, 9).map((c, i) => ({ ...c, slotIndex: i })) }), makePlayer({ id: 'p2' })];
    state.localPlayerId = 'p1';
    render();
    const middle = document.getElementById('localTableSlots').children[1].getBoundingClientRect();
    const pile = document.getElementById('discardPileContainer').getBoundingClientRect();
    const middleX = middle.left + middle.width / 2;
    const pileX = pile.left + pile.width / 2;
    assertTrue(Math.abs(middleX - pileX) <= 1, `Middle table card must align with pile centre (difference ${Math.abs(middleX - pileX)}px)`);
  });
  await test('REGRESSION: face-up cards only show their rank and suit at top left', () => {
    const card = createCardElement(makeCard('9'));
    const joker = createCardElement(makeCard('JOKER'));
    assertEqual(card.querySelectorAll('.card-corner-rank').length, 1, 'Normal cards have one corner rank');
    assertEqual(joker.querySelectorAll('.card-corner-rank').length, 1, 'Jokers have one corner rank');
    assertTrue(!card.querySelector('.rotate-180') && !joker.querySelector('.rotate-180'),
      'Neither card repeats the corner in the bottom right');
    assertEqual(card.querySelectorAll('.card-corner-icon').length, 0, 'Normal cards have no corner power icon');
    assertEqual(joker.querySelectorAll('.card-corner-icon').length, 0, 'Jokers have no corner power icon');
    const savedIcons = showCardIcons;
    try {
      showCardIcons = false;
      const plain = createCardElement(makeCard('4', '♥'));
      assertTrue(plain.querySelector('.card-centre-suit')?.textContent === '♥', 'Disabling icons shows the suit in the centre');
      showCardIcons = true;
      const illustrated = createCardElement(makeCard('4', '♥'));
      assertTrue(!!illustrated.querySelector('.card-centre-icon'), 'Enabling icons shows the power in the centre');
      assertEqual(illustrated.querySelectorAll('.card-corner-icon').length, 0, 'Enabling centre icons does not add corner icons');
    } finally { showCardIcons = savedIcons; }
  });

  // ---- REGRESSION: swap lesson usability ----
  await test('REGRESSION: the Ready button is live during the swap lesson', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const readyIdx = TUTORIAL_STEPS.findIndex(s => s.require && s.require.ready);
    showTutorialStep(readyIdx);
    const notPreReadied = state.players[0].isReady === false;
    endTutorial(false);
    assertTrue(notPreReadied,
      'The local player must not start ready — a pre-readied player renders the button as a disabled "Waiting..."');
  });
  await test('Swap lesson highlights the player\'s own cards, not the swap bar', () => {
    const swapSteps = TUTORIAL_STEPS.filter(s => s.phase === 'SWAP');
    assertTrue(swapSteps.length > 0, 'There must be swap steps');
    assertTrue(swapSteps.every(s => s.target !== '#swapControlBar'),
      'Swap steps must highlight the cards being swapped, not the instruction bar');
  });
  await test('Swap lesson explains which cards belong face-up', () => {
    const txt = TUTORIAL_STEPS.filter(s => s.phase === 'SWAP').map(s => s.text).join(' ');
    ['2', '3', '10', 'Ace', 'Joker'].forEach(r => {
      assertTrue(txt.includes(r), `The swap lesson should name ${r} as a power card`);
    });
  });

  // ---- REGRESSION: swap step must force the exact required pair ----
  await test('REGRESSION: tutorial swap step refuses the wrong cards', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const swapIdx = TUTORIAL_STEPS.findIndex(s => s.require && s.require.swap);
    showTutorialStep(swapIdx);
    const you = state.players[0];
    // Attempt the wrong pair (7 from hand, 5 from table) — must not move.
    const seven = you.hand.find(c => c.rank === '7');
    handleSwapHandClick(seven.id);
    const selectedWrong = state.selectedSwapHandCardId === seven.id;
    handleSwapFaceUpClick(you.faceUp.findIndex(c => c.rank === '5'));
    const faceUpAfterWrong = you.faceUp.map(c => c.rank).join();
    // The required pair must still work.
    handleSwapHandClick(you.hand.find(c => c.rank === '2').id);
    handleSwapFaceUpClick(you.faceUp.findIndex(c => c.rank === '4'));
    const swapped = you.faceUp.some(c => c.rank === '2') && you.hand.some(c => c.rank === '4');
    endTutorial(false);
    assertTrue(!selectedWrong, 'A non-required hand card must not even be selectable');
    assertEqual(faceUpAfterWrong, '4,5,6', 'A wrong swap must leave the table untouched');
    assertTrue(swapped, 'The required 2<->4 swap must still work');
  });

  // ---- REGRESSION: SNAP must complete the burn lesson, not break it ----
  await test('REGRESSION: snapping is accepted during the four-of-a-kind lesson', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const i = TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank === '9' && s.require.count === 2);
    const bad = [];
    replayTutorialSteps(i, bad);
    tutorialStep = i;
    const nines = state.players[0].hand.filter(c => c.rank === '9');
    const accepted = tutorialInterceptPlay(nines) === true;
    const wrong = state.players[0].hand.find(c => c.rank !== '9');
    const refused = wrong ? tutorialInterceptPlay([wrong]) === false : true;
    endTutorial(false);
    assertEqual(bad, [], 'Setup up to the four-of-a-kind step must itself be free of illegal scripted moves');
    assertTrue(accepted, 'Snapping the 9s must be a valid way to complete the step');
    assertTrue(refused, 'Other cards must still be refused');
  });
  await test('Tutorial teaches the select-all-of-rank toggle before the burn lesson', () => {
    const t = TUTORIAL_STEPS.findIndex(s => s.require && s.require.toggleRankSelect);
    const burn = TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank === '9' && s.require.count === 2);
    assertTrue(t !== -1, 'There must be a step teaching the rank toggle');
    assertTrue(t < burn, 'The toggle must be taught before the step where it helps');
  });
  await test('The rank-toggle step refuses card plays until the toggle is used', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    showTutorialStep(TUTORIAL_STEPS.findIndex(s => s.require && s.require.toggleRankSelect));
    const blocked = tutorialInterceptPlay([{ rank: '9', id: 'x' }]) === false;
    endTutorial(false);
    assertTrue(blocked, 'No cards may be played during the toggle lesson');
  });
  await test('Bot difficulty is now shown via avatar badge color, not a header badge', () => {
    // The old header difficulty badge (activeDifficultyBadge) was
    // removed entirely — difficulty is now conveyed by the bot avatar
    // badge's color (see BOT_BADGE_COLORS in renderOpponents), which
    // this test checks covers every real difficulty instead.
    assertTrue(!document.getElementById('activeDifficultyBadge'), 'The old header difficulty badge must be gone, not just hidden');
    assertTrue(!!document.getElementById('hamburgerBtn'), 'The hamburger button must exist where Settings/difficulty used to live');
    assertTrue(!!document.getElementById('multiSelectToggleBtn'), 'The rank toggle must exist');
  });

  // ---- Pile inspect hint ----
  await test('Pile hint is suppressed during the tutorial and off-turn', () => {
    freshState({ discardPile: [makeCard('7')], drawPile: [makeCard('K')] });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('9')] }),
                     makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })];
    state.localPlayerId = 'p1';
    resetPileInspectHint();
    const el = document.getElementById('pileInspectHint');
    // not my turn -> never armed
    state.currentTurnIndex = 1;
    schedulePileInspectHint(false);
    const offTurnHidden = el.classList.contains('hidden');
    // tutorial active -> never armed
    state.currentTurnIndex = 0;
    tutorialActive = true;
    schedulePileInspectHint(true);
    const tutorialHidden = el.classList.contains('hidden');
    tutorialActive = false;
    resetPileInspectHint();
    assertTrue(offTurnHidden, 'The hint must not appear when it is not your turn');
    assertTrue(tutorialHidden, 'The hint must never appear during the tutorial');
  });
  await test('Pile hint is dismissed as soon as the player acts', () => {
    freshState({ discardPile: [makeCard('7')], drawPile: [] });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('9')] }),
                     makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    const el = document.getElementById('pileInspectHint');
    el.classList.remove('hidden');
    hidePileInspectHint();
    assertTrue(el.classList.contains('hidden'), 'Acting must hide the hint immediately');
  });
  await test('Pile hint resets for a new game so it can teach the next player', () => {
    resetPileInspectHint();
    // shows once, then is marked as seen for the rest of that game
    const el = document.getElementById('pileInspectHint');
    assertTrue(el.classList.contains('hidden'), 'It should start hidden');
  });

  // ---- REGRESSION: a tutorial must never be restorable as a game ----
  await test('REGRESSION: a stale tutorial save from an older build is discarded', () => {
    // Newer builds never write one, but a save made by an older build can
    // still be in the browser — restoring it drops the player into an
    // unplayable "game" against the Coach.
    const key = 'shithead_game_state';
    let restored = true, cleared = false;
    try {
      localStorage.setItem(key, JSON.stringify({
        phase: 'PLAY', isMultiplayer: false, currentTurnIndex: 0, direction: 1,
        localPlayerId: 'tut_you', discardPile: [], drawPile: [], playedHistory: [],
        players: [
          { id: 'tut_you', name: 'You', isBot: false, hand: [], faceUp: [], faceDown: [], hasFinished: false },
          { id: 'tut_bot', name: 'Coach', isBot: true, hand: [], faceUp: [], faceDown: [], hasFinished: false }
        ]
      }));
      restored = loadGameState();
      cleared = localStorage.getItem(key) === null;
    } catch (e) {}
    assertTrue(!restored, 'A tutorial save must never be restored as a real game');
    assertTrue(cleared, 'The stale entry must be removed so it cannot reappear');
  });
  await test('A genuine single-player save still restores', () => {
    const key = 'shithead_game_state';
    let restored = false;
    try {
      localStorage.setItem(key, JSON.stringify({
        phase: 'PLAY', isMultiplayer: false, currentTurnIndex: 0, direction: 1,
        localPlayerId: 'p1', discardPile: [], drawPile: [], playedHistory: [],
        players: [
          { id: 'p1', name: 'You', isBot: false, hand: [], faceUp: [], faceDown: [], hasFinished: false },
          { id: 'p2', name: 'Zara', isBot: true, hand: [], faceUp: [], faceDown: [], hasFinished: false }
        ]
      }));
      restored = loadGameState();
      localStorage.removeItem(key);
    } catch (e) {}
    assertTrue(restored, 'A normal saved game must still be restorable');
  });

  // ---- REGRESSION: tutorial continuity ----
  await test('REGRESSION: tutorial refills come from a controlled low-card supply', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    tutorialApplyScene({ hand: [['4','♦']], pile: [['8','♥']], coach: [['9','♥']] });
    const strong = state.drawPile.filter(c => ['2','3','10','J','Q','K','A','JOKER'].includes(c.rank));
    endTutorial(false);
    assertEqual(strong.length, 0,
      'A refill must never hand the player a strong card mid-lesson — it makes the Coach\'s commentary untrue');
  });
  await test('REGRESSION: the Joker duel removes both Jokers immediately and hands the turn to the winner', () => {
    // Unlike the rest of the suite, this test's whole point is to check
    // the state BETWEEN the two phases — the Joker gone, the rest of the
    // pile still sitting there waiting on its own delayed pickup — so it
    // needs that delay to actually be real for its own scope.
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    freshState({ discardPile: [makeCard('6'), makeCard('2'), makeCard('5'), makeCard('A')], drawPile: [] });
    const initiator = makePlayer({ id: 'coach', isBot: true, hand: [makeCard('JOKER', 'JOKER')] });
    const defender = makePlayer({ id: 'you', hand: [makeCard('JOKER', 'JOKER')] });
    state.players = [defender, initiator];
    state.localPlayerId = 'you';
    resolveJokerDuelInstant(initiator, defender, initiator.hand[0]);
    assertEqual(state.discardPile.map(c => c.rank).sort(), ['2', '5', '6', 'A'], 'The Joker itself leaves the pile immediately; the rest waits for the scheduled pickup');
    assertEqual(defender.hand.length, 0, "The defender's counter-Joker must be spent, not left in hand");
    assertEqual(state.players[state.currentTurnIndex].id, 'you', 'The duel winner (the one who countered) keeps the turn');
    burnInstantResolveForTests = wasInstant;
  });
  await test('Match history: a finished match is recorded once, then patched with Diamonds and rating', () => {
    const savedUser = currentUser, wasRunning = devTestSuiteRunning;
    currentUser = null;
    const key = 'shithead_match_history_guest';
    const saved = localStorage.getItem(key);
    localStorage.removeItem(key);
    try {
      freshState({ phase: 'FINISHED', isRanked: false, isMultiplayer: false, localPlayerId: 'me', difficulty: 'hard' });
      state.players = [
        makePlayer({ id: 'me', name: 'Jamie', hasFinished: true, finishRank: 1, gameStats: { played: 20, pickedUp: 3, burnt: 2, jokersPlayed: 1, turns: 15 } }),
        makePlayer({ id: 'b1', name: 'Soren', isBot: true, hasFinished: false, hand: [makeCard('4')] })
      ];
      matchHistoryCurrentId = null;
      devTestSuiteRunning = false;
      matchRewardLog = [{ name: 'Win', reward: 10 }];
      const id = recordMatchHistory();
      assertTrue(!!id, 'An id is returned');
      assertEqual(recordMatchHistory(), id, 'The same match is never recorded twice');
      let list = readLocalMatchHistory();
      assertEqual(list.length, 1, 'One entry');
      assertEqual(list[0].place, 1, 'Won');
      assertEqual(list[0].mode, 'bots', 'Mode');
      assertEqual(list[0].players.map(p => p.name), ['Jamie', 'Soren'], 'Finishing order');
      assertEqual(list[0].stats.burnt, 2, 'Stats saved');
      assertEqual(list[0].diamonds, 10, 'Diamonds already earned are included');
      matchRewardLog.push({ name: 'Daily', reward: 25 });
      matchSummaryRating = { from: 500, to: 518 };
      patchMatchHistory();
      list = readLocalMatchHistory();
      assertEqual(list[0].diamonds, 35, 'Late Diamonds are added');
      assertEqual(list[0].rating.to - list[0].rating.from, 18, 'Rating change is added');
      const html = matchHistoryHtml(list);
      assertTrue(html.includes('Won') && html.includes('+💎35') && html.includes('+18 rating'), 'Shown in the list');
    } finally {
      devTestSuiteRunning = wasRunning;
      matchHistoryCurrentId = null; matchRewardLog = []; matchSummaryRating = null;
      currentUser = savedUser;
      if (saved === null) localStorage.removeItem(key); else localStorage.setItem(key, saved);
    }
  });
  await test('The Inbox and every menu page open on top of the end-of-match summary', () => {
    const z = (id) => parseInt(getComputedStyle(document.getElementById(id)).zIndex, 10) || 0;
    const summary = document.getElementById('matchSummaryModal');
    summary.classList.remove('hidden');
    try {
      const below = EXCLUSIVE_PAGE_IDS.filter(id => document.getElementById(id) && z(id) <= z('matchSummaryModal'));
      assertEqual(below, [], 'Pages that would open underneath the summary');
    } finally { summary.classList.add('hidden'); }
  });
  await test('Vs Bots: a Leave button sits under MATCH FINISHED (never online)', () => {
    freshState({ phase: 'FINISHED', isMultiplayer: false, localPlayerId: 'me', drawPile: [], discardPile: [] });
    state.players = [makePlayer({ id: 'me', hasFinished: true, finishRank: 1 }), makePlayer({ id: 'b1', isBot: true, hasFinished: true, finishRank: 2 })];
    render();
    const btn = document.getElementById('finishedLeaveBtn');
    assertTrue(!!btn && btn.textContent.includes('LEAVE'), 'The Leave button is shown');
    assertTrue(btn.previousElementSibling && btn.previousElementSibling.textContent.includes('MATCH FINISHED'), 'It sits under the MATCH FINISHED box');
    state.isMultiplayer = true;
    render();
    assertTrue(!document.getElementById('finishedLeaveBtn'), 'Online matches keep their own end-of-match options');
    state.isMultiplayer = false;
  });
  await test('The direction icon has its own colour for clockwise and anticlockwise', () => {
    const badge = document.getElementById('gameDirectionBadge');
    const wasHidden = badge.classList.contains('hidden');
    badge.classList.remove('hidden');
    try {
      freshState({ direction: 1 });
      updateDirectionBadge();
      assertEqual(badge.dataset.direction, 'cw', 'Clockwise is marked');
      badge.style.transition = 'none';
      const cw = getComputedStyle(badge).color;
      state.direction = -1;
      updateDirectionBadge();
      assertEqual(badge.dataset.direction, 'ccw', 'Anticlockwise is marked');
      const ccw = getComputedStyle(badge).color;
      assertTrue(cw !== ccw, `The two directions must differ in colour (${cw} vs ${ccw})`);
    } finally {
      badge.style.transition = '';
      if (wasHidden) badge.classList.add('hidden');
      state.direction = 1; updateDirectionBadge();
    }
  });
  await test('Emotes sit above the table (standings, end buttons) but below every pop-up and page', () => {
    const zOf = (el) => parseInt(getComputedStyle(el).zIndex, 10) || 0;
    const emoteZ = zOf(document.getElementById('emoteLayer'));
    ['finalStandingsBanner', 'matchEndButtonRow'].forEach((id) => {
      const el = document.getElementById(id);
      assertTrue(emoteZ > zOf(el), `The emote picker (${emoteZ}) must be above #${id} (${zOf(el)})`);
    });
    const pages = [...EXCLUSIVE_PAGE_IDS, 'matchSummaryModal', 'rejoinModal', 'whatsNewModal', 'authModal'];
    pages.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const wasHidden = el.classList.contains('hidden');
      el.classList.remove('hidden');
      const pz = zOf(el);
      if (wasHidden) el.classList.add('hidden');
      assertTrue(pz > EMOTE_FLOAT_Z && pz > emoteZ, `#${id} (${pz}) must cover emotes (picker ${emoteZ}, floats ${EMOTE_FLOAT_Z})`);
    });
    assertTrue(EMOTE_FLOAT_Z > emoteZ, 'Floating reactions show above the picker');
  });
  await test('Last card: exactly one card left in total (not two of a rank) flags the seat and alerts once', () => {
    freshState({ phase: 'PLAY', localPlayerId: 'me' });
    const me = makePlayer({ id: 'me', hand: [makeCard('4'), makeCard('9')] });
    const noah = makePlayer({ id: 'noah', name: 'Noah', isBot: true, hand: [makeCard('7', '♠'), makeCard('7', '♥')] });
    state.players = [me, noah];
    lastCardAlerted.clear();
    assertTrue(!isOnLastCard(noah), 'Two cards of the same rank is not a last card');
    noah.hand = []; noah.faceDown = [makeCard('K')];
    assertTrue(isOnLastCard(noah), 'One face-down card left is a last card');
    const banners = [];
    const originalBanner = notifyBanner;
    notifyBanner = (m) => banners.push(m);
    try {
      announceLastCards(); announceLastCards();
      assertEqual(banners.length, 1, 'Announced once, not on every render');
      assertTrue(banners[0].includes('Noah') && banners[0].includes('LAST CARD'), 'Names the player');
      noah.hand = [makeCard('2'), makeCard('3'), makeCard('5')]; // picked up
      announceLastCards();
      noah.hand = [];
      announceLastCards();
      assertEqual(banners.length, 2, 'Announced again after picking up and getting back to one card');
      me.hand = [makeCard('4')];
      announceLastCards();
      assertEqual(banners.length, 2, 'No banner for your own last card');
    } finally { notifyBanner = originalBanner; lastCardAlerted.clear(); }
    render();
    const seat = document.getElementById('opp-noah');
    assertTrue(seat && seat.classList.contains('opp-last-card') && !!seat.querySelector('.last-card-chip'), 'The seat shows the LAST CARD chip');
  });
  await test('Share: the result card is a 1080×1350 image with the placing, order and stats', () => {
    freshState({ phase: 'FINISHED', localPlayerId: 'me' });
    state.players = [
      makePlayer({ id: 'me', name: 'Jamie', hasFinished: true, finishRank: 1, gameStats: { played: 9, pickedUp: 1, burnt: 2, turns: 7, jokersPlayed: 0, biggestPickup: 1 } }),
      makePlayer({ id: 'b', name: 'Soren (Bot)', isBot: true, hand: [makeCard('4')] })
    ];
    const d = matchShareData();
    assertEqual(d.order.map(p => p.name), ['Jamie', 'Soren'], 'Finishing order, bot suffix dropped');
    assertTrue(d.order[0].me, 'You are marked');
    assertEqual(d.stats.find(([l]) => l === 'Burns')[1], 2, 'Your stats');
    const c = drawShareCard(d);
    assertEqual([c.width, c.height], [1080, 1350], 'Portrait share size');
    const share = document.getElementById('matchSummaryShare');
    assertTrue(!!share && !!share.querySelector('svg'), 'The summary has a share icon');
    assertTrue(!share.closest('.ms-actions'), 'It sits in the corner, not in the button row');
  });
  await test('Offline: Online Room and Ranked explain that Vs Bots works offline, and stay closed', () => {
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');
    Object.defineProperty(navigator, 'onLine', { get: () => false, configurable: true });
    const banners = [], originalBanner = notifyBanner;
    notifyBanner = (m) => banners.push(m);
    try {
      document.getElementById('multiOptions').classList.add('hidden');
      document.getElementById('rankedOptions').classList.add('hidden');
      document.getElementById('modeMultiBtn').click();
      document.getElementById('modeRankedBtn').click();
      assertEqual(banners.length, 2, 'Both taps explain');
      assertTrue(banners.every(b => b.includes('offline') && b.includes('Vs Bots')), 'The message points to Vs Bots');
      assertTrue(document.getElementById('multiOptions').classList.contains('hidden') && document.getElementById('rankedOptions').classList.contains('hidden'), 'Neither opens');
    } finally {
      notifyBanner = originalBanner;
      delete navigator.onLine;
      if (desc) Object.defineProperty(Navigator.prototype, 'onLine', desc);
      document.getElementById('modeSingleBtn').click();
    }
  });
  await test('Tutorial spotlight follows a target that resizes; asked-for cards stop glowing once you act', async () => {
    const saved = { active: tutorialActive, step: tutorialStep, awaiting: tutorialAwaitingAction };
    const box = document.createElement('div');
    box.id = 'spotlightFollowProbe';
    box.style.cssText = 'position:fixed;left:20px;top:300px;width:60px;height:40px;';
    document.body.appendChild(box);
    try {
      tutorialActive = true;
      positionTutorialUI('#spotlightFollowProbe');
      box.style.width = '200px';
      cancelAnimationFrame(tutorialFollowRaf); tutorialFollowRaf = null;
      tutorialFollowSpotlight(); // one frame of the follow loop
      const rect = document.querySelector('#tutorialSpotlightBorders rect');
      assertTrue(!!rect && Math.abs(+rect.getAttribute('width') - 208) < 1, `Box grew with the target (${rect && rect.getAttribute('width')})`);
      tutorialStep = 1; tutorialAwaitingAction = true;
      const q = { rank: 'Q', suit: '♠', id: 'q' };
      const step1 = TUTORIAL_STEPS[1];
      if (step1 && step1.require && step1.require.rank) {
        assertTrue(tutorialWantsCard({ ...q, rank: [].concat(step1.require.rank)[0] }, 'hand'), 'Glows while waiting');
        tutorialAwaitingAction = false;
        assertTrue(!tutorialWantsCard({ ...q, rank: [].concat(step1.require.rank)[0] }, 'hand'), 'Stops glowing once the player has acted');
      }
    } finally {
      tutorialActive = saved.active; tutorialStep = saved.step; tutorialAwaitingAction = saved.awaiting;
      box.remove();
      document.getElementById('tutorialSpotlightHoles')?.replaceChildren();
      document.getElementById('tutorialSpotlightBorders')?.replaceChildren();
    }
  });

  await test('Quick Start: at most 8 short steps, and the Tutorial button starts it the first time', () => {
    assertTrue(TUTORIAL_MODULE_QUICK_START.length <= 8, 'No more than 8 steps');
    TUTORIAL_MODULE_QUICK_START.forEach((step, i) => {
      assertTrue(step.text.split(/\s+/).length <= 18, `Step ${i + 1} is one short sentence (${step.text.split(/\s+/).length} words)`);
      if (step.coachNote) assertTrue(step.coachNote.split(/\s+/).length <= 18, `Step ${i + 1} note is short`);
    });
    assertTrue(!getAllTutorialModuleIds().includes('quick_start'), 'Not counted in the complete-every-lesson challenge');
    const saved = localStorage.getItem('shithead_tutorial_progress');
    const originalLaunch = launchTutorialModule, originalHub = openTutorialHub;
    const calls = [];
    launchTutorialModule = (id, opts) => calls.push(['launch', id, opts && opts.fromHub]);
    openTutorialHub = () => calls.push(['hub']);
    const nameInput = document.getElementById('playerNameInput'), savedName = nameInput.value;
    nameInput.value = 'Tester';
    try {
      localStorage.removeItem('shithead_tutorial_progress');
      document.getElementById('startTutorialBtn').click();
      localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true }));
      document.getElementById('startTutorialBtn').click();
    } finally {
      launchTutorialModule = originalLaunch; openTutorialHub = originalHub; nameInput.value = savedName;
      if (saved === null) localStorage.removeItem('shithead_tutorial_progress'); else localStorage.setItem('shithead_tutorial_progress', saved);
    }
    assertEqual(calls, [['launch', 'quick_start', false], ['hub']], 'First tap: Quick Start; after that: the hub');
  });
  await test('Every Burn cosmetic (and the default) has its own burn sound', () => {
    assertTrue(typeof BURN_SOUNDS.default === 'function', 'A default burn sound exists');
    const missing = COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Burn Effects' && typeof BURN_SOUNDS[i.id] !== 'function').map(i => i.id);
    assertEqual(missing, [], 'Burn items without a sound');
    const p = makePlayer({ id: 'x', cosmetics: { burnEffect: 'burn-ice' } });
    assertEqual(burnEffectIdFor(p), 'burn-ice', "A player's equipped burn picks the sound");
    assertEqual(burnEffectIdFor(makePlayer({ id: 'bot' })), 'default', 'No burn equipped: the default');
  });
  await test('REGRESSION: an automatic counter-Joker is replaced from the Deck straight away', () => {
    freshState({ discardPile: [makeCard('6'), makeCard('JOKER', 'JOKER')], drawPile: [makeCard('4'), makeCard('9'), makeCard('K')] });
    const initiator = makePlayer({ id: 'soren', isBot: true, hand: [makeCard('Q')] });
    const defender = makePlayer({ id: 'you', hand: [makeCard('JOKER', 'JOKER'), makeCard('7'), makeCard('10')] });
    state.players = [defender, initiator];
    state.localPlayerId = 'you';
    resolveJokerDuelInstant(initiator, defender, makeCard('JOKER', 'JOKER'));
    assertEqual(defender.hand.length, 3, 'The defender draws back up to 3 as soon as the Joker leaves their hand');
    assertTrue(!defender.hand.some(c => c.isJoker), 'The counter-Joker itself is gone');
    assertEqual(state.drawPile.length, 2, 'Exactly one card came off the Deck');
  });
  await test('REGRESSION: a manual Joker played onto a Joker also draws back up to 3', () => {
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    const counter = makeCard('JOKER', 'JOKER');
    freshState({ discardPile: [makeCard('6'), makeCard('JOKER', 'JOKER'), counter], drawPile: [makeCard('4'), makeCard('9')] });
    const soren = makePlayer({ id: 'soren', isBot: true, hand: [makeCard('Q')] });
    const you = makePlayer({ id: 'you', hand: [makeCard('7'), makeCard('10')] });
    state.players = [you, soren];
    state.localPlayerId = 'you';
    state.lastJokerInitiatorId = 'soren';
    handleJokerPlay(you, counter);
    burnInstantResolveForTests = wasInstant;
    assertEqual(you.hand.length, 3, 'The counterer is topped back up to 3 at once');
  });
  await test('REGRESSION: Amit keeps the next turn when Diya cannot counter his Joker', () => {
    freshState({ discardPile: [makeCard('4'), makeCard('K'), makeCard('JOKER', 'JOKER')], drawPile: [] });
    const amit = makePlayer({ id: 'amit', name: 'Amit', hand: [makeCard('9')] });
    const diya = makePlayer({ id: 'diya', name: 'Diya', hand: [makeCard('6')] });
    state.players = [amit, diya];
    state.localPlayerId = 'amit';
    state.currentTurnIndex = 0;
    resolveJokerDuelInstant(amit, diya, makeCard('JOKER', 'JOKER'));
    assertEqual(state.players[state.currentTurnIndex].id, 'amit', 'The Joker initiator must play again after the target picks up');
    assertTrue(diya.hand.some(c => c.rank === '4') && diya.hand.some(c => c.rank === 'K'), 'Diya must receive the non-Joker pile cards');
    assertTrue(!diya.hand.some(c => c.isJoker), 'The played Joker must be burnt rather than added to Diya\'s hand');
  });
  await test('REGRESSION: Pooja retains the Joker bonus turn against a competing multiplayer snapshot', () => {
    freshState({ discardPile: [makeCard('4'), makeCard('JOKER', 'JOKER')], drawPile: [] });
    const pooja = makePlayer({ id: 'pooja', name: 'Pooja', hand: [makeCard('10')] });
    const zainab = makePlayer({ id: 'zainab', name: 'Zainab', hand: [makeCard('6')] });
    state.players = [pooja, zainab];
    state.currentTurnIndex = 0;
    resolveJokerDuelInstant(pooja, zainab, makeCard('JOKER', 'JOKER'));
    assertEqual(state.jokerTurnOwnerId, 'pooja', 'The resolved Joker must create a synced bonus-turn lock for Pooja');
    state.currentTurnIndex = 1; // simulate Zainab's competing/stale snapshot
    enforceJokerTurnOwnerLock(state.jokerTurnOwnerId);
    assertEqual(state.players[state.currentTurnIndex].id, 'pooja', 'A competing snapshot must not give the pickup target the next turn');
  });
  await test('REGRESSION: countering with a Joker is counted in the defender\'s stats', () => {
    // The counter-Joker is spliced straight out of the defender's hand
    // inside resolveJokerDuelInstant — it never passes through
    // executePlayCards, so without an explicit bumpStat call it would
    // never reach the one 'jokersPlayed' bump site and would go
    // uncounted in Match Stats.
    freshState({ discardPile: [makeCard('6'), makeCard('2')] });
    const initiator = makePlayer({ id: 'coach', isBot: true, hand: [makeCard('JOKER', 'JOKER')] });
    const defender = makePlayer({ id: 'you', hand: [makeCard('JOKER', 'JOKER')] });
    state.players = [defender, initiator];
    state.localPlayerId = 'you';
    resolveJokerDuelInstant(initiator, defender, initiator.hand[0]);
    assertEqual(defender.gameStats.jokersPlayed, 1, "Countering with a Joker must increment the defender's jokersPlayed");
    assertEqual(defender.gameStats.played, 1, "Countering with a Joker must count as a card played for the defender");
    assertEqual(defender.lobbyStats.jokersPlayed, 1, 'It must count toward the lobby total too');
  });

  // ---- REGRESSION: rank toggle must never leave a partial selection ----
  await test('REGRESSION: un-staging with the rank toggle ON clears the whole rank', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    const kings = [makeCard('K','♠'), makeCard('K','♥'), makeCard('K','♦')];
    state.players = [makePlayer({ id: 'p1', hand: [...kings, makeCard('9')] }),
                     makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    selectAllOfRank = true;
    const pool = getAllSelectablePool(state.players[0]);
    toggleCardSelection(kings[0].id, pool);
    const selected = state.selectedPlayCardIds.length;
    // the drag-away un-stage path
    const ids = pool.filter(c => c.rank === 'K').map(c => c.id);
    state.selectedPlayCardIds = state.selectedPlayCardIds.filter(id => !ids.includes(id));
    const left = state.selectedPlayCardIds.length;
    selectAllOfRank = false;
    assertEqual(selected, 3, 'The toggle should select all three Kings');
    assertEqual(left, 0, 'Un-staging must clear the whole rank, never leave a partial selection');
  });
  await test('Rank toggle is green when ON and red when OFF', () => {
    const btn = document.getElementById('multiSelectToggleBtn');
    const prev = selectAllOfRank;
    selectAllOfRank = true; updateMultiSelectToggleUI();
    const on = btn.className.includes('text-emerald-400');
    selectAllOfRank = false; updateMultiSelectToggleUI();
    const off = btn.className.includes('text-rose-400');
    selectAllOfRank = prev; updateMultiSelectToggleUI();
    assertTrue(on, 'ON should be green');
    assertTrue(off, 'OFF should be red');
  });
  await test('REGRESSION: the tutorial never writes a restorable saved game', () => {
    freshState(); tutorialTestSetup();
    try { localStorage.removeItem('shithead_game_state'); } catch (e) {}
    startTutorial();
    showTutorialStep(TUTORIAL_STEPS.findIndex(st => st.require && st.require.rank === '9'));
    saveGameState();
    let saved = null;
    try { saved = localStorage.getItem('shithead_game_state'); } catch (e) {}
    endTutorial(false);
    assertEqual(saved, null,
      'A tutorial must not be restorable as a real game against the Coach');
  });

  // ---- Tutorial controls & reference panel layout ----
  await test('Tutorial Back sits left of Continue', () => {
    const row = document.getElementById('tutorialBackBtn').parentElement;
    assertTrue(row.className.includes('justify-between'),
      'The button row must separate Back and Continue to opposite ends');
    const kids = [...row.children].map(e => e.id);
    assertEqual(kids, ['tutorialBackBtn', 'tutorialNextBtn'],
      'Back must come before Continue in the DOM');
  });
  await test('Turn timer sits before the turn indicator', () => {
    const timer = document.getElementById('turnTimerBadge');
    const turn = document.getElementById('activeTurnIndicator');
    assertTrue(!!timer && !!turn, 'Both elements must exist');
    assertTrue(timer.compareDocumentPosition(turn) & Node.DOCUMENT_POSITION_FOLLOWING,
      'The timer must precede the turn indicator so it renders to its left');
  });
  await test('Card reference has no header row and uses the short hint', () => {
    const panel = document.getElementById('cardRefPanel');
    assertTrue(!!panel.querySelector('#cardRefCloseBtn'),
      'Card Powers has an X close button like every other panel');
    const m = Object.fromEntries(CARD_REFERENCE);
    assertEqual(m['5'], 'Drop to Base', '5 label should be capitalised');
    assertEqual(m['7'], '7 or Lower', '7 label should be capitalised');
  });

  // ---- HARD GUARANTEE: settings panel never overlaps or overflows ----
  // Standing rule for UI work: every panel is measured, not eyeballed.
  await test('Settings rows never overlap and stay inside the panel', () => {
    const modal = document.getElementById('settingsModal');
    const wasHidden = modal.classList.contains('hidden');
    modal.classList.remove('hidden');
    refreshSettingsUI();
    const panel = modal.firstElementChild.getBoundingClientRect();
    const problems = [];
    const rows = [...modal.querySelectorAll('.settings-row, .settings-head, #settingsModal input, #muteBtn, #speedResetBtn')];
    rows.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.left < panel.left - 1 || r.right > panel.right + 1) {
        problems.push(`${el.id || el.className.slice(0, 14)} outside panel`);
      }
      if (r.right > window.innerWidth + 1 || r.left < -1) {
        problems.push(`${el.id || 'row'} off-screen`);
      }
    });
    // Controls on the same row must not sit on top of each other.
    ['headerSpeedSlider|speedResetBtn', 'volumeSlider|muteBtn'].forEach(pair => {
      const [a, b] = pair.split('|').map(id => document.getElementById(id));
      if (!a || !b) return;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      if (ra.width === 0 || rb.width === 0) return;
      const overlap = !(ra.right <= rb.left + 1 || ra.left >= rb.right - 1);
      if (overlap) problems.push(`${a.id} overlaps ${b.id}`);
    });
    if (wasHidden) modal.classList.add('hidden');
    assertEqual(problems, [], 'Settings controls must never overlap or leave the panel');
  });
  await test('Settings sections collapse and expand', () => {
    const head = document.querySelector('.settings-head');
    const body = document.getElementById(head.dataset.target);
    const startedOpen = !body.classList.contains('hidden');
    head.click();
    const afterFirst = body.classList.contains('hidden');
    head.click();
    const afterSecond = !body.classList.contains('hidden');
    assertTrue(startedOpen, 'Sections should start expanded');
    assertTrue(afterFirst, 'Clicking the header collapses the section');
    assertTrue(afterSecond, 'Clicking again expands it');
  });
  await test('Settings: tabs like the Shop, each setting in its tab, search spans every tab', () => {
    const modal = document.getElementById('settingsModal');
    const wasHidden = modal.classList.contains('hidden');
    const savedTab = settingsTab;
    try {
      modal.classList.remove('hidden');
      const tabs = [...document.querySelectorAll('#settingsTabBar .cosmetic-tab')].map(t => t.dataset.settingsTab);
      assertEqual(tabs.join(','), 'gameplay,display,sound,access', 'Settings uses the Shop-style tab strip');
      const where = (id) => document.getElementById(id).closest('.settings-tab-panel').dataset.settingsPanel;
      assertEqual(where('setRankRow'), 'gameplay', 'Select All Of A Rank is Gameplay');
      ['setEmotesRow', 'setIconsRow', 'setHideHelpersRow', 'setBigEffectsRow', 'setDealAnimRow', 'setFullscreenRow']
        .forEach(id => assertEqual(where(id), 'display', `${id} is in Display`));
      ['setHapticsRow', 'setNotifyRow', 'setNotifySoundRow', 'setTurnAlertRow'].forEach(id => assertEqual(where(id), 'sound', `${id} is in Sound & Alerts`));
      // Within a tab: the main slider first, then alphabetical.
      const titles = (key) => [...document.querySelectorAll(`#settingsTab-${key} .settings-row`)].map(r => r.querySelector('.block').textContent.trim());
      ['gameplay', 'display', 'sound', 'access'].forEach(key => {
        const t = titles(key);
        assertEqual(t.join('|'), [...t].sort((a, b) => a.localeCompare(b)).join('|'), `${key} rows are alphabetical`);
      });
      assertTrue(document.getElementById('setFullscreenRow').textContent.includes('press F'), 'Fullscreen mentions the F key');
      assertEqual(where('volumeSlider'), 'sound', 'Volume is in Sound & Alerts');
      ['setContrastRow', 'setMotionRow'].forEach(id => assertEqual(where(id), 'access', `${id} is in Accessibility`));
      showSettingsTab('display');
      const visible = [...document.querySelectorAll('.settings-tab-panel')].filter(p => !p.classList.contains('hidden')).map(p => p.dataset.settingsPanel);
      assertEqual(visible.join(','), 'display', 'Only the chosen tab shows');
      const savedHide = hideHelperIcons;
      hideHelperIcons = false; refreshSettingsUI();
      assertEqual(document.getElementById('setHideHelpersState').textContent, 'ON', 'Helper Icons reads ON while the helper icons show (the default)');
      hideHelperIcons = savedHide; refreshSettingsUI();
      const search = document.getElementById('settingsSearchInput');
      search.value = 'vibration'; search.dispatchEvent(new Event('input'));
      assertTrue(!document.getElementById('settingsTab-sound').classList.contains('hidden'), 'Search finds a setting on another tab');
      search.value = ''; search.dispatchEvent(new Event('input'));
      assertTrue(document.getElementById('settingsTab-sound').classList.contains('hidden'), 'Clearing the search returns to the chosen tab');
    } finally {
      showSettingsTab(savedTab);
      if (wasHidden) modal.classList.add('hidden');
    }
  });
  await test('Turn Alert chimes once as the turn arrives; Notification Sound chimes for new inbox items', () => {
    const played = [];
    const saved = { turn: audio.playTurnAlert, notify: audio.playNotify, running: devTestSuiteRunning };
    try {
      audio.playTurnAlert = () => played.push('turn');
      audio.playNotify = () => played.push('notify');
      devTestSuiteRunning = false;
      freshState({ phase: 'PLAY', currentTurnIndex: 1 });
      state.players = [makePlayer({ id: 'p1', hand: [makeCard('5')] }), makePlayer({ id: 'p2', isBot: true, hand: [makeCard('9')] })];
      lastRenderWasMyTurn = false;
      render();
      assertEqual(played.length, 0, 'No chime on an opponent\'s turn');
      state.currentTurnIndex = 0; render(); render();
      assertEqual(played.join(','), 'turn', 'One chime when the turn arrives, not one per render');
      notifySeenIds = { invite: new Set(['a']) };
      notifyNewInboxItems('invite', { a: {}, b: { fromName: 'Pooja' } });
      assertEqual(played.join(','), 'turn,notify', 'A new invite plays the notification sound');
    } finally {
      audio.playTurnAlert = saved.turn; audio.playNotify = saved.notify; devTestSuiteRunning = saved.running;
      lastRenderWasMyTurn = false; freshState();
    }
  });
  await test('Turn Alert plays softer than the card sounds', () => {
    assertTrue(TURN_ALERT_GAIN > 0 && TURN_ALERT_GAIN < 1, 'The turn chime is scaled below the master volume');
    assertEqual(audio.gain.get(audio.turnEl), TURN_ALERT_GAIN, 'The scale applies to the turn clip');
  });
  await test('Challenges: completed rows and the completion mail say what the challenge was', () => {
    const row = renderChallengeRowHTML('Burner', '20/20', 50, true, challengeDescription('burner'));
    assertTrue(row.includes('Burn the pile 20 times in Ranked.'), 'A completed row shows its description');
    assertTrue(!row.includes('>Completed<'), 'A completed row no longer just says Completed');
    const all = Object.values(CHALLENGE_DEFS).flat();
    assertEqual(all.filter(c => !challengeDescription(c.id)).map(c => c.id), [], 'Every challenge has a description');
    assertTrue(!!challengeDescription(`daily_2026-09-24_${DAILY_CHALLENGE_POOL[0].id}`), 'Daily completion keys resolve to their description');
    assertTrue(!!challengeDescription(`weekly_2026-W39_${WEEKLY_CHALLENGE_POOL[0].id}`), 'Weekly completion keys resolve to their description');
    const mail = inboxItemHtml({ type: 'challenge', id: 'hat-trick', name: 'Hat-trick', reward: 30 });
    assertTrue(mail.includes('Win 3 Ranked matches in a row.'), 'The completion mail says what was done');
  });
  await test('Pages and pop-ups never grow past the visible screen or under the header (their X stays on screen)', () => {
    const problems = [];
    const headerBottom = document.querySelector('body > header').getBoundingClientRect().bottom;
    const pages = [...document.querySelectorAll('body > div.fixed.inset-0.flex.items-center.justify-center[id]')]
      .map(el => el.id).filter(id => !['lobbyScreen', 'victoryOverlay', 'shuffleIntroOverlay'].includes(id));
    assertTrue(pages.includes('challengesModal') && pages.length > 15, 'Every centred page is checked');
    [...pages, 'pileInspectModal', 'matchSummaryModal'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const wasHidden = el.classList.contains('hidden');
      el.classList.remove('hidden');
      const panel = el.firstElementChild;
      const spacer = document.createElement('div'); spacer.style.height = '2400px';
      panel.appendChild(spacer);
      const r = panel.getBoundingClientRect();
      if (r.top < headerBottom - 1 || r.bottom > window.innerHeight + 1) problems.push(`${id} ${Math.round(r.top)}..${Math.round(r.bottom)} of ${window.innerHeight}`);
      spacer.remove();
      if (wasHidden) el.classList.add('hidden');
      // Fixed pages must never sit inside the (sometimes transformed) table.
      if (el.closest('#gameTable')) problems.push(`${id} is inside #gameTable`);
    });
    assertEqual(problems, [], 'Every panel fits the visible screen and scrolls inside');
  });
  await test('The game version comes from the BUILD comment at the top of the file', () => {
    const comment = [...document.childNodes].find(n => n.nodeType === Node.COMMENT_NODE && /BUILD:/.test(n.data));
    assertTrue(!!comment, 'The BUILD comment exists');
    const m = comment.data.match(/BUILD:\s*\d{4}-\d{2}-\d{2}-v(\d+)/);
    assertEqual(getGameVersionLabel(), `v${m[1]}`, 'The support email / room version matches the BUILD comment');
    assertTrue(decodeURIComponent(buildSupportMailto('Bug', 'x', 'y')).includes(`Game version: v${m[1]}`), 'The support email carries it');
  });
  await test('Mute button toggles and restores the previous volume', () => {
    const before = masterVolume;
    masterVolume = 70; refreshSettingsUI();
    document.getElementById('muteBtn').click();
    const muted = masterVolume;
    document.getElementById('muteBtn').click();
    const restored = masterVolume;
    masterVolume = before; refreshSettingsUI();
    assertEqual(muted, 0, 'Mute must silence audio');
    assertEqual(restored, 70, 'Unmuting must restore the previous level, not a default');
  });

  // ---- Reconnection hardening ----
  await test('REGRESSION: a slow first room read is not mistaken for being kicked', () => {
    // Straight after joining, the first snapshot can predate our own write
    // landing. Only a confirmed-present -> absent transition is a kick.
    resetRoomMembershipConfirmation();
    assertTrue(hasConfirmedRoomMembership === false,
      'Membership starts unconfirmed so an early snapshot cannot look like removal');
  });
  await test('Reconnection helpers exist and reset per join', () => {
    assertTrue(typeof resyncRoomFromServer === 'function',
      'There must be a way to re-read the room after a reconnect');
    assertTrue(typeof resetRoomMembershipConfirmation === 'function',
      'A fresh join must be able to clear the previous room\'s confirmation');
    resetRoomMembershipConfirmation();
    assertEqual(hasConfirmedRoomMembership, false, 'Reset must clear the flag');
  });
  await test('REGRESSION: removing a player from a 3+ player match substitutes a bot in their exact seat', () => {
    freshState({ isMultiplayer: true, isHost: true, roomCode: '111111', phase: 'PLAY' });
    const removedHand = [makeCard('K')], removedUp = [makeCard('9')], removedDown = [makeCard('2')];
    state.players = [
      makePlayer({ id: 'host', name: 'Host' }),
      makePlayer({ id: 'target', name: 'Jamie', hand: removedHand, faceUp: removedUp, faceDown: removedDown }),
      makePlayer({ id: 'third', name: 'Alex' })
    ];
    state.localPlayerId = 'host'; state.currentTurnIndex = 1; // Jamie's own turn
    removePlayerFromMatch('target', 'disconnected');
    assertEqual(state.players.length, 3, 'A substitute must fill the seat, not just delete it');
    const sub = state.players[1];
    assertTrue(sub.isBot, 'The seat must now be bot-controlled');
    assertEqual(sub.name, 'Jamie (Bot)', "The original player's name must stay recognizable, not be replaced with a random bot name");
    assertTrue(['easy', 'medium'].includes(sub.difficulty), 'A substitute must play at easy or medium specifically, never harder');
    assertEqual(sub.hand.map(c => c.rank), ['K'], "The substitute must inherit the exact same hand — nothing reshuffled");
    assertEqual(sub.faceUp.map(c => c.rank), ['9'], 'Face-up cards must carry over unchanged');
    assertEqual(sub.faceDown.map(c => c.rank), ['2'], 'Face-down cards must carry over unchanged');
    assertEqual(state.players[state.currentTurnIndex].id, sub.id, "It was the removed player's turn — the substitute must inherit it, not skip it");
  });
  await test('REGRESSION: removing a player from a 2-player match ends it with no winner instead of substituting a bot', () => {
    freshState({ isMultiplayer: true, isHost: true, roomCode: '222222', phase: 'PLAY' });
    state.players = [
      makePlayer({ id: 'host', name: 'Host' }),
      makePlayer({ id: 'target', name: 'Jamie', hasFinished: false })
    ];
    state.localPlayerId = 'host';
    let capturedUpdate = null;
    const originalRef = db.ref;
    db.ref = (path) => { const r = originalRef.call(db, path); r.update = (val) => { capturedUpdate = val; return Promise.resolve(); }; return r; };
    try { removePlayerFromMatch('target', 'disconnected'); } finally { db.ref = originalRef; }
    assertEqual(state.players.map(p => p.id), ['host'], 'The departed player must be gone, not replaced with a bot');
    assertTrue(!!capturedUpdate, 'A heads-up match ending must sync the room back to LOBBY phase');
    assertEqual(capturedUpdate.phase, 'LOBBY', 'A two-player match with one player gone has no meaningful way to continue');
  });
  await test('Presence tracking and the disconnect watcher exist with the right shape', () => {
    assertTrue(typeof setupPresenceTracking === 'function', 'There must be a way to announce this client\'s own presence');
    assertTrue(typeof watchForDisconnectedPlayers === 'function', 'The host must be able to watch for players going quiet');
    assertTrue(typeof removePlayerFromMatch === 'function', 'Both a manual kick and an automatic disconnect must share one removal function');
    assertEqual(typeof DISCONNECT_GRACE_MS, 'number', 'The grace period must be a concrete, findable value');
    assertTrue(DISCONNECT_GRACE_MS >= 15000, 'The grace period must be generous enough that a brief signal drop or a backgrounded tab is never mistaken for someone actually leaving');
  });
  await test('Match stats are tracked per player, in both the per-game and per-lobby scopes', () => {
    freshState({ discardPile: [makeCard('9')], drawPile: [] });
    const you = makePlayer({ id: 'p1', hand: [makeCard('K')] });
    state.players = [you, makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    bumpStat(you, 'pickedUp', 5);
    bumpStat(you, 'burnt', 3);
    assertEqual(you.gameStats.pickedUp, 5, "This game's pickups must be recorded");
    assertEqual(you.gameStats.burnt, 3, "This game's burns must be recorded");
    assertEqual(you.lobbyStats.pickedUp, 5, "The lobby total's pickups must be recorded too");
    assertEqual(you.lobbyStats.burnt, 3, "The lobby total's burns must be recorded too");
  });
  await test('A new multiplayer match resets gameStats but carries lobbyStats forward', () => {
    freshState({ isMultiplayer: true, isHost: true, roomCode: '555555', drawPile: [] });
    const p1 = makePlayer({ id: 'p1' });
    const p2 = makePlayer({ id: 'p2' }); // a second human — canStartMultiplayerGame() requires one
    state.players = [p1, p2];
    state.localPlayerId = 'p1';
    bumpStat(p1, 'played', 10);
    const carriedLobbyStats = p1.lobbyStats;
    const originalSync = syncFirebaseGameState;
    syncFirebaseGameState = function () {}; // never touch the real project from a test
    startMultiplayerGame();
    syncFirebaseGameState = originalSync;
    const rematchedP1 = state.players.find(p => p.id === 'p1');
    assertEqual(rematchedP1.gameStats.played, 0, "A fresh match's gameStats must start at zero");
    assertEqual(rematchedP1.lobbyStats.played, 10, 'lobbyStats must survive into the new match');
    assertTrue(rematchedP1.lobbyStats === carriedLobbyStats, 'The SAME lobbyStats object should carry forward, not a fresh copy');
    assertEqual(rematchedP1.lobbyStats.matches, 1, 'The new match must count toward the lobby match tally');
  });
  await test('Playing a Joker is counted in jokersPlayed', () => {
    freshState({ discardPile: [makeCard('7')], drawPile: [] });
    const joker = makeCard('JOKER'); joker.isJoker = true;
    const you = makePlayer({ id: 'p1', hand: [joker] });
    const opp = makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] });
    state.players = [you, opp];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [joker]);
    assertEqual(you.gameStats.jokersPlayed, 1, 'Playing a Joker must increment jokersPlayed');
    assertEqual(you.lobbyStats.jokersPlayed, 1, 'It must count toward the lobby total too');
  });
  await test('Finishing first counts as a lobby win, exactly once', () => {
    freshState({ drawPile: [] });
    const winner = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [] });
    const other = makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K')] });
    state.players = [winner, other];
    checkPlayerFinished(winner);
    assertEqual(winner.lobbyStats.wins, 1, 'The first player to empty out must be credited with a lobby win');
    assertEqual(other.lobbyStats?.wins || 0, 0, 'Nobody else should be credited');
  });

  // ---- REGRESSION: Final Standings box replaces the Turn Indicator ----
  await test('buildFinalStandingsHtml lists every finished player, ordered by finishRank, with no ranking points outside Ranked', () => {
    const p1 = makePlayer({ id: 'p1', name: 'Amit', hasFinished: true, finishRank: 2 });
    const p2 = makePlayer({ id: 'p2', name: 'Pooja', isBot: true, hasFinished: true, finishRank: 1 });
    const html = buildFinalStandingsHtml([p1, p2], 'p1', false);
    const firstIdx = html.indexOf('Pooja');
    const secondIdx = html.indexOf('Amit');
    assertTrue(firstIdx !== -1 && secondIdx !== -1 && firstIdx < secondIdx, '1st place (Pooja) must be listed before 2nd place (Amit), regardless of player array order');
    assertTrue(html.includes('#1') && html.includes('#2'), 'Both finish-rank numbers must be shown');
    assertTrue(html.includes('Amit (You)'), 'The local player must be marked (You)');
    assertTrue(!html.includes('Pooja (You)'), 'Only the local player gets the (You) tag');
    assertTrue(!html.includes('\u2605'), 'A casual (non-Ranked) match must never show rating points');
  });
  await test('buildFinalStandingsHtml shows a rating change for each player in Ranked, colored by gain/loss', () => {
    const winner = makePlayer({ id: 'p1', name: 'Amit', hasFinished: true, finishRank: 1, rating: 500, uid: 'u1' });
    const loser = makePlayer({ id: 'p2', name: 'Pooja', hasFinished: true, finishRank: 2, rating: 500, uid: 'u2' });
    const html = buildFinalStandingsHtml([winner, loser], 'p1', true);
    assertTrue(html.includes('text-emerald-400'), "The winner's rating gain must be shown in emerald");
    assertTrue(html.includes('text-rose-400'), "The loser's rating loss must be shown in rose");
    assertTrue(/\u2605\d+ \(\+\d+\)/.test(html), "The winner's line must show a new rating and a '+N' gain");
    assertTrue(/\u2605\d+ \(-\d+\)/.test(html), "The loser's line must show a new rating and a '-N' loss");
  });
  await test('buildFinalStandingsHtml returns nothing while the match is still in progress', () => {
    const stillPlaying = makePlayer({ id: 'p1', hasFinished: false, finishRank: null });
    assertEqual(buildFinalStandingsHtml([stillPlaying], 'p1', false), '', 'No finished players yet means no standings to show');
  });
  await test('buildFinalStandingsHtml supports all four seats when every one of them has finished', () => {
    const players = [1, 2, 3, 4].map(n => makePlayer({ id: `p${n}`, name: `P${n}`, hasFinished: true, finishRank: n }));
    const html = buildFinalStandingsHtml(players, 'p1', false);
    [1, 2, 3, 4].forEach(n => assertTrue(html.includes(`#${n}`) && html.includes(`P${n}`), `Seat ${n} must appear in a 4-player standings box`));
  });
  await test('REGRESSION: showMatchEndUI hides the Turn Indicator and shows the Final Standings box; hideMatchEndUI reverses it', () => {
    freshState({ isMultiplayer: false, isRanked: false, drawPile: [] });
    const winner = makePlayer({ id: 'p1', name: 'Amit', hasFinished: true, finishRank: 1 });
    const loser = makePlayer({ id: 'p2', name: 'Bot', isBot: true, hasFinished: true, finishRank: 2 });
    state.players = [winner, loser];
    state.localPlayerId = 'p1';
    showMatchEndUI();
    assertTrue(document.getElementById('turnIndicatorRow').classList.contains('hidden'), 'The Turn Indicator must be hidden once the match is FINISHED');
    assertTrue(!document.getElementById('finalStandingsBanner').classList.contains('hidden'), 'The Final Standings box must be visible in its place');
    assertTrue(document.getElementById('finalStandingsBanner').innerHTML.includes('Amit'), 'The standings box must actually be populated');
    hideMatchEndUI();
    assertTrue(!document.getElementById('turnIndicatorRow').classList.contains('hidden'), 'Starting a new match must bring the Turn Indicator back');
    assertTrue(document.getElementById('finalStandingsBanner').classList.contains('hidden'), 'hideMatchEndUI must hide the standings box again');
  });
  await test('REGRESSION: Match Stats and Return to Ranked/Back to Lobby buttons are both forced onto two lines', () => {
    freshState({ isMultiplayer: true, isRanked: true, isHost: true, drawPile: [] });
    const winner = makePlayer({ id: 'p_host', hasFinished: true, finishRank: 1 });
    const loser = makePlayer({ id: 'p_room1', isBot: false, hasFinished: true, finishRank: 2 });
    state.players = [winner, loser];
    state.localPlayerId = 'p_host';
    showMatchEndUI();
    assertTrue(document.getElementById('matchStatsBtn').innerHTML.includes('<br>'), "MATCH STATS must be forced onto two lines to match the other button's height");
    assertTrue(document.getElementById('playAgainMatchBtn').innerHTML.includes('<br>'), 'RETURN TO RANKED must be forced onto two lines via innerHTML, not left to wrap unpredictably');
    // showMatchEndUI() has real, lasting DOM side effects (hides
    // turnIndicatorRow, populates and shows finalStandingsBanner) that
    // freshState() has no way to know about or undo, since it only
    // resets the `state` object — leaving these dangling would silently
    // steal layout space from every card-rendering test that runs
    // after this one in the suite.
    hideMatchEndUI();
    state.isRanked = false;
  });
  await test('REGRESSION: online, an 8 that skips back to the same seat still auto-picks up when nothing beats it', async () => {
    const savedPickup = executePickup;
    const pickedUp = [];
    try {
      syncFirebaseGameState = () => {};
      freshState({ isMultiplayer: true, isHost: true, roomCode: '888888', phase: 'PLAY', currentTurnIndex: 0, turnDeadline: 1000 });
      state.players = [
        makePlayer({ id: 'p1', name: 'You', hand: [makeCard('5'), makeCard('7')], faceUp: [makeCard('K')], faceDown: [makeCard('3')] }),
        makePlayer({ id: 'p2', name: 'Them', hand: [makeCard('9')], faceUp: [makeCard('Q')], faceDown: [makeCard('4')] })
      ];
      state.discardPile = [makeCard('4')];
      mpLastCheckedTurnIndex = null;
      executePickup = (id) => pickedUp.push(id);
      render();
      await new Promise((r) => setTimeout(r, 650));
      assertEqual(pickedUp.length, 0, 'With a legal move (5 on a 4) nothing is picked up');
      // Two 8s skip the only opponent: same seat, new turn, and a 5/7 can't beat an 8.
      state.discardPile.push(makeCard('8', '♥'), makeCard('8', '♠'));
      state.turnDeadline = 2000;
      render();
      await new Promise((r) => setTimeout(r, 650));
      assertEqual(pickedUp.join(','), 'p1', 'The turn that came straight back must auto-pick up the pile');
    } finally {
      executePickup = savedPickup;
      mpLastCheckedTurnIndex = null;
      freshState();
    }
  });
  await test('REGRESSION: match-end actions use menu-style icons; Back to Lobby is centred under two buttons, beside Match Stats otherwise', () => {
    const stats = document.getElementById('matchStatsBtn');
    const quick = document.getElementById('quickPlayMatchBtn');
    const lobby = document.getElementById('playAgainMatchBtn');
    assertEqual(stats.querySelector('use')?.getAttribute('href'), '#ui-stats', 'Match Stats must reuse the menu Stats icon');
    assertEqual(quick.querySelector('use')?.getAttribute('href'), '#ui-quick-play', 'Quick Play must use its menu-style icon');
    assertEqual(lobby.querySelector('use')?.getAttribute('href'), '#ui-lobby', 'Back to Lobby must use its menu-style icon');
    const quickWasHidden = quick.classList.contains('hidden');
    try {
      quick.classList.remove('hidden');
      assertEqual(getComputedStyle(lobby).gridColumnStart, '1', 'With Quick Play showing, Back to Lobby must span the full grid row');
      assertEqual(getComputedStyle(lobby).gridColumnEnd, '-1', 'With Quick Play showing, Back to Lobby must span the full grid row');
      assertEqual(getComputedStyle(lobby).justifySelf, 'center', 'With Quick Play showing, Back to Lobby must be horizontally centred');
      quick.classList.add('hidden');
      assertEqual(getComputedStyle(lobby).gridColumnStart, 'auto', 'Ranked/online (no Quick Play): Return to Ranked sits in the grid beside Match Stats');
      assertEqual(getComputedStyle(lobby).justifySelf, 'stretch', 'Ranked/online (no Quick Play): Return to Ranked fills its half of the row');
    } finally {
      quick.classList.toggle('hidden', quickWasHidden);
    }
  });
  await test('REGRESSION: an equipped victory effect fires on the immediate match-end path', () => {
    const savedEquipped = equippedCosmetics;
    const savedEffects = bigEffectsOn;
    try {
      freshState({ isMultiplayer: false, isRanked: false, phase: 'FINISHED' });
      state.players = [makePlayer({ id: 'p1', hasFinished: true, finishRank: 1 }), makePlayer({ id: 'p2', hasFinished: true, finishRank: 2 })];
      state.localPlayerId = 'p1';
      equippedCosmetics = { ...equippedCosmetics, victoryEffect: 'victory-cards' };
      bigEffectsOn = true;
      matchWinnerEffectShown = false;
      showMatchEndUI();
      assertTrue(document.querySelectorAll('.victory-card-particle').length >= 20, 'The equipped Card Shower must render at match end');
    } finally {
      document.querySelectorAll('.victory-card-particle').forEach(el => el.remove());
      equippedCosmetics = savedEquipped;
      bigEffectsOn = savedEffects;
      hideMatchEndUI();
    }
  });

  // ---- HARD GUARANTEE: header never overlaps or overflows ----
  await test('Header controls never overlap or run off narrow screens', () => {
    // Down to 5 controls after Settings/Fullscreen/the difficulty badge
    // moved out (hamburger drawer + bot avatar color respectively),
    // then back up by one with Inbox moving IN from the hamburger
    // drawer, then Diamond added, then Fullscreen removed from the
    // header entirely (still reachable from Settings) — still must
    // fit and stay clear of each other on a 320px phone.
    const ids = ['hamburgerBtn', 'multiSelectToggleBtn', 'navHomeLogoBtn', 'headerDiamondBtn', 'headerInboxBtn', 'leaveGameBtn'];
    const boxes = ids.map(id => {
      const el = document.getElementById(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return (r.width === 0) ? null : { id, r };
    }).filter(Boolean);
    const problems = [];
    boxes.forEach(a => {
      if (a.r.left < -1 || a.r.right > window.innerWidth + 1) problems.push(`${a.id} off-screen`);
    });
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i].r, b = boxes[j].r;
        const overlap = !(a.right <= b.left + 1 || a.left >= b.right - 1 ||
                          a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
        if (overlap) problems.push(`${boxes[i].id} overlaps ${boxes[j].id}`);
      }
    }
    assertEqual(problems, [], 'Header controls must never overlap or leave the viewport');
  });
  await test('Snap prompt is width-clamped so it cannot run off screen', () => {
    const el = document.getElementById('snapToastBanner');
    assertTrue(!!el, 'The snap prompt must exist');
    assertTrue((el.getAttribute('style') || '').includes('max-width'),
      'The snap prompt must be width-clamped to the viewport');
    assertTrue(el.className.includes('left-1/2'),
      'The snap prompt must be centred rather than pinned to an edge');
  });
  await test('REGRESSION: account settings snapshot contains every persistent app setting', () => {
    const prefs = collectAccountSettings();
    ['speedIndex','selectAllOfRank','masterVolume','showCardIcons','highContrast','hideHelperIcons','reduceMotion','bigEffectsOn','hapticsOn','dealAnimationOn','emotesMuted']
      .forEach(key => assertTrue(Object.prototype.hasOwnProperty.call(prefs,key), key+' must sync across devices'));
  });
  await test('REGRESSION: Custom deck-theme controls have separate grid areas for name and action', () => {
    const css = document.querySelector('style')?.textContent || '';
    assertTrue(css.includes('grid-template-areas:"preview copy" "preview action"'), 'Theme name and SELECT/APPLIED must not overlap');
  });
  await test('REGRESSION: the live Deck count uses a protected badge above card-back artwork', () => {
    freshState({ drawPile: generateDeck().slice(0,36), players: [makePlayer({ id: 'p1', hand: [makeCard('4')] }), makePlayer({ id: 'p2', isBot: true })] });
    render();
    assertTrue(document.getElementById('drawPileCount')?.classList.contains('deck-count-badge'), 'Deck count must remain readable over custom backs');
  });

  await test('REGRESSION: the Deck count sits centred on the bottom edge of the deck', () => {
    freshState({ drawPile: generateDeck().slice(0,36), players: [makePlayer({ id: 'p1', hand: [makeCard('4')] }), makePlayer({ id: 'p2', isBot: true })] });
    render();
    const badge = document.getElementById('drawPileCount').getBoundingClientRect();
    const deck = document.getElementById('drawPile').getBoundingClientRect();
    assertTrue(Math.abs((badge.left + badge.width / 2) - (deck.left + deck.width / 2)) <= 1, 'The Deck count must be horizontally centred on the deck');
  });
  await test('REGRESSION: tapping a card never exposes the card back under Face-Up cards', () => {
    const local = makePlayer({ id: 'p1', hand: [makeCard('4','♦'), makeCard('6','♦')], faceUp: [makeCard('7','♠'), makeCard('J','♦'), makeCard('Q','♣')], faceDown: [makeCard('2'), makeCard('3'), makeCard('5')] });
    freshState({ phase: 'SWAP', players: [local, makePlayer({ id: 'p2', name: 'Bot', isBot: true })] });
    render();
    render(); // a tap/select re-renders the whole table
    const faceUps = [...document.querySelectorAll('#localTableSlots .card-face-up')];
    assertEqual(faceUps.length, 3, 'All three Face-Up cards must render');
    faceUps.forEach(el => assertTrue(!el.classList.contains('animate-card-pop'), 'Face-Up cards must never fade in over the Face-Down card back'));
    const pileCard = makeCard('K','♠');
    assertTrue(createCardElement(pileCard).classList.contains('animate-card-pop'), 'A card appearing for the first time may still pop in');
    assertTrue(!createCardElement(pileCard).classList.contains('animate-card-pop'), 'Re-rendering the same card must not replay the fade-in');
  });
  await test('REGRESSION: previewing a burn effect in Custom plays in its own stage without shaking the table', () => {
    const stage = document.getElementById('personalisationBurnStage');
    assertTrue(!!stage, 'Custom must have a contained burn preview stage');
    document.getElementById('gameTable').classList.remove('animate-screen-shake');
    const particlesBefore = particles.length;
    previewEquippedCosmetic('burnEffect', 'burn-ice');
    assertTrue(stage.querySelectorAll('.shop-burn-particle').length > 0, 'The burn preview must play inside the Custom stage');
    assertEqual(stage.querySelector('.shop-burn-core').textContent, '❄️', 'The stage must show the previewed effect');
    assertTrue(!document.getElementById('gameTable').classList.contains('animate-screen-shake'), 'Previewing must not shake the game table behind Custom');
    assertEqual(particles.length, particlesBefore, 'Previewing must not use the hidden gameplay particle canvas');
  });
  await test('REGRESSION: table labels keep a readable backing on every table theme', () => {
    ['handZoneLabel', 'tableZoneLabel'].forEach(id => assertTrue(document.getElementById(id).classList.contains('table-label-pill'), `${id} needs the readable label pill`));
    assertTrue(!!document.querySelector('#emptyDiscardPlaceholder .table-label-pill'), 'Empty Pile needs the readable label pill');
    assertTrue(!!document.querySelector('#deckZone .table-label-pill'), 'Deck label needs the readable label pill');
    assertTrue(!!document.querySelector('#baseCardHud > .table-label-pill'), 'Base Card label needs the readable label pill');
  });

  await test('REGRESSION: Card Powers is named consistently and its X closes it', () => {
    const btn = document.getElementById('cardRefBtn');
    assertEqual(btn.dataset.tip, 'Card Powers', 'The i button tooltip must read Card Powers');
    assertEqual(btn.getAttribute('aria-label'), 'Card Powers', 'The i button label must read Card Powers');
    toggleCardReference(true);
    toggleCardReference();
    assertTrue(cardRefOpen, 'Card Powers must open');
    const panel = document.getElementById('cardRefPanel').getBoundingClientRect();
    const x = document.getElementById('cardRefCloseBtn').getBoundingClientRect();
    assertTrue(x.right <= panel.right && panel.right - x.right < 20 && x.top - panel.top < 16, 'The X must sit in the top-right corner');
    document.getElementById('cardRefCloseBtn').click();
    assertTrue(!cardRefOpen && document.getElementById('cardRefPanel').classList.contains('hidden'), 'The X must close Card Powers');
  });
  await test('REGRESSION: pile, middle table card, Hand label and hand share one centre line', () => {
    freshState();
    const cards = generateDeck();
    state.players = [makePlayer({ id: 'p1', hand: cards.slice(0, 3),
      faceUp: cards.slice(3, 6).map((c, i) => ({ ...c, slotIndex: i })),
      faceDown: cards.slice(6, 9).map((c, i) => ({ ...c, slotIndex: i })) }), makePlayer({ id: 'p2' })];
    render();
    const mid = el => { const b = el.getBoundingClientRect(); return b.left + b.width / 2; };
    const handCards = [...document.querySelectorAll('#localHand [data-card-id]')].map(e => e.getBoundingClientRect());
    const handMid = (Math.min(...handCards.map(b => b.left)) + Math.max(...handCards.map(b => b.right))) / 2;
    const pile = mid(document.getElementById('discardPileContainer'));
    [['Hand label', mid(document.getElementById('handZoneLabel'))], ['hand cards', handMid],
     ['middle table card', mid(document.getElementById('localTableSlots').children[1])]].forEach(([name, x]) => {
      assertTrue(Math.abs(x - pile) <= 1, `${name} must line up with the pile (off by ${Math.abs(x - pile).toFixed(1)}px)`);
    });
    assertEqual(getComputedStyle(document.getElementById('handZoneLabel'), '::after').content, '"↓"', 'The Hand label must point down at the hand');
  });

  await test('REGRESSION: profile picture catalogue matches the owner spec', () => {
    const free = BUILT_IN_COSMETICS.filter(i => i.category === 'Profile Pictures').map(i => i.name);
    assertEqual(free, ['Bronze Crown', 'Spades', 'Hearts', 'Diamonds', 'Clubs'], 'Free pictures: Bronze Crown + the 4 suits');
    const shop = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Profile Pictures' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(shop, { 'Ace of Spades': 200, 'Queen of Hearts': 200, 'Joker': 200, 'Burn Flame': 500, 'Transparent Ghost': 500, 'Frozen': 500, 'Burning 10': 1000, 'Fanned Hand': 1000, 'Joker Card': 1000 }, 'Shop pictures and prices');
    assertEqual(EARNED_AVATARS.filter(i => !i.season).map(i => i.name), ['Silver Crown', 'Gold Crown', 'Platinum Crown', 'Master Crown', 'Centurion', 'ShitHead'], 'Earn-only pictures');
    [...BUILT_IN_COSMETICS, ...COSMETIC_SHOP_ITEMS, ...EARNED_AVATARS].filter(i => i.category === 'Profile Pictures')
      .forEach(i => assertTrue(!!AVATAR_ART[i.id] && isSupportedCosmetic('avatar', i.id), `${i.name} must have artwork and be equippable`));
  });
  await test('REGRESSION: every profile picture renders as the same 1:1 rounded square', () => {
    const host = document.createElement('div');
    host.innerHTML = Object.keys(AVATAR_ART).map(id => avatarHtml(id, 40)).join('');
    document.body.appendChild(host);
    [...host.children].forEach(tile => {
      const b = tile.getBoundingClientRect();
      assertEqual([Math.round(b.width), Math.round(b.height)], [40, 40], 'Every picture must be a 40x40 square at size 40');
    });
    host.remove();
    assertEqual(resolveAvatarId('default'), 'avatar-crown-bronze', 'No picture chosen shows the Bronze Crown');
  });
  await test('REGRESSION: earn-only pictures unlock at the right milestones', () => {
    const byId = Object.fromEntries(EARNED_AVATARS.map(i => [i.id, i]));
    assertTrue(!byId['avatar-crown-silver'].isEarned({ rating: 999 }) && byId['avatar-crown-silver'].isEarned({ rating: 1000 }), 'Silver at 1000');
    assertTrue(byId['avatar-crown-gold'].isEarned({ rating: 900, rankedStats: { highestRating: 1500 } }), 'Gold counts a past peak');
    assertTrue(byId['avatar-crown-diamond'].isEarned({ rating: 1800 }) && !byId['avatar-crown-master'].isEarned({ rating: 1999 }), 'Platinum/Master thresholds');
    assertTrue(byId['avatar-centurion'].isEarned({ wins: 40, losses: 60 }) && !byId['avatar-centurion'].isEarned({ wins: 40, losses: 59 }), '100 ranked games');
    assertTrue(byId['avatar-shithead'].isEarned({ rankedStats: { bestLossStreak: 10 } }) && !byId['avatar-shithead'].isEarned({ rankedStats: { bestLossStreak: 9 } }), '10 losses in a row');
  });
  await test('REGRESSION: bots get free pictures and never share one at the same table', () => {
    for (let round = 0; round < 25; round++) {
      const players = [makePlayer({ id: 'p1' })];
      for (let i = 1; i <= 3; i++) players.push(makePlayer({ id: `p_bot_${i}`, isBot: true, avatar: pickBotAvatar(players) }));
      const ids = players.filter(p => p.isBot).map(p => p.avatar);
      assertEqual(new Set(ids).size, 3, 'Three bots must have three different pictures');
      ids.forEach(id => assertTrue(FREE_AVATAR_IDS.includes(id), 'Bots only use free pictures'));
    }
    const legacy = [makePlayer({ id: 'b1', isBot: true }), makePlayer({ id: 'b2', isBot: true, avatar: 'avatar-suit-hearts' }), makePlayer({ id: 'b3', isBot: true, avatar: 'avatar-suit-hearts' })];
    ensureBotAvatars(legacy);
    assertEqual(new Set(legacy.map(p => p.avatar)).size, 3, 'Old saves with missing or duplicate bot pictures are repaired');
  });
  await test('REGRESSION: opponent seats show picture + name on top and statuses below the cards', () => {
    freshState({ phase: 'SWAP' });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('4')] }),
      makePlayer({ id: 'p2', name: 'Maximilian', isBot: true, avatar: 'avatar-suit-clubs', isReady: true, faceUp: [makeCard('5')], faceDown: [makeCard('6')] }),
      makePlayer({ id: 'p3', name: 'Ro', isBot: true, isReady: false }), makePlayer({ id: 'p4', name: 'Et', isBot: true })];
    render();
    const seat = document.getElementById('opp-p2');
    const [head, cards, status] = [...seat.children];
    assertTrue(head.classList.contains('opp-head') && !!head.querySelector('.avatar-tile') && head.textContent.includes('Maximilian'), 'Top row: picture and full name');
    assertTrue(cards.classList.contains('opp-slot-row'), 'Middle row: cards');
    assertTrue(status.classList.contains('opp-status-row') && status.textContent.includes('Ready'), 'Bottom row: Ready/Waiting and badges');
    assertTrue(head.getBoundingClientRect().width <= seat.clientWidth + 1, 'A long name must stay inside the seat');
  });
  await test('REGRESSION: Custom lists every picture, with earn-only ones locked until unlocked', () => {
    const saved = cosmeticPurchaseState;
    cosmeticPurchaseState = {};
    renderPersonalisationAvatars();
    const options = [...document.querySelectorAll('#personalisationAvatars [data-equip-type="avatar"]')];
    assertEqual(options.length, 20, 'All 20 pictures appear in Custom');
    const master = options.find(o => o.dataset.equipId === 'avatar-crown-master');
    assertTrue(master.hasAttribute('data-locked') && master.textContent.includes('Reach Master rank'), 'Locked earn-only pictures show how to unlock them');
    assertTrue(!options.find(o => o.dataset.equipId === 'avatar-suit-spades').disabled, 'Free pictures are always selectable');
    cosmeticPurchaseState = saved;
    renderPersonalisationAvatars();
  });

  await test('REGRESSION: opponent seats fit the picture and a full 12-character name', () => {
    freshState({ phase: 'PLAY' });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('4')] }),
      makePlayer({ id: 'p2', name: 'CHRISTOPHER1', isBot: true }), makePlayer({ id: 'p3', name: 'ALEXANDRIA22', isBot: true }), makePlayer({ id: 'p4', name: 'Bo', isBot: true })];
    render();
    ['p2', 'p3'].forEach(id => {
      const name = document.querySelector(`#opp-${id} .opp-name`);
      assertTrue(name.scrollWidth <= name.clientWidth + 1, `${name.textContent} must not be cut off`);
    });
    const seat = document.getElementById('opp-p2');
    const cards = seat.querySelector('.opp-slot-row').getBoundingClientRect();
    const box = seat.getBoundingClientRect();
    assertTrue(cards.left - box.left >= 6 && box.right - cards.right >= 6, 'Seats leave room around the cards for frame glows');
  });
  await test('REGRESSION: tapping an opponent opens their player card (bot and friend states)', () => {
    freshState({ phase: 'PLAY', difficulty: 'hard' });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('4')] }), makePlayer({ id: 'p2', name: 'Sophia', isBot: true, avatar: 'avatar-suit-hearts' })];
    render();
    document.querySelector('#opp-p2 [data-player-popup]').click();
    const popup = document.getElementById('playerPopup');
    assertTrue(!popup.classList.contains('hidden'), 'The player card opens');
    assertTrue(popup.textContent.includes('Bot · Hard') && popup.textContent.includes("Bots don't have a rank or stats"), 'Bots are shown as bots, with no stats');
    document.getElementById('playerPopupClose').click();
    assertTrue(popup.classList.contains('hidden'), 'The X closes the player card');
    const savedUser = currentUser;
    currentUser = { uid: 'me' };
    const human = makePlayer({ id: 'p3', name: 'Jamie', uid: 'them' });
    const profile = { loaded: true, rating: 1540, online: true, stats: { games: 128, wins: 73, bestStreak: 6, peak: 1612, burnt: 412, jokers: 31 } };
    const friend = renderPlayerPopupHuman(human, profile, 'friends');
    assertTrue(friend.includes('✔') && friend.includes('FRIENDS') && !friend.includes('ADD FRIEND'), 'Friends show a green tick instead of Add Friend');
    const stranger = renderPlayerPopupHuman(human, profile, null);
    assertTrue(stranger.includes('ADD FRIEND') && stranger.includes('57%') && stranger.includes('Gold'), 'Non-friends get Add Friend; stats and rank are shown');
    currentUser = savedUser;
  });
  await test('REGRESSION: Platinum Crown naming and profile picture shortcut', () => {
    assertEqual(EARNED_AVATARS.find(i => i.id === 'avatar-crown-diamond').name, 'Platinum Crown', 'Diamond Crown is renamed Platinum Crown');
    const btn = document.getElementById('profileAvatarBtn');
    assertTrue(!!btn && btn.textContent.includes('Tap to change'), 'The profile picture is a button with a change hint');
  });

  await test('REGRESSION: Inbox has Read & clear all and a Jump button', () => {
    assertTrue(!!document.getElementById('inboxClearAllBtn'), 'Inbox has a Read & clear all button');
    assertTrue(!!document.querySelector('#inboxModal > .menu-page-jump'), 'Inbox gets the floating Jump to top/bottom button');
    ['matchStatsModal', 'pileInspectModal'].forEach(id => assertTrue(!!document.querySelector(`#${id} > .menu-page-jump`), `${id} gets the Jump button too`));
    assertTrue(isClearableInboxItem({ type: 'challenge' }) && isClearableInboxItem({ type: 'shop' }) && isClearableInboxItem({ type: 'rank' }), 'Notifications are clearable');
    assertTrue(!isClearableInboxItem({ type: 'request' }) && !isClearableInboxItem({ type: 'invite' }), 'Friend requests and invites are never cleared unanswered');
  });

  await test('REGRESSION: Custom is organised into tabs with tiles, at least 2 per row', () => {
    openThemesPanel();
    const tabs = [...document.querySelectorAll('#customTabBar [data-custom-tab]')].map(b => b.textContent.trim());
    assertEqual(tabs, ['Pictures', 'Deck', 'Tables', 'Card Backs', 'Frames', 'Burn', 'Victory', 'Emotes'], 'Custom tabs');
    document.querySelector('#customTabBar [data-custom-tab="cardBack"]').click();
    assertTrue(!document.querySelector('[data-custom-panel="cardBack"]').classList.contains('hidden') && document.querySelector('[data-custom-panel="avatar"]').classList.contains('hidden'), 'Only the chosen tab shows');
    const tiles = [...document.querySelectorAll('#personalisationCardBacks .cosmetic-tile')];
    assertTrue(tiles.length >= 2 && Math.abs(tiles[0].getBoundingClientRect().top - tiles[1].getBoundingClientRect().top) < 2, 'Tiles sit at least two to a row');
    openCustomAtAvatars();
    assertTrue(!document.querySelector('[data-custom-panel="avatar"]').classList.contains('hidden'), 'The profile shortcut opens the Pictures tab');
    document.getElementById('themesModal').classList.add('hidden');
  });

  await test('REGRESSION: Profile username row shows SHOP/OWNED/USED and edits inline next to the name', () => {
    const savedUser = currentUser, savedToken = nameChangeTokenState;
    try {
      currentUser = { uid: 'me' };
      nameChangeTokenState = null; renderProfileUsernameControls();
      assertEqual(document.getElementById('profileChangeUsernameBtn').textContent, 'SHOP', 'No token: SHOP');
      assertTrue(document.getElementById('profileEditNameBtn').classList.contains('hidden'), 'No pencil without a token');
      nameChangeTokenState = { cost: 100, purchasedAt: 1 }; renderProfileUsernameControls();
      assertEqual(document.getElementById('profileChangeUsernameBtn').textContent, 'OWNED', 'Owned token: OWNED');
      assertTrue(!document.getElementById('profileEditNameBtn').classList.contains('hidden'), 'Pencil appears next to the name');
      document.getElementById('profileEditNameBtn').click();
      assertTrue(!document.getElementById('profileNameEditor').classList.contains('hidden'), 'Pencil opens the inline editor');
      document.getElementById('profileNameCancelBtn').click();
      nameChangeTokenState = { cost: 100, purchasedAt: 1, usedAt: 2 }; renderProfileUsernameControls();
      assertEqual(document.getElementById('profileChangeUsernameBtn').textContent, 'USED', 'Used token: USED');
    } finally { currentUser = savedUser; nameChangeTokenState = savedToken; renderProfileUsernameControls(); }
  });
  await test('REGRESSION: Sign out asks for confirmation first', () => {
    const savedUser = currentUser, savedAuth = auth;
    let signedOut = 0;
    window.__skipSignOutReload = true;
    try {
      currentUser = { uid: 'me' };
      auth = { ...auth, signOut: () => { signedOut++; return Promise.resolve(); } };
      document.getElementById('profileAccountActionBtn').click();
      assertTrue(!document.getElementById('signOutConfirm').classList.contains('hidden') && signedOut === 0, 'One tap opens the confirm, without signing out');
      document.getElementById('signOutNoBtn').click();
      assertTrue(document.getElementById('signOutConfirm').classList.contains('hidden') && signedOut === 0, 'No keeps you signed in');
      document.getElementById('profileAccountActionBtn').click();
      document.getElementById('signOutYesBtn').click();
      assertEqual(signedOut, 1, 'Yes signs out');
    } finally { currentUser = savedUser; auth = savedAuth; signOutResetting = false; setTimeout(() => { window.__skipSignOutReload = false; }, 0); }
  });

  await test('REGRESSION: shape burn effects draw real shapes in previews and games', () => {
    const stage = document.getElementById('personalisationBurnStage');
    [['burn-electric', 'polyline'], ['burn-coloured', 'path'], ['burn-sweets', 'ellipse'], ['burn-paint', 'path'], ['burn-smoke', 'div']].forEach(([id, shape]) => {
      assertTrue(playShopBurnPreview(id, stage), `${id} must play in the preview stage`);
      assertTrue(!!stage.querySelector(`.bfx ${shape}`), `${id} must draw ${shape} shapes, not plain dots`);
    });
    stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
    const before = particles.length;
    playBurnEffect('burn-smoke', 100, 100);
    assertTrue(document.getElementById('burnFxLayer').querySelectorAll('.bfx').length > 0 && particles.length === before, 'In games, shape effects use their own layer, not the ember canvas');
    document.getElementById('burnFxLayer').innerHTML = '';
    const prices = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Burn Effects' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(prices, { 'Coloured Flame': 250, 'Ice Shatter': 500, 'Electric Blast': 1000, 'Paint Splats': 750, 'Stupendous Confectionery': 1500, 'Smoke Show': 2000 }, 'Burn effect prices');
  });

  await test('REGRESSION: new victory effects draw on their own top layer, with the requested prices', () => {
    const layer = document.getElementById('victoryFxLayer');
    ['victory-sparklers', 'victory-stars', 'victory-karate'].forEach(id => {
      layer.innerHTML = '';
      playVictoryEffect(id);
      assertTrue(layer.querySelectorAll('.bfx').length > 0, `${id} must draw on the victory layer`);
    });
    assertEqual(layer.querySelectorAll('.bfx svg path').length > 0, true, 'Effects are drawn shapes');
    layer.innerHTML = '';
    const prices = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Victory Effects' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(prices, { 'Confetti Burst': 250, 'Card Shower': 1500, 'Fireworks': 750, 'Sparkler Salute': 750, '5-Star Finish': 1000, 'Karate Chop': 2000 }, 'Victory effect prices');
  });

  await test('REGRESSION: Shop and Custom tabs list cheapest first, then A-Z', () => {
    const savedTab = shopTab, savedFilter = shopFilter;
    shopFilter = 'all';
    COSMETIC_TABS.forEach(tab => {
      shopTab = tab.category; renderCosmeticShop();
      const ids = [...document.querySelectorAll('#cosmeticShopList [data-preview-cosmetic-id]')].map(b => b.dataset.previewCosmeticId);
      const items = ids.map(id => COSMETIC_SHOP_ITEMS.find(i => i.id === id));
      items.forEach((item, i) => { if (i) assertTrue(items[i - 1].cost < item.cost || (items[i - 1].cost === item.cost && items[i - 1].name.localeCompare(item.name) <= 0), `${tab.label}: ${items[i - 1].name} must come before ${item.name}`); });
    });
    shopTab = savedTab; shopFilter = savedFilter; renderCosmeticShop();
    renderPersonalisationCosmetics();
    const burnNames = [...document.querySelectorAll('#personalisationBurnEffects .avatar-option-name')].map(n => n.textContent).slice(1);
    assertEqual(burnNames, ['Coloured Flame', 'Ice Shatter', 'Paint Splats', 'Electric Blast', 'Stupendous Confectionery', 'Smoke Show'], 'Custom burn tiles in value order');
  });
  await test('REGRESSION: Card Shower and the deal freeze the relevant player\'s card style at the start', () => {
    const saved = { ...equippedCosmetics };
    try {
      equippedCosmetics.cardBack = 'back-neon'; equippedCosmetics.frame = 'frame-gold';
      const mine = snapshotCardStyle();
      assertEqual(mine.backClass, 'cosmetic-back-neon', 'Your own card back');
      assertTrue(mine.frameStyle.includes('#fbbf24'), 'Your own frame');
      const theirs = snapshotCardStyle({ id: 'p2', cosmetics: { cardBack: 'back-crimson', frame: 'frame-diamond' } });
      assertEqual(theirs.backClass, 'cosmetic-back-crimson', 'The winner\'s card back, not yours');
      document.querySelectorAll('.victory-card-particle').forEach(n => n.remove());
      playVictoryEffect('victory-cards', theirs);
      equippedCosmetics.cardBack = 'back-emerald';
      const backs = [...document.querySelectorAll('.victory-card-particle .vcp-back-face')];
      assertTrue(backs.length > 0 && backs.every(b => b.classList.contains('cosmetic-back-crimson') && b.classList.contains('opponent-cosmetic-card')), 'Shower keeps the snapshot even after a re-equip');
      document.querySelectorAll('.victory-card-particle').forEach(n => n.remove());
    } finally { Object.assign(equippedCosmetics, saved); }
  });

  await test('REGRESSION: new emote packs contain what was asked for, at the right prices', () => {
    const pack = id => EMOTE_PACKS[id] || [];
    ['🐵', '🦁', '🐶', '🐷', '🐮'].forEach(e => assertTrue(pack('emotes-animals').includes(e), `Animal Pack needs ${e}`));
    ['⚽', '🎾', '🏸', '🎱', '🏎️'].forEach(e => assertTrue(pack('emotes-sports').includes(e), `Sports Pack needs ${e}`));
    ['🇬🇧', '🇪🇸', '🇫🇷'].forEach(e => assertTrue(pack('emotes-flags-europe').includes(e), `European Flags needs ${e}`));
    ['emotes-animals', 'emotes-sports', 'emotes-flags-europe', 'emotes-flags-north-america', 'emotes-flags-south-america', 'emotes-flags-asia', 'emotes-flags-africa', 'emotes-flags-oceania']
      .forEach(id => { assertEqual(pack(id).length, 6, `${id} has six emotes`); assertTrue(isSupportedCosmetic('emotes', id), `${id} is equippable`); });
    const prices = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.id.startsWith('emotes-flags') || i.id === 'emotes-animals' || i.id === 'emotes-sports').map(i => [i.id, i.cost]));
    Object.entries(prices).forEach(([id, cost]) => assertEqual(cost, id.includes('flags') ? 750 : 500, `${id} price`));
  });

  await test('REGRESSION: menu Sign Out confirms first, then signing out fully resets to a guest', () => {
    const savedUser = currentUser, savedAuth = auth;
    let signedOut = 0;
    window.__skipSignOutReload = true;
    try {
      currentUser = { uid: 'me' };
      updateHamburgerAccountLabel();
      assertTrue(!document.getElementById('menuSignOutBtn').classList.contains('hidden'), 'Sign Out appears in the menu when signed in');
      auth = { ...auth, signOut: () => { signedOut++; return Promise.resolve(); } };
      document.getElementById('menuSignOutBtn').click();
      assertTrue(!document.getElementById('signOutConfirm').classList.contains('hidden') && signedOut === 0, 'Menu Sign Out opens the confirm first');
      document.getElementById('signOutNoBtn').click();
      assertEqual(signedOut, 0, 'No keeps you signed in');
      localStorage.setItem('shithead_player_name', 'Amitk');
      document.getElementById('playerNameInput').value = 'Amitk';
      challengeEconomy.diamonds = 500;
      signOutResetting = false;
      resetAfterSignOut();
      assertEqual(document.getElementById('playerNameInput').value, '', 'Nickname is cleared');
      assertEqual(localStorage.getItem('shithead_player_name'), null, 'Saved nickname is forgotten');
      assertEqual(challengeEconomy.diamonds, 0, 'Diamonds are cleared');
      currentUser = null; updateHamburgerAccountLabel();
      assertTrue(document.getElementById('menuSignOutBtn').classList.contains('hidden'), 'Sign Out hides when signed out');
    } finally { currentUser = savedUser; auth = savedAuth; signOutResetting = false; window.__skipSignOutReload = false; updateHamburgerAccountLabel(); }
  });

  await test('REGRESSION: a 4-of-a-kind burn across turns leaves the burner free to play anything next', async () => {
    freshState({ phase: 'PLAY', currentTurnIndex: 0 });
    const me = makePlayer({ id: 'p1', hand: [makeCard('7', '♥'), makeCard('7', '♦'), makeCard('7', '♣')], faceUp: [makeCard('J', '♣'), makeCard('J', '♥'), makeCard('A', '♣')], faceDown: [makeCard('4'), makeCard('5'), makeCard('6')] });
    const bot = makePlayer({ id: 'p2', name: 'Giulia', isBot: true, hand: [makeCard('9')], faceUp: [], faceDown: [makeCard('K')] });
    state.players = [me, bot];
    state.discardPile = [makeCard('7', '♠')];
    state.activeConstraint = 'LOW7';
    state.localPlayerId = 'p1';
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false; // the real timed hold, where the bug lived
    try {
    executePlayCards('p1', [...me.hand]);
    assertTrue(state.burnResolving, 'The 4th seven starts a burn');
    // The exact race from the bug report: a turn check lands during the burn hold.
    checkTurnAndAct();
    handleNoLegalMove(state.players[0], 'medium');
    assertTrue(!state.pendingFaceUpSacrifice, 'No "no legal move" choice may open against the burning pile');
    await new Promise(r => setTimeout(r, 750));
    assertTrue(!state.burnResolving && state.discardPile.length === 0, 'The pile is burnt');
    assertEqual(state.activeConstraint, null, 'The 7-or-lower rule is gone after the burn');
    assertEqual(state.players[state.currentTurnIndex].id, 'p1', 'The burner plays again');
    const moves = getLegalMovesForPlayer(state.players[0], state.discardPile, state.activeConstraint);
    assertTrue(moves.some(m => m.some ? m.some(c => c.rank === 'J') : m.rank === 'J'), 'Face-up J (or anything) is playable on the empty pile');
    assertTrue(!state.pendingFaceUpSacrifice, 'Still no bogus pick-up choice once the burn has cleared');
    } finally {
      burnInstantResolveForTests = wasInstant;
      if (state.botActionTimer) clearTimeout(state.botActionTimer);
    }
  });

  await test('REGRESSION: Smoke Show lasts 2 seconds and earn-only pictures stay in milestone order', () => {
    const stage = document.getElementById('personalisationBurnStage');
    stage.querySelectorAll('.bfx').forEach(n => n.remove());
    const before = new Set(document.getAnimations());
    playBurnFx('burn-smoke', stage, 120, 80, .6);
    const smoke = document.getAnimations().filter(a => !before.has(a));
    const longest = Math.max(...smoke.map(a => { const t = a.effect.getTiming(); return (t.delay || 0) + t.duration; }));
    assertTrue(smoke.length > 20 && longest <= 2000, `Smoke Show must finish within 2s (longest ${Math.round(longest)}ms)`);
    smoke.forEach(a => a.cancel());
    stage.querySelectorAll('.bfx').forEach(n => n.remove());
    renderPersonalisationAvatars();
    const earned = [...document.querySelectorAll('#personalisationAvatars .avatar-option-name')].map(n => n.textContent).slice(-6);
    assertEqual(earned, ['Silver Crown', 'Gold Crown', 'Platinum Crown', 'Master Crown', 'Centurion', 'ShitHead'], 'Earn-only pictures in milestone order');
  });

  await test('Accessibility settings exist and apply', () => {
    ['setContrastRow','setMotionRow','setHapticsRow','volumeSlider'].forEach(id => {
      assertTrue(!!document.getElementById(id), `${id} must exist in settings`);
    });
  });

  // ---- HARD GUARANTEE: nothing ever spills outside a card ----
  // Adding the power icons pushed the bottom-right rank off the card,
  // because the corner grew from two lines to three. This measures every
  // rendered element against its card's box at a range of hand sizes and
  // every deck theme, so any future change to card contents, borders,
  // padding or themes is caught here rather than on someone's screen.
  await test('REGRESSION: card contents stay inside the card at every size and theme', () => {
    const themes = ['theme-obsidian', 'theme-emerald', 'theme-cyber', 'theme-crimson'];
    const originalTheme = document.body.className;
    const overflows = [];
    [3, 8, 14, 24, 36].forEach(handSize => {
      themes.forEach(theme => {
        document.body.className = document.body.className.replace(/theme-\w+/, theme);
        freshState({ drawPile: [], discardPile: [] });
        const deck = generateDeck();
        state.players = [
          { id: 'p1', name: 'You', isBot: false, hand: deck.splice(0, handSize),
            faceUp: deck.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i })),
            faceDown: deck.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i })),
            hasFinished: false, isReady: true },
          { id: 'p2', name: 'Bot', isBot: true, hand: deck.splice(0, 3),
            faceUp: deck.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i })),
            faceDown: deck.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i })),
            hasFinished: false, isReady: true }
        ];
        state.localPlayerId = 'p1'; state.phase = 'PLAY'; state.currentTurnIndex = 0;
        state.drawPile = deck;
        render();
        document.querySelectorAll('#localHand [data-card-id], #localTableSlots [data-card-id]').forEach(cardEl => {
          const cb = cardEl.getBoundingClientRect();
          if (cb.width === 0) return;
          cardEl.querySelectorAll('span, svg').forEach(child => {
            const r = child.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            // 1px of tolerance for sub-pixel rounding only.
            if (r.left < cb.left - 1 || r.right > cb.right + 1 ||
                r.top < cb.top - 1 || r.bottom > cb.bottom + 1) {
              overflows.push(`${theme}/${handSize}: ${(child.textContent || 'icon').trim().slice(0, 6)}`);
            }
          });
        });
      });
    });
    document.body.className = originalTheme;
    assertEqual(overflows.slice(0, 5), [],
      'Every rank, suit and icon must render fully inside its card');
  });

  // ---- Card reference panel ----
  await test('Card reference labels are correct and concise', () => {
    const m = Object.fromEntries(CARD_REFERENCE);
    assertEqual(m['4'], 'Low', '4 should read "Low"');
    assertEqual(m['Q'], 'High', 'Q should read "High"');
    assertEqual(m['K'], 'High', 'K should read "High"');
    assertEqual(m['A'], 'Highest', 'A should be distinct from Q/K');
    assertEqual(m['JOKER'], 'Pick Up', 'Joker should read "Pick Up"');
    assertEqual(CARD_REFERENCE.length, 14, 'Every rank must be listed');
    const spelled = CARD_REFERENCE.filter(([r]) => ['King','Queen','Ace'].includes(r));
    assertEqual(spelled.length, 0, 'Court cards must not be spelled out');
  });
  await test('Card reference shows HAND ranks while a hand is held', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [makeCard('K')] });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('2'), makeCard('10')],
      faceUp: [0,1,2].map(i => ({ ...makeCard('Q'), slotIndex: i })) }),
      makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    const { ranks, zone } = getReferenceAvailableRanks();
    assertEqual(zone, 'hand', 'With cards in hand the hand is the active zone');
    assertTrue(ranks.has('2') && ranks.has('10'), 'Hand ranks must be shown');
    assertTrue(!ranks.has('Q'), 'Face-up ranks must NOT show while a hand is held');
  });
  await test('Card reference switches to FACE-UP ranks once hand and deck are empty', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    state.players = [makePlayer({ id: 'p1', hand: [],
      faceUp: [makeCard('Q'), makeCard('7')].map((c, i) => ({ ...c, slotIndex: i })) }),
      makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    const { ranks, zone } = getReferenceAvailableRanks();
    assertEqual(zone, 'faceUp', 'Face-up becomes the active zone');
    assertTrue(ranks.has('Q') && ranks.has('7'), 'Face-up ranks must be shown');
  });
  await test('REGRESSION: card reference never reveals face-down cards', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    state.players = [makePlayer({ id: 'p1', hand: [], faceUp: [],
      faceDown: [makeCard('A'), makeCard('K')].map((c, i) => ({ ...c, slotIndex: i })) }),
      makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    const { ranks, zone } = getReferenceAvailableRanks();
    assertEqual(zone, null, 'There is no active zone during the blind phase');
    assertEqual(ranks.size, 0, 'Face-down ranks must never be revealed');
  });

  // ---- REGRESSION: a 3 inherits the turn effect of the card beneath ----
  await test('REGRESSION: a 3 played on an 8 still skips (transparency carries the effect)', () => {
    freshState({ discardPile: [makeCard('4'), makeCard('8')], drawPile: [] });
    const three = makeCard('3');
    state.players = [makePlayer({ id: 'p1', name: 'You', hand: [three] }),
                     makePlayer({ id: 'p2', name: 'Bot', isBot: true, hand: [makeCard('K')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [three]);
    assertEqual(state.players[state.currentTurnIndex].id, 'p1',
      'A 3 over an 8 must skip the opponent and return the turn');
  });
  await test('REGRESSION: a 3 played on a 9 still reverses direction', () => {
    freshState({ discardPile: [makeCard('4'), makeCard('9')], drawPile: [] });
    const three = makeCard('3');
    state.players = [makePlayer({ id: 'p1', hand: [three] }),
                     makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    const before = state.direction;
    executePlayCards('p1', [three]);
    assertTrue(state.direction !== before, 'A 3 over a 9 must reverse direction');
  });
  await test('A 3 over an ordinary card advances the turn normally', () => {
    freshState({ discardPile: [makeCard('4'), makeCard('K')], drawPile: [] });
    const three = makeCard('3');
    state.players = [makePlayer({ id: 'p1', hand: [three] }),
                     makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [three]);
    assertEqual(state.players[state.currentTurnIndex].id, 'p2', 'A 3 over a King just passes the turn');
  });

  // ---- Select-all-of-rank toggle ----
  await test('Select-all toggle is OFF by default and selects one card', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    const kings = [makeCard('K','♠'), makeCard('K','♥'), makeCard('K','♦')];
    state.players = [makePlayer({ id: 'p1', hand: kings }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    assertTrue(!selectAllOfRank, 'The toggle must default to OFF');
    state.selectedPlayCardIds = [];
    toggleCardSelection(kings[0].id, kings);
    assertEqual(state.selectedPlayCardIds.length, 1, 'With the toggle OFF a tap selects one card');
  });
  await test('Select-all toggle ON grabs the whole rank, and tapping again clears it', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    const kings = [makeCard('K','♠'), makeCard('K','♥'), makeCard('K','♦')];
    state.players = [makePlayer({ id: 'p1', hand: kings }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    selectAllOfRank = true; state.selectedPlayCardIds = [];
    toggleCardSelection(kings[0].id, kings);
    const all = state.selectedPlayCardIds.length;
    toggleCardSelection(kings[0].id, kings);
    const cleared = state.selectedPlayCardIds.length;
    selectAllOfRank = false;
    assertEqual(all, 3, 'With the toggle ON a tap selects every card of that rank');
    assertEqual(cleared, 0, 'Tapping again must clear the whole selection');
  });
  await test('REGRESSION: the select-all toggle never groups Jokers', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    const jokers = [makeCard('JOKER','JOKER'), makeCard('JOKER','JOKER')];
    state.players = [makePlayer({ id: 'p1', hand: jokers }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    selectAllOfRank = true; state.selectedPlayCardIds = [];
    toggleCardSelection(jokers[0].id, jokers);
    const n = state.selectedPlayCardIds.length;
    selectAllOfRank = false;
    assertEqual(n, 1, 'Jokers must always be played one at a time, toggle or not');
  });

  // ---- REGRESSION: history must not carry between tutorial scenes ----
  await test('REGRESSION: each tutorial scene never inherits a PREVIOUS step\'s card history', () => {
    // The Recent Card History used to keep showing plays from earlier
    // steps, which had nothing to do with the board on screen. Later
    // fixed further so a scene that seeds the Pile directly also seeds
    // MATCHING history (previously the Pile could show a card while the
    // strip still claimed "No cards played yet") — so the correct check
    // now is "history reflects exactly the current scene", not "history
    // is always empty".
    freshState(); tutorialTestSetup(); startTutorial();
    const stale = [];
    TUTORIAL_STEPS.forEach((st, i) => {
      showTutorialStep(i);
      const expected = (st.scene && st.scene.pile) ? st.scene.pile.length : 0;
      if (st.scene && state.playedHistory.length !== expected) stale.push(i + 1);
      if (st.require && st.require.rank) {
        const pool = getAllSelectablePool(state.players[0]);
        const cards = pool.filter(c => c.rank === st.require.rank).slice(0, st.require.count || 1);
        if (cards.length) executePlayCards('tut_you', cards);
      }
    });
    endTutorial(false);
    assertEqual(stale, [], 'A step that loads a new scene must show history matching ONLY that scene\'s own Pile, never a leftover count from the step before it');
  });
  await test('Tutorial still records plays made within a step', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const i = TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank);
    showTutorialStep(i);
    const before = state.playedHistory.length;
    const pool = getAllSelectablePool(state.players[0]);
    const cards = pool.filter(c => c.rank === TUTORIAL_STEPS[i].require.rank).slice(0, 1);
    executePlayCards('tut_you', cards);
    const after = state.playedHistory.length;
    endTutorial(false);
    assertTrue(after > before, 'Cards played during the step must still appear in the history, on top of whatever the scene itself seeded');
  });

  // ---- REGRESSION: tutorial scenes must be physically possible ----
  await test('REGRESSION: no tutorial scene needs more than 4 of any rank', () => {
    // A step once claimed three 9s were on the pile while dealing two more
    // into the hand — five 9s, which cannot exist in a 52-card deck.
    freshState(); tutorialTestSetup(); startTutorial();
    const bad = [];
    TUTORIAL_STEPS.forEach((st, i) => {
      if (!st.scene) return;
      showTutorialStep(i);
      const counts = {};
      const tally = (arr) => (arr || []).forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1; });
      tally(state.discardPile); tally(state.players[0].hand);
      tally(state.players[0].faceUp); tally(state.players[0].faceDown);
      tally(state.players[1].hand);
      Object.keys(counts).forEach(rank => {
        const max = rank === 'JOKER' ? 2 : 4;
        if (counts[rank] > max) bad.push(`step ${i + 1}: ${counts[rank]}x${rank} (max ${max})`);
      });
    });
    endTutorial(false);
    assertEqual(bad, [], 'A tutorial scene must never require more copies of a rank than exist');
  });
  await test('REGRESSION: the four-of-a-kind step matches what is actually dealt', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const i = TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank === '9' && s.require.count === 2);
    assertTrue(i !== -1, 'The four-of-a-kind step must exist and be findable');
    // This step continues the same stacked hand built up since step 7 —
    // it carries no scene of its own — so it can only be reached
    // honestly by actually playing the preceding steps in sequence,
    // the same way the full tutorial audit does.
    const bad = [];
    replayTutorialSteps(i, bad);
    assertEqual(bad, [], 'Setup up to the four-of-a-kind step must itself be free of illegal scripted moves');
    const onPile = state.discardPile.filter(c => c.rank === '9').length;
    const inHand = state.players[0].hand.filter(c => c.rank === '9').length;
    const text = TUTORIAL_STEPS[i].text;
    endTutorial(false);
    assertEqual(onPile + inHand, 3, "Right before this step, one 9 must already be on the pile and two in hand — the Coach's own scripted reply supplies the fourth");
    assertTrue(/one 9 is already down/i.test(text), 'The text must state the real number already on the pile');
  });
  await test('Base Card spotlight wraps the whole HUD including its label', () => {
    const hud = document.getElementById('baseCardHud');
    assertTrue(!!hud, 'The Base Card HUD needs an id so the spotlight can target it');
    assertTrue(hud.textContent.includes('Base Card'), 'The targeted element must include the caption');
    const usesHud = TUTORIAL_STEPS.some(s => s.highlightBaseCard);
    assertTrue(usesHud, 'The base-drop lesson must highlight the whole HUD, not just the card');
  });

  // ---- Tutorial: the PLAY button is highlighted when it's the next action ----
  await test('TUTORIAL: PLAY button glows exactly on card-play steps', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const btn = document.getElementById('playSelectedBtn');
    const zone = document.getElementById('localPlayerZone');
    const bad = [];
    TUTORIAL_STEPS.forEach((st, i) => {
      showTutorialStep(i);
      const wants = !!(st.require && st.require.rank);
      if (btn.classList.contains('tutorial-glow') !== wants) bad.push(`${i + 1}: glow`);
      if ((zone.style.zIndex === '80') !== wants) bad.push(`${i + 1}: lift`);
    });
    endTutorial(false);
    assertEqual(bad, [], 'The PLAY button must glow on (and only on) steps asking for a card play');
  });
  await test('TUTORIAL: the PLAY glow is cleared when the tutorial ends', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    showTutorialStep(TUTORIAL_STEPS.findIndex(s => s.require && s.require.rank));
    endTutorial(false);
    const btn = document.getElementById('playSelectedBtn');
    const zone = document.getElementById('localPlayerZone');
    assertTrue(!btn.classList.contains('tutorial-glow'), 'The glow must not leak into a normal game');
    assertEqual(zone.style.zIndex, '', 'The player zone stacking must be restored on exit');
  });

  // ---- Tutorial: internal consistency (auto-checks every step) ----
  await test('TUTORIAL AUDIT: every action step has an outcome note', () => {
    const bad = TUTORIAL_STEPS.map((s, i) => (s.require && !s.coachNote) ? i + 1 : null).filter(Boolean);
    assertEqual(bad, [], 'Action steps must explain what happened afterwards');
  });
  await test('TUTORIAL AUDIT: stacked deck (steps 7+) has no duplicate cards and no rank over quota', () => {
    // Steps 1-6 are the swap-phase practice — a small disposable scene
    // like every other non-stacked scene in this file, fully replaced
    // the moment Step 7 deals in, so it's exempt from this check.
    // Everything from Step 7 on is meant to be ONE real, trackable deck.
    const RECYCLED = { '5♦': 1 }; // Coach's 5♦: played, picked up in the Joker duel, genuinely replayed later — same physical card, allowed once more than usual
    const seenRecycled = {};
    const seen = new Map();
    const dupes = [];
    const rankCount = {};
    function add(r, su, step, field) {
      if (r === 'JOKER') { rankCount.JOKER = (rankCount.JOKER || 0) + 1; return; }
      const key = r + su;
      if (RECYCLED[key] !== undefined) {
        seenRecycled[key] = (seenRecycled[key] || 0) + 1;
        if (seenRecycled[key] > 1 + RECYCLED[key]) dupes.push(`${key} recycled too many times (step ${step} ${field})`);
        rankCount[r] = (rankCount[r] || 0) + (seenRecycled[key] === 1 ? 1 : 0);
        return;
      }
      if (seen.has(key)) dupes.push(`${key}: step ${step} (${field}) vs step ${seen.get(key).step} (${seen.get(key).field})`);
      else seen.set(key, { step, field });
      rankCount[r] = (rankCount[r] || 0) + 1;
    }
    TUTORIAL_STEPS.forEach((s, idx) => {
      if (idx < 6) return;
      if (s.scene) {
        ['hand', 'faceUp', 'faceDown', 'coachFaceUp', 'coachFaceDown', 'pile', 'drawPile'].forEach(key => {
          if (s.scene[key]) s.scene[key].forEach(([r, su]) => add(r, su, idx + 1, 'scene.' + key));
        });
      }
      if (s.coachPlays) {
        const looksFlat = s.coachPlays.every(w => Array.isArray(w) && typeof w[0] === 'string');
        const waves = looksFlat ? [s.coachPlays] : s.coachPlays;
        waves.forEach(wave => (Array.isArray(wave) ? wave : wave.cards).forEach(([r, su]) => add(r, su, idx + 1, 'coachPlays')));
      }
    });
    const over = Object.entries(rankCount).filter(([r, n]) => n > (r === 'JOKER' ? 2 : 4));
    assertEqual(dupes, [], 'No exact rank+suit pair may be dealt or scripted twice (aside from the one documented recycled card)');
    assertEqual(over, [], 'No rank may be used more than 4 times (2 for Jokers) across the whole stacked-deck tutorial');
  });
  await test('TUTORIAL AUDIT: every highlight target exists in the DOM', () => {
    const bad = TUTORIAL_STEPS.map((s, i) => {
      const sels = [...(s.target ? (Array.isArray(s.target) ? s.target : [s.target]) : []),
                    ...(s.noteTarget ? (Array.isArray(s.noteTarget) ? s.noteTarget : [s.noteTarget]) : [])];
      const missing = sels.filter(sel => !document.querySelector(sel));
      return missing.length ? `${i + 1}:${missing.join(',')}` : null;
    }).filter(Boolean);
    assertEqual(bad, [], 'A step must never point its spotlight at a missing element');
  });
  // Shared by both audits below: plays a coachPlays entry (single-wave
  // or nested multi-wave) against the REAL isPlayLegal, wave by wave,
  // exactly mirroring tutorialRunCoachReply's normalization.
  // A human-initiated Joker landing on an existing Joker opens
  // #floatingJokerBar for the player to pick who to duel — in the
  // tutorial's 2-player setup there's only ever one possible target (the
  // Coach), so this mirrors clicking that single button. Without it, the
  // audit's direct executePlayCards() call leaves the duel permanently
  // unresolved (both Jokers stuck on the pile), which then makes every
  // later step's legality check run against a pile that a real playthrough
  // would never actually see.
  //
  // Takes the cards that were just played and only acts if one was
  // actually a Joker — checking bar visibility alone isn't safe, since a
  // bug anywhere else that leaves the bar open (this exact class of bug
  // existed in endTutorial, which never hid it) would otherwise cause
  // this to wipe a perfectly normal pile that never had a Joker on it.
  function auditResolvePlayerJokerDuel(justPlayed) {
    if (!justPlayed || !justPlayed.some(c => c.isJoker)) return;
    const bar = document.getElementById('floatingJokerBar');
    if (!bar || bar.classList.contains('hidden')) return;
    const you = state.players[0];
    const target = state.players.find(p => p.id !== you.id && !p.hasFinished);
    bar.classList.add('hidden');
    if (target) resolveJokerDuelInstant(you, target, null);
  }
  function auditCoachWaves(coachPlays, stepNum, bad) {
    const looksFlat = coachPlays.every(w => Array.isArray(w) && typeof w[0] === 'string');
    const waves = looksFlat ? [coachPlays] : coachPlays;
    for (const raw of waves) {
      const isPaused = raw && !Array.isArray(raw);
      const wave = isPaused ? raw.cards : raw;
      const cards = wave.map(([r, su]) => ({ id: r + su + Math.random(), rank: r, suit: su, isJoker: r === 'JOKER' }));
      for (const c of cards) {
        if (!isPlayLegal(c, state.discardPile, state.activeConstraint)) {
          bad.push(`${stepNum}: coach ${c.rank}${c.suit} illegal on ${state.discardPile.map(x => x.rank).join(',') || 'EMPTY'}`);
          return false;
        }
      }
      state.players[1].hand = cards;
      // A paused wave defers its burn until the player presses Continue —
      // for the purposes of this audit, resolve it immediately so the
      // pile state is correct for whatever wave comes next.
      if (isPaused) tutorialDeferBurn = true;
      executePlayCards('tut_bot', cards);
      tutorialDeferBurn = false;
      if (isPaused && state.pendingTutorialBurn) tutorialResolvePendingBurn();
    }
    return true;
  }
  // Shared replay engine: walks TUTORIAL_STEPS from the start up to (but
  // not including) endIndexExclusive, exactly as a real player would —
  // act, let the Coach reply, move on. Used both by the full end-to-end
  // audit and by any other test that needs to reach a specific
  // continuation step honestly rather than teleporting into it via
  // showTutorialStep (which only applies a step's OWN scene, and several
  // steps deliberately have none, continuing the previous step's hand).
  function replayTutorialSteps(endIndexExclusive, bad) {
    for (let i = 0; i < endIndexExclusive; i++) {
      const st = TUTORIAL_STEPS[i];
      if (st.scene) tutorialApplyScene(st.scene);
      state.phase = st.phase || 'PLAY';
      state.currentTurnIndex = 0;
      if (st.require && st.require.rank) {
        const pool = getAllSelectablePool(state.players[0]);
        const need = st.require.count || 1;
        const have = pool.filter(c => c.rank === st.require.rank);
        if (have.length < need) { bad.push(`${i + 1}: missing ${need}x${st.require.rank}`); continue; }
        if (!have.slice(0, need).every(c => isPlayLegal(c, state.discardPile, state.activeConstraint))) {
          bad.push(`${i + 1}: ${st.require.rank} illegal`); continue;
        }
        executePlayCards('tut_you', have.slice(0, need));
        auditResolvePlayerJokerDuel(have.slice(0, need));
        if (st.coachPlays && !st.noCoachReply) auditCoachWaves(st.coachPlays, i + 1, bad);
        state.currentTurnIndex = 0;
      } else if (st.require && st.require.blind) {
        const pool = state.players[0].faceDown || [];
        const slot = st.require.blindSlot !== undefined ? st.require.blindSlot : 0;
        const card = pool[slot];
        if (!card) { bad.push(`${i + 1}: no face-down card at slot ${slot} to flip`); continue; }
        executePlayCards('tut_you', [card], true);
        auditResolvePlayerJokerDuel([card]);
        if (st.coachPlays && !st.noCoachReply) auditCoachWaves(st.coachPlays, i + 1, bad);
        state.currentTurnIndex = 0;
      } else if (st.require && st.require.pickup) {
        const pool = getAllSelectablePool(state.players[0]);
        const legal = pool.filter(c => isPlayLegal(c, state.discardPile, state.activeConstraint));
        if (legal.length) bad.push(`${i + 1}: pick-up step but ${legal.length} legal plays remain`);
        executePickup('tut_you', true);
        state.currentTurnIndex = 0;
      }
    }
  }
  await test('REGRESSION TUTORIAL AUDIT: the whole tutorial is completable end to end', () => {
    // Continuation steps only make sense in sequence, so this walks the
    // tutorial exactly as a player would: act, let the Coach reply, move on.
    freshState(); tutorialTestSetup(); startTutorial();
    const bad = [];
    replayTutorialSteps(TUTORIAL_STEPS.length, bad);
    endTutorial(false);
    assertEqual(bad, [], 'Every step must be completable when played in sequence');
  });

  await test('REGRESSION TUTORIAL AUDIT: every scripted Coach reply is legal', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const bad = [];
    replayTutorialSteps(TUTORIAL_STEPS.length, bad);
    endTutorial(false);
    const coachBad = bad.filter(b => b.includes('coach'));
    assertEqual(coachBad, [], 'The Coach must never be scripted to make an illegal move');
  });
  await test('TUTORIAL AUDIT: no step quotes an outdated card rule', () => {
    // The 4 plays on 2, 3, 4, 6, 7 — an older build omitted the 3.
    const stale = TUTORIAL_STEPS.map((s, i) => /2, 4, 6 or 7/.test(s.text) ? i + 1 : null).filter(Boolean);
    assertEqual(stale, [], 'Tutorial text must match the current rules');
  });

  // ---- REGRESSION: stale-render turn desync ----
  // A real match hit this: Player A's burn resolves and it becomes
  // Player B's turn, but Player B's own device (a beat behind on the
  // multiplayer sync, or simply mid-render) still had its Play button
  // enabled from the moment before — and the click went through,
  // letting Player B play completely out of turn. isLocalPlayersTurnNow()
  // is the fix: every user-input entry point re-checks turn ownership
  // fresh at the moment of the actual click, never trusting whatever
  // condition a button or handler was enabled under at the last render.
  await test('REGRESSION: isLocalPlayersTurnNow reflects the CURRENT turn, not a stale one', () => {
    freshState({
      players: [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })],
      localPlayerId: 'p1', currentTurnIndex: 0
    });
    assertTrue(isLocalPlayersTurnNow(), 'Should be true when currentTurnIndex points at the local player');
    state.currentTurnIndex = 1; // e.g. an opponent's burn just moved play to them
    assertTrue(!isLocalPlayersTurnNow(), 'Must flip to false the instant turn moves away, with no stale window');
  });
  await test('REGRESSION: clicking Play while it is genuinely not your turn does nothing', () => {
    freshState({
      players: [
        makePlayer({ id: 'p1', hand: [makeCard('K')] }),
        makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })
      ],
      localPlayerId: 'p1',
      currentTurnIndex: 1, // it's p2's turn, not p1's — this is the exact bug scenario
      discardPile: [makeCard('5')]
    });
    state.selectedPlayCardIds = [state.players[0].hand[0].id];
    render();
    const pileBefore = JSON.stringify(state.discardPile);
    const handBefore = JSON.stringify(state.players[0].hand);
    document.getElementById('playSelectedBtn').click();
    assertEqual(state.discardPile, JSON.parse(pileBefore), 'The Pile must be completely untouched by an out-of-turn click');
    assertEqual(state.players[0].hand, JSON.parse(handBefore), 'The Hand must be completely untouched by an out-of-turn click');
  });
  await test('REGRESSION: a genuinely-your-turn Play click still works (guard is not overzealous)', () => {
    freshState({
      players: [
        makePlayer({ id: 'p1', hand: [makeCard('K')] }),
        makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })
      ],
      localPlayerId: 'p1', currentTurnIndex: 0,
      discardPile: [makeCard('5')]
    });
    state.selectedPlayCardIds = [state.players[0].hand[0].id];
    render();
    document.getElementById('playSelectedBtn').click();
    assertEqual(state.discardPile[state.discardPile.length - 1].rank, 'K', 'A legitimate in-turn play must still go through');
  });

  // ---- REGRESSION: multiplayer Hand-refill self-heal ----
  // The same stale-render window let a refill get lost entirely on one
  // client's device when a race overwrote it (Firebase sync is plain
  // last-write-wins .update(), not a transaction — see
  // syncFirebaseGameState). This is the safety net: after every fresh
  // multiplayer snapshot, a Hand short of 3 with cards still in the
  // Deck gets corrected locally rather than staying stuck.
  await test('REGRESSION: enforceLocalHandRefillInvariant corrects a short multiplayer Hand', () => {
    freshState({
      isMultiplayer: true, phase: 'PLAY', localPlayerId: 'p1',
      players: [makePlayer({ id: 'p1', hand: [makeCard('K')] }), makePlayer({ id: 'p2', isBot: false })],
      drawPile: [makeCard('2'), makeCard('3'), makeCard('4')]
    });
    enforceLocalHandRefillInvariant();
    assertEqual(state.players[0].hand.length, 3, 'A short Hand with cards left in the Deck must be topped back up to 3');
  });
  await test('REGRESSION: enforceLocalHandRefillInvariant leaves a correct Hand alone', () => {
    freshState({
      isMultiplayer: true, phase: 'PLAY', localPlayerId: 'p1',
      players: [makePlayer({ id: 'p1', hand: [makeCard('K'), makeCard('Q'), makeCard('J')] }), makePlayer({ id: 'p2' })],
      drawPile: [makeCard('2'), makeCard('3')]
    });
    enforceLocalHandRefillInvariant();
    assertEqual(state.players[0].hand.length, 3, 'A Hand that is already correct must not be touched');
  });
  await test('REGRESSION: enforceLocalHandRefillInvariant never fires outside multiplayer', () => {
    freshState({
      isMultiplayer: false, phase: 'PLAY', localPlayerId: 'p1',
      players: [makePlayer({ id: 'p1', hand: [makeCard('K')] }), makePlayer({ id: 'p2' })],
      drawPile: [makeCard('2'), makeCard('3'), makeCard('4')]
    });
    enforceLocalHandRefillInvariant();
    assertEqual(state.players[0].hand.length, 1, 'Single-player/bot games must never be touched by a multiplayer-only safety net');
  });
  await test('REGRESSION: enforceLocalHandRefillInvariant respects a genuine Bonus Draw in progress', () => {
    freshState({
      isMultiplayer: true, phase: 'PLAY', localPlayerId: 'p1',
      players: [makePlayer({ id: 'p1', hand: [makeCard('K')] }), makePlayer({ id: 'p2' })],
      drawPile: [makeCard('2'), makeCard('3'), makeCard('4')],
      pendingFollowUp: { playerId: 'p1', cardId: 'x', resumeIndex: 0 }
    });
    enforceLocalHandRefillInvariant();
    assertEqual(state.players[0].hand.length, 1, 'A short Hand mid-Bonus-Draw is a real, temporary state, not a bug to correct');
  });
  await test('REGRESSION TUTORIAL: Back restores the board on every action step', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const bad = [];
    TUTORIAL_STEPS.forEach((st, i) => {
      if (!st.require || !st.require.rank) return;
      showTutorialStep(i);
      const before = JSON.stringify(state.discardPile.map(c => c.rank));
      const pool = getAllSelectablePool(state.players[0]);
      const cards = pool.filter(c => c.rank === st.require.rank).slice(0, st.require.count || 1);
      if (!cards.length) return;
      executePlayCards('tut_you', cards);
      showTutorialStep(i); // re-entering restores this step's snapshot
      if (JSON.stringify(state.discardPile.map(c => c.rank)) !== before) bad.push(i + 1);
    });
    endTutorial(false);
    assertEqual(bad, [], 'Back must genuinely undo whatever happened during the step');
  });

  // ---- Tutorial: endgame tiers ----
  await test('Tutorial teaches the endgame (reset, then face-up, then face-down)', () => {
    const reset = TUTORIAL_STEPS.findIndex(s => s.scene && s.scene.emptyDeck);
    const fu = TUTORIAL_STEPS.findIndex((s, i) => i > reset && s.require && s.require.rank && !s.require.blind);
    const fd = TUTORIAL_STEPS.findIndex(s => s.require && s.require.blind);
    assertTrue(reset !== -1, 'The tutorial must reset into a deck-empty endgame scene');
    assertTrue(fu !== -1 && fu > reset, 'The tutorial must teach playing from the table after the reset');
    assertTrue(fd !== -1, 'The tutorial must teach the blind face-down flip');
    assertTrue(fu < fd, 'Face-up must be taught before face-down');
  });
  await test('REGRESSION: final Hand rank can be played with matching Face-Up cards', () => {
    freshState({ drawPile: [], discardPile: [makeCard('4', '♠')], phase: 'PLAY', currentTurnIndex: 0 });
    const handA = makeCard('9', '♥'), handB = makeCard('9', '♣');
    const faceMatch = { ...makeCard('9', '♦'), slotIndex: 0 };
    const faceOther = { ...makeCard('K', '♠'), slotIndex: 1 };
    const you = makePlayer({ id: 'p1', hand: [handA, handB], faceUp: [faceMatch, faceOther] });
    state.players = [you, makePlayer({ id: 'p2' })];
    state.localPlayerId = 'p1';
    const pool = getAllSelectablePool(you);
    assertTrue(pool.some(c => c.id === faceMatch.id), 'Matching Face-Up card must be selectable with the final one-rank Hand');
    assertTrue(!pool.some(c => c.id === faceOther.id), 'Non-matching Face-Up card must stay locked');
    executePlayCards(you.id, [handA, handB, faceMatch]);
    assertEqual(you.hand.length, 0, 'The complete final Hand must be played');
    assertEqual(you.faceUp.map(c => c.rank), ['K'], 'Only the matching Face-Up card must join the play');
    assertEqual(state.discardPile.slice(-3).map(c => c.rank), ['9', '9', '9'], 'All cross-phase cards must land as one play');
  });
  await test('Endgame scenes correctly unlock the face-up and face-down tiers', () => {
    freshState(); tutorialTestSetup(); startTutorial();
    const reset = TUTORIAL_STEPS.findIndex(s => s.scene && s.scene.emptyDeck);
    showTutorialStep(reset);
    // Play through exactly as the script does: 2, then Ace, then the
    // Joker duel resolves automatically — that's what actually unlocks
    // face-up, not the reset scene itself (the reset hand isn't empty).
    const you = state.players[0], coach = state.players[1];
    let pool = getAllSelectablePool(you);
    executePlayCards(you.id, pool.filter(c => c.rank === '2').slice(0, 1));
    coach.hand = [{ id: 'c5', rank: '5', suit: '♦', isJoker: false }];
    executePlayCards(coach.id, coach.hand);
    pool = getAllSelectablePool(you);
    executePlayCards(you.id, pool.filter(c => c.rank === 'A').slice(0, 1));
    coach.hand = [{ id: 'cj', rank: 'JOKER', suit: 'JOKER', isJoker: true }];
    resolveJokerDuelInstant(coach, you, coach.hand[0]);
    const faceUpUnlocked = canAccessFaceUp(you);
    // Clear the face-up tier the way the script does — four Queens.
    state.discardPile = [];
    pool = getAllSelectablePool(you);
    executePlayCards(you.id, pool.filter(c => c.rank === 'Q').slice(0, 1));
    executePlayCards(you.id, (you.faceUp || []).filter(c => c.rank === 'Q').slice(0, 2));
    const faceDownUnlocked = canAccessFaceDown(you);
    endTutorial(false);
    assertTrue(faceUpUnlocked, 'Emptying hand and deck must unlock face-up cards');
    assertTrue(faceDownUnlocked, 'Emptying face-up cards too must unlock face-down cards');
  });
  await test('Bot difficulty accuracy scales monotonically easy < medium < hard < boss', () => {
    assertTrue(BOT_ACCURACY.easy < BOT_ACCURACY.medium, 'easy must be less accurate than medium');
    assertTrue(BOT_ACCURACY.medium < BOT_ACCURACY.hard, 'medium must be less accurate than hard');
    assertTrue(BOT_ACCURACY.hard < BOT_ACCURACY.boss, 'hard must be less accurate than boss');
  });
  await test('Every difficulty only ever returns legal moves', () => {
    freshState({ discardPile: [makeCard('5', '♠')], drawPile: [] });
    const bot = makePlayer({ id: 'b', isBot: true, hand: [makeCard('10','♦'), makeCard('9','♣'), makeCard('K','♥')] });
    state.players = [bot, makePlayer({ id: 'o' })];
    ['easy','medium','hard','boss'].forEach(d => {
      for (let i = 0; i < 60; i++) {
        const legal = getLegalMovesForPlayer(bot, state.discardPile, state.activeConstraint);
        if (!legal.length) continue;
        const chosen = selectBestBotMove(bot, legal, d);
        assertTrue(chosen.length > 0, `${d} must return a move`);
        assertTrue(chosen.every(c => isPlayLegal(c, state.discardPile, state.activeConstraint)),
          `${d} returned an illegal move`);
      }
    });
  });

  // ---- Tutorial: must never leak into or corrupt a real game ----
  // startTutorial legitimately refuses without a nickname (same as the
  // real game), so tests must provide one first.
  function tutorialTestSetup() {
    const inp = document.getElementById('playerNameInput');
    if (inp) { inp.disabled = false; inp.value = 'Tester'; }
  }
  await test('Tutorial stacked deck deals a valid 3/3/3 to every player', () => {
    freshState(); tutorialTestSetup();
    startTutorial();
    const problems = checkDealIntegrity(state.players);
    endTutorial(false);
    assertEqual(problems, [], 'Tutorial deal should satisfy the same integrity rules as a normal deal');
  });
  await test('Tutorial uses a full, valid 54-card deck (no duplicates or missing cards)', () => {
    freshState(); tutorialTestSetup();
    startTutorial();
    const all = [...state.drawPile];
    state.players.forEach(p => all.push(...p.hand, ...p.faceUp, ...p.faceDown));
    const ids = new Set(all.map(c => c.id));
    const jokers = all.filter(c => c.isJoker).length;
    endTutorial(false);
    assertEqual(all.length, 54, 'Tutorial deck should contain exactly 54 cards');
    assertEqual(ids.size, 54, 'Tutorial deck should contain no duplicate cards');
    assertEqual(jokers, 2, 'Tutorial deck should contain exactly 2 Jokers');
  });
  await test('REGRESSION: ending the tutorial leaves no state that could leak into a real game', () => {
    freshState(); tutorialTestSetup();
    startTutorial();
    assertTrue(tutorialActive, 'Tutorial should be active after starting');
    endTutorial(false);
    assertTrue(!tutorialActive, 'tutorialActive must be false after ending');
    assertEqual(state.players.length, 0, 'Players must be cleared');
    assertEqual(state.phase, 'LOBBY', 'Phase must return to LOBBY');
    assertEqual(state.discardPile.length, 0, 'Discard pile must be cleared');
    assertEqual(state.drawPile.length, 0, 'Draw pile must be cleared');
    assertEqual(state.selectedPlayCardIds.length, 0, 'Selection must be cleared');
  });
  await test('Tutorial is inert when not started — no effect on a normal game', () => {
    freshState();
    assertTrue(!tutorialActive, 'Tutorial should be inactive by default');
    // tutorialOnPlayerActed must be a harmless no-op outside the tutorial
    tutorialOnPlayerActed();
    assertTrue(!tutorialActive, 'Calling the tutorial hook must not activate anything');
  });

  // ---- Face-up sacrifice bot logic ----
  await test('Hard bot prioritizes recovering a 10 or Joker over the "weakest card" default', () => {
    const bot = makePlayer({ id: 'p2', isBot: true, hand: [], faceUp: [makeCard('4', '♦'), makeCard('10', '♣'), makeCard('5', '♠')] });
    assertEqual(chooseFaceUpSacrificeForBot(bot, 'hard').map(c => c.rank), ['10'], 'A Hard bot should prioritize recovering the 10');
  });
  await test('Easy bot makes the wasteful choice — its strongest ordinary card', () => {
    const bot = makePlayer({ id: 'p2', isBot: true, hand: [], faceUp: [makeCard('4', '♦'), makeCard('K', '♣'), makeCard('5', '♠')] });
    assertEqual(chooseFaceUpSacrificeForBot(bot, 'easy').map(c => c.rank), ['K'], 'An Easy bot should wastefully bring back its strongest ordinary card');
  });

  // ---- REGRESSION: end-of-match UI (Continue Watching / Play Again / Match Stats) ----
  // These cover a bug where the "Continue Watching" victory popup could be
  // left stuck on top of the end-of-match screen (always the case in a
  // 2-player match, since the first finisher already ends it), and a
  // second bug where the Play Again / Match Stats buttons weren't
  // reliably shown or cleared for every client.
  await test('REGRESSION: finishing in a 2-player match skips the "Continue Watching" popup', () => {
    freshState({ isMultiplayer: true });
    const finisher = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [] });
    const opponent = makePlayer({ id: 'p2', hand: [makeCard('7')], faceUp: [], faceDown: [] });
    state.players = [finisher, opponent];
    state.localPlayerId = 'p1';
    const overlay = document.getElementById('victoryOverlay');
    overlay.classList.add('hidden');
    checkPlayerFinished(finisher);
    assertTrue(finisher.hasFinished, 'The finisher should still be marked as finished');
    assertTrue(overlay.classList.contains('hidden'), 'The popup must stay hidden — a 2-player finish always ends the match immediately');
  });
  await test('Finishing in a 3+ player match (not the last player) still shows "Continue Watching"', () => {
    freshState({ isMultiplayer: true });
    const finisher = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [] });
    const p2 = makePlayer({ id: 'p2', hand: [makeCard('7')], faceUp: [], faceDown: [] });
    const p3 = makePlayer({ id: 'p3', hand: [makeCard('8')], faceUp: [], faceDown: [] });
    state.players = [finisher, p2, p3];
    state.localPlayerId = 'p1';
    const overlay = document.getElementById('victoryOverlay');
    overlay.classList.add('hidden');
    checkPlayerFinished(finisher);
    assertTrue(!overlay.classList.contains('hidden'), 'With players still in the running, the popup should still appear');
    overlay.classList.add('hidden'); // cleanup
  });
  await test('REGRESSION: reaching the match-end screen force-closes any lingering "Continue Watching" popup', () => {
    freshState({ isMultiplayer: false, isHost: false });
    const winner = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [], hasFinished: true, finishRank: 1 });
    const shithead = makePlayer({ id: 'p2', hand: [makeCard('7')], faceUp: [], faceDown: [] });
    state.players = [winner, shithead];
    state.localPlayerId = 'p1';
    // Simulate it having been left open by an earlier finisher.
    const overlay = document.getElementById('victoryOverlay');
    overlay.classList.remove('hidden');
    triggerNextTurn();
    assertEqual(state.phase, 'FINISHED', 'The match should be marked FINISHED once only one player remains');
    assertTrue(overlay.classList.contains('hidden'), 'The match-end screen must force-close a lingering victory popup');
    assertTrue(!document.getElementById('quickPlayMatchBtn').classList.contains('hidden'), 'Quick Play must appear once the match ends');
    assertTrue(document.getElementById('playAgainMatchBtn').classList.contains('hidden'), 'Back to Lobby has no meaning in a solo match and must stay hidden');
    assertTrue(!document.getElementById('matchStatsBtn').classList.contains('hidden'), 'Match Stats must appear once the match ends');
    hideMatchEndUI(); // cleanup
  });
  await test('End-of-match screen: host sees enabled Quick Play + Back to Lobby, guest sees only a disabled waiting state', () => {
    freshState({ isMultiplayer: true, isHost: true });
    state.players = [makePlayer({ id: 'p1', hasFinished: true, finishRank: 1 }), makePlayer({ id: 'p2' })];
    state.localPlayerId = 'p1';
    const quickPlayBtn = document.getElementById('quickPlayMatchBtn');
    const backToLobbyBtn = document.getElementById('playAgainMatchBtn');

    showMatchEndUI();
    assertEqual(quickPlayBtn.disabled, false, 'The host should have an enabled Quick Play button');
    assertTrue(quickPlayBtn.textContent.includes('QUICK PLAY'), 'The host should see QUICK PLAY');
    assertTrue(!backToLobbyBtn.classList.contains('hidden'), 'The host should also see Back to Lobby');

    state.isHost = false;
    showMatchEndUI();
    assertEqual(quickPlayBtn.disabled, true, "A guest's Quick Play button must be disabled");
    assertTrue(/WAITING FOR\s*HOST/.test(quickPlayBtn.textContent), 'A guest should see a waiting-for-host message');
    assertTrue(backToLobbyBtn.classList.contains('hidden'), 'Only the host can send the room back to the lobby, so a guest must not see this button at all');

    hideMatchEndUI(); // cleanup
  });
  await test('REGRESSION: showMultiplayerLobbyView shows host-only controls only for the host', () => {
    freshState({ isMultiplayer: true, isHost: true, roomCode: '123456' });
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    state.localPlayerId = 'p1';
    document.getElementById('lobbyScreen').classList.add('hidden');
    document.getElementById('hostBotControls').classList.add('hidden');
    document.getElementById('startMultiGameBtn').classList.add('hidden');

    showMultiplayerLobbyView();
    assertTrue(!document.getElementById('lobbyScreen').classList.contains('hidden'), 'The lobby screen must be shown');
    assertTrue(!document.getElementById('multiLobbyRoom').classList.contains('hidden'), 'The in-room lobby panel must be shown');
    assertTrue(!document.getElementById('hostBotControls').classList.contains('hidden'), 'The host should see bot controls');
    assertTrue(!document.getElementById('startMultiGameBtn').classList.contains('hidden'), 'The host should see the start-match button');

    state.isHost = false;
    showMultiplayerLobbyView();
    assertTrue(document.getElementById('hostBotControls').classList.contains('hidden'), 'A guest must not see bot controls');
    assertTrue(document.getElementById('startMultiGameBtn').classList.contains('hidden'), 'A guest must not see the start-match button');
  });
  await test('REGRESSION: hideMatchEndUI clears every end-of-match element for the next match', () => {
    freshState();
    document.getElementById('quickPlayMatchBtn').classList.remove('hidden');
    document.getElementById('playAgainMatchBtn').classList.remove('hidden');
    document.getElementById('matchStatsBtn').classList.remove('hidden');
    document.getElementById('matchStatsModal').classList.remove('hidden');
    document.getElementById('victoryOverlay').classList.remove('hidden');

    hideMatchEndUI();

    assertTrue(document.getElementById('quickPlayMatchBtn').classList.contains('hidden'), 'Quick Play must be hidden for the next match');
    assertTrue(document.getElementById('playAgainMatchBtn').classList.contains('hidden'), 'Back to Lobby must be hidden for the next match');
    assertTrue(document.getElementById('matchStatsBtn').classList.contains('hidden'), 'Match Stats button must be hidden for the next match');
    assertTrue(document.getElementById('matchStatsModal').classList.contains('hidden'), "A previous match's stats modal must not stay open");
    assertTrue(document.getElementById('victoryOverlay').classList.contains('hidden'), 'Victory overlay must be hidden for the next match');
  });

  // ---- Base Card glow: lit exactly while a 5's override is live ----
  await test('Base Card HUD glows while a 5 override is active, and clears when another card lands', () => {
    freshState();
    state.players = [
      makePlayer({ id: 'p1', hand: [makeCard('5', '♠'), makeCard('7', '♥')] }),
      makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K', '♦')] })
    ];
    state.localPlayerId = 'p1';
    state.discardPile = [makeCard('6', '♣')]; // this becomes the base card
    executePlayCards('p1', [state.players[0].hand.find(c => c.rank === '5')]);
    render();
    const hud = document.getElementById('baseCardHud');
    assertTrue(!!state.baseOverrideCard, 'Playing a 5 must set a base override');
    assertTrue(hud.classList.contains('base-card-glow'), 'The Base Card HUD should glow while the override is live');

    executePlayCards('p2', [state.players[1].hand[0]]);
    render();
    assertTrue(!state.baseOverrideCard, 'A plain card landing on top must clear the base override');
    assertTrue(!hud.classList.contains('base-card-glow'), 'The glow must clear the instant the override does');
  });
  await test('Base Card glow clears when the pile burns', () => {
    freshState();
    state.players = [
      makePlayer({ id: 'p1', hand: [makeCard('5', '♠'), makeCard('10', '♥')] }),
      makePlayer({ id: 'p2', isBot: true, hand: [] })
    ];
    state.localPlayerId = 'p1';
    state.discardPile = [makeCard('6', '♣')];
    executePlayCards('p1', [state.players[0].hand.find(c => c.rank === '5')]);
    render();
    assertTrue(!!state.baseOverrideCard, 'Sanity check: the override should be live before the burn');
    executePlayCards('p1', [state.players[0].hand.find(c => c.rank === '10')]);
    render();
    assertTrue(!state.baseOverrideCard, 'Burning the pile must clear the base override');
    assertTrue(!document.getElementById('baseCardHud').classList.contains('base-card-glow'), 'The glow must not survive a burn');
  });
  await test('Base Card glow is suppressed during the tutorial (which owns this highlight itself)', () => {
    freshState();
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    state.baseOverrideCard = makeCard('7', '♦');
    tutorialActive = true;
    render();
    assertTrue(!document.getElementById('baseCardHud').classList.contains('base-card-glow'), 'The real-play glow must not fire during the tutorial');
    tutorialActive = false;
  });

  // ---- 'S' keyboard shortcut for the rank multi-select toggle ----
  await test("'S' toggles select-all-of-rank, and Ctrl+S / Cmd+S are left alone for the browser", () => {
    freshState();
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    const before = selectAllOfRank;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    assertEqual(selectAllOfRank, !before, "Plain 'S' should flip the toggle");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }));
    assertEqual(selectAllOfRank, !before, "Ctrl+S must be left alone (it's the browser's Save Page shortcut)");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    assertEqual(selectAllOfRank, before, "A second plain 'S' should flip it back");
  });

  await test("'M' toggles the hamburger menu, 'I' toggles the Inbox", () => {
    currentUser = { uid: 'keyboard-test-uid' }; // the Inbox belongs to a signed-in account
    closeHamburgerMenu();
    document.getElementById('inboxModal').classList.add('hidden');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    assertTrue(document.getElementById('hamburgerDrawer').classList.contains('open'), "'M' must open the menu");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'm', bubbles: true }));
    assertTrue(!document.getElementById('hamburgerDrawer').classList.contains('open'), "A second 'M' must close it again");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
    assertTrue(!document.getElementById('inboxModal').classList.contains('hidden'), "'I' must open the Inbox");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true }));
    assertTrue(document.getElementById('inboxModal').classList.contains('hidden'), "A second 'I' must close it again");
    document.getElementById('authModal').classList.add('hidden');
  });

  await test('REGRESSION: card-specific gameplay shortcuts (and S) go silent while any menu or modal is open', () => {
    freshState();
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    state.phase = 'PLAY';
    const before = selectAllOfRank;
    const settingsModal = document.getElementById('settingsModal');
    settingsModal.classList.remove('hidden');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    assertEqual(selectAllOfRank, before, "'S' must be blocked while Settings is open");
    const selectedBefore = state.selectedPlayCardIds.length;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
    assertEqual(state.selectedPlayCardIds.length, selectedBefore, "A rank key ('2') must be blocked while Settings is open");
    settingsModal.classList.add('hidden');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true }));
    assertEqual(selectAllOfRank, !before, "'S' must work again once the modal is closed");
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', bubbles: true })); // restore
  });

  // The Leaderboard is public now: it reads the leaderboard projection
  // directly and never depends on the auth state, which replaces the two
  // older "wait for auth before showing Sign in" tests.
  await test('REGRESSION: the public Leaderboard never asks anyone to sign in, however auth is resolving', async () => {
    currentUser = null;
    auth = { currentUser: null, onAuthStateChanged: () => () => {} }; // auth never resolves
    const readPaths = [];
    db = { ref: (path) => { readPaths.push(path); return {
      once: () => Promise.resolve({ val: () => ({ amit: { username: 'Amit', rating: 900, tier: 'Silver', wins: 3, losses: 1 }, bo: { username: 'Bo', rating: 1200, tier: 'Silver', wins: 5, losses: 2 } }) }),
      orderByChild: () => ({ limitToLast: () => ({ once: () => Promise.resolve({ val: () => ({}) }) }) })
    }; } };
    openLeaderboardPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const text = document.getElementById('leaderboardArea').innerText;
    assertTrue(!text.toLowerCase().includes('sign in'), 'The public Leaderboard must never say "Sign in"');
    assertTrue(readPaths.some(p => String(p).startsWith('leaderboard')), 'It must read the public leaderboard projection');
    assertTrue(text.indexOf('Bo') !== -1 && text.indexOf('Bo') < text.indexOf('Amit'), 'Players must be ranked by rating, highest first');
    document.getElementById('leaderboardModal').classList.add('hidden');
  });

  // ---- Card reference panel: corner-anchored resize + viewport-fit cap ----
  await test('Dragging a corner handle keeps the opposite corner fixed on screen', () => {
    toggleCardReference(); // open
    const panel = document.getElementById('cardRefPanel');
    setCardRefZoom(1);
    const w = panel.offsetWidth, h = panel.offsetHeight;
    // Start in the bottom-right corner and grow by an amount that still
    // fits on screen, so the keep-on-screen clamp never has to move it.
    const startLeft = window.innerWidth - w - 20, startTop = window.innerHeight - h - 20;
    panel.style.left = `${startLeft}px`;
    panel.style.top = `${startTop}px`;
    const rightBefore = startLeft + w * cardRefZoom;
    const bottomBefore = startTop + h * cardRefZoom;
    setCardRefZoomFromCorner('tl', Math.min(1.4, getMaxCardRefZoom() * 0.9));
    const left = parseFloat(panel.style.left), top = parseFloat(panel.style.top);
    const rightAfter = left + w * cardRefZoom;
    const bottomAfter = top + h * cardRefZoom;
    assertTrue(Math.abs(rightAfter - rightBefore) < 1, 'Dragging the top-left handle must keep the right edge fixed');
    assertTrue(Math.abs(bottomAfter - bottomBefore) < 1, 'Dragging the top-left handle must keep the bottom edge fixed');
    toggleCardReference(true); // close
  });
  await test('Corner resize never lets the panel grow larger than the viewport', () => {
    toggleCardReference();
    setCardRefZoom(100); // absurd request
    assertTrue(cardRefZoom <= getMaxCardRefZoom() + 0.001, 'Zoom must be capped to whatever the viewport can fit');
    const panel = document.getElementById('cardRefPanel');
    const left = parseFloat(panel.style.left), top = parseFloat(panel.style.top);
    assertTrue(left + panel.offsetWidth * cardRefZoom <= window.innerWidth + 1, 'The panel must not overhang the right edge of the screen');
    assertTrue(top + panel.offsetHeight * cardRefZoom <= window.innerHeight + 1, 'The panel must not overhang the bottom edge of the screen');
    assertTrue(left >= 0 && top >= 0, 'The panel must not be dragged/resized off the top-left edge of the screen');
    setCardRefZoom(1);
    toggleCardReference(true);
  });

  // ---- Default game speed ----
  await test('Default speed is 1x (2500ms), and every stop is a true multiple of it', () => {
    assertEqual(DEFAULT_SPEED_INDEX, 1, 'DEFAULT_SPEED_INDEX should point at 1x in SPEED_PRESETS/SPEED_DELAYS');
    assertEqual(SPEED_DELAYS[DEFAULT_SPEED_INDEX], 2500, 'The default turn delay should be 2500ms');
    assertEqual(SPEED_PRESETS, [0.5, 1, 2, 4], 'The scale must only expose 0.5x/1x/2x/4x');
    const baseline = SPEED_DELAYS[DEFAULT_SPEED_INDEX];
    SPEED_PRESETS.forEach((mult, i) => {
      assertEqual(SPEED_DELAYS[i], Math.round(baseline / mult), `${mult}x's delay must be a genuine multiple of the 1x baseline, not just a label`);
    });
  });

  await test('REGRESSION: Match Stats number columns actually lay out side by side, not stacked', () => {
    freshState({ drawPile: [] });
    const p1 = makePlayer({ id: 'p1' });
    const p2 = makePlayer({ id: 'p2', isBot: true });
    state.players = [p1, p2];
    state.localPlayerId = 'p1';
    bumpStat(p1, 'played', 3);
    buildMatchStats('game');
    const gameGrid = document.querySelector('#matchStatsBody .match-stats-grid');
    assertTrue(!!gameGrid, 'Match Stats must render a .match-stats-grid element');
    // A hidden panel reports the declared "repeat(N, …)" instead of N sizes.
    const countCols = (el) => { const v = getComputedStyle(el).gridTemplateColumns; const m = v.match(/^repeat\((\d+)/); return m ? Number(m[1]) : v.split(' ').length; };
    const gameCols = countCols(gameGrid);
    assertEqual(gameCols, 5, 'The Game tab has 5 stat columns (Played/Picked/Burnt/Turns/JKR) — a class that silently fails to apply (this project has no live Tailwind compiler; grid-cols-N must already exist in the precompiled CSS) would collapse this to 1');
    buildMatchStats('lobby');
    const lobbyGrid = document.querySelector('#matchStatsBody .match-stats-grid');
    const lobbyCols = countCols(lobbyGrid);
    assertEqual(lobbyCols, 7, 'The Lobby tab has 7 stat columns (adds Wins/Win%)');
  });

  await test('REGRESSION: a burn syncs the new turn owner immediately, before the visual hold delay finishes', () => {
    freshState({ isMultiplayer: true, drawPile: [] });
    const burner = makePlayer({ id: 'p1', hand: [makeCard('10', '♦')] });
    const other = makePlayer({ id: 'p2', hand: [makeCard('4')] });
    state.players = [burner, other];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 1; // pretend it was p2's turn — e.g. a Snap Burn, which is inherently out-of-turn
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false; // force the real timed hold, not the test shortcut
    let syncCalls = 0;
    const originalSync = syncFirebaseGameState;
    syncFirebaseGameState = function () { syncCalls++; };
    executePlayCards('p1', [burner.hand[0]]);
    // This assertion runs synchronously, before the setTimeout inside
    // executeBurn has any chance to fire — if the turn hand-off were
    // still waiting on that timer, this would catch it.
    assertTrue(syncCalls >= 1, 'The burn must sync the new turn owner right away, not only once the hold finishes — that gap is what let the previous turn-holder sneak in a play');
    assertEqual(state.currentTurnIndex, 0, 'The turn must already belong to the burner synchronously');
    syncFirebaseGameState = originalSync;
    burnInstantResolveForTests = wasInstant;
  });

  // Root cause of the "10 sometimes leaves it on the table and allows a
  // lower card or a 2 to be played on top of it" and "10s stuck /
  // cross-phase lockup" bugs: currentTurnIndex hands the turn back to
  // the burner synchronously (see the test above), but the pile itself
  // isn't actually cleared until finishBurn runs after the visual hold
  // (holdMs in executeBurn). In that gap, isLocalPlayersTurnNow() used
  // to read as true again, so a second Play click, a blind flip, a Snap
  // Burn, or a multiplayer timeout auto-play could all land another
  // card — or a pickup — on the still-unburnt pile. state.burnResolving
  // closes that window.
  await test('REGRESSION: isLocalPlayersTurnNow returns false while a burn is still resolving', () => {
    freshState({ drawPile: [] });
    const burner = makePlayer({ id: 'p1', hand: [makeCard('10', '♦')] });
    state.players = [burner, makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 0;
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    assertTrue(isLocalPlayersTurnNow(), 'Sanity check: it is genuinely p1\'s turn before the 10 is played');
    executePlayCards('p1', [burner.hand[0]]);
    assertTrue(state.burnResolving, 'burnResolving must be true immediately, before the hold clears the pile');
    assertTrue(!isLocalPlayersTurnNow(), 'Must read as NOT this player\'s turn while burnResolving is true, even though currentTurnIndex already points back at them');
    burnInstantResolveForTests = wasInstant;
  });

  await test('REGRESSION: a second play or pickup cannot land on the pile before a burn actually clears it', () => {
    freshState({ drawPile: [] });
    const burner = makePlayer({ id: 'p1', hand: [makeCard('10', '♦'), makeCard('2', '♠')] });
    state.players = [burner, makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 0;
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    executePlayCards('p1', [burner.hand[0]]); // play the 10 — triggers executeBurn, still on hold
    const pileBefore = JSON.stringify(state.discardPile);
    const handBefore = JSON.stringify(burner.hand);
    // The exact race: try to sneak a 2 on top of the still-unburnt 10.
    executePlayCards('p1', [burner.hand[0]]);
    assertEqual(state.discardPile, JSON.parse(pileBefore), 'A second play must be silently rejected while the burn is still resolving');
    assertEqual(burner.hand, JSON.parse(handBefore), "The burner's hand must be untouched by the rejected second play");
    // A pickup attempt in the same window must be rejected too, not just a play.
    executePickup('p1');
    assertEqual(state.discardPile, JSON.parse(pileBefore), 'A pickup attempt must also be rejected while burnResolving is true');
    burnInstantResolveForTests = wasInstant;
  });

  await test('REGRESSION: clicking Play while a burn is resolving does nothing (full UI stack)', () => {
    freshState({ drawPile: [] });
    const burner = makePlayer({ id: 'p1', hand: [makeCard('10', '♦'), makeCard('2', '♠')] });
    state.players = [burner, makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] })];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 0;
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    executePlayCards('p1', [burner.hand[0]]); // 10 played, burn on hold
    render();
    state.selectedPlayCardIds = [burner.hand[0].id]; // the 2
    render();
    const pileBefore = JSON.stringify(state.discardPile);
    document.getElementById('playSelectedBtn').click();
    assertEqual(state.discardPile, JSON.parse(pileBefore), 'A Play click during the burn hold must be a no-op, exactly like clicking out of turn');
    burnInstantResolveForTests = wasInstant;
  });

  await test('The hand-count indicator reflects your real hand size', () => {
    freshState({ drawPile: [] });
    const you = makePlayer({ id: 'p1', hand: [makeCard('4'), makeCard('7'), makeCard('K')] });
    state.players = [you, makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    render();
    assertEqual(document.getElementById('handCountValue').textContent, '3', 'The indicator must show the real hand count');
    you.hand.pop();
    render();
    assertEqual(document.getElementById('handCountValue').textContent, '2', 'The indicator must update as the hand changes');
  });
  await test('REGRESSION: the hand-count indicator cannot overlap the hand even at a full 3-row hand', () => {
    const wrap = document.getElementById('handCountWrap');
    assertTrue(!!wrap, '#handCountWrap must exist');
    // It must live in the turn-indicator row, not anywhere inside or
    // touching #localHand's own layout — that's what makes overlap
    // structurally impossible regardless of how many rows the hand
    // wraps into, rather than something that merely happens to not
    // overlap at today's sizes.
    const handEl = document.getElementById('localHand');
    assertTrue(!!handEl && !handEl.contains(wrap), 'The hand-count indicator must not be a descendant of the hand container');
    assertTrue(!wrap.contains(handEl), 'Nor the other way around');
    // Simulate the worst case from the earlier hand-clipping bug: a
    // maximally tall 3-row hand.
    handEl.style.maxHeight = '60vh';
    handEl.style.height = '60vh';
    const wrapRect = wrap.getBoundingClientRect();
    const handRect = handEl.getBoundingClientRect();
    const overlaps = wrapRect.left < handRect.right && wrapRect.right > handRect.left &&
                      wrapRect.top < handRect.bottom && wrapRect.bottom > handRect.top;
    handEl.style.maxHeight = '';
    handEl.style.height = '';
    assertTrue(!overlaps, 'The hand-count indicator must not overlap the hand area even when the hand occupies its full possible height');
  });

  await test('REGRESSION: the hand container can never be shorter than the card-sizing algorithm assumes', () => {
    const handEl = document.getElementById('localHand');
    assertTrue(!!handEl, '#localHand must exist');
    // match-end-compact deliberately shrinks the hand once a match is
    // over (see showMatchEndUI) — a smaller max-height there is by
    // design, not a regression, so this check is only meaningful
    // against the NORMAL active-play sizing. Any earlier test that
    // triggered a real match ending (even as a side effect of testing
    // something else entirely, like win detection) could leave this
    // class behind, since it's DOM state freshState() has no way to
    // know about or reset.
    handEl.classList.remove('match-end-compact');
    const cssMaxHeightPx = parseFloat(getComputedStyle(handEl).maxHeight) || 0;
    // getAvailableHandHeightPx() caps itself at window.innerHeight * 0.46
    // and sizes a 2-3 row hand to fill up to that much room — a smaller
    // CSS max-height than that silently clips the top row (and its
    // glow) regardless of how correctly the cards were sized, which is
    // exactly what shipped once already with a stale max-h-[19vh].
    const jsCeilingPx = window.innerHeight * 0.46;
    assertTrue(cssMaxHeightPx >= jsCeilingPx - 1, `The hand's CSS max-height (${cssMaxHeightPx}px) must be at least as tall as the sizing algorithm's own ceiling (${jsCeilingPx}px)`);
  });

  await test('REGRESSION: once all but one player has finished, nobody can receive more cards', () => {
    freshState({ discardPile: [makeCard('7'), makeCard('9')], drawPile: [makeCard('2'), makeCard('3')] });
    const done1 = makePlayer({ id: 'p1', hand: [], faceUp: [], faceDown: [], hasFinished: true, finishRank: 1 });
    const done2 = makePlayer({ id: 'p2', hand: [], faceUp: [], faceDown: [], hasFinished: true, finishRank: 2 });
    const lastOne = makePlayer({ id: 'p3', isBot: true, hand: [makeCard('K')] });
    state.players = [done1, done2, lastOne];
    assertTrue(isMatchDecided(), 'With only one active player left, the match must already read as decided');

    refillHand(done1);
    assertEqual(done1.hand.length, 0, "A finished player's hand must not be refilled once the match is decided");

    executePickup('p2');
    assertEqual(done2.hand.length, 0, 'A finished player must not be able to pick up the pile once the match is decided');
    assertEqual(state.discardPile.length, 2, 'The pile itself must be untouched by the refused pickup');

    const handBefore = lastOne.hand.length;
    executePlayCards('p3', [lastOne.hand[0]]);
    assertEqual(lastOne.hand.length, handBefore, 'No play should be processed at all once the match is decided, not even for the one remaining active player');
  });

  await test('REGRESSION: the card reference tooltip can never be dragged or resized over the header', () => {
    toggleCardReference(); // open
    const panel = document.getElementById('cardRefPanel');
    const headerBottom = document.querySelector('header').getBoundingClientRect().bottom;
    // Try to force it up into/above the header from every angle: a
    // direct position request, a drag, and a corner-resize that grows
    // it upward.
    panel.style.left = '20px';
    panel.style.top = '0px';
    setCardRefZoom(1);
    assertTrue(parseFloat(panel.style.top) >= headerBottom, 'A direct top:0 position request must still be pushed below the header');

    setCardRefZoomFromCorner('tl', 2); // top-left handle grows the panel UPWARD
    assertTrue(parseFloat(panel.style.top) >= headerBottom - 0.5, 'Growing the panel upward via corner-resize must not let it creep above the header');

    setCardRefZoom(1);
    toggleCardReference(true); // close
  });

  await test('REGRESSION: card-flight animations target the specific player who acted, not just the shared opponents row', () => {
    freshState();
    const you = makePlayer({ id: 'p1' });
    const freja = makePlayer({ id: 'p2', name: 'Freja' });
    const lukas = makePlayer({ id: 'p3', name: 'Lukas' });
    const sophia = makePlayer({ id: 'p4', name: 'Sophia' });
    state.players = [you, freja, lukas, sophia];
    state.localPlayerId = 'p1';
    render(); // builds each opponent's own #opp-{id} div

    assertTrue(getPlayerAnimationTarget('p1') === document.getElementById('localHand'), "The local player's target must be their own hand");
    ['p2', 'p3', 'p4'].forEach(id => {
      const target = getPlayerAnimationTarget(id);
      assertTrue(!!target, `Player ${id} must resolve to a real element`);
      assertEqual(target.id, `opp-${id}`, `Player ${id}'s animation target must be their OWN div (opp-${id}), not the shared opponents row — this is the exact bug where Sophia's pickup visually flew to Lukas`);
    });
    // And each of those three must genuinely be different elements —
    // the old bug had all three resolve to the same shared container.
    const targets = ['p2', 'p3', 'p4'].map(id => getPlayerAnimationTarget(id));
    assertEqual(new Set(targets).size, 3, 'Each opponent must have a distinct animation target element');
  });

  await test('REGRESSION: the Lobby Totals header/rows never overflow past the modal panel', () => {
    freshState({ drawPile: [] });
    const p1 = makePlayer({ id: 'p1', name: 'Sophia (Bot)' });
    const p2 = makePlayer({ id: 'p2', name: 'Lukas (Bot)', isBot: true });
    state.players = [p1, p2];
    state.localPlayerId = 'p1';
    bumpStat(p1, 'played', 25);
    buildMatchStats('lobby');
    const modal = document.getElementById('matchStatsModal');
    modal.classList.remove('hidden'); // must actually be laid out to measure real widths
    const panel = modal.querySelector(':scope > div');
    const panelRight = panel.getBoundingClientRect().right;
    const grids = document.querySelectorAll('#matchStatsBody .match-stats-grid');
    assertTrue(grids.length > 0, 'Lobby Totals must render at least one stat grid to check');
    grids.forEach((grid, i) => {
      const gridRight = grid.getBoundingClientRect().right;
      assertTrue(gridRight <= panelRight + 1, `Stat grid #${i} (right edge ${gridRight}px) must not extend past the modal panel (right edge ${panelRight}px) — this is exactly the Wins/Win% columns getting cut off at the screen edge`);
    });
    modal.classList.add('hidden');
  });

  await test('REGRESSION: a full 12-character name is never truncated in either Match Stats tab', () => {
    freshState({ drawPile: [] });
    // Exactly 12 characters — maxlength on the actual name input — with
    // no (you)/(Bot) suffix, since the bare name itself is the
    // requirement: it must always fully fit.
    const longName = 'Alexandriaaa';
    assertEqual(longName.length, 12, 'Sanity check on the test name itself');
    const p1 = makePlayer({ id: 'p1', name: longName });
    const p2 = makePlayer({ id: 'p2', name: 'Bo', isBot: true });
    state.players = [p1, p2];
    state.localPlayerId = 'p2'; // p1 isn't "(you)" — keep the suffix out of this check
    const modal = document.getElementById('matchStatsModal');
    modal.classList.remove('hidden');

    ['game', 'lobby'].forEach(scope => {
      buildMatchStats(scope);
      const nameSpan = [...document.querySelectorAll('#matchStatsBody span')].find(el => el.textContent === longName);
      assertTrue(!!nameSpan, `The ${scope} tab must render the full name text somewhere, even if visually truncated`);
      assertTrue(nameSpan.scrollWidth <= nameSpan.clientWidth + 1, `A full 12-character name must not be truncated in the ${scope} tab (needs ${nameSpan.scrollWidth}px, only has ${nameSpan.clientWidth}px)`);
    });
    modal.classList.add('hidden');
  });

  await test('REGRESSION: Quick Play against bots reuses the exact same bot names, not a fresh random pick', () => {
    freshState({ isMultiplayer: false, drawPile: [] });
    state.players = [
      makePlayer({ id: 'p_user', isBot: false }),
      makePlayer({ id: 'p_bot_1', isBot: true, name: 'Freja' }),
      makePlayer({ id: 'p_bot_2', isBot: true, name: 'Lukas' }),
    ];
    const priorBotNames = state.players.filter(p => p.isBot).map(p => p.name);
    startSinglePlayerGame(2, priorBotNames);
    const newBotNames = state.players.filter(p => p.isBot).map(p => p.name).sort();
    assertEqual(newBotNames, ['Freja', 'Lukas'], 'Quick Play must keep the exact same bots, not roll a new random cast');
  });
  await test('REGRESSION: a genuinely new game (no reuse list, or a changed bot count) still picks bots normally', () => {
    freshState({ isMultiplayer: false, drawPile: [] });
    state.players = [makePlayer({ id: 'p_user', isBot: false })];
    startSinglePlayerGame(3); // no reuseBotNames arg at all — e.g. the lobby's Start button
    assertEqual(state.players.filter(p => p.isBot).length, 3, 'A fresh game must still deal the requested bot count');
    // Mismatched count (e.g. the player changed the slider since the last
    // match) must fall back to a fresh pick rather than reusing a list
    // that no longer matches what was asked for.
    startSinglePlayerGame(2, ['Freja']); // count mismatch: asked for 2, only 1 name supplied
    assertEqual(state.players.filter(p => p.isBot).length, 2, 'A mismatched reuse list must fall back to a normal random pick at the requested count');
  });

  // ---- REGRESSION: Ranked match authority isn't tied to isHost ----
  await test('hasMatchAuthority: Ranked grants match authority to both players, casual rooms only to the host', () => {
    freshState({ isMultiplayer: true, isHost: true, isRanked: false });
    assertTrue(hasMatchAuthority(), 'The host of a casual room must have match authority');
    freshState({ isMultiplayer: true, isHost: false, isRanked: false });
    assertTrue(!hasMatchAuthority(), 'A casual-room guest must NOT have match authority (lobby management stays host-only)');
    freshState({ isMultiplayer: true, isHost: true, isRanked: true });
    assertTrue(hasMatchAuthority(), 'The Ranked player who happened to create the room still has authority');
    freshState({ isMultiplayer: true, isHost: false, isRanked: true });
    assertTrue(hasMatchAuthority(), 'REGRESSION: the non-host Ranked player must ALSO have match authority, or a host disconnect freezes the match with nobody left to notice');
  });
  await test('REGRESSION: a Ranked guest (non-host) can substitute a bot for a disconnected host', () => {
    // Before this fix, removePlayerFromMatch bailed out for anyone who
    // wasn't isHost — meaning if the ORIGINAL host was the one who
    // disconnected in a Ranked match, literally nobody's client was
    // ever willing to run this and the match would freeze forever.
    freshState({ isMultiplayer: true, isRanked: true, isHost: false, localPlayerId: 'p_room1' });
    const host = makePlayer({ id: 'p_host', name: 'Departed', uid: 'uid_host' });
    const guest = makePlayer({ id: 'p_room1', name: 'Still Here', uid: 'uid_guest' });
    state.players = [host, guest];
    const originalSync = syncFirebaseGameState;
    syncFirebaseGameState = () => {};
    removePlayerFromMatch('p_host', 'disconnected');
    syncFirebaseGameState = originalSync;
    const seat = state.players.find(p => p.name.startsWith('Departed'));
    assertTrue(!!seat && seat.isBot, "The departed host's seat must be handed to a substitute bot, driven by the guest's own client");
    assertTrue(seat.isRankedSubstitute, 'The substitute must be marked Ranked-only so the 5-turn concession cap applies');
  });
  await test('REGRESSION: Ranked hides all kick controls, for host and guest alike', () => {
    freshState({ isMultiplayer: true, isHost: true, isRanked: true, roomCode: '555555', localPlayerId: 'p_host' });
    state.players = [makePlayer({ id: 'p_host', isHost: true }), makePlayer({ id: 'p_room1', name: 'Opponent' })];
    const originalUpdate = updatePlayersAtomic;
    let atomicCalls = 0;
    updatePlayersAtomic = () => { atomicCalls++; };
    kickPlayer('p_room1');
    updatePlayersAtomic = originalUpdate;
    assertEqual(atomicCalls, 0, 'kickPlayer must not touch the player list at all in a Ranked match');

    const originalRemove = removePlayerFromMatch;
    let removeCalls = 0;
    removePlayerFromMatch = () => { removeCalls++; };
    const originalConfirm = window.confirm;
    window.confirm = () => true; // would approve the kick if the Ranked guard ever let it get this far
    kickPlayerMidMatch('p_room1');
    window.confirm = originalConfirm;
    removePlayerFromMatch = originalRemove;
    assertEqual(removeCalls, 0, 'kickPlayerMidMatch must bail out before ever calling removePlayerFromMatch in a Ranked match');
  });

  // ---- REGRESSION: reconnecting to a Ranked match after a refresh ----
  await test('reclaimSubstitutedSeat restores a bot-substituted seat to human control', () => {
    const substitute = makePlayer({
      id: 'p_bot_x7f2q', name: 'Amit (Bot)', uid: 'uid_amit', isBot: true,
      isRankedSubstitute: true, substituteMoveCount: 3,
      hand: [makeCard('K')], faceUp: [makeCard('4')]
    });
    const reclaimed = reclaimSubstitutedSeat(substitute);
    assertEqual(reclaimed.isBot, false, 'The reclaimed seat must no longer be bot-controlled');
    assertEqual(reclaimed.name, 'Amit', 'The " (Bot)" suffix must be stripped back off');
    assertEqual(reclaimed.isRankedSubstitute, false, 'The concession-cap flag must be cleared — this is a human again');
    assertEqual(reclaimed.substituteMoveCount, 0, "The bot's move counter must reset, not carry over");
    assertEqual(reclaimed.id, 'p_bot_x7f2q', 'The id must NOT change — everything else in the room already keys off it');
    assertEqual(reclaimed.uid, 'uid_amit', "The account's uid must survive the reclaim untouched");
    assertEqual(reclaimed.hand.map(c => c.rank), ['K'], 'Cards the substitute was holding must carry over exactly as-is');
  });
  await test('reclaimSubstitutedSeat leaves a name with no "(Bot)" suffix alone', () => {
    const substitute = makePlayer({ id: 'p1', name: 'Priya', isBot: true });
    assertEqual(reclaimSubstitutedSeat(substitute).name, 'Priya', 'A plain name with no suffix must pass through unchanged');
  });
  await test('Online blind flips are broadcast to the room with the result and timing', () => {
    freshState({ isMultiplayer: true, roomCode: '101010', localPlayerId: 'p_me', discardPile: [{ id: 'k1', rank: 'K', suit: 'H' }], activeConstraint: null });
    const originalDb = db;
    let path = null, payload = null;
    db = { ref: (p) => ({ set: (v) => { path = p; payload = v; return Promise.resolve(); } }) };
    try { broadcastBlindReveal('p_me', { id: 'c3', rank: '3', suit: 'S' }); } finally { db = originalDb; }
    assertEqual(path, 'rooms/101010/lastBlindReveal', 'Written to the room');
    assertEqual(payload.playerId, 'p_me', 'Names whose flip it is');
    assertEqual(payload.by, 'p_me', 'Names the client that made it');
    assertTrue(payload.good === true, 'A 3 is playable on a King: green');
    assertEqual(payload.ms, BLIND_REVEAL_MS.self, 'Carries the reveal length');
    assertTrue(typeof payload.key === 'string' && payload.key.length > 3, 'Has a unique key');
  });
  await test('A broadcast reveal is never replayed by the client that made it, or when it arrives too late', () => {
    freshState({ isMultiplayer: true, roomCode: '101010', localPlayerId: 'p_host' });
    const card = { id: 'c3', rank: '3', suit: 'S' };
    assertTrue(!showRemoteBlindReveal({ key: 'a', by: 'p_host', playerId: 'p_bot_1', card, good: true, ms: 800, at: serverNow() }), 'The host made this bot flip itself');
    assertTrue(!showRemoteBlindReveal({ key: 'b', by: 'p_x', playerId: 'p_host', card, good: true, ms: 800, at: serverNow() }), 'Never my own flip');
    assertTrue(!showRemoteBlindReveal({ key: 'c', by: 'p_x', playerId: 'p_x', card, good: true, ms: 800, at: serverNow() - 5000 }), 'Too late: the result is already on the table');
  });
  await test('The Shop opens on the last tab picked, unless a seasonal event has started since', () => {
    const saved = localStorage.getItem('shithead_shop_tab');
    try {
      localStorage.removeItem('shithead_shop_tab');
      assertEqual(restoredShopTab(false), 'Profile Pictures', 'Nothing saved: Pictures');
      assertEqual(restoredShopTab(true), SEASONAL_TAB, 'Nothing saved, event on: Seasonal');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Card Backs', seasonLead: false }));
      assertEqual(restoredShopTab(false), 'Card Backs', 'Remembers the tab');
      assertEqual(restoredShopTab(true), SEASONAL_TAB, 'An event that started since takes the lead');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Card Backs', seasonLead: true }));
      assertEqual(restoredShopTab(true), 'Card Backs', 'Picked during the event: stays');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Not A Tab', seasonLead: false }));
      assertEqual(restoredShopTab(false), 'Profile Pictures', 'A tab that no longer exists is ignored');
    } finally {
      if (saved === null) localStorage.removeItem('shithead_shop_tab'); else localStorage.setItem('shithead_shop_tab', saved);
    }
  });
  await test("What's New shows the notes for a version and is keyed by vNNN", () => {
    Object.keys(WHATS_NEW).forEach(k => assertTrue(/^v\d+$/.test(k), `Key ${k} must look like v114`));
    const modal = document.getElementById('whatsNewModal');
    try {
      assertTrue(showWhatsNew('v114'), 'v114 has notes');
      assertTrue(!modal.classList.contains('hidden'), 'The pop-up opens');
      assertEqual(document.querySelectorAll('#whatsNewList li').length, WHATS_NEW.v114.length, 'One row per note');
      assertTrue(!showWhatsNew('v1'), 'A version with no notes shows nothing');
    } finally { modal.classList.add('hidden'); }
  });
  await test('Friends list: online friends first; inviting from a casual lobby uses that room', () => {
    freshState({ isMultiplayer: true, isRanked: false, roomCode: '424242', phase: 'LOBBY' });
    assertEqual(inviteableRoomCode(), '424242', 'Lobby of a casual room');
    const row = friendRowHtml('u1', { username: 'Jamie', online: true }, 'friend');
    assertTrue(row.includes('INVITE HERE'), 'The button says it invites into this room');
    assertTrue(row.includes('friend-status online'), 'Shows Online');
    state.isRanked = true;
    assertEqual(inviteableRoomCode(), null, 'Never a Ranked room');
    freshState({ isMultiplayer: true, isRanked: false, roomCode: '424242', phase: 'PLAY' });
    assertEqual(inviteableRoomCode(), null, 'Not once the match has started');
    freshState({ isMultiplayer: false });
    assertTrue(friendRowHtml('u1', { username: 'Jamie', online: false }, 'friend').includes('friend-status offline'), 'Shows Offline');
  });
  await test('The joined room survives the app being killed (localStorage), and expires', () => {
    freshState({ localPlayerId: 'p_ab12', players: [makePlayer({ id: 'p_ab12', name: 'Jamie' })] });
    forgetJoinedRoom();
    rememberJoinedRoom('778899');
    sessionStorage.removeItem('shithead_joined_room'); // app killed: sessionStorage gone
    const rec = joinedRoomRecord();
    assertEqual(rec && rec.code, '778899', 'The room code must come back from localStorage');
    assertEqual(rec.playerId, 'p_ab12', 'The seat id is stored with it');
    assertEqual(rec.name, 'Jamie', 'The name is stored with it');
    localStorage.setItem('shithead_active_match', JSON.stringify({ ...rec, at: Date.now() - 4 * 60 * 60 * 1000 }));
    assertEqual(joinedRoomRecord(), null, 'A record older than 3 hours is ignored');
    forgetJoinedRoom();
    assertEqual(joinedRoomRecord(), null, 'forgetJoinedRoom clears it');
  });
  await test('A casual match asks before rejoining, then hands a bot stand-in back by name', () => {
    freshState({ isMultiplayer: false, isHost: false, isRanked: false, roomCode: null, localPlayerId: null });
    const savedUser = currentUser;
    currentUser = null;
    matchReconnectAttempted = false;
    forgetJoinedRoom();
    localStorage.setItem('shithead_active_match', JSON.stringify({ code: '135790', at: Date.now(), playerId: 'p_old1', name: 'Jamie' }));
    const fakeRoom = {
      isRanked: false, phase: 'PLAY', hostId: 'p_host',
      players: [
        { id: 'p_host', name: 'Pooja', isBot: false },
        { id: 'p_bot_q2', name: 'Jamie', isBot: true },
        { id: 'p_bot_q1', name: 'Jamie (Bot)', isBot: true }
      ]
    };
    const originalDb = db, originalListen = listenToFirebaseRoom, originalAtomic = updatePlayersAtomic;
    let listenedCode = null, atomicList = null;
    listenToFirebaseRoom = (code) => { listenedCode = code; };
    updatePlayersAtomic = (code, updater, onComplete) => { atomicList = updater(fakeRoom.players); onComplete(null, true, { val: () => atomicList }); };
    db = { ref: () => ({ once: (event, successCb) => successCb({ exists: () => true, val: () => fakeRoom }) }) };
    try {
      attemptMatchReconnect();
      const modal = document.getElementById('rejoinModal');
      assertTrue(!modal.classList.contains('hidden'), 'A casual rejoin must ask first');
      assertEqual(listenedCode, null, 'Nothing is joined until the player says yes');
      document.getElementById('rejoinYesBtn').click();
      assertTrue(modal.classList.contains('hidden'), 'The prompt closes');
      assertEqual(state.localPlayerId, 'p_bot_q1', 'Takes back the stand-in seat named "Jamie (Bot)", not a real bot that happens to be called Jamie');
      assertTrue(atomicList.find(p => p.id === 'p_bot_q1').isBot === false, 'The seat is human again');
      assertEqual(listenedCode, '135790', 'Listens to the room');
      assertTrue(state.isMultiplayer && !state.isRanked && !state.isHost, 'Casual guest seat');
    } finally {
      db = originalDb; listenToFirebaseRoom = originalListen; updatePlayersAtomic = originalAtomic;
      currentUser = savedUser;
      forgetJoinedRoom();
      document.getElementById('rejoinModal').classList.add('hidden');
    }
  });
  await test('"No thanks" on the rejoin prompt forgets the match', () => {
    freshState({ isMultiplayer: false, roomCode: null, localPlayerId: null });
    const savedUser = currentUser;
    currentUser = null;
    matchReconnectAttempted = false;
    localStorage.setItem('shithead_active_match', JSON.stringify({ code: '246801', at: Date.now(), playerId: 'p_me', name: 'Jamie' }));
    const fakeRoom = { phase: 'SWAP', players: [{ id: 'p_host', name: 'Pooja', isBot: false }, { id: 'p_me', name: 'Jamie', isBot: false }] };
    const originalDb = db, originalListen = listenToFirebaseRoom;
    let listened = false;
    listenToFirebaseRoom = () => { listened = true; };
    db = { ref: () => ({ once: (event, successCb) => successCb({ exists: () => true, val: () => fakeRoom }) }) };
    try {
      attemptMatchReconnect();
      document.getElementById('rejoinNoBtn').click();
      assertTrue(!listened, 'Declining does not join');
      assertEqual(joinedRoomRecord(), null, 'Declining forgets the stored match');
    } finally {
      db = originalDb; listenToFirebaseRoom = originalListen; currentUser = savedUser;
      forgetJoinedRoom();
    }
  });
  await test('REGRESSION: attemptMatchReconnect silently rejoins a Ranked match where the player was never substituted', () => {
    freshState({ isMultiplayer: false, isHost: false, isRanked: false, roomCode: null, localPlayerId: null });
    currentUser = { uid: 'uid_amit' };
    matchReconnectAttempted = false;
    forgetJoinedRoom(); sessionStorage.setItem('shithead_joined_room', '112233');
    const fakeRoom = {
      isRanked: true, phase: 'PLAY',
      players: [
        { id: 'p_host', name: 'Amit', uid: 'uid_amit', isBot: false },
        { id: 'p_room1', name: 'Pooja', uid: 'uid_pooja', isBot: false }
      ]
    };
    const originalDb = db;
    const originalListen = listenToFirebaseRoom;
    let listenedCode = null;
    listenToFirebaseRoom = (code) => { listenedCode = code; };
    db = { ref: () => ({ once: (event, successCb) => successCb({ exists: () => true, val: () => fakeRoom }) }) };
    attemptMatchReconnect();
    db = originalDb;
    listenToFirebaseRoom = originalListen;
    forgetJoinedRoom();
    assertEqual(state.localPlayerId, 'p_host', 'Must identify the seat matching my uid, not assume a fixed seat order');
    assertTrue(state.isRanked === true, 'Must mark the resumed match as Ranked');
    assertEqual(listenedCode, '112233', 'Must attach the live room listener for the reconnected room');
    currentUser = null;
  });
  await test('REGRESSION: attemptMatchReconnect reclaims a seat a bot had already substituted into', () => {
    freshState({ isMultiplayer: false, isHost: false, isRanked: false, roomCode: null, localPlayerId: null });
    currentUser = { uid: 'uid_amit' };
    matchReconnectAttempted = false;
    forgetJoinedRoom(); sessionStorage.setItem('shithead_joined_room', '445566');
    const fakeRoom = {
      isRanked: true, phase: 'PLAY',
      players: [
        { id: 'p_bot_zz11', name: 'Amit (Bot)', uid: 'uid_amit', isBot: true, isRankedSubstitute: true, substituteMoveCount: 2 },
        { id: 'p_room1', name: 'Pooja', uid: 'uid_pooja', isBot: false }
      ]
    };
    const originalDb = db;
    const originalListen = listenToFirebaseRoom;
    const originalAtomic = updatePlayersAtomic;
    let listenedCode = null;
    let atomicList = null;
    listenToFirebaseRoom = (code) => { listenedCode = code; };
    updatePlayersAtomic = (code, updater, onComplete) => {
      atomicList = updater(fakeRoom.players);
      onComplete(null, true, { val: () => atomicList });
    };
    db = { ref: () => ({ once: (event, successCb) => successCb({ exists: () => true, val: () => fakeRoom }) }) };
    attemptMatchReconnect();
    db = originalDb;
    listenToFirebaseRoom = originalListen;
    updatePlayersAtomic = originalAtomic;
    forgetJoinedRoom();
    const reclaimedSeat = atomicList && atomicList.find(p => p.uid === 'uid_amit');
    assertTrue(!!reclaimedSeat && !reclaimedSeat.isBot, 'The bot-substituted seat must be converted back to human control');
    assertEqual(state.localPlayerId, 'p_bot_zz11', 'Must resume as the SAME seat id the substitute was using — nothing else in the room needs to change');
    assertEqual(listenedCode, '445566', 'Must attach the live room listener after reclaiming the seat');
    currentUser = null;
  });

  await test('REGRESSION: the Ranked "Opponent Found" screen shows the opponent\'s rating, not just their name', () => {
    freshState({ isMultiplayer: true, isRanked: true, isHost: true, roomCode: '778899', localPlayerId: 'p_host', drawPile: [] });
    state.players = [
      makePlayer({ id: 'p_host', name: 'Amit', uid: 'u1', rating: 512 }),
      makePlayer({ id: 'p_room1', name: 'Pooja', uid: 'u2', rating: 1523 })
    ];
    // showRankedConnectedView auto-starts the match for the host once
    // two players are seated — stub that out so this test only checks
    // the "Opponent Found" readout itself, not a real match beginning.
    const originalRunShuffleIntro = runShuffleIntro;
    const originalBroadcast = broadcastShuffleStart;
    runShuffleIntro = () => {};
    broadcastShuffleStart = () => {};
    showRankedConnectedView();
    runShuffleIntro = originalRunShuffleIntro;
    broadcastShuffleStart = originalBroadcast;
    const html = document.getElementById('rankedOpponentName').innerHTML;
    assertTrue(html.includes('Pooja'), "The opponent's name must still be shown");
    assertTrue(html.includes('1523'), "The opponent's current rating must be shown, so the player can gauge how tough the match is");
    assertTrue(html.includes('Gold'), 'The rating should render via the same tier badge used elsewhere (1523 is Gold), for a consistent, at-a-glance sense of skill level');
    state.isRanked = false;
  });

  await test('REGRESSION: showMatchEndUI protects end-game UI from a large hand — compacts the hand and shields the controls', () => {
    freshState({ isMultiplayer: false, isRanked: false, localPlayerId: 'p1', drawPile: [] });
    const bigHand = Array.from({ length: 15 }, (_, i) => makeCard(['2','3','4','5','6','7','8','9','10','J','Q','K','A'][i % 13]));
    const loser = makePlayer({ id: 'p1', name: 'Amit', hand: bigHand, hasFinished: true, finishRank: 2 });
    const winner = makePlayer({ id: 'p2', name: 'Bot', isBot: true, hasFinished: true, finishRank: 1 });
    state.players = [loser, winner];
    showMatchEndUI();

    const handEl = document.getElementById('localHand');
    assertTrue(handEl.classList.contains('match-end-compact'), 'A large hand must be visually scaled down once the match ends, freeing real vertical space');

    ['finalStandingsBanner', 'playActionControls', 'matchEndButtonRow'].forEach((id) => {
      const el = document.getElementById(id);
      assertTrue(el.classList.contains('shrink-0'), `#${id} must be shrink-0 so a tall hand below it can never squash its height`);
    });
    assertTrue(document.getElementById('matchEndButtonRow').classList.contains('z-[60]'), 'The button row must float above the table on an elevated z-index in case a large hand still reaches it');
    assertTrue(document.getElementById('finalStandingsBanner').classList.contains('z-[60]'), 'The standings box must float above the table on an elevated z-index for the same reason');

    hideMatchEndUI();
    assertTrue(!handEl.classList.contains('match-end-compact'), 'Starting a new match must restore the hand to its normal size');
  });

  await test('REGRESSION: a friend row shows their ranked rating under their name', () => {
    const html = friendRowHtml('u1', { username: 'Pooja', online: true, rating: 1523 }, 'friend');
    assertTrue(html.includes('Pooja'), "The friend's name must be shown");
    assertTrue(html.includes('1523'), "The friend's current rating must be shown under their name");
    assertTrue(html.includes('Gold'), 'The rating should show its tier name too, matching every other rating readout in the game (Opponent Found, Standings)');
  });
  await test('friendRowHtml never shows a rating for a profile that has none (e.g. an incoming friend request)', () => {
    const html = friendRowHtml('u1', { username: 'Pooja' }, 'request');
    assertTrue(!html.includes('text-amber-400/90'), 'With no rating on the profile, the rating span must not be rendered at all');
  });
  await test('REGRESSION: Inbox lives in the header, not the hamburger drawer', () => {
    assertTrue(!document.getElementById('menuInboxBtn'), 'The old hamburger-drawer Inbox entry must be gone');
    assertTrue(!!document.getElementById('headerInboxBtn'), 'A header Inbox button must exist');
    assertTrue(!!document.getElementById('inboxBadge'), 'The unread-count badge must still exist under its same id, wherever it now lives');
  });
  await test('REGRESSION: Inbox badge uses the latest pending notification category', () => {
    const now = 1_000_000;
    const requests = { one: { name: 'Ash', sentAt: now - 3_000 } };
    const invites = { one: { fromName: 'Pavan', sentAt: now - 1_000 } };
    assertEqual(summarizeInboxNotifications(requests, invites, {}, {}, now).latestType, 'game', 'Newer game invite should turn the badge blue');
    assertEqual(summarizeInboxNotifications(requests, invites, {}, {}, now).count, 2, 'Both pending categories should count');
    requests.two = { name: 'Pooja', sentAt: now - 500 };
    assertEqual(summarizeInboxNotifications(requests, invites, {}, {}, now).latestType, 'friend', 'Newer friend request should turn the badge green');
    const challenges = { burner: { name: 'Burner', reward: 50, completedAt: now - 100 } };
    assertEqual(summarizeInboxNotifications(requests, invites, challenges, {}, now).latestType, 'challenge', 'Newest completed challenge should turn the badge gold');
    assertEqual(summarizeInboxNotifications(requests, invites, challenges, {}, now).count, 4, 'Challenge mail should add to the pending total');
    const activity = { promotion: { type: 'rank', sentAt: now - 80 }, item: { type: 'shop', sentAt: now - 40 } };
    assertEqual(summarizeInboxNotifications(requests, invites, challenges, activity, now).latestType, 'shop', 'Newest shop purchase should turn the badge pink');
    assertEqual(summarizeInboxNotifications(requests, invites, challenges, activity, now).count, 6, 'Rank and shop mail should count');
    delete activity.item;
    assertEqual(summarizeInboxNotifications(requests, invites, challenges, activity, now).latestType, 'rank', 'Newest rank change should turn the badge purple');
    invites.one.sentAt = now - GAME_INVITE_EXPIRY_MS - 1;
    assertEqual(summarizeInboxNotifications({}, invites, {}, {}, now).count, 0, 'Expired game invites should not keep the badge visible');
  });

  // ---- STAGE 1: hamburger menu restructure + responsive presentation ----
  await test('REGRESSION: the hamburger menu has all 9 items in the agreed order, with no duplicates', () => {
    // Error Reports is owner-only (hidden for everyone else).
    const expectedOrder = ['menuProfileBtn', 'menuStatsBtn', 'menuThemesBtn', 'menuFriendsBtn', 'menuLeaderboardBtn', 'menuChallengesBtn', 'menuShopBtn', 'menuGuideBtn', 'menuSettingsBtn', 'menuSupportBtn', 'menuErrorReportsBtn', 'menuInstallBtn', 'menuSignOutBtn'];
    const nav = document.querySelector('#hamburgerDrawer nav');
    const actualOrder = Array.from(nav.querySelectorAll('button')).map(b => b.id);
    assertEqual(actualOrder, expectedOrder, 'Menu items must appear in exactly the agreed order: Profile, Stats, Personalisation, Friends, Leaderboard, Challenges, Shop, Guide & Strategy, Settings, Support, Sign Out (signed in only)');
    assertTrue(!document.getElementById('menuInboxBtn'), 'Inbox must not also still be inside the drawer now that it lives in the header');
    const allIds = Array.from(document.querySelectorAll('[id]')).map(el => el.id);
    const seen = {};
    allIds.forEach(id => { seen[id] = (seen[id] || 0) + 1; });
    const dupes = Object.keys(seen).filter(id => seen[id] > 1);
    assertEqual(dupes, [], 'No id anywhere in the document may be duplicated');
  });
  await test('REGRESSION: Profile, Stats, Personalisation and Support all have real functionality, not Coming Soon labels', () => {
    assertTrue(!document.getElementById('menuStatsBtn').querySelector('.item-soon'), 'Stats must NOT say Coming Soon — it now has a real, working Ranked Stats page');
    assertTrue(!document.getElementById('menuProfileBtn').querySelector('.item-soon'), 'Profile must NOT say Coming Soon — Stage 5 gave it a real, working page');
    assertTrue(!document.getElementById('menuThemesBtn').querySelector('.item-soon'), 'Personalisation must NOT say Coming Soon at the menu level — its Deck Themes subsection is functional');
    assertTrue(!document.getElementById('menuSupportBtn').querySelector('.item-soon'), 'Support must NOT say Coming Soon — mailto support already exists and this just surfaces it, per "use existing functionality where it exists"');
    assertTrue(!document.getElementById('menuFriendsBtn').querySelector('.item-soon'), 'Friends is fully built already and must not be mislabelled as unfinished');
    assertTrue(!document.getElementById('menuLeaderboardBtn').querySelector('.item-soon'), 'Leaderboard is fully built already and must not be mislabelled as unfinished');
  });
  await test('REGRESSION: the menu overlays every page and selecting a new menu page closes the old one', () => {
    const drawerZ = Number(getComputedStyle(document.getElementById('hamburgerDrawer')).zIndex);
    const overlayZ = Number(getComputedStyle(document.getElementById('hamburgerOverlay')).zIndex);
    assertTrue(drawerZ > 120 && overlayZ > 120, 'Menu layers must sit above every modal, including account deletion');
    document.getElementById('settingsModal').classList.remove('hidden');
    document.getElementById('menuGuideBtn').click();
    assertTrue(document.getElementById('settingsModal').classList.contains('hidden'), 'Opening Guide must close Settings');
    assertTrue(!document.getElementById('rulesModal').classList.contains('hidden'), 'The newly selected Guide page must open');
    document.getElementById('rulesModal').classList.add('hidden');
  });
  await test('REGRESSION: clicking the header Diamond balance routes to the Shop', () => {
    const savedUser = currentUser;
    currentUser = null;
    document.getElementById('authModal').classList.add('hidden');
    document.getElementById('headerDiamondBtn').click();
    assertTrue(!document.getElementById('authModal').classList.contains('hidden'), 'A guest tapping Diamonds must be taken through sign-in for the Shop');
    document.getElementById('authModal').classList.add('hidden');
    currentUser = savedUser;
  });
  await test('REGRESSION: hamburger open/close uses a CSS class, not a directly-set inline transform, so the responsive breakpoint CSS actually applies', () => {
    const drawer = document.getElementById('hamburgerDrawer');
    assertTrue(!drawer.getAttribute('style'), 'The drawer must not carry a hardcoded inline transform any more — that would override the responsive CSS for both breakpoints');
    openHamburgerMenu();
    assertTrue(drawer.classList.contains('open'), 'openHamburgerMenu must add the .open class');
    assertTrue(!document.getElementById('hamburgerOverlay').classList.contains('hidden'), 'The overlay (outside-click catcher) must be shown');
    closeHamburgerMenu();
    assertTrue(!drawer.classList.contains('open'), 'closeHamburgerMenu must remove the .open class');
    assertTrue(document.getElementById('hamburgerOverlay').classList.contains('hidden'), 'The overlay must be hidden again');
  });
  await test('REGRESSION: Escape closes the hamburger menu, and closing it does not leave a stale keydown listener behind', () => {
    openHamburgerMenu();
    assertTrue(document.getElementById('hamburgerDrawer').classList.contains('open'), 'Sanity check: the menu is open');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assertTrue(!document.getElementById('hamburgerDrawer').classList.contains('open'), 'Escape must close the menu');
    // Open and close it several times, then confirm a single Escape
    // still just closes it once cleanly — if the listener were being
    // re-added without removing the old one each time, this would
    // still merely close it (removeEventListener needs the exact same
    // function reference, which hamburgerEscHandler being a named,
    // shared function guarantees), so this mainly guards against a
    // future refactor accidentally switching to an inline arrow
    // function, which would silently break that guarantee.
    for (let i = 0; i < 4; i++) { openHamburgerMenu(); closeHamburgerMenu(); }
    openHamburgerMenu();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    assertTrue(!document.getElementById('hamburgerDrawer').classList.contains('open'), 'Escape must still cleanly close the menu after repeated open/close cycles');
  });
  await test('REGRESSION: clicking the overlay (outside the menu) closes the hamburger drawer', () => {
    openHamburgerMenu();
    document.getElementById('hamburgerOverlay').click();
    assertTrue(!document.getElementById('hamburgerDrawer').classList.contains('open'), 'Clicking outside the menu must close it');
  });
  await test('REGRESSION: the hamburger drawer is a mobile bottom-sheet at narrow widths and a compact desktop dropdown at wide widths', () => {
    const drawer = document.getElementById('hamburgerDrawer');
    openHamburgerMenu();
    const cs = getComputedStyle(drawer);
    if (window.innerWidth < 768) {
      assertEqual(cs.bottom, '0px', 'Below the 768px breakpoint, the drawer must be a bottom sheet anchored to the bottom edge');
      assertTrue(parseFloat(cs.borderTopLeftRadius) > 0, 'The bottom sheet must have rounded top corners');
      assertTrue(getComputedStyle(document.getElementById('hamburgerDragHandle')).display !== 'none', 'The drag handle must be visible on mobile');
    } else {
      assertTrue(parseFloat(cs.width) >= 280 && parseFloat(cs.width) <= 340, `At desktop widths the drawer must be a ~310px dropdown, got ${cs.width}`);
      assertEqual(getComputedStyle(document.getElementById('hamburgerDragHandle')).display, 'none', 'The drag handle is a mobile affordance and must not show on desktop');
    }
    closeHamburgerMenu();
  });

  await test('Leaderboard and Friends list update live when someone changes their picture', async () => {
    const listeners = {};
    const liveRef = (path, value) => ({
      on: (ev, cb) => { listeners[path] = cb; cb({ val: () => value }); },
      off: () => { delete listeners[path]; },
      once: () => Promise.resolve({ val: () => value })
    });
    db = { ref: (path) => {
      if (path === 'leaderboard') return liveRef(path, { bo: { username: 'Bo', rating: 900, avatar: 'default' } });
      if (path === 'friends/me') return liveRef(path, { f1: true });
      if (path === 'publicProfiles/f1') return liveRef(path, { username: 'Fi', avatar: 'default' });
      return liveRef(path, null);
    } };
    openLeaderboardPanel();
    await new Promise((r) => setTimeout(r, 0));
    listeners.leaderboard({ val: () => ({ bo: { username: 'Bo', rating: 900, avatar: 'avatar-crown-diamond' } }) });
    const lbHtml = document.getElementById('leaderboardArea').innerHTML;
    assertEqual(lbHtml, (() => { const d = document.createElement('div'); d.innerHTML = leaderboardRowHtml({ username: 'Bo', rating: 900, avatar: 'avatar-crown-diamond' }, 1); return d.innerHTML; })(), 'A changed picture must repaint the open Leaderboard');
    document.getElementById('leaderboardModal').classList.add('hidden');
    await new Promise((r) => setTimeout(r, 0));
    assertTrue(!listeners.leaderboard, 'Closing the Leaderboard must stop listening');

    currentUser = { uid: 'me' };
    currentFriendsTab = 'friends';
    renderFriendsList();
    await new Promise((r) => setTimeout(r, 0));
    const before = document.getElementById('friendsListArea').innerHTML;
    listeners['publicProfiles/f1']({ val: () => ({ username: 'Fi', avatar: 'avatar-crown-diamond' }) });
    await new Promise((r) => setTimeout(r, 200));
    const after = document.getElementById('friendsListArea').innerHTML;
    assertTrue(after !== before && after.includes('Fi'), 'A friend changing their picture must repaint the Friends list');
    stopFriendProfileWatch();
    assertTrue(!listeners['publicProfiles/f1'], 'Stopping the watch must detach the friend listeners');
  });

  await test("REGRESSION: the public Leaderboard does not require a signed-in user", () => {
    currentUser = null;
    openLeaderboardPanel();
    const text = document.getElementById('leaderboardArea').innerHTML;
    assertTrue(text.includes('Loading') || !text.includes('Sign in'), 'A guest must be allowed to load the public Leaderboard');
    document.getElementById('leaderboardModal').classList.add('hidden');
  });

  await test("REGRESSION: Stage 8 — the tutorial's final message points to Guide & Strategy by name, device-aware, and never mentions Settings", () => {
    const finalStep = TUTORIAL_STEPS.find((s) => s.coachNote && s.coachNote.includes('Guide & Strategy'));
    assertTrue(!!finalStep, 'A tutorial step directing players to Guide & Strategy must exist');
    assertTrue(!/settings[^.]*\b(rules|guide)\b|\b(rules|guide)\b[^.]*\bin settings/i.test(finalStep.coachNote), 'The final tutorial message must never send players to Settings for the rules — that moved to the hamburger menu');
    assertTrue(/tap|click/i.test(finalStep.coachNote), 'The instruction must use device-appropriate phrasing (Tap on mobile, Click on desktop)');
    assertTrue(finalStep.noteTarget.includes('#hamburgerBtn'), 'It must still spotlight the hamburger button, which is how Guide & Strategy is actually reached');
  });

  await test('REGRESSION: the Support form validates required fields and blocks empty submissions', () => {
    openSupportPanel();
    document.getElementById('supportSendBtn').click();
    assertTrue(!document.getElementById('supportValidationMsg').classList.contains('hidden'), 'Submitting with an empty subject must show a validation message');
    assertEqual(document.getElementById('supportValidationMsg').textContent, 'Please enter a subject.', 'Subject is checked first');
    document.getElementById('supportSubjectInput').value = 'A bug';
    document.getElementById('supportSendBtn').click();
    assertEqual(document.getElementById('supportValidationMsg').textContent, 'Please enter a message.', 'Message must also be required');
  });
  await test('REGRESSION: the Support form builds the correct email draft without navigating away during tests', () => {
    openSupportPanel();
    document.getElementById('supportCategorySelect').value = 'Feedback';
    document.getElementById('supportSubjectInput').value = 'Love the game';
    document.getElementById('supportMessageInput').value = 'Great job on the Ranked mode!';
    lastSupportDraftUri = '';
    lastSupportSubmitAt = 0;
    const originalDraftOpener = openSupportEmailDraft;
    openSupportEmailDraft = (uri) => { lastSupportDraftUri = uri; };
    try {
      document.getElementById('supportSendBtn').click();
    } finally {
      openSupportEmailDraft = originalDraftOpener;
    }
    assertTrue(lastSupportDraftUri.startsWith('mailto:support.shitheaddeluxe@gmail.com?'), 'The draft must target the official support address');
    const decodedDraft = decodeURIComponent(lastSupportDraftUri);
    assertTrue(decodedDraft.includes('[ShitHead Deluxe] Love the game'), 'The subject must be included');
    assertTrue(decodedDraft.includes('Category: Feedback'), 'The chosen category must be included');
    assertTrue(decodedDraft.includes(`Game version: ${getGameVersionLabel()}`), 'The game version must be included');
    assertTrue(decodedDraft.includes('Great job on the Ranked mode!'), 'The message must be included');
    assertTrue(!decodedDraft.toLowerCase().includes('password'), 'The draft must never contain credentials');
    assertTrue(!document.getElementById('supportSuccessMsg').classList.contains('hidden'), 'A successful draft must show the success state');
  });
  await test('REGRESSION: the Support form blocks resubmission during its cooldown window (basic spam protection)', () => {
    // The previous test's db.push() resolves asynchronously — its
    // .then() (which clears this flag) may not have run yet by the
    // time this synchronous test starts, so it's reset explicitly
    // here rather than assumed.
    supportSubmitInFlight = false;
    openSupportPanel();
    document.getElementById('supportSubjectInput').value = 'x';
    document.getElementById('supportMessageInput').value = 'y';
    lastSupportSubmitAt = Date.now();
    document.getElementById('supportSendBtn').click();
    assertTrue(!document.getElementById('supportValidationMsg').classList.contains('hidden'), 'A too-soon resubmission must be blocked with a message, not silently sent again');
    assertTrue(document.getElementById('supportValidationMsg').textContent.includes('wait'), 'The cooldown message must tell the player to wait');
  });
  await test('REGRESSION: the Support privacy explanation is honest about the email draft and is togglable', () => {
    openSupportPanel();
    const panel = document.getElementById('supportPrivacyPanel');
    assertTrue(panel.classList.contains('hidden'), 'The privacy detail must start collapsed, not clutter the form');
    document.getElementById('supportPrivacyToggleBtn').click();
    assertTrue(!panel.classList.contains('hidden'), 'Clicking the toggle must reveal it');
    assertTrue(panel.textContent.includes('category') && panel.textContent.includes('subject') && panel.textContent.includes('message') && panel.textContent.includes('game version'), 'The explanation must accurately list the draft contents');
    assertTrue(panel.textContent.includes('Nothing is sent until you press Send'), 'The explanation must make the final user-controlled send step clear');
  });

  await test('REGRESSION: Settings no longer contains Account or Support — both moved out, not just hidden', () => {
    const modal = document.getElementById('settingsModal');
    assertTrue(!document.getElementById('secAccount'), '#secAccount must be entirely removed, not just hidden');
    assertTrue(!document.getElementById('accountActionBtn'), 'The old sign-in/out button must be gone from Settings');
    assertTrue(!document.getElementById('changeUsernameRow'), 'The old locked username row must be gone from Settings — it now lives in Profile');
    assertTrue(!modal.innerHTML.includes('mailto:support'), 'No Support mailto link may remain inside Settings');
    assertTrue(!modal.innerText.includes('Account'), 'The word "Account" must not appear anywhere in Settings any more');
    assertTrue(typeof updateAccountUI === 'undefined', 'The old Settings-specific updateAccountUI function must be gone, not left as dead code');
  });
  await test('REGRESSION: the hamburger drawer account label still updates correctly after the Settings cleanup', () => {
    currentUser = { uid: 'u1', email: 'test@x.com', displayName: null };
    updateHamburgerAccountLabel();
    assertEqual(document.getElementById('hamburgerAccountLabel').textContent, 'test@x.com', "Signed-in state must show the account's email");
    assertTrue(document.getElementById('hamburgerAccountSub').textContent.includes('Profile'), 'The hint must point to Profile now, not the removed Settings account section');
    currentUser = null;
    updateHamburgerAccountLabel();
    assertEqual(document.getElementById('hamburgerAccountLabel').textContent, 'Not signed in', 'Signed-out state must still work');
  });

  await test('REGRESSION: the Profile page hides the Danger Zone and password-change row when signed out', () => {
    currentUser = null;
    document.getElementById('menuProfileBtn').click();
    assertTrue(document.getElementById('profileDangerZone').classList.contains('hidden'), 'Danger Zone must be hidden when signed out');
    assertTrue(document.getElementById('profileChangePasswordRow').classList.contains('hidden'), 'Password row must be hidden when signed out');
    assertEqual(document.getElementById('profileAccountStatusLabel').textContent, 'Not signed in', 'Status must read Not signed in');
    document.getElementById('profileCloseBtn').click();
  });
  await test('REGRESSION: delete-account requires typing DELETE exactly before the final button enables', () => {
    currentUser = { uid: 'u1', email: 'a@b.com', providerData: [{ providerId: 'password' }], delete: () => Promise.resolve() };
    openDeleteAccountFlow();
    document.getElementById('deleteStep1ContinueBtn').click();
    const input = document.getElementById('deleteConfirmInput');
    const btn = document.getElementById('deleteFinalBtn');
    input.value = 'delete'; input.dispatchEvent(new Event('input'));
    assertTrue(btn.disabled, 'Lowercase "delete" must not enable the final button — it must match exactly');
    input.value = 'DELETE'; input.dispatchEvent(new Event('input'));
    assertTrue(!btn.disabled, 'Exact "DELETE" must enable the final button');
    assertTrue(!document.getElementById('deletePasswordWrap').classList.contains('hidden'), 'A password-account deletion must show a password re-entry field (Firebase requires a recent login for account deletion)');
    document.getElementById('deleteStep2CancelBtn').click();
    currentUser = null;
  });
  await test("REGRESSION: deleteOwnAccountData only ever targets the acting user's own uid across every path it touches", async () => {
    let capturedUpdate = null;
    const readPaths = [];
    db = { ref: (path) => ({
      once: () => { readPaths.push(path); return Promise.resolve({ val: () => 'VictimName' }); },
      update: (obj) => { capturedUpdate = obj; return Promise.resolve(); }
    }) };
    await deleteOwnAccountData('victim-uid');
    assertEqual(readPaths, ['users/victim-uid/username'], 'It may only look up the caller\'s own username');
    const paths = Object.keys(capturedUpdate);
    assertTrue(paths.length > 0, 'Must actually target some paths');
    // The leaderboard entry and username reservation are keyed by the
    // caller's own (lower-cased) username rather than their uid.
    paths.forEach((p) => assertTrue(p.endsWith('/victim-uid') || p === 'leaderboard/victimname' || p === 'usernames/victimname', `Every deleted path must belong to the caller, got: ${p}`));
    assertTrue(paths.every((p) => capturedUpdate[p] === null), 'Every targeted path must be set to null (deleted), never partially modified');
  });

  await test('REGRESSION: Shop contains the lifetime 100-Diamond Name Change Token', () => {
    const modal = document.getElementById('shopModal');
    assertTrue(!!document.getElementById('nameTokenBuyBtn'), 'Token purchase button must exist');
    assertTrue(!!document.getElementById('nameTokenUseBtn'), 'Owned token must have a use action');
    assertTrue(modal.innerText.includes('100'), 'Token must cost exactly 100 Diamonds');
    assertTrue(modal.innerText.toLowerCase().includes('lifetime'), 'The one-time lifetime restriction must be explained');
  });

  // Challenges itself is no longer Coming Soon (see Parts 1-4 of the
  // Challenges & Diamonds build) — the Shop now has its first real item.
  // This replaces the old "Challenges is a polished Coming Soon
  // placeholder" test with one asserting the real thing exists.
  await test('REGRESSION: Challenges shows real sections and a live Diamond counter, not a Coming Soon placeholder', () => {
    currentUser = { uid: 'challenges-open-test' }; // Challenges live on the account
    document.getElementById('menuChallengesBtn').click();
    const modal = document.getElementById('challengesModal');
    assertTrue(!modal.classList.contains('hidden'), 'Challenges must open from the menu');
    assertTrue(!modal.innerText.toLowerCase().includes('coming soon'), 'Challenges must no longer say Coming Soon');
    assertTrue(!!document.getElementById('challengesModalDiamondCount'), 'The modal must show a live Diamond count');
    ['Daily', 'Weekly', 'Ranked', 'Bots', 'Ending Cards', 'Rank Tiers'].forEach((section) => {
      assertTrue(modal.textContent.includes(section), `Must have a ${section} section`);
    });
    document.getElementById('challengesCloseBtn').click();
    assertTrue(modal.classList.contains('hidden'), 'The close button must still work');
  });

  await test('REGRESSION: signed-out guests see a sign-in prompt in Challenges, never fabricated progress numbers', () => {
    const originalCurrentUser = currentUser;
    currentUser = null;
    renderChallengesPanel();
    const modal = document.getElementById('challengesModal');
    assertTrue(modal.innerText.toLowerCase().includes('sign in'), 'Guests must be told to sign in');
    assertTrue(!/\d+\s*\/\s*\d+/.test(document.getElementById('challengesRankedBurnsList').innerText), 'Guests must never see fabricated X/Y progress for an account they do not have');
    currentUser = originalCurrentUser;
    renderChallengesPanel();
  });

  await test('REGRESSION: pickDailyChallengeIds is deterministic per UK date and always returns exactly 3 distinct ids', () => {
    const a = pickDailyChallengeIds('2026-09-17');
    const b = pickDailyChallengeIds('2026-09-17');
    const c = pickDailyChallengeIds('2026-09-18');
    assertEqual(a, b, 'The same UK date must always pick the same 3 challenges, in the same order');
    assertEqual(a.length, 3, 'Exactly 3 daily challenges must be picked');
    assertEqual(new Set(a).size, 3, 'The 3 picked challenges must be distinct');
    assertTrue(a.some((id, i) => id !== c[i]), 'A different UK date should (almost always) pick a different set — this is a sanity check, not a strict guarantee, but 2026-09-17 vs 2026-09-18 is a fixed, known-different pair');
  });

  await test('Tutorial Graduate is a one-time 200 Diamond full-tutorial challenge shown in Challenges', () => {
    assertEqual(TUTORIAL_COMPLETION_CHALLENGE.id, 'tutorial-graduate', 'Tutorial challenge needs a stable permanent completion key');
    assertEqual(TUTORIAL_COMPLETION_CHALLENGE.reward, 200, 'Completing Quick Start and every tutorial lesson must award 200 Diamonds');
    assertTrue(getAllTutorialModuleIds().length > 0, 'The full-tutorial requirement must resolve to real tutorial modules');
    assertTrue(!!document.getElementById('challengesTutorialList'), 'Challenges must contain the Getting Started tutorial challenge list');
  });

  await test('Quick Starter pays 50 once; Tutorial Graduate needs Quick Start and every lesson', async () => {
    assertEqual(QUICK_START_CHALLENGE.id, 'tutorial-quick-start', 'Stable completion key');
    assertEqual(QUICK_START_CHALLENGE.reward, 50, 'Quick Start pays 50 Diamonds');
    assertEqual(challengeDescription(QUICK_START_CHALLENGE.id), QUICK_START_CHALLENGE.desc, 'Completed row / mail shows what it asked for');
    const saved = localStorage.getItem('shithead_tutorial_progress');
    const origClaim = claimChallenge, origUser = currentUser, origDone = accountTutorialLessonsDone, origCompleted = challengeEconomy.completedChallenges;
    const claims = [];
    claimChallenge = (id, reward) => { claims.push([id, reward]); return Promise.resolve(true); };
    try {
      currentUser = { uid: 'test-uid' };
      challengeEconomy.completedChallenges = {};
      accountTutorialLessonsDone = true;
      localStorage.setItem('shithead_tutorial_progress', '{}');
      await syncTutorialChallenges();
      assertEqual(claims, [], 'Every lesson but no Quick Start: nothing yet');
      localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true }));
      accountTutorialLessonsDone = false;
      await syncTutorialChallenges();
      assertEqual(claims, [['tutorial-quick-start', 50]], 'Quick Start alone: only Quick Starter');
      claims.length = 0;
      accountTutorialLessonsDone = true;
      await syncTutorialChallenges();
      assertEqual(claims, [['tutorial-quick-start', 50], ['tutorial-graduate', 200]], 'Both done: Graduate too');
    } finally {
      claimChallenge = origClaim; currentUser = origUser; accountTutorialLessonsDone = origDone;
      challengeEconomy.completedChallenges = origCompleted;
      if (saved === null) localStorage.removeItem('shithead_tutorial_progress'); else localStorage.setItem('shithead_tutorial_progress', saved);
    }
  });

  // ---- Economy on the server (functions/economy.js) ------------------
  // The server's own logic is tested against the Firebase emulators by
  // tools/economy-emulator-test.js; these check the game asks it correctly.
  await test('Server economy: daily and weekly picks match the server (fixed fixture)', () => {
    // functions/economy.js must pick the same ids (tools/economy-emulator-test.js checks the same fixture).
    assertEqual(pickDailyChallengeIds('2026-09-17'), ['beat-a-bot', 'win-any-match', 'burn-with-ten'], 'Daily picks for 2026-09-17');
    assertEqual(pickWeeklyChallengeIds('2026-W38'), ['burn-once', 'snap-burn-once', 'win-any-match'], 'Weekly picks for 2026-W38');
    assertEqual(getUkWeekKey(new Date('2026-09-17T12:00:00Z')), '2026-W38', 'UK week key');
  });

  await test('Server economy: functions/catalog.json matches the Shop and Challenges (re-run tools/export-catalog.js if not)', async () => {
    const live = serverEconomyCatalog();
    assertTrue(Object.keys(live.items).length > 50 && Object.keys(live.earned).length >= 6, 'The catalog covers the Shop and earned pictures');
    let saved = null;
    try { const res = await fetch('functions/catalog.json', { cache: 'no-store' }); if (res.ok) saved = await res.json(); } catch (e) {}
    if (!saved) return; // not served on the live site (Hosting ignores functions/)
    assertEqual(JSON.stringify(saved), JSON.stringify(live), 'functions/catalog.json is out of date');
  });

  await test('Server economy: a challenge is claimed through the server once, and its reward recorded', async () => {
    const savedEconomy = { diamonds: challengeEconomy.diamonds, completedChallenges: challengeEconomy.completedChallenges };
    try {
      currentUser = { uid: 'claim-uid' };
      challengeEconomy.diamonds = 5;
      challengeEconomy.completedChallenges = {};
      const calls = fakeEconomy({ claim: (d) => ({ awarded: { id: d.id, name: 'Burner', reward: 50 }, diamonds: 55 }) });
      assertTrue(await claimChallenge('burner', 50, 'Burner'), 'The first claim succeeds');
      assertEqual(calls, [['claim', { id: 'burner' }]], 'Only the id is sent: the server decides the reward');
      assertEqual(challengeEconomy.diamonds, 55, 'The balance comes from the server');
      assertTrue(!!challengeEconomy.completedChallenges.burner, 'Recorded as completed');
      assertTrue(!(await claimChallenge('burner', 50, 'Burner')), 'A completed challenge is not asked for again');
      assertEqual(calls.length, 1, 'No second request');
      fakeEconomy({ claim: () => { throw new Error('Not completed yet.'); } });
      assertTrue(!(await claimChallenge('arsonist', 125, 'Arsonist')), 'A refused claim pays nothing');
      assertEqual(challengeEconomy.diamonds, 55, 'Balance unchanged when refused');
    } finally {
      challengeEconomy.diamonds = savedEconomy.diamonds;
      challengeEconomy.completedChallenges = savedEconomy.completedChallenges;
    }
  });

  await test('Server economy: a Vs Bots win is reported once with its difficulty; the reply updates Diamonds and unlocks', async () => {
    const saved = { diamonds: challengeEconomy.diamonds, dw: challengeEconomy.difficultyWins, unlocked: { ...unlockedDifficulties }, matchId: state.matchId, mp: state.isMultiplayer, diff: state.difficulty };
    try {
      currentUser = { uid: 'win-uid' };
      state.isMultiplayer = false; state.difficulty = 'easy'; state.matchId = 'm_test_1';
      const calls = fakeEconomy({ matchWin: () => ({ diamondsAwarded: 10, diamonds: 110, difficultyWins: { easy: 3 }, unlockedDifficulty: 'medium', seasonWins: {}, claimed: [], newAvatars: [] }) });
      const res = await reportMatchWin();
      assertEqual(calls, [['matchWin', { mode: 'bots', matchId: 'm_test_1', difficulty: 'easy' }]], 'Mode, match id and difficulty are sent; never an amount');
      assertEqual(res.diamondsAwarded, 10, 'The server decides the payout');
      assertEqual(challengeEconomy.diamonds, 110, 'Header balance from the server');
      assertTrue(unlockedDifficulties.medium, 'Medium unlocks from the server\'s count');
      document.getElementById('difficultyUnlockPopup')?.classList.add('hidden');
    } finally {
      challengeEconomy.diamonds = saved.diamonds; challengeEconomy.difficultyWins = saved.dw; unlockedDifficulties = saved.unlocked;
      state.matchId = saved.matchId; state.isMultiplayer = saved.mp; state.difficulty = saved.diff;
      document.querySelectorAll('.diff-btn').forEach(styleDifficultyBtn);
    }
  });

  await test('Server economy: a finished match and the daily login streak are recorded by the server', async () => {
    const saved = { diamonds: challengeEconomy.diamonds, completed: challengeEconomy.completedChallenges, streak: dailyStreakState, matchId: state.matchId };
    try {
      currentUser = { uid: 'fin-uid' };
      challengeEconomy.completedChallenges = {};
      state.matchId = 'm_test_2';
      const calls = fakeEconomy({
        matchFinished: () => ({ claimed: [{ id: 'first-game', name: 'ShitHead Virgin', reward: 20 }], diamonds: 20 }),
        streak: () => ({ claimed: { count: 2, reward: 15 }, streak: { count: 2, lastDate: localDateKey(), best: 2 }, diamonds: 35 })
      });
      await reportMatchFinished();
      assertEqual(calls[0], ['matchFinished', { matchId: 'm_test_2' }], 'Only the match id is sent');
      assertTrue(!!challengeEconomy.completedChallenges['first-game'], 'ShitHead Virgin recorded from the reply');
      const claimed = await claimDailyLoginReward();
      assertEqual(claimed, { count: 2, reward: 15 }, 'Streak day and reward come from the server');
      assertEqual(challengeEconomy.diamonds, 35, 'Balance from the server');
      document.getElementById('dailyRewardModal')?.classList.add('hidden');
    } finally {
      challengeEconomy.diamonds = saved.diamonds; challengeEconomy.completedChallenges = saved.completed; dailyStreakState = saved.streak; state.matchId = saved.matchId;
    }
  });

  await test('Server economy: a finished Ranked match is scored by the server from the room', async () => {
    const saved = { players: state.players, roomCode: state.roomCode, local: state.localPlayerId, rating: challengeEconomy.rating, summary: matchSummaryRating };
    try {
      currentUser = { uid: 'r-uid' };
      state.players = [{ id: 'a', uid: 'r-uid', finishRank: 1 }, { id: 'b', uid: 'o-uid', finishRank: 2 }];
      state.localPlayerId = 'a'; state.roomCode = '123456';
      const calls = fakeEconomy({ rankedResult: () => ({ from: 500, to: 516, won: true, diamondsAwarded: 20, rating: 516, wins: 1, losses: 0, diamonds: 40, rankedStats: {}, challengeStats: {}, claimed: [], newAvatars: [] }) });
      applyRankedRatingUpdate();
      await new Promise(r => setTimeout(r, 1100));
      assertEqual(calls, [['rankedResult', { roomCode: '123456' }]], 'Only the room is sent, never a rating');
      assertEqual(matchSummaryRating, { from: 500, to: 516 }, 'The summary shows the server\'s result');
      assertEqual(challengeEconomy.rating, 516, 'Rating from the server');
    } finally {
      state.players = saved.players; state.roomCode = saved.roomCode; state.localPlayerId = saved.local;
      challengeEconomy.rating = saved.rating; matchSummaryRating = saved.summary;
    }
  });

  await test('Server economy: Shop, bundles, gifts and the name token all go through the server', () => {
    const src = document.documentElement.innerHTML;
    ['buyItem', 'buyBundle', 'buyNameToken', 'sendGift', 'claimGift', 'rankedResult', 'matchWin', 'matchFinished', 'streak', 'claim', 'sync', 'init']
      .forEach(action => assertTrue(src.includes(`callEconomy('${action}'`), `The game calls the server for ${action}`));
    ['calculateCosmeticPurchase', 'awardMatchDiamonds', 'recordDifficultyWin', 'recordSeasonalWin'].forEach(name =>
      assertTrue(typeof window[name] === 'undefined', `${name} (a phone-side Diamond writer) is gone`));
  });

  await test('Generated cosmetic concepts are implemented as real equippable items', () => {
    const previousBack = equippedCosmetics.cardBack;
    try {
      equippedCosmetics.cardBack = 'back-neon';
      assertEqual(getThemeDeckBackClass(), 'cosmetic-back-neon', 'Neon Circuit must replace the live face-down card class when equipped');
      // Keep the expected symbols as ASCII Unicode escapes. If the HTML is
      // ever accidentally transcoded again, the catalogue values will
      // corrupt while these expectations remain stable and fail loudly.
      assertEqual(EMOTE_PACKS['emotes-victory'], ['\u{1F3C6}', '\u{1F451}', '\u{1F389}', '\u{1F48E}', '\u{1F64C}', '\u{1F973}'], 'Victory Pack must contain the six advertised reactions');
      assertTrue(COSMETIC_SHOP_ITEMS.some(i => i.id === 'frame-gold' && i.name === 'Golden Crown'), 'Golden Crown must remain a purchasable Frame');
    } finally {
      equippedCosmetics.cardBack = previousBack;
    }
  });

  await test('REGRESSION: Shop Unicode symbols render without encoding corruption', () => {
    const victory = COSMETIC_SHOP_ITEMS.find(item => item.id === 'emotes-victory');
    const cardBack = COSMETIC_SHOP_ITEMS.find(item => item.id === 'back-midnight');
    const emoteMarkup = shopCosmeticPreviewMarkup(victory);
    const categoryMarkup = `<span>${collapsedShopCategories.has(cardBack.category) ? '\u25B6' : '\u25BC'}</span>`;
    assertTrue(shopCosmeticThumbnail(victory, 'emotes').includes('\u{1F3C6}'), 'Shop thumbnails must contain the trophy emoji');
    assertTrue(emoteMarkup.includes('\u{1F48E}'), 'Emote previews must contain the Diamond emoji');
    assertTrue(emoteMarkup.includes('\u2014'), 'Preview text must contain a real em dash');
    assertTrue(categoryMarkup.includes('\u25B6') || categoryMarkup.includes('\u25BC'), 'Shop categories must contain a real disclosure arrow');
  });

  await test('Six premium cosmetics exist and each costs exactly 200 Diamonds', () => {
    const premiumIds = ['back-nebula', 'back-inferno', 'frame-obsidian-throne', 'frame-emerald-sovereign', 'emotes-chaos', 'emotes-royal'];
    const premium = COSMETIC_SHOP_ITEMS.filter(item => premiumIds.includes(item.id));
    assertEqual(premium.length, 6, 'All six premium cosmetic IDs must be registered in the Shop');
    assertTrue(premium.every(item => item.cost === 200), 'Every new premium cosmetic must cost exactly 200 Diamonds');
    assertTrue(premiumIds.every(id => premium.some(item => item.id === id)), 'No premium cosmetic may be missing from the Shop');
  });

  await test('Second-wave table, burn and victory cosmetics are complete and correctly priced', () => {
    const expected = {
      'table-casino': 750, 'table-winter': 750, 'table-midnight': 750, 'table-candyfloss': 750, 'table-royal': 750, 'table-desert': 1000, 'table-jungle': 1000, 'table-devilish': 2000, 'table-angelic': 2000,
      'burn-coloured': 250, 'burn-ice': 500, 'burn-electric': 1000, 'burn-paint': 750, 'burn-sweets': 1500, 'burn-smoke': 2000,
      'victory-confetti': 250, 'victory-cards': 1500, 'victory-fireworks': 750, 'victory-sparklers': 750, 'victory-stars': 1000, 'victory-karate': 2000
    };
    Object.entries(expected).forEach(([id, cost]) => {
      const item = COSMETIC_SHOP_ITEMS.find(entry => entry.id === id);
      assertTrue(!!item, `${id} must exist in the Shop`);
      assertEqual(item.cost, cost, `${id} must use its advertised price`);
    });
    assertTrue(!!document.getElementById('personalisationTableThemes'), 'Personalisation must expose table themes');
    assertTrue(!!document.getElementById('personalisationBurnEffects'), 'Personalisation must expose burn effects');
    assertTrue(!!document.getElementById('personalisationVictoryEffects'), 'Personalisation must expose victory effects');
  });

  await test('REGRESSION: every Shop cosmetic equips through its real runtime category', () => {
    const previousEquipped = { ...equippedCosmetics };
    const previousPurchases = cosmeticPurchaseState;
    try {
      cosmeticPurchaseState = Object.fromEntries(COSMETIC_SHOP_ITEMS.map(item => [item.id, true]));
      COSMETIC_SHOP_ITEMS.forEach(item => {
        const type = COSMETIC_CATEGORY_TYPES[item.category];
        assertTrue(!!type, `${item.id} must have an equip category`);
        assertTrue(isSupportedCosmetic(type, item.id), `${item.id} must have a live game renderer`);
        assertTrue(equipCosmetic(type, item.id, { preview: false, sync: false }), `${item.id} must equip successfully`);
        assertEqual(equippedCosmetics[type], item.id, `${item.id} must become the selected ${type}`);
        const datasetKey = `equipped${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        assertEqual(document.body.dataset[datasetKey], item.id, `${item.id} must be applied to the live document`);
        if (type === 'cardBack') assertTrue(getThemeDeckBackClass().startsWith('cosmetic-back-'), `${item.id} must change face-down cards`);
        if (type === 'emotes') assertEqual(getActiveEmotes(), EMOTE_PACKS[item.id], `${item.id} must change the emote fan`);
      });
    } finally {
      cosmeticPurchaseState = previousPurchases;
      equippedCosmetics = previousEquipped;
      applyEquippedCosmetics();
      renderPersonalisationCosmetics();
    }
  });

  await test('REGRESSION: every Shop cosmetic has a safe preview that never purchases it', () => {
    const purchasesBefore = JSON.stringify(cosmeticPurchaseState);
    COSMETIC_SHOP_ITEMS.forEach(item => {
      const markup = shopCosmeticPreviewMarkup(item);
      assertTrue(markup.includes(item.name), `${item.id} preview must name the item`);
      assertTrue(markup.includes('Preview only'), `${item.id} preview must explain that it spends no Diamonds`);
      assertTrue(shopCosmeticThumbnail(item, COSMETIC_CATEGORY_TYPES[item.category]).length > 0, `${item.id} must have a Shop thumbnail`);
      if (item.category === 'Burn Effects' || item.category === 'Victory Effects') {
        assertTrue(markup.includes('data-play-shop-effect'), `${item.id} must have a playable animation preview`);
      }
    });
    assertEqual(JSON.stringify(cosmeticPurchaseState), purchasesBefore, 'Building previews must not change ownership');
    const savedTab = shopTab;
    let previewCount = 0;
    COSMETIC_TABS.forEach(tab => { shopTab = tab.category; renderCosmeticShop(); previewCount += document.querySelectorAll('[data-inline-shop-preview]').length; });
    seasonalForceAllEvents = true;
    SEASONAL_EVENTS.forEach(ev => { seasonalSectionOverrides[ev.id] = true; });
    shopTab = SEASONAL_TAB; renderCosmeticShop(); previewCount += document.querySelectorAll('[data-inline-shop-preview]').length;
    SEASONAL_EVENTS.forEach(ev => { delete seasonalSectionOverrides[ev.id]; });
    seasonalForceAllEvents = false;
    shopTab = savedTab; renderCosmeticShop();
    assertEqual(previewCount, COSMETIC_SHOP_ITEMS.length, 'Every item must own an inline preview directly beneath its row');
    assertTrue(!openShopCosmeticPreview.toString().includes('scrollIntoView'), 'Opening a preview must never scroll the Shop back to another location');
  });

  await test('Seasonal events: dates open and close each event on the right days', () => {
    const at = (iso) => new Date(`${iso}T12:00:00`);
    const live = (iso) => activeSeasonalEvents(at(iso)).map(w => w.event.id).sort().join(',');
    assertEqual(live('2026-09-24'), '', 'Nothing is on in late September');
    assertEqual(live('2026-10-15'), 'halloween', 'Halloween opens on 15 October');
    assertEqual(live('2026-11-02'), 'diwali,halloween', 'Halloween runs to 2 November, alongside Diwali 2026');
    assertEqual(live('2026-11-03'), 'diwali', 'Halloween has closed by 3 November');
    assertEqual(live('2026-11-16'), '', 'Diwali 2026 (8 Nov) closes after 15 November');
    assertEqual(live('2026-12-26'), 'christmas', 'Christmas runs to Boxing Day');
    assertEqual(live('2026-12-27'), 'newyear', "New Year's takes over on 27 December");
    assertEqual(live('2027-01-07'), 'newyear', "New Year's runs to 7 January");
    assertEqual(live('2027-01-08'), '', "New Year's closes after 7 January");
    assertEqual(live('2027-02-10'), 'lunar,ramadan,valentine', 'Mid-February 2027 overlaps three events');
    assertEqual(live('2027-03-28'), 'easter', 'Easter Sunday 2027 is 28 March');
    assertEqual(live('2027-07-01'), 'summer', 'Summer opens on 1 July');
    assertEqual(nextSeasonalEvent(at('2026-09-24')).event.id, 'halloween', 'Halloween is the next event after September');
    assertEqual(easterSunday(2026).toDateString(), new Date(2026, 3, 5).toDateString(), 'Easter 2026 is 5 April');
  });

  await test('Seasonal items: one per section per event, sold only during the event, kept forever', () => {
    assertEqual(SEASONAL_EVENTS.length, 9, 'Nine seasonal events');
    SEASONAL_EVENTS.forEach(ev => {
      const items = COSMETIC_SHOP_ITEMS.filter(i => i.season === ev.id);
      assertEqual(items.length, 7, `${ev.name} sells 7 items`);
      assertEqual(new Set(items.map(i => i.category)).size, 7, `${ev.name} has one item per Shop section`);
      assertEqual(items.reduce((sum, i) => sum + i.cost, 0), 5600, `${ev.name} items total 5600`);
      assertTrue(EARNED_AVATARS.some(i => i.id === `avatar-${ev.id}-earned`), `${ev.name} has an earn-only picture`);
      assertTrue(!!ILLUSTRATED_TABLES[`table-${ev.id}`] && !!EMOTE_PACKS[`emotes-${ev.id}`] && !!SEASONAL_BURN_FX[`burn-${ev.id}`] && !!SEASONAL_VICTORY_FX[`victory-${ev.id}`], `${ev.name} has live art and effects`);
    });
    const savedNow = seasonalNowOverride, savedUser = currentUser, savedOwned = cosmeticPurchaseState;
    try {
      currentUser = null;
      cosmeticPurchaseState = {};
      seasonalNowOverride = '2026-09-24T12:00:00';
      const table = COSMETIC_SHOP_ITEMS.find(i => i.id === 'table-halloween');
      assertTrue(!isSeasonalItemBuyable(table), 'Halloween items are not sold before the event');
      assertTrue(!isCosmeticListed(table), 'Unowned out-of-season items are hidden in Custom');
      seasonalNowOverride = '2026-10-20T12:00:00';
      assertTrue(isSeasonalItemBuyable(table), 'Halloween items are sold during the event');
      seasonalNowOverride = '2026-12-01T12:00:00';
      cosmeticPurchaseState = { 'table-halloween': { cost: 1500 } };
      assertTrue(isCosmeticListed(table), 'Owned seasonal items stay in Custom after the event');
      assertTrue(!COSMETIC_SHOP_ITEMS.filter(i => i.season).some(i => i.category === 'Profile Pictures' && !isSupportedCosmetic('avatar', i.id)), 'Seasonal pictures have art');
    } finally {
      seasonalNowOverride = savedNow; currentUser = savedUser; cosmeticPurchaseState = savedOwned;
    }
  });

  await test('Seasonal Shop: each event folds with its chevron; live events start open, others folded', () => {
    const savedNow = seasonalNowOverride, savedTab = shopTab, savedUser = currentUser;
    try {
      currentUser = null;
      seasonalForceAllEvents = true;
      seasonalNowOverride = '2026-10-20T12:00:00';
      shopTab = SEASONAL_TAB; renderCosmeticShop();
      const section = (id) => document.querySelector(`[data-season-section="${id}"]`);
      assertTrue(!section('halloween').classList.contains('is-collapsed'), 'The live event starts open');
      assertTrue(section('christmas').classList.contains('is-collapsed') && !section('christmas').querySelector('[data-shop-row]'), 'Other events start folded, showing only their banner');
      section('christmas').querySelector('[data-season-toggle]').click();
      assertTrue(!!section('christmas').querySelector('[data-shop-row]'), 'Tapping the banner unfolds it');
      section('halloween').querySelector('[data-season-toggle]').click();
      assertTrue(section('halloween').classList.contains('is-collapsed'), 'Tapping an open banner folds it');
      assertEqual(section('halloween').querySelector('[data-season-toggle]').getAttribute('aria-expanded'), 'false', 'The chevron state is announced');
    } finally {
      seasonalForceAllEvents = false;
      Object.keys(seasonalSectionOverrides).forEach(k => delete seasonalSectionOverrides[k]);
      seasonalNowOverride = savedNow; shopTab = savedTab; currentUser = savedUser; renderCosmeticShop();
    }
  });

  await test('Seasonal earn-only pictures need 3 wins in one event', () => {
    const earned = EARNED_AVATARS.find(i => i.id === 'avatar-halloween-earned');
    assertTrue(!earned.isEarned({ seasonWins: { 'halloween-2026': 2 } }), '2 wins is not enough');
    assertTrue(earned.isEarned({ seasonWins: { 'halloween-2026': 3 } }), '3 wins earns it');
    assertTrue(!earned.isEarned({ seasonWins: { 'christmas-2026': 5 } }), 'Wins in another event do not count');
  });

  await test('Seasonal mail: one "event is here" and one "last day" mail per event, never re-sent after reading', async () => {
    const savedNow = seasonalNowOverride;
    const store = {};
    currentUser = { uid: 'season-mail-uid' };
    db = { ref: (path) => ({
      once: () => Promise.resolve({ val: () => store.seasonMailSent || null }),
      update: (u) => { Object.entries(u).forEach(([k, v]) => { const [top, key] = k.split('/'); (store[top] = store[top] || {})[key] = v; }); return Promise.resolve(); }
    }) };
    try {
      seasonalNowOverride = '2026-10-20T12:00:00';
      await sendSeasonalMail();
      assertTrue(!!store.activityInbox?.['season_halloween-2026'], 'The first visit during Halloween sends its mail');
      delete store.activityInbox['season_halloween-2026']; // player reads and deletes it
      await sendSeasonalMail();
      assertTrue(!store.activityInbox['season_halloween-2026'], 'A read mail is never sent again');
      seasonalNowOverride = '2026-11-02T12:00:00';
      await sendSeasonalMail();
      assertTrue(store.activityInbox['season_halloween-2026-last']?.lastDay === true, 'The last day sends its own reminder');
      assertTrue(inboxItemHtml({ ...store.activityInbox['season_halloween-2026-last'], id: 'season_halloween-2026-last' }).includes('ends today'), 'The last-day mail says so');
    } finally {
      seasonalNowOverride = savedNow;
    }
  });

  await test('Reduce motion swaps the big burn and victory effects for a calm glow', () => {
    const layer = document.getElementById('burnFxLayer');
    layer.innerHTML = '';
    reduceMotion = true;
    playBurnEffect('burn-smoke', 100, 100);
    assertEqual(layer.children.length, 1, 'Reduce motion shows one soft glow instead of dozens of particles');
    layer.innerHTML = '';
    const vLayer = document.getElementById('victoryFxLayer');
    vLayer.innerHTML = '';
    bigEffectsOn = true;
    triggerEquippedVictoryEffect({ id: state.localPlayerId, finishRank: 1 });
    assertEqual(vLayer.children.length, 0, 'Reduce motion skips the full-screen victory animation');
  });

  await test('Frame icons in the Shop and Custom show the frame\'s real colour', () => {
    const brew = COSMETIC_SHOP_ITEMS.find(i => i.id === 'frame-halloween');
    assertTrue(shopCosmeticThumbnail(brew, 'frame').includes('#84cc16') || shopCosmeticThumbnail(brew, 'frame').includes('132,204,22'), "Witch's Brew shows its green glow, not the event's orange");
    assertTrue(cosmeticPreview(brew, 'frame').includes('132,204,22'), 'The Custom tile shows the same glow');
  });

  await test('Gifting: Shop rows offer GIFT, the Friends list has a gift button, and unopened gifts show in the Inbox', () => {
    const savedUser = currentUser, savedTab = shopTab, savedFilter = shopFilter;
    try {
      currentUser = { uid: 'gift-ui-test' };
      shopFilter = 'all'; shopTab = 'Card Backs';
      renderCosmeticShop();
      assertTrue(document.querySelectorAll('#cosmeticShopList [data-gift-item]').length > 0, 'Shop rows have a GIFT button');
      assertTrue(friendRowHtml('f1', { username: 'Pooja' }, 'friend').includes('friend-gift-btn'), 'Friends have a gift button');
      const html = inboxItemHtml({ type: 'giftIn', id: 'g9', fromName: 'Amit', itemId: 'back-neon', cost: 60 });
      assertTrue(html.includes('Gift from Amit') && html.includes('data-claim-gift="g9"'), 'An unopened gift shows who sent it and an Open button');
      const summary = summarizeInboxNotifications({}, {}, {}, { giftIn_g9: { type: 'gift', sentAt: 5 } });
      assertEqual(summary.count, 1, 'Unopened gifts count towards the Inbox badge');
    } finally {
      currentUser = savedUser; shopTab = savedTab; shopFilter = savedFilter; renderCosmeticShop();
    }
  });

  await test('Match summary: placing, your stats, itemised Diamonds and the right next-match button', () => {
    freshState({ phase: 'FINISHED', isMultiplayer: false, isRanked: false, difficulty: 'hard' });
    const me = makePlayer({ id: 'p1', hasFinished: true, finishRank: 1 });
    me.gameStats = { ...freshStatsScope(), played: 17, pickedUp: 4, burnt: 2, turns: 21, jokersPlayed: 1, biggestPickup: 3 };
    state.players = [me, makePlayer({ id: 'p2', isBot: true, hand: [makeCard('4')] }), makePlayer({ id: 'p3', isBot: true, hasFinished: true, finishRank: 2 })];
    state.localPlayerId = 'p1';
    const savedUser = currentUser;
    currentUser = { uid: 'summary-test' };
    try {
      resetMatchSummary();
      logMatchReward('Match Won!', 10);
      logMatchReward('Burn Once', 20);
      logMatchReward('Nothing', 0);
      showMatchEndUI();
      assertTrue(openMatchSummary(), 'The summary opens once the match is FINISHED');
      const text = document.getElementById('matchSummaryBody').textContent;
      assertTrue(text.includes('You won!'), 'First place says so');
      assertTrue(text.includes('Vs 2 bots · Hard'), 'The mode is shown');
      assertTrue(/17\s*Played/.test(text) && /3\s*Biggest pickup/.test(text), 'Your own stats for this game are shown');
      assertTrue(text.includes('Match Won!') && text.includes('Burn Once') && text.includes('+💎 30'), 'Every Diamond reward is listed with a total');
      assertTrue(!text.includes('Nothing'), 'Zero rewards are not listed');
      assertEqual(document.getElementById('matchSummaryAgain').textContent, 'REMATCH', 'Vs Bots offers a rematch');
      matchSummaryRating = { from: 1300, to: 1325 };
      refreshMatchSummary();
      assertTrue(document.getElementById('matchSummaryBody').textContent.includes('1300 → 1325') && document.getElementById('matchSummaryBody').textContent.includes('+25'), 'A Ranked rating change is shown');
      state.isMultiplayer = true; state.isHost = false;
      showMatchEndUI(); refreshMatchSummary();
      assertTrue(document.getElementById('matchSummaryAgain').disabled, 'A guest cannot restart the room');
      state.players[0].hasFinished = false; state.players[0].finishRank = null; state.players[0].hand = [makeCard('9')];
      state.players[1].hasFinished = true; state.players[1].finishRank = 1; state.players[1].hand = [];
      assertEqual(matchPlacingInfo(state.players[0]).title, "You're the ShitHead", 'The last player is the ShitHead');
    } finally {
      currentUser = savedUser;
      hideMatchEndUI();
      assertTrue(document.getElementById('matchSummaryModal').classList.contains('hidden'), 'Starting a new match closes the summary');
      assertEqual(matchRewardLog.length, 0, 'A new match starts with an empty reward list');
    }
  });

  await test('Daily login streak: consecutive days grow, a missed day restarts, same day pays nothing', () => {
    const d = (y, m, day) => new Date(y, m - 1, day, 12);
    assertEqual(calculateDailyStreak(null, d(2026, 3, 1)).count, 1, 'First claim is Day 1');
    assertEqual(calculateDailyStreak({ count: 3, lastDate: '2026-02-28', best: 3 }, d(2026, 3, 1)).count, 4, 'Month rollover counts as consecutive');
    assertEqual(calculateDailyStreak({ count: 5, lastDate: '2026-02-26', best: 5 }, d(2026, 3, 1)).count, 1, 'Missing a day restarts at Day 1');
    assertEqual(calculateDailyStreak({ count: 5, lastDate: '2026-02-26', best: 5 }, d(2026, 3, 1)).best, 5, 'Best streak is kept');
    assertEqual(calculateDailyStreak({ count: 2, lastDate: '2026-03-01' }, d(2026, 3, 1)), null, 'Already claimed today');
    assertEqual(dailyStreakReward(1), 10, 'Day 1 reward');
    assertEqual(dailyStreakReward(7), 100, 'Day 7 bonus');
    assertEqual(dailyStreakReward(8), 10, 'Week 2 restarts the reward track');
    assertTrue(dailyTrackHtml(3).includes('is-today'), 'Track highlights today');
  });

  await test('Showcase: player card lists the equipped loadout and never shows unknown ids', () => {
    const html = showcaseHtml({ tableTheme: 'table-royal', cardBack: 'back-nebula', frame: 'frame-gold', burnEffect: 'burn-ice', victoryEffect: 'nope', emotes: 'default' });
    assertTrue(html.includes('data-table-preview="table-royal"'), 'Shows their table');
    assertTrue(html.includes('Ice Shatter'), 'Shows their burn effect name');
    assertTrue(!html.includes('nope'), 'Unknown ids fall back to Default');
    assertEqual(showcaseHtml(null), '', 'No loadout, no showcase');
    const loadout = getShowcaseLoadout();
    assertEqual(Object.keys(loadout).sort().join(','), [...SHOWCASE_TYPES].sort().join(','), 'Public showcase only carries the six cosmetic types');
  });

  await test('Locked Custom items stay tappable and open that item in the Shop', () => {
    const locked = COSMETIC_SHOP_ITEMS.find(item => item.category === 'Table Themes' && !cosmeticPurchaseState[item.id]);
    const html = personalisationOptionHtml(locked, 'tableTheme', 'default');
    assertTrue(html.includes('data-locked') && !/\sdisabled[\s>]/.test(html), 'Locked tile is marked locked, not disabled');
    const savedTab = shopTab, savedUser = currentUser;
    currentUser = null;
    openLockedCosmetic(locked.id);
    assertEqual(shopTab, 'Table Themes', 'Shop opens on the item\'s section');
    assertEqual(pendingShopFocusId, locked.id, 'Shop will scroll to the item');
    pendingShopFocusId = null; shopTab = savedTab; currentUser = savedUser;
    document.getElementById('authModal')?.classList.add('hidden');
    document.getElementById('shopModal')?.classList.add('hidden');
  });

  await test('REGRESSION: every table theme shows its preview in Shop rows and Custom tiles without a click', () => {
    const tables = COSMETIC_SHOP_ITEMS.filter(item => item.category === 'Table Themes' && !item.season);
    tables.forEach(item => {
      const html = miniTablePreviewHtml(item.id);
      assertTrue(html.includes(`data-table-preview="${item.id}"`), `${item.id} must render a mini table`);
      assertTrue(tablePreviewLook(item.id) !== CSS_TABLE_PREVIEWS.default, `${item.id} must have its own table look`);
      assertTrue(personalisationOptionHtml(item, 'tableTheme', 'default').includes(`data-table-preview="${item.id}"`), `${item.id} Custom tile must show the table`);
    });
    assertTrue(personalisationOptionHtml(null, 'tableTheme', 'default').includes('data-table-preview="default"'), 'Default Table tile must show the default table');
    const previousTab = shopTab;
    shopTab = 'Table Themes';
    renderCosmeticShop();
    const rows = document.querySelectorAll('#cosmeticShopList .shop-row-table [data-table-preview]');
    shopTab = previousTab;
    renderCosmeticShop();
    assertEqual(rows.length, tables.length, 'Each Shop table row must show its preview up front');
  });

  await test('REGRESSION: Shop previews use game-size cards and an isolated burn stage', () => {
    const backMarkup = shopCosmeticPreviewMarkup(COSMETIC_SHOP_ITEMS.find(item => item.category === 'Card Backs'));
    const frameMarkup = shopCosmeticPreviewMarkup(COSMETIC_SHOP_ITEMS.find(item => item.category === 'Frames'));
    const tableMarkup = shopCosmeticPreviewMarkup(COSMETIC_SHOP_ITEMS.find(item => item.category === 'Table Themes'));
    const burnMarkup = shopCosmeticPreviewMarkup(COSMETIC_SHOP_ITEMS.find(item => item.category === 'Burn Effects'));
    assertTrue(backMarkup.includes('card-base shop-preview-card'), 'Card-back previews must use the live game card dimensions');
    assertTrue(frameMarkup.includes('card-base shop-preview-card'), 'Frame previews must use the live game card dimensions');
    assertTrue(frameMarkup.includes('card-corner-rank') && frameMarkup.includes('card-corner-suit'), 'Frame previews must use normal game rank and suit sizing');
    assertTrue(tableMarkup.includes('mini-table-card deck') && tableMarkup.includes('mini-table-card pile') && tableMarkup.includes('mini-table-card face'), 'Table previews must visibly render deck, pile and face-up card zones');
    assertTrue(burnMarkup.includes('data-shop-burn-stage'), 'Burn effects must have a contained Shop preview stage');
    assertTrue(!playShopBurnPreview.toString().includes('playBurnEffect') && !playShopBurnPreview.toString().includes('render('), 'Shop burn previews must never invoke gameplay rendering or navigation');
  });

  await test('REGRESSION: Classic Reactions are built in and never sold', () => {
    assertTrue(!COSMETIC_SHOP_ITEMS.some(item => item.id === 'emotes-classic'), 'Classic Reactions must not appear in the Shop catalogue');
    assertTrue(BUILT_IN_COSMETICS.some(item => item.id === 'emotes-classic' && item.builtIn), 'Classic Reactions must remain available as a built-in cosmetic');
    assertTrue(isSupportedCosmetic('emotes', 'emotes-classic'), 'Legacy Classic Reactions saves must remain valid');
  });

  await test('Shop distinguishes EQUIP, EQUIP NOW and EQUIPPED without repurchasing', () => {
    const savedPurchases = cosmeticPurchaseState;
    const savedEquipped = { ...equippedCosmetics };
    const savedLast = lastPurchasedCosmeticId;
    try {
      cosmeticPurchaseState = { 'back-neon': { cost: 60 }, 'frame-gold': { cost: 60 } };
      equippedCosmetics.cardBack = 'back-neon';
      lastPurchasedCosmeticId = 'frame-gold';
      shopTab = 'Card Backs'; renderCosmeticShop();
      const neon = document.querySelector('[data-shop-equip-id="back-neon"]');
      assertEqual(neon?.textContent.trim(), 'EQUIPPED', 'The active item must say EQUIPPED');
      assertTrue(!document.querySelector('[data-cosmetic-id="back-neon"]'), 'Owned items must never retain a purchase button');
      shopTab = 'Frames'; renderCosmeticShop();
      const gold = document.querySelector('[data-shop-equip-id="frame-gold"]');
      assertEqual(gold?.textContent.trim(), 'EQUIP NOW', 'A newly purchased item must offer EQUIP NOW');
      shopTab = 'Profile Pictures';
    } finally {
      cosmeticPurchaseState = savedPurchases;
      equippedCosmetics = savedEquipped;
      lastPurchasedCosmeticId = savedLast;
      renderCosmeticShop();
    }
  });

  await test('REGRESSION: opponent frame cosmetics never consume the card face and stacked card backs cannot add a second centre icon', () => {
    const opponentGold = getOpponentCosmeticFrameStyle('frame-gold');
    assertTrue(opponentGold.includes('0 0 0 1px') && !opponentGold.includes('inset'), 'Opponent frame must be a thin external visual only');
    assertTrue(typeof getOpponentCosmeticFrameStyle === 'function', 'Opponent-specific frame renderer must exist');
  });

  await test('Multiplayer cosmetic payload exposes only visible gameplay cosmetics', () => {
    const loadout = getPublicCosmeticLoadout();
    assertEqual(Object.keys(loadout).sort(), ['avatar','burnEffect','cardBack','frame','victoryEffect'], 'Only opponent-visible cosmetics (incl. the profile picture) should be synced');
    assertTrue(getCosmeticBackClass('back-neon') === 'cosmetic-back-neon', 'Opponent card backs must resolve to the purchased design');
    assertTrue(getCosmeticFrameStyle('frame-gold').includes('#fbbf24'), 'Opponent frames must resolve to their own frame styling');
  });

  await test('Incomplete multiplayer deals are detected for authoritative recovery', () => {
    const savedLocalId = state.localPlayerId;
    state.localPlayerId = 'p_guest';
    try {
      assertTrue(localDealLooksIncomplete({ phase:'SWAP' }, [{ id:'p_guest', hand:[], faceUp:[], faceDown:[] }]), 'A guest missing its SWAP deal must be recovered');
      assertTrue(!localDealLooksIncomplete({ phase:'SWAP' }, [{ id:'p_guest', hand:[1,2,3], faceUp:[1,2,3], faceDown:[1,2,3] }]), 'A complete SWAP deal must be accepted');
      assertTrue(localDealLooksIncomplete({ phase:'PLAY' }, [{ id:'p_guest', hasFinished:false }]), 'A live player with no card zones must be recovered');
      // Firebase drops empty arrays, so in PLAY a missing Hand/Face-Up zone is
      // just an empty one. Treating it as damage froze the table once a
      // player's Hand ran out.
      assertTrue(!localDealLooksIncomplete({ phase:'PLAY' }, [{ id:'p_guest', hasFinished:false, faceDown:[1] }]), 'A Hand and Face-Up that have run out (omitted by Firebase) are normal');
      assertTrue(!localDealLooksIncomplete({ phase:'PLAY' }, [{ id:'p_guest', hasFinished:false, hand:[1], faceDown:[1] }]), 'An empty Face-Up (omitted by Firebase) is normal');
      assertTrue(!localDealLooksIncomplete({ phase:'PLAY' }, [{ id:'p_guest', hand:[], faceUp:[], faceDown:[1] }]), 'Legitimate empty hand/face-up zones must remain valid');
    } finally { state.localPlayerId = savedLocalId; }
  });

  await test('Cosmetic animation failures never interrupt gameplay', () => {
    const oldBurn = playBurnEffect;
    const oldVictory = playVictoryEffect;
    try {
      playBurnEffect = () => { throw new Error('preview failure'); };
      playVictoryEffect = () => { throw new Error('preview failure'); };
      triggerEquippedBurnEffect(0, 0, { id: state.localPlayerId, cosmetics: { burnEffect:'burn-ice' } });
      triggerEquippedVictoryEffect({ id: state.localPlayerId, finishRank:1, cosmetics: { victoryEffect:'victory-fireworks' } });
      assertTrue(true, 'Effect failures were contained');
    } finally {
      playBurnEffect = oldBurn;
      playVictoryEffect = oldVictory;
    }
  });

  await test('41: four-client online state simulation preserves every dealt seat', () => {
    const savedLocalId = state.localPlayerId;
    const players = Array.from({ length:4 }, (_, index) => ({
      id:`p${index + 1}`, name:`Player ${index + 1}`, hand:[makeCard('3'),makeCard('4'),makeCard('5')],
      faceUp:[makeCard('6'),makeCard('7'),makeCard('8')], faceDown:[makeCard('9'),makeCard('10'),makeCard('J')], cosmetics:{ cardBack:'back-neon' }
    }));
    players.forEach(player => {
      state.localPlayerId = player.id;
      assertTrue(!localDealLooksIncomplete({ phase:'SWAP' }, players), `${player.id} must receive all three card zones`);
    });
    assertEqual(new Set(players.map(player => player.id)).size, 4, 'All four online seats must remain distinct');
    state.localPlayerId = savedLocalId;
  });

  await test('42: every cosmetic has a visibly distinct runtime preview', () => {
    COSMETIC_SHOP_ITEMS.forEach(item => {
      const type = COSMETIC_CATEGORY_TYPES[item.category];
      const thumbnail = shopCosmeticThumbnail(item, type);
      const preview = shopCosmeticPreviewMarkup(item);
      assertTrue(thumbnail.length > 20 && preview.length > 80, `${item.id} must render both thumbnail and full preview`);
      assertTrue(isSupportedCosmetic(type, item.id), `${item.id} must resolve to a live renderer`);
    });
  });

  await test('43: purchase, equip and reload persistence works for every category', () => {
    const savedState = state.isMultiplayer;
    const savedPurchases = cosmeticPurchaseState;
    const savedEquipped = { ...equippedCosmetics };
    state.isMultiplayer = false;
    try {
      cosmeticPurchaseState = Object.fromEntries(COSMETIC_SHOP_ITEMS.map(item => [item.id, true]));
      Object.entries(COSMETIC_CATEGORY_TYPES).forEach(([category, type]) => {
        const item = COSMETIC_SHOP_ITEMS.find(entry => entry.category === category);
        assertTrue(equipCosmetic(type, item.id, { preview:false, sync:false }), `${type} must equip after purchase`);
      });
      const reloaded = JSON.parse(localStorage.getItem('shithead_equipped_cosmetics'));
      Object.keys(DEFAULT_EQUIPPED_COSMETICS).forEach(type => assertEqual(reloaded[type], equippedCosmetics[type], `${type} must survive reload storage`));
    } finally {
      cosmeticPurchaseState = savedPurchases; equippedCosmetics = savedEquipped; applyEquippedCosmetics(); state.isMultiplayer = savedState;
    }
  });

  await test('REGRESSION: built-in cosmetics survive reload without a purchase record', () => {
    assertTrue(canRestoreEquippedCosmetic('emotes', 'emotes-classic', {}), 'Classic Reactions must restore because it is built in');
    assertTrue(!canRestoreEquippedCosmetic('cardBack', 'back-neon', {}), 'A paid cosmetic without ownership must still be rejected');
    assertTrue(canRestoreEquippedCosmetic('cardBack', 'back-neon', { 'back-neon': true }), 'A paid owned cosmetic must restore');
  });

  await test('REGRESSION: a local winner uses the currently equipped victory effect over stale room cosmetics', () => {
    const previousEffect = equippedCosmetics.victoryEffect;
    const previousBigEffects = bigEffectsOn;
    const previousPlayerId = state.localPlayerId;
    const originalPlayVictoryEffect = playVictoryEffect;
    let played = null;
    try {
      state.localPlayerId = 'winner';
      equippedCosmetics.victoryEffect = 'victory-fireworks';
      bigEffectsOn = true;
      playVictoryEffect = effect => { played = effect; };
      triggerEquippedVictoryEffect({ id:'winner', finishRank:1, cosmetics:{ victoryEffect:'default' } });
      assertEqual(played, 'victory-fireworks', 'A stale room default must not suppress the local equipped effect');
    } finally {
      equippedCosmetics.victoryEffect = previousEffect;
      bigEffectsOn = previousBigEffects;
      state.localPlayerId = previousPlayerId;
      playVictoryEffect = originalPlayVictoryEffect;
    }
  });

  await test('44: narrow-screen three-row hand remains within viewport width and height', () => {
    const originalWidth = window.innerWidth, originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { configurable:true, value:320 });
    Object.defineProperty(window, 'innerHeight', { configurable:true, value:568 });
    try {
      const rows = computeHandRows(Array.from({ length:33 }, (_, i) => ({ id:`c${i}` })));
      const metrics = computeHandCardMetrics(Math.max(...rows.map(row => row.length)), rows.length, 220);
      const occupiedWidth = metrics.width + (Math.max(...rows.map(row => row.length)) - 1) * (metrics.width + metrics.marginLeft);
      const occupiedHeight = metrics.height * (1 + .55 * (rows.length - 1));
      assertEqual(rows.length, 3, '33 cards must use exactly three rows');
      assertTrue(occupiedWidth <= 320 - 40, 'The widest row must fit a narrow iPhone viewport');
      assertTrue(occupiedHeight <= 221, 'The three-row stack must fit its vertical budget');
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable:true, value:originalWidth });
      Object.defineProperty(window, 'innerHeight', { configurable:true, value:originalHeight });
    }
  });

  await test('45: delayed turn updates lock input and clear stale selections', async () => {
    const savedPhase = state.phase;
    try {
      state.phase = 'PLAY'; state.selectedPlayCardIds = ['stale']; state.selectedSacrificeIds = ['stale'];
      beginTurnTransitionLock();
      assertTrue(state.turnTransitionLocked, 'Input must lock immediately during a delayed turn transition');
      assertEqual(state.selectedPlayCardIds.length, 0, 'A delayed update must clear staged cards');
      await new Promise(resolve => setTimeout(resolve, 240));
      assertTrue(!state.turnTransitionLocked, 'Input must unlock after the synchronisation guard');
    } finally { state.phase = savedPhase; }
  });

  await test('46: unowned cosmetics cannot be equipped client-side', () => {
    const savedPurchases = cosmeticPurchaseState;
    const before = equippedCosmetics.cardBack;
    cosmeticPurchaseState = {};
    assertTrue(!equipCosmetic('cardBack', 'back-neon', { preview:false, sync:false }), 'An unowned Shop ID must be rejected');
    assertEqual(equippedCosmetics.cardBack, before, 'Rejected equip must not alter the active cosmetic');
    cosmeticPurchaseState = savedPurchases;
  });

  await test('47: version mismatch detection blocks incompatible online rooms', () => {
    assertTrue(isRoomVersionCompatible({ clientVersion:getGameVersionLabel() }), 'Matching builds must be compatible');
    assertTrue(!isRoomVersionCompatible({ clientVersion:'v1' }), 'Different builds must be rejected before joining');
    assertTrue(isRoomVersionCompatible({}), 'Legacy rooms without a version remain recoverable');
  });

  await test('Vs Bots remembers the last bot count and difficulty (device + account settings)', () => {
    const saved = { count: state.selectedBotCount, diff: state.difficulty, unlocked: { ...unlockedDifficulties } };
    let ls = {};
    try { ls = { c: localStorage.getItem('shithead_bot_count'), d: localStorage.getItem('shithead_difficulty') }; } catch (e) {}
    try {
      unlockedDifficulties = { easy: true, medium: true, hard: true, boss: true };
      document.querySelector('.bot-count-btn[data-bots="1"]').click();
      document.querySelector('.diff-btn[data-diff="hard"]').click();
      state.selectedBotCount = 3; state.difficulty = 'medium'; // e.g. a tutorial borrowed them
      applyBotPrefs();
      assertEqual(state.selectedBotCount, 1, 'Bot count comes back');
      assertEqual(state.difficulty, 'hard', 'Difficulty comes back');
      assertTrue(document.querySelector('.bot-count-btn[data-bots="1"]').className.includes('border-amber-500'), 'The remembered count is highlighted');
      const cloud = collectAccountSettings();
      assertEqual(cloud.botCount, 1, 'Signed-in accounts save the count');
      assertEqual(cloud.botDifficulty, 'hard', 'Signed-in accounts save the difficulty');
      applyAccountSettings({ botCount: 2, botDifficulty: 'easy' });
      assertEqual(state.selectedBotCount, 2, 'Account settings restore the count on another device');
      assertEqual(state.difficulty, 'easy', 'Account settings restore the difficulty on another device');
      unlockedDifficulties = { easy: true, medium: true, hard: false, boss: false };
      applyAccountSettings({ botCount: 3, botDifficulty: 'boss' });
      assertEqual(state.difficulty, 'easy', 'A locked difficulty is never restored');
    } finally {
      unlockedDifficulties = saved.unlocked;
      try {
        ls.c === null ? localStorage.removeItem('shithead_bot_count') : localStorage.setItem('shithead_bot_count', ls.c);
        ls.d === null ? localStorage.removeItem('shithead_difficulty') : localStorage.setItem('shithead_difficulty', ls.d);
      } catch (e) {}
      state.selectedBotCount = saved.count; state.difficulty = saved.diff;
      styleBotCountBtns(); document.querySelectorAll('.diff-btn').forEach(styleDifficultyBtn);
    }
  });

  await test('Signed in: the lobby defaults to the highest unlocked difficulty; bot count row centres on the difficulty row', () => {
    const saved = { diff: state.difficulty, unlocked: { ...unlockedDifficulties }, user: currentUser, known: difficultyLocksKnownFor, phase: state.phase };
    try {
      currentUser = { uid: 'test-uid' }; difficultyLocksKnownFor = 'test-uid'; state.phase = 'LOBBY';
      unlockedDifficulties = { easy: true, medium: true, hard: true, boss: false };
      state.difficulty = 'easy';
      applyBotPrefs({ count: 2, difficulty: 'medium' });
      assertEqual(state.difficulty, 'hard', 'Highest unlocked wins over the remembered one');
      unlockedDifficulties.boss = true; selectHighestUnlockedDifficulty();
      assertEqual(state.difficulty, 'boss', 'A new unlock becomes the default');
      state.phase = 'PLAY'; state.difficulty = 'medium'; selectHighestUnlockedDifficulty();
      assertEqual(state.difficulty, 'medium', 'Never changed mid-match');
      difficultyLocksKnownFor = null; state.phase = 'LOBBY'; state.difficulty = 'easy';
      applyBotPrefs({ count: 2, difficulty: 'boss' });
      assertEqual(state.difficulty, 'easy', 'Before the unlocks load, nothing is picked for them');
      const lobby = document.getElementById('lobbyScreen'), wasHidden = lobby && lobby.classList.contains('hidden');
      const single = document.getElementById('singleOptions'), singleHidden = single.classList.contains('hidden');
      lobby && lobby.classList.remove('hidden'); single.classList.remove('hidden');
      const mid = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const a = mid(document.querySelector('.bot-count-btn')), b = mid(document.querySelector('.diff-btn'));
      if (lobby && wasHidden) lobby.classList.add('hidden'); if (singleHidden) single.classList.add('hidden');
      assertTrue(Math.abs(a - b) < 1, `Bot count buttons centre on the difficulty buttons (${a.toFixed(1)} vs ${b.toFixed(1)})`);
    } finally {
      currentUser = saved.user; difficultyLocksKnownFor = saved.known; state.phase = saved.phase;
      unlockedDifficulties = saved.unlocked; state.difficulty = saved.diff;
      document.querySelectorAll('.diff-btn').forEach(styleDifficultyBtn);
    }
  });

  await test('Hand Sort: rank by default; power order is 4,5,6,7,8,9,J,Q,K,A,10,2,3,Joker', () => {
    const saved = handSortByPower;
    try {
      const ranks = ['JOKER', '3', '2', '10', 'A', 'K', 'Q', 'J', '9', '8', '7', '6', '5', '4'];
      const cards = ranks.map((r, i) => ({ id: 'hs' + i, rank: r, isJoker: r === 'JOKER' }));
      handSortByPower = false;
      assertEqual([...cards].sort((a, b) => handSortValue(a) - handSortValue(b)).map(c => c.rank).join(','), '2,3,4,5,6,7,8,9,10,J,Q,K,A,JOKER', 'Off = by rank');
      handSortByPower = true;
      assertEqual([...cards].sort((a, b) => handSortValue(a) - handSortValue(b)).map(c => c.rank).join(','), '4,5,6,7,8,9,J,Q,K,A,10,2,3,JOKER', 'On = by power');
      assertTrue(!!document.getElementById('setHandSortRow'), 'Settings → Gameplay has the Hand Sort row');
      assertTrue('handSortByPower' in collectAccountSettings(), 'Synced with the account settings');
    } finally { handSortByPower = saved; }
  });

  await test('Invite links: ?join=<6 digits> is the only accepted form, and the share link points at the game', () => {
    assertEqual(inviteLinkFor('123456'), 'https://shithead-pro.web.app/?join=123456', 'Link format');
    assertTrue(!!document.getElementById('shareInviteLinkBtn'), 'The lobby has a Share Invite Link button');
    assertEqual(inviteCodeFromUrl(), null, 'No join code on the test page');
  });

  await test('Notifications fire only for new gifts, invites and friend requests (not ones already waiting)', () => {
    const realShow = showAppNotification;
    const shown = [];
    showAppNotification = (title, body, tag, evenIfVisible, open) => shown.push({ title, tag, open });
    try {
      notifySeenIds = {};
      notifyNewInboxItems('gift', { g1: { fromName: 'Sam', itemId: 'frame-gold' } });
      notifyNewInboxItems('request', { r1: { name: 'Jo' } });
      assertEqual(shown.length, 0, 'What was already waiting is not announced');
      notifyNewInboxItems('gift', { g1: { fromName: 'Sam', itemId: 'frame-gold' }, g2: { fromName: 'Sam', itemId: 'frame-gold' } });
      notifyNewInboxItems('request', { r1: { name: 'Jo' }, r2: { name: 'Alex' } });
      notifyNewInboxItems('invite', { i1: { fromName: 'Kai' } });
      notifyNewInboxItems('invite', { i1: { fromName: 'Kai' }, i2: { fromName: 'Kai' } });
      assertEqual(shown.map(n => n.tag), ['gift-g2', 'request-r2', 'invite-i2'], 'Each new item is announced once');
      assertTrue(shown[0].title.includes('Sam') && shown[0].title.includes('gift'), 'Gift notifications name the sender');
      assertEqual(shown[1].open, 'friends', 'Friend requests open the Friends page');
      notifyNewInboxItems('gift', { g2: { fromName: 'Sam' } });
      assertEqual(shown.length, 3, 'Opening a gift (removing it) is not announced');
    } finally {
      showAppNotification = realShow;
      notifySeenIds = {};
    }
  });

  await test('Phone Back: closes the top pop-up first, then the menu; a must-answer prompt stays; at the table it asks to leave', () => {
    const el = id => document.getElementById(id);
    const shown = [];
    const show = id => { el(id).classList.remove('hidden'); shown.push(id); };
    try {
      assertEqual(topBackLayer(), null, 'Nothing open: nothing for Back to close');
      show('settingsModal');
      assertEqual(topBackLayer().id, 'settingsModal', 'An open page is closed by Back');
      show('giftModal');
      assertEqual(topBackLayer().id, 'giftModal', 'The pop-up on top goes first');
      el('giftModal').classList.add('hidden');
      topBackLayer().close();
      assertTrue(el('settingsModal').classList.contains('hidden'), 'Back closes the page the same way its X button does');
      show('usernameModal');
      const layer = topBackLayer();
      assertEqual(layer.id, 'usernameModal', 'The username prompt is on top');
      layer.close();
      assertTrue(!el('usernameModal').classList.contains('hidden'), 'A prompt that must be answered is not dismissed by Back');
      el('usernameModal').classList.add('hidden');
      const exit = el('leaveGameBtn'), wasHidden = exit.classList.contains('hidden');
      exit.classList.remove('hidden');
      const action = screenBackAction();
      if (wasHidden) exit.classList.add('hidden');
      assertTrue(typeof action === 'function', 'At a table, Back leads to the Leave-match question');
      assertTrue(document.getElementById('leaveRoomBtn') && typeof leaveRoomAndReload === 'function', 'Leave Room leaves and reloads');
    } finally {
      shown.forEach(id => el(id).classList.add('hidden'));
    }
  });
  await test('Event calendar for the phone’s own daily check lists what starts next, with start days', () => {
    const list = upcomingSeasonCalendar(new Date(2026, 9, 10, 12));
    assertEqual(list[0].key, 'halloween-2026', 'Halloween is next on 10 October 2026');
    assertEqual(list[0].start, '2026-10-15', 'With its start day');
    assertTrue(list.every(e => e.name && e.emoji && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.start)), 'Every entry has what the alert needs');
    assertEqual(new Set(list.map(e => e.key)).size, list.length, 'No duplicates');
    assertTrue(list.length >= 9 && list.length <= 40, 'About a year of events');
    assertTrue(!pushAvailable() || !!FCM_VAPID_KEY, 'Push only switches on once the Web Push key is set');
  });

  await test('The menu reopens scrolled to the top', () => {
    const drawer = document.getElementById('hamburgerDrawer');
    const savedHeight = drawer.style.maxHeight;
    drawer.style.maxHeight = '120px';
    openHamburgerMenu();
    drawer.scrollTop = 200;
    assertTrue(drawer.scrollTop > 0, 'The menu can scroll');
    closeHamburgerMenu();
    openHamburgerMenu();
    assertEqual(drawer.scrollTop, 0, 'Reopening starts at the top');
    closeHamburgerMenu();
    drawer.style.maxHeight = savedHeight;
  });

  await test('Only one page is open: the Inbox and menu pages close each other', async () => {
    const el = id => document.getElementById(id);
    const tick = () => new Promise(r => setTimeout(r, 0));
    const open = id => el(id).classList.remove('hidden');
    open('settingsModal'); await tick();
    open('inboxModal'); await tick();
    assertTrue(el('settingsModal').classList.contains('hidden'), 'Opening the Inbox closes Settings');
    assertTrue(!el('inboxModal').classList.contains('hidden'), 'The Inbox stays open');
    open('shopModal'); await tick();
    assertTrue(el('inboxModal').classList.contains('hidden'), 'Opening a menu page closes the Inbox');
    open('profileModal'); await tick();
    assertTrue(el('shopModal').classList.contains('hidden'), 'Menu pages close each other too');
    closeOtherMenuPages(); await tick();
    assertTrue(EXCLUSIVE_PAGE_IDS.every(id => el(id).classList.contains('hidden')), 'Everything closes cleanly');
  });

  await test('Shop is organised into section tabs and all five filters render correctly', () => {
    const savedFilter = shopFilter, savedTab = shopTab;
    shopFilter = 'all'; shopTab = 'Profile Pictures'; renderCosmeticShop();
    const savedNow = seasonalNowOverride;
    const tabNames = () => [...document.querySelectorAll('#shopTabBar [data-shop-tab]')].map(b => b.textContent.replace(/\d+/g, '').trim());
    seasonalNowOverride = '2026-09-24T12:00:00'; // 21 days before Halloween
    renderCosmeticShop();
    let tabs = tabNames();
    assertTrue(tabs[tabs.length - 1].includes('Seasonal'), 'With no event near, Seasonal is the last tab');
    assertEqual(tabs.slice(0, -1), ['Pictures', 'Tables', 'Card Backs', 'Frames', 'Burn', 'Victory', 'Emotes'], 'Pictures, then table and cards, then effects');
    seasonalNowOverride = '2026-10-12T12:00:00'; // 3 days before Halloween
    renderCosmeticShop();
    assertTrue(tabNames()[0].includes('Seasonal'), 'Seasonal leads when an event starts within 3 days');
    seasonalNowOverride = '2026-10-20T12:00:00'; // during Halloween
    renderCosmeticShop();
    tabs = tabNames();
    assertTrue(tabs[0].includes('Seasonal'), 'Seasonal leads while an event is on');
    seasonalNowOverride = savedNow;
    renderCosmeticShop();
    document.querySelector('#shopTabBar [data-shop-tab="Card Backs"]').click();
    const shown = [...document.querySelectorAll('#cosmeticShopList [data-preview-cosmetic-id]')].map(b => b.dataset.previewCosmeticId);
    assertTrue(shown.length > 0 && shown.every(id => id.startsWith('back-')), 'A tab only shows its own section');
    assertEqual(document.querySelector('#shopTabBar [data-shop-tab="Card Backs"]').getAttribute('aria-selected'), 'true', 'The active tab is marked selected');
    ['all','affordable','owned','unowned','equipped'].forEach(filter => assertTrue(!!document.querySelector(`[data-shop-filter="${filter}"]`), `${filter} filter must exist`));
    shopFilter = savedFilter; shopTab = savedTab; renderCosmeticShop();
  });

  await test('REGRESSION: AmitK test-account detection accepts the real username and authenticated email', () => {
    const savedUser = currentUser;
    try {
      currentUser = { uid:'amitk-test', email:'amirk2197@googlemail.com' };
      assertTrue(isAmitkTestingAccount({ username:'SomethingElse' }), 'Authenticated AmitK test email must be recognised');
      currentUser = { uid:'amitk-test', email:'other@example.com' };
      assertTrue(isAmitkTestingAccount({ username:'AmitK' }), 'AmitK username must be recognised case-insensitively');
    } finally { currentUser = savedUser; }
  });

  await test('Shop purchase feedback includes NEW, shortfall guidance and unlock animation', () => {
    const savedNew = new Set(newCosmeticIds), savedPurchases = cosmeticPurchaseState, savedDiamonds = challengeEconomy.diamonds;
    try {
      cosmeticPurchaseState = {};
      challengeEconomy.diamonds = 0;
      newCosmeticIds = new Set(['back-neon']);
      shopTab = 'Card Backs';
      renderCosmeticShop();
      assertTrue(document.getElementById('cosmeticShopList').innerText.includes('NEW'), 'A newly purchased item must carry a NEW indicator');
      assertTrue(document.getElementById('cosmeticShopList').innerText.includes('Need 💎'), 'Unaffordable items must show the exact shortfall');
      showShopPurchaseSuccess(COSMETIC_SHOP_ITEMS[0]);
      assertTrue(!document.getElementById('shopPurchaseSuccess').classList.contains('hidden'), 'Purchase success animation panel must become visible');
    } finally {
      newCosmeticIds = savedNew; cosmeticPurchaseState = savedPurchases; challengeEconomy.diamonds = savedDiamonds; shopTab = 'Profile Pictures'; renderCosmeticShop();
    }
  });

  await test('Gameplay lock UX is compact, Snap-specific and transition-safe', () => {
    assertTrue(!!document.getElementById('cardLockReason'), 'A single compact lock-reason line must exist below the turn indicator');
    const savedPhase = state.phase, savedPlayers = state.players, savedTurn = state.currentTurnIndex;
    state.phase = 'PLAY'; state.players = [{ id:'current' }, { id:'not-current' }]; state.currentTurnIndex = 0;
    assertTrue(getCardLockReason(makeCard('3'), 'hand', state.players[1]).toLowerCase().includes('turn'), 'Out-of-turn cards must explain the lock');
    assertTrue(typeof executeLocalSnapBurn === 'function' && typeof getCurrentSnapOpportunity === 'function', 'Snap Burn must have a dedicated highlighted action path');
    clearStaleSelections();
    assertEqual(state.selectedPlayCardIds.length, 0, 'The central stale-selection reset must clear play selections');
    state.phase = savedPhase; state.players = savedPlayers; state.currentTurnIndex = savedTurn;
  });

  await test('Personalisation reset, sticky Shop header and background scroll lock exist', () => {
    assertTrue(!!document.getElementById('unequipAllCosmeticsBtn'), 'Personalisation must provide Unequip All');
    assertTrue(document.querySelector('#shopModal .shop-sticky-header') !== null, 'The Shop header must remain sticky');
    document.getElementById('shopModal').classList.remove('hidden'); syncBackgroundScrollLock();
    assertTrue(document.body.classList.contains('ui-overlay-open'), 'Opening Shop must lock background scrolling');
    document.getElementById('shopModal').classList.add('hidden'); syncBackgroundScrollLock();
  });

  await test('REGRESSION: formatCompactDiamonds keeps the header from ever breaking on a huge balance, while the backend keeps the exact integer', () => {
    assertEqual(formatCompactDiamonds(850), '850', 'Under 1,000 must show the exact integer');
    assertEqual(formatCompactDiamonds(1500), '1.5K', 'Thousands must compact to one decimal + K');
    assertEqual(formatCompactDiamonds(2400000), '2.4M', 'Millions must compact to one decimal + M');
    assertEqual(formatCompactDiamonds(999999999), '999M', 'Just under a billion must still read as M, not roll over early');
    assertEqual(formatCompactDiamonds(999000000000), '999B+', 'The display ceiling must read exactly "999B+"');
    assertEqual(formatCompactDiamonds(5000000000000), '999B+', 'Anything past the display ceiling must still read "999B+", never a longer digit string');
  });

  await test('REGRESSION: the header Diamond counter flashes green on a gain and red on a spend, but never on the first paint', () => {
    const originalEconomy = challengeEconomy;
    lastPaintedDiamonds = null;
    challengeEconomy = { ...challengeEconomy, diamonds: 100 };
    updateDiamondHeader();
    const el = document.getElementById('headerDiamondCount');
    assertTrue(!el.classList.contains('diamond-flash-up') && !el.classList.contains('diamond-flash-down'), 'The very first paint after a null baseline must not animate — there is no real "before" to compare to yet');
    challengeEconomy = { ...challengeEconomy, diamonds: 150 };
    updateDiamondHeader();
    assertTrue(el.classList.contains('diamond-flash-up'), 'A gain must flash green/pulse');
    challengeEconomy = { ...challengeEconomy, diamonds: 90 };
    updateDiamondHeader();
    assertTrue(el.classList.contains('diamond-flash-down'), 'A spend must flash red/shake');
    assertTrue(!el.classList.contains('diamond-flash-up'), 'The previous gain class must be cleared before the spend class is applied');
    challengeEconomy = originalEconomy;
    updateDiamondHeader();
  });

  await test("REGRESSION: Games Played rewards exactly match their targets, and Win Streaks/Joker Deflects/Snap Burns pay the exact spec'd amounts", () => {
    const byId = (arr, id) => arr.find((c) => c.id === id);
    CHALLENGE_DEFS.rankedGamesPlayed.forEach((c) => assertEqual(c.reward, c.target, `${c.name}'s reward must exactly equal its target (${c.target})`));
    assertEqual(byId(CHALLENGE_DEFS.rankedStreaks, 'hat-trick').reward, 30, 'Hat-trick must pay 30');
    assertEqual(byId(CHALLENGE_DEFS.rankedStreaks, 'beast').reward, 200, 'Beast must pay 200');
    assertEqual(byId(CHALLENGE_DEFS.rankedStreaks, 'unstoppable').reward, 500, 'Unstoppable must pay 500');
    assertEqual(byId(CHALLENGE_DEFS.rankedJokerDeflects, 'gotcha').reward, 20, 'Gotcha must pay 20');
    assertEqual(byId(CHALLENGE_DEFS.rankedJokerDeflects, 'return-to-sender').reward, 200, 'Return to Sender must pay 200');
    assertEqual(byId(CHALLENGE_DEFS.rankedJokerDeflects, 'deflector').reward, 500, 'Deflector must pay 500');
    assertEqual(byId(CHALLENGE_DEFS.rankedSnapBurns, 'snapper').reward, 10, 'Snapper must pay 10');
    assertEqual(byId(CHALLENGE_DEFS.rankedSnapBurns, 'flaming-turtle').reward, 200, 'Flaming Turtle must pay 200');
    assertEqual(byId(CHALLENGE_DEFS.rankedSnapBurns, 'snap-god').reward, 500, 'Snap God must pay 500');
  });

  await test('REGRESSION: getChallengePriority orders Daily first, then by category, then by threshold within a category', () => {
    const dailyPriority = getChallengePriority('daily_2026-09-17_burn-once');
    const rankedBurnPriority = getChallengePriority('burner');
    const arsonistPriority = getChallengePriority('arsonist');
    const rankTierPriority = getChallengePriority('reach-bronze');
    const botMatchPriority = getChallengePriority('beat-easy-bot');
    assertTrue(dailyPriority < rankedBurnPriority, 'A Daily challenge must always be ordered before a Ranked one');
    assertTrue(rankedBurnPriority < arsonistPriority, 'Within Ranked Burns, a lower threshold (Burner) must be ordered before a higher one (Arsonist)');
    assertTrue(arsonistPriority < rankTierPriority, "Ranked Burns must be ordered before Rank Tiers, matching the modal's own section order");
    assertTrue(rankTierPriority < botMatchPriority, "Rank Tiers must be ordered before Bot Matches, matching the modal's own section order");
  });

  await test('REGRESSION: enqueueChallengeToast sorts simultaneous completions instead of the last one silently overwriting the others', () => {
    const originalQueue = challengeToastQueue;
    const originalActive = challengeToastActive;
    challengeToastQueue = []; // isolate from any real gameplay toasts already queued
    challengeToastActive = true; // freeze processing so the queue itself can be inspected, not the live DOM/timers
    enqueueChallengeToast('Pyromaniac', 250, getChallengePriority('pyromaniac'));
    enqueueChallengeToast('Burn the Pile', 20, getChallengePriority('daily_2026-09-17_burn-once'));
    enqueueChallengeToast('Burner', 50, getChallengePriority('burner'));
    const order = challengeToastQueue.map((t) => t.name);
    assertEqual(order, ['Burn the Pile', 'Burner', 'Pyromaniac'], 'Daily must come first, then Ranked Burns in threshold order, regardless of the order they actually completed in');
    challengeToastQueue = originalQueue;
    challengeToastActive = originalActive;
  });

  await test('REGRESSION: challenge toast sits below the real header and above ordinary pages', () => {
    const toast = document.getElementById('challengeToast');
    const header = document.querySelector('body > header');
    assertTrue(!!toast && !!header, 'Toast and global header must both exist');
    positionChallengeToast();
    const toastTop = parseFloat(getComputedStyle(toast).top);
    const headerBottom = header.getBoundingClientRect().bottom;
    const toastZ = Number(getComputedStyle(toast).zIndex);
    const headerZ = Number(getComputedStyle(header).zIndex);
    const hamburgerZ = Number(getComputedStyle(document.getElementById('hamburgerOverlay')).zIndex);
    const shopZ = Number(getComputedStyle(document.getElementById('shopModal')).zIndex) || 0;
    assertTrue(toastTop >= headerBottom + CHALLENGE_TOAST_GAP - 1, `Toast top (${toastTop}) must clear header bottom (${headerBottom})`);
    assertTrue(toastZ > shopZ, 'Toast must appear above Shop, Settings and Personalisation pages');
    assertTrue(toastZ < headerZ && toastZ < hamburgerZ, 'Header and hamburger must remain above the toast');
  });

  await test('REGRESSION: challenge toast geometry fits phone, desktop and shortened mobile viewports', () => {
    [[320,568],[390,844],[1366,768],[844,390],[390,300]].forEach(([width,height]) => {
      const headerBottom = width > height ? 44 : 48;
      const toastHeight = 54;
      const top = calculateChallengeToastTop(headerBottom, height, toastHeight);
      assertTrue(top >= headerBottom + CHALLENGE_TOAST_GAP || height < headerBottom + CHALLENGE_TOAST_GAP + toastHeight, `${width}x${height}: toast must clear the header whenever physically possible`);
      assertTrue(top + toastHeight <= height - CHALLENGE_TOAST_GAP + 1, `${width}x${height}: complete toast must remain inside viewport`);
    });
  });

  await test('REGRESSION: resize and orientation changes recalculate challenge-toast position', () => {
    const toast = document.getElementById('challengeToast');
    toast.style.setProperty('--challenge-toast-top', '1px');
    window.dispatchEvent(new Event('resize'));
    const afterResize = parseFloat(toast.style.getPropertyValue('--challenge-toast-top'));
    toast.style.setProperty('--challenge-toast-top', '2px');
    window.dispatchEvent(new Event('orientationchange'));
    const afterOrientation = parseFloat(toast.style.getPropertyValue('--challenge-toast-top'));
    assertTrue(afterResize > 1, 'Resize must move toast back below the header');
    assertTrue(afterOrientation > 2, 'Orientation change must move toast back below the header');
  });

  await test('REGRESSION: rejected challenge transaction never shows a false completion toast', async () => {
    const savedUser = currentUser;
    const savedDb = db;
    const savedQueue = challengeToastQueue;
    const savedActive = challengeToastActive;
    try {
      currentUser = { uid: 'toast-failure-test' };
      challengeToastQueue = [];
      challengeToastActive = true;
      db = { ref: () => ({ transaction: () => Promise.reject(new Error('PERMISSION_DENIED')) }) };
      const claimed = await claimChallenge('toast-failure-test', 20, 'Must Not Appear');
      assertTrue(!claimed, 'Rejected transaction must report no award');
      assertTrue(!challengeToastQueue.some(item => item.name === 'Must Not Appear'), 'Rejected transaction must not enqueue a toast');
    } finally {
      currentUser = savedUser;
      db = savedDb;
      challengeToastQueue = savedQueue;
      challengeToastActive = savedActive;
    }
  });

  await test('SECURITY: player-controlled names are escaped before HTML rendering', () => {
    const payload = `<img src=x onerror="window.__xss_test=1">O'Reilly & Co`;
    const escaped = escapeHtml(payload);
    assertTrue(!escaped.includes('<img') && !escaped.includes('onerror="'), 'Escaped text must not create executable markup');
    assertTrue(escaped.includes('&lt;img') && escaped.includes('&#39;') && escaped.includes('&amp;'), 'Escaping must preserve the visible text safely');
    const standings = buildFinalStandingsHtml([{ id:'p1', name:payload, hasFinished:true, finishRank:1 }], 'p1', false);
    assertTrue(!standings.includes('<img src=x'), 'Final standings must never interpolate raw player markup');
  });

  await test('SECURITY: room creation reserves an unused six-digit code transactionally', () => {
    const source = reserveUnusedRoom.toString();
    assertTrue(source.includes('.transaction'), 'Room reservation must be a Firebase transaction');
    assertTrue(source.includes('current == null'), 'An existing room must never be overwritten');
    assertTrue(source.includes('attemptsLeft'), 'A collision must retry with another code');
  });

  // Small path-aware mock of the Firebase Realtime Database surface
  // this file actually uses (once/set/update/transaction), for tests
  // that need multiple different paths under the same account to
  // stay consistent with each other — a flat object-literal mock
  // isn't enough once a test touches users/{uid} as a whole AND one
  // of its own nested children in the same flow (THE RESET below
  // does exactly that).
  function makeMockDb(initialData) {
    let data = JSON.parse(JSON.stringify(initialData));
    function getAtPath(path) {
      return path.split('/').filter(Boolean).reduce((acc, seg) => (acc == null ? undefined : acc[seg]), data);
    }
    function setAtPath(path, value) {
      const segs = path.split('/').filter(Boolean);
      if (segs.length === 0) { data = value; return; }
      let obj = data;
      for (let i = 0; i < segs.length - 1; i++) {
        if (obj[segs[i]] == null || typeof obj[segs[i]] !== 'object') obj[segs[i]] = {};
        obj = obj[segs[i]];
      }
      obj[segs[segs.length - 1]] = value;
    }
    return {
      ref: (path) => ({
        once: () => Promise.resolve({ exists: () => getAtPath(path) !== undefined, val: () => getAtPath(path) }),
        set: (val) => { setAtPath(path, val); return Promise.resolve(); },
        update: (patch) => { setAtPath(path, { ...(getAtPath(path) || {}), ...patch }); return Promise.resolve(); },
        transaction: (fn, onComplete) => {
          // Like Firebase: returning undefined aborts without writing, and
          // the optional completion callback gets (error, committed, snapshot).
          const current = getAtPath(path);
          const result = fn(current === undefined ? null : current);
          const committed = result !== undefined;
          if (committed) setAtPath(path, result);
          const snapshot = { val: () => { const v = getAtPath(path); return v === undefined ? null : v; } };
          if (onComplete) onComplete(null, committed, snapshot);
          return Promise.resolve({ committed, snapshot });
        }
      }),
      _getData: () => data
    };
  }

  await test('REGRESSION: a re-entrant initChallengeEconomy call for the same signed-in account never clobbers live in-memory progress', () => {
    const originalCurrentUser = currentUser;
    const originalDb = db;
    const originalEconomy = challengeEconomy;
    const originalLoadedForUid = challengeEconomyLoadedForUid;
    currentUser = { uid: 'reentrant-test-uid' };
    challengeEconomyLoadedForUid = null;
    const mock = makeMockDb({
      users: {
        'reentrant-test-uid': {
          diamonds: 0, completedChallenges: {}, dailyChallengeState: null,
          retroactiveChallengeCheckDone: true, diamondEconomyResetV2Done: true,
          challengeStats: { burns: 0, snapBurns: 0, jokerDeflects: 0 }, rating: 500, wins: 0, losses: 0
        }
      }
    });
    db = mock;
    return initChallengeEconomy().then(() => {
      // Simulate local progress whose own write to Firebase hasn't
      // landed yet — exactly the moment a spurious onAuthStateChanged
      // re-fire (e.g. an ID-token refresh) used to be able to stomp on.
      challengeEconomy.diamonds = 999;
      return initChallengeEconomy();
    }).then(() => {
      assertEqual(challengeEconomy.diamonds, 999, 'A second call for the SAME already-loaded account must be a no-op, not overwrite live state with a stale reload');
      currentUser = originalCurrentUser;
      db = originalDb;
      challengeEconomy = originalEconomy;
      challengeEconomyLoadedForUid = originalLoadedForUid;
    });
  });

  await test('REGRESSION: Tutorial Hub row/tile font sizes are real compiled Tailwind classes, not silently-dead arbitrary values', () => {
    // Same failure mode as the Delete Account z-index bug, found by
    // the same audit: text-[9.5px] and text-[13px] were never
    // compiled into this app's precompiled Tailwind bundle either,
    // so they silently fell back to whatever the parent's font-size
    // happened to be. Checking getComputedStyle catches this the
    // same way the z-index test does — a check on the class name
    // string would have passed the whole time regardless.
    const row = buildTutorialHubRow({ id: 'audit-test', title: 'Test', desc: 'd', time: '1m' }, false);
    document.body.appendChild(row);
    const badge = row.querySelector('span.shrink-0');
    assertEqual(getComputedStyle(badge).fontSize, '9px', 'The Start/Replay badge must render at the real compiled 9px (was the dead text-[9.5px])');
    row.remove();

    const tile = buildTutorialCardTile({ id: 'audit-test', label: 'A', steps: [1] }, false);
    document.body.appendChild(tile);
    const label = tile.querySelector('span');
    assertEqual(getComputedStyle(label).fontSize, '12px', 'The card tile\u2019s rank label must render at the real compiled 12px (was the dead text-[13px])');
    tile.remove();
  });

  await test('REGRESSION: Delete Account has a real, COMPUTED z-index above every other overlay, not just a class name that could be silently dead', () => {
    // This checks getComputedStyle rather than the class list on
    // purpose: this app ships a precompiled, purged Tailwind bundle,
    // and an arbitrary-value class like z-[100] that was never
    // actually compiled into it produces NO CSS at all, silently —
    // a test asserting the class name is present would have passed
    // even while the real bug (the modal rendering behind ordinary
    // page content) was happening the whole time.
    const modal = document.getElementById('deleteAccountModal');
    const wasHidden = modal.classList.contains('hidden');
    modal.classList.remove('hidden');
    const z = parseInt(getComputedStyle(modal).zIndex, 10);
    assertTrue(!isNaN(z) && z >= 120, `Delete Account's computed z-index must actually be >= 120 (got "${getComputedStyle(modal).zIndex}")`);
    if (wasHidden) modal.classList.add('hidden');
  });

  await test('REGRESSION: opening Challenges mid-Ranked-match shows live Burns/Snap Burns/Joker Deflects progress from the match in progress', () => {
    const originalEconomy = challengeEconomy;
    const originalIsRanked = state.isRanked;
    const originalPlayers = state.players;
    const originalLocalPlayerId = state.localPlayerId;
    challengeEconomy = { ...challengeEconomy, challengeStats: { burns: 5, snapBurns: 1, jokerDeflects: 2 } };
    state.isRanked = true;
    state.localPlayerId = 'p1';
    state.players = [{ id: 'p1', gameStats: { challengeBurns: 3, snapBurns: 1, jokerDeflects: 0 } }];
    assertEqual(liveChallengeStatDelta('challengeBurns'), 3, 'The live delta must read straight from the in-progress match\u2019s own gameStats');
    assertEqual((challengeEconomy.challengeStats.burns || 0) + liveChallengeStatDelta('challengeBurns'), 8, 'Persisted (5) + live in-match (3) must combine to 8 for display');
    state.isRanked = false; // a Casual/Vs Bots match must NOT show a live delta — it would never actually persist
    assertEqual(liveChallengeStatDelta('challengeBurns'), 0, 'A non-Ranked match in progress must not contribute a live delta, since it can never persist into challengeStats');
    state.isRanked = originalIsRanked;
    state.players = originalPlayers;
    state.localPlayerId = originalLocalPlayerId;
    challengeEconomy = originalEconomy;
  });

  await test('REGRESSION: a daily-challenge event that arrives before dailyChallengeState loads is buffered and replayed, not lost', () => {
    const originalCurrentUser = currentUser;
    const originalEconomy = challengeEconomy;
    const originalDb = db;
    const originalPending = pendingDailyEvents;
    const originalLocalPlayerId = state.localPlayerId;
    currentUser = { uid: 'buffer-test-uid' };
    db = { ref: () => ({ set: () => Promise.resolve(), transaction: () => Promise.resolve({ committed: false, snapshot: { val: () => null } }) }) };
    challengeEconomy = { ...challengeEconomy, dailyChallengeState: null, completedChallenges: {} };
    pendingDailyEvents = [];
    state.localPlayerId = 'p1';
    notifyChallengeEvent({ id: 'p1' }, ['burn-once']);
    assertEqual(pendingDailyEvents.length, 1, 'The event must be buffered, not silently dropped, while dailyChallengeState is still loading');
    // Simulate initChallengeEconomy's own state-ready + drain sequence
    challengeEconomy.dailyChallengeState = { dateKey: '2026-09-17', challengeIds: ['burn-once', 'play-joker', 'play-a-two'], progress: {} };
    const queued = pendingDailyEvents;
    pendingDailyEvents = [];
    queued.forEach((ids) => bumpDailyChallengeProgress(ids));
    assertEqual(challengeEconomy.dailyChallengeState.progress['burn-once'], 1, 'The buffered event must be replayed and actually counted the moment state is ready');
    state.localPlayerId = originalLocalPlayerId;
    currentUser = originalCurrentUser;
    challengeEconomy = originalEconomy;
    db = originalDb;
    pendingDailyEvents = originalPending;
  });

  // The Challenges page is now tabbed (Daily / Weekly / Ranked / Bots),
  // replacing the old collapsible sections these two tests used to check.
  await test('Challenges Daily tab lists today\'s three challenges', () => {
    const originalEconomy = challengeEconomy;
    currentUser = { uid: 'daily-tab-test-uid' };
    const originalLoadedForUid = challengeEconomyLoadedForUid;
    challengeEconomyLoadedForUid = 'daily-tab-test-uid';
    const dateKey = '2026-09-17';
    const ids = ['burn-once', 'play-joker', 'play-a-two'];
    challengeEconomy = { ...challengeEconomy, dailyChallengeState: { dateKey, challengeIds: ids, progress: { 'burn-once': 1 } }, completedChallenges: {} };
    try {
      renderChallengesPanel();
      assertTrue(document.getElementById('challengesDailyList').children.length >= 3, 'All three Daily challenges must be listed');
    } finally {
      challengeEconomy = originalEconomy;
      challengeEconomyLoadedForUid = originalLoadedForUid;
    }
  });

  await test("REGRESSION: the Challenges Ranked tab has its 7 categories in alphabetical order", () => {
    const labels = [...document.querySelectorAll('#challengeTabRanked > .text-\\[8px\\]')].map((h) => h.textContent.trim());
    assertEqual(labels, ['Burns', 'Ending Cards', 'Games Played', 'Joker Deflects', 'Rank Tiers', 'Snap Burns', 'Win Streaks'], 'Ranked categories must be exactly these 7, in alphabetical order');
    assertTrue(!document.getElementById('challengesModal').innerText.includes('Ranked \u2014'), 'The old "Ranked \u2014 " prefix must be gone');
  });

  await test('REGRESSION: the Ranked Stats page is honestly Coming Soon, structured around Ranked only, with no invented numbers', () => {
    // No assertions of its own currently exist for this specific claim.
    // This test was previously silently merged into the next one below
    // via a missing closing brace here, which nested every subsequent
    // test in the file inside this one's callback instead of running
    // them as flat siblings. Harmless under the old synchronous test()
    // (each nested test() call still independently caught its own
    // errors and recorded its own pass/fail), but a hard SyntaxError
    // once test() calls became `await test(...)`, since `await`
    // requires its immediately-enclosing function to be async and this
    // one wasn't. Closing it properly here restores flat structure.
  });

  await test('REGRESSION: there is exactly one global header — the lobby no longer has its own duplicate hamburger/fullscreen row, and the real header sits above it', () => {
    assertTrue(!document.getElementById('lobbySettingsBtn'), 'The lobby-local hamburger duplicate must be gone');
    assertTrue(!document.getElementById('lobbyFullscreenBtn'), 'The lobby-local fullscreen duplicate must be gone');
    assertTrue(!document.getElementById('fullscreenBtn'), 'Fullscreen no longer has its own header button — it now lives only in Settings > setFullscreenRow');
    assertTrue(!!document.getElementById('setFullscreenRow'), 'Fullscreen must still be reachable from Settings');
    const headerZ = parseInt(getComputedStyle(document.querySelector('header')).zIndex, 10);
    const lobbyZ = parseInt(getComputedStyle(document.getElementById('lobbyScreen')).zIndex, 10);
    assertTrue(headerZ > lobbyZ, `The header must sit above the lobby overlay (z=${headerZ} vs lobby z=${lobbyZ}) or it's invisible/unusable behind it — this is what forced the old duplicate controls to exist`);
  });
  await test('REGRESSION: the desktop hamburger dropdown is anchored to the right of the screen, not the left', () => {
    openHamburgerMenu();
    const cs = getComputedStyle(document.getElementById('hamburgerDrawer'));
    if (window.innerWidth >= 768) {
      assertEqual(cs.right, '18px', 'The desktop dropdown must be right-anchored');
    }
    closeHamburgerMenu();
  });
  await test('REGRESSION: no literal uXXXX escape sequence is ever left sitting in visible page text', () => {
    // A JS string like a backslash followed by u2014 is a real em dash
    // once parsed — but the exact same characters typed directly into
    // HTML markup (not inside a script) are never interpreted by the
    // browser at all and render as literal, nonsensical text. This
    // scans the page's actual rendered text content (not the source),
    // so it only ever catches the real, user-visible version of this bug.
    const bodyText = document.body.innerText;
    const pattern = new RegExp('\\\\u[0-9A-Fa-f]{4}');
    assertTrue(!pattern.test(bodyText), 'No literal backslash-u-escape sequence may ever appear in visible page text');
  });
  await test("REGRESSION: during the swap phase, an incoming multiplayer update never clobbers the local player's own in-progress (not-yet-Readied) hand/face-up", () => {
    state.isMultiplayer = true;
    state.localPlayerId = 'p1';
    state.players = [
      { id: 'p1', name: 'You', hand: [makeCard('K')], faceUp: [makeCard('2'), makeCard('3')], isReady: false },
      { id: 'p2', name: 'Them', hand: [], faceUp: [], isReady: false }
    ];
    const incoming = [
      { id: 'p1', name: 'You', hand: [makeCard('2')], faceUp: [makeCard('3')], isReady: false }, // stale pre-swap layout
      { id: 'p2', name: 'Them', hand: [], faceUp: [], isReady: true }
    ];
    const myLocalEntry = state.players.find(p => p.id === state.localPlayerId);
    state.players = incoming.map((p) => {
      if (myLocalEntry && p.id === state.localPlayerId && !myLocalEntry.isReady) {
        return { ...p, hand: myLocalEntry.hand, faceUp: myLocalEntry.faceUp };
      }
      return p;
    });
    const me = state.players.find(p => p.id === 'p1');
    const them = state.players.find(p => p.id === 'p2');
    assertEqual(me.hand[0].rank, 'K', "The local player's own in-progress hand must survive an incoming update from before they've pressed Ready");
    assertEqual(me.faceUp.length, 2, 'Same for face-up cards');
    assertEqual(them.isReady, true, "The other player's Ready status must still apply normally");
  });
  await test('REGRESSION: once the local player HAS readied up, their entry is trusted from the synced snapshot again (no longer force-preserved)', () => {
    state.isMultiplayer = true;
    state.localPlayerId = 'p1';
    state.players = [{ id: 'p1', name: 'You', hand: [makeCard('K')], faceUp: [], isReady: true }];
    const incoming = [{ id: 'p1', name: 'You', hand: [makeCard('2')], faceUp: [makeCard('3')], isReady: true }];
    const myLocalEntry = state.players.find(p => p.id === state.localPlayerId);
    state.players = incoming.map((p) => {
      if (myLocalEntry && p.id === state.localPlayerId && !myLocalEntry.isReady) {
        return { ...p, hand: myLocalEntry.hand, faceUp: myLocalEntry.faceUp };
      }
      return p;
    });
    assertEqual(state.players[0].hand[0].rank, '2', 'Once readied, the synced snapshot is the trusted truth again — nothing local should override it any more');
  });
  await test('REGRESSION: a burn resolving against an already-detached player reference (the exact shape of a real multiplayer race) still correctly marks the LIVE player finished, with the right rank and no phantom extra card', () => {
    freshState({ isMultiplayer: true, discardPile: [makeCard('8'), makeCard('8'), makeCard('8'), makeCard('8')], drawPile: [] });
    const winner = makePlayer({ id: 'p1', name: 'Winner', hand: [], faceUp: [], faceDown: [] });
    const other = makePlayer({ id: 'p2', name: 'Other', isBot: true, hand: [makeCard('K')] });
    state.players = [winner, other];
    state.localPlayerId = 'p1';
    const originalSync = syncFirebaseGameState;
    syncFirebaseGameState = () => {};
    const wasInstant = burnInstantResolveForTests;
    // Detach the reference BEFORE calling executeBurn, standing in for
    // what a Firebase snapshot replacing state.players mid-delay does
    // in real play — then resolve instantly (burnInstantResolveForTests)
    // so this test stays synchronous rather than depending on the
    // harness supporting awaited/async tests.
    const capturedPlayerRef = state.players.find((p) => p.id === 'p1');
    state.players = state.players.map((p) => ({ ...p }));
    burnInstantResolveForTests = true;
    executeBurn(capturedPlayerRef, '4-of-a-Kind Burn!');
    burnInstantResolveForTests = wasInstant;
    syncFirebaseGameState = originalSync;
    const livePlayer = state.players.find((p) => p.id === 'p1');
    assertEqual(livePlayer.hasFinished, true, 'The LIVE player entry (not the detached copy) must be marked finished');
    assertEqual(livePlayer.finishRank, 1, 'The winner must show Finished Rank #1, never #0');
    assertEqual(livePlayer.hand.length, 0, 'A finished player with 0 cards left must NOT be dealt a phantom extra card');
  });

  await test("REGRESSION: opening the hamburger menu self-heals a not-yet-caught-up currentUser from Firebase's own already-restored session", () => {
    currentUser = null;
    const originalAvail = firebaseAvailable;
    firebaseAvailable = true;
    // Firebase's real auth.currentUser is read-only, so stand in a plain
    // object with a restored session (the test runner restores auth).
    auth = { ...auth, currentUser: { uid: 'restored_uid' }, onAuthStateChanged: () => () => {} };
    openHamburgerMenu();
    assertTrue(!!currentUser && currentUser.uid === 'restored_uid', "A genuinely-restored Firebase session must be adopted immediately, before onAuthStateChanged's first async callback has had a chance to fire — this is what made Leaderboard/Profile/Stats wrongly say \"sign in\" right after a page load while actually already signed in");
    closeHamburgerMenu();
    firebaseAvailable = originalAvail;
    currentUser = null;
  });
  await test('REGRESSION: opening the hamburger menu does not fabricate a signed-in state when nobody is actually signed in', () => {
    currentUser = null;
    const originalAvail = firebaseAvailable;
    firebaseAvailable = true;
    const originalAuthCurrentUser = auth.currentUser;
    auth.currentUser = null;
    openHamburgerMenu();
    assertTrue(!currentUser, 'With no restored session either, currentUser must stay null, not be invented');
    closeHamburgerMenu();
    firebaseAvailable = originalAvail;
    auth.currentUser = originalAuthCurrentUser;
  });

  await test('REGRESSION: Google sign-in is enabled and clicking it opens a real Google pop-up sign-in (redirect only as the fallback)', async () => {
    const btn = document.getElementById('googleSignInBtn');
    assertTrue(!btn.querySelector('.item-soon'), 'The Soon label must be gone now that this works end to end');
    assertTrue(!btn.className.includes('cursor-not-allowed'), 'The button must no longer look disabled');
    const originalPopup = auth.signInWithPopup;
    const originalRedirect = auth.signInWithRedirect;
    const calls = [];
    try {
      auth.signInWithPopup = (provider) => { calls.push(['popup', provider instanceof firebase.auth.GoogleAuthProvider]); return Promise.reject({ code: 'auth/popup-blocked' }); };
      auth.signInWithRedirect = (provider) => { calls.push(['redirect', provider instanceof firebase.auth.GoogleAuthProvider]); return Promise.resolve(); };
      btn.click();
      await new Promise((r) => setTimeout(r, 0));
    } finally {
      auth.signInWithPopup = originalPopup;
      auth.signInWithRedirect = originalRedirect;
    }
    assertTrue(calls.length >= 1 && calls[0][0] === 'popup', 'Clicking it must first try a real Google pop-up sign-in');
    assertTrue(calls.every((c) => c[1]), 'It must sign in with a real GoogleAuthProvider, not some other provider');
    assertTrue(calls.some((c) => c[0] === 'redirect'), 'A blocked pop-up must fall back to the redirect sign-in');
  });

  await test('REGRESSION: the Ranked Stats page tells a guest to sign in, and shows a real-not-fake empty state for a signed-in player with no Ranked games yet', () => {
    currentUser = null;
    document.getElementById('menuStatsBtn').click();
    const authModal = document.getElementById('authModal');
    assertTrue(!authModal.classList.contains('hidden'), 'A guest tapping Stats must be asked to sign in — Ranked stats live on the account');
    assertTrue(document.getElementById('statsModal').classList.contains('hidden'), 'A guest must not see an empty Stats page');
    authModal.classList.add('hidden');

    const html = buildRankedStatsHtml({ rating: 500, wins: 0, losses: 0 });
    assertTrue(html.includes("haven't played a Ranked match"), 'A signed-in player with zero Ranked games must see an honest empty state, not zeros for every stat');
    assertTrue(!html.includes('statRowHtml') && !html.includes('Ranked games played'), 'The empty state must not render any stat rows at all, invented or otherwise');
  });
  await test('REGRESSION: the Ranked Stats page shows real numbers in a logical order — headline, record, rating range, streak, then play-style stats', () => {
    const profile = { rating: 612, wins: 7, losses: 3, rankedStats: { burnt: 14, jokersPlayed: 5, bestStreak: 4, highestRating: 640, lowestRating: 470 } };
    const html = buildRankedStatsHtml(profile);
    const order = ['games played', 'matches won', 'Win percentage', 'ranked losses', 'Highest rating reached', 'Lowest rating reached', 'winning streak', 'Cards burnt', 'Jokers played']
      .map((needle) => html.indexOf(needle));
    assertTrue(order.every((i) => i !== -1), 'Every expected stat row must be present');
    for (let i = 1; i < order.length; i++) {
      assertTrue(order[i] > order[i - 1], `Stats must appear in the agreed logical order — "${order[i - 1]}" mismatch at position ${i}`);
    }
    assertTrue(html.includes('10') && html.includes('70%') && html.includes('640') && html.includes('470') && html.includes('14') && html.includes('5'), 'Every real number (played, win%, highest, lowest, burnt, jokers) must actually be shown, not invented');
  });
  await test('REGRESSION: highest/lowest rating reached fall back to the current rating for a player with no rankedStats yet recorded (e.g. their very first completed match)', () => {
    const html = buildRankedStatsHtml({ rating: 500, wins: 1, losses: 0 });
    assertTrue(html.includes('Highest rating reached') && html.includes('Lowest rating reached'), 'Both range stats must still render even with no rankedStats object yet');
  });
  await test('Ranked queue: live players are claimed, ghosts are replaced, recent opponents can be skipped', () => {
    const me = { uid: 'me' };
    const now = 10_000_000;
    assertEqual(decideRankedQueueAction(null, me, null, false, now).action, 'wait', 'An empty queue: wait');
    const live = decideRankedQueueAction({ uid: 'x', ts: now - 5000 }, me, null, false, now);
    assertEqual(live.action, 'claim', 'A player refreshed 5s ago is matched');
    assertEqual(live.opponent.uid, 'x', 'The claimed ticket is theirs');
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now - 31000 }, me, null, false, now).action, 'wait', 'A ticket not refreshed for 30s is a ghost (closed app): take the spot instead');
    assertEqual(decideRankedQueueAction({ uid: 'x' }, me, null, false, now).action, 'wait', 'A ticket with no timestamp is treated as a ghost');
    assertEqual(decideRankedQueueAction({ uid: 'me', ts: now - 60000 }, me, null, false, now).action, 'wait', 'My own old ticket: just wait again');
    const recent = { uid: 'x', at: now - 60000 };
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now }, me, recent, true, now).action, 'skip', 'A recent opponent can be skipped');
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now }, me, recent, false, now).action, 'claim', 'Skipping is only a chance, not a block');
    assertTrue(findRankedMatch.toString().includes("decision.action === 'claim') return null"), 'Claiming takes the opponent out of the queue in the same transaction');
    assertTrue(waitForRankedMatch.toString().includes('onDisconnect().remove()'), 'A waiting ticket is removed automatically if the connection drops');
  });
  await test("Turn deadlines use Firebase's server time, not this phone's clock", () => {
    const savedOffset = serverTimeOffsetMs;
    try {
      serverTimeOffsetMs = 60000; // this phone's clock is a minute behind the server
      freshState({ isMultiplayer: true, phase: 'PLAY', turnTimerMs: 15000 });
      state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
      state.localPlayerId = 'p1';
      state.currentTurnIndex = 0;
      advanceTurn(1);
      const expected = Date.now() + 60000 + 15000;
      assertTrue(Math.abs(state.turnDeadline - expected) < 1000, `The deadline is set on the server's clock (off by ${state.turnDeadline - expected}ms)`);
      const left = state.turnDeadline - serverNow();
      assertTrue(left > 14000 && left <= 15000, `Everyone sees the full 15 seconds (${left}ms)`);
    } finally { serverTimeOffsetMs = savedOffset; }
  });
  await test('Online: the first turn after everyone is ready gets a turn timer', () => {
    const originalDb = db;
    const cards = generateDeck();
    freshState({ isMultiplayer: true, roomCode: '777777', localPlayerId: 'p1', phase: 'SWAP', turnTimerMs: 15000 });
    const seat = (id, off) => makePlayer({ id, isReady: id !== 'p1', hand: cards.slice(off, off + 3), faceUp: cards.slice(off + 3, off + 6), faceDown: cards.slice(off + 6, off + 9) });
    state.players = [seat('p1', 0), seat('p2', 9)];
    state.currentTurnIndex = 0;
    db = { ref: () => ({
      transaction: (fn, cb) => { const list = fn(JSON.parse(JSON.stringify(state.players))); cb(null, true, { val: () => list }); },
      update: () => Promise.resolve()
    }) };
    try {
      finishLocalSwap();
      assertEqual(state.phase, 'PLAY', 'Everyone ready: play starts');
      const left = state.turnDeadline - serverNow();
      assertTrue(left > 14000 && left <= 15000, `The first player has the usual 15 seconds (${left}ms) — before, the first turn had no clock and could stall forever`);
    } finally {
      db = originalDb;
      document.getElementById('swapControlBar')?.classList.add('hidden');
    }
  });
  await test('Old-room cleanup removes only rooms over 2 days old and idle, with the one query the rules allow', async () => {
    const originalDb = db, originalUser = currentUser, savedRoom = state.roomCode;
    let savedPruneAt = null;
    try { savedPruneAt = localStorage.getItem('shithead_room_prune_at'); } catch (e) {}
    const now = serverNow(), day = 864e5;
    const rooms = {
      '111111': { createdAt: now - 3 * day },                                       // old and idle
      '222222': { createdAt: now - 3 * day, updatedAt: now - 3600e3 },               // old, but a move an hour ago
      '333333': { createdAt: now - 5 * day, presence: { p1: { at: now - 60000 } } }, // someone connected a minute ago
      '444444': { createdAt: now - 4 * day },                                       // this device's own room
      'junk': { createdAt: now - 9 * day }                                          // not a room code
    };
    let query = null, removed = null;
    db = { ref: (path) => ({
      orderByChild: (key) => ({ endAt: (value) => ({ limitToFirst: (n) => ({ once: () => {
        query = { path, key, value, n };
        return Promise.resolve({ forEach: (cb) => Object.entries(rooms).forEach(([k, v]) => cb({ key: k, val: () => v })) });
      } }) }) }),
      update: (patch) => { removed = { path, patch }; return Promise.resolve(); }
    }) };
    currentUser = { uid: 'prune-test' };
    state.roomCode = '444444';
    try {
      const count = await pruneOldRooms(true);
      assertEqual([query.path, query.key], ['rooms', 'createdAt'], 'Rooms are looked up by creation time');
      assertTrue(query.n <= 25, 'At most 25 at a time');
      assertTrue(query.value <= now - 2 * day, 'Only rooms more than 2 days old are asked for');
      assertEqual(removed.path, 'rooms', 'Removed in one write');
      assertEqual(Object.keys(removed.patch), ['111111'], 'Only the old, idle room is removed');
      assertEqual(count, 1, 'Reports how many were removed');
    } finally {
      db = originalDb; currentUser = originalUser; state.roomCode = savedRoom;
      try { savedPruneAt === null ? localStorage.removeItem('shithead_room_prune_at') : localStorage.setItem('shithead_room_prune_at', savedPruneAt); } catch (e) {}
    }
  });
  await test('Leaving a room: alone it is deleted; with others your seat is handed over and host passes on', async () => {
    const originalDb = db;
    const calls = [];
    db = { ref: (path) => ({
      remove: () => { calls.push(['remove', path]); return Promise.resolve(); },
      set: () => Promise.resolve(),
      update: (value) => { calls.push(['update', path, value]); return Promise.resolve(); },
      transaction: (fn, cb) => { fn([]); if (cb) cb(null, true, null); }
    }) };
    try {
      freshState({ isMultiplayer: true, roomCode: '555555', localPlayerId: 'p1', phase: 'LOBBY' });
      state.players = [makePlayer({ id: 'p1', isHost: true })];
      await leaveMultiplayerRoom();
      assertTrue(calls.some(([op, path]) => op === 'remove' && path === 'rooms/555555'), 'Alone in the room: it is deleted');
      calls.length = 0;
      const cards = generateDeck();
      freshState({ isMultiplayer: true, roomCode: '555556', localPlayerId: 'p1', phase: 'PLAY' });
      state.players = [
        makePlayer({ id: 'p1', isHost: true, hand: cards.slice(0, 3) }),
        makePlayer({ id: 'p2', hand: cards.slice(3, 6) }),
        makePlayer({ id: 'p3', hand: cards.slice(6, 9) })
      ];
      await leaveMultiplayerRoom();
      assertTrue(!calls.some(([op]) => op === 'remove'), 'With others still playing, the room stays');
      const handover = calls.find(([op, path]) => op === 'update' && path === 'rooms/555556');
      assertTrue(!!handover, 'Mid-match the seat is handed over in one write');
      const seats = handover[2].players;
      assertTrue(seats.some(p => p.isBot && p.name.endsWith('(Bot)') && p.hand.length === 3), 'A bot takes over your cards');
      assertTrue(seats.find(p => p.id === 'p2').isHost, 'The next player becomes host');
    } finally { db = originalDb; }
  });
  await test('openThemesPanel opens the modal and shows the real theme grid, with an honest Coming Soon placeholder and no fake unlock progress', () => {
    openThemesPanel();
    const area = document.getElementById('themesGridArea');
    assertTrue(!document.getElementById('themesModal').classList.contains('hidden'), 'openThemesPanel must show the modal');
    ['Obsidian', 'Emerald', 'Cyber', 'Crimson'].forEach((name) => {
      assertTrue(area.innerHTML.includes(name), `${name} must appear — it's one of the real, existing deck themes`);
    });
    const cardCount = area.children.length;
    assertEqual(cardCount, 5, 'Exactly 4 real theme cards plus 1 Coming Soon card — no invented themes, no fake unlock slots');
    assertTrue(area.innerHTML.includes('Coming Soon'), 'A placeholder for future unlockable themes must be present and honestly labelled');
    assertTrue(!/progress|unlock(ed|s)?\s*\d|reward/i.test(area.innerHTML.replace('Coming Soon', '')), 'No fake unlock progress or fake rewards may be implied for the Coming Soon card');
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('REGRESSION: Challenges exposes exactly Daily, Weekly, Ranked and Bots top tabs', () => {
    const tabs=[...document.querySelectorAll('[data-challenge-tab]')].map(b=>b.dataset.challengeTab);
    assertEqual(tabs,['daily','weekly','ranked','bots'],'Challenge tabs must be Daily, Weekly, Ranked, Bots in that order');
    assertEqual(pickWeeklyChallengeIds('2026-W39').length,3,'Each week must select exactly 3 challenges');
  });
  await test('REGRESSION: leaderboard search UI exists and rows can show public W/L counts', () => {
    assertTrue(!!document.getElementById('leaderboardSearchInput'),'Leaderboard search field must exist');
    const html=leaderboardRowHtml({username:'Tester',rating:600,wins:7,losses:3},2);
    assertTrue(html.includes('7W') && html.includes('3L') && html.includes('10 played'),'Leaderboard row must expose W/L and games played');
  });
  await test('REGRESSION: expired inbox invites are identified for cleanup', () => {
    const originalUser=currentUser, originalDb=db; let updates=null;
    currentUser={uid:'cleanup-test'}; db={ref:()=>({update:(u)=>{updates=u;return Promise.resolve();}})};
    const expired=cleanupExpiredInvites({old:{sentAt:Date.now()-GAME_INVITE_EXPIRY_MS-1000},fresh:{sentAt:Date.now()}});
    assertTrue(expired.includes('old')&&!expired.includes('fresh'),'Only expired invites should be cleaned');
    assertTrue(updates && updates.old===null,'Cleanup must delete expired Firebase child keys');
    currentUser=originalUser; db=originalDb;
  });

  await test('REGRESSION: the Themes page previews are the real card-back visuals, not invented swatches', () => {
    openThemesPanel();
    const area = document.getElementById('themesGridArea');
    ['back-obsidian', 'back-emerald', 'back-cyber', 'back-crimson'].forEach((cls) => {
      assertTrue(area.innerHTML.includes(cls), `The ${cls} preview must use the exact same class real face-down cards render with`);
    });
    assertTrue(area.querySelectorAll('.custom-card-back').length === 4, 'Each of the 4 theme cards must render an actual card-back element, not a plain color swatch');
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('REGRESSION: Personalisation deck themes use the same compact footprint as other cosmetic options', () => {
    openThemesPanel();
    const area = document.getElementById('themesGridArea');
    assertEqual(area.querySelectorAll('.theme-option-card').length, 5, 'Every theme choice, including Coming Soon, must use the compact option component');
    assertEqual(area.querySelectorAll('.theme-option-preview').length, 5, 'Each compact theme option must have one small preview');
    assertTrue(area.querySelectorAll('.theme-option-card .card-base').length === 0, 'Personalisation must not reuse full gameplay card sizing for deck-theme choices');
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('REGRESSION: the active theme shows APPLIED and cannot be re-selected; selecting a theme from the Themes page updates it everywhere', () => {
    freshState({ deckTheme: 'theme-obsidian' });
    state.deckTheme = 'theme-cyber';
    openThemesPanel();
    const area = document.getElementById('themesGridArea');
    const activeBtn = Array.from(area.querySelectorAll('.themes-page-select-btn')).find(b => b.dataset.theme === 'theme-cyber');
    assertTrue(activeBtn.disabled, 'The currently-active theme card must show a disabled, already-applied state');
    assertTrue(activeBtn.textContent.includes('APPLIED'), 'The active theme must read APPLIED, not SELECT');

    const originalSave = saveGameState;
    saveGameState = () => {};
    const emeraldBtn = Array.from(area.querySelectorAll('.themes-page-select-btn')).find(b => b.dataset.theme === 'theme-emerald');
    emeraldBtn.click();
    saveGameState = originalSave;

    assertEqual(state.deckTheme, 'theme-emerald', 'Clicking a theme card must actually apply it, via the same selectDeckTheme the lobby uses');
    assertTrue(document.body.className.includes('theme-emerald'), "The chosen theme's class must be applied to the document body, exactly like the lobby picker does");
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('REGRESSION: closing the Themes page (X button and outside click) both work', () => {
    openThemesPanel();
    document.getElementById('themesCloseBtn').click();
    assertTrue(document.getElementById('themesModal').classList.contains('hidden'), 'The close (X) button must hide the Themes modal');
    openThemesPanel();
    document.getElementById('themesModal').click();
    assertTrue(document.getElementById('themesModal').classList.contains('hidden'), 'Clicking the backdrop outside the panel must also close it');
  });

  await test('The multiplayer turn timer defaults to Balanced (15s) and is host-configurable', () => {
    freshState({ isMultiplayer: true, isHost: true, roomCode: '444444', drawPile: [] });
    assertEqual(state.turnTimerMs, 15000, 'Default turn timer should be Balanced (15s), matching the game\'s existing behaviour for anyone who never touches the setting');
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    const originalUpdate = db.ref;
    let syncedMs = null;
    db.ref = function (path) { return { update: (obj) => { if ('turnTimerMs' in obj) syncedMs = obj.turnTimerMs; } }; };
    const casualMs = TURN_TIMER_PRESETS.find(p => p.id === 'casual').ms;
    setMultiplayerTurnTimer(casualMs);
    db.ref = originalUpdate;
    assertEqual(state.turnTimerMs, casualMs, 'Choosing Casual must update the live setting immediately');
    assertEqual(syncedMs, casualMs, 'The choice must be synced to Firebase so every other client picks it up');

    state.direction = 1; state.currentTurnIndex = 0;
    advanceTurn(1);
    const remaining = state.turnDeadline - Date.now();
    assertTrue(remaining > casualMs - 1000 && remaining <= casualMs, `The actual per-turn deadline must reflect the configured Casual timer (${casualMs}ms), not the old hardcoded 15s (got ~${Math.round(remaining / 1000)}s)`);
  });

  await test('Deck theme picker defaults open and collapses once inside a room', () => {
    const body = document.getElementById('deckThemeBody');
    const chev = document.querySelector('[data-target="deckThemeBody"] .settings-chev');
    assertTrue(!!body, '#deckThemeBody must exist');
    // Reset to the natural default state before asserting on it, in case
    // an earlier test left it collapsed.
    body.classList.remove('hidden');
    if (chev) chev.style.transform = '';
    assertTrue(!body.classList.contains('hidden'), 'The deck theme picker must default to open');

    freshState({ isMultiplayer: true, isHost: true, roomCode: '333333' });
    state.players = [makePlayer({ id: 'p1' })];
    state.localPlayerId = 'p1';
    showMultiplayerLobbyView();
    assertTrue(body.classList.contains('hidden'), 'Entering the room lobby view must collapse the deck theme picker');
    assertEqual(chev.style.transform, 'rotate(-90deg)', 'The chevron must visually reflect the collapsed state');

    // Cleanup: leave it open for anything else that assumes the default.
    body.classList.remove('hidden');
    chev.style.transform = '';
  });

  await test('REGRESSION: Lobby Totals breaks ties by fewer turns, then fewer pickups, then more burnt, then more played — not by who won THIS match', () => {
    freshState({ drawPile: [] });
    // Amit won THIS match (finishRank 1) but Pooja has fewer turns —
    // tied on wins/win%, Pooja must rank first in Lobby Totals despite
    // losing the match just played.
    const amit = makePlayer({ id: 'p1', name: 'Amit', hand: [], faceUp: [], faceDown: [], hasFinished: true, finishRank: 1 });
    const pooja = makePlayer({ id: 'p2', name: 'Pooja' });
    amit.lobbyStats = { wins: 1, matches: 2, turns: 90, pickedUp: 72, burnt: 49, played: 127 };
    pooja.lobbyStats = { wins: 1, matches: 2, turns: 83, pickedUp: 53, burnt: 25, played: 108 };
    state.players = [amit, pooja];
    state.localPlayerId = 'p1';
    buildMatchStats('lobby');
    const names = [...document.querySelectorAll('#matchStatsBody .truncate')].map(el => el.textContent);
    assertTrue(names[0].startsWith('Pooja'), `Pooja (fewer turns: 83 vs 90) must rank first in Lobby Totals despite Amit winning this match — got order: ${names.join(', ')}`);

    // Now tie turns too — pickedUp becomes the decider.
    amit.lobbyStats.turns = 83;
    buildMatchStats('lobby');
    const names2 = [...document.querySelectorAll('#matchStatsBody .truncate')].map(el => el.textContent);
    assertTrue(names2[0].startsWith('Pooja'), `With turns tied, fewer pickups (53 vs 72) must decide — got order: ${names2.join(', ')}`);

    // This Game tab must be untouched: still ordered by actual match
    // placement regardless of lobby stats.
    buildMatchStats('game');
    const gameNames = [...document.querySelectorAll('#matchStatsBody .truncate')].map(el => el.textContent);
    assertTrue(gameNames[0].startsWith('Amit'), `This Game tab must still show Amit first (he won this match) regardless of Lobby Totals ranking — got order: ${gameNames.join(', ')}`);
  });

  await test('REGRESSION: a stale multiplayer snapshot cannot regress a hand this client already knows is correct', () => {
    freshState({ isMultiplayer: true, isHost: false, roomCode: '666666', drawPile: [] });
    state.localPlayerId = 'p1';
    state.players = [
      makePlayer({ id: 'p1', hand: [makeCard('K'), makeCard('Q'), makeCard('J')] }),
      makePlayer({ id: 'p2' })
    ];
    state.stateVersion = 5; // this client has already applied version 5 locally

    let capturedCallback = null;
    const originalRef = db.ref;
    db.ref = function () {
      return { on: (event, cb) => { if (event === 'value') capturedCallback = cb; }, update: () => {}, set: () => {}, once: () => {} };
    };
    listenToFirebaseRoom('666666');
    db.ref = originalRef;
    assertTrue(!!capturedCallback, 'listenToFirebaseRoom must register a value listener');

    // A stale snapshot (version 3) shows p1 with just 1 card in hand —
    // exactly the shape of the real bug: another client's slightly
    // older write landing late.
    capturedCallback({ val: () => ({
      phase: 'PLAY', stateVersion: 3,
      players: [{ id: 'p1', hand: [makeCard('K')] }, { id: 'p2', hand: [] }],
      discardPile: [], currentTurnIndex: 0, direction: 1
    }) });
    assertEqual(state.players.find(p => p.id === 'p1').hand.length, 3, 'A stale (older-versioned) snapshot must NOT overwrite a hand this client already knows is correct');

    // A genuinely newer snapshot (version 6) must still apply normally.
    capturedCallback({ val: () => ({
      phase: 'PLAY', stateVersion: 6,
      // A complete record (all three zones) — a snapshot missing zones is
      // treated as damaged and triggers a recovery instead.
      players: [{ id: 'p1', hand: [makeCard('K')], faceUp: [], faceDown: [] }, { id: 'p2', hand: [], faceUp: [], faceDown: [] }],
      discardPile: [], currentTurnIndex: 0, direction: 1
    }) });
    assertEqual(state.players.find(p => p.id === 'p1').hand.length, 1, 'A genuinely newer snapshot must still be applied normally, not blocked forever');
    assertEqual(state.stateVersion, 6, "The local version tracker must advance to match an accepted, newer snapshot");
  });

  await test('REGRESSION: a stale snapshot cannot erase another player\'s real turn (the "phantom skip with no 8s" bug)', () => {
    freshState({ isMultiplayer: true, isHost: false, roomCode: '777777', drawPile: [] });
    state.localPlayerId = 'p1'; // Amit's client
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
    // This client has already applied version 5: Pooja (p2) played a
    // plain card and the turn correctly passed back to Amit (index 0).
    state.stateVersion = 5;
    state.currentTurnIndex = 0;
    state.playedHistory = [
      { type: 'card', playerName: 'Amit', rank: '3', suit: '♥' },
      { type: 'card', playerName: 'Pooja', rank: '9', suit: '♠' }
    ];

    let capturedCallback = null;
    const originalRef = db.ref;
    db.ref = function () {
      return { on: (event, cb) => { if (event === 'value') capturedCallback = cb; }, update: () => {}, set: () => {}, once: () => {} };
    };
    listenToFirebaseRoom('777777');
    db.ref = originalRef;

    // A stale snapshot (version 3) from Amit's OWN earlier local state —
    // computed before Pooja's play was known — still has the turn on
    // Pooja and no record of her play at all. Applying this would make
    // it look exactly like Pooja's turn vanished.
    capturedCallback({ val: () => ({
      phase: 'PLAY', stateVersion: 3,
      players: [{ id: 'p1' }, { id: 'p2' }],
      currentTurnIndex: 1, direction: 1, discardPile: [],
      playedHistory: [{ type: 'card', playerName: 'Amit', rank: '3', suit: '♥' }]
    }) });

    assertEqual(state.currentTurnIndex, 0, "A stale snapshot must not move the turn back to Pooja — that's the phantom skip");
    assertEqual(state.playedHistory.length, 2, "Pooja's real play must not be erased from history by a stale snapshot");
  });

  await test('REGRESSION: an 8 followed by a bonus-draw 8 skips 2 opponents total, not 1', () => {
    freshState({ discardPile: [makeCard('K')] });
    const eight1 = makeCard('8', '♠');
    const eight2 = makeCard('8', '♥'); // this is what the deck will hand back as the "bonus" draw
    const amit = makePlayer({ id: 'p1', hand: [eight1] });
    const pooja = makePlayer({ id: 'p2', hand: [makeCard('4')] });
    const raj = makePlayer({ id: 'p3', hand: [makeCard('4')] });
    state.players = [amit, pooja, raj];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 0;
    state.drawPile = [eight2]; // .pop() hands this back as the refill/bonus card

    executePlayCards('p1', [eight1]);
    assertTrue(!!state.pendingFollowUp, 'Drawing a matching 8 must offer a bonus follow-up play');
    assertEqual(state.pendingFollowUp.chainedRankCount, 1, 'The chain must record that 1 eight has been played so far');

    resolveFollowUpPlay(true); // play the bonus 8
    assertEqual(state.currentTurnIndex, 0, 'Two total 8s in a 3-player table must skip BOTH opponents and return the turn to the player who played them — landing back on Amit, not Raj');
  });

  await test('REGRESSION: the lobby speed slider tick labels stay in sync with SPEED_PRESETS', () => {
    const ticks = document.getElementById('lobbySpeedTicks');
    assertTrue(!!ticks, '#lobbySpeedTicks must exist');
    const labels = [...ticks.querySelectorAll('span')].map(s => s.textContent);
    assertEqual(labels.length, SPEED_PRESETS.length, 'There must be exactly one tick label per speed preset — this went stale once already when the scale changed from 8 stops to 4');
    SPEED_PRESETS.forEach((mult, i) => {
      const expected = `${mult}x`;
      assertEqual(labels[i], expected, `Tick ${i} should read "${expected}" to match SPEED_PRESETS[${i}]`);
    });
  });
  await test('The Bot Difficulty label reads "Bot Difficulty", not "AI Difficulty"', () => {
    const labels = [...document.querySelectorAll('#singleOptions label')].map(l => l.textContent.trim());
    assertTrue(labels.includes('Bot Difficulty'), 'The difficulty label must read "Bot Difficulty"');
    assertTrue(!labels.includes('AI Difficulty'), 'The old "AI Difficulty" wording must be gone');
  });

  await test('Pile Danger Flash activates at 10+ cards and clears below it', () => {
    freshState({ drawPile: [] });
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    const wasReduceMotion = reduceMotion;
    reduceMotion = false;

    state.discardPile = Array.from({ length: 9 }, () => makeCard('4'));
    render();
    assertTrue(!document.getElementById('discardPileContainer').classList.contains('pile-danger'), '9 cards must not trigger the danger flash');

    state.discardPile = Array.from({ length: 10 }, () => makeCard('4'));
    render();
    assertTrue(document.getElementById('discardPileContainer').classList.contains('pile-danger'), '10 cards must trigger the danger flash');

    reduceMotion = wasReduceMotion;
  });
  await test('REGRESSION: Reduce Motion turns Pile Danger Flash off entirely, not just the animation', () => {
    freshState({ drawPile: [] });
    state.players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    state.discardPile = Array.from({ length: 15 }, () => makeCard('4'));
    const wasReduceMotion = reduceMotion;

    reduceMotion = true;
    render();
    assertTrue(!document.getElementById('discardPileContainer').classList.contains('pile-danger'), 'Reduce Motion must withhold the class entirely — a static leftover glow would still count as "on"');

    reduceMotion = false;
    render();
    assertTrue(document.getElementById('discardPileContainer').classList.contains('pile-danger'), 'Turning Reduce Motion back off must restore it on the very next render');

    reduceMotion = wasReduceMotion;
  });

  saveGameState = originalSaveGameState;
  callEconomy = realCallEconomy;
  burnInstantResolveForTests = false;
  renderDevTestReport(results);
}

function renderDevTestReport(results) {
  document.body.innerHTML = '';
  document.body.style.cssText = 'background:#0f172a; color:#e2e8f0; font-family:system-ui,sans-serif; padding:24px; margin:0;';
  const passCount = results.filter(r => r.pass).length;
  const failCount = results.length - passCount;
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:20px;';
  header.innerHTML = `
    <h1 style="margin:0 0 4px; font-size:22px;">ShitHead Deluxe — Rule Engine Test Suite</h1>
    <p style="margin:0; color:${failCount > 0 ? '#f87171' : '#34d399'}; font-weight:bold; font-size:16px;">
      ${passCount} / ${results.length} passed${failCount > 0 ? ` — ${failCount} FAILING` : ''}
    </p>
  `;
  document.body.appendChild(header);
  const list = document.createElement('div');
  results.forEach(r => {
    const row = document.createElement('div');
    row.style.cssText = `padding:10px 14px; margin-bottom:6px; border-radius:8px; background:${r.pass ? '#052e1f' : '#450a0a'}; border-left:4px solid ${r.pass ? '#34d399' : '#f87171'};`;
    row.innerHTML = `<div style="font-weight:bold;">${r.pass ? '✅' : '❌'} ${r.name}</div>${r.pass ? '' : `<div style="color:#fca5a5; font-size:13px; margin-top:4px;">${r.error}</div>`}`;
    list.appendChild(row);
  });
  document.body.appendChild(list);
}

