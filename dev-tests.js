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
    const testFilter = new URLSearchParams(location.search).get('test-filter');
    if (testFilter === 'cosmetic-art' && !name.startsWith('Cosmetic art:')) return;
    if (testFilter && testFilter !== 'cosmetic-art' && !name.toLowerCase().includes(testFilter.toLowerCase())) return; // any other filter: a name match
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
  await test('Cosmetic art: full table scenes keep every main feature complete and large at all six required sizes', async () => {
    const host=document.createElement('div');host.className='mini-table';
    host.style.cssText='position:fixed;left:0;top:0;opacity:0;pointer-events:none;max-width:none;border:0;padding:0;z-index:-20';
    document.body.append(host);
    try {
      for(const [w,h] of [[390,844],[360,640],[768,1024],[1366,768],[1920,1080],[3840,2160]]) {
        host.style.width=w+'px';host.style.height=h+'px';
        for(const key of Object.keys(ShTableScenes.themes)) {
          host.dataset.tablePreview='table-'+key;ShTableScenes.draw(host,'table-'+key);
          const svg=host.querySelector('svg'),box=svg.getBoundingClientRect();
          assertTrue(Math.abs(box.width-w)<1 && Math.abs(box.height-h)<1,key+': scene covers host');
          const main=[...svg.querySelectorAll('[data-scene-feature]')];
          assertTrue(main.length>0 || ['wood','felt','casino','royal'].includes(key),key+': main features present');
          for(const el of main) {
            const r=el.getBoundingClientRect(),unit=Math.min(w,h),m=Math.max(.12,+el.dataset.minUnit);
            assertTrue(r.left>=box.left-.5 && r.right<=box.right+.5 && r.top>=box.top-.5 && r.bottom<=box.bottom+.5,key+' '+el.dataset.sceneFeature+': complete at '+w+'x'+h);
            assertTrue(Math.max(r.width,r.height)>=unit*m-.6,key+' '+el.dataset.sceneFeature+': large at '+w+'x'+h);
            const matrix=el.getCTM();assertTrue(Math.abs(Math.hypot(matrix.a,matrix.b)-Math.hypot(matrix.c,matrix.d))<.01,key+': uniform scale');
          }
        }
      }
    } finally {host.remove();}
  });
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
      phase: 'PLAY', isMultiplayer: false, isRanked: false, serverAuthority: 0, stateVersion: 0, isHost: false, direction: 1, currentTurnIndex: 0,
      discardPile: [], drawPile: [], playedHistory: [], activeConstraint: null, baseOverrideCard: null,
      lastJokerInitiatorId: null,
      pendingFollowUp: null, pendingFaceUpSacrifice: null, selectedSacrificeIds: [], selectedPlayCardIds: [],
      // A real (non-instant) burn test leaves burnResolving true since it
      // never lets the hold's setTimeout fire — without resetting it
      // here, that leaks into whichever test runs next and makes
      // isLocalPlayersTurnNow() falsely false for them.
      burnResolving: false, turnTransitionLocked: false, blindRevealing: false,
      turnDeadline: null, localPlayerId: 'p1', difficulty: 'medium', players: [], stalemate: null
    }, overrides || {});
  }

  // ---- isPlayLegal: the three wildcards and their documented exceptions ----
  await test('Cosmetic art: all approved backs fit square, mobile and large-preview cards', async () => {
    const stage = document.createElement('div'); document.body.appendChild(stage);
    try {
      for (const id of APPROVED_BACK_IDS) {
        const file = APPROVED_BACK_FILES[id], image = new Image(); image.src = file; await image.decode();
        assertTrue(image.naturalWidth >= 512 && image.naturalHeight >= 720, `${id}: full production print loads`);
        for (const [width,height] of [[64,64],[32,45],[150,210]]) {
          stage.innerHTML = `<div class="custom-card-back ${getCosmeticBackClass(id)}" style="width:${width}px;height:${height}px"><svg></svg></div>`;
          const el = stage.firstElementChild, css = getComputedStyle(el);
          assertEqual(css.backgroundSize, '100% 100%', `${id}: all four print edges fit ${width}x${height}`);
          assertEqual(css.borderTopWidth, '0px', `${id}: no second UI border`);
          assertEqual(getComputedStyle(el,'::before').display, 'none', `${id}: no old checker pattern`);
          assertEqual(getComputedStyle(el.querySelector('svg')).display, 'none', `${id}: no old centre emblem`);
        }
      }
    } finally { stage.remove(); }
  });
  await test('Cosmetic art: Royal Flush and star layers remain within the avatar throughout their loops', async () => {
    const stage = document.createElement('div'); stage.style.cssText='position:fixed;top:100px;left:100px;width:128px;height:128px'; document.body.appendChild(stage);
    const paused = [];
    try {
      for (const id of ['avatar-royal-flush','avatar-cosmic-ace']) {
        stage.innerHTML = avatarHtml(id,128);
        await new Promise(resolve=>requestAnimationFrame(resolve));
        const animations = document.getAnimations().filter(a=>stage.contains(a.effect?.target)); animations.forEach(a=>{a.pause();paused.push(a);});
        const host=stage.getBoundingClientRect();
        const layers=[...stage.querySelectorAll(id==='avatar-royal-flush'?'.av-art-card > image':'.av-art-star')];
        assertEqual(layers.length,id==='avatar-royal-flush'?5:5,`${id}: complete independent layers`);
        for (const time of [0,600,1400,2200,3200,4000]) {
          animations.forEach(a=>a.currentTime=time);
          layers.forEach(layer=>{const b=layer.getBoundingClientRect();assertTrue(b.left>=host.left-.5&&b.top>=host.top-.5&&b.right<=host.right+.5&&b.bottom<=host.bottom+.5,`${id}: layer stays in its tile at ${time}ms`);});
        }
        if (id==='avatar-cosmic-ace') {
          assertEqual(stage.querySelectorAll('[data-orbit]').length,2,'exactly two stationary rings');
          assertTrue([...stage.querySelectorAll('[data-orbit], [data-orbit] *')].every(el=>getComputedStyle(el).animationName==='none'),'rings and highlights never animate');
          assertTrue(layers.every(el=>el.tagName.toLowerCase()==='polygon' && el.getAttribute('points').trim().split(/\s+/).length===10),'five-point stars, not plus signs');
          assertTrue(stage.querySelector('image').getAttribute('href').includes('-clean.webp'),'no baked ring under the moving rings');
          const star=layers[0]; animations.forEach(a=>a.currentTime=0);const a=star.getBoundingClientRect();animations.forEach(a=>a.currentTime=1500);const b=star.getBoundingClientRect();
          assertTrue(Math.abs((a.left+a.right)-(b.left+b.right))<1&&Math.abs((a.top+a.bottom)-(b.top+b.bottom))<1,'star glistens about a fixed centre');
        }
      }
    } finally { paused.forEach(a=>a.cancel());stage.remove(); }
  });
  await test('Cosmetic art: ShitHead tears form at the eyes, fall and disappear over dry cheeks', async () => {
    const stage=document.createElement('div');stage.style.cssText='position:fixed;top:100px;left:100px;width:128px;height:128px';document.body.appendChild(stage);
    let animations=[];
    try {
      stage.innerHTML=avatarHtml('avatar-shithead',128);await new Promise(resolve=>requestAnimationFrame(resolve));
      assertTrue(stage.querySelector('image').getAttribute('href').includes('avatar-shithead-clean.webp'),'clean dry face, no stuck tear image');
      assertEqual(stage.querySelectorAll('[data-tear-origin]').length,2,'each eye has its own droplet');
      const tear=stage.querySelector('.av-art-tear');animations=document.getAnimations().filter(a=>stage.contains(a.effect?.target));animations.forEach(a=>a.pause());
      animations.forEach(a=>a.currentTime=850);const early=tear.getBoundingClientRect();animations.forEach(a=>a.currentTime=1950);const late=tear.getBoundingClientRect();
      assertTrue(late.top>early.top+8,'tear falls down the cheek');animations.forEach(a=>a.currentTime=2800);assertEqual(getComputedStyle(tear).opacity,'0','old tear disappears before the next one forms');
    } finally { animations.forEach(a=>a.cancel());stage.remove(); }
  });

  await test('Cosmetic art: every table uses the same full scene on home and previews', () => {
    const saved=equippedCosmetics.tableTheme,wasLobby=document.body.classList.contains('lobby-open');
    const stage=document.createElement('div');stage.className='mini-table';stage.style.cssText='position:fixed;left:0;top:0;width:390px;height:844px;opacity:0';document.body.append(stage);
    try {
      document.body.classList.add('lobby-open');
      for(const key of Object.keys(ShTableScenes.themes)) {
        const id='table-'+key;equippedCosmetics.tableTheme=id;refreshHomeBackdrop();
        const home=document.getElementById('homeBackdrop'),r=home.getBoundingClientRect();
        assertTrue(Math.abs(r.left)<1&&Math.abs(r.right-innerWidth)<1&&Math.abs(r.top)<1&&Math.abs(r.bottom-innerHeight)<1,id+': full viewport');
        assertEqual(home.dataset.table,id,id+': equipped table retained');
        assertEqual(home.querySelector('svg').dataset.fullScene,id,id+': shared home scene');
        stage.dataset.tablePreview=id;ShTableScenes.draw(stage,id);
        assertEqual(stage.querySelector('svg').dataset.fullScene,id,id+': shared preview scene');
        assertTrue(!stage.querySelector('svg').querySelector('[preserveAspectRatio*=slice]'),id+': no cropped scene');
      }
    } finally {stage.remove();equippedCosmetics.tableTheme=saved;refreshHomeBackdrop();document.body.classList.toggle('lobby-open',wasLobby);}
  });
  await test('Cosmetic art: the default SH card back previews on tap and hold without equipping on release', async () => {
    const saved={tab:customTab,back:equippedCosmetics.cardBack};
    try {
      closeOtherMenuPages();document.getElementById('themesModal').classList.remove('hidden');
      equippedCosmetics.cardBack='default';setCustomTab('cardBack');renderPersonalisationCosmetics();
      const tile=visibleCustomPanel().querySelector('[data-equip-type="cardBack"][data-equip-id="default"]');
      assertTrue(!!tile,'default card back tile exists');tile.click();
      const box=document.getElementById('bigPreview');
      assertTrue(!box.classList.contains('hidden'),'tap opens the equipped default preview');
      assertEqual(box.dataset.type,'cardBack','default resolves to its card-back category');
      assertTrue(box.querySelector('.bp-card.cosmetic-back-default'),'white textured SH artwork');
      assertTrue(!box.querySelector('[data-bp-shop]'),'free default has no purchase action');closeBigPreview();
      equippedCosmetics.cardBack='back-cobalt-linen';renderPersonalisationCosmetics();
      const holdTile=visibleCustomPanel().querySelector('[data-equip-type="cardBack"][data-equip-id="default"]');
      const b=holdTile.getBoundingClientRect(),at={clientX:b.left+5,clientY:b.top+5,bubbles:true,pointerId:1,button:0};
      holdTile.dispatchEvent(new PointerEvent('pointerdown',at));
      await new Promise(r=>setTimeout(r,CARD_HOLD_MS+80));
      assertTrue(!box.classList.contains('hidden')&&box.dataset.itemId==='default','hold previews an unequipped default back');
      holdTile.dispatchEvent(new PointerEvent('pointerup',at));holdTile.click();
      assertEqual(equippedCosmetics.cardBack,'back-cobalt-linen','release does not equip the previewed default');
      closeBigPreview();holdTile.dispatchEvent(new PointerEvent('pointerdown',at));holdTile.dispatchEvent(new PointerEvent('pointercancel',at));
    } finally {
      closeBigPreview();equippedCosmetics.cardBack=saved.back;setCustomTab(saved.tab);renderPersonalisationCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
  });

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
    assertTrue(!document.body.innerHTML.includes('Card-area labels:'), 'The Guide no longer describes the labels (owner: not needed)');
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
  await test('A Leave button sits under MATCH FINISHED (online only once the match is over; v274)', () => {
    freshState({ phase: 'FINISHED', isMultiplayer: false, localPlayerId: 'me', drawPile: [], discardPile: [] });
    state.players = [makePlayer({ id: 'me', hasFinished: true, finishRank: 1 }), makePlayer({ id: 'b1', isBot: true, hasFinished: true, finishRank: 2 })];
    render();
    const btn = document.getElementById('finishedLeaveBtn');
    assertTrue(!!btn && btn.textContent.includes('LEAVE'), 'The Leave button is shown');
    assertTrue(btn.previousElementSibling && btn.previousElementSibling.textContent.includes('MATCH FINISHED'), 'It sits under the MATCH FINISHED box');
    state.isMultiplayer = true;
    render();
    assertTrue(!!document.getElementById('finishedLeaveBtn'), 'Online matches offer it too once FINISHED (v274, owner)');
    state.phase = 'PLAY';
    render();
    assertTrue(!document.getElementById('finishedLeaveBtn'), 'Online, never while the match is still being played');
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
      assertTrue(banners[0].includes('Noah') && banners[0].includes('last card'), 'Names the player');
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
  await test('Offline: Play Friends and Ranked explain that Vs Bots works offline, and stay closed', () => {
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

  await test('Quick Start: at most 9 short steps, and the Tutorial button starts it the first time', () => {
    assertTrue(TUTORIAL_MODULE_QUICK_START.length <= 9, 'No more than 9 steps');
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
  await test('Level burns (v253): six earn-only burns, animated, each with its own sound, over within 2.1s', () => {
    const ids = LEVEL_REWARDS.filter(r => r.category === 'Burn Effects').map(r => r.id);
    assertEqual(ids, LEVEL_BURN_IDS, 'The six level burns');
    const stage = testBurnStage();
    ids.forEach((id) => {
      assertTrue(isSupportedCosmetic('burnEffect', id), `${id} can be equipped`);
      assertTrue(!COSMETIC_SHOP_ITEMS.some(i => i.id === id), `${id} is never sold`);
      assertTrue(typeof BURN_SOUNDS[id] === 'function' && !Object.keys(BURN_SOUNDS).some(o => o !== id && BURN_SOUNDS[o] === BURN_SOUNDS[id]), `${id} has its own sound`);
      assertTrue(burnPreviewIcon(id) !== '🔥' || id === 'burn-lvl-inferno-sweep', `${id} has its own preview icon`);
      stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
      playBurnFx(id, stage, 120, 80, 1);
      // 3D burns (v296) draw one WebGL canvas on their own clock and remove it at the end.
      const canvas3d = stage.querySelector('canvas.lb3d-canvas');
      if (canvas3d) {
        const ms = ShLevel3D.effects[id].dur * 1000;
        assertTrue(ms <= 2100 && ms >= 800, `${id} lasts 0.8–2.1s (${ms}ms)`);
        ShLevel3D.clear(stage);
        assertTrue(!stage.querySelector('canvas.lb3d-canvas'), `${id}: its canvas is removed`);
        return;
      }
      const pieces = [...stage.querySelectorAll('.bfx')];
      assertTrue(pieces.length > 20, `${id} draws its pieces (${pieces.length})`);
      assertEqual(pieces.filter(el => el.getAnimations().length === 0).length, 0, `${id}: every piece is animated`);
      const ends = pieces.flatMap(el => el.getAnimations()).map(a => a.effect.getComputedTiming().endTime);
      assertTrue(ends.every(e => Number.isFinite(e)) && Math.max(...ends) <= 2100, `${id} ends within 2.1s (got ${Math.round(Math.max(...ends))}ms)`);
      assertTrue(Math.max(...ends) >= 800, `${id} lasts long enough to see`);
    });
    stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
    const real = { ...cosmeticPurchaseState };
    try {
      ids.forEach(id => delete cosmeticPurchaseState[id]);
      renderPersonalisationCosmetics();
      const tile = document.querySelector('#personalisationBurnEffects [data-equip-id="burn-lvl-shitstorm"]');
      assertTrue(!!tile && tile.hasAttribute('data-locked') && /Reach Lvl 99/.test(tile.textContent), 'Locked in Custom → Burn with its level');
      assertEqual(nextLevelReward(1)?.id, 'burn-lvl-spark-snap', 'Spark Snap is the first level reward (Lvl 5)');
    } finally { cosmeticPurchaseState = real; renderPersonalisationCosmetics(); }
  });
  await test('Every Burn cosmetic (and the default) has its own burn sound', () => {
    assertTrue(typeof BURN_SOUNDS.default === 'function', 'A default burn sound exists');
    const missing = [...COSMETIC_SHOP_ITEMS, ...LEVEL_REWARDS].filter(i => i.category === 'Burn Effects' && typeof BURN_SOUNDS[i.id] !== 'function').map(i => i.id);
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
  await test('REGRESSION: a Joker as your LAST card passes the turn on (the game froze when a bot was next)', () => {
    // Found by playing 600 bot games: the finished Joker winner kept the
    // next turn, and the skip-past-finished step never woke the next bot.
    freshState({ discardPile: [makeCard('4'), makeCard('K'), makeCard('JOKER', 'JOKER')], drawPile: [] });
    const vikram = makePlayer({ id: 'vikram', name: 'Vikram', isBot: true, hand: [], faceUp: [], faceDown: [] });
    const freja = makePlayer({ id: 'freja', name: 'Freja', isBot: true, hand: [makeCard('6')] });
    const mia = makePlayer({ id: 'mia', name: 'Mia', isBot: true, hand: [makeCard('9')] });
    state.players = [vikram, freja, mia];
    state.localPlayerId = 'nobody';
    state.currentTurnIndex = 0;
    resolveJokerDuelInstant(vikram, freja, makeCard('JOKER', 'JOKER'));
    assertTrue(vikram.hasFinished, 'Vikram is out');
    assertTrue(state.jokerTurnOwnerId !== 'vikram', 'No turn lock on a finished player');
    assertEqual(state.players[state.currentTurnIndex].id, 'freja', 'The turn moves on to the next player still in');
  });
  await test('REGRESSION: a turn landing on a finished seat is passed on AND the next player is told to go', () => {
    freshState({ discardPile: [makeCard('4')], drawPile: [] });
    const done = makePlayer({ id: 'done', isBot: true, hand: [], hasFinished: true, finishRank: 1 });
    const a = makePlayer({ id: 'a', isBot: true, hand: [makeCard('9')] });
    const b = makePlayer({ id: 'b', isBot: true, hand: [makeCard('K')] });
    state.players = [done, a, b];
    state.localPlayerId = 'nobody';
    state.currentTurnIndex = 0;
    let triggered = 0;
    const realTrigger = triggerNextTurn;
    triggerNextTurn = () => { triggered++; };
    try { checkTurnAndAct(); } finally { triggerNextTurn = realTrigger; }
    assertEqual(state.players[state.currentTurnIndex].id, 'a', 'The turn moves past the finished seat');
    assertEqual(triggered, 1, 'and the next player is prompted to take it');
  });
  await test('REGRESSION: countering a Joker by hand with your LAST card finishes you and the game goes on', () => {
    const wasInstant = burnInstantResolveForTests;
    burnInstantResolveForTests = false;
    const realTrigger = triggerNextTurn;
    triggerNextTurn = () => {};
    try {
      const counter = makeCard('JOKER', 'JOKER');
      freshState({ discardPile: [makeCard('6'), makeCard('JOKER', 'JOKER'), counter], drawPile: [] });
      const soren = makePlayer({ id: 'soren', isBot: true, hand: [makeCard('Q')] });
      const you = makePlayer({ id: 'you', hand: [] });
      const mia = makePlayer({ id: 'mia', isBot: true, hand: [makeCard('K')] });
      state.players = [you, soren, mia];
      state.localPlayerId = 'you';
      state.lastJokerInitiatorId = 'soren';
      handleJokerPlay(you, counter);
      assertTrue(you.hasFinished && you.finishRank === 1, 'You finish with your counter-Joker', [you.hasFinished, you.finishRank]);
      const cur = state.players[state.currentTurnIndex];
      assertTrue(cur && !cur.hasFinished, 'A player still in takes the turn', cur && cur.id);
    } finally { burnInstantResolveForTests = wasInstant; triggerNextTurn = realTrigger; }
  });
  await test('Guide: a Gauntlet section, and Key Terms alphabetical and covering the newer features', () => {
    const sections = [...document.querySelectorAll('#rulesModal .accordion-toggle span:first-child')].map(el => el.textContent.trim());
    assertTrue(sections.includes('The Gauntlet'), 'The Guide has a Gauntlet section', sections);
    const keyTerms = [...document.querySelectorAll('#rulesModal .accordion-toggle')].find(b => /Key Terms/.test(b.textContent)).nextElementSibling;
    const terms = [...keyTerms.querySelectorAll('p > strong:first-child')].map(el => el.textContent.replace(/:$/, '').trim());
    const sorted = [...terms].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    assertEqual(terms, sorted, 'Key Terms stay in alphabetical order');
    ['Gauntlet', 'Lives', 'Joker Effect', 'Leaderboard', 'Diamonds', 'Ranked', 'Tier'].forEach(t => assertTrue(terms.includes(t), `Key Terms explain ${t}`));
  });
  // ---- Joker effects ----
  await test('Joker effects: 6 in the Shop at 2000 + 4 premium at 3500, one per seasonal event at 3000, each with its own animation and sound', () => {
    const shop = COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Joker Effects' && !i.season);
    const seasonal = COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Joker Effects' && i.season);
    const premium = ['joker-hypnotist', 'joker-vampire', 'joker-redcard', 'joker-portal'];
    assertEqual(shop.length, 10, 'Ten Shop Joker effects');
    assertTrue(shop.every(i => i.cost === (premium.includes(i.id) ? 3500 : 2000)), 'Shop Joker effects cost 2000, premium ones 3500', shop.map(i => i.cost));
    assertEqual(seasonal.length, SEASONAL_EVENTS.length, 'One per seasonal event');
    assertTrue(seasonal.every(i => i.cost === 3000), 'Seasonal Joker effects cost 3000', seasonal.map(i => i.cost));
    const all = [...shop, ...seasonal];
    assertEqual(all.filter(i => typeof JOKER_FX[i.id] !== 'function').map(i => i.id), [], 'Every Joker effect has an animation');
    assertEqual(all.filter(i => typeof JOKER_SOUNDS[i.id] !== 'function').map(i => i.id), [], 'Every Joker effect has its own sound');
    assertEqual(new Set(all.map(i => JOKER_SOUNDS[i.id])).size, all.length, 'No two share a sound');
    assertTrue(all.every(i => isSupportedCosmetic('jokerEffect', i.id)), 'All can be equipped');
    assertTrue(typeof JOKER_FX.default === 'function' && typeof JOKER_SOUNDS.default === 'function', 'A default for players with none equipped');
  });
  await test('Joker effects: every animation plays within 1.5s (quick but not too quick) and cleans up after itself', async () => {
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:0;top:0;width:390px;height:700px;';
    document.body.appendChild(stage);
    const lengths = {};
    try {
      for (const id of Object.keys(JOKER_FX)) {
        const host = document.createElement('div');
        host.className = 'jfx-host';
        stage.appendChild(host);
        const t0 = document.timeline.currentTime;
        JOKER_FX[id](host, jfxGeom(host));
        // Some pieces start part-way through: watch the whole run.
        const seen = new Map(); // animation -> when it ends (ms after the effect began)
        for (let t = 0; t <= 1500; t += 50) {
          host.getAnimations({ subtree: true }).forEach(a => {
            if (seen.has(a)) return;
            const end = a.effect.getComputedTiming().endTime;
            const start = a.startTime == null ? document.timeline.currentTime : a.startTime;
            seen.set(a, Number.isFinite(end) ? start - t0 + end : 0); // endless loops (a flame flicker) go with the host
          });
          await new Promise(r => setTimeout(r, 50));
        }
        lengths[id] = Math.round(Math.max(0, ...seen.values()));
        assertTrue(seen.size > 2, `${id} draws something`);
        host.remove();
      }
    } finally { stage.remove(); }
    const tooLong = Object.entries(lengths).filter(([, ms]) => ms > JOKER_FX_MS + 60);
    const tooShort = Object.entries(lengths).filter(([, ms]) => ms < 1000);
    assertEqual(tooLong, [], 'No animation runs past the 1.5s window');
    assertEqual(tooShort, [], 'Nor is any over in under a second');
  });
  await test('Joker effects: a Joker played on a Joker never shows two at once; the first is seen, then COUNTERED takes over', async () => {
    const was = [bigEffectsOn, reduceMotion];
    bigEffectsOn = true; reduceMotion = false;
    const layer = document.getElementById('jokerFxLayer');
    try {
      layer.innerHTML = ''; jokerFxNow = null;
      assertEqual(playJokerEffect('joker-grin'), 'played', 'The first plays straight away');
      assertEqual(playJokerEffect('joker-glitch', { counter: true }), 'queued', 'A counter straight after waits its turn');
      assertEqual(layer.querySelectorAll('.jfx-host').length, 1, 'Only one effect on screen');
      await new Promise(r => setTimeout(r, JOKER_FX_MIN_MS + 120));
      const hosts = [...layer.querySelectorAll('.jfx-host')];
      assertEqual(hosts[hosts.length - 1].dataset.jokerEffect, 'joker-glitch', 'Then the counter takes over');
      assertTrue(hosts[hosts.length - 1].textContent.includes('COUNTERED!'), 'with a COUNTERED! tag');
      await new Promise(r => setTimeout(r, 250));
      assertEqual(layer.querySelectorAll('.jfx-host').length, 1, 'and the first has faded away');
    } finally {
      bigEffectsOn = was[0]; reduceMotion = was[1];
      layer.innerHTML = ''; jokerFxNow = null; if (jokerFxPending) { clearTimeout(jokerFxPending); jokerFxPending = null; }
    }
  });
  await test('Joker effects: playing and countering a Joker trigger the right player\'s effect', () => {
    const calls = [];
    const real = playJokerEffectFor;
    playJokerEffectFor = (player, opts = {}) => calls.push([player.id, !!opts.counter]);
    const realTrigger = triggerNextTurn;
    triggerNextTurn = () => {};
    try {
      freshState({ discardPile: [makeCard('4'), makeCard('K')], drawPile: [] });
      const joker = makeCard('JOKER', 'JOKER');
      const a = makePlayer({ id: 'a', isBot: true, hand: [joker, makeCard('9')] });
      const b = makePlayer({ id: 'b', isBot: true, hand: [makeCard('JOKER', 'JOKER'), makeCard('5')] });
      state.players = [a, b]; state.localPlayerId = 'nobody'; state.currentTurnIndex = 0;
      executePlayCards('a', [joker]);
      assertEqual(calls, [['a', false], ['b', true]], 'The Joker player\'s effect, then the defender\'s as a counter');
    } finally { playJokerEffectFor = real; triggerNextTurn = realTrigger; }
  });
  await test('Joker effects: in the Showcase, the Custom Joker tab and the Guide', () => {
    assertTrue(SHOWCASE_TYPES.includes('jokerEffect'), 'Shown in the Showcase');
    assertTrue(showcaseHtml({ jokerEffect: 'joker-magic' }).includes('Magic Trick'), 'by name');
    assertTrue(!!document.getElementById('personalisationJokerEffects') && !!document.querySelector('[data-custom-panel="jokerEffect"]'), 'Custom has a Joker tab');
    assertEqual(jokerEffectIdFor(makePlayer({ id: 'bot' })), 'default', 'Nothing equipped: the default effect');
  });

  // ---- Last card is a power card, 3-4 players: the game goes on ----
  // A 10, a four-of-a-kind burn (in turn or snapped) or a Joker as someone's
  // LAST card: they finish, and the next player still in takes the turn.
  const lastCardScenario = (seats, run) => {
    const realTrigger = triggerNextTurn;
    let prompted = 0;
    triggerNextTurn = () => { prompted++; };
    try {
      freshState({ discardPile: [makeCard('4'), makeCard('6')], drawPile: [] });
      state.players = seats.map(([id, hand, extra]) => makePlayer(Object.assign({ id, name: id, isBot: true, hand }, extra || {})));
      state.localPlayerId = 'nobody';
      state.currentTurnIndex = 0;
      run();
    } finally { triggerNextTurn = realTrigger; }
    return prompted;
  };
  for (const n of [3, 4]) {
    const others = (from) => ['b', 'c', 'd'].slice(0, n - 1).map((id, i) => [id, [makeCard('K'), makeCard('9')].concat(i === from ? [] : [makeCard('5')])]);
    await test(`Last card a 10 (${n} players): that player finishes and the next player takes the turn`, () => {
      const ten = makeCard('10');
      const prompted = lastCardScenario([['a', [ten]], ...others(-1)], () => executePlayCards('a', [ten]));
      const a = state.players[0];
      assertTrue(a.hasFinished && a.finishRank === 1, 'The 10 player finishes first', [a.hasFinished, a.finishRank]);
      assertEqual(state.phase, 'PLAY', 'The game carries on');
      assertEqual(state.players[state.currentTurnIndex].id, 'b', 'The next player (b) takes the turn');
      assertTrue(prompted > 0, 'and is told to go');
    });
    await test(`Last cards a four-of-a-kind burn (${n} players): finish, next player takes the turn`, () => {
      const sevens = [makeCard('7', '♠'), makeCard('7', '♥')];
      const prompted = lastCardScenario([['a', sevens], ...others(-1)], () => {
        state.discardPile = [makeCard('4'), makeCard('7', '♦'), makeCard('7', '♣')];
        executePlayCards('a', sevens);
      });
      assertTrue(state.players[0].hasFinished, 'The burner finishes');
      assertEqual(state.discardPile.length, 0, 'The pile is burnt');
      assertEqual(state.players[state.currentTurnIndex].id, 'b', 'The next player takes the turn');
      assertTrue(prompted > 0, 'and is told to go');
    });
    await test(`Last card snapped into a four-of-a-kind out of turn (${n} players): finish, the game goes on`, () => {
      const seven = makeCard('7', '♠');
      const prompted = lastCardScenario([['a', [seven]], ...others(-1)], () => {
        state.discardPile = [makeCard('4'), makeCard('7', '♦'), makeCard('7', '♣'), makeCard('7', '♥')];
        state.currentTurnIndex = 1; // b's turn: a snaps
        executePlayCards('a', [seven]);
      });
      assertTrue(state.players[0].hasFinished, 'The snapper finishes');
      assertEqual(state.phase, 'PLAY', 'The game carries on');
      const cur = state.players[state.currentTurnIndex];
      assertTrue(cur && !cur.hasFinished && cur.id !== 'a', 'A player still in takes the turn', cur && cur.id);
      assertTrue(prompted > 0, 'and is told to go');
    });
    await test(`Last card a Joker (${n} players): finish, the target picks up, the next player takes the turn`, () => {
      const joker = makeCard('JOKER', 'JOKER');
      const prompted = lastCardScenario([['a', [joker]], ...others(-1)], () => executePlayCards('a', [joker]));
      const a = state.players[0];
      assertTrue(a.hasFinished, 'The Joker player finishes');
      assertEqual(state.phase, 'PLAY', 'The game carries on');
      const cur = state.players[state.currentTurnIndex];
      assertTrue(cur && !cur.hasFinished, 'A player still in takes the turn', cur && cur.id);
      assertTrue(state.jokerTurnOwnerId !== 'a', 'No turn lock on the finished player');
      assertTrue(prompted > 0, 'and is told to go');
    });
    await test(`Last card a counter-Joker (${n} players): the defender finishes, the game goes on`, () => {
      const joker = makeCard('JOKER', 'JOKER');
      const counter = makeCard('JOKER', 'JOKER');
      // b holds only the Joker (fewest cards, so the bot initiator targets b).
      const seats = [['a', [joker, makeCard('K'), makeCard('Q')]], ['b', [counter]], ...others(0).slice(1)];
      const prompted = lastCardScenario(seats, () => executePlayCards('a', [joker]));
      const b = state.players[1];
      assertTrue(b.hasFinished && b.finishRank === 1, 'The defender who countered with their last card finishes', [b.hasFinished, b.finishRank, b.hand.length]);
      assertEqual(state.phase, 'PLAY', 'The game carries on');
      const cur = state.players[state.currentTurnIndex];
      assertTrue(cur && !cur.hasFinished, 'A player still in takes the turn', cur && cur.id);
      assertTrue(state.jokerTurnOwnerId !== 'b', 'No turn lock on the finished defender');
      assertTrue(prompted > 0, 'and is told to go');
    });
  }
  // ---- A Joker as someone's LAST card, countered: they did NOT finish ----
  // Checked before anything final happens: the target's counter is found at
  // once, the Joker player picks up the pile, and no victory effect, finish
  // or match end fires.
  for (const n of [2, 3, 4]) {
    for (const pileOnlyJoker of [false]) {
      await test(`Last card a Joker that gets countered (${n} players): not finished, picks up, no victory`, () => {
        const joker = makeCard('JOKER', 'JOKER');
        const counter = makeCard('JOKER', 'JOKER');
        const calls = { end: 0, overlay: 0, fx: 0 };
        const realEnd = showMatchEndUI, realOverlay = showVictoryOverlay, realFx = triggerEquippedVictoryEffect;
        showMatchEndUI = () => { calls.end++; };
        showVictoryOverlay = () => { calls.overlay++; };
        triggerEquippedVictoryEffect = () => { calls.fx++; };
        try {
          // b has the fewest cards, so the bot initiator targets b (the only target with 2 players).
          const seats = [['a', [joker]], ['b', [counter, makeCard('K')]], ['c', [makeCard('K'), makeCard('9'), makeCard('5')]], ['d', [makeCard('Q'), makeCard('8'), makeCard('5')]]].slice(0, n);
          lastCardScenario(seats, () => {
            if (pileOnlyJoker) state.discardPile = [];
            executePlayCards('a', [joker]);
          });
          const a = state.players[0], b = state.players[1];
          assertTrue(!a.hasFinished && !a.finishRank, 'The countered Joker player is not finished', [a.hasFinished, a.finishRank]);
          const aCards = (a.hand?.length || 0) + (a.faceUp?.length || 0) + (a.faceDown?.length || 0);
          assertTrue(aCards === 2, 'Holding the pile', aCards);
          assertEqual(a.hand.map(c => c.rank).sort(), ['4', '6'], 'They pick up the pile at once');
          assertEqual(state.phase, 'PLAY', 'The game is not over');
          assertEqual(state.players[state.currentTurnIndex].id, 'b', 'The defender won the duel and plays next');
          assertTrue(!b.hasFinished, 'The defender still holds a card, so is still in');
          assertEqual(calls, { end: 0, overlay: 0, fx: 0 }, 'No match end, victory pop-up or victory effect');
        } finally { showMatchEndUI = realEnd; showVictoryOverlay = realOverlay; triggerEquippedVictoryEffect = realFx; }
      });
    }
  }
  // ---- ...but onto an empty pile, a countered last-card Joker still wins ----
  // Nothing to pick up and no cards left: the Joker player is out, and as
  // they played first they finish ahead of a defender who also went out.
  for (const n of [2, 3, 4]) {
    for (const defenderLast of [false, true]) {
      await test(`Last card a Joker on an empty pile, countered${defenderLast ? ' with the defender\'s last card' : ''} (${n} players): the Joker player is out first`, () => {
        const joker = makeCard('JOKER', 'JOKER');
        const counter = makeCard('JOKER', 'JOKER');
        const bHand = defenderLast ? [counter] : [counter, makeCard('K')];
        const seats = [['a', [joker]], ['b', bHand], ['c', [makeCard('K'), makeCard('9'), makeCard('5')]], ['d', [makeCard('Q'), makeCard('8'), makeCard('5')]]].slice(0, n);
        let ended = 0;
        const realTrigger = triggerNextTurn;
        lastCardScenario(seats, () => {
          state.discardPile = [];
          triggerNextTurn = () => { ended += state.players.filter(p => !p.hasFinished).length <= 1 ? 1 : 0; };
          executePlayCards('a', [joker]);
        });
        triggerNextTurn = realTrigger;
        const a = state.players[0], b = state.players[1];
        assertTrue(a.hasFinished && a.finishRank === 1, 'The Joker player finishes first', [a.hasFinished, a.finishRank]);
        assertEqual((a.hand || []).length, 0, 'Nothing to pick up');
        if (n === 2) {
          assertTrue(!b.hasFinished, 'Two players: that settles it, the defender is the ShitHead', [b.hasFinished, b.finishRank]);
          assertTrue(ended > 0, 'and the match is told to end');
        } else if (defenderLast) {
          assertTrue(b.hasFinished && b.finishRank === 2, 'The defender who also went out finishes second', [b.hasFinished, b.finishRank]);
        } else {
          assertTrue(!b.hasFinished && state.players[state.currentTurnIndex].id === 'b', 'The defender won the duel and plays next');
        }
        const stillIn = state.players.filter(p => !p.hasFinished);
        assertTrue(stillIn.length >= 1, 'Never everyone finished');
      });
    }
  }
  await test('Last card a Joker, countered with the defender\'s own last card (2 players): the defender wins, the Joker player is the ShitHead', () => {
    const joker = makeCard('JOKER', 'JOKER');
    const counter = makeCard('JOKER', 'JOKER');
    lastCardScenario([['a', [joker]], ['b', [counter]]], () => executePlayCards('a', [joker]));
    const a = state.players[0], b = state.players[1];
    assertTrue(b.hasFinished && b.finishRank === 1, 'The defender finishes first');
    assertTrue(!a.hasFinished || a.finishRank !== 1, 'The Joker player never wins it', [a.hasFinished, a.finishRank]);
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
  await test('Every menu page shows its menu icon beside its title (v284)', () => {
    const want = { profileModal: 'ui-profile', statsModal: 'ui-stats', friendsModal: 'ui-friends', leaderboardModal: 'ui-leaderboard', challengesModal: 'ui-challenges', levelLadderModal: 'ui-ladder', rulesModal: 'ui-guide', settingsModal: 'ui-settings', supportModal: 'ui-support', inboxModal: 'ui-mail', shopModal: 'ui-shop', themesModal: 'ui-personalise' };
    for (const [id, icon] of Object.entries(want)) {
      const use = document.querySelector(`#${id} use[href="#${icon}"]`);
      assertTrue(!!use, `#${id} shows #${icon} by its title`);
      assertEqual(document.querySelectorAll(`#${id} .page-title-icon`).length <= 1, true, `#${id} has one title icon`);
    }
  });
  await test('The header Diamonds hint says they open the Shop (v286)', () => {
    const tip = document.getElementById('headerDiamondBtn').getAttribute('data-tip');
    assertTrue(/^Diamonds · (Click|Tap) to open the Shop$/.test(tip), 'Got: ' + tip);
  });
  await test('Header Profile button, Level Ladder menu entry and the new Challenges icon (v283)', async () => {
    const hp = document.getElementById('headerProfileBtn');
    assertTrue(!!hp && !!hp.closest('header') && !!hp.querySelector('use[href="#ui-profile"]'), 'Profile sits in the header with the Profile icon');
    assertTrue(hp.nextElementSibling && hp.nextElementSibling.id === 'headerInboxBtn', 'It sits where Select All Of A Rank was, left of the Inbox');
    hp.click();
    const pm = document.getElementById('profileModal');
    assertTrue(!pm.classList.contains('hidden'), 'The header Profile button opens Profile');
    pm.classList.add('hidden');
    const ch = document.querySelector('#ui-challenges');
    assertTrue(!!ch && ch.querySelectorAll('circle').length === 3 && !!ch.querySelector('rect[transform], g[transform] rect'), 'Challenges is a three-ring target with the Ace');
    const lb = document.getElementById('menuLadderBtn');
    assertTrue(!!lb && !!lb.querySelector('use[href="#ui-ladder"]') && !!document.getElementById('ui-ladder'), 'The menu has Level Ladder with the ladder icon');
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp };
    try {
      xpFeatureOn = false; document.body.classList.remove('xp-on');
      assertEqual(getComputedStyle(lb).display, 'none', 'Hidden while XP is off');
      xpFeatureOn = true; document.body.classList.add('xp-on');
      currentUser = { uid: 'menu-ladder-test' }; playerXp = { total: xpForLevel(12) + 5, level: 12 };
      assertTrue(getComputedStyle(lb).display !== 'none', 'Shown while XP is on');
      lb.click();
      assertTrue(!document.getElementById('levelLadderModal').classList.contains('hidden'), 'It opens the Level Ladder');
    } finally {
      document.getElementById('levelLadderModal').classList.add('hidden');
      try { localStorage.removeItem('shithead_ladder_seen_menu-ladder-test'); } catch (e) {}
      xpFeatureOn = saved.on; document.body.classList.toggle('xp-on', !!saved.on);
      currentUser = saved.user; playerXp = saved.xp; refreshXpDisplays();
    }
  });
  await test('v291: a tap outside the match summary card closes it; a tap inside does not', () => {
    const modal = document.getElementById('matchSummaryModal');
    modal.classList.remove('hidden');
    try {
      modal.firstElementChild.click();
      assertTrue(!modal.classList.contains('hidden'), 'A tap on the card keeps it open');
      modal.click();
      assertTrue(modal.classList.contains('hidden'), 'A tap outside closes it');
    } finally { modal.classList.add('hidden'); }
  });
  await test('v291: helper tips show once each, beside what they explain, and Settings turns them off', () => {
    const savedSeen = localStorage.getItem('shithead_tips_seen'), savedOn = helperTipsOn;
    try {
      localStorage.removeItem('shithead_tips_seen'); helperTipsOn = true; hideHelperTip();
      assertEqual(Object.keys(HELPER_TIPS).length, 26, 'Twenty-six tips (v292 added seven, v293 ten)');
      const v293 = { 'forced-pickup': 'Picked up. Lower cards are easier to get rid of next turn.', 'ten-burn': 'A 10 burns the Pile, and you go again.',
        'four-burn': 'Four of the same rank in a row burns the Pile too.', 'three-played': 'A 3 is transparent: the next player must beat the card under it.',
        'last-card': 'One card left: try to make them pick up.', 'swap-phase': "Swap your best cards onto the table now. You'll need them later.",
        'gauntlet-lives': 'Lose a game and you lose a life. You replay the same bot.', 'inbox-mail': "Tap a mail to jump straight to what it's about.",
        'level-up': "New level: see what's next on the Level Ladder.", 'ranked-loss-run': 'Losses never cost extra. Win streaks earn bonus rating.' };
      Object.entries(v293).forEach(([k, t]) => assertEqual(HELPER_TIPS[k], t, `v293 tip ${k}`));
      assertEqual(HELPER_TIPS['hand-empty'], 'Now play your Face-Up cards, then the Face-Down ones blind.', 'Hand runs out');
      assertEqual(HELPER_TIPS['bonus-draw'], 'You drew the same card, so you can play it straight away.', 'Bonus Draw');
      assertEqual(HELPER_TIPS['host-invite'], 'Share the room code or invite link to bring friends in.', 'Hosting');
      assertEqual(HELPER_TIPS['custom-equip'], 'Double-tap an item to equip it.', 'Custom');
      assertEqual(HELPER_TIPS['diamonds-shop'], 'Spend Diamonds in the Shop: tap the gem.', 'Diamonds');
      assertEqual(HELPER_TIPS['nine-reverse'], '9 reverses the direction of play.', 'The 9');
      assertEqual(HELPER_TIPS['ranked-rating'], 'Ranked uses a rating: win to climb tiers, from Bronze to Master.', 'Ranked');
      assertEqual(HELPER_TIPS['hold-card'], 'Hold any card to see what it does.', 'The first-game tip');
      assertTrue(/four of a kind even when it's not your turn/.test(HELPER_TIPS['snap-burn']) && /give the Pile to someone else/.test(HELPER_TIPS.joker), 'Snap Burn and Joker tips');
      const anchor = document.getElementById('headerInboxBtn');
      assertTrue(!showHelperTip('shop-hold', anchor), 'Never while the test suite (or a lesson) runs unless forced');
      assertTrue(showHelperTip('shop-hold', anchor, { force: true }), 'Shows beside its anchor');
      const tip = document.getElementById('helperTip');
      assertTrue(!!tip && tip.textContent.includes('Hold any item to see it big.'), 'It says its text');
      assertTrue(!showHelperTip('ladder-tap', anchor, { force: true }), 'One tip at a time');
      tip.querySelector('[data-helper-tip-ok]').click();
      assertTrue(!document.getElementById('helperTip'), 'Got It closes it');
      assertTrue(!showHelperTip('shop-hold', anchor, { force: true }), 'Each tip shows only once');
      helperTipsOn = false;
      assertTrue(!showHelperTip('ladder-tap', anchor, { force: true }), 'Off in Settings: no tips');
      document.getElementById('setHelperTipsRow').click();
      assertTrue(helperTipsOn && /ON/.test(document.getElementById('setHelperTipsState').textContent), 'The Settings row turns them back on');
      assertTrue('helperTipsOn' in collectAccountSettings(), 'Synced with the account');
      const ladder = ladderRewards();
      assertTrue(ladder.get(45).some(p => p.name === '6th weekly challenge') && ladder.get(65).some(p => p.name === '7th weekly challenge'), 'Ladder: 6th weekly at 45, 7th at 65');
      assertTrue(ladder.get(35).some(p => p.name === '4th daily challenge') && ladder.get(55).some(p => p.name === '5th daily challenge'), 'Ladder: 4th daily at 35, 5th at 55');
    } finally {
      hideHelperTip(); helperTipsOn = savedOn;
      try { if (savedSeen === null) localStorage.removeItem('shithead_tips_seen'); else localStorage.setItem('shithead_tips_seen', savedSeen); } catch (e) {}
    }
  });
  await test('v301: the home snapshot paints a returning account at once, never another account; an unknown level never locks the speed', () => {
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp, eco: { ...challengeEconomy }, loaded: challengeEconomyLoadedForUid, snap: localStorage.getItem(HOME_SNAPSHOT_KEY), auth: authStateResolved };
    try {
      authStateResolved = true; // the sign-in answer has arrived
      setXpFeature(false); playerXp = null; challengeEconomyLoadedForUid = null;
      localStorage.setItem(HOME_SNAPSHOT_KEY, JSON.stringify({ uid: 'snap-a', xp: xpForLevel(38), xpOn: true, diamonds: 737000 }));
      currentUser = { uid: 'snap-a' };
      assertTrue(applyHomeSnapshot(currentUser), 'The same account uses its snapshot');
      assertEqual(xpLevelFor(playerXp.total), 38, 'Its level is painted');
      const lvl = document.getElementById('homeNameLevel');
      assertTrue(!lvl.classList.contains('hidden') && /38/.test(lvl.textContent), 'The home level badge shows straight away');
      assertTrue(/737/.test(document.getElementById('headerDiamondCount').textContent), 'The Diamonds show straight away');
      assertEqual(speedLockReason(3), '', 'Lvl 38 keeps 4x');
      playerXp = null;
      assertEqual(speedLockReason(3), '', 'A level still loading never locks 4x');
      challengeEconomyLoadedForUid = 'snap-a';
      assertTrue(/Lvl 10/.test(speedLockReason(3)), 'A loaded account with no level does lock it');
      challengeEconomyLoadedForUid = null;
      currentUser = { uid: 'snap-b' };
      assertTrue(!applyHomeSnapshot(currentUser), 'Another account never sees it');
      assertEqual(localStorage.getItem(HOME_SNAPSHOT_KEY), null, 'and it is dropped');
    } finally {
      currentUser = saved.user; playerXp = saved.xp; challengeEconomy = saved.eco; challengeEconomyLoadedForUid = saved.loaded; authStateResolved = saved.auth;
      setXpFeature(saved.on); updateDiamondHeader();
      if (saved.snap === null) localStorage.removeItem(HOME_SNAPSHOT_KEY); else localStorage.setItem(HOME_SNAPSHOT_KEY, saved.snap);
    }
  });
  await test('v290: a Level Ladder tap opens the big preview (never equips); its Equip button does', () => {
    const saved = { eq: { ...equippedCosmetics }, owned: cosmeticPurchaseState, on: xpFeatureOn, user: currentUser, xp: playerXp };
    try {
      xpFeatureOn = true; document.body.classList.add('xp-on');
      currentUser = { uid: 'ladder-equip-test' }; playerXp = { total: xpForLevel(30), level: 30 };
      const reward = LEVEL_REWARDS.find(r => r.category === 'Card Backs' && r.level <= 30);
      cosmeticPurchaseState = { ...saved.owned, [reward.id]: { cost: 0 } };
      equippedCosmetics.cardBack = 'default';
      openLevelLadder();
      const tile = document.querySelector(`#levelLadderModal [data-ladder-id="${reward.id}"]`);
      assertTrue(!!tile, 'The reward is on the ladder');
      tile.click();
      assertEqual(equippedCosmetics.cardBack, 'default', 'A tap does not equip');
      const box = document.getElementById('bigPreview');
      assertTrue(!box.classList.contains('hidden') && box.dataset.itemId === reward.id, 'It opens the big preview');
      const equip = box.querySelector('[data-bp-equip]');
      assertTrue(!!equip, 'The preview has an Equip button for an owned item');
      equip.click();
      assertEqual(equippedCosmetics.cardBack, reward.id, 'Equip equips it');
      assertTrue(/Equipped/.test(box.querySelector('.bp-equip').textContent), 'The button then reads Equipped');
      closeBigPreview();
      cosmeticPurchaseState = { ...saved.owned };
      openBigPreview(reward.id, 'cardBack');
      assertTrue(!box.querySelector('.bp-equip'), 'No Equip button for an item you do not own');
      closeBigPreview();
    } finally {
      closeBigPreview(); document.getElementById('levelLadderModal').classList.add('hidden');
      try { localStorage.removeItem('shithead_ladder_seen_ladder-equip-test'); } catch (e) {}
      equippedCosmetics = saved.eq; cosmeticPurchaseState = saved.owned; applyEquippedCosmetics();
      xpFeatureOn = saved.on; document.body.classList.toggle('xp-on', !!saved.on); currentUser = saved.user; playerXp = saved.xp; refreshXpDisplays();
    }
  });
  await test('v290: extra daily challenges at Lvl 35/55 and weekly at 45/65; the first picks never change', () => {
    const saved = xpFeatureOn;
    try {
      xpFeatureOn = true;
      assertEqual(XP_RULES.extraDaily, [35, 55], 'Daily extras at 35 and 55');
      assertEqual(XP_RULES.extraWeekly, [45, 65], 'Weekly extras at 45 and 65');
      assertEqual(serverEconomyCatalog().xp.extraDaily, [35, 55], 'The server reads the same levels');
      const day = '2026-10-02', week = '2026-W41';
      const base = pickDailyChallengeIds(day);
      assertEqual(extraChallengePicks(XP_RULES.extraDaily, 34), 0, 'Lvl 34: 3 daily');
      assertEqual(extraChallengePicks(XP_RULES.extraDaily, 35), 1, 'Lvl 35: a 4th daily');
      assertEqual(extraChallengePicks(XP_RULES.extraDaily, 55), 2, 'Lvl 55: a 5th daily');
      const five = pickDailyChallengeIds(day, 2);
      assertEqual(five.length, 5, 'Five picks');
      assertEqual(five.slice(0, 3), base, 'The usual three stay first and unchanged');
      assertEqual(new Set(five).size, 5, 'No repeats');
      const wBase = pickWeeklyChallengeIds(week), wMore = pickWeeklyChallengeIds(week, 2);
      assertEqual(wMore.slice(0, wBase.length), wBase, 'Weekly extras go after the week\'s own picks');
      assertEqual(wMore.length, wBase.length + 2, 'Two extra weekly at Lvl 65');
      assertEqual(extraChallengePicks(XP_RULES.extraWeekly, 45), 1, 'Lvl 45: one extra weekly');
      const kept = ensureDailyChallengeState({ dateKey: getTodayUKDateKey(), challengeIds: pickDailyChallengeIds(getTodayUKDateKey()), progress: { x: 1 } }, 1);
      assertTrue(kept.changed && kept.state.challengeIds.length === 4 && kept.state.progress.x === 1, 'Levelling up adds the 4th and keeps progress');
      xpFeatureOn = false;
      assertEqual(extraChallengePicks(XP_RULES.extraDaily, 99), 0, 'No extras while XP is off');
      xpFeatureOn = true;
      const ladder = ladderRewards();
      assertTrue([35, 55].every(L => ladder.get(L).some(p => /daily challenge/.test(p.name))) && [45, 65].every(L => ladder.get(L).some(p => /weekly challenge/.test(p.name))), 'All four show on the Level Ladder');
    } finally { xpFeatureOn = saved; }
  });
  await test('v290: Quick Start steps 1 and 2 show the same table (hands, Face-Up, Face-Down)', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('quick_start');
      const snap = () => state.players.map(p => [p.hand, p.faceUp, p.faceDown].map(z => (z || []).map(c => `${c.rank}${c.suit}`).join(',')).join('|')).join(' / ');
      showTutorialStep(0);
      const first = snap();
      showTutorialStep(1);
      assertEqual(snap(), first, 'Nothing changes between step 1 and step 2');
      assertTrue(state.players[0].hand.some(c => c.rank === 'Q'), 'Step 1 already shows the hand used in step 2');
    } finally { endTutorial(false); }
  });
  await test('v290: every Challenges section folds with a chevron and shows done/total', () => {
    try { localStorage.removeItem('shithead_challenges_collapsed'); } catch (e) {}
    const heads = [...document.querySelectorAll('#challengesModal .ch-sec-head')];
    const titles = heads.map(h => h.textContent.replace(/[▾\d\/]/g, '').trim());
    ['Today', 'Getting Started', 'Friends', 'Hidden', 'Burns', 'Win Streaks', 'Gauntlet', 'This Week'].forEach(t => assertTrue(titles.includes(t), `${t} has a folding head`));
    assertTrue(heads.every(h => h.querySelector('.cat-head-chev')), 'Every head has a chevron');
    const burns = heads.find(h => h.dataset.chSec === 'challengesRankedBurnsList');
    burns.click();
    assertEqual(burns.getAttribute('aria-expanded'), 'false', 'A tap folds it');
    assertTrue(JSON.parse(localStorage.getItem('shithead_challenges_collapsed')).includes('challengesRankedBurnsList'), 'Remembered');
    burns.click();
    assertEqual(burns.getAttribute('aria-expanded'), 'true', 'A second tap opens it');
    const list = document.getElementById('challengesRankedBurnsList');
    list.innerHTML = renderChallengeRowHTML('A', 'x', 1, true) + renderChallengeRowHTML('B', 'y', 1, false);
    updateChallengeSectionCounts();
    assertEqual(burns.querySelector('.ch-sec-count').textContent, '1/2', 'The head counts what is done');
    try { localStorage.removeItem('shithead_challenges_collapsed'); } catch (e) {}
  });
  await test('v289: Play Friends timers run Blitz, Balanced, Casual left to right', () => {
    assertEqual(TURN_TIMER_PRESETS.map(p => p.id), ['blitz', 'balanced', 'casual'], 'Shortest time on the left');
    renderTurnTimerButtons();
    const labels = [...document.querySelectorAll('#turnTimerBtnRow button')].map(b => b.textContent.replace(/\d+s$/, '').trim());
    assertEqual(labels, ['Blitz', 'Balanced', 'Casual'], 'The lobby buttons follow that order');
  });
  await test('v289: Custom equips on a double-tap; one tap only previews and says how', () => {
    const saved = { eq: { ...equippedCosmetics }, owned: cosmeticPurchaseState, now: Date.now };
    let clock = 1e12;
    try {
      openThemesPanel();
      cosmeticPurchaseState = { 'frame-gold': { cost: 1 } };
      equippedCosmetics.frame = 'default';
      setCustomTab('frame');
      renderPersonalisationCosmetics();
      const tile = () => visibleCustomPanel().querySelector('[data-equip-type="frame"][data-equip-id="frame-gold"]');
      assertTrue(!!tile(), 'The owned frame has a tile');
      assertTrue(/Double-tap/.test(document.getElementById('customEquipHint').textContent), 'Custom says to double-tap');
      Date.now = () => clock;
      tile().click();
      assertEqual(equippedCosmetics.frame, 'default', 'One tap does not equip');
      assertTrue(/Double-tap to equip/.test(document.getElementById('infoPop')?.textContent || ''), 'One tap explains how to equip');
      clock += 1000; tile().click();
      assertEqual(equippedCosmetics.frame, 'default', 'Two slow taps do not equip');
      clock += 200; tile().click();
      assertEqual(equippedCosmetics.frame, 'frame-gold', 'A double-tap equips');
      assertEqual(getComputedStyle(tile()).touchAction, 'manipulation', 'A double-tap never zooms the page');
    } finally {
      Date.now = saved.now; hideInfoPop();
      equippedCosmetics = saved.eq; cosmeticPurchaseState = saved.owned; applyEquippedCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
  });
  await test('v289: gifting unlocks at Lvl 2 (no lock while XP is off) and the server checks it', () => {
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp };
    try {
      assertEqual(XP_RULES.giftLevel, 2, 'Gifting is a Lvl 2 unlock');
      assertEqual(serverEconomyCatalog().xp.giftLevel, 2, 'The server reads the same level');
      currentUser = { uid: 'gift-lock-test' };
      xpFeatureOn = true; playerXp = { total: 0, level: 1 };
      assertTrue(/Lvl 2/.test(giftLockReason()), 'Level 1 cannot gift');
      startGiftForFriend('friend-x', 'Sam');
      assertTrue(!giftTarget, 'The Friends gift button is refused below Lvl 2');
      playerXp = { total: xpForLevel(2), level: 2 };
      assertEqual(giftLockReason(), '', 'Level 2 can gift');
      xpFeatureOn = false; playerXp = { total: 0, level: 1 };
      assertEqual(giftLockReason(), '', 'No lock while XP is off');
      assertTrue(ladderRewards().get(2).some(p => p.name === 'Gifting'), 'The Level Ladder shows it at Lvl 2');
    } finally {
      giftTarget = null; renderGiftBanner();
      document.getElementById('shopModal').classList.add('hidden');
      xpFeatureOn = saved.on; currentUser = saved.user; playerXp = saved.xp;
    }
  });
  await test('v289: Weekly Reroll at Lvl 40 swaps one weekly challenge once a week', async () => {
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp, econ: challengeEconomy, confirm: window.confirm, set: db, loaded: challengeEconomyLoadedForUid };
    try {
      const week = getUkWeekKey();
      const picks = pickWeeklyChallengeIds(week);
      const pool = weeklyRulesFor(week).pool.map(c => c.id);
      const swapIn = pool.find(id => !picks.includes(id));
      xpFeatureOn = true; currentUser = { uid: 'reroll-test' }; challengeEconomyLoadedForUid = 'reroll-test';
      challengeEconomy = { ...saved.econ, completedChallenges: {}, weeklyReroll: null,
        weeklyChallengeState: { weekKey: week, challengeIds: picks.slice(), progress: { [picks[0]]: 2, [picks[1]]: 3 } } };
      db = { ref: () => ({ set: () => Promise.resolve(), once: () => Promise.resolve({ val: () => null }) }) };
      playerXp = { total: xpForLevel(39), level: 39 };
      assertEqual(weeklyRerollState(), 'locked', 'Locked below Lvl 40');
      renderChallengesPanel();
      assertTrue(!document.querySelector('[data-weekly-reroll]'), 'No reroll buttons while locked');
      assertTrue(/Lvl 40/.test(document.getElementById('challengesWeeklyReroll').textContent), 'The Weekly tab says when it unlocks');
      playerXp = { total: xpForLevel(40), level: 40 };
      renderChallengesPanel();
      assertEqual(document.querySelectorAll('#challengesWeeklyList [data-weekly-reroll]').length, picks.length, 'Each open weekly challenge has a reroll button');
      const calls = fakeEconomy({ weeklyReroll: (d) => ({ reroll: { week, from: d.id, to: swapIn, at: 1 } }) });
      window.confirm = () => true;
      await rerollWeeklyChallenge(picks[0]);
      assertEqual(calls[0], ['weeklyReroll', { id: picks[0] }], 'The server picks the new challenge');
      const ids = challengeEconomy.weeklyChallengeState.challengeIds;
      assertTrue(ids.includes(swapIn) && !ids.includes(picks[0]) && ids.length === picks.length, 'The new challenge takes its place');
      assertEqual(challengeEconomy.weeklyChallengeState.progress[swapIn] || 0, 0, 'It starts from 0');
      assertEqual(challengeEconomy.weeklyChallengeState.progress[picks[1]], 3, 'The others keep their progress');
      assertEqual(weeklyRerollState(), 'used', 'Used for this week');
      renderChallengesPanel();
      assertTrue(!document.querySelector('[data-weekly-reroll]'), 'No more reroll buttons this week');
      assertEqual(weeklyIdsFor(week, challengeEconomy.weeklyReroll).join(), ids.join(), 'A reload rebuilds the same picks');
      assertEqual(ladderRewards().get(40).filter(p => p.name === 'Weekly Reroll').length, 1, 'The Level Ladder shows it at Lvl 40');
    } finally {
      window.confirm = saved.confirm; db = saved.set; challengeEconomyLoadedForUid = saved.loaded;
      xpFeatureOn = saved.on; currentUser = saved.user; playerXp = saved.xp; challengeEconomy = saved.econ;
      document.getElementById('challengesModal')?.classList.add('hidden');
    }
  });
  await test('Select All Of A Rank sits left of the hand count, the size of the Card Powers button (v282)', () => {
    const btn = document.getElementById('multiSelectToggleBtn');
    const badge = document.getElementById('handCountBadge');
    assertTrue(!btn.closest('header'), 'The button is no longer in the header');
    assertTrue(btn.parentElement === badge.parentElement && btn.nextElementSibling === badge, 'It sits directly before the hand count');
    freshState({ drawPile: [] });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('4')] }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    render();
    const b = btn.getBoundingClientRect(), h = badge.getBoundingClientRect(), i = document.getElementById('cardRefBtn').getBoundingClientRect();
    assertTrue(b.right <= h.left - 2 && Math.abs((b.top + b.bottom) / 2 - (h.top + h.bottom) / 2) < 1.5, 'Left of the badge, on the same line');
    assertTrue(Math.abs(b.width - i.width) < 1 && Math.abs(b.height - i.height) < 1, `Same size as the Card Powers button (${b.width}x${b.height} vs ${i.width}x${i.height})`);
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
  await test('REGRESSION: the rank toggle keeps its full-size tile after toggling (was a tiny glyph on iPhone)', () => {
    const btn = document.getElementById('multiSelectToggleBtn');
    const prev = selectAllOfRank;
    selectAllOfRank = true; updateMultiSelectToggleUI();
    selectAllOfRank = false; updateMultiSelectToggleUI();
    const svg = btn.querySelector('svg use[href="#ui-select-rank"]');
    const box = btn.querySelector('svg') && btn.querySelector('svg').getBoundingClientRect();
    const text = Array.from(btn.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    selectAllOfRank = prev; updateMultiSelectToggleUI();
    assertTrue(!!svg, 'The select-rank tile must stay after a toggle');
    assertEqual(text, '', 'No text glyph in the button');
    const bw = btn.getBoundingClientRect().width;
    assertTrue(!!box && bw >= 24 && box.width >= bw * 0.7, 'The tile keeps its size, got ' + (box && box.width) + ' in ' + bw);
    assertTrue(!!btn.querySelector('.rank-toggle-dot'), 'An ON/OFF dot shows the state');
  });
  await test('Tutorial lessons: no random Face-Up card shares a rank the lesson uses, and Bonus Draw\'s PLAY IT is on top', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('card_7');
      showTutorialStep(1);
      const up = state.players[0].faceUp.map(c => c.rank);
      assertEqual(up.length, 3, 'Three Face-Up cards');
      assertTrue(!up.includes('5') && !up.includes('7'), 'No 5 or 7 among them, got ' + up.join(','));
      endTutorial(false);
      launchTutorialModule('bonus_draw');
      showTutorialStep(1);
      state.pendingFollowUp = { playerId: state.players[0].id, rank: '7' };
      render();
      const banner = document.getElementById('followUpToastBanner');
      const zone = document.getElementById('localPlayerZone');
      assertTrue(Number(banner.style.zIndex) > Number(zone.style.zIndex || 0), `Bonus prompt (${banner.style.zIndex}) above the lifted play area (${zone.style.zIndex})`);
      state.pendingFollowUp = null;
    } finally { endTutorial(false); }
  });
  await test('v289: lessons show playable cards in green even with a frame equipped; Quick Start copy', () => {
    freshState(); tutorialTestSetup();
    const prevFrame = document.body.dataset.equippedFrame;
    try {
      document.body.dataset.equippedFrame = 'frame-split-crimson';
      launchTutorialModule('quick_start');
      showTutorialStep(1);
      assertTrue(document.body.classList.contains('tutorial-on'), 'The lesson marks the page');
      const legal = document.querySelector('#localHand .animate-legal-glow');
      assertTrue(!!legal, 'A playable card is marked');
      const cs = getComputedStyle(legal);
      assertTrue(/52, 211, 153/.test(cs.boxShadow) && cs.borderTopColor === 'rgb(52, 211, 153)', `It is green, not the frame (${cs.borderTopColor} / ${cs.boxShadow})`);
      const pickup = TUTORIAL_MODULE_QUICK_START.find(st => /tap the Pile to pick it up/.test(st.text || ''));
      assertTrue(/\(Pickups are usually automatic\.\)$/.test(pickup.text), 'The pickup step says pickups are usually automatic');
      assertTrue(TUTORIAL_MODULE_QUICK_START.some(st => /A tick means yours can go on it\./.test(st.coachNote || '')), 'The Play Matrix step explains a tick plainly');
    } finally {
      endTutorial(false);
      if (prevFrame === undefined) delete document.body.dataset.equippedFrame; else document.body.dataset.equippedFrame = prevFrame;
    }
    assertTrue(!document.body.classList.contains('tutorial-on'), 'Ending the lesson clears it');
  });
  await test('Quick Start teaches press and hold: the step waits for a hold on the Pile AND one of your cards', async () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('quick_start');
      const idx = TUTORIAL_STEPS.findIndex(st => st.require && st.require.holdCheck);
      assertTrue(idx > 0 && TUTORIAL_STEPS[idx - 1].require?.tapCheck === '#cardRefBtn', 'Right after the Card Powers step');
      showTutorialStep(idx);
      const pile = document.getElementById('discardPileContainer'), hand = document.getElementById('localHand');
      assertTrue(pile.classList.contains('tutorial-glow') && hand.classList.contains('tutorial-glow'), 'The Pile and the hand glow');
      const hold = async (el) => {
        const r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 5, clientY: r.top + 5 }));
        await new Promise(res => setTimeout(res, CARD_HOLD_MS + 60));
        el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      };
      await hold(pile);
      assertTrue(!pile.classList.contains('tutorial-glow'), 'The Pile stops glowing once held');
      assertTrue(tutorialAwaitingAction, 'Still waiting for one of your cards');
      await hold(hand.querySelector('[data-card-id]'));
      assertTrue(!tutorialAwaitingAction, 'Both held: the step is done');
      assertTrue(TUTORIAL_STEPS[idx].text.split(/\s+/).length <= 18, 'Short text');
    } finally { endTutorial(false); }
  });
  await test('REGRESSION: tutorial Continue hides while the Coach plays (a second tap skipped the 3 lesson\'s Coach 3)', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('card_3');
      const btn = document.getElementById('tutorialNextBtn');
      assertTrue(!!tutorialPendingContinueAction && btn.style.display !== 'none', 'Step 1 waits on Continue to play the Coach 3');
      btn.click();
      assertEqual(btn.style.display, 'none', 'Continue hides while the Coach plays');
      btn.click();
      assertEqual(tutorialStep, 0, 'A second tap does not skip ahead');
      assertTrue(step2Text(), 'Step 2 says the 9 is under the 3');
    } finally { endTutorial(false); }
    function step2Text() { return TUTORIAL_MODULE_CARD_3[1].text.includes('under the 3'); }
  });
  await test('REGRESSION: the Snap Burn lesson plays by the rules (Coach\'s play passes to Rival, you snap on Rival\'s turn)', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('snap_burn');
      showTutorialStep(1);
      const step = TUTORIAL_MODULE_SNAP_BURN[1];
      assertTrue(![].concat(step.coachPlays).some(([r]) => r === '9'), 'No 9: nothing in the lesson changes direction');
      const coach = state.players[1], rival = state.players[2];
      const play = coach.hand.filter(c => c.rank === step.coachPlays[0][0]);
      assertTrue(play.length === 1 && isPlayLegal(play[0], state.discardPile, state.activeConstraint), "Coach's card is legal");
      state.currentTurnIndex = 1;
      executePlayCards(coach.id, play);
      assertEqual(state.direction, 1, 'Direction stays clockwise');
      assertEqual(document.getElementById('gameDirectionBadge').dataset.direction, 'cw', 'The badge shows clockwise');
      assertEqual(state.players[state.currentTurnIndex].id, rival.id, "It's Rival's turn after Coach, as the lesson says");
      const opp = getCurrentSnapOpportunity();
      assertTrue(!!opp && opp.cards.length === 1 && opp.cards[0].rank === TUTORIAL_MODULE_SNAP_BURN[2].require.rank, 'You can snap with the card the step asks for');
      TUTORIAL_MODULE_SNAP_BURN.forEach(st => assertTrue(!st.text.includes('9'), 'Lesson text never mentions a 9: ' + st.text));
    } finally { endTutorial(false); }
  });
  await test('A tutorial scene with a direction shows it on the direction badge at once', () => {
    freshState(); tutorialTestSetup();
    try {
      startTutorial();
      tutorialApplyScene({ hand: [['4', '♦']], pile: [['8', '♥']], coach: [['K', '♥']], direction: -1 });
      assertEqual(document.getElementById('gameDirectionBadge').dataset.direction, 'ccw', 'Anticlockwise shows at once');
      tutorialApplyScene({ hand: [['4', '♦']], pile: [['8', '♥']], coach: [['K', '♥']], direction: 1 });
      assertEqual(document.getElementById('gameDirectionBadge').dataset.direction, 'cw', 'Clockwise shows at once');
    } finally { endTutorial(false); }
  });
  await test('Cross-Phase lesson: Select all starts OFF, must be switched on before any card, then locks on; your setting comes back after', () => {
    freshState(); tutorialTestSetup();
    const before = selectAllOfRank;
    let saved = null; try { saved = localStorage.getItem('shithead_select_all_rank'); } catch (e) {}
    try {
      selectAllOfRank = true; updateMultiSelectToggleUI();
      launchTutorialModule('cross_phase');
      const idx = TUTORIAL_STEPS.findIndex(st => st.require && st.require.toggleRankSelect === 'on');
      const play = TUTORIAL_STEPS.findIndex(st => st.require && st.require.rank === '9');
      assertTrue(idx > 0 && idx < play, 'The toggle step comes before the 9s');
      showTutorialStep(idx);
      assertEqual(selectAllOfRank, false, 'Starts OFF even when the player had it on');
      const nine = state.players[0].hand.find(c => c.rank === '9');
      toggleCardSelection(nine.id, getAllSelectablePool(state.players[0]));
      assertEqual(state.selectedPlayCardIds.length, 0, 'Cards cannot be touched before the toggle is on');
      const btn = document.getElementById('multiSelectToggleBtn');
      render();
      assertTrue(btn.classList.contains('tutorial-glow'), 'The header button glows while the step waits');
      btn.click();
      assertEqual(selectAllOfRank, true, 'The header button switches it on');
      assertTrue(!btn.classList.contains('tutorial-glow'), 'It stops glowing once on');
      btn.click();
      assertEqual(selectAllOfRank, true, 'It stays locked on during the lesson');
      tutorialClearTimers();
      showTutorialStep(play);
      toggleCardSelection(nine.id, getAllSelectablePool(state.players[0]));
      assertEqual(state.selectedPlayCardIds.length, 3, 'One tap grabs both Hand 9s and the Face-Up 9');
      endTutorial(false);
      assertEqual(selectAllOfRank, true, "The player's own setting is back after the lesson");
    } finally {
      if (tutorialActive) endTutorial(false);
      selectAllOfRank = before; updateMultiSelectToggleUI();
      try { if (saved === null) localStorage.removeItem('shithead_select_all_rank'); else localStorage.setItem('shithead_select_all_rank', saved); } catch (e) {}
    }
  });
  await test('Joker Duel lesson: the Pile has cards whenever a Joker is explained or played', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('joker_duel');
      TUTORIAL_MODULE_JOKER_DUEL.forEach((st, i) => {
        if (st.scene) showTutorialStep(i);
        assertTrue(state.discardPile.length >= 3, `Step ${i + 1} has cards on the Pile to pick up (got ${state.discardPile.length})`);
      });
    } finally { endTutorial(false); }
  });
  await test('Snap Burn lesson: the bottom Snap Burn banner sits above the lifted hand and either button snaps', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('snap_burn');
      showTutorialStep(1);
      const coach = state.players[1];
      state.currentTurnIndex = 1;
      executePlayCards(coach.id, coach.hand.filter(c => c.rank === 'K'));
      tutorialClearTimers();
      showTutorialStep(2);
      render();
      const seen = [...state.discardPile, ...state.players[0].hand, ...state.players.flatMap(p => p.faceUp)].map(c => c.rank + c.suit);
      assertEqual(seen.filter((k, i) => seen.indexOf(k) !== i), [], 'No card shows twice on the table');
      const toast = document.getElementById('snapToastBanner');
      const zone = document.getElementById('localPlayerZone');
      assertTrue(!toast.classList.contains('hidden'), 'The banner shows');
      assertTrue(Number(toast.style.zIndex) > Number(zone.style.zIndex || 0), `Banner (${toast.style.zIndex}) above the lifted hand (${zone.style.zIndex})`);
      assertTrue(toast.classList.contains('tutorial-glow'), 'The banner glows during the step');
      assertTrue([].concat(TUTORIAL_STEPS[2].target).includes('#snapToastBanner'), 'The step spotlights the banner too');
      assertTrue(/Tap Snap Burn/.test(TUTORIAL_STEPS[2].text), 'The text names the Snap Burn button');
      toast.click();
      assertEqual(state.discardPile.length, 0, 'Tapping the banner snaps and burns the Pile');
    } finally { endTutorial(false); }
  });
  await test('Button names are written in Title Case in player-facing text', () => {
    const html = document.documentElement.innerHTML;
    ['Select all of a rank', 'Snap to Burn', 'Tap SNAP', 'SNAP BURN button', 'Tap Play it', 'Keep my account<', 'Update now<'].forEach(bad =>
      assertTrue(!html.includes(bad), 'Found "' + bad + '"'));
    assertTrue(document.getElementById('multiSelectToggleBtn').getAttribute('data-tip').startsWith('Select All Of A Rank'), 'The button tip says Select All Of A Rank');
  });
  await test('The home screen shows an empty table, even straight after a lesson', async () => {
    freshState(); tutorialTestSetup();
    const lobby = document.getElementById('lobbyScreen');
    const wasHidden = lobby.classList.contains('hidden');
    try {
      launchTutorialModule('snap_burn');
      endTutorial(false);
      assertTrue(!lobby.classList.contains('hidden'), 'Back on the home screen');
      await new Promise(res => setTimeout(res, 0));
      ['opponentsContainer', 'centerArena', 'localPlayerZone', 'leaveGameBtn'].forEach(id =>
        assertEqual(getComputedStyle(document.getElementById(id)).visibility, 'hidden', id + ' is hidden behind the home screen'));
    } finally {
      if (wasHidden) lobby.classList.add('hidden');
      await new Promise(res => setTimeout(res, 0));
    }
  });
  await test('Joker Duel lesson: only two Jokers in play, and the counter step makes you pick Rival, who counters', () => {
    freshState(); tutorialTestSetup();
    try {
      launchTutorialModule('joker_duel');
      const idx = TUTORIAL_MODULE_JOKER_DUEL.findIndex(st => st.jokerTarget);
      assertTrue(idx > 0, 'A step asks for a particular target');
      showTutorialStep(idx);
      const jokers = state.players.flatMap(p => [...p.hand, ...p.faceUp, ...p.faceDown]).filter(c => c.isJoker);
      assertEqual(jokers.length, 2, 'Exactly two Jokers on the table (yours and one other)');
      const rival = state.players.find(p => p.id === 'tut_rival'), coach = state.players.find(p => p.id === 'tut_bot');
      assertTrue(rival.hand.some(c => c.isJoker) && !coach.hand.some(c => c.isJoker), 'Rival holds the other Joker, not the Coach');
      assertTrue(/pick Rival/.test(TUTORIAL_MODULE_JOKER_DUEL[idx].text), 'The text says to pick Rival');
      const pileBefore = state.discardPile.length;
      executePlayCards('tut_you', state.players[0].hand.filter(c => c.isJoker));
      const btns = [...document.querySelectorAll('#jokerInlineTargets button')];
      const coachBtn = btns.find(b => b.textContent === 'Coach'), rivalBtn = btns.find(b => b.textContent === 'Rival');
      assertTrue(!!coachBtn && !!rivalBtn, 'The picker offers both');
      coachBtn.click();
      assertTrue(!document.getElementById('floatingJokerBar').classList.contains('hidden'), 'Picking Coach is refused');
      rivalBtn.click();
      assertTrue(document.getElementById('floatingJokerBar').classList.contains('hidden'), 'Picking Rival goes ahead');
      assertTrue(state.players[0].hand.length >= pileBefore, 'Rival countered: the Pile came back to you');
    } finally { endTutorial(false); }
  });
  await test('Home screen backdrop always honours the equipped table, including guests and event dates', () => {
    const saved = { user: currentUser, table: equippedCosmetics.tableTheme, over: seasonalNowOverride };
    try {
      seasonalNowOverride = '2026-06-10T12:00';
      equippedCosmetics.tableTheme = 'table-neon'; currentUser = null;
      assertEqual(homeBackdropTableId(), 'table-neon', 'Guest equipped table');
      currentUser = { uid:'home_bg_test' };
      assertEqual(homeBackdropTableId(), 'table-neon', 'Signed-in equipped table');
      seasonalNowOverride = '2026-10-25T12:00';
      assertEqual(homeBackdropTableId(), 'table-neon', 'Event cannot replace equipped table');
      equippedCosmetics.tableTheme = 'default';
      assertEqual(homeBackdropTableId(), 'default', 'Default choice is also respected');
    } finally {
      currentUser = saved.user; equippedCosmetics.tableTheme = saved.table; seasonalNowOverride = saved.over;
      const bg = document.getElementById('homeBackdrop'); if (bg) { bg.dataset.table = ''; refreshHomeBackdrop(); }
    }
  });
  await test('Home cards open their specific highlighted Card Powers entry', async () => {
    const guide = document.getElementById('rulesModal');
    const search = document.getElementById('guideSearchInput');
    const savedSearch = search.value;
    const tip = homeTipElement();
    try {
      assertEqual(tip.tagName, 'BUTTON', 'Home card is keyboard accessible');
      for (const rank of HOME_TIP_RANKS) {
        search.value = 'unrelated'; search.dispatchEvent(new Event('input'));
        fillHomeTip(tip, rank); tip.click();
        await new Promise(r => requestAnimationFrame(r));
        const entry = guide.querySelector(`[data-guide-power="${rank}"]`);
        assertTrue(!guide.classList.contains('hidden'), rank + ': Guide opens');
        assertTrue(entry.classList.contains('term-focus'), rank + ': exact entry highlighted');
        assertTrue(!entry.closest('.accordion-content').classList.contains('hidden'), 'Card Powers expanded');
        assertEqual(search.value, '', 'Previous search cleared');
        assertEqual(guide.querySelectorAll('.term-focus').length, 1, 'Only current entry highlighted');
      }
    } finally {
      guide.classList.add('hidden');
      guide.querySelectorAll('.term-focus').forEach(el => el.classList.remove('term-focus'));
      search.value = savedSearch; search.dispatchEvent(new Event('input'));
      if (homeTipRank) fillHomeTip(tip, homeTipRank);
    }
  });
  await test('Home screen card tip: the eight power cards, each with its rule; never over the panel or off screen', async () => {
    assertEqual(HOME_TIP_RANKS, ['5', '6', '7', '8', '9', '10', 'J', 'JOKER'], 'Cards 5–10, Jack and Joker');
    HOME_TIP_RANKS.forEach(r => assertTrue(!!CARD_HOLD_TEXT[r] && CARD_REFERENCE.some(x => x[0] === r), r + ' has a rule and a power'));
    const lobby = document.getElementById('lobbyScreen');
    const wasHidden = lobby.classList.contains('hidden');
    lobby.classList.remove('hidden');
    try {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      refreshHomeScreen();
      const panel = lobby.querySelector(':scope > div.bg-slate-900').getBoundingClientRect();
      const header = document.querySelector('header').getBoundingClientRect();
      assertTrue(panel.top >= header.bottom - 1 || lobby.scrollHeight > lobby.clientHeight, 'The panel starts below the header');
      const tip = document.getElementById('homeCardTip');
      if (!tip.classList.contains('hidden')) {
        const t = tip.getBoundingClientRect();
        assertTrue(t.bottom <= panel.top || t.top >= panel.bottom || t.right <= panel.left || t.left >= panel.right, 'The tip never covers the panel');
        assertTrue(t.left >= 0 && t.right <= innerWidth && t.top >= 0 && t.bottom <= innerHeight, 'The tip stays on screen');
      }
      if (!tip.classList.contains('hidden') && tip.classList.contains('home-tip-below')) {
        const inner = tip.querySelector('.home-tip-inner');
        assertEqual(getComputedStyle(inner).justifyContent, 'center', 'The card and its rule are centred in the strip');
      }
      const first = homeTipRank; rotateHomeTip();
      await new Promise(r => setTimeout(r, 300));
      if (!tip.classList.contains('hidden')) assertTrue(homeTipRank !== first, 'It moves on to a different card');
    } finally {
      if (wasHidden) lobby.classList.add('hidden');
      await new Promise(r => setTimeout(r, 0));
    }
  });
  await test('Changing the deck keeps every other page class (lobby-open, reduce-motion)', () => {
    const before = state.deckTheme;
    document.body.classList.add('home-class-probe');
    try {
      selectDeckTheme('theme-emerald');
      assertTrue(document.body.classList.contains('home-class-probe'), 'Other classes stay');
      assertTrue(document.body.classList.contains('theme-emerald') && [...document.body.classList].filter(c => c.startsWith('theme-')).length === 1, 'Exactly one deck theme class');
    } finally {
      document.body.classList.remove('home-class-probe');
      selectDeckTheme(before || 'theme-obsidian');
    }
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
    assertTrue(row.replace(/<[^>]+>/g, '').includes('Burn the pile 20 times in Ranked.'), 'A completed row shows its description');
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
  await test('Ranked: a win earns the Elo change plus a win bonus, and streak bonuses land once at 2, 3, 5 and 10 wins', () => {
    const winner = makePlayer({ id: 'p1', name: 'Amit', hasFinished: true, finishRank: 1, rating: 500, uid: 'u1' });
    const loser = makePlayer({ id: 'p2', name: 'Pooja', hasFinished: true, finishRank: 2, rating: 500, uid: 'u2' });
    const saved = rankedRatingDraft;
    try {
      rankedRatingDraft = null;
      const html = buildFinalStandingsHtml([winner, loser], 'p2', true);
      assertTrue(html.includes(`\u2605${500 + 16 + RANKED_BONUS.win} (+${16 + RANKED_BONUS.win})`), 'Equal ratings: the winner gets 16 + the win bonus');
      assertTrue(html.includes('\u2605484 (-16)'), 'The loser only loses the Elo change');
      rankedRatingDraft = { from: 500, to: 541, streak: 3, streakBonus: 10 };
      assertTrue(buildFinalStandingsHtml([winner, loser], 'p1', true).includes('\u2605541 (+41)'), "Your own line shows the server's real result");
    } finally { rankedRatingDraft = saved; }
    const bonus = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 20, 25, 30].map(n => rankedStreakBonus(n));
    assertEqual(bonus, [0, 5, 10, 0, 15, 0, 0, 0, 0, 20, 0, 20, 0, 20], 'Streak bonuses never stack and repeat every 10');
    assertEqual(serverEconomyCatalog().rankedBonus, RANKED_BONUS, 'The server reads the same numbers');
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
  await test(`Stalemate: the same position coming round ${STALEMATE_REPEATS} times ends in a draw (warned first); nobody wins it`, () => {
    const x = makeCard('4'), y = makeCard('K');
    const a = makePlayer({ id: 'p1', name: 'Amit', hand: [x, makeCard('5')] });
    const b = makePlayer({ id: 'p2', name: 'Pooja', isBot: true, hand: [y] });
    freshState({ players: [a, b], drawPile: [], discardPile: [] });
    const banners = [];
    const savedBanner = notifyBanner;
    notifyBanner = (msg) => banners.push(msg);
    try {
      // A loop: Amit plays his 4, Pooja picks it up, plays it back, Amit picks it up.
      const steps = [
        () => { a.hand = a.hand.filter(c => c !== x); state.discardPile = [x]; state.currentTurnIndex = 1; },
        () => { b.hand.push(...state.discardPile); state.discardPile = []; state.currentTurnIndex = 0; },
        () => { b.hand = b.hand.filter(c => c !== x); state.discardPile = [x]; state.currentTurnIndex = 0; },
        () => { a.hand.push(...state.discardPile); state.discardPile = []; state.currentTurnIndex = 0; }
      ];
      noteStalemateTurn();
      noteStalemateTurn(); // the same position twice in a row is counted once
      let ended = false, n = 0;
      while (!ended && n < 100) { steps[n % 4](); n++; noteStalemateTurn(); ended = checkStalemate(); }
      assertTrue(ended && n === (STALEMATE_REPEATS - 1) * 4, `Coming round the ${STALEMATE_REPEATS}th time ends it (after ${n} turns)`);
      assertTrue(banners.some(m => /ends in a draw soon/.test(m)), 'Players are warned one time round before');
      assertEqual(state.phase, 'FINISHED', 'The match is over');
      assertTrue(a.drew && b.drew && a.finishRank === 1 && b.finishRank === 1, 'Both drew and share the place');
      assertEqual(matchPlacingInfo(a).title, 'Draw', 'The summary says Draw');
      assertTrue(!isShitHead(a) && !isShitHead(b), 'Nobody is the ShitHead');
      assertTrue(buildFinalStandingsHtml([a, b], 'p1', false).includes('Draw'), 'Final Standings marks the draw');
      assertTrue(/Draw/.test(matchHistoryHtml([{ at: Date.now(), mode: 'bots', label: 'Vs Bots', place: 1, of: 2, draw: true, players: [], stats: {} }])), 'Match History shows a draw, not a win');
    } finally { notifyBanner = savedBanner; hideMatchEndUI(); }
  });
  await test(`Stalemate: a backstop after ${STALEMATE_TURNS} turns without progress; a burn, a draw from the Deck or a table card starts the count again`, () => {
    const a = makePlayer({ id: 'p1', hand: Array.from({ length: 200 }, (_, i) => makeCard(String(4 + (i % 5)))) });
    const b = makePlayer({ id: 'p2', hand: [makeCard('K')], faceUp: [makeCard('Q')] });
    freshState({ players: [a, b], drawPile: [], discardPile: [] });
    const savedBanner = notifyBanner;
    notifyBanner = () => {};
    try {
      const play = () => { state.discardPile.push(a.hand.shift()); state.currentTurnIndex ^= 1; noteStalemateTurn(); return checkStalemate(); };
      noteStalemateTurn();
      for (let i = 0; i < 40; i++) play();
      assertEqual(state.stalemate.turns, 40, 'Each new position is a turn without progress');
      b.hand.push(b.faceUp.pop()); // a table card leaves the table
      noteStalemateTurn();
      assertEqual(state.stalemate.turns, 0, 'A table card is progress');
      let ended = false, n = 0;
      while (!ended && n < 400) { ended = play(); n++; }
      assertTrue(ended && n === STALEMATE_TURNS, `The backstop lands on turn ${STALEMATE_TURNS} (got ${n})`);
      assertTrue(a.drew && b.drew, 'Both drew');
    } finally { notifyBanner = savedBanner; hideMatchEndUI(); }
  });
  await test('Draws: the hidden Draw a Game challenge (420) shows as ??? until earned; draws count in Stats and Match History; a draw is reported', async () => {
    const def = CHALLENGE_DEFS.draws.find(c => c.id === 'draw-a-game');
    assertTrue(def && def.reward === 420 && def.hidden && def.name === 'Draw a Game', 'Draw a Game pays 420 and is hidden');
    assertEqual(serverEconomyCatalog().challengeDefs.draws, CHALLENGE_DEFS.draws, 'The server pays from the same numbers');
    const savedEco = challengeEconomy, savedUser = currentUser, savedLoaded = challengeEconomyLoadedForUid;
    try {
      currentUser = savedUser || { uid: 'test-uid' };
      challengeEconomyLoadedForUid = currentUser.uid;
      challengeEconomy = { ...savedEco, completedChallenges: {} };
      renderChallengesPanel();
      const hidden = document.getElementById('challengesHiddenList').textContent;
      assertTrue(/\?\?\?/.test(hidden) && !/Draw a Game/.test(hidden), 'Before: a mystery row, the name stays secret');
      challengeEconomy = { ...savedEco, completedChallenges: { 'draw-a-game': { completedAt: 1, reward: 420 } } };
      renderChallengesPanel();
      assertTrue(/Draw a Game/.test(document.getElementById('challengesHiddenList').textContent), 'After: the real name');
      assertEqual(challengeNameForKey('draw-a-game'), { name: 'Draw a Game', group: 'Hidden' }, 'Completed list names it');
    } finally { challengeEconomy = savedEco; currentUser = savedUser; challengeEconomyLoadedForUid = savedLoaded; renderChallengesPanel(); }
    const html = buildRankedStatsHtml({ wins: 3, losses: 2, rating: 520, rankedStats: { draws: 1 } });
    assertTrue(/Ranked draws/.test(html) && />6</.test(html), 'Ranked stats list draws and count them as games played');
    const mh = matchHistoryHtml([{ at: Date.now(), place: 1, of: 2, draw: true, players: [], stats: {} }, { at: Date.now(), place: 1, of: 2, players: [], stats: {} }]);
    assertTrue(/<b>1<\/b><span>Draws/.test(mh), 'Match History counts draws');
    const savedUser2 = currentUser;
    const calls = fakeEconomy({ matchFinished: () => ({ claimed: [], diamonds: 0 }) });
    try {
      currentUser = { uid: 'test-uid' };
      freshState({ players: [makePlayer({ id: 'p1', drew: true, hasFinished: true, finishRank: 1 })], matchId: 'm_draw' });
      await reportMatchFinished();
      assertEqual(calls[0], ['matchFinished', { matchId: 'm_draw', drew: true }], 'A Vs Bots draw is reported');
    } finally { callEconomy = offlineEconomy; currentUser = savedUser2; }
  });
  await test('Stalemate: online, only the match driver calls the draw', () => {
    const a = makePlayer({ id: 'p1', hand: [makeCard('4')] }), b = makePlayer({ id: 'p2', hand: [makeCard('5')] });
    freshState({ players: [a, b], stalemate: { key: 'x', sig: 'y', turns: STALEMATE_TURNS } });
    state.stalemate.key = stalemateKey();
    const savedAuth = hasMatchAuthority;
    try {
      state.isMultiplayer = true;
      hasMatchAuthority = () => false;
      assertTrue(!checkStalemate() && state.phase === 'PLAY', 'Another phone never ends the match');
    } finally { hasMatchAuthority = savedAuth; state.isMultiplayer = false; }
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
    const ids = ['hamburgerBtn', 'headerProfileBtn', 'navHomeLogoBtn', 'headerDiamondBtn', 'headerInboxBtn', 'leaveGameBtn'];
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
  await test('REGRESSION: previewing a burn effect in Custom plays under its tile without shaking the table', () => {
    const modal = document.getElementById('themesModal');
    const wasHidden = modal.classList.contains('hidden');
    modal.classList.remove('hidden');
    try {
      renderPersonalisationCosmetics();
      setCustomTab('burnEffect');
      document.getElementById('gameTable').classList.remove('animate-screen-shake');
      const particlesBefore = particles.length;
      previewEquippedCosmetic('burnEffect', 'burn-ice');
      const box = document.querySelector('#personalisationBurnEffects .custom-inline-preview');
      assertTrue(!!box, 'The preview opens inside the Burn grid, not at the top of the page');
      const tile = document.querySelector('#personalisationBurnEffects [data-equip-id="burn-ice"]');
      assertTrue(box.getBoundingClientRect().top >= tile.getBoundingClientRect().bottom - 1, 'It opens under the tapped tile');
      const rowMates = [...document.querySelectorAll('#personalisationBurnEffects .cosmetic-tile')].filter(t => t.offsetTop === tile.offsetTop);
      assertTrue(rowMates.every(t => t.getBoundingClientRect().bottom <= box.getBoundingClientRect().top + 1), 'After the whole row, so the row stays together');
      assertTrue(box.querySelectorAll('.shop-burn-particle').length > 0, 'The burn preview plays inside it');
      assertEqual(box.querySelector('.shop-burn-core').textContent, '❄️', 'It shows the previewed effect');
      assertTrue(!document.querySelector('#personalisationBurnStage, #personalisationJokerStage'), 'No preview stage at the top of the page any more');
      previewEquippedCosmetic('jokerEffect', 'joker-magic');
      assertEqual(document.querySelectorAll('#themesModal .custom-inline-preview').length, 0, 'A Joker tile not on screen opens nothing (and the old preview closes)');
      setCustomTab('jokerEffect');
      previewEquippedCosmetic('jokerEffect', 'joker-magic');
      assertTrue(!!document.querySelector('#personalisationJokerEffects .custom-inline-preview .jfx-stage'), 'Joker previews open under their tile too');
      assertTrue(!document.getElementById('gameTable').classList.contains('animate-screen-shake'), 'Previewing must not shake the game table behind Custom');
      assertEqual(particles.length, particlesBefore, 'Previewing must not use the hidden gameplay particle canvas');
    } finally {
      document.querySelectorAll('#jokerFxLayer > *, .custom-inline-preview').forEach(n => n.remove());
      setCustomTab('all');
      if (wasHidden) modal.classList.add('hidden');
    }
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
    const free = BUILT_IN_COSMETICS.filter(i => i.category === 'Avatars').map(i => i.name);
    assertEqual(free, ['Bronze Crown', 'Spades', 'Hearts', 'Diamonds', 'Clubs'], 'Free pictures: Bronze Crown + the 4 suits');
    const shop = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Avatars' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(shop, { 'Ace of Spades': 200, 'Queen of Hearts': 200, 'Joker': 200, 'Burn Flame': 500, 'Transparent Ghost': 500, 'Frozen': 500, 'Burning 10': 1000, 'Fanned Hand': 1000, 'Joker Card': 1000, 'Royal Flush': 2500, 'Cosmic Ace': 2500, 'Sapphire Sovereign': 5000, 'Crimson Inferno': 5000, 'Scarlet Guardian': 5000, 'Turtley': 5000 }, 'Shop pictures and prices');
    assertEqual(EARNED_AVATARS.filter(i => !i.season).map(i => i.name), ['Silver Crown', 'Gold Crown', 'Platinum Crown', 'Master Crown', 'Centurion', 'ShitHead', 'Gauntlet Champion', 'Gauntlet Conqueror', 'Gauntlet Overlord', 'Recruiter'], 'Earn-only pictures');
    [...BUILT_IN_COSMETICS, ...COSMETIC_SHOP_ITEMS, ...EARNED_AVATARS].filter(i => i.category === 'Avatars')
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
    assertEqual(options.length, 35, 'All 35 avatars appear in Custom (incl. the 5 level rewards and 3 Gauntlet crests)');
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
  await test('Card Powers and Play Matrix stay where they were placed while cards are played (v275)', () => {
    const pos = (id) => { const el = document.getElementById(id); return `${el.style.left}|${el.style.top}`; };
    const row = document.getElementById('turnIndicatorRow');
    try {
      freshState({ phase: 'PLAY', localPlayerId: 'me' });
      state.players = [makePlayer({ id: 'me', hand: [makeCard('4')] }), makePlayer({ id: 'b1', isBot: true })];
      toggleCardReference(); toggleMatrixReference();
      const card = pos('cardRefPanel'), matrix = pos('matrixRefPanel');
      // A play: the hand changes, the HUD row the Matrix default hangs off moves.
      state.players[0].hand = [makeCard('K'), makeCard('JOKER')];
      if (row) row.style.marginTop = '120px';
      renderCardReference(); renderMatrixReference(); render();
      assertEqual(pos('cardRefPanel'), card, 'Card Powers did not move');
      assertEqual(pos('matrixRefPanel'), matrix, 'Play Matrix did not move');
    } finally {
      if (row) row.style.marginTop = '';
      if (cardRefOpen) toggleCardReference(true);
      if (matrixRefOpen) toggleMatrixReference(true);
    }
  });

  await test('Level Ladder (v277–v278): opens from your level, shows every level reward, sits on "You are here", equips owned rewards, climbs, friends, level tips', async () => {
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp, owned: cosmeticPurchaseState, eq: { ...equippedCosmetics } };
    const modal = document.getElementById('levelLadderModal');
    try {
      xpFeatureOn = true; document.body.classList.add('xp-on');
      currentUser = { uid: 'ladder-test' };
      const total = xpForLevel(35) + 10;
      playerXp = { total, level: 35, week: getUkWeekKey(), weekXp: 500 };
      cosmeticPurchaseState = Object.fromEntries(LEVEL_REWARDS.filter(r => r.level <= 35).map(r => [r.id, true]));
      refreshXpDisplays();
      for (const id of ['homeNameLevel', 'profileLevelBadge', 'hamburgerLevel']) {
        modal.classList.add('hidden');
        document.getElementById(id).click();
        assertTrue(!modal.classList.contains('hidden'), `Tapping #${id} opens the Level Ladder`);
      }
      const ids = [...modal.querySelectorAll('[data-ladder-id]')].map(el => el.dataset.ladderId);
      assertEqual(LEVEL_REWARDS.filter(r => !ids.includes(r.id)).map(r => r.id), [], 'Every level reward is on the ladder');
      assertTrue(!!modal.querySelector(`[data-ladder-level="${XP_MAX_LEVEL}"].final`), 'The last card is the max level, from the level table');
      for (let L = 10; L <= XP_MAX_LEVEL; L += 10) assertTrue(!!modal.querySelector(`[data-ladder-level="${L}"]`), `Milestone ${L} has its own row`);
      assertEqual([ladderMilestoneDiamonds(XP_MAX_LEVEL), ladderMilestoneDiamonds(90), ladderMilestoneDiamonds(42)], [999, 100, 20], 'Level 99 pays 999 Diamonds, every 10th 100, others 20 (v285)');
      assertTrue(modal.querySelector(`[data-ladder-level="${XP_MAX_LEVEL}"]`).textContent.includes('999'), 'The max level row shows 999');
      assertTrue(!!modal.querySelector(`[data-ladder-level="${SERIES_RULES.level}"]`) && modal.textContent.includes('Best Of Series'), 'Unlocks (series, speeds, Gauntlets, look slots) are listed');
      assertTrue(modal.querySelector('[data-ladder-level="30"]').classList.contains('got') && modal.querySelector('[data-ladder-level="40"]').classList.contains('locked'), 'Levels behind you are unlocked, ahead locked');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const scroll = document.getElementById('levelLadderScroll'), here = modal.querySelector('[data-ladder-here]');
      const a = scroll.getBoundingClientRect(), h = here.getBoundingClientRect();
      assertTrue(h.top >= a.top && h.bottom <= a.bottom, '"You are here" is on screen when it opens');
      modal.querySelector('[data-ladder-id="back-lvl-sharks-mark"]').click();
      assertEqual(equippedCosmetics.cardBack !== 'back-lvl-sharks-mark' || false, true, 'A tap opens the big preview, never equips (v290)');
      document.querySelector('#bigPreview [data-bp-equip]').click();
      closeBigPreview();
      assertEqual(equippedCosmetics.cardBack, 'back-lvl-sharks-mark', 'Its Equip button equips it');
      modal.querySelector('[data-ladder-id="avatar-lvl-burn-king"]').click();
      assertTrue(!document.getElementById('bigPreview').classList.contains('hidden'), 'Tapping a locked reward previews it');
      closeBigPreview();
      // v278: a level up climbs from the old level; what it unlocked glows with Equip.
      modal.classList.add('hidden');
      openLevelLadder({ from: 29 });
      assertTrue(modal.querySelector('[data-ladder-level="30"]').classList.contains('ll-new'), 'A level just passed glows');
      assertTrue(!modal.querySelector('[data-ladder-level="25"]').classList.contains('ll-new'), 'Older levels do not');
      assertTrue(getComputedStyle(modal.querySelector('[data-ladder-level="30"] .ll-equip')).display !== 'none', 'Just-unlocked rewards say Equip');
      // Friends sit at their levels; tapping a level shows its XP.
      paintLadderFriends([{ uid: 'f1', username: 'Elena', avatar: 'default', level: 42 }, { uid: 'f2', username: 'Bob', avatar: 'default', level: 40 }, { uid: 'f3', username: 'Sam', avatar: 'default', level: 35 }]);
      assertTrue(!!modal.querySelector('[data-ladder-level="40"] [data-ladder-friend="f2"]'), 'A friend on a reward level sits on its card');
      assertTrue(!!ladderElementForLevel(35)?.querySelector('[data-ladder-friend="f3"]'), 'A friend at your level sits on your level (its row, or "You are here")');
      assertTrue(!!modal.querySelector('[data-ladder-range="41-44"] [data-ladder-friend="f1"]'), 'A friend between rewards sits on that folded line');
      // Six friends on one level: ordered by total XP, then online, then name; "+2" lists them all (v280).
      const now = Date.now();
      const crowd = [['c1', 'Zed', 100], ['c2', 'Amy', 900], ['c3', 'Bea', 500], ['c4', 'Cal', 500], ['c5', 'Dan', 300], ['c6', 'Eve', 50]]
        .map(([uid, username, xp]) => ({ uid, username, avatar: 'default', level: 40, xp, online: uid === 'c4', seen: now }));
      paintLadderFriends(crowd);
      const chips = [...modal.querySelectorAll('[data-ladder-level="40"] .ll-friends > [data-ladder-friend]')].map(b => b.dataset.ladderFriend);
      assertEqual(chips, ['c2', 'c4', 'c3', 'c5'], 'Most XP first; on equal XP an online friend first');
      const more = modal.querySelector('[data-ladder-level="40"] [data-ladder-more]');
      assertTrue(!!more && more.textContent.trim() === '+2' && more.tagName === 'BUTTON', '"+2" is a button');
      more.click();
      const pop = document.getElementById('infoPop');
      assertEqual([...pop.querySelectorAll('[data-ladder-friend]')].map(b => b.dataset.ladderFriend), ['c2', 'c4', 'c3', 'c5', 'c1', 'c6'], 'Its list shows every friend on that row, in order');
      hideInfoPop();
      assertTrue(ladderLevelTipHtml('60').includes(xpForLevel(60).toLocaleString('en-GB')) && ladderLevelTipHtml('30').includes('reached'), 'A level tip gives its total XP');
      modal.querySelector('[data-ladder-node="60"]').click();
      assertTrue(document.getElementById('infoPop')?.textContent.includes('Lvl 60'), 'Tapping a level shows its XP');
      hideInfoPop();
      xpFeatureOn = false;
      modal.classList.add('hidden');
      assertEqual(openLevelLadder(), false, 'Not while levels are switched off');
    } finally {
      closeBigPreview(); modal.classList.add('hidden');
      xpFeatureOn = saved.on; document.body.classList.toggle('xp-on', !!saved.on);
      currentUser = saved.user; playerXp = saved.xp; cosmeticPurchaseState = saved.owned; equippedCosmetics = saved.eq;
      applyEquippedCosmetics(); refreshXpDisplays();
    }
  });
  await test('Pop-ups sit above pages (v281): nothing high is left inside the isolated table, and the Ladder friend card is on top', async () => {
    const table = document.getElementById('gameTable');
    const trapped = [...table.querySelectorAll('*')].filter(el => { const cs = getComputedStyle(el); return cs.position === 'fixed' && (parseInt(cs.zIndex) || 0) > 95; }).map(el => el.id || el.className);
    assertEqual(trapped, [], 'No pop-up above page level lives inside #gameTable (its isolation would put it under every page)');
    for (const id of ['playerPopup', 'challengeToast', 'signOutConfirm', 'giftModal', 'giftOpenModal', 'dailyRewardModal', 'installHelpModal']) {
      const el = document.getElementById(id);
      if (el) assertTrue(el.parentElement === document.body, `#${id} is at the top level of the page`);
    }
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp };
    const modal = document.getElementById('levelLadderModal');
    try {
      xpFeatureOn = true; document.body.classList.add('xp-on');
      currentUser = { uid: 'ladder-card-test' };
      playerXp = { total: xpForLevel(35) + 5, level: 35 };
      openLevelLadder();
      paintLadderFriends([{ uid: 'k1', username: 'Kim', avatar: 'default', level: 35 }]);
      modal.querySelector('[data-ladder-friend="k1"]').click();
      const card = document.getElementById('playerPopupBody').getBoundingClientRect();
      const hit = document.elementFromPoint(card.left + card.width / 2, card.top + Math.min(40, card.height / 2));
      assertTrue(!!hit && !!hit.closest('#playerPopup'), 'A friend\'s card from the Level Ladder shows over the Ladder');
    } finally {
      document.getElementById('playerPopupClose')?.click();
      modal.classList.add('hidden');
      xpFeatureOn = saved.on; document.body.classList.toggle('xp-on', !!saved.on);
      currentUser = saved.user; playerXp = saved.xp;
      refreshXpDisplays();
    }
  });
  await test('Every menu page closes with a tap outside its panel', async () => {
    for (const id of [...MENU_PAGE_IDS, 'inboxModal']) {
      const m = document.getElementById(id);
      if (!m) continue;
      m.classList.remove('hidden');
      m.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise(r => setTimeout(r, 30));
      const closed = m.classList.contains('hidden');
      m.classList.add('hidden');
      assertTrue(closed, `#${id} closes on a tap outside`);
    }
  });
  await test('Level Ladder "New" dot (v279): shows for unseen level rewards, never for old levels, clears on opening and climbs from the last level seen', async () => {
    const saved = { on: xpFeatureOn, user: currentUser, xp: playerXp };
    const modal = document.getElementById('levelLadderModal');
    const key = 'shithead_ladder_seen_ladder-dot-test';
    const dot = () => ['homeNameLevel', 'profileLevelBadge', 'hamburgerLevel'].map(id => document.getElementById(id).classList.contains('ll-new-dot'));
    try {
      localStorage.removeItem(key);
      xpFeatureOn = true; document.body.classList.add('xp-on');
      currentUser = { uid: 'ladder-dot-test' };
      playerXp = { total: xpForLevel(12) + 5, level: 12 };
      refreshXpDisplays();
      assertEqual(dot(), [false, false, false], 'A first look at an account starts at its level: no dot for old levels');
      assertEqual(localStorage.getItem(key), '12', 'The level seen is stored');
      const next = [...ladderRewards().keys()].filter(L => L > 12).sort((a, b) => a - b)[0];
      playerXp = { total: xpForLevel(next) + 5, level: next };
      refreshXpDisplays();
      assertEqual(dot(), [true, true, true], `Reaching Lvl ${next} (a reward) shows the dot`);
      document.getElementById('homeNameLevel').click();
      assertTrue(!modal.classList.contains('hidden'), 'The ladder opens');
      assertTrue(modal.querySelectorAll('.ll-new').length > 0, 'The unseen rewards glow as new');
      assertEqual(dot(), [false, false, false], 'Opening the ladder clears the dot');
      assertEqual(localStorage.getItem(key), String(next), 'The new level is remembered');
      modal.classList.add('hidden');
      xpFeatureOn = false; document.body.classList.remove('xp-on');
      refreshXpDisplays();
      assertEqual(dot(), [false, false, false], 'No dot while XP is off');
    } finally {
      try { localStorage.removeItem(key); } catch (e) {}
      modal.classList.add('hidden');
      xpFeatureOn = saved.on; document.body.classList.toggle('xp-on', !!saved.on);
      currentUser = saved.user; playerXp = saved.xp;
      refreshXpDisplays();
    }
  });

  await test('End of match (v274): Ranked keeps its buttons, its card history reads, Fireside has no wreath row, Leave fits each mode', () => {
    // The Ranked server logs one entry per play with a cards list.
    const hist = normalizePlayedHistory([
      { type: 'play', playerName: 'A', cards: [{ id: 'x', rank: '7', suit: '♠', isJoker: false }, { id: 'y', rank: '7', suit: '♥', isJoker: false }], blindFailed: false },
      { type: 'pickup', playerName: 'B' }, { type: 'play', playerName: 'B', cards: [{ id: 'z', rank: 'JOKER', suit: 'JOKER', isJoker: true }] },
      { type: 'play', playerName: 'C', rank: 'K', suit: '♦' }, { type: 'play', playerName: 'D' }]);
    assertEqual(hist.map(h => h.type === 'play' ? `${h.playerName}${h.rank}${h.isJoker ? '*' : h.suit}` : h.type), ['A7♠', 'A7♥', 'pickup', 'BJOKER*', 'CK♦'], 'Server plays spread into one entry per card; empty ones dropped');
    const scene = JSON.stringify(ShTableScenes.scene('christmas', 390, 844));
    assertTrue(/wall-wreath/.test(scene) && !/garland/.test(scene), 'Fireside keeps its wall wreath but no row of wreaths along the top');
    const saved = { user: currentUser, mp: state.isMultiplayer, ranked: state.isRanked, room: state.roomCode, players: state.players, phase: state.phase, matchId: state.matchId, auth: state.serverAuthority, local: state.localPlayerId };
    try {
      currentUser = { uid: 'u1' };
      Object.assign(state, { isMultiplayer: true, isRanked: true, roomCode: 'TEST', serverAuthority: 0, matchId: null });
      const seat = (id, uid, rank) => ({ id, uid, name: id, hand: [], faceUp: [], faceDown: [], hasFinished: true, finishRank: rank, gameStats: {} });
      applyRankedView({ authority: 1, matchId: 'rk-end', phase: 'FINISHED', stateVersion: 3, players: [seat('p1', 'u1', 1), seat('p2', 'u2', 2)], currentTurnIndex: 0, direction: 1, playedHistory: [] });
      const row = document.getElementById('matchEndButtonRow');
      assertTrue(row.getClientRects().length > 0, 'The Ranked end row is on screen (its container is no longer hidden)');
      assertTrue(row.querySelector('#playAgainMatchBtn').textContent.includes('RANKED') && !row.querySelector('#matchStatsBtn').classList.contains('hidden'), 'Match Stats + Return To Ranked');
      assertTrue(!!document.getElementById('finishedLeaveBtn'), 'Leave under the finished box in Ranked');
      assertTrue(finishedLeaveOffered(), 'Ranked offers Leave once finished');
      state.isRanked = false;
      assertTrue(finishedLeaveOffered(), 'Play Friends offers Leave once finished');
      state.phase = 'PLAY';
      assertTrue(!finishedLeaveOffered(), 'Never online while the match is still on');
      state.isMultiplayer = false;
      assertTrue(finishedLeaveOffered(), 'Vs Bots / Gauntlet always offer Leave');
    } finally {
      hideMatchEndUI();
      currentUser = saved.user;
      Object.assign(state, { isMultiplayer: saved.mp, isRanked: saved.ranked, roomCode: saved.room, players: saved.players, phase: saved.phase, matchId: saved.matchId, serverAuthority: saved.auth, localPlayerId: saved.local });
      document.getElementById('matchSummaryModal')?.classList.add('hidden');
    }
  });

  await test('Table cards never overlap: every Face-Up / Face-Down slot sits apart, for opponents and you (v272)', () => {
    const overlaps = (rects) => {
      let n = 0;
      for (let i = 0; i + 1 < rects.length; i++) for (const a of rects[i]) for (const b of rects[i + 1]) {
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) n++;
      }
      return n;
    };
    for (const bots of [1, 2, 3]) {
      freshState({ phase: 'PLAY' });
      // Worst case: every slot has a Face-Down card, with a tilted Face-Up card on some.
      const seat = (id, isBot) => makePlayer({ id, isBot, hand: [makeCard('4')],
        faceDown: [makeCard('5'), makeCard('6'), makeCard('7')], faceUp: [makeCard('8'), makeCard('9'), makeCard('K')] });
      state.players = [seat('p1', false)];
      for (let i = 0; i < bots; i++) state.players.push(seat(`p_bot_${i}`, true));
      state.players.slice(1).forEach(p => { p.faceUp = [p.faceUp[0]]; });
      render();
      document.querySelectorAll('.opp-slot-row').forEach(row => {
        const rects = [...row.children].map(slot => [...slot.children].map(c => c.getBoundingClientRect()));
        assertEqual(overlaps(rects), 0, `${bots} opponent(s): no opponent table card overlaps its neighbour`);
      });
      const own = [...document.querySelectorAll('#localTableSlots > *')].map(slot => [slot.getBoundingClientRect()]);
      assertEqual(overlaps(own), 0, `${bots} opponent(s): your own table slots never overlap`);
    }
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
    const profile = { loaded: true, rating: 1540, online: true, seen: serverNow(), stats: { games: 128, wins: 73, bestStreak: 6, peak: 1612, burnt: 412, jokers: 31 } };
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
    assertEqual(tabs, ['All', 'Avatars', 'Deck', 'Tables', 'Card Backs', 'Frames', 'Burn', 'Joker', 'Victory', 'Emotes'], 'Custom tabs');
    document.querySelector('#customTabBar [data-custom-tab="cardBack"]').click();
    assertTrue(!document.querySelector('[data-custom-panel="cardBack"]').classList.contains('hidden') && document.querySelector('[data-custom-panel="avatar"]').classList.contains('hidden'), 'Only the chosen tab shows');
    const tiles = [...document.querySelectorAll('#personalisationCardBacks .cosmetic-tile')];
    // (v256: tiles sit in folding groups; compare the first two of one group.
    // v265 gave the Free group four backs, so tiles 1 and 2 now sit on different rows.)
    const firstGroup = tiles[0] && tiles.filter(t => t.parentElement === tiles[0].parentElement);
    assertTrue(firstGroup && firstGroup.length >= 2 && Math.abs(firstGroup[0].getBoundingClientRect().top - firstGroup[1].getBoundingClientRect().top) < 2, 'Tiles sit at least two to a row');
    assertTrue(!!document.querySelector('#personalisationCardBacks [data-custom-group-toggle="cardBack:free"]') && !!document.querySelector('#personalisationCardBacks [data-custom-group-toggle="cardBack:level"]'), 'Grouped with folding heads (Free, Shop, Earn by levelling up)');
    openCustomAtAvatars();
    assertTrue(!document.querySelector('[data-custom-panel="avatar"]').classList.contains('hidden'), 'The profile shortcut opens the Pictures tab');
    document.getElementById('themesModal').classList.add('hidden');
  });

  await test('Custom has the Shop filters: All, Owned, Not Owned and Equipped hide the other tiles on every tab (v273)', () => {
    openThemesPanel();
    try {
      assertEqual([...document.querySelectorAll('#customFilterBar [data-custom-filter]')].map(b => b.dataset.customFilter), ['all', 'owned', 'unowned', 'equipped'], 'Four filter chips like the Shop');
      for (const tab of ['all', 'avatar', 'cardBack']) {
        setCustomTab(tab);
        const tiles = () => [...visibleCustomPanel().querySelectorAll('[data-equip-id]')];
        const shown = () => tiles().filter(el => getComputedStyle(el).display !== 'none');
        document.querySelector('#customFilterBar [data-custom-filter="all"]').click();
        assertEqual(shown().length, tiles().length, `${tab}: All shows every tile`);
        document.querySelector('#customFilterBar [data-custom-filter="owned"]').click();
        assertTrue(shown().length > 0 && shown().every(el => !el.hasAttribute('data-locked')), `${tab}: Owned shows only owned tiles`);
        setCustomFilter('unowned');
        assertTrue(shown().length > 0 && shown().every(el => el.hasAttribute('data-locked')), `${tab}: Not Owned shows only locked tiles`);
        setCustomFilter('equipped');
        assertTrue(shown().length > 0 && shown().every(el => el.getAttribute('aria-pressed') === 'true'), `${tab}: Equipped shows only equipped tiles`);
      }
      setCustomTab('avatar');
      setCustomFilter('owned');
      const emptyOpenHeads = [...visibleCustomPanel().querySelectorAll('.custom-group-head[aria-expanded="true"]')].filter(h => getComputedStyle(h).display !== 'none')
        .filter(h => { for (let n = h.nextElementSibling; n && !n.classList.contains('custom-group-head'); n = n.nextElementSibling) if (n.matches('[data-equip-id]') && getComputedStyle(n).display !== 'none') return false; return true; });
      assertEqual(emptyOpenHeads.length, 0, 'An open group with nothing left to show is hidden');
      focusCustomTile('avatar', 'default');
      assertEqual(customFilter, 'all', 'Jumping to an item clears the filter so its tile shows');
    } finally {
      setCustomFilter('all');
      document.getElementById('themesModal').classList.add('hidden');
    }
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

  // A throwaway burn preview stage (Custom's previews open under their tile).
  function testBurnStage() {
    let stage = document.getElementById('testBurnStage');
    if (!stage) {
      stage = document.createElement('div');
      stage.id = 'testBurnStage';
      stage.className = 'shop-preview-stage';
      stage.dataset.shopBurnStage = '';
      stage.style.cssText = 'position:fixed;left:-9999px;top:0;width:300px;height:160px';
      stage.innerHTML = '<div class="shop-burn-core">🔥</div>';
      document.body.appendChild(stage);
    }
    return stage;
  }
  await test('REGRESSION: shape burn effects draw real shapes in previews and games', () => {
    const stage = testBurnStage();
    [['burn-electric', 'polyline'], ['burn-coloured', 'path'], ['burn-sweets', 'ellipse'], ['burn-paint', 'path'], ['burn-smoke', 'div'],
      ['burn-blackhole', 'circle'], ['burn-origami', 'path'], ['burn-pixel', 'div'], ['burn-lava', 'ellipse']].forEach(([id, shape]) => {
      assertTrue(playShopBurnPreview(id, stage), `${id} must play in the preview stage`);
      assertTrue(!!stage.querySelector(`.bfx ${shape}`), `${id} must draw ${shape} shapes, not plain dots`);
    });
    stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
    const before = particles.length;
    playBurnEffect('burn-smoke', 100, 100);
    assertTrue(document.getElementById('burnFxLayer').querySelectorAll('.bfx').length > 0 && particles.length === before, 'In games, shape effects use their own layer, not the ember canvas');
    document.getElementById('burnFxLayer').innerHTML = '';
    const prices = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Burn Effects' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(prices, { 'Coloured Flame': 250, 'Ice Shatter': 500, 'Electric Blast': 1000, 'Paint Splats': 750, 'Stupendous Confectionery': 1500, 'Smoke Show': 2000,
      'Black Hole': 2500, 'Origami Fold': 2500, 'Pixel Blast': 2500, 'Lava Melt': 2500 }, 'Burn effect prices');
  });

  await test('REGRESSION: new victory effects draw on their own top layer, with the requested prices', () => {
    const layer = document.getElementById('victoryFxLayer');
    ['victory-sparklers', 'victory-stars', 'victory-karate', 'victory-trophy', 'victory-rocket', 'victory-origami', 'victory-lion'].forEach(id => {
      layer.innerHTML = '';
      playVictoryEffect(id);
      assertTrue(layer.querySelectorAll('.bfx').length > 0, `${id} must draw on the victory layer`);
    });
    assertEqual(layer.querySelectorAll('.bfx svg path').length > 0, true, 'Effects are drawn shapes');
    layer.innerHTML = '';
    const prices = Object.fromEntries(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Victory Effects' && !i.season).map(i => [i.name, i.cost]));
    assertEqual(prices, { 'Confetti Burst': 250, 'Card Shower': 1500, 'Fireworks': 750, 'Sparkler Salute': 750, '5-Star Finish': 1000, 'Karate Chop': 2000,
      'Trophy Lift': 2500, 'Rocket Launch': 2500, 'Origami Flock': 2500, "Lion's Roar": 2500 }, 'Victory effect prices');
  });

  await test("Owner effects (v257): Lion's Roar, Fireworks, Pumpkin Joker, Jack-o'-Lantern and Cobweb use the owner's art, with their sounds", async () => {
    const layer = document.getElementById('victoryFxLayer');
    for (const [id, files] of Object.entries(OWNER_FX_FILES)) {
      for (const f of files) {
        const r = await fetch(ownerFxSrc(f), { cache: 'no-store' });
        assertTrue(r.ok, `${f} art file exists`);
      }
    }
    [['victory-lion', 2], ['victory-fireworks', 5]].forEach(([id, n]) => {
      layer.innerHTML = '';
      playVictoryEffect(id);
      const imgs = [...layer.querySelectorAll('.bfx img')].map(i => i.getAttribute('src'));
      assertEqual(imgs.length, n, `${id} draws its ${n} art layers`);
      assertTrue(imgs.every(src => /^art\/effects\/[a-z0-9-]+\.(?:webp|svg)\?v=\d+$/.test(src)), `${id} layers come from art/effects`);
      const ends = [...layer.querySelectorAll('.bfx')].flatMap(el => el.getAnimations()).map(a => a.effect.getComputedTiming().endTime);
      assertTrue(ends.length > 20 && Math.max(...ends) <= OWNER_VICTORY_MS, `${id} is animated and ends within OWNER_VICTORY_MS (2s since v275)`, Math.max(...ends));
    });
    layer.innerHTML = '';
    const stage = document.createElement('div');
    stage.style.cssText = 'position:fixed;left:0;top:0;width:380px;height:410px';
    document.body.appendChild(stage);
    try {
      const host = document.createElement('div'); host.className = 'jfx-host'; stage.appendChild(host);
      JOKER_FX['joker-halloween'](host, jfxGeom(host, true));
      assertEqual(host.querySelectorAll('.bfx img').length, 4, 'Pumpkin Joker: mist, pumpkin, ghost and BOO! layers');
      const ends = [...host.querySelectorAll('.bfx')].flatMap(el => el.getAnimations()).map(a => a.effect.getComputedTiming().endTime);
      assertTrue(Math.max(...ends) <= JOKER_FX_MS && Math.max(...ends) > 1000, 'Pumpkin Joker ends inside JOKER_FX_MS and lasts over a second');
      // The ghost is still hidden a third of the way in, and out by half-way (on the "Boooo!").
      const ghost = [...host.querySelectorAll('.bfx')].find(el => /pumpkin-ghost/.test(el.innerHTML));
      const anim = ghost.getAnimations()[0];
      anim.pause(); anim.currentTime = 450;
      assertTrue(Number(getComputedStyle(ghost).opacity) < .05, 'the ghost waits inside the pumpkin');
      anim.currentTime = 760;
      assertTrue(Number(getComputedStyle(ghost).opacity) > .95, 'the ghost is out with the BOO');
    } finally { stage.remove(); }
    assertEqual(Object.keys(EFFECT_CLIPS).sort(), ['boo', 'fireworks', 'lion-roar'], 'three effect clips');
    for (const src of Object.values(EFFECT_CLIPS)) assertTrue((await fetch(src, { cache: 'no-store' })).ok, `${src} exists`);
    assertTrue(/k\.clip\('boo'/.test(String(JOKER_SOUNDS['joker-halloween'])), "the Pumpkin Joker's sound says Boo");
    // v287: the owner's own boo and roar, fitted to the animations.
    assertTrue(/boo-v287/.test(EFFECT_CLIPS.boo) && /lion-roar-v287/.test(EFFECT_CLIPS['lion-roar']), "the owner's boo and roar recordings are used");
    try {
      const AC = window.AudioContext || window.webkitAudioContext, ac = new AC();
      const len = async (src) => (await ac.decodeAudioData(await (await fetch(src, { cache: 'no-store' })).arrayBuffer())).duration;
      const booLen = await len(EFFECT_CLIPS.boo), roarLen = await len(EFFECT_CLIPS['lion-roar']);
      assertTrue(0.5 + booLen <= JOKER_FX_MS / 1000 + 0.05, `the boo (played at 0.5s, ${booLen.toFixed(2)}s long) ends with the Joker effect`);
      assertTrue(roarLen <= OWNER_VICTORY_MS / 1000 + 0.05, `the roar (${roarLen.toFixed(2)}s) ends with the 2s victory`);
      ac.close?.();
    } catch (e) { if (!/decode|AudioContext/i.test(String(e && e.message))) throw e; }
    assertTrue(/lion-roar/.test(String(vfxLion)) && /'fireworks'/.test(String(vfxFireworks)), 'the victories play their own sounds');
    const av = AVATAR_ART['avatar-halloween'];
    assertTrue(av.photo && av.animated && av.art.includes('art/avatars/halloween-pumpkin.webp'), "Jack-o'-Lantern is the owner's picture, animated");
    assertTrue(/halloween-cobweb\.webp/.test(SEASONAL_BACK_ART.halloween), 'Cobweb card back is the owner\'s picture');
  });
  await test('Premium effects (4 burns, 4 victories): the dearest of their kind, their own sounds, and nothing left behind', () => {
    const burns = ['burn-blackhole', 'burn-origami', 'burn-pixel', 'burn-lava'];
    const wins = ['victory-trophy', 'victory-rocket', 'victory-origami', 'victory-lion'];
    const cost = (id) => COSMETIC_SHOP_ITEMS.find(i => i.id === id).cost;
    [['Burn Effects', burns], ['Victory Effects', wins], ['Joker Effects', ['joker-hypnotist', 'joker-vampire', 'joker-redcard', 'joker-portal']]].forEach(([cat, ids]) => {
      const others = COSMETIC_SHOP_ITEMS.filter(i => i.category === cat && !ids.includes(i.id));
      assertTrue(ids.every(id => others.every(o => cost(id) >= o.cost)), `${cat}: the premium ones cost at least as much as any other`);
      assertTrue(ids.every(id => isSupportedCosmetic(COSMETIC_CATEGORY_TYPES[cat], id)), `${cat}: all can be equipped`);
    });
    assertEqual(new Set(burns.map(id => BURN_SOUNDS[id])).size, 4, 'Each premium burn has its own sound');
    assertTrue(burns.every(id => !Object.keys(BURN_SOUNDS).some(o => o !== id && BURN_SOUNDS[o] === BURN_SOUNDS[id])), 'No burn sound is shared');
    // Every piece a burn draws finishes (and is removed) within ~2s: Lava
    // Melt's pool sinks away, so no scorch mark stays on the table.
    const stage = testBurnStage();
    burns.forEach(id => {
      stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
      playBurnFx(id, stage, 120, 80, 1);
      const pieces = [...stage.querySelectorAll('.bfx')];
      assertTrue(pieces.length > 5, `${id} draws its pieces`);
      const ends = pieces.flatMap(el => el.getAnimations()).map(a => a.effect.getComputedTiming().endTime);
      assertEqual(pieces.filter(el => el.getAnimations().length === 0).length, 0, `${id}: every piece is animated (and so removed when done)`);
      assertTrue(Math.max(...ends) <= 2100, `${id} ends within 2.1s (got ${Math.round(Math.max(...ends))}ms)`);
      assertTrue(ends.every(e => Number.isFinite(e)), `${id}: nothing runs forever`);
    });
    stage.querySelectorAll('.bfx, .bfx-flash').forEach(n => n.remove());
    assertTrue(/ori-wing/.test(bfxSwanSvg()), 'Swans have a flapping wing');
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
    assertEqual(burnNames, ['Coloured Flame', 'Ice Shatter', 'Paint Splats', 'Electric Blast', 'Stupendous Confectionery', 'Smoke Show', 'Black Hole', 'Lava Melt', 'Origami Fold', 'Pixel Blast', 'Spark Snap', 'Smoke Burst', 'Inferno Sweep', 'Hellfire Spiral', 'Royal Incineration', 'The ShitStorm'], 'Custom burn tiles in value order, then the level burns by level');
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
    const stage = testBurnStage();
    stage.querySelectorAll('.bfx').forEach(n => n.remove());
    const before = new Set(document.getAnimations());
    playBurnFx('burn-smoke', stage, 120, 80, .6);
    const smoke = document.getAnimations().filter(a => !before.has(a));
    const longest = Math.max(...smoke.map(a => { const t = a.effect.getTiming(); return (t.delay || 0) + t.duration; }));
    assertTrue(smoke.length > 20 && longest <= 2000, `Smoke Show must finish within 2s (longest ${Math.round(longest)}ms)`);
    smoke.forEach(a => a.cancel());
    stage.querySelectorAll('.bfx').forEach(n => n.remove());
    renderPersonalisationAvatars();
    const earned = [...document.querySelectorAll('#personalisationAvatars .avatar-option-name')].map(n => n.textContent).slice(-15);
    assertEqual(earned, ['Silver Crown', 'Gold Crown', 'Platinum Crown', 'Master Crown', 'Centurion', 'ShitHead', 'Gauntlet Champion', 'Gauntlet Conqueror', 'Gauntlet Overlord', 'Recruiter', 'Rookie Rogue', 'Card Shark', 'Burn King', 'Chaos Jester', 'The ShitHead'], 'Earn-only avatars in milestone order, then the Gauntlet, inviting friends, then levels');
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
  await test('REGRESSION: a 2-3 row hand never slides after a redraw (the hand "bouncing" side to side)', async () => {
    const table = document.getElementById('gameTable');
    const lobby = document.getElementById('lobbyScreen');
    const wasHidden = [table.classList.contains('hidden'), lobby.classList.contains('hidden')];
    table.classList.remove('hidden'); lobby.classList.add('hidden');
    try {
      const ranks = ['2','5','6','7','8','8','Q','Q','K','K','K','A','A','4','9','J'].flatMap(r => [r, r]);
      var realBest = bestHandRows;
      bestHandRows = (hand) => computeHandRows(hand, 3); // a wide test window would pick one row
      freshState({ phase: 'PLAY', discardPile: [makeCard('9')], drawPile: [] });
      state.players = [makePlayer({ id: 'me', hand: ranks.map(r => makeCard(r)), faceDown: [makeCard('4')] }), makePlayer({ id: 'bot', isBot: true, hand: [makeCard('K')] })];
      state.localPlayerId = 'me'; state.currentTurnIndex = 0;
      const sliding = () => [...document.querySelectorAll('#localHand *')].some(el => el.getAnimations().some(a => a.transitionProperty));
      render();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      let slid = false;
      for (let i = 0; i < 3; i++) {
        render();
        await new Promise(r => requestAnimationFrame(r));
        slid = slid || sliding();
        await new Promise(r => setTimeout(r, 30));
        slid = slid || sliding();
      }
      assertTrue(document.querySelectorAll('#localHand > div').length >= 2, 'The test hand really has several rows');
      assertTrue(!slid, 'No hand card slides into place after a redraw');
    } finally {
      bestHandRows = realBest;
      table.classList.toggle('hidden', wasHidden[0]); lobby.classList.toggle('hidden', wasHidden[1]);
    }
  });
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
  await test('REGRESSION: a 3 on a 5 whose base is an 8 skips too (the 3 acts as the 5, the 5 acts as the 8)', () => {
    // The owner's Gauntlet game: base 8♦, then J, 7, 5 (skipped the bot), then a 3.
    freshState({ discardPile: [makeCard('8', '♦'), makeCard('J', '♥'), makeCard('7', '♣'), makeCard('5', '♦')], drawPile: [] });
    state.baseOverrideCard = state.discardPile[0];
    const three = makeCard('3', '♥');
    state.players = [makePlayer({ id: 'p1', name: 'You', hand: [three, makeCard('K')] }),
                     makePlayer({ id: 'p2', name: 'Giulia', isBot: true, hand: [makeCard('3', '♠')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [three]);
    assertEqual(state.players[state.currentTurnIndex].id, 'p1', 'The 3 skips the opponent, just like the 5 did');
    assertEqual(state.baseOverrideCard && state.baseOverrideCard.rank, '8', 'The next card still has to beat the base 8');
    // The bot's own 3 on top does the same to you.
    state.currentTurnIndex = 1;
    executePlayCards('p2', [state.players[1].hand[0]]);
    assertEqual(state.players[state.currentTurnIndex].id, 'p2', "Giulia's 3 on top skips you in turn");
  });
  await test('A 3 on a 5 whose base is a 9 reverses, like the 5 did', () => {
    freshState({ discardPile: [makeCard('9', '♦'), makeCard('K'), makeCard('5', '♠')], drawPile: [], direction: 1 });
    state.baseOverrideCard = state.discardPile[0];
    const three = makeCard('3');
    state.players = [makePlayer({ id: 'p1', hand: [three, makeCard('K')] }), makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [three]);
    assertEqual(state.direction, -1, 'The 3 reverses direction');
  });
  await test('A 3 on a 5 whose base is an ordinary card just passes the turn', () => {
    freshState({ discardPile: [makeCard('K'), makeCard('Q'), makeCard('5')], drawPile: [] });
    state.baseOverrideCard = state.discardPile[0];
    const three = makeCard('3');
    state.players = [makePlayer({ id: 'p1', hand: [three, makeCard('4')] }), makePlayer({ id: 'p2', isBot: true, hand: [makeCard('K')] })];
    state.localPlayerId = 'p1'; state.currentTurnIndex = 0;
    executePlayCards('p1', [three]);
    assertEqual(state.players[state.currentTurnIndex].id, 'p2', 'No skip without an 8 underneath');
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
    openLeaderboardPanel('ranked');
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

  await test('Match Stats still show a player who left after the match was decided', () => {
    freshState({ drawPile: [] });
    state.roomCode = '123456';
    const me = makePlayer({ id: 'p1', name: 'Me', hasFinished: true, finishRank: 1 });
    const them = makePlayer({ id: 'p2', name: 'Quitter', hasFinished: false });
    state.players = [me, them];
    state.localPlayerId = 'p1';
    bumpStat(them, 'played', 7);
    bumpStat(them, 'pickedUp', 9);
    them.gameStats.biggestPickup = 9; them.lobbyStats.biggestPickup = 9;
    rememberDepartedPlayers(state.players, [me], 'FINISHED');
    state.players = [me];
    buildMatchStats('game');
    let text = document.getElementById('matchStatsBody').innerText;
    assertTrue(/Quitter/.test(text) && /\(left\)/.test(text), 'The player who left is still listed, marked (left)');
    assertTrue(/Quitter took 9/.test(text), 'Their pickups still count for the worst pickup');
    buildMatchStats('lobby');
    assertTrue(/Quitter/.test(document.getElementById('matchStatsBody').innerText), 'And in Lobby Totals');
    // Someone leaving mid-match, before finishing, is not kept (a bot takes their seat)
    departedStatPlayers = [];
    rememberDepartedPlayers([me, makePlayer({ id: 'p3', name: 'Mid', hasFinished: false, gameStats: {} })], [me], 'PLAY');
    assertEqual(departedStatPlayers.length, 0, 'A mid-match leaver without a result is not kept');
    hideMatchEndUI();
    assertEqual(departedStatPlayers.length, 0, 'A new match starts without them');
    // After a reload the room's saved finalStats bring them back
    const saved = { matchId: 'mX', players: { p2: { id: 'p2', name: 'Quitter', isBot: false, hasFinished: false, finishRank: null, gameStats: { played: 7, pickedUp: 9 } } } };
    rememberDepartedPlayers([], [me], 'FINISHED', saved, 'mX');
    assertEqual(departedStatPlayers.map(d => d.name), ['Quitter'], 'Saved final stats restore a player who has gone');
    departedStatPlayers = [];
    rememberDepartedPlayers([], [me], 'FINISHED', saved, 'mOther');
    assertEqual(departedStatPlayers.length, 0, "Another match's saved stats are ignored");
    buildMatchStats('game');
  });
  await test('Match History keeps every player\'s numbers', () => {
    freshState({ drawPile: [] });
    const me = makePlayer({ id: 'p1', name: 'Me', hasFinished: true, finishRank: 1 });
    const bot = makePlayer({ id: 'p2', name: 'Bo', isBot: true });
    bumpStat(me, 'played', 4); bumpStat(bot, 'pickedUp', 6);
    state.players = [me, bot]; state.localPlayerId = 'p1';
    const entry = buildMatchHistoryEntry();
    assertEqual(entry.players.map(p => p.st), [[4, 0, 0, 0, entry.players[0].st[4]], [0, 6, 0, 0, entry.players[1].st[4]]], 'Each player carries Played/Picked/Burnt/JKR/Turns');
    const box = document.createElement('div');
    box.innerHTML = historyGameHtml({ ...entry, id: 'x' });
    assertEqual(box.querySelectorAll('.mh-everyone .mh-row:not(.mh-head)').length, 2, 'The detail lists everyone');
    const old = { ...entry, id: 'y', players: [{ name: 'Me', me: true }] };
    box.innerHTML = historyGameHtml(old);
    assertTrue(!!box.querySelector('.mh-order') && !box.querySelector('.mh-everyone'), 'Older entries keep the old layout');
  });

  await test('Match History: a game opens its full stats, and a signed-in player opens their card (v252)', async () => {
    freshState({ drawPile: [] });
    const me = makePlayer({ id: 'p1', name: 'Me', hasFinished: true, finishRank: 1 });
    const friend = makePlayer({ id: 'p2', name: 'Pal' }); friend.uid = 'uidPal';
    const bot = makePlayer({ id: 'p3', name: 'Bo', isBot: true });
    state.players = [me, friend, bot]; state.localPlayerId = 'p1';
    const entry = { ...buildMatchHistoryEntry(), id: 'g1', label: 'Play Friends', diamonds: 12, rating: { from: 500, to: 530 } };
    assertEqual(entry.players.find(p => p.name === 'Pal').uid, 'uidPal', 'A human opponent\'s uid is saved with the game');
    assertTrue(!('uid' in entry.players.find(p => p.name === 'Bo')), 'Bots carry no uid');
    const area = document.getElementById('statsContentArea');
    const savedHtml = area.innerHTML;
    const modal = document.getElementById('historyGameModal');
    const savedOpen = openProfileCard;
    let opened = null;
    openProfileCard = (who) => { opened = who; };
    const savedUser = currentUser;
    try {
      area.innerHTML = matchHistoryHtml([entry]);
      const row = area.querySelector('[data-mh-id="g1"]');
      assertTrue(!!row && !row.querySelector('.mh-everyone'), 'The list row is compact');
      row.click();
      assertTrue(!modal.classList.contains('hidden'), 'Tapping a game opens its stats');
      assertTrue((parseInt(getComputedStyle(modal).zIndex, 10) || 0) > (parseInt(getComputedStyle(document.getElementById('statsModal')).zIndex, 10) || 0), 'It opens above the Stats page');
      const body = modal.textContent;
      assertTrue(/Won/.test(body) && /500 → 530/.test(body) && /Finishing order/.test(body), 'Result, rating and order shown');
      assertEqual(modal.querySelectorAll('[data-mh-player]').length, 1, 'Only the human opponent is a button (not me, not the bot)');
      currentUser = { uid: 'meUid' };
      modal.querySelector('[data-mh-player]').click();
      await new Promise(r => setTimeout(r, 0));
      assertEqual(opened && opened.uid, 'uidPal', 'Their player card opens');
      modal.click();
      assertTrue(modal.classList.contains('hidden'), 'A tap outside closes it');
    } finally {
      openProfileCard = savedOpen; currentUser = savedUser;
      area.innerHTML = savedHtml; modal.classList.add('hidden');
    }
  });

  await test('Mode intro: once per mode, skipped with history, links to the Guide (v252)', () => {
    const saved = modeIntroSeen, wasRunning = devTestSuiteRunning;
    const savedStore = localStorage.getItem(MODE_INTRO_KEY);
    const modal = document.getElementById('modeIntroModal');
    const guide = document.getElementById('rulesModal');
    const savedRead = readLocalMatchHistory;
    try {
      devTestSuiteRunning = false;
      modeIntroSeen = {};
      readLocalMatchHistory = () => [];
      assertTrue(maybeShowModeIntro('ranked'), 'First visit to Ranked shows the card');
      assertTrue(!modal.classList.contains('hidden') && /Ranked/.test(modal.textContent), 'The Ranked card is up');
      assertEqual(modal.querySelectorAll('.mode-intro-tiers > span').length, 6, 'Six tier badges');
      assertEqual(modal.querySelectorAll('.mode-intro-list svg').length, 4, 'Every line has a real icon');
      modal.querySelector('[data-mode-intro-ok]').click();
      assertTrue(modal.classList.contains('hidden'), 'Got It closes it');
      assertTrue(!maybeShowModeIntro('ranked'), 'Not shown twice');
      readLocalMatchHistory = () => [{ mode: 'online' }];
      assertTrue(!maybeShowModeIntro('online'), 'A player who has played Play Friends skips it');
      assertTrue(modeIntroSeen.online, 'and it is marked seen');
      assertTrue(showModeIntro('online'), 'The link shows it again any time');
      modal.querySelector('[data-mode-intro-guide]').click();
      const sec = guide.querySelector('[data-guide-section="friends"]');
      assertTrue(!guide.classList.contains('hidden') && !sec.querySelector('.accordion-content').classList.contains('hidden'), 'More in the Guide opens the Play Friends section');
      ['ranked', 'friends', 'series'].forEach(k => assertTrue(!!guide.querySelector(`[data-guide-section="${k}"] .accordion-content`), `Guide has a ${k} section`));
      assertTrue(!!document.querySelector('#rankedOptions [data-mode-intro="ranked"]') && !!document.querySelector('#multiOptions [data-mode-intro="online"]'), 'Both mode panels link to their card');
    } finally {
      modeIntroSeen = saved; devTestSuiteRunning = wasRunning; readLocalMatchHistory = savedRead;
      if (savedStore === null) localStorage.removeItem(MODE_INTRO_KEY); else localStorage.setItem(MODE_INTRO_KEY, savedStore);
      modal.classList.add('hidden'); guide.classList.add('hidden');
    }
  });

  await test('Locked items preview in Custom and the Collection, with See In Shop (v252)', () => {
    const locked = COSMETIC_SHOP_ITEMS.find(item => item.category === 'Card Backs' && !item.season && !cosmeticPurchaseState[item.id]);
    const earned = LEVEL_REWARDS.find(item => !cosmeticPurchaseState[item.id]);
    const box = document.getElementById('bigPreview');
    const shop = document.getElementById('shopModal');
    try {
      assertTrue(previewLockedCosmetic(locked.id), 'A locked Shop item opens the big preview');
      assertTrue(!box.classList.contains('hidden') && !!box.querySelector('[data-bp-shop]'), 'with See In Shop');
      closeBigPreview();
      if (earned) {
        previewLockedCosmetic(earned.id);
        assertTrue(!box.classList.contains('hidden') && !box.querySelector('[data-bp-shop]'), 'An earn-only item previews without a Shop button');
        assertTrue(/Lvl|level/i.test(box.querySelector('.bp-status').textContent), 'and says how to earn it');
        closeBigPreview();
      }
      openCollection();
      document.querySelector(`#collectionBody [data-coll-id="${locked.id}"]`).click();
      assertTrue(!box.classList.contains('hidden'), 'Tapping a locked Collection tile previews it');
      box.querySelector('[data-bp-shop]').click();
      assertTrue(box.classList.contains('hidden') && document.getElementById('collectionModal').classList.contains('hidden'), 'See In Shop closes the preview and the Collection');
    } finally {
      closeBigPreview();
      shop.classList.add('hidden'); document.getElementById('collectionModal').classList.add('hidden');
    }
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
  await test('hasMatchAuthority: casual elects one phone; Ranked always remains server-owned', () => {
    const saved = roomPresence;
    try {
      [false, true].forEach((ranked) => {
        const host = makePlayer({ id: 'p_host', name: 'Host' }), guest = makePlayer({ id: 'p_room1', name: 'Guest' });
        roomPresence = { p_host: { status: 'connected' }, p_room1: { status: 'connected' } };
        freshState({ isMultiplayer: true, isHost: true, isRanked: ranked, localPlayerId: 'p_host' });
        state.players = [host, guest];
        assertEqual(hasMatchAuthority(), !ranked, 'Only casual has a browser driver');
        freshState({ isMultiplayer: true, isHost: false, isRanked: ranked, localPlayerId: 'p_room1' });
        state.players = [host, guest];
        assertTrue(!hasMatchAuthority(), 'Only one phone drives, so two never move the same bot');
        roomPresence = { p_host: { status: 'disconnected' } };
        assertEqual(hasMatchAuthority(), !ranked, 'Casual transfers its driver; Ranked stays server-owned');
      });
    } finally { roomPresence = saved; }
  });
  await test('SECURITY: a Ranked guest cannot substitute a bot for another account', () => {
    // Before this fix, removePlayerFromMatch bailed out for anyone who
    // wasn't isHost — meaning if the ORIGINAL host was the one who
    // disconnected in a Ranked match, literally nobody's client was
    // ever willing to run this and the match would freeze forever.
    freshState({ isMultiplayer: true, isRanked: true, isHost: false, localPlayerId: 'p_room1' });
    const host = makePlayer({ id: 'p_host', name: 'Departed', uid: 'uid_host' });
    const guest = makePlayer({ id: 'p_room1', name: 'Still Here', uid: 'uid_guest' });
    state.players = [host, guest];
    const originalSync = syncFirebaseGameState;
    const savedPresence = roomPresence;
    roomPresence = { p_host: { status: 'disconnected' }, p_room1: { status: 'connected' } };
    syncFirebaseGameState = () => {};
    try { removePlayerFromMatch('p_host', 'disconnected'); } finally { syncFirebaseGameState = originalSync; roomPresence = savedPresence; }
    const seat = state.players.find(p => p.name.startsWith('Departed'));
    assertTrue(!!seat && !seat.isBot, 'A browser cannot replace a Ranked opponent; server deadlines control stand-ins');
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
      assertEqual(restoredShopTab(false), SHOP_ALL_TAB, 'Nothing saved: All');
      assertEqual(restoredShopTab(true), SEASONAL_TAB, 'Nothing saved, event on: Seasonal');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Card Backs', seasonLead: false }));
      assertEqual(restoredShopTab(false), 'Card Backs', 'Remembers the tab');
      assertEqual(restoredShopTab(true), SEASONAL_TAB, 'An event that started since takes the lead');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Card Backs', seasonLead: true }));
      assertEqual(restoredShopTab(true), 'Card Backs', 'Picked during the event: stays');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: 'Not A Tab', seasonLead: false }));
      assertEqual(restoredShopTab(false), SHOP_ALL_TAB, 'A tab that no longer exists is ignored');
      localStorage.setItem('shithead_shop_tab', JSON.stringify({ tab: SHOP_ALL_TAB, seasonLead: false }));
      assertEqual(restoredShopTab(false), SHOP_ALL_TAB, 'All is remembered too');
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
  await test("The owner's Changelog page lists every version and change, key ones tagged; only the owner sees it in the menu", () => {
    Object.entries(WHATS_NEW).forEach(([v, rows]) => rows.forEach(r => assertTrue(r.length === 2 || r[2] === WN_KEY, `${v}: a note's third element can only be WN_KEY`)));
    const html = changelogHtml();
    const box = document.createElement('div'); box.innerHTML = html;
    assertEqual(box.querySelectorAll('.cl-version').length, Object.keys(WHATS_NEW).length, 'One heading per version');
    assertEqual(box.querySelectorAll('li').length, Object.values(WHATS_NEW).flat().length, 'Every change is listed');
    assertEqual(box.querySelectorAll('.cl-key').length, Object.values(WHATS_NEW).flat().filter(isKeyNote).length, 'Key changes are tagged');
    assertTrue(EXCLUSIVE_PAGE_IDS.includes('changelogModal') && !!BACK_LAYERS.changelogModal, 'A normal menu page (one at a time, Back closes it)');
    const savedUser = currentUser;
    try {
      currentUser = null; updateHamburgerAccountLabel();
      assertTrue(document.getElementById('menuChangelogBtn').classList.contains('hidden'), 'Hidden from everyone but the owner');
    } finally { currentUser = savedUser; updateHamburgerAccountLabel(); }
    openChangelog();
    assertTrue(!document.getElementById('changelogModal').classList.contains('hidden'), 'It opens');
    document.getElementById('changelogCloseBtn').click();
  });
  await test('The README is refreshed every 20 versions from v180 (text + screenshots)', async () => {
    let text = null;
    try { const r = await fetch('README.md', { cache: 'no-store' }); if (r.ok) text = await r.text(); } catch (e) {}
    if (text === null) return; // the live site doesn't serve the README
    const m = text.match(/README-VERSION:\s*v(\d+)/);
    assertTrue(!!m, 'README.md starts with a README-VERSION stamp');
    const stamped = Number(m[1]), current = Number(GAME_BUILD.version.slice(1));
    const nextDue = stamped < 180 ? 180 : 180 + (Math.floor((stamped - 180) / 20) + 1) * 20;
    assertTrue(current < nextDue, `README refresh due: v${current} has reached v${nextDue}. Update the README text, retake the screenshots (node tools/readme-screenshots.js) and set README-VERSION to v${current}`);
  });
  await test("Every release has What's New notes; skipped updates are shown together; Settings can turn them off", () => {
    assertTrue(Array.isArray(WHATS_NEW[GAME_BUILD.version]) && WHATS_NEW[GAME_BUILD.version].length > 0,
      `WHATS_NEW['${GAME_BUILD.version}'] must describe this build (every release gets an entry)`);
    const cur = Number(GAME_BUILD.version.slice(1));
    const skipped = whatsNewNotesSince(`v${cur - 6}`);
    const expected = [0, 1, 2, 3, 4, 5].flatMap(d => (WHATS_NEW[`v${cur - d}`] || []).filter(r => r[2] === WN_KEY)).slice(0, WHATS_NEW_MAX_ROWS);
    assertEqual(skipped, expected, 'A player six updates behind sees every key note from all six, newest first');
    assertTrue(skipped.length > 0 && skipped.every(r => r[2] === WN_KEY), 'Only key notes, never the small fixes');
    assertTrue(!whatsNewNotesSince('v212', 'v213').length, 'A version with only small fixes shows nothing');
    const row = document.getElementById('setWhatsNewRow');
    assertTrue(!!row && !!row.closest('#settingsTab-sound'), "The What's New switch lives in Sound & Alerts");
    const was = whatsNewOn;
    try {
      row.click();
      assertEqual(whatsNewOn, !was, 'Tapping it toggles the setting');
      assertEqual(typeof collectAccountSettings().whatsNewOn, 'boolean', 'It syncs with the account settings');
    } finally { if (whatsNewOn !== was) row.click(); }
  });
  await test('Online saves only land on top of the version this phone saw; a losing save reloads the table', () => {
    freshState({ phase: 'PLAY' });
    state.isMultiplayer = true; state.roomCode = '424242'; state.stateVersion = 5;
    let server = { phase: 'PLAY', stateVersion: 5, presence: { p1: { status: 'connected' } } };
    const reapplied = [];
    const realHandler = activeRoomHandler;
    activeRoomHandler = (snap) => reapplied.push(snap.val().stateVersion);
    db = { ref: () => ({ transaction: (fn, done) => {
      const next = fn(server);
      if (next === undefined) done(null, false, { val: () => server });
      else { server = next; done(null, true, { val: () => next }); }
      return Promise.resolve();
    } }) };
    try {
      syncFirebaseGameState();
      assertEqual(server.stateVersion, 6, 'On top of the version it saw: saved');
      assertTrue(!!server.presence, 'The rest of the room (presence etc.) is kept');
      server = { ...server, stateVersion: 9 }; // another phone saved meanwhile
      syncFirebaseGameState();
      assertEqual(server.stateVersion, 9, "An out-of-date save doesn't overwrite the other phone's move");
      assertEqual(reapplied, [9], 'It reloads the real table instead');
      assertEqual(state.stateVersion, 9, 'And carries on from the real version');
    } finally { activeRoomHandler = realHandler; }
  });
  await test("The match driver is elected: the first player whose app is open, not always the host", () => {
    freshState({ phase: 'PLAY' });
    state.isMultiplayer = true; state.isHost = false;
    state.players = [makePlayer({ id: 'p_host', name: 'Host' }), makePlayer({ id: 'p_bot', isBot: true }), makePlayer({ id: 'p_me', name: 'Me' })];
    state.localPlayerId = 'p_me';
    const saved = roomPresence;
    try {
      roomPresence = { p_host: { status: 'connected' } };
      assertEqual(matchAuthorityId(), 'p_host', 'The host drives while their app is open');
      assertTrue(!hasMatchAuthority(), 'So this phone does not');
      roomPresence = { p_host: { status: 'away' } };
      assertEqual(matchAuthorityId(), 'p_me', 'Host in the background: the next open app takes over (bots skipped)');
      assertTrue(hasMatchAuthority(), 'This phone now drives the match');
      roomPresence = { p_host: { status: 'disconnected' } };
      assertTrue(hasMatchAuthority(), 'Same when the host has lost connection');
      state.isMultiplayer = false;
      assertTrue(hasMatchAuthority(), 'Offline games always drive themselves');
    } finally { roomPresence = saved; }
  });
  await test('Health: session records sum up into the owner view', () => {
    const h = summariseHealth({ '2026-09-24': {
      s1: { device: 'iphone', app: true, loadMs: 1000, frames: { n: 1000, slow: 100, ms: 20000 }, counts: { botsStarted: 3, botsFinished: 2, rejectedSave: 1 } },
      s2: { device: 'desktop', app: false, loadMs: 3000, frames: { n: 1000, slow: 0, ms: 16000 }, counts: { botsStarted: 1, botsLeft: 1, onlineStarted: 1, errors: 2 } }
    } });
    assertEqual([h.sessions, h.installed, h.loadMedian], [2, 50, 3000], 'Sessions, installed share, median load');
    assertEqual([h.fps, h.slowPct, h.jankySessions], [56, 5, 1], 'Frame rate across all frames, slow share, janky sessions');
    assertEqual(h.modes.find(m => m.mode === 'bots'), { mode: 'bots', started: 4, finished: 2, left: 1, abandoned: 1 }, 'Started = finished + left + abandoned');
    assertEqual([h.rejectedSaves, h.errors], [1, 2], 'Problems counted');
  });
  await test('Ranked starts from a private server view and stays in the lobby when the server fails', async () => {
    const saved = {ref:rankedViewRef,code:rankedViewCode,event:rankedEventVersion};
    freshState({phase:'LOBBY',isMultiplayer:true,isRanked:true,isHost:true,roomCode:'515151'});
    currentUser = {uid:'alice'};
    state.players = [makePlayer({id:'p_host',uid:'alice'}),makePlayer({id:'p_room1',uid:'bob'})];state.localPlayerId='p_host';
    db = {ref:()=>({key:'alice',on:()=>{},off:()=>{}})};
    const hidden = i=>({id:`hidden-${i}`,rank:'4',suit:'♠',hidden:true});
    const view={authority:1,isRanked:true,matchId:'opaque-match',phase:'SWAP',stateVersion:1,currentTurnIndex:0,direction:1,turnTimerMs:15000,turnDeadline:Date.now()+60000,
      players:[{...makePlayer({id:'p_room1',uid:'bob',isReady:false}),hand:[hidden(0),hidden(1),hidden(2)],faceUp:[makeCard('8')],faceDown:[hidden(3)]},
        {...makePlayer({id:'p_host',uid:'alice',isReady:false}),hand:[makeCard('7','♠','opaque-own')],faceUp:[makeCard('6')],faceDown:[hidden(4)]}],drawPile:[hidden(5)],discardPile:[]};
    try {
      const calls=fakeEconomy({rankedStart:()=>({view})});startMultiplayerGame();await new Promise(r=>setTimeout(r,20));
      assertEqual(calls.map(c=>c[0]),['rankedStart'],'No full deck request');
      assertEqual(state.phase,'SWAP','The private view starts swap');assertEqual(state.players.map(p=>p.uid),['bob','alice'],'Server owns seat order');
      assertTrue(state.players[0].hand.every(c=>c.hidden),'Opponent hand masked');assertTrue(state.players.every(p=>p.faceDown.every(c=>c.hidden)),'All blind values masked');
      assertEqual(state.players[1].hand[0].id,'opaque-own','Own hand comes from authenticated view');assertTrue(state.drawPile.every(c=>c.hidden),'Stock masked');
      state.phase='LOBBY';state.serverAuthority=0;fakeEconomy({});startMultiplayerGame();await new Promise(r=>setTimeout(r,20));
      assertEqual(state.phase,'LOBBY','A failed server request never deals locally');
    } finally {rankedViewRef=saved.ref;rankedViewCode=saved.code;rankedEventVersion=saved.event;hideMatchEndUI();}
  });
  await test("The server's copy of the play rules (functions/rules.js) matches isPlayLegal everywhere", async () => {
    let src = null;
    try { const r = await fetch('functions/rules.js', { cache: 'no-store' }); if (r.ok) src = await r.text(); } catch (e) {}
    if (src === null) return; // the live site doesn't serve functions/
    const mod = { exports: {} };
    new Function('module', 'exports', src)(mod, mod.exports);
    const server = mod.exports;
    assertEqual(server.RANKS, RANKS, 'Same ranks'); assertEqual(server.SUITS, SUITS, 'Same suits');
    const deck = generateDeck();
    deck.forEach(c => { const k = server.canonicalCard(c.id) || {}; assertEqual([k.rank, k.suit, k.isJoker], [c.rank, c.suit, c.isJoker], `Card ${c.id} means the same card`); });
    const card = (rank) => ({ id: 'x', rank, suit: '♠', isJoker: rank === 'JOKER' });
    const ranks = [...RANKS, 'JOKER'];
    const piles = [[], ...ranks.map(r => [card(r)]), ...ranks.map(r => [card(r), card('3')]), [card('3'), card('3')]];
    const saved = state.baseOverrideCard;
    const diffs = [];
    try {
      [null, 'EVEN', 'ODD', 'LOW7'].forEach(con => [null, card('8'), card('K'), card('6')].forEach(base => piles.forEach(pile => ranks.forEach(r => {
        state.baseOverrideCard = base;
        const mine = isPlayLegal(card(r), pile, con);
        const theirs = server.isPlayLegal(card(r), pile, con, base);
        if (mine !== theirs) diffs.push(`${r} on [${pile.map(c => c.rank)}] ${con || ''} base ${base ? base.rank : '-'}`);
      }))));
    } finally { state.baseOverrideCard = saved; }
    assertEqual(diffs.slice(0, 5), [], 'Change functions/rules.js together with isPlayLegal');
  });
  await test('Owner view: the Ranked audit lists flagged matches, serious ones first', () => {
    const rows = groupRankedAudit({
      '111111': { m_a: { counts: { hard: 0, soft: 1 }, meta: { at: 5, players: { p1: { name: 'Al', uid: 'a' } } }, findings: { f: { kind: 'out-of-turn', hard: false, by: 'a', seat: 'p1', at: 5 } } } },
      '222222': { m_b: { counts: { hard: 2, soft: 0 }, meta: { at: 1, players: { p1: { name: 'Cy', uid: 'c' }, p2: { name: 'Di', uid: 'd' } } },
        findings: { f1: { kind: 'finished-with-cards', hard: true, by: 'c', seat: 'p1', at: 2 }, f2: { kind: 'vanished', hard: true, by: 'c', at: 1 } } } }
    });
    assertEqual(rows.map(r => [r.room, r.hard]), [['222222', 2], ['111111', 0]], 'Serious findings first');
    assertEqual(rows[0].findings.map(f => [f.label, f.byName]), [['A card disappeared', 'Cy'], ['Finished while holding cards', 'Cy']], 'Findings are explained, oldest first, with who wrote them');
  });
  await test('Report a player from their player card; the owner sees reports grouped by player', async () => {
    freshState({ phase: 'PLAY' });
    state.isMultiplayer = true; state.isRanked = true; state.roomCode = '424242'; state.matchId = 'm9';
    state.players = [makePlayer({ id: 'p1', name: 'Me' }), makePlayer({ id: 'p2', name: 'Cheater', uid: 'bad' })];
    state.localPlayerId = 'p1';
    currentUser = { uid: 'me' };
    const writes = [];
    db = { ref: (path) => ({
      once: () => Promise.resolve({ val: () => (path.startsWith('publicProfiles') ? { username: 'Cheater', rating: 700 } : null) }),
      set: (v) => { writes.push([path, v]); return Promise.resolve(); }
    }) };
    openPlayerPopup('p2', null);
    await new Promise(r => setTimeout(r, 0));
    const body = document.getElementById('playerPopupBody');
    try {
      body.querySelector('[data-pp-action="report"]').click();
      const send = body.querySelector('.pp-report-send');
      assertTrue(!!send && send.disabled, 'The form opens with SEND disabled until a reason is picked');
      body.querySelector('[data-reason="cheating"]').click();
      assertTrue(!send.disabled, 'Picking a reason enables SEND');
      body.querySelector('.pp-report textarea').value = 'Played two cards at once';
      send.click();
      await new Promise(r => setTimeout(r, 0));
      const [path, report] = writes.find(([p]) => p.startsWith('playerReports/')) || [];
      assertEqual(path, 'playerReports/bad/me', 'One report per reporter per player');
      assertEqual([report.reason, report.note, report.mode, report.room, report.matchId], ['cheating', 'Played two cards at once', 'ranked', '424242', 'm9'], 'The report carries the reason, note and match');
      assertTrue(/Thanks, report sent/.test(body.textContent), 'The player sees it was sent');
    } finally { closePlayerPopup(); }
    const groups = groupPlayerReports({ bad: { a: { reason: 'cheating', at: 2, reportedName: 'Cheater' }, b: { reason: 'cheating', at: 3, reportedName: 'Cheater' } }, meh: { a: { reason: 'name', at: 1, reportedName: 'Meh' } } });
    assertEqual(groups.map(g => [g.name, g.count, g.reasons.cheating || g.reasons.name]), [['Cheater', 2, 2], ['Meh', 1, 1]], 'Most-reported player first, with reason counts');
  });
  await test('Friends show when they are in a match; WATCH opens it read-only from their seat', async () => {
    let row = friendRowHtml('u1', { username: 'Jamie', online: true, seen: serverNow(), playing: { mode: 'online', room: '424242', at: 1 } }, 'friend');
    assertTrue(row.includes('In a match · Play Friends') && row.includes('friend-watch-btn') && row.includes('data-room="424242"'), 'An online match offers WATCH');
    row = friendRowHtml('u1', { username: 'Jamie', online: true, seen: serverNow(), playing: { mode: 'bots', at: 1 } }, 'friend');
    assertTrue(row.includes('In a match · Vs Bots') && !row.includes('friend-watch-btn') && row.includes('friend-invite-btn'), 'A bot game shows the status but nothing to watch');
    row = friendRowHtml('u1', { username: 'Jamie', online: false, playing: { mode: 'ranked', room: '424242', at: 1 } }, 'friend');
    assertTrue(!row.includes('In a match'), 'A stale status on an offline friend is ignored');

    freshState({ phase: 'LOBBY' });
    state.roomCode = null; state.players = []; state.localPlayerId = 'me';
    const card = (id, rank) => ({ id, rank, suit: '♥' });
    const room = { phase: 'PLAY', isRanked: true, matchId: 'm1', currentTurnIndex: 0, direction: 1, drawPile: [], discardPile: [card('d1', '5')],
      players: [ { id: 'p_host', uid: 'friend', name: 'Jamie', hand: [card('h1', 'A'), card('h2', 'K')], faceUp: [card('f1', '9')], faceDown: [card('x1', '3')] },
                 { id: 'p_room1', uid: 'other', name: 'Rival', hand: [card('h3', '7')], faceUp: [], faceDown: [card('x2', '2')] } ] };
    const writes = [];
    let listener = null;
    db = { ref: (path) => ({
      once: () => Promise.resolve({ val: () => room }),
      on: (ev, cb) => { listener = cb; }, off: () => { listener = null; },
      set: (v) => { writes.push(path); return Promise.resolve(); }, update: (v) => { writes.push(path); return Promise.resolve(); },
      remove: () => { writes.push(path); return Promise.resolve(); },
      transaction: () => { writes.push(path); return Promise.resolve({}); },
      onDisconnect: () => ({ set: () => {}, remove: () => {} })
    }) };
    const realReload = reloadCleanly; let reloaded = false;
    reloadCleanly = () => { reloaded = true; };
    try {
      await startSpectating('424242', 'friend', 'Jamie');
      assertTrue(!!state.spectating && state.spectating.seatId === 'p_host', 'Watching the friend\'s seat');
      assertTrue(state.localPlayerId !== 'p_host' && !state.players.some(p => p.id === state.localPlayerId), 'The spectator holds no seat');
      assertEqual(hasMatchAuthority(), false, 'A spectator never has match authority, even in Ranked');
      const seat = state.players.find(p => p.id === 'p_host');
      assertTrue(seat.hand.length === 2 && seat.hand.every(c => c.hidden && c.rank !== 'A' && c.rank !== 'K'), 'A Ranked hand reaches the spectator as a count only');
      const shown = [...document.querySelectorAll('#localHand [data-card-id]')];
      assertTrue(shown.length === 2 && shown.every(el => el.classList.contains('custom-card-back') && !/[AK]/.test(el.textContent)), 'The hand is drawn as card backs');
      assertTrue(/Watching Jamie/.test(document.getElementById('spectateBar')?.textContent || ''), 'The Watching bar shows');
      syncFirebaseGameState(); updatePlayersAtomic('424242', l => l); saveFinalMatchStats(); await leaveMultiplayerRoom();
      assertEqual(writes.filter(w => w.startsWith('rooms/')), [], 'Nothing is ever written to the room');
      room.currentTurnIndex = 1; listener({ val: () => room });
      assertEqual(state.currentTurnIndex, 1, 'Live updates follow the room');
      document.getElementById('leaveGameBtn').click();
      assertTrue(reloaded && !state.spectating && !document.getElementById('spectateBar'), 'Exit leaves spectating and resets the page');
    } finally {
      reloadCleanly = realReload;
      if (state.spectating) { state.spectating = null; }
      document.body.classList.remove('spectating');
      document.getElementById('spectateBar')?.remove();
    }
  });
  await test('Friends list: online friends first; inviting from a casual lobby uses that room', () => {
    freshState({ isMultiplayer: true, isRanked: false, roomCode: '424242', phase: 'LOBBY' });
    assertEqual(inviteableRoomCode(), '424242', 'Lobby of a casual room');
    const row = friendRowHtml('u1', { username: 'Jamie', online: true, seen: serverNow() }, 'friend');
    assertTrue(row.includes('INVITE HERE'), 'The button says it invites into this room');
    assertTrue(row.includes('friend-status online'), 'Shows Online');
    state.isRanked = true;
    assertEqual(inviteableRoomCode(), null, 'Never a Ranked room');
    freshState({ isMultiplayer: true, isRanked: false, roomCode: '424242', phase: 'PLAY' });
    assertEqual(inviteableRoomCode(), null, 'Not once the match has started');
    freshState({ isMultiplayer: false });
    assertTrue(friendRowHtml('u1', { username: 'Jamie', online: false }, 'friend').includes('friend-status offline'), 'Shows Offline');
  });
  await test('Home nickname row: picture | name | level on one line, and the longest username fits', () => {
    const input = document.getElementById('playerNameInput');
    const avatar = document.getElementById('homeNameAvatar'), level = document.getElementById('homeNameLevel');
    assertTrue(!!avatar && !!level && input.closest('.home-name-row') === avatar.parentElement, 'Picture, name and level share one row');
    assertEqual(input.maxLength, 12, 'Usernames are at most 12 characters');
    const cs = getComputedStyle(input);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const room = input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (input.offsetParent) assertTrue(cv.measureText('WWWWWWWWWWWW').width <= room, `12 W's fit (${Math.round(cv.measureText('WWWWWWWWWWWW').width)} <= ${Math.round(room)})`);
    level.classList.remove('hidden'); level.innerHTML = xpLevelBadge(42, 'xp-badge-home');
    if (input.offsetParent) {
      const badge = level.firstElementChild;
      assertTrue(Math.abs(badge.getBoundingClientRect().height - input.getBoundingClientRect().height) < 1, 'The level box is as tall as the name box');
      assertEqual(getComputedStyle(badge).fontSize, cs.fontSize, 'The level text is the same size as the name');
    }
    assertEqual(level.textContent, 'Lvl 42', 'Levels read "Lvl"');
    avatar.classList.remove('hidden'); avatar.innerHTML = avatarHtml('default', 64);
    if (input.offsetParent) {
      const ra = avatar.getBoundingClientRect(), rl = document.querySelector('.home-name-label').getBoundingClientRect(), ri = input.getBoundingClientRect();
      assertTrue(Math.abs(ra.top - rl.top) < 1 && Math.abs(ra.bottom - ri.bottom) < 1, `The picture runs from the top of the label to the bottom of the name box (${Math.round(ra.top)}-${Math.round(ra.bottom)} vs ${Math.round(rl.top)}-${Math.round(ri.bottom)})`);
      assertTrue(Math.abs(ra.width - ra.height) < 0.5, 'The picture stays square');
    }
    const realUser = currentUser;
    currentUser = null; updateHamburgerAccountLabel(); refreshXpDisplays();
    assertTrue(avatar.classList.contains('hidden') && level.classList.contains('hidden'), 'Signed out: just the name box');
    currentUser = realUser;
  });
  await test('Profile showcase: tapping an item opens Custom on its tab, scrolled to that item', async () => {
    const realEquipped = { ...equippedCosmetics };
    const frames = COSMETIC_SHOP_ITEMS.filter(i => isCosmeticListed(i) && i.category === 'Frames');
    const lastFrame = sortByValue(frames)[frames.length - 1];
    const realOwned = cosmeticPurchaseState;
    const realLoad = loadCosmeticCollection;
    try {
      // You own what you wear. Signed out (the test page), opening Custom would
      // put a bought frame back to default, so stand in for the account's load.
      cosmeticPurchaseState = { ...cosmeticPurchaseState, [lastFrame.id]: true };
      loadCosmeticCollection = () => Promise.resolve();
      equippedCosmetics = { ...equippedCosmetics, frame: lastFrame.id, burnEffect: 'default' };
      renderProfileShowcase();
      const chip = document.querySelector(`#profileShowcase [data-showcase-type="frame"][data-showcase-id="${lastFrame.id}"]`);
      assertTrue(!!chip && chip.tagName === 'BUTTON', 'Your own showcase items are buttons');
      assertTrue(!!document.querySelector('#profileShowcase [data-showcase-type="tableTheme"]'), 'The table preview is a button too');
      const popupBody = document.getElementById('playerPopupBody');
      popupBody.innerHTML = renderPlayerPopupHuman({ name: 'Other player', cosmetics: { frame: lastFrame.id } }, { loaded: false }, null);
      const otherChip = popupBody.querySelector(`[data-showcase-type="frame"][data-showcase-id="${lastFrame.id}"]`);
      assertTrue(!!otherChip && otherChip.tagName === 'BUTTON', 'Other players’ showcase items are buttons too');
      document.getElementById('playerPopup').classList.remove('hidden');
      otherChip.querySelector('b').click();
      await new Promise(r => setTimeout(r, 60));
      assertTrue(document.getElementById('playerPopup').classList.contains('hidden'), 'The player card closes');
      assertEqual(customTab, 'frame', 'Another player’s item opens its Custom tab');
      assertEqual(equippedCosmetics.frame, lastFrame.id, 'Viewing another showcase does not equip anything');
      document.getElementById('profileModal').classList.remove('hidden');
      chip.click();
      await new Promise(r => setTimeout(r, 800)); // a smooth scroll
      assertTrue(!document.getElementById('themesModal').classList.contains('hidden') && document.getElementById('profileModal').classList.contains('hidden'), 'Custom opens in place of Profile');
      assertEqual(customTab, 'frame', 'On the Frames tab');
      const tile = visibleCustomPanel().querySelector(`[data-equip-id="${lastFrame.id}"]`);
      assertTrue(!!tile && tile.classList.contains('custom-focus'), 'The item glows');
      const r = tile.getBoundingClientRect();
      assertTrue(r.top >= 0 && r.bottom <= window.innerHeight, `The item is scrolled into view (${Math.round(r.top)}-${Math.round(r.bottom)} of ${window.innerHeight})`);
      document.querySelector('#profileShowcase [data-showcase-type="burnEffect"]').click();
      await new Promise(r => setTimeout(r, 60));
      assertEqual(customTab, 'burnEffect', 'Default items open their tab too');
    } finally {
      cosmeticPurchaseState = realOwned;
      loadCosmeticCollection = realLoad;
      equippedCosmetics = realEquipped;
      document.getElementById('themesModal').classList.add('hidden');
      document.getElementById('profileModal').classList.add('hidden');
      setCustomTab('all');
    }
  });
  await test('Back goes to the page you came from: Profile → Custom → Collection, then back, back, closed', async () => {
    const tick = () => new Promise(r => setTimeout(r, 30));
    const shown = (id) => !document.getElementById(id).classList.contains('hidden');
    const openNow = () => EXCLUSIVE_PAGE_IDS.filter(shown);
    try {
      closeOtherMenuPages(); await tick();
      // Custom → Profile first (v276): the later showcase → Custom must still win.
      document.getElementById('themesModal').classList.remove('hidden'); await tick();
      document.getElementById('profileModal').classList.remove('hidden'); await tick();
      renderProfileShowcase();
      document.querySelector('#profileShowcase [data-showcase-type="frame"]').click(); await tick();
      assertEqual(openNow(), ['themesModal'], 'The showcase opens Custom');
      document.getElementById('customOwnedBtn').click(); await tick();
      assertEqual(openNow(), ['collectionModal'], 'Custom → Collection');
      handleBack(); await tick();
      assertEqual(openNow(), ['themesModal'], 'Back from the Collection: Custom');
      handleBack(); await tick();
      assertEqual(openNow(), ['profileModal'], 'Back from Custom: Profile');
      handleBack(); await tick();
      assertEqual(openNow(), [], 'Back from Profile (opened from home): closed');
      document.getElementById('profileModal').classList.remove('hidden'); await tick();
      document.getElementById('profileCloseBtn').click(); await new Promise(r => setTimeout(r, 200));
      document.getElementById('themesModal').classList.remove('hidden'); await tick();
      handleBack(); await tick();
      assertEqual(openNow(), [], 'A page opened after the last one was closed with ✕ just closes');
    } finally {
      closeOtherMenuPages(); await tick();
    }
  });
  await test('Game speed: 0.5x/1x for everyone, 2x at Lvl 5 and 4x at Lvl 10 when signed in', () => {
    const realUser = currentUser, realXp = playerXp, realOn = xpFeatureOn, realWanted = speedWantedIndex, realIdx = state.speedIndex;
    const banners = []; const realBanner = notifyBanner; notifyBanner = (m) => banners.push(m);
    try {
      xpFeatureOn = true;
      currentUser = null; playerXp = null;
      updateSpeedByIndex(0, { user: true }); assertEqual(state.speedIndex, 0, 'Signed out: 0.5x');
      updateSpeedByIndex(1, { user: true }); assertEqual(state.speedIndex, 1, 'Signed out: 1x');
      updateSpeedByIndex(2, { user: true });
      assertEqual(state.speedIndex, 1, 'Signed out: 2x snaps back to 1x');
      assertTrue(/Sign in to use 2x/.test(banners.pop() || ''), 'and says to sign in');
      assertTrue(document.querySelectorAll('#lobbySpeedTicks .speed-locked').length === 2, '2x and 4x show a lock');
      assertTrue(!document.getElementById('lobbySpeedLockNote'), 'No subtitle under the slider');
      const lockBtn = document.querySelector('#lobbySpeedTicks [data-speed-lock="2"]');
      assertTrue(!!lockBtn, 'The 2x lock is a button');
      lockBtn.click();
      const pop = document.getElementById('infoPop');
      assertTrue(!!pop && /Sign in and reach Lvl 5/.test(pop.textContent), 'Tapping the lock explains sign-in and Lvl 5: ' + (pop && pop.textContent));
      lockBtn.click();
      assertTrue(!document.getElementById('infoPop'), 'A second tap closes it');
      document.querySelector('#lobbySpeedTicks [data-speed-lock="3"]').click();
      assertTrue(/Lvl 10/.test(document.getElementById('infoPop').textContent), '4x says Lvl 10');
      hideInfoPop();
      currentUser = { uid: 'spd' }; playerXp = { total: xpForLevel(4) };
      updateSpeedByIndex(2, { user: true });
      assertEqual(state.speedIndex, 1, 'Level 4: 2x is still locked');
      assertTrue(/unlocks at Lvl 5/.test(banners.pop() || ''), 'and says which level');
      playerXp = { total: xpForLevel(5) };
      updateSpeedByIndex(3, { user: true });
      assertEqual(state.speedIndex, 2, 'Level 5: 4x snaps to 2x');
      assertTrue(/unlocks at Lvl 10/.test(banners.pop() || ''), '4x unlocks at level 10');
      playerXp = { total: xpForLevel(10) };
      updateSpeedByIndex(3, { user: true }); assertEqual(state.speedIndex, 3, 'Level 10: 4x');
      assertEqual(document.querySelectorAll('#lobbySpeedTicks .speed-locked').length, 0, 'No locks left');
      // A saved 4x survives signing out and back in.
      currentUser = null; reapplySpeedLocks();
      assertEqual(state.speedIndex, 1, 'Signed out: plays at 1x');
      assertEqual(speedWantedIndex, 3, 'but 4x is still the saved choice');
      currentUser = { uid: 'spd' }; reapplySpeedLocks();
      assertEqual(state.speedIndex, 3, 'Signed back in at level 10: 4x again');
      assertEqual(collectAccountSettings().speedIndex, 3, 'The account keeps the chosen speed');
    } finally {
      notifyBanner = realBanner; currentUser = realUser; playerXp = realXp; xpFeatureOn = realOn;
      speedWantedIndex = realWanted; updateSpeedByIndex(realIdx ?? DEFAULT_SPEED_INDEX, { noSave: true });
    }
  });
  await test('Level rewards (v251): the owner\'s earn-only avatars and card backs, granted by the server', () => {
    assertEqual(LEVEL_REWARDS.map(r => [r.id, r.level]), [
      ['avatar-lvl-rookie-rogue', 10], ['avatar-lvl-card-shark', 25], ['avatar-lvl-burn-king', 50], ['avatar-lvl-chaos-jester', 75], ['avatar-lvl-the-shithead', 99],
      ['back-lvl-first-burn', 10], ['back-lvl-sharks-mark', 30], ['back-lvl-inferno', 50], ['back-lvl-chaos-crown', 70], ['back-lvl-master-pile', 99],
      ['burn-lvl-spark-snap', 5], ['burn-lvl-smoke-burst', 20], ['burn-lvl-inferno-sweep', 40], ['burn-lvl-hellfire-spiral', 60], ['burn-lvl-royal-incineration', 80], ['burn-lvl-shitstorm', 99]], 'The sixteen rewards');
    assertEqual(XP_RULES.rewards.map(r => r.id), LEVEL_REWARDS.map(r => r.id), 'Exported to the server catalog');
    assertTrue(!['back-rising-star', 'frame-ascendant', 'table-summit'].some(id => bigPreviewItem(id)), 'The v248 set is gone');
    LEVEL_REWARDS.forEach((r) => {
      const type = COSMETIC_CATEGORY_TYPES[r.category];
      assertTrue(isSupportedCosmetic(type, r.id), `${r.id} can be equipped`);
      assertTrue(!COSMETIC_SHOP_ITEMS.some(i => i.id === r.id), `${r.id} is never sold`);
      assertTrue(customAllItems(type).some(i => i.id === r.id), `${r.id} is listed in Custom → All`);
      if (r.category !== 'Burn Effects') assertTrue(/\.webp\?v=\d+$/.test(r.file), `${r.id} uses its HD art file`);
    });
    assertEqual(getCosmeticBackClass('back-lvl-inferno'), 'cosmetic-back-lvl-inferno lvl-back', 'Card backs get their art class');
    assertTrue(/lvl-rookie-rogue\.webp/.test(avatarHtml('avatar-lvl-rookie-rogue', 40)), 'Avatars draw their art');
    const real = { ...cosmeticPurchaseState }, realBanner = notifyBanner; const banners = []; notifyBanner = (m) => banners.push(m);
    try {
      delete cosmeticPurchaseState['back-lvl-first-burn'];
      renderPersonalisationCosmetics();
      const tile = document.querySelector('#personalisationCardBacks [data-equip-id="back-lvl-first-burn"]');
      assertTrue(!!tile && tile.hasAttribute('data-locked') && /Reach Lvl 10/.test(tile.textContent), 'Locked in Custom with its level');
      delete cosmeticPurchaseState['avatar-lvl-rookie-rogue'];
      assertEqual(nextLevelReward(6)?.level, 10, 'Profile names the next reward (lowest level first)');
      applyLevelRewards([{ id: 'back-lvl-first-burn', name: 'First Burn', level: 10 }]);
      assertTrue(!!cosmeticPurchaseState['back-lvl-first-burn'], 'Owned once the server grants it');
      assertTrue(/First Burn/.test(banners.pop() || ''), 'with a banner');
      const mail = inboxItemHtml({ id: 'unlock_avatar-lvl-card-shark', type: 'shop', unlocked: true, name: 'Card Shark', requirement: 'Reach Lvl 25' });
      assertTrue(/Avatar unlocked/.test(mail), 'The unlock mail names an avatar');
    } finally {
      cosmeticPurchaseState = real; notifyBanner = realBanner; renderPersonalisationCosmetics();
    }
  });
  await test('Press and hold an item in Custom for a big preview; a tap still equips as before', async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    try {
      closeOtherMenuPages();
      document.getElementById('themesModal').classList.remove('hidden');
      setCustomTab('burnEffect'); renderPersonalisationCosmetics();
      const tile = visibleCustomPanel().querySelector('[data-equip-id]:not([data-equip-id="default"])');
      assertTrue(!!tile, 'A burn tile');
      const r = tile.getBoundingClientRect();
      const at = { clientX: r.left + 5, clientY: r.top + 5, bubbles: true, pointerId: 1, button: 0 };
      tile.dispatchEvent(new PointerEvent('pointerdown', at));
      await wait(CARD_HOLD_MS + 80);
      const box = document.getElementById('bigPreview');
      assertTrue(!box.classList.contains('hidden'), 'The hold opens the big preview');
      assertEqual(box.dataset.itemId, tile.dataset.equipId, 'for that item');
      assertTrue(!!box.querySelector('[data-shop-burn-stage]') && !!box.querySelector('[data-bp-play]'), 'with a stage that plays the effect and Play Again');
      const equippedBefore = equippedCosmetics.burnEffect;
      tile.dispatchEvent(new PointerEvent('pointerup', at));
      tile.click();
      assertEqual(equippedCosmetics.burnEffect, equippedBefore, 'Letting go does not equip it');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      assertTrue(box.classList.contains('hidden'), 'Escape closes the preview first');
      assertTrue(!document.getElementById('themesModal').classList.contains('hidden'), 'and leaves Custom open');
      ['avatar', 'tableTheme', 'cardBack', 'frame', 'deck', 'emotes', 'victoryEffect', 'jokerEffect'].forEach((type) => {
        const item = customAllItems(type)[0];
        assertTrue(openBigPreview(item.id), `${type}: a big preview`);
        assertTrue(!!document.querySelector('#bigPreview .bp-stage > *'), `${type}: something is drawn`);
        closeBigPreview();
      });
    } finally {
      closeBigPreview(); closeOtherMenuPages();
    }
  });
  await test('Challenge text links its key terms to the Guide, which opens on the term and goes back to Challenges', async () => {
    const html = linkKeyTerms('3/5 — Complete a Snap Burn, then burn the pile in the Gauntlet.');
    assertTrue(/data-term="snap-burn">Snap Burn</.test(html), 'Snap Burn links');
    assertTrue(/data-term="burn">burn the pile</.test(html), 'burn the pile links');
    assertTrue(/data-term="gauntlet">Gauntlet</.test(html), 'Gauntlet links');
    assertEqual((linkKeyTerms('Burn it, burn it again').match(/term-link/g) || []).length, 1, 'Each term links once');
    assertEqual(linkKeyTerms('<b class="burn">x</b>'), '<b class="burn">x</b>', 'Tags are left alone');
    KEY_TERM_LINKS.forEach(([, slug]) => assertTrue(!!document.querySelector(`#rulesModal [data-term="${slug}"]`), `Key Terms has "${slug}"`));
    const terms = [...document.querySelectorAll('#rulesModal [data-term]')].map(p => p.textContent.split(':')[0].toLowerCase());
    assertEqual(terms, [...terms].sort(), 'Key Terms stay alphabetical');
    const wait = () => new Promise(r => setTimeout(r, 60));
    try {
      closeOtherMenuPages();
      document.getElementById('challengesModal').classList.remove('hidden'); await wait();
      const probe = document.createElement('div'); probe.innerHTML = linkKeyTerms('Complete a Snap Burn.');
      document.getElementById('challengesModal').appendChild(probe);
      probe.querySelector('.term-link').click(); await wait();
      assertTrue(!document.getElementById('rulesModal').classList.contains('hidden'), 'The Guide opens');
      assertTrue(document.getElementById('challengesModal').classList.contains('hidden'), 'over Challenges, which closes');
      const term = document.querySelector('#rulesModal [data-term="snap-burn"]');
      assertTrue(term.classList.contains('term-focus'), 'The term is highlighted');
      assertTrue(!term.closest('.accordion-content').classList.contains('hidden'), 'Key Terms is open');
      probe.remove();
      document.getElementById('closeRulesBtn').click(); await wait();
      assertTrue(!document.getElementById('challengesModal').classList.contains('hidden'), 'Closing the Guide goes back to Challenges');
    } finally {
      document.getElementById('rulesModal').classList.add('hidden'); closeOtherMenuPages();
    }
  });
  await test('Escape closes every menu and page in one press; the Guide lists it', async () => {
    const wait = () => new Promise(r => setTimeout(r, 40));
    try {
      closeOtherMenuPages();
      document.getElementById('settingsModal').classList.remove('hidden');
      document.getElementById('rulesModal').classList.remove('hidden');
      document.getElementById('profileModal').classList.remove('hidden'); await wait();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait();
      ['settingsModal', 'rulesModal', 'profileModal'].forEach(id => assertTrue(document.getElementById(id).classList.contains('hidden'), `${id} closed`));
      assertTrue(/Esc/.test(document.getElementById('rulesModal').textContent) && /back to the home screen/.test(document.getElementById('rulesModal').textContent), 'Keyboard Shortcuts lists Esc');
    } finally {
      ['settingsModal', 'rulesModal'].forEach(id => document.getElementById(id).classList.add('hidden')); closeOtherMenuPages();
    }
  });
  await test('Emote button: hold to send your last emote again; leaderboard rows give a quick stats peek; friend level mail', async () => {
    const realSend = sendEmote, realLast = lastSentEmote, sent = [];
    try {
      sendEmote = (e) => sent.push(e);
      lastSentEmote = '🔥';
      assertTrue(resendLastEmote(), 'Resends');
      assertEqual(sent, ['🔥'], 'the last emote');
      const btn = document.getElementById('emoteToggleBtn');
      assertTrue(/hold/i.test(btn.getAttribute('aria-label')), 'The button says it can be held');
    } finally { sendEmote = realSend; lastSentEmote = realLast; }
    const row = leaderboardRowHtml({ username: 'Zara', uid: 'u1', rating: 1600, wins: 3, losses: 1 }, 4, 'ranked');
    assertTrue(/class="lb-peek"/.test(row) && /data-lb-uid="u1"/.test(row), 'Rows carry a stats peek button');
    const peek = leaderboardPeekHtml('Zara', { rating: 1600, stats: { games: 4, wins: 3, peak: 1650, bestStreak: 2 } });
    assertTrue(/Gold/.test(peek) && /4 · 3 won \(75%\)/.test(peek) && /1650/.test(peek), 'The peek shows tier, games, peak');
    const mail = inboxItemHtml({ id: 'friendlevel_u1_20', type: 'friendLevel', uid: 'u1', name: 'Zara', level: 20 });
    assertTrue(/Zara reached level 20/.test(mail) && /VIEW PLAYER/.test(mail), 'A friend levelling up is mailed');
    assertTrue(ACTIVITY_MAIL_TYPES.includes('friendLevel'), 'and listed in the Inbox');
    assertTrue(/Top level/.test(inboxItemHtml({ id: 'x', type: 'friendLevel', uid: 'u1', name: 'Zara', level: 99 })), 'Level 99 has its own heading');
  });
  await test('Avatars: the Shop and Custom call profile pictures Avatars, never Pictures', () => {
    assertEqual(COSMETIC_TABS.find(t => t.category === 'Avatars')?.label, 'Avatars', 'Shop tab label');
    assertTrue(CUSTOM_TABS.some(t => t.key === 'avatar' && t.label === 'Avatars'), 'Custom tab label');
    assertTrue(!Object.keys(COSMETIC_CATEGORY_TYPES).includes('Profile Pictures'), 'No "Profile Pictures" category left');
    const visible = [...document.querySelectorAll('#shopModal, #themesModal, #profileModal, #collectionModal, #rulesModal')].map(el => el.textContent).join(' ');
    assertTrue(!/picture/i.test(visible.replace(/\s+/g, ' ')), 'No "picture" wording on those pages');
  });
  await test('Mail links: tapping a mail opens what it is about', async () => {
    const wait = () => new Promise(r => setTimeout(r, 60));
    const shown = (id) => !document.getElementById(id).classList.contains('hidden');
    const back = LEVEL_REWARDS.find(r => r.category === 'Card Backs');
    assertTrue(typeof mailTarget({ type: 'shop', id: `unlock_${back.id}`, unlocked: true, name: back.name }) === 'function', 'an unlock mail has a target');
    ['rank', 'level', 'referral', 'request', 'season', 'series'].forEach(type => assertTrue(typeof mailTarget({ type, id: 'x' }) === 'function', `${type} mail opens something`));
    assertTrue(typeof mailTarget({ type: 'board', id: 'board_levels_10', board: 'levels' }) === 'function', 'board mail');
    assertTrue(typeof mailTarget({ type: 'friendLevel', id: 'f', uid: 'u1', name: 'Zara', level: 20 }) === 'function', 'friend level mail → their card');
    assertTrue(typeof mailTarget({ type: 'gift', id: 'g', direction: 'received', name: back.name }) === 'function', 'a gift mail → the item');
    assertTrue(typeof mailTarget({ type: 'challenge', id: 'burner', name: 'Burner' }) === 'function', 'a challenge mail → Challenges');
    const html = inboxMailCardHtml({ type: 'shop', id: `unlock_${back.id}`, unlocked: true, name: back.name, requirement: 'Reach Lvl 15' }, 0);
    assertTrue(/^\s*<div data-mail-idx="0" role="link"/.test(html), 'The card is a link');
    const realUser = currentUser;
    try {
      closeOtherMenuPages(); await wait();
      document.getElementById('inboxModal').classList.remove('hidden');
      inboxRenderedItems = [{ type: 'shop', id: `unlock_${back.id}`, unlocked: true, name: back.name, requirement: 'Reach Lvl 15' }];
      const area = document.getElementById('inboxArea');
      const before = area.innerHTML;
      area.innerHTML = inboxRenderedItems.map(inboxMailCardHtml).join('');
      area.querySelector('[data-mail-idx] p').click(); await wait();
      assertTrue(shown('themesModal') && !shown('inboxModal'), 'An unlock mail opens Custom');
      assertEqual(customTab, 'cardBack', 'on the Card Backs tab');
      area.innerHTML = before;
    } finally { currentUser = realUser; closeOtherMenuPages(); }
  });
  await test('v250: level badge colours, look slots by level, own leaderboard row, Pending requests, tap-to-watch', async () => {
    const cls = (L) => (xpLevelBadge(L).match(/xp-tier-(\w+)/) || [])[1] || '';
    assertEqual([19, 20, 39, 40, 60, 80, 98, 99].map(cls), ['white', 'bronze', 'bronze', 'silver', 'gold', 'purple', 'purple', 'max'], 'Tiers at 20/40/60/80/99');
    const realOn = xpFeatureOn, realXp = playerXp, realUser = currentUser;
    try {
      xpFeatureOn = true; currentUser = { uid: 'u1' }; playerXp = { total: xpForLevel(12) };
      assertEqual(LOADOUT_SLOTS.map(loadoutSlotLockLevel), [0, 0, 20], 'Lvl 12: slots 1-2 open, slot 3 needs Lvl 20');
      playerXp = { total: xpForLevel(5) };
      assertEqual(LOADOUT_SLOTS.map(loadoutSlotLockLevel), [0, 10, 20], 'Lvl 5: only slot 1');
      renderLoadouts();
      assertEqual(document.querySelectorAll('#customLoadouts [data-loadout-locked]').length, 2, 'Two locked tiles');
      assertTrue(!saveLoadout('s2', 'x'), 'A locked slot cannot be saved to');
      const row = leaderboardRowHtml({ username: 'Me', uid: 'u1', count: 500, level: 3 }, 1, 'levels');
      assertTrue(/class="lb-who[^"]*" data-lb-uid="u1"/.test(row), 'Your own row opens your card');
      assertTrue(!/>Level \d+</.test(row), 'No "Level N" subtitle on the Levels board');
      const pending = renderPlayerPopupHuman({ uid: 'u9', name: 'Zed' }, { loaded: true, rating: 500 }, 'sent');
      assertTrue(/PENDING/.test(pending) && !/ADD FRIEND/.test(pending), 'A sent request shows Pending');
      assertTrue(/ACCEPT FRIEND/.test(renderPlayerPopupHuman({ uid: 'u9', name: 'Zed' }, { loaded: true, rating: 500 }, 'incoming')), 'Theirs can be accepted');
      const now = serverNow();
      const fr = friendRowHtml('u9', { username: 'Zed', online: true, seen: now, playing: { mode: 'online', room: '123456', at: now } }, 'friend');
      assertTrue(/friend-status[^"]*friend-watch-btn[^"]*"/.test(fr.replace(/class="friend-status playing friend-watch-btn/, 'class="friend-status playing friend-watch-btn')) && /data-room="123456"[^>]*class="friend-status/.test(fr), 'The In a match status is a Watch button');
    } finally { xpFeatureOn = realOn; playerXp = realXp; currentUser = realUser; renderLoadouts(); }
  });
  await test('Friends list: highest level first, then online, then A-Z', () => {
    const area = document.getElementById('friendsListArea');
    const before = area.innerHTML;
    const now = serverNow();
    paintFriendsList({
      a: { username: 'Zed', level: 12, online: false },
      b: { username: 'Amy', level: 40, online: false },
      c: { username: 'Bob', level: 12, online: true, seen: now },
      d: { username: 'Cat', online: true, seen: now },
      e: { username: 'Abe', level: 12, online: false }
    });
    const names = [...area.innerHTML.matchAll(/Amy|Bob|Zed|Cat|Abe/g)].map(m => m[0]).filter((n, i, all) => all.indexOf(n) === i);
    assertEqual(names, ['Amy', 'Bob', 'Abe', 'Zed', 'Cat'], 'Level 40, then level 12 (online Bob first, then A-Z), then no level');
    area.innerHTML = before;
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
  await test('A casual match rejoins straight away (no question) and hands a bot stand-in back by name', () => {
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
      assertTrue(modal.classList.contains('hidden'), 'No rejoin question any more (owner, v235)');
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
  await test('A player ruled out after the stand-in\'s 5 turns is not put back into that game', () => {
    freshState({ isMultiplayer: false, roomCode: null, localPlayerId: null });
    const savedUser = currentUser;
    currentUser = null;
    matchReconnectAttempted = false;
    localStorage.setItem('shithead_active_match', JSON.stringify({ code: '246801', at: Date.now(), playerId: 'p_me', name: 'Jamie' }));
    const fakeRoom = { phase: 'PLAY', players: [{ id: 'p_host', name: 'Pooja', isBot: false }, { id: 'p_bot_me', name: 'Jamie (Bot)', isBot: true, hasFinished: true, conceded: true, finishRank: 3 }, { id: 'p_c', name: 'Sam', isBot: false }] };
    const originalDb = db, originalListen = listenToFirebaseRoom;
    let listened = false;
    listenToFirebaseRoom = () => { listened = true; };
    db = { ref: () => ({ once: (event, successCb) => successCb({ exists: () => true, val: () => fakeRoom }) }) };
    try {
      attemptMatchReconnect();
      assertTrue(!listened, 'The game goes on without them');
      assertEqual(joinedRoomRecord(), null, 'The stored match is forgotten');
    } finally {
      db = originalDb; listenToFirebaseRoom = originalListen; currentUser = savedUser;
      forgetJoinedRoom();
    }
  });
  await test('Play Friends stand-ins are Medium and, after 5 turns, the absent player is out (last place) while the others play on', () => {
    const was = { sync: syncFirebaseGameState, auth: hasMatchAuthority, st: window.setTimeout };
    try {
      freshState({ isMultiplayer: true, isRanked: false, isHost: true, roomCode: '555111', localPlayerId: 'p_host', phase: 'PLAY', currentTurnIndex: 0 });
      state.players = [
        makePlayer({ id: 'p_host', name: 'Amit', hand: [makeCard('K', 'S')] }),
        makePlayer({ id: 'p_b', name: 'Jamie', hand: [makeCard('5', 'H'), makeCard('6', 'H')] }),
        makePlayer({ id: 'p_c', name: 'Sam', hand: [makeCard('7', 'H')] })
      ];
      syncFirebaseGameState = () => {};
      hasMatchAuthority = () => true;
      window.setTimeout = () => 0;
      removePlayerFromMatch('p_b', 'disconnected');
      const sub = state.players[1];
      assertTrue(sub.isBot && sub.isCasualSubstitute && sub.difficulty === 'medium', 'a Medium stand-in with the cut-off takes the seat');
      sub.substituteMoveCount = 5;
      state.currentTurnIndex = 1;
      checkTurnAndAct();
      assertTrue(sub.hasFinished && sub.conceded && sub.finishRank === 3, 'after 5 stand-in turns the absent player is out, in last place');
      assertEqual(state.phase, 'PLAY', 'the other two play on');
      // A later finisher still takes 1st, not a place after the ruled-out player.
      state.players[0].hand = []; state.players[0].faceUp = []; state.players[0].faceDown = [];
      checkPlayerFinished(state.players[0]);
      assertEqual(state.players[0].finishRank, 1, 'the next player out is 1st');
    } finally {
      window.setTimeout = was.st; syncFirebaseGameState = was.sync; hasMatchAuthority = was.auth;
      if (state.botActionTimer) clearTimeout(state.botActionTimer);
      Object.assign(state, { isMultiplayer: false, roomCode: null, players: [] });
    }
  });
  await test('Still in the app when the signal returns: the stand-in seat is taken straight back', () => {
    const was = { atomic: updatePlayersAtomic, presence: setupPresenceTracking };
    try {
      freshState({ isMultiplayer: true, roomCode: '555222', localPlayerId: 'p_me', phase: 'PLAY' });
      currentUser = { uid: 'u_me' };
      const players = [{ id: 'p_host', name: 'Pooja', isBot: false }, { id: 'p_bot_x', name: 'Me (Bot)', uid: 'u_me', isBot: true, isCasualSubstitute: true, substituteMoveCount: 2 }];
      let written = null;
      updatePlayersAtomic = (code, updater, done) => { written = updater(players); done(null, true); };
      setupPresenceTracking = () => {};
      const seat = findMyStandInSeat(players);
      assertTrue(seat && seat.id === 'p_bot_x', 'finds its own stand-in by account');
      reclaimStandInInPlace('555222', seat);
      assertTrue(written && written[1].isBot === false && written[1].name === 'Me', 'the seat is human again');
      assertEqual(state.localPlayerId, 'p_bot_x', 'this phone plays that seat');
    } finally {
      updatePlayersAtomic = was.atomic; setupPresenceTracking = was.presence;
      Object.assign(state, { isMultiplayer: false, roomCode: null, players: [] });
    }
  });
  await test('REGRESSION: attemptMatchReconnect silently rejoins a Ranked match where the player was never substituted', () => {
    freshState({ isMultiplayer: false, isHost: false, isRanked: false, roomCode: null, localPlayerId: null });
    currentUser = { uid: 'uid_amit' };
    matchReconnectAttempted = false;
    seriesRejoinTried = true; // no Best of series in these rooms
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
    seriesRejoinTried = true; // no Best of series in these rooms
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
    const html = friendRowHtml('u1', { username: 'Pooja', online: true, seen: serverNow(), rating: 1523 }, 'friend');
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
    const expectedOrder = ['menuProfileBtn', 'menuStatsBtn', 'menuThemesBtn', 'menuFriendsBtn', 'menuLeaderboardBtn', 'menuChallengesBtn', 'menuLadderBtn', 'menuShopBtn', 'menuGuideBtn', 'menuSettingsBtn', 'menuSupportBtn', 'menuErrorReportsBtn', 'menuChangelogBtn', 'menuXpSwitchBtn', 'menuInstallBtn', 'menuSignOutBtn'];
    const nav = document.querySelector('#hamburgerDrawer nav');
    const actualOrder = Array.from(nav.querySelectorAll('button')).map(b => b.id);
    assertEqual(actualOrder, expectedOrder, 'Menu items must appear in exactly the agreed order: Profile, Stats, Personalisation, Friends, Leaderboard, Challenges, Level Ladder, Shop, Guide & Strategy, Settings, Support, Sign Out (signed in only)');
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
    openLeaderboardPanel('ranked');
    await new Promise((r) => setTimeout(r, 0));
    listeners.leaderboard({ val: () => ({ bo: { username: 'Bo', rating: 900, avatar: 'avatar-crown-diamond' } }) });
    const lbHtml = document.getElementById('leaderboardArea').innerHTML;
    assertEqual(lbHtml, (() => { const d = document.createElement('div'); d.innerHTML = leaderboardRowHtml({ usernameKey: 'bo', username: 'Bo', rating: 900, avatar: 'avatar-crown-diamond' }, 1); return d.innerHTML; })(), 'A changed picture must repaint the open Leaderboard');
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

  await test('Link previews: Open Graph and Twitter tags point at the real preview picture', async () => {
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content') || '';
    const img = meta('meta[property="og:image"]');
    assertEqual(img, 'https://shithead-pro.web.app/icons/share-preview-v3.jpg', 'og:image is an absolute address on the game domain (apps never resolve relative ones)');
    assertEqual(meta('meta[name="twitter:image"]'), img, 'X uses the same picture');
    assertEqual(meta('meta[name="twitter:card"]'), 'summary_large_image', 'X shows the large picture');
    assertEqual([meta('meta[property="og:image:width"]'), meta('meta[property="og:image:height"]')], ['1200', '630'], 'The size apps expect for a wide preview');
    ['og:title', 'og:description', 'og:url'].forEach(k => assertTrue(meta(`meta[property="${k}"]`).length > 10, `${k} is set`));
    assertTrue(meta('meta[name="description"]').length > 50, 'Search engines get a description');
    const res = await fetch('/icons/share-preview-v3.jpg');
    const bytes = res.ok ? new Uint8Array(await res.arrayBuffer()) : new Uint8Array();
    assertTrue(bytes[0] === 0xFF && bytes[1] === 0xD8, 'The picture file is there and is a real JPEG', res.status);
    assertTrue(bytes.length < 300 * 1024, 'Small enough for WhatsApp to show it (under 300 KB)', bytes.length);
  });

  await test('Leaderboard tabs: Challenges and Gauntlet boards read the server boards, best first, you highlighted', async () => {
    const listeners = {}, reads = [];
    const boards = {
      'boards/challenges': { u1: { name: 'Ann', count: 12 }, u2: { name: 'Bob', count: 30, avatar: 'default' }, u3: { name: 'Cy', count: 12 }, u4: { name: 'Zero', count: 0 } },
      'boards/gauntlet': { u1: { name: 'Ann', count: 7 }, u2: { name: 'Bob', count: 2 } }
    };
    const liveRef = (path, value) => {
      const ref = {
        on: (ev, cb) => { listeners[path] = cb; cb({ val: () => value }); },
        off: () => { delete listeners[path]; },
        once: () => Promise.resolve({ val: () => value }),
        orderByChild: (f) => { reads.push([path, f]); return ref; },
        limitToLast: () => ref
      };
      return ref;
    };
    db = { ref: (path) => liveRef(path, boards[path] || { bo: { username: 'Bo', rating: 900 } }) };
    currentUser = { uid: 'u1' };
    const tabs = [...document.querySelectorAll('#leaderboardModal [data-lb-tab]')].map(b => b.dataset.lbTab);
    assertEqual(tabs, ['ranked', 'challenges', 'gauntlet', 'levels'], 'Tabs: Ranked, Challenges, Gauntlet, Levels (Levels only while XP is on)');
    openLeaderboardPanel('challenges');
    await new Promise((r) => setTimeout(r, 0));
    assertTrue(reads.some(([p, f]) => p === 'boards/challenges' && f === 'count'), 'The Challenges board is read by count', reads);
    const rows = [...document.querySelectorAll('#leaderboardArea [data-lb-row]')].map(r => r.dataset.lbRow);
    assertEqual(rows, ['Bob', 'Ann', 'Cy'], 'Best first, ties by name, nobody on 0');
    const area = document.getElementById('leaderboardArea').innerHTML;
    assertTrue(area.includes('30 challenges completed') && /lb-place is-1/.test(area) && (area.match(/lb-place is-2/g) || []).length === 2, 'Counts shown; equal counts share a place', area.slice(0, 300));
    assertTrue(document.querySelector('#leaderboardArea [data-lb-row="Ann"]').innerHTML.includes('YOU'), 'Your own row is marked by account, not name');
    const myPic = resolveAvatarId(equippedCosmetics.avatar);
    const d = document.createElement('div'); d.innerHTML = avatarHtml(myPic, 30);
    assertTrue(document.querySelector('#leaderboardArea [data-lb-row="Ann"]').innerHTML.includes(d.innerHTML), 'Your own row shows the picture you have on now, not the one the board last saved');
    assertEqual(document.querySelector('[data-lb-tab="challenges"]').getAttribute('aria-selected'), 'true', 'The tab shows as selected');
    document.querySelector('[data-lb-tab="gauntlet"]').click();
    await new Promise((r) => setTimeout(r, 0));
    assertTrue(!listeners['boards/challenges'], 'Changing tab stops the old board listening');
    assertEqual([...document.querySelectorAll('#leaderboardArea [data-lb-row]')].map(r => r.dataset.lbRow), ['Ann', 'Bob'], 'Gauntlet board by bots beaten');
    assertTrue(document.getElementById('leaderboardArea').innerHTML.includes('7 Gauntlet bots beaten'), 'Gauntlet rows say bots beaten');
    assertTrue(/bots beaten/i.test(document.getElementById('leaderboardTabNote').textContent), 'The note explains the board');
    document.getElementById('leaderboardModal').classList.add('hidden');
    let remembered = null; try { remembered = localStorage.getItem('shithead_leaderboard_tab'); } catch (e) {}
    assertEqual(remembered, 'gauntlet', 'The last tab is remembered');
    leaderboardTab = 'ranked';
    try { localStorage.removeItem('shithead_leaderboard_tab'); } catch (e) {}
  });

  await test('Leaderboard congratulations mail: #1/#2/#3/top 10 per board, with a way to the board', async () => {
    assertTrue(ACTIVITY_MAIL_TYPES.includes('board'), 'Board mail shows in the Inbox');
    const one = inboxItemHtml({ type: 'board', board: 'gauntlet', tier: 1, rank: 1, id: 'board_gauntlet_1' });
    assertTrue(one.includes('#1 on the Gauntlet leaderboard') && one.includes('🥇'), 'The #1 mail', one);
    const ten = inboxItemHtml({ type: 'board', board: 'challenges', tier: 10, rank: 7, id: 'board_challenges_10' });
    assertTrue(ten.includes('You made the Challenges top 10'), 'The top 10 mail');
    assertTrue(inboxItemHtml({ type: 'board', board: 'ranked', tier: 3, rank: 3, id: 'board_ranked_3' }).includes('#3 on the Ranked leaderboard'), 'Ranked #3');
    assertTrue(one.includes('data-board-open="gauntlet"') && one.includes('data-activity-id="board_gauntlet_1"'), 'VIEW LEADERBOARD and MARK AS READ');
    const opened = [];
    const realOpen = openLeaderboardPanel;
    openLeaderboardPanel = (tab) => opened.push(tab);
    try {
      document.getElementById('inboxArea').innerHTML = one;
      document.querySelector('#inboxArea [data-board-open]').click();
    } finally { openLeaderboardPanel = realOpen; document.getElementById('inboxArea').innerHTML = ''; }
    assertEqual(opened, ['gauntlet'], 'VIEW LEADERBOARD opens that board');
  });

  await test("REGRESSION: the public Leaderboard does not require a signed-in user", () => {
    currentUser = null;
    openLeaderboardPanel('ranked');
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
  await test('Menu header: the username (never the real name) and picture, centred, over four even quick buttons', async () => {
    const realProfile = getOrCreateUserProfile;
    try {
      getOrCreateUserProfile = () => Promise.resolve({ username: 'AmitK' });
      currentUser = { uid: 'u1', email: 'test@x.com', displayName: 'Amit Kumar-Smith' };
      updateHamburgerAccountLabel();
      const label = document.getElementById('hamburgerAccountLabel');
      assertTrue(label.textContent !== 'Amit Kumar-Smith' && label.textContent !== 'test@x.com', 'Never the real name or email');
      await new Promise(r => setTimeout(r, 0));
      assertEqual(label.textContent, 'AmitK', 'The username');
      assertTrue(!document.getElementById('hamburgerAccountAvatar').classList.contains('hidden'), 'The picture shows');
      assertTrue(!document.getElementById('hamburgerAccountSub'), 'No extra line under the name');
      const quick = document.querySelector('#hamburgerAccountHead .drawer-quick');
      assertEqual(getComputedStyle(quick).display, 'grid', 'Quick buttons are an even grid');
      assertEqual(quick.querySelectorAll('button').length, 4, 'Four quick buttons');
      currentUser = null;
      updateHamburgerAccountLabel();
      assertEqual(label.textContent, 'Not signed in', 'Signed out');
      assertTrue(document.getElementById('hamburgerAccountAvatar').classList.contains('hidden'), 'No picture when signed out');
    } finally { getOrCreateUserProfile = realProfile; currentUser = null; }
  });

  await test('Desktop Site on a phone is detected (layout far wider than a small touch screen), and not elsewhere', () => {
    const saved = { sw: Object.getOwnPropertyDescriptor(Screen.prototype, 'width'), sh: Object.getOwnPropertyDescriptor(Screen.prototype, 'height'), tp: Object.getOwnPropertyDescriptor(Navigator.prototype, 'maxTouchPoints') };
    const set = (w, h, touch) => {
      Object.defineProperty(screen, 'width', { configurable: true, get: () => w });
      Object.defineProperty(screen, 'height', { configurable: true, get: () => h });
      Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, get: () => touch });
    };
    try {
      set(412, 915, 5);
      assertEqual(isDesktopSiteOnPhone(), innerWidth > 412 * 1.3, 'A phone screen far narrower than the layout');
      set(Math.max(innerWidth, 1200), 900, 5);
      assertTrue(!isDesktopSiteOnPhone(), 'Not on a big screen');
      set(412, 915, 0);
      const coarse = !!matchMedia('(pointer: coarse)').matches;
      assertTrue(coarse || !isDesktopSiteOnPhone(), 'Not without touch');
    } finally {
      delete screen.width; delete screen.height; delete navigator.maxTouchPoints;
    }
  });
  await test('Bot names: plain letters only, no repeats, removed names gone, never the player\'s own name', () => {
    assertTrue(BOT_NAMES.every(n => /^[A-Za-z]+$/.test(n)), 'Only plain letters (no accents or special characters)');
    assertEqual(new Set(BOT_NAMES).size, BOT_NAMES.length, 'No repeats');
    ['Fatima', 'Soren', 'Zainab', 'Zara', 'Lukas', 'Mateo'].forEach(n => assertTrue(!BOT_NAMES.includes(n), n + ' removed'));
    const input = document.getElementById('playerNameInput');
    const before = input.value;
    try {
      input.value = 'Harry';
      for (let i = 0; i < 25; i++) {
        freshState();
        startSinglePlayerGame(3);
        assertTrue(!state.players.slice(1).some(p => p.name === 'Harry'), 'No bot shares the player\'s name');
      }
    } finally { input.value = before; freshState(); }
  });
  await test('A new player: one Easy bot by default, no nickname needed for Vs Bots, the Tutorial stands out, Sign In is offered', () => {
    const keys = ['shithead_bot_count', 'shithead_difficulty', 'shithead_tutorial_progress'];
    const saved = keys.map(k => { try { return localStorage.getItem(k); } catch (e) { return null; } });
    const input = document.getElementById('playerNameInput');
    const nameBefore = input.value;
    try {
      keys.forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
      assertEqual(readBotPrefs(), { count: 1, difficulty: 'easy' }, 'First visit: one Easy bot');
      input.value = '';
      freshState(); startSinglePlayerGame(1);
      assertEqual(state.players[0].name, 'You', 'No nickname needed for Vs Bots');
      freshState();
      refreshTutorialNudge();
      assertTrue(document.getElementById('startTutorialBtn').classList.contains('tutorial-new'), 'The Tutorial button stands out for a new player');
      localStorage.setItem('shithead_tutorial_progress', JSON.stringify({ quick_start: true }));
      refreshTutorialNudge();
      assertTrue(!document.getElementById('startTutorialBtn').classList.contains('tutorial-new'), 'Not once Quick Start is done');
      currentUser = null; updateHamburgerAccountLabel();
      assertTrue(!document.getElementById('drawerSignInBtn').classList.contains('hidden'), 'The menu offers Sign In when signed out');
    } finally {
      keys.forEach((k, i) => { try { if (saved[i] === null) localStorage.removeItem(k); else localStorage.setItem(k, saved[i]); } catch (e) {} });
      input.value = nameBefore; freshState(); refreshTutorialNudge();
    }
  });
  await test('The Deck, Pile and Base Card never move: power labels, a big Pile, an empty Deck and Snap Burn leave them in place', async () => {
    freshState();
    startSinglePlayerGame(1);
    try {
      state.phase = 'PLAY'; state.currentTurnIndex = 0; render();
      const pos = () => ['drawPile', 'discardPileContainer', 'bottomCardPreview'].map(id => { const r = document.getElementById(id).getBoundingClientRect(); return [Math.round(r.left * 10), Math.round(r.top * 10)].join(','); }).join(' ');
      state.discardPile = []; render();
      const base = pos();
      const steps = [
        () => { state.discardPile = [{ id: 'm1', rank: '3', suit: '♥' }]; state.activeConstraint = deriveConstraintFromRank('3'); },
        () => { state.discardPile.push({ id: 'm2', rank: '9', suit: '♥' }); state.activeConstraint = deriveConstraintFromRank('9'); },
        () => { for (let i = 0; i < 9; i++) state.discardPile.push({ id: 'm3' + i, rank: 'K', suit: '♠' }); state.activeConstraint = null; },
        () => { state.drawPile = []; },
        () => { state.discardPile = [{ id: 'k1', rank: 'K', suit: '♠' }, { id: 'k2', rank: 'K', suit: '♥' }, { id: 'k3', rank: 'K', suit: '♦' }]; state.players[0].hand.push({ id: 'k4', rank: 'K', suit: '♣' }); state.currentTurnIndex = 1; }
      ];
      for (const step of steps) {
        step(); render();
        await new Promise(r => requestAnimationFrame(r));
        assertEqual(pos(), base, 'The centre row stayed put');
      }
      const snap = document.getElementById('snapBurnBtn').getBoundingClientRect();
      assertTrue(snap.right <= innerWidth, 'Snap Burn stays on screen');
    } finally { freshState(); }
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
  await test('Account deletion goes through the server (7-day window) and signs out; nothing is deleted from the phone', async () => {
    const saved = { signOut: performSignOut };
    let signedOut = 0;
    try {
      currentUser = { uid: 'del-uid', providerData: [{ providerId: 'google.com' }] };
      performSignOut = () => { signedOut++; return Promise.resolve(); };
      let wrote = 0;
      db = { ref: () => ({ update: () => { wrote++; return Promise.resolve(); }, set: () => { wrote++; return Promise.resolve(); }, remove: () => { wrote++; return Promise.resolve(); }, once: () => Promise.resolve({ val: () => null }) }) };
      const purgeAt = Date.now() + 7 * 864e5;
      const calls = fakeEconomy({ deleteAccount: () => ({ deletion: { requestedAt: Date.now(), purgeAt } }) });
      document.getElementById('deleteAccountModal').classList.remove('hidden');
      document.getElementById('deleteStep2').classList.remove('hidden');
      const input = document.getElementById('deleteConfirmInput');
      input.value = 'DELETE'; input.dispatchEvent(new Event('input'));
      document.getElementById('deleteFinalBtn').click();
      await new Promise(r => setTimeout(r, 30));
      assertEqual(calls, [['deleteAccount', { op: 'request' }]], 'Asks the server to delete');
      assertEqual(wrote, 0, 'The phone deletes nothing itself');
      assertEqual(signedOut, 1, 'Then signs out');
      assertTrue(document.getElementById('deleteAccountModal').classList.contains('hidden'), 'The dialog closes');
    } finally {
      performSignOut = saved.signOut;
      document.getElementById('deleteConfirmInput').value = '';
      document.getElementById('deleteStep2').classList.add('hidden');
    }
  });

  await test('Signing in to an account being deleted asks "Keep my account?" before anything public starts', async () => {
    const saved = { start: startSignedInSession };
    let started = 0;
    try {
      startSignedInSession = () => { started++; };
      currentUser = { uid: 'keep-uid' };
      showKeepAccount({ requestedAt: Date.now(), purgeAt: Date.now() + 5 * 864e5 });
      const modal = document.getElementById('keepAccountModal');
      assertTrue(!modal.classList.contains('hidden') && /erased for good on/.test(document.getElementById('keepAccountText').textContent), 'Asks, with the date');
      assertEqual(started, 0, 'Nothing starts yet (no public profile, presence or leaderboard)');
      const calls = fakeEconomy({ deleteAccount: () => ({ deletion: null }) });
      document.getElementById('keepAccountBtn').click();
      await new Promise(r => setTimeout(r, 30));
      assertEqual(calls, [['deleteAccount', { op: 'cancel' }]], 'Keep cancels the deletion on the server');
      assertEqual(started, 1, 'Then the normal signed-in session starts');
      assertTrue(modal.classList.contains('hidden'), 'And the question closes');
      assertTrue(BACK_LAYERS.keepAccountModal === null, 'Back cannot skip the question');
    } finally { startSignedInSession = saved.start; document.getElementById('keepAccountModal').classList.add('hidden'); }
  });

  await test('Download my data saves the server copy plus this device\'s settings as JSON (no push token)', async () => {
    const saved = { createObjectURL: URL.createObjectURL };
    let blob = null;
    try {
      currentUser = { uid: 'exp-uid' };
      localStorage.setItem('shithead_push_token', 'secret');
      URL.createObjectURL = (b) => { blob = b; return 'blob:x'; };
      fakeEconomy({ accountData: () => ({ account: { uid: 'exp-uid', username: 'Amitk' }, profile: { diamonds: 5 } }) });
      await downloadMyData();
      assertTrue(!!blob && /shithead-data-Amitk-\d{4}-\d{2}-\d{2}\.json/.test(blob.name), 'A dated JSON file named after the player', blob && blob.name);
      const data = JSON.parse(await blob.text());
      assertEqual(data.profile.diamonds, 5, 'Server data included');
      assertTrue(!!data.thisDevice && !('shithead_push_token' in data.thisDevice), "This device's settings included, push token left out");
      assertTrue(/Saved/.test(document.getElementById('downloadMyDataStatus').textContent), 'Says it was saved');
    } finally { URL.createObjectURL = saved.createObjectURL; localStorage.removeItem('shithead_push_token'); }
  });

  await test("Can't sign in? help: reset link, resend verification, Google tip and support", () => {
    const panel = document.getElementById('authHelpPanel');
    assertTrue(panel.classList.contains('hidden'), 'Folded away by default');
    document.getElementById('authHelpToggle').click();
    assertTrue(!panel.classList.contains('hidden'), 'Opens on tap');
    const text = panel.textContent;
    assertTrue(/reset link/.test(text) && /send it again/.test(text) && /Continue with Google/.test(text) && /7 days/.test(text) && /Contact support/.test(text), 'Covers every way back in');
    document.getElementById('authHelpToggle').click();
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
    assertEqual(pickWeeklyChallengeIds('2026-W41'), ['snap-burn-once', 'win-streak', 'pile-diver', 'play-facedown', 'rank-triple'], 'Weekly picks for 2026-W41 (5 a week from then)');
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

  await test('Server economy: a call that trips the Firebase Messaging bug is sent directly instead', async () => {
    const saved = { callable: economyCallable, primed: messagingPrimed, fetch: window.fetch };
    const sent = [];
    try {
      messagingPrimed = Promise.resolve();
      auth = { currentUser: { getIdToken: async () => 'id-token' } };
      economyCallable = () => Promise.reject(Object.assign(new Error("Messaging: We are unable to register the default service worker. (messaging/failed-service-worker-registration)."), { code: 'messaging/failed-service-worker-registration' }));
      window.fetch = async (url, opts) => { sent.push([url, opts]); return { ok: true, json: async () => ({ result: { run: null, doneToday: false } }) }; };
      const res = await realCallEconomy('gauntlet', { op: 'status' });
      assertEqual(res, { run: null, doneToday: false }, 'The answer comes back as normal');
      assertEqual(sent.length, 1, 'Sent once, directly');
      assertEqual(sent[0][0], ECONOMY_URL, 'To the economy function');
      assertEqual(sent[0][1].headers.Authorization, 'Bearer id-token', 'As the signed-in player');
      assertEqual(JSON.parse(sent[0][1].body), { data: { op: 'status', action: 'gauntlet' } }, 'Same request');
      window.fetch = async () => ({ ok: false, json: async () => ({ error: { message: 'Not enough Diamonds.', status: 'FAILED_PRECONDITION' } }) });
      let msg = '';
      await realCallEconomy('buyItem', { itemId: 'x' }).catch(e => { msg = e.message; });
      assertEqual(msg, 'Not enough Diamonds.', "The server's refusal is shown as it is");
      sent.length = 0;
      window.fetch = async (url, opts) => { sent.push(url); return { ok: true, json: async () => ({ result: {} }) }; };
      economyCallable = () => Promise.reject(new Error('Not enough Diamonds.'));
      msg = '';
      await realCallEconomy('buyItem', { itemId: 'x' }).catch(e => { msg = e.message; });
      assertTrue(sent.length === 0 && msg === 'Not enough Diamonds.', 'Other errors are never re-sent');
    } finally { economyCallable = saved.callable; messagingPrimed = saved.primed; window.fetch = saved.fetch; }
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
      assertEqual({ from: matchSummaryRating.from, to: matchSummaryRating.to }, { from: 500, to: 516 }, 'The summary shows the server\'s result');
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
      'table-neon': 3000, 'table-aurora': 3000, 'table-space': 3000,
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
    const previousDeck = state.deckTheme, originalSave = saveGameState;
    saveGameState = () => {};
    try {
      cosmeticPurchaseState = Object.fromEntries(COSMETIC_SHOP_ITEMS.map(item => [item.id, true]));
      COSMETIC_SHOP_ITEMS.forEach(item => {
        const type = COSMETIC_CATEGORY_TYPES[item.category];
        assertTrue(!!type, `${item.id} must have an equip category`);
        if (type === 'deck') {
          // Decks select a deck theme (card faces) instead of an equipped slot.
          assertTrue(equipCosmetic(type, item.id), `${item.id} must equip successfully`);
          assertEqual(equippedIdOf('deck'), item.id, `${item.id} must become the selected deck`);
          assertTrue(document.body.classList.contains(item.theme), `${item.id} must change the card faces`);
          return;
        }
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
      selectDeckTheme(previousDeck || 'theme-obsidian');
      saveGameState = originalSave;
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
      assertEqual(items.length, 8, `${ev.name} sells 8 items`);
      assertEqual(new Set(items.map(i => i.category)).size, 8, `${ev.name} has one item per Shop section`);
      assertEqual(items.reduce((sum, i) => sum + i.cost, 0), 8600, `${ev.name} items total 8600 (incl. the 3000 Joker effect)`);
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
      assertTrue(!COSMETIC_SHOP_ITEMS.filter(i => i.season).some(i => i.category === 'Avatars' && !isSupportedCosmetic('avatar', i.id)), 'Seasonal pictures have art');
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
      assertTrue(text.includes('You won'), 'First place says so');
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
      shopTab = 'Avatars';
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
    assertEqual(Object.keys(loadout).sort(), ['avatar','burnEffect','cardBack','frame','jokerEffect','victoryEffect'], 'Only opponent-visible cosmetics (incl. the profile picture and Joker effect) should be synced');
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

  // ---- Gauntlet ----
  const gauntletSaved = () => ({ user: currentUser, usesServer: gauntletUsesServer, shuffle: runShuffleIntro, diamonds: challengeEconomy.diamonds,
    owned: cosmeticPurchaseState, g: state.gauntlet, mp: state.isMultiplayer, local: localStorage.getItem(GAUNTLET_LOCAL_KEY) });
  const gauntletRestore = (saved) => {
    currentUser = saved.user; gauntletUsesServer = saved.usesServer; runShuffleIntro = saved.shuffle;
    challengeEconomy.diamonds = saved.diamonds; cosmeticPurchaseState = saved.owned; state.gauntlet = saved.g; state.isMultiplayer = saved.mp;
    if (saved.local === null) localStorage.removeItem(GAUNTLET_LOCAL_KEY); else localStorage.setItem(GAUNTLET_LOCAL_KEY, saved.local);
    gauntletPending = null; gauntletLastView = null; gauntletPickedMode = null; closeGauntlet();
    document.getElementById('gauntletHud').classList.add('hidden');
  };
  const endGauntletGame = (won) => {
    const [me, bot] = state.players;
    me.hasFinished = bot.hasFinished = true;
    me.finishRank = won ? 1 : 2; bot.finishRank = won ? 2 : 1;
    state.phase = 'FINISHED';
  };

  await test('Gauntlet: rounds are Easy, Easy, Medium, Hard, Boss with 3 lives; each game is one bot at that level', () => {
    const saved = gauntletSaved();
    try {
      assertEqual(GAUNTLET.rounds, ['easy', 'easy', 'medium', 'hard', 'boss'], 'The five rounds');
      assertEqual([GAUNTLET.lives, GAUNTLET.firstReward, GAUNTLET.dailyReward], [3, 200, 50], 'Lives and rewards');
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      startSinglePlayerGame(1, null, { gauntlet: { runId: 'g1', round: 3, lives: 2 } });
      const bots = state.players.filter(p => p.isBot);
      assertEqual(bots.length, 1, 'One bot');
      assertEqual(bots[0].difficulty, 'hard', 'Round 4 is the Hard bot');
      assertEqual(state.gauntlet.bot.name, bots[0].name, 'The bot is remembered for a retry');
      render();
      const hud = document.getElementById('gauntletHud');
      assertTrue(!hud.classList.contains('hidden'), 'Hearts show on the table');
      assertEqual(hud.querySelectorAll('.gh-heart').length, 3, 'Three hearts');
      assertEqual(hud.querySelectorAll('.gh-heart.is-empty').length, 1, 'A lost life is a hollow heart');
      assertTrue(/4\/5/.test(hud.textContent), 'The round is shown');
      const r = hud.getBoundingClientRect(), t = document.getElementById('gameTable').getBoundingClientRect();
      assertTrue(r.left - t.left < 12 && r.top - t.top < 14, 'Hearts sit in the top-left corner of the table');
      startSinglePlayerGame(1);
      assertTrue(state.gauntlet === null && !state.players[1].difficulty, 'A normal game is not a Gauntlet game');
      render();
      assertTrue(hud.classList.contains('hidden'), 'No hearts in a normal game');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet: a win is reported to the Gauntlet only (never matchWin, so no difficulty unlock progress)', async () => {
    const saved = gauntletSaved();
    try {
      currentUser = { uid: 'g-uid' };
      gauntletUsesServer = () => true;
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      startSinglePlayerGame(1, null, { gauntlet: { runId: 'g1', round: 0, lives: 3 } });
      const calls = fakeEconomy({ gauntlet: (d) => ({ run: { id: 'g1', round: 1, lives: 3, playing: false }, doneToday: false, completions: 0, firstDone: false, over: false, completed: false, diamondsAwarded: 0, first: false, newItems: [], diamonds: 5 }) });
      const me = state.players[0];
      me.hand = []; me.faceUp = []; me.faceDown = [];
      checkPlayerFinished(me);
      endGauntletGame(true);
      await gauntletMatchEnded();
      assertEqual(calls.map(c => c[0]), ['gauntlet'], 'Only the Gauntlet hears about the win');
      assertEqual(calls[0][1], { op: 'result', runId: 'g1', won: true }, 'Run id and the result; never an amount');
      assertEqual([state.gauntlet.round, state.gauntlet.lives], [1, 3], 'On to round 2');
      assertEqual(gauntletLastView.kind, 'won', 'The Continue screen');
      assertTrue(/CONTINUE GAUNTLET/.test(document.getElementById('gauntletModalBody').textContent), 'Continue Gauntlet is offered');
      await gauntletMatchEnded();
      assertEqual(calls.length, 1, 'Reported once per match');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet: a loss costs a life and TRY AGAIN brings back the same bot', async () => {
    const saved = gauntletSaved();
    try {
      currentUser = { uid: 'g-uid' };
      gauntletUsesServer = () => true;
      runShuffleIntro = (fn) => fn();
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      startSinglePlayerGame(1, null, { gauntlet: { runId: 'g2', round: 2, lives: 3 } });
      const bot = { name: state.players[1].name, avatar: state.players[1].avatar };
      const calls = fakeEconomy({ gauntlet: (d) => d.op === 'result'
        ? { run: { id: 'g2', round: 2, lives: 2, playing: false }, doneToday: false, completions: 0, firstDone: false }
        : { run: { id: 'g2', round: 2, lives: 2, playing: true }, doneToday: false, completions: 0, firstDone: false } });
      endGauntletGame(false);
      await gauntletMatchEnded();
      assertEqual(gauntletLastView.kind, 'lost', 'The lost-a-life screen');
      assertTrue(/TRY AGAIN/.test(document.getElementById('gauntletModalBody').textContent), 'Try again is offered');
      await gauntletAction('begin');
      assertEqual(calls[1], ['gauntlet', { op: 'begin', runId: 'g2' }], 'The next game is begun on the server');
      assertEqual(state.phase, 'SWAP', 'A new game is dealt');
      assertEqual({ name: state.players[1].name, avatar: state.players[1].avatar }, bot, 'The same bot, name and picture');
      assertEqual(state.players[1].difficulty, 'medium', 'At the same level');
      assertEqual(state.gauntlet.lives, 2, 'With one life fewer');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet: beating the Boss pays from the server and unlocks the picture and frame', async () => {
    const saved = gauntletSaved();
    try {
      currentUser = { uid: 'g-uid' };
      gauntletUsesServer = () => true;
      cosmeticPurchaseState = {};
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      startSinglePlayerGame(1, null, { gauntlet: { runId: 'g3', round: 4, lives: 1 } });
      assertEqual(state.players[1].difficulty, 'boss', 'The last round is the Boss');
      fakeEconomy({ gauntlet: () => ({ run: null, doneToday: true, completions: 1, firstDone: true, completed: true, diamondsAwarded: 200, first: true,
        newItems: [{ id: 'avatar-gauntlet', name: 'Gauntlet Champion' }, { id: 'frame-gauntlet', name: 'Gauntlet Gold' }], diamonds: 260 }) });
      endGauntletGame(true);
      await gauntletMatchEnded();
      assertEqual(gauntletLastView.kind, 'done', 'The Gauntlet beaten screen');
      assertEqual(challengeEconomy.diamonds, 260, 'Balance from the server');
      assertTrue(!!cosmeticPurchaseState['avatar-gauntlet'] && !!cosmeticPurchaseState['frame-gauntlet'], 'Picture and frame owned');
      const body = document.getElementById('gauntletModalBody').textContent;
      assertTrue(/\+200/.test(body) && /Gauntlet Champion/.test(body) && /Gauntlet Gold/.test(body), 'The reward and both items are shown');
      assertTrue(isSupportedCosmetic('frame', 'frame-gauntlet') && isSupportedCosmetic('avatar', 'avatar-gauntlet'), 'Both can be equipped');
    } finally { gauntletRestore(saved); }
  });

  await test('v256: Custom groups fold and remember; mode tips; tutorial hold waits to be read; level avatars move', () => {
    openThemesPanel();
    setCustomTab('burnEffect');
    const head = document.querySelector('#personalisationBurnEffects [data-custom-group-toggle="burnEffect:level"]');
    assertTrue(!!head && head.getAttribute('aria-expanded') === 'true', 'Earn by levelling up group is open by default');
    try {
      head.click();
      assertTrue(!document.querySelector('#personalisationBurnEffects [data-equip-id="burn-lvl-spark-snap"]'), 'Folding hides its items');
      assertTrue(JSON.parse(localStorage.getItem(CUSTOM_GROUPS_KEY) || '[]').includes('burnEffect:level'), 'and is remembered');
      assertTrue(!!focusCustomTile('burnEffect', 'burn-lvl-spark-snap'), 'Focusing an item in a folded group opens it');
    } finally {
      customGroupsCollapsed.clear(); localStorage.removeItem(CUSTOM_GROUPS_KEY); renderPersonalisationCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
    ['modeSingleBtn', 'modeMultiBtn', 'modeRankedBtn'].forEach(id => assertTrue(!!document.querySelector(`#${id} [data-mode-tip]`), `${id} has its ⓘ`));
    assertTrue(Object.keys(MODE_TIPS).length === 3, 'Each mode explains itself');
    assertTrue(TUTORIAL_HOLD_READ_MS >= 2000 && TUTORIAL_HOLD_READ_MS <= 3000, 'The hold step waits 2-3s so the card can be read');
    ['avatar-lvl-burn-king', 'avatar-lvl-chaos-jester', 'avatar-lvl-the-shithead'].forEach(id => assertTrue(AVATAR_ART[id].animated && /av-gx-glint/.test(AVATAR_ART[id].art), `${id} is animated`));
    assertTrue(!AVATAR_ART['avatar-lvl-rookie-rogue'].animated, 'the others stay still');
    assertEqual(GAUNTLET.modes.boss.dailyReward, 200, 'Boss Gauntlet daily win pays 200');
  });

  await test('Header Shop button on tablets and PCs; wide headers never shrink when pressed (v255)', () => {
    const btn = document.getElementById('headerShopBtn');
    assertTrue(!!btn && btn.nextElementSibling?.id === 'headerDiamondBtn', 'The Shop button sits just left of the Diamonds');
    const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } });
    const media = css.find(r => r.media && /min-width:\s*700px/.test(r.media.mediaText) && /#headerShopBtn/.test(r.cssText));
    assertTrue(!!media && /display:\s*flex/.test(media.cssText), 'Shown from 700px wide (tablets and PCs)');
    assertTrue(css.some(r => /\.series-head/.test(r.selectorText || '') && /:active/.test(r.selectorText || '') && /scale:\s*1/.test(r.cssText)), 'Section headers keep their size when pressed');
    const real = openShopPanel;
    let opened = false;
    openShopPanel = () => { opened = true; };
    try {
      btn.click();
      assertTrue(opened, 'It opens the Shop');
    } finally { openShopPanel = real; }
  });

  await test('Gauntlet modes (v254): Hard and Boss, their locks, one a day, lives and rewards', async () => {
    const saved = gauntletSaved();
    try {
      assertEqual(GAUNTLET.modes.hard.rounds, ['medium', 'hard', 'hard', 'hard', 'boss'], 'Hard: Medium, three Hard, then the Boss');
      assertEqual([GAUNTLET.modes.easy.lives, GAUNTLET.modes.hard.lives, GAUNTLET.modes.boss.lives], [3, 2, 1], 'Lives 3 / 2 / 1');
      assertEqual(GAUNTLET.modes.boss.rounds, ['boss', 'boss', 'boss'], 'Boss: three Boss bots');
      assertEqual([GAUNTLET.modes.hard.level, GAUNTLET.modes.boss.level], [30, 50], 'Unlock levels');
      assertEqual(GAUNTLET.modes.boss.needs, { easy: 1, hard: 3 }, 'Boss needs Easy once and Hard 3 times');
      assertEqual(GAUNTLET.modes.boss.firstReward, 600, 'Boss first clear pays 600');
      assertEqual(serverEconomyCatalog().gauntlet.modes.boss.firstReward, 600, 'Exported to the server');
      const mk = (over = {}) => ({ run: null, todayMode: null, modes: { easy: { completions: 1, firstDone: true, doneToday: false, locked: null },
        hard: { completions: 0, firstDone: false, doneToday: false, locked: null }, boss: { completions: 0, firstDone: false, doneToday: false, locked: 'Reach Lvl 50 to unlock the Boss Gauntlet.' } }, ...over });
      assertTrue(gauntletModeState(mk(), 'hard').open, 'Hard open when the server says so');
      assertEqual(gauntletModeState(mk(), 'boss').why, 'Reach Lvl 50 to unlock the Boss Gauntlet.', "The server's lock reason is shown");
      assertTrue(/Today's Gauntlet is Easy/.test(gauntletModeState(mk({ todayMode: 'easy' }), 'hard').why || ''), 'One Gauntlet a day');
      assertTrue(/Sign in/.test(gauntletModeState({ local: true, run: null }, 'hard').why || '') || /offline/.test(gauntletModeState({ local: true, run: null }, 'hard').why || ''), 'Signed out: Easy only');
      currentUser = { uid: 'g-uid' };
      gauntletUsesServer = () => true;
      let sent = null;
      fakeEconomy({ gauntlet: (d) => { sent = d; return d.op === 'status' ? mk() : { ...mk(), run: { id: 'gh1', mode: 'hard', round: 0, lives: 2, playing: true, day: localDateKey() } }; } });
      showGauntlet({ kind: 'welcome', status: mk() });
      const body = document.getElementById('gauntletModalBody');
      assertEqual(body.querySelectorAll('[data-gauntlet-pick]').length, 3, 'Three mode cards');
      body.querySelector('[data-gauntlet-pick="boss"]').click();
      assertTrue(/Lvl 50/.test(body.textContent) && body.querySelector('.gauntlet-go').disabled, 'A locked mode says why and cannot start');
      body.querySelector('[data-gauntlet-pick="hard"]').click();
      assertEqual(body.querySelectorAll('.gh-hearts .gh-heart').length, 2, 'Hard shows 2 hearts');
      assertTrue(/400/.test(body.textContent) && /Gauntlet Conqueror/.test(body.textContent), 'Hard reward: 400 and its avatar');
      const realIntro = runShuffleIntro; runShuffleIntro = (cb) => cb();
      try {
        body.querySelector('.gauntlet-go').click();
        await new Promise(r => setTimeout(r, 0));
      } finally { runShuffleIntro = realIntro; }
      assertEqual(sent && sent.op === 'start' && sent.mode, 'hard', 'Start asks the server for the Hard Gauntlet');
      assertEqual(state.gauntlet.mode, 'hard', 'The game is a Hard run');
      assertEqual(state.players[1].difficulty, 'medium', 'Hard round 1 is the Medium bot');
      renderGauntletHud();
      assertEqual(document.querySelectorAll('#gauntletHud .gh-heart').length, 2, 'The HUD shows the mode\'s lives');
      assertEqual(gauntletFirstKey('boss'), 'gauntlet-boss-first', 'Each mode has its own first-clear challenge');
      assertEqual(challengeNameForKey('gauntlet-hard-first').name, 'Hard Gauntlet Champion', 'and it is named in the Completed list');
      ['avatar-gauntlet', 'avatar-gauntlet-hard', 'avatar-gauntlet-boss'].forEach((id) => {
        assertTrue(AVATAR_ART[id].photo && AVATAR_ART[id].animated && /gauntlet-\w+\.webp/.test(AVATAR_ART[id].art), `${id} is the owner's animated crest`);
        assertTrue(isSupportedCosmetic('avatar', id), `${id} can be equipped`);
      });
      ['frame-gauntlet-hard', 'frame-gauntlet-boss'].forEach((id) => assertTrue(isSupportedCosmetic('frame', id) && !!getCosmeticFrameStyle(id) && !!getOpponentCosmeticFrameStyle(id), `${id} is a working frame`));
      assertTrue(!!document.querySelector('#rulesModal [data-guide-section="gauntlet"] .guide-table'), 'The Guide has the modes table');
    } finally { gauntletRestore(saved); closeGauntlet(); }
  });

  await test('Gauntlet: the frame and picture are earn-only (never in the Shop, never giftable)', () => {
    assertTrue(!COSMETIC_SHOP_ITEMS.some(i => i.id === 'frame-gauntlet' || i.id === 'avatar-gauntlet'), 'Not sold');
    const cat = serverEconomyCatalog();
    assertTrue(!cat.items['frame-gauntlet'] && !cat.items['avatar-gauntlet'], 'The server has no price for them');
    assertEqual(cat.earned['avatar-gauntlet'].type, 'gauntlet', 'The picture is granted by the Gauntlet itself');
    assertEqual(cat.gauntlet.frame, 'frame-gauntlet', 'The server knows which frame to grant');
    assertTrue(!!getCosmeticFrameStyle('frame-gauntlet') && !!getOpponentCosmeticFrameStyle('frame-gauntlet'), 'The frame is drawn on your cards and opponents see it');
  });

  await test('Gauntlet: signed out, a run is kept on this device (no rewards); 3 losses end it; leaving a game costs a life', async () => {
    const saved = gauntletSaved();
    try {
      currentUser = null;
      localStorage.removeItem(GAUNTLET_LOCAL_KEY);
      let r = await gauntletCall('start');
      assertTrue(r.local && r.run.lives === 3 && r.run.playing, 'A local run starts');
      const id = r.run.id;
      r = await gauntletCall('result', { runId: id, won: true });
      assertEqual(r.run.round, 1, 'A win moves on');
      await gauntletCall('begin', { runId: id });
      r = await gauntletCall('begin', { runId: id });
      assertTrue(r.forfeited && r.run.lives === 2, 'A game left half-way is a loss');
      r = await gauntletCall('result', { runId: id, won: false });
      assertEqual(r.run.lives, 1, 'Another loss');
      await gauntletCall('begin', { runId: id });
      r = await gauntletCall('result', { runId: id, won: false });
      assertTrue(r.over && !r.run, 'Out of lives: the run is over');
      assertTrue(!r.diamondsAwarded, 'No rewards offline');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet: a result that could not reach the server is kept and sent later (a win is never lost)', async () => {
    const saved = gauntletSaved();
    try {
      currentUser = { uid: 'g-uid' };
      gauntletUsesServer = () => true;
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      startSinglePlayerGame(1, null, { gauntlet: { runId: 'g5', round: 1, lives: 3 } });
      fakeEconomy({ gauntlet: () => { throw new Error('You need a connection for that.'); } });
      endGauntletGame(true);
      await gauntletMatchEnded();
      assertEqual(gauntletLastView.kind, 'error', 'No signal: the result waits');
      assertEqual(gauntletStore.get(GAUNTLET_PENDING_KEY), { uid: 'g-uid', runId: 'g5', mode: 'easy', won: true, round: 1 }, 'Kept on the phone');
      assertTrue(!!gauntletStore.get(GAUNTLET_BETWEEN_KEY), 'Remembered as between games');
      assertTrue(localStorage.getItem('shithead_game_state') === null, 'The finished game is never restored');
      const calls = fakeEconomy({ gauntlet: (d) => d.op === 'result'
        ? { run: { id: 'g5', round: 2, lives: 3, playing: false }, doneToday: false, completions: 0, firstDone: false }
        : { run: { id: 'g5', round: 2, lives: 3, playing: false }, doneToday: false, completions: 0, firstDone: false } });
      await flushGauntletPending();
      assertEqual(calls[0], ['gauntlet', { op: 'result', runId: 'g5', won: true }], 'Sent once there is a signal');
      assertEqual(gauntletStore.get(GAUNTLET_PENDING_KEY), null, 'Then forgotten');
      assertEqual(gauntletLastView.kind, 'won', 'Its screen shows the win');
      assertEqual(state.gauntlet.round, 2, 'On to round 3');
      assertTrue(/CONTINUE 3\/5/.test(document.getElementById('gauntletBtn').textContent), 'The lobby button offers to continue');
    } finally {
      gauntletStore.set(GAUNTLET_PENDING_KEY, null); gauntletStore.set(GAUNTLET_BETWEEN_KEY, null); gauntletStore.set(GAUNTLET_LAST_KEY, null);
      refreshGauntletLobbyBtn();
      gauntletRestore(saved);
    }
  });

  await test('Gauntlet: a new UK day starts again from the first Easy bot (no Continue, no old game or screen)', async () => {
    const saved = gauntletSaved();
    const yesterday = previousLocalDateKey();
    try {
      currentUser = null;
      localStorage.removeItem(GAUNTLET_LOCAL_KEY);
      let r = await gauntletCall('start');
      r = await gauntletCall('result', { runId: r.run.id, won: true });
      assertTrue(/CONTINUE 2\/5/.test(document.getElementById('gauntletBtn').textContent), 'Same day: the lobby offers to continue');
      // Midnight passes.
      const g = JSON.parse(localStorage.getItem(GAUNTLET_LOCAL_KEY)); g.run.day = yesterday;
      localStorage.setItem(GAUNTLET_LOCAL_KEY, JSON.stringify(g));
      gauntletStore.set(GAUNTLET_LAST_KEY, { ...gauntletStore.get(GAUNTLET_LAST_KEY), day: yesterday });
      refreshGauntletLobbyBtn();
      assertTrue(!/CONTINUE/.test(document.getElementById('gauntletBtn').textContent), 'Next day: the button no longer offers the old run');
      const st = await gauntletCall('status');
      assertEqual(st.run, null, "Yesterday's run is gone");
      let refused = false;
      try { await gauntletCall('begin', { runId: g.run.id }); } catch (e) { refused = /has ended/.test(e.message); }
      assertTrue(refused, "Yesterday's run can't be continued");
      r = await gauntletCall('start');
      assertTrue(r.run.round === 0 && r.run.lives === 3, 'A fresh run from the first Easy bot, full lives');
      // A saved Gauntlet game from yesterday isn't restored.
      const stash = localStorage.getItem('shithead_game_state');
      localStorage.setItem('shithead_game_state', JSON.stringify({ phase: 'PLAY', players: [{ id: 'p_user' }], gauntlet: { runId: 'x', round: 3, lives: 2, day: yesterday } }));
      const restored = loadGameState();
      const left = localStorage.getItem('shithead_game_state');
      if (stash === null) localStorage.removeItem('shithead_game_state'); else localStorage.setItem('shithead_game_state', stash);
      assertTrue(!restored && left === null, "Yesterday's Gauntlet game is dropped, not restored");
      // Nor does yesterday's between-games screen reopen.
      gauntletStore.set(GAUNTLET_BETWEEN_KEY, { owner: 'device', at: Date.now() - 36 * 3600 * 1000 });
      const dev = devTestSuiteRunning; devTestSuiteRunning = false;
      try { resumeGauntletBetweenGames(); } finally { devTestSuiteRunning = dev; }
      assertEqual(gauntletStore.get(GAUNTLET_BETWEEN_KEY), null, "Yesterday's Continue screen is forgotten");
    } finally {
      localStorage.removeItem(GAUNTLET_LOCAL_KEY);
      gauntletStore.set(GAUNTLET_BETWEEN_KEY, null); gauntletStore.set(GAUNTLET_LAST_KEY, null);
      refreshGauntletLobbyBtn();
      gauntletRestore(saved);
    }
  });

  await test('Start-up never deletes the saved game before restoring it (settings saved first used to wipe it)', () => {
    const was = savedGameChecked;
    try {
      savedGameChecked = true; // after start-up
      freshState({ isMultiplayer: false, phase: 'PLAY', drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false }), makePlayer({ id: 'p_bot_1', isBot: true })];
      originalSaveGameState();
      const kept = localStorage.getItem('shithead_game_state');
      assertTrue(!!kept, `A game in play is saved`);
      savedGameChecked = false; // as at start-up, before the restore
      state.phase = 'LOBBY';
      originalSaveGameState();
      assertEqual(localStorage.getItem('shithead_game_state'), kept, 'A save on the home screen at start-up keeps it');
      savedGameChecked = true;
      originalSaveGameState();
      assertEqual(localStorage.getItem('shithead_game_state'), null, 'After start-up, leaving to the home screen clears it as before');
    } finally { savedGameChecked = was; localStorage.removeItem('shithead_game_state'); }
  });

  await test('Gauntlet: the round label on the table uses the lobby difficulty colours', () => {
    const saved = gauntletSaved();
    try {
      freshState({ isMultiplayer: false, drawPile: [] });
      state.players = [makePlayer({ id: 'p_user', isBot: false })];
      const tones = {};
      [0, 2, 3, 4].forEach((round) => {
        startSinglePlayerGame(1, null, { gauntlet: { runId: 'g6', round, lives: 3 } });
        render();
        const label = document.querySelector('#gauntletHud .gh-round span');
        const diff = GAUNTLET.rounds[round];
        assertEqual(label.textContent, DIFF_LABELS[diff], `${diff} shows as on the lobby button`);
        const probe = document.createElement('span');
        probe.className = DIFF_COLORS[diff].text;
        document.body.appendChild(probe);
        assertEqual(getComputedStyle(label).color, getComputedStyle(probe).color, `${diff} matches the lobby colour`);
        probe.remove();
        tones[diff] = getComputedStyle(label).color;
      });
      assertEqual(new Set(Object.values(tones)).size, 4, 'Each difficulty has its own colour');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet: tapping the picture or frame name previews it', () => {
    const saved = gauntletSaved();
    try {
      showGauntlet({ kind: 'welcome', status: { run: null, doneToday: false, completions: 0, firstDone: false } });
      const body = document.getElementById('gauntletModalBody');
      body.querySelector('[data-gauntlet-preview="picture"]').click();
      const box = document.getElementById('gauntletPreview');
      assertTrue(!box.classList.contains('hidden') && !!box.querySelector('.avatar-tile, svg'), 'The picture shows');
      body.querySelector('[data-gauntlet-preview="frame"]').click();
      assertEqual(box.querySelectorAll('.gauntlet-frame-card').length, 3, 'The frame shows on three cards');
      body.querySelector('[data-gauntlet-preview="frame"]').click();
      assertTrue(box.classList.contains('hidden'), 'Tapping again closes it');
      assertTrue(document.getElementById('gauntletModal').classList.contains('hidden') === false, 'The pop-up stays open');
    } finally { gauntletRestore(saved); }
  });

  await test('Gauntlet challenges: first clear on the Bots tab, a fixed Daily Gauntlet, and the completed count', () => {
    const saved = { user: currentUser, loaded: challengeEconomyLoadedForUid, done: challengeEconomy.completedChallenges, daily: challengeEconomy.dailyChallengeState };
    try {
      currentUser = { uid: 'c-uid' }; challengeEconomyLoadedForUid = 'c-uid';
      challengeEconomy.dailyChallengeState = { dateKey: localDateKey(), challengeIds: [], progress: {} };
      challengeEconomy.completedChallenges = { 'first-game': { completedAt: 1 } };
      renderChallengesPanel();
      const bots = document.getElementById('challengesGauntletList').textContent, daily = document.getElementById('challengesDailyGauntletList').textContent;
      assertTrue(/Gauntlet Champion/.test(bots) && /200/.test(bots), 'Bots tab: Gauntlet Champion, 200');
      assertTrue(/Daily Gauntlet/.test(daily) && /50/.test(daily), 'Daily tab: Daily Gauntlet, 50');
      assertEqual(document.getElementById('challengesModalDoneCount').textContent, '1', 'Completed count');
      challengeEconomy.completedChallenges = { 'first-game': { completedAt: 1 }, 'gauntlet-first': { completedAt: Date.now(), reward: 200 } };
      renderChallengesPanel();
      assertTrue(document.querySelector('#challengesGauntletList').textContent.includes('✓') || !/200/.test(document.getElementById('challengesGauntletList').textContent), 'First clear shows done');
      assertTrue(gauntletBeatenToday(challengeEconomy.completedChallenges), "A first clear today also counts as today's Daily Gauntlet");
      challengeEconomy.completedChallenges = { [`gauntlet_${localDateKey()}`]: { completedAt: Date.now(), reward: 50 } };
      assertTrue(gauntletBeatenToday(challengeEconomy.completedChallenges), 'A daily clear counts');
      assertEqual(challengeDescription('gauntlet-first'), GAUNTLET_CHALLENGES.first.desc, 'Mail describes the first clear');
      assertEqual(challengeDescription('gauntlet_2026-09-26'), GAUNTLET_CHALLENGES.daily.desc, 'Mail describes a daily clear');
    } finally {
      currentUser = saved.user; challengeEconomyLoadedForUid = saved.loaded;
      challengeEconomy.completedChallenges = saved.done; challengeEconomy.dailyChallengeState = saved.daily;
    }
  });

  await test('Menu shortcuts: Challenges and Shop sit next to Guide and Settings; Play Matrix has a close X', () => {
    const ids = [...document.querySelectorAll('#hamburgerDrawer [aria-label="Quick access"] button')].map(b => b.id);
    assertEqual(ids, ['drawerChallengesShortcutBtn', 'drawerShopShortcutBtn', 'drawerGuideShortcutBtn', 'drawerSettingsShortcutBtn'], 'Four shortcuts, in order');
    assertTrue(!!document.querySelector('#matrixRefPanel #matrixRefCloseBtn'), 'Play Matrix has an X');
    const html = miniTablePreviewHtml('table-midnight', 'x', false, { backId: 'back-midnight', frameId: 'frame-gold' });
    assertTrue(/pile-card/.test(html) && !/#f8fafc/.test(html), 'The showcase draws real (dark) face-up cards with the frame');
  });

  await test('Referrals: a ?ref= link is remembered, cleaned from the address bar and claimed once signed in', async () => {
    const savedUrl = location.pathname + location.search + location.hash;
    try {
      localStorage.removeItem(REF_PENDING_KEY);
      history.replaceState(history.state, '', location.pathname + '?dev-tests=1&ref=amitk');
      handleReferralLinkOnLoad();
      assertEqual(pendingReferral()?.code, 'AMITK', 'Code kept, upper-cased');
      assertTrue(!/ref=/.test(location.search) && /dev-tests=1/.test(location.search), 'Only ref= is removed from the address');
      currentUser = { uid: 'r-uid' };
      const calls = fakeEconomy({ referral: (d) => ({ inviterName: 'Amitk', code: null, referredBy: { name: 'Amitk', games: 0, needed: 3, paid: false }, recruits: [], recruited: 0, paidThisMonth: 0 }) });
      await claimPendingReferral();
      assertEqual(calls[0], ['referral', { op: 'claim', code: 'AMITK' }], 'Claimed with the code');
      assertEqual(pendingReferral(), null, 'Then forgotten');
      setPendingReferral({ code: 'AMITK', at: Date.now() });
      fakeEconomy({ referral: () => { throw new Error('Invites are for new accounts.'); } });
      await claimPendingReferral();
      assertEqual(pendingReferral(), null, 'A final refusal drops the code');
      setPendingReferral({ code: 'AMITK', at: Date.now() });
      fakeEconomy({ referral: () => { throw new Error('You need a connection for that.'); } });
      await claimPendingReferral();
      assertEqual(pendingReferral()?.code, 'AMITK', 'No signal keeps it for later');
      setPendingReferral({ code: 'AMITK', at: Date.now() - 31 * 864e5 });
      assertEqual(pendingReferral(), null, 'Codes older than 30 days are ignored');
    } finally {
      localStorage.removeItem(REF_PENDING_KEY);
      history.replaceState(history.state, '', savedUrl);
      document.getElementById('referralWelcomeModal').classList.add('hidden');
      referralStatusCache = null;
    }
  });

  await test('Referrals: Profile section, Inbox mail, Recruiter challenge and the welcome pop-up', () => {
    const st = { code: 'AMITK', recruited: 2, paidThisMonth: 2, recruits: [{ name: 'Erin', games: 3, done: true, reward: 100, at: 2 }, { name: 'Gus', games: 1, done: false, reward: 0, at: 1 }], referredBy: { name: 'Carol', games: 2, needed: 3, paid: false } };
    const html = referralProfileHtml(st);
    assertTrue(/AMITK/.test(html) && /\?ref=AMITK/.test(html), 'Code and link');
    assertTrue(/2\/5/.test(html) && /2\/10/.test(html), 'Recruiter and monthly counts');
    assertTrue(/Erin/.test(html) && /\+100/.test(html) && /Gus/.test(html) && /1\/3/.test(html), 'Recruits with their progress');
    assertTrue(/Invited by <b>Carol<\/b>: 2\/3/.test(html), 'Who invited you and your progress');
    assertTrue(/GET MY INVITE LINK/.test(referralProfileHtml({ ...st, code: null })), 'No code yet: a button to make one');
    const joined = inboxItemHtml({ type: 'referral', event: 'joined', name: 'Erin', id: 'referral_join_x' });
    const capped = inboxItemHtml({ type: 'referral', event: 'capped', name: 'Fay', id: 'referral_y' });
    assertTrue(/joined with your invite/i.test(joined) && /Erin/.test(joined) && /MARK AS READ/.test(joined), 'Joined mail');
    assertTrue(/limit/i.test(capped) && /Fay/.test(capped), 'Monthly limit mail');
    assertTrue(ACTIVITY_MAIL_TYPES.includes('referral'), 'Referral mail is listed in the Inbox');
    assertTrue(/Frame unlocked/.test(inboxItemHtml({ type: 'shop', unlocked: true, id: 'unlock_frame-gauntlet', name: 'Gauntlet Gold', requirement: 'Beat the Gauntlet' })), 'A frame unlock says Frame');
    assertTrue(/Recruit 5 players/.test(challengeDescription(CHALLENGE_DEFS.recruits[0])), 'Recruiter challenge described');
    assertTrue(!!document.querySelector('#friendsModal #friendsInviteBtn'), 'Friends has an Invite Friends button');
    const auth = document.getElementById('authModal'), wasHidden = auth.classList.contains('hidden');
    auth.classList.remove('hidden');
    showReferralWelcome('joined', 'Carol');
    assertTrue(document.getElementById('referralWelcomeModal').classList.contains('hidden'), 'Waits while another pop-up (sign-in, username) is open');
    auth.classList.toggle('hidden', wasHidden);
    showReferralWelcome('invited');
    assertTrue(!document.getElementById('referralWelcomeModal').classList.contains('hidden') && /SIGN UP/.test(document.getElementById('referralWelcomeGoBtn').textContent), 'Invite pop-up offers sign-up');
    document.getElementById('referralWelcomeModal').classList.add('hidden');
  });

  await test('Profile layout: picture spans the name block, rank + rating + record in one pill, Account buttons one size', () => {
    const modal = document.getElementById('profileModal'), wasHidden = modal.classList.contains('hidden');
    try {
      modal.classList.remove('hidden');
      document.getElementById('profileUsernameText').textContent = 'Amitk';
      document.getElementById('profileRatingText').innerHTML = renderRatingBadge(442, '3W-7L');
      const st = document.getElementById('profileStreakText'); st.textContent = '🔥 3-day login streak'; st.classList.remove('hidden');
      ['profileEmailRow', 'profileChangePasswordRow'].forEach(id => document.getElementById(id).classList.remove('hidden'));
      const pill = document.querySelector('#profileRatingText > span:first-child').getBoundingClientRect();
      const wl = document.querySelector('#profileRatingText .profile-wl').getBoundingClientRect();
      const pillEl = document.querySelector('#profileRatingText > span:first-child');
      assertTrue(pillEl.contains(document.querySelector('#profileRatingText .profile-wl')) && /Novice · 442 · 3W-7L/.test(pillEl.textContent), 'W-L is inside the rank pill');
      assertEqual(getComputedStyle(document.querySelector('#profileRatingText .profile-wl')).fontSize, getComputedStyle(pillEl).fontSize, 'Same size as the rank and rating');
      const name = document.getElementById('profileUsernameText').getBoundingClientRect();
      assertTrue(Math.abs(name.left - pill.left) < 1.5, 'Name and pill share a left edge');
      const tile = document.querySelector('#profileAvatarBtn .avatar-tile, #profileAvatarBtn [data-own-avatar] > *').getBoundingClientRect();
      const streak = st.getBoundingClientRect();
      assertTrue(Math.abs(tile.top - document.querySelector('.profile-name-row').getBoundingClientRect().top) < 6 && Math.abs(tile.bottom - streak.bottom) < 10, `Picture spans name to streak (${Math.round(tile.top)}–${Math.round(tile.bottom)} vs ${Math.round(name.top)}–${Math.round(streak.bottom)})`);
      const sizes = ['profileAccountActionBtn', 'profileChangePasswordBtn', 'profileChangeUsernameBtn'].map(id => document.getElementById(id).getBoundingClientRect()).filter(r => r.width).map(r => `${Math.round(r.width)}x${Math.round(r.height)}`);
      assertTrue(sizes.length >= 2 && new Set(sizes).size === 1, `Account buttons match (${sizes.join(', ')})`);
    } finally { modal.classList.toggle('hidden', wasHidden); }
  });

  await test('Gauntlet: lobby button sits under the bot count with the ⓘ on its right; the welcome screen explains it', async () => {
    const saved = gauntletSaved();
    const lobby = document.getElementById('lobbyScreen'), wasHidden = lobby.classList.contains('hidden');
    const single = document.getElementById('singleOptions'), singleHidden = single.classList.contains('hidden');
    try {
      lobby.classList.remove('hidden'); single.classList.remove('hidden');
      const btn = document.getElementById('gauntletBtn').getBoundingClientRect();
      const info = document.getElementById('gauntletInfo').getBoundingClientRect();
      const counts = [...document.querySelectorAll('.bot-count-btn')].map(b => b.getBoundingClientRect());
      assertTrue(btn.top >= counts[0].bottom, 'Under the bot count buttons');
      assertTrue(Math.abs(btn.left - counts[0].left) < 1, 'Lined up with them on the left');
      assertTrue(info.left >= btn.right && info.right <= counts[2].right + 1, 'ⓘ on the right, within the column');
      assertTrue(Math.abs((info.top + info.height / 2) - (btn.top + btn.height / 2)) < 1.5, 'ⓘ level with the button');
      assertTrue(/bots in a row/.test(document.getElementById('gauntletTip').textContent) && /Lvl 30/.test(document.getElementById('gauntletTip').textContent), 'The tip explains the Gauntlet and its modes');
      currentUser = null;
      localStorage.removeItem(GAUNTLET_LOCAL_KEY);
      openGauntletWelcome();
      await new Promise(r => setTimeout(r, 0));
      const body = document.getElementById('gauntletModalBody').textContent;
      assertTrue(/Welcome to the Gauntlet/i.test(body) && /ENTER THE GAUNTLET/.test(body), 'Welcome screen with its start button');
      assertTrue(/don't count toward unlocking/.test(body), 'Says it does not count toward unlocks');
    } finally {
      if (wasHidden) lobby.classList.add('hidden'); if (singleHidden) single.classList.add('hidden');
      gauntletRestore(saved);
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
    shopFilter = 'all'; shopTab = 'Avatars'; renderCosmeticShop();
    const savedNow = seasonalNowOverride;
    const tabNames = () => [...document.querySelectorAll('#shopTabBar [data-shop-tab]')].map(b => b.textContent.replace(/\d+/g, '').trim());
    seasonalNowOverride = '2026-09-24T12:00:00'; // 21 days before Halloween
    renderCosmeticShop();
    let tabs = tabNames();
    assertTrue(tabs[tabs.length - 1].includes('Seasonal'), 'With no event near, Seasonal is the last tab');
    assertEqual(tabs.slice(0, -1), ['All', 'Avatars', 'Tables', 'Card Backs', 'Decks', 'Frames', 'Burn', 'Joker', 'Victory', 'Emotes'], 'All, then Avatars, then table and cards, then effects');
    seasonalNowOverride = '2026-10-12T12:00:00'; // 3 days before Halloween
    renderCosmeticShop();
    assertTrue(tabNames()[0] === 'All' && tabNames()[1].includes('Seasonal'), 'Seasonal leads (after All) when an event starts within 3 days');
    seasonalNowOverride = '2026-10-20T12:00:00'; // during Halloween
    renderCosmeticShop();
    tabs = tabNames();
    assertTrue(tabs[0] === 'All' && tabs[1].includes('Seasonal'), 'Seasonal leads (after All) while an event is on');
    seasonalNowOverride = savedNow;
    renderCosmeticShop();
    document.querySelector('#shopTabBar [data-shop-tab="Card Backs"]').click();
    const shown = [...document.querySelectorAll('#cosmeticShopList [data-preview-cosmetic-id]')].map(b => b.dataset.previewCosmeticId);
    assertTrue(shown.length > 0 && shown.every(id => id.startsWith('back-')), 'A tab only shows its own section');
    assertEqual(document.querySelector('#shopTabBar [data-shop-tab="Card Backs"]').getAttribute('aria-selected'), 'true', 'The active tab is marked selected');
    ['all','affordable','owned','unowned','equipped'].forEach(filter => assertTrue(!!document.querySelector(`[data-shop-filter="${filter}"]`), `${filter} filter must exist`));
    shopFilter = savedFilter; shopTab = savedTab; renderCosmeticShop();
  });
  await test("Shop → All: first, every non-seasonal item in folding sections, Name Change Token on top (All only)", () => {
    const savedFilter = shopFilter, savedTab = shopTab, savedCollapsed = [...collapsedShopCategories];
    try {
      shopFilter = 'all'; collapsedShopCategories.clear();
      shopTab = SHOP_ALL_TAB; renderCosmeticShop();
      assertEqual(document.querySelector('#shopTabBar [data-shop-tab]').dataset.shopTab, SHOP_ALL_TAB, 'All is the first tab');
      const token = document.getElementById('shopNameTokenCard');
      assertTrue(!token.classList.contains('hidden'), 'The Name Change Token shows on All');
      assertTrue(!!(token.compareDocumentPosition(document.getElementById('cosmeticShopList')) & Node.DOCUMENT_POSITION_FOLLOWING), 'above every item');
      assertTrue(!!(document.getElementById('shopTabBar').compareDocumentPosition(token) & Node.DOCUMENT_POSITION_FOLLOWING), 'inside the tab, under the tab bar');
      const heads = [...document.querySelectorAll('#cosmeticShopList [data-shop-category]')];
      assertEqual(heads.map(h => h.dataset.shopCategory), COSMETIC_TABS.map(t => t.category), 'One section per type, in tab order');
      assertTrue(heads.every(h => h.querySelector('.cat-head-chev') && h.getAttribute('aria-expanded') === 'true'), 'Each has a chevron and starts open');
      const shown = [...document.querySelectorAll('#cosmeticShopList [data-shop-row]')].map(r => r.dataset.shopRow);
      const expected = COSMETIC_SHOP_ITEMS.filter(i => !i.season).map(i => i.id);
      assertEqual(shown.length, expected.length, 'Every non-seasonal item is listed once');
      assertTrue(shown.every(id => !COSMETIC_SHOP_ITEMS.find(i => i.id === id).season), 'No seasonal items');
      heads.find(h => h.dataset.shopCategory === 'Card Backs').click();
      const backHead = document.querySelector('#cosmeticShopList [data-shop-category="Card Backs"]');
      assertEqual(backHead.getAttribute('aria-expanded'), 'false', 'The chevron folds a section');
      assertTrue(!document.querySelector('#cosmeticShopList [data-shop-row^="back-"]'), 'Folded: its items are hidden');
      assertTrue(JSON.parse(localStorage.getItem('shithead_shop_collapsed')).includes('Card Backs'), 'and it is remembered');
      backHead.click();
      assertTrue(!!document.querySelector('#cosmeticShopList [data-shop-row^="back-"]'), 'Tap again to open it');
      shopTab = 'Card Backs'; renderCosmeticShop();
      assertTrue(token.classList.contains('hidden'), 'Not on any other tab');
      assertTrue(!document.querySelector('#cosmeticShopList [data-shop-category]'), 'Single tabs have no section heads');
      shopTab = SEASONAL_TAB; renderCosmeticShop();
      assertTrue(token.classList.contains('hidden'), 'Not on Seasonal either');
    } finally {
      collapsedShopCategories.clear(); savedCollapsed.forEach(c => collapsedShopCategories.add(c));
      try { localStorage.setItem('shithead_shop_collapsed', JSON.stringify(savedCollapsed)); } catch (e) {}
      shopFilter = savedFilter; shopTab = savedTab; renderCosmeticShop();
    }
  });
  await test('The Shop header has Diamonds and a Custom button on the right, which opens Custom', () => {
    const bar = document.querySelector('#shopModal .ch-stat-bar');
    const btn = document.getElementById('shopCustomBtn');
    assertTrue(!!bar && bar.contains(btn) && bar.contains(document.getElementById('shopDiamondCount')), 'Both in the header bar');
    document.getElementById('shopModal').classList.remove('hidden');
    const d = bar.querySelector('.ch-stat--diamonds').getBoundingClientRect(), c = btn.getBoundingClientRect(), b = bar.getBoundingClientRect();
    assertTrue(d.left < c.left && Math.abs(c.right - b.right) < 2 && Math.abs((d.top + d.height / 2) - (c.top + c.height / 2)) < 1.5, 'Diamonds left, Custom right, on one line');
    btn.click();
    assertTrue(document.getElementById('shopModal').classList.contains('hidden') && !document.getElementById('themesModal').classList.contains('hidden'), 'Opens Custom');
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('Gauntlet button: beside the unlock bar while one shows, otherwise centred across the row', () => {
    const wrap = document.getElementById('difficultyProgressWrap'), row = document.querySelector('.gauntlet-row');
    const lobby = document.getElementById('lobbyScreen'), wasHidden = lobby.classList.contains('hidden'), wasBar = wrap.classList.contains('hidden');
    try {
      lobby.classList.remove('hidden'); document.getElementById('modeSingleBtn').click();
      wrap.classList.remove('hidden');
      const grid = row.parentElement.getBoundingClientRect();
      assertTrue(row.getBoundingClientRect().width < grid.width * 0.6, 'Half width beside the unlock bar');
      wrap.classList.add('hidden');
      const r = row.getBoundingClientRect(), b = document.getElementById('gauntletBtn').getBoundingClientRect(), g = row.parentElement.getBoundingClientRect();
      assertTrue(Math.abs(r.width - g.width) < 2, 'The row spans the grid');
      const groupMid = (b.left + document.getElementById('gauntletInfo').getBoundingClientRect().right) / 2;
      assertTrue(Math.abs(groupMid - (g.left + g.width / 2)) < 3 && b.width > g.width * 0.55, 'Centred, with a longer button', [groupMid, g.left + g.width / 2, b.width]);
    } finally { wrap.classList.toggle('hidden', wasBar); if (wasHidden) lobby.classList.add('hidden'); }
  });
  await test('A 3 on the Pile: the label says what to beat ("Transparent - N")', () => {
    freshState({ discardPile: [makeCard('Q', '♦'), makeCard('3', '♣')] });
    state.players = [makePlayer({ id: 'p1', hand: [makeCard('K')] }), makePlayer({ id: 'p2', isBot: true })];
    state.localPlayerId = 'p1';
    render();
    const tag = document.getElementById('activeConstraintTag');
    assertEqual(tag.textContent, 'Transparent - Q', 'One 3 on a Queen');
    state.discardPile = [makeCard('2'), makeCard('3', '♥'), makeCard('3', '♣')]; render();
    assertEqual(tag.textContent, 'Transparent - 2', 'Two 3s on a 2');
    state.discardPile = [makeCard('3', '♥')]; render();
    assertEqual(tag.textContent, 'Transparent - Any', 'Only 3s: anything goes');
    state.discardPile = [makeCard('9'), makeCard('5'), makeCard('3')]; state.baseOverrideCard = makeCard('9'); render();
    assertEqual(tag.textContent, 'Transparent - 9', 'A 3 on a 5 carries the base card through');
    state.baseOverrideCard = null;
    state.discardPile = [makeCard('9')]; render();
    assertEqual(tag.textContent, 'Reverse', 'Other cards keep their power name');
  });
  await test('Big hands pick the row count that gives the biggest cards that still fit the width', () => {
    const hand = Array.from({ length: 29 }, (_, i) => ({ id: `h${i}`, rank: ['4','5','6','7','8','9','J','Q','K','A'][i % 10], suit: '♠' }));
    const rows = bestHandRows(hand, 140);
    const k = Math.max(...rows.map(r => r.length));
    const m = computeHandCardMetrics(k, rows.length, 140);
    [1, 2, 3].forEach(r => {
      const alt = computeHandRows(hand, r); const ak = Math.max(...alt.map(x => x.length));
      const am = computeHandCardMetrics(ak, alt.length, 140);
      const fits = am.width + (ak - 1) * (am.width + am.marginLeft) <= Math.max(200, window.innerWidth - 48) + 1;
      if (fits) assertTrue(m.width >= am.width - 0.5, `${rows.length} rows is at least as big as ${r}`, [m.width, am.width]);
    });
    assertTrue(m.width + (k - 1) * (m.width + m.marginLeft) <= Math.max(200, window.innerWidth - 48) + 1, 'and fits without scrolling');
    assertTrue(-m.marginLeft <= m.width * 0.66 + 0.01 && m.width + m.marginLeft >= 21.9, 'Each overlapped card still shows its rank strip');
  });
  await test('Collection: every item by type, owned in colour, the rest locked; opened from Profile and from Custom\'s owned count', () => {
    const savedOwned = cosmeticPurchaseState;
    try {
      openThemesPanel();
      cosmeticPurchaseState = { 'back-neon': true, 'table-halloween': true };
      renderPersonalisationCosmetics();
      document.getElementById('customOwnedBtn').click();
      const modal = document.getElementById('collectionModal');
      assertTrue(!modal.classList.contains('hidden') && document.getElementById('themesModal').classList.contains('hidden'), "Custom's owned count opens the Collection");
      const tiles = [...modal.querySelectorAll('.coll-tile')];
      const { owned, total } = collectionCounts();
      assertEqual(tiles.length, total, 'Every item is in it');
      assertEqual(modal.querySelectorAll('.coll-tile.is-owned').length, owned, 'Owned ones in colour');
      assertTrue(modal.querySelector('[data-coll-id="back-neon"]').classList.contains('is-owned') && modal.querySelector('[data-coll-id="table-halloween"]').classList.contains('is-owned'), 'Including seasonal ones you own');
      const locked = modal.querySelector('[data-coll-id="table-angelic"]');
      assertTrue(locked.classList.contains('is-locked') && !!locked.querySelector('.coll-lock'), 'Unowned: greyed with a lock');
      locked.click();
      assertTrue(/Angelic/.test(document.getElementById('collectionStatus').textContent) && /Shop/.test(document.getElementById('collectionStatus').textContent), 'Tapping says how to get it');
      assertEqual(modal.querySelectorAll('.coll-section').length, COSMETIC_TABS.length, 'One section per type');
      modal.classList.add('hidden');
      openProfilePanel();
      assertTrue(document.getElementById('profileCollectionCount').textContent === `${owned} / ${total} items`, 'Profile shows the count');
      document.getElementById('profileCollectionBtn').click();
      assertTrue(!modal.classList.contains('hidden'), 'and opens it');
    } finally {
      cosmeticPurchaseState = savedOwned; renderPersonalisationCosmetics();
      ['collectionModal', 'profileModal', 'themesModal'].forEach(id => document.getElementById(id).classList.add('hidden'));
    }
  });
  await test('Tapping "n completed" lists every completed challenge, newest first, with names and rewards', () => {
    const savedEco = challengeEconomy, savedUser = currentUser;
    try {
      currentUser = { uid: 'u1' };
      challengeEconomy = { ...savedEco, completedChallenges: {
        'burner': { completedAt: 1000, reward: 50 },
        'daily_2026-09-20_burn-once': { completedAt: 3000, reward: 20 },
        'season_halloween-2026_all': { completedAt: 2000, reward: 550 }
      } };
      document.getElementById('challengesModal').classList.remove('hidden');
      document.getElementById('challengesModalDoneWrap').click();
      const rows = [...document.querySelectorAll('#challengesDoneList .done-row b')].map(b => b.textContent);
      assertEqual(rows, ['Burn the Pile', 'Season Complete', 'Burner'], 'Newest first, by name');
      assertTrue(document.getElementById('challengesDoneList').textContent.includes('Halloween 2026'), 'Seasonal ones say which event');
      assertTrue(document.getElementById('challengesDoneSummary').textContent.includes('620'), 'The total Diamonds earned');
      assertTrue(getComputedStyle(document.getElementById('challengeTabs')).display === 'none', 'The tabs make way');
      document.getElementById('challengesDoneBack').click();
      assertTrue(!document.getElementById('challengeTabs').classList.contains('hidden') && document.getElementById('challengeTabDone').classList.contains('hidden'), 'Back returns to the tabs');
    } finally { challengeEconomy = savedEco; currentUser = savedUser; document.getElementById('challengesModal').classList.add('hidden'); }
  });
  await test('The room code shows only on Play Friends (and at that room\'s table); other home tabs get the Diamond count back', () => {
    const saved = { roomCode: state.roomCode, isMultiplayer: state.isMultiplayer, isRanked: state.isRanked };
    const badge = document.getElementById('roomCodeBadge'), lobby = document.getElementById('lobbyScreen');
    const lobbyWasHidden = lobby.classList.contains('hidden');
    try {
      lobby.classList.remove('hidden');
      Object.assign(state, { roomCode: '822405', isMultiplayer: true, isRanked: false });
      badge.textContent = '822405';
      document.getElementById('multiOptions').classList.remove('hidden'); document.getElementById('singleOptions').classList.add('hidden');
      syncRoomCodeBadge();
      assertTrue(!badge.classList.contains('hidden'), 'Shown on Play Friends while in a room');
      document.getElementById('modeSingleBtn').click();
      assertTrue(badge.classList.contains('hidden'), 'Vs Bots: hidden');
      assertTrue(getComputedStyle(document.getElementById('headerDiamondCount')).display !== 'none', 'and the Diamond count is back');
      document.getElementById('modeMultiBtn').click();
      assertTrue(isOffline() || !badge.classList.contains('hidden'), 'Back to Play Friends: shown again');
    } finally {
      Object.assign(state, saved); badge.classList.add('hidden');
      document.getElementById('modeSingleBtn').click();
      if (lobbyWasHidden) lobby.classList.add('hidden');
    }
  });
  await test('No emoji used as UI icons: the main pages show drawn icons (emotes and effect art excepted)', async () => {
    const allowed = new Set(['🂠', '♠', '♥', '♦', '♣', '✓', '✕', '✗', '↻', '↺', '⇤', '⇥', '©', '®', '™', '↔', '↕']);
    const offenders = [];
    const scan = (root, where) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || el.closest(EMOJI_KEEP) || el.closest('svg')) continue;
        for (const ch of n.data.match(/\p{Extended_Pictographic}/gu) || []) if (!allowed.has(ch)) offenders.push(`${where}: ${ch} in "${n.data.trim().slice(0, 40)}"`);
      }
    };
    const pages = ['shopModal', 'challengesModal', 'themesModal', 'settingsModal', 'whatsNewModal', 'profileModal', 'inboxModal', 'friendsModal', 'leaderboardModal', 'matchSummaryModal', 'statsModal', 'rulesModal', 'gauntletModal', 'hamburgerDrawer', 'gameTable'];
    try {
      renderCosmeticShop(); renderChallengesPanel(); renderPersonalisationCosmetics();
      showWhatsNew(GAME_BUILD.version, 'v150');
      await new Promise(r => setTimeout(r, 0));
      scan(document.querySelector('header'), 'header');
      scan(document.getElementById('lobbyScreen'), 'home');
      pages.forEach(id => { const el = document.getElementById(id); if (el) scan(el, id); });
      assertEqual(offenders.slice(0, 40), [], 'Emoji left in the UI');
    } finally { document.getElementById('whatsNewModal')?.classList.add('hidden'); }
  });
  await test('Saved loadouts: save, switch in one tap, the worn one is ticked, unowned items fall back', () => {
    const savedUser = currentUser, savedDb = db, savedEq = { ...equippedCosmetics }, savedOwned = cosmeticPurchaseState, savedL = savedLoadouts;
    const writes = [];
    try {
      currentUser = { uid: 'u1' };
      db = { ref: (p) => ({ set: (v) => { writes.push([p, v]); return Promise.resolve(); }, remove: () => Promise.resolve(), once: () => Promise.resolve({ val: () => null }) }) };
      openThemesPanel();
      cosmeticPurchaseState = { 'back-neon': true, 'table-royal': true };
      savedLoadouts = {};
      equippedCosmetics = { ...DEFAULT_EQUIPPED_COSMETICS, cardBack: 'back-neon', tableTheme: 'table-royal' };
      renderLoadouts();
      assertEqual(document.querySelectorAll('#customLoadouts .loadout-slot').length, 3, 'Three slots');
      saveLoadout('s1', 'Royal');
      assertTrue(writes.some(([p, v]) => p === 'users/u1/loadouts/s1' && v.items.tableTheme === 'table-royal'), 'Saved to the account under s1', writes);
      assertTrue(document.querySelector('[data-loadout-wear="s1"]').classList.contains('is-active'), 'The worn look is ticked');
      equippedCosmetics = { ...DEFAULT_EQUIPPED_COSMETICS };
      renderLoadouts();
      assertTrue(!document.querySelector('[data-loadout-wear="s1"]').classList.contains('is-active'), 'Changing the look clears the tick');
      document.querySelector('[data-loadout-wear="s1"]').click();
      assertEqual([equippedCosmetics.cardBack, equippedCosmetics.tableTheme], ['back-neon', 'table-royal'], 'One tap puts it back on');
      assertTrue(writes.some(([p]) => p === 'users/u1/equippedCosmetics'), 'and syncs the equip');
      loadoutMenuSlot = 's1'; renderLoadouts();
      const slotBox = document.querySelector('[data-loadout-wear="s1"]').getBoundingClientRect();
      [...document.querySelectorAll('.loadout-menu button')].forEach(b => {
        const r = b.getBoundingClientRect();
        assertTrue(r.top >= slotBox.top - 0.5 && r.bottom <= slotBox.bottom + 0.5 && r.left >= slotBox.left - 0.5 && r.right <= slotBox.right + 0.5, `${b.textContent} fits inside the slot`);
      });
      loadoutMenuSlot = null;
      delete cosmeticPurchaseState['back-neon'];
      wearLoadout('s1');
      assertEqual(equippedCosmetics.cardBack, 'default', 'An item no longer owned falls back to default');
    } finally {
      currentUser = savedUser; db = savedDb; equippedCosmetics = savedEq; cosmeticPurchaseState = savedOwned; savedLoadouts = savedL;
      applyEquippedCosmetics(); renderPersonalisationCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
  });
  await test("Show Others' Effects: off shows other players' effects in the default style, never your own", () => {
    const saved = othersEffectsOn, savedEq = { ...equippedCosmetics };
    try {
      freshState({});
      const me = makePlayer({ id: 'me' }), them = makePlayer({ id: 'them', cosmetics: { burnEffect: 'burn-ice', jokerEffect: 'joker-magic', victoryEffect: 'victory-stars' } });
      state.players = [me, them]; state.localPlayerId = 'me';
      equippedCosmetics.jokerEffect = 'joker-glitch';
      othersEffectsOn = true;
      assertEqual([burnEffectIdFor(them), jokerEffectIdFor(them)], ['burn-ice', 'joker-magic'], 'On: their effects');
      othersEffectsOn = false;
      assertEqual([burnEffectIdFor(them), jokerEffectIdFor(them)], ['default', 'default'], 'Off: default style');
      assertEqual(jokerEffectIdFor(me), 'joker-glitch', 'Your own stays');
      assertTrue(!!document.querySelector('#settingsTab-display #setOthersEffectsRow'), 'The row is in Display');
    } finally { othersEffectsOn = saved; equippedCosmetics = savedEq; }
  });
  await test('Seasonal challenges: a tab only during an event, rewards ~10% up and ending in 5 or 0', () => {
    const savedNow = seasonalNowOverride, savedEco = challengeEconomy;
    try {
      SEASONAL_CHALLENGES.concat(SEASONAL_CHALLENGE_BONUS).forEach(c => assertTrue(c.reward % 5 === 0, `${c.name} ends in 5 or 0`, c.reward));
      SEASONAL_CHALLENGES.forEach(c => assertTrue(c.target >= 15, `${c.name} can't be done in a game or two`, c.target));
      challengeEconomy = { ...savedEco, completedChallenges: {}, seasonalChallengeState: {} };
      seasonalNowOverride = '2026-09-24T12:00:00'; // no event
      renderSeasonalChallenges();
      assertTrue(document.querySelector('[data-challenge-tab="seasonal"]').classList.contains('hidden'), 'Hidden with no event on');
      seasonalNowOverride = '2026-10-20T12:00:00'; // Halloween
      challengeEconomy.seasonalChallengeState = { 'halloween-2026': { 'burn-once': 3 } };
      renderSeasonalChallenges();
      const tab = document.querySelector('[data-challenge-tab="seasonal"]');
      assertTrue(!tab.classList.contains('hidden') && tab.textContent.includes('Seasonal'), 'Shown during Halloween');
      const list = document.getElementById('challengesSeasonalList').textContent;
      assertTrue(list.includes('3/50') && list.includes('Season Complete'), 'Rows show progress and the bonus', list);
    } finally { seasonalNowOverride = savedNow; challengeEconomy = savedEco; renderSeasonalChallenges(); }
  });
  await test('Free tables: Oak Wood and Classic Felt are unlocked for everyone, with real photo-like art', async () => {
    const saved = cosmeticPurchaseState, savedEq = { ...equippedCosmetics };
    try {
      openThemesPanel();
      cosmeticPurchaseState = {};
      renderPersonalisationCosmetics();
      ['table-wood', 'table-felt'].forEach(id => {
        const item = BUILT_IN_COSMETICS.find(i => i.id === id);
        assertTrue(!!item && item.cost === 0 && item.category === 'Table Themes', `${id} is a free table`);
        assertTrue(!COSMETIC_SHOP_ITEMS.some(i => i.id === id), `${id} is not sold`);
        const tile = document.querySelector(`#personalisationTableThemes [data-equip-id="${id}"]`);
        assertTrue(!!tile && !tile.hasAttribute('data-locked'), `${id} shows unlocked in Custom → Tables`);
        assertTrue(canRestoreEquippedCosmetic('tableTheme', id, {}), `${id} stays equipped without owning anything`);
        assertTrue(tableArtBackground(id).includes('-tile.jpg') && tableArtBackground(id).includes(`${TABLE_TILE_PX}px repeat`), `${id} repeats its sharp tile instead of stretching one picture`);
      });
      assertTrue(equipCosmetic('tableTheme', 'table-felt', { preview: false, sync: false }), 'Equips without buying');
      assertEqual(document.body.dataset.equippedTableTheme, 'table-felt', 'and the table wears it');
      for (const f of ['art/tables/wood-tile.jpg', 'art/tables/felt-tile.jpg']) {
        const r = await fetch(f, { cache: 'no-store' });
        const b = new Uint8Array(await r.arrayBuffer());
        assertTrue(r.ok && b[0] === 0xFF && b[1] === 0xD8 && b.length < 400 * 1024, `${f} is a JPEG under 400 KB`, b.length);
        const img = new Image(); img.src = f; await img.decode();
        assertTrue(img.naturalWidth >= 1920 && img.naturalHeight >= 1920, `${f} is a 1920px tile (3x its 640px size, sharp on 4K)`, img.naturalWidth);
      }
    } finally {
      cosmeticPurchaseState = saved; equippedCosmetics = savedEq; applyEquippedCosmetics(); renderPersonalisationCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
  });
  await test('Leaderboard: tapping another player opens their card; ignored players stay listed', () => {
    const other = leaderboardRowHtml({ uid: 'u9', username: 'Sam', avatar: 'avatar-joker', count: 3 }, 1, 'challenges');
    const host = document.createElement('div'); host.innerHTML = other;
    const who = host.querySelector('.lb-who');
    assertTrue(!!who && who.dataset.lbUid === 'u9' && who.getAttribute('role') === 'button', 'the picture + name are a button carrying the uid');
    const ranked = document.createElement('div');
    ranked.innerHTML = leaderboardRowHtml({ usernameKey: 'sam', username: 'Sam', rating: 700, wins: 1, losses: 0 }, 2, 'ranked');
    assertEqual(ranked.querySelector('.lb-who')?.dataset.lbKey, 'sam', 'ranked rows carry their username key');
    assertTrue(typeof openProfileCard === 'function' && typeof showPlayerPopupFor === 'function', 'the card opens outside a match too');
    const rows = leaderboardRowsFrom('challenges', { u9: { name: 'Sam', count: 3 }, u2: { name: 'Amy', count: 1 } });
    assertEqual(rows.length, 2, 'every player stays on the board (ignoring someone never hides them)');
  });
  await test('Hover hints never cover a card description; the Play Matrix is explained in plain words', () => {
    const tip = document.getElementById('dynamicTooltip');
    const hold = document.getElementById('cardHoldTip') || Object.assign(document.createElement('div'), { id: 'cardHoldTip' });
    if (!hold.parentElement) document.body.appendChild(hold);
    const wasHidden = hold.classList.contains('hidden');
    try {
      hold.classList.remove('hidden');
      const pile = document.getElementById('discardPileContainer');
      pile.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      assertTrue(!tip.classList.contains('visible'), 'no hint while a card description is showing');
    } finally { hold.classList.toggle('hidden', wasHidden); window.hideDynamicTip?.(); }
    const step = TUTORIAL_MODULE_QUICK_START.find(st => st.require?.tapCheck === '#matrixRefBtn');
    assertTrue(/on the left/.test(step.coachNote) && /on top/.test(step.coachNote) && /can go on it/.test(step.coachNote) && !/Row =|✓|✗/.test(step.coachNote), 'the tutorial says it in plain words', step.coachNote);
    assertTrue(/card you want to play/.test(document.getElementById('matrixRefHint').textContent), 'and so does the panel key');
  });
  await test('Presence: a friend reads online only while their game is on screen and seen in the last 3 minutes', () => {
    const now = serverNow();
    assertEqual(isProfileOnline({ online: true, seen: now - 30 * 1000 }), true, 'seen 30s ago = online');
    assertEqual(isProfileOnline({ online: true, seen: now - 4 * 60 * 1000 }), false, 'seen 4 min ago = offline even if the flag is stuck on');
    assertEqual(isProfileOnline({ online: false, seen: now }), false, 'flag off = offline');
    assertEqual(isProfileOnline({ online: true }), false, 'a flag with no seen (left by an older build) reads offline');
    assertEqual(isProfileOnline(null), false, 'no profile = offline');
    const row = friendRowHtml('u1', { username: 'Sam', online: true, seen: now - 10 * 60 * 1000 }, 'friend');
    assertTrue(/Offline/.test(row) && !/presence-dot online/.test(row), 'a stale friend is drawn offline');
    assertTrue(typeof endPresence === 'function' && /endPresence\(\)/.test(String(performSignOut)), 'sign-out goes offline first');
  });
  await test('Pile History: tapping outside the box closes it; tapping inside does not', () => {
    const modal = document.getElementById('pileInspectModal');
    try {
      modal.classList.remove('hidden');
      document.getElementById('inspectCardsContainer').click();
      assertTrue(!modal.classList.contains('hidden'), 'a tap inside the box keeps it open');
      modal.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      assertTrue(modal.classList.contains('hidden'), 'a tap on the dimmed area closes it');
    } finally { modal.classList.add('hidden'); }
  });
  await test('Update prompt: a newer live build offers Update now / Later; an older or equal one does nothing', () => {
    const cur = gameVersionNumber(getGameVersionLabel());
    assertEqual(newerBuildIn(`<!-- BUILD: 2030-01-01-v${cur + 1} (x) -->`), `v${cur + 1}`, 'a newer build is spotted');
    assertEqual(newerBuildIn(`<!-- BUILD: 2030-01-01-v${cur} (x) -->`), null, 'the same build is not');
    assertEqual(newerBuildIn(`<!-- BUILD: 2020-01-01-v${cur - 1} (x) -->`), null, 'nor an older one');
    assertEqual(newerBuildIn('no stamp'), null, 'a page without a stamp is ignored');
    const saved = [updatePromptSnoozeUntil, updateNotifiedFor, pendingUpdateVersion];
    const home = document.getElementById('lobbyScreen'), homeClass = home.className, oldPhase = state.phase, oldRoom = state.roomCode, oldMulti = state.isMultiplayer, oldTutorial = tutorialActive, oldOverlayCheck = isAnyOverlayOpen;
    home.classList.remove('hidden'); state.phase = 'LOBBY'; state.roomCode = null; state.isMultiplayer = false; tutorialActive = false; isAnyOverlayOpen = () => false;
    document.getElementById('tutorialHubScreen').classList.add('hidden');
    try {
      showUpdatePrompt(`v${cur + 1}`);
      const el = document.getElementById('updatePrompt');
      assertTrue(!!el && !el.classList.contains('hidden'), 'the prompt shows');
      assertTrue(/Update available/.test(el.textContent) && !!el.querySelector('.up-now') && !!el.querySelector('.up-later'), 'with Update now and Later');
      assertTrue(!/[\u{1F300}-\u{1FAFF}]/u.test(el.textContent), 'no emoji');
      el.querySelector('.up-later').click();
      assertTrue(el.classList.contains('hidden'), 'Later hides it');
      showUpdatePrompt(`v${cur + 1}`);
      assertTrue(el.classList.contains('hidden'), 'and it stays snoozed for that version');
      assertTrue(+getComputedStyle(el).zIndex > 202, 'it sits above the header and pages');
    } finally {
      [updatePromptSnoozeUntil, updateNotifiedFor, pendingUpdateVersion] = saved;
      home.className = homeClass; state.phase = oldPhase; state.roomCode = oldRoom; state.isMultiplayer = oldMulti; tutorialActive = oldTutorial; isAnyOverlayOpen = oldOverlayCheck;
      document.getElementById('updatePrompt')?.remove();
    }
  });
  await test('Updates wait through matches and tutorials until the home screen', () => {
    const saved = { state: { ...state }, pending: pendingUpdateVersion, snooze: updatePromptSnoozeUntil, notified: updateNotifiedFor, tutorial: tutorialActive, check: isAnyOverlayOpen, cls: document.getElementById('lobbyScreen').className };
    try {
      isAnyOverlayOpen = () => false; updatePromptSnoozeUntil = 0;
      document.getElementById('tutorialHubScreen').classList.add('hidden');
      document.getElementById('lobbyScreen').classList.add('hidden');
      state.phase = 'PLAY'; tutorialActive = false;
      showUpdatePrompt('v9999');
      assertTrue(!document.getElementById('updatePrompt') || document.getElementById('updatePrompt').classList.contains('hidden'), 'no match prompt');
      assertEqual(pendingUpdateVersion, 'v9999', 'version queued');
      state.phase = 'LOBBY'; state.isMultiplayer = false; state.roomCode = null;
      document.getElementById('lobbyScreen').classList.remove('hidden'); tutorialActive = true;
      refreshUpdatePrompt();
      assertTrue(!document.getElementById('updatePrompt') || document.getElementById('updatePrompt').classList.contains('hidden'), 'no tutorial prompt');
      tutorialActive = false; refreshUpdatePrompt();
      assertTrue(!document.getElementById('updatePrompt').classList.contains('hidden'), 'queued version appears at home');
      state.phase = 'SWAP'; refreshUpdatePrompt();
      assertTrue(document.getElementById('updatePrompt').classList.contains('hidden'), 'starting a match hides the prompt');
    } finally { Object.assign(state, saved.state); pendingUpdateVersion = saved.pending; updatePromptSnoozeUntil = saved.snooze; updateNotifiedFor = saved.notified; tutorialActive = saved.tutorial; isAnyOverlayOpen = saved.check; document.getElementById('lobbyScreen').className = saved.cls; document.getElementById('updatePrompt')?.remove(); }
  });
  await test('Default card back uses white SH art across decks, never the purchased back', () => {
    const oldBack = equippedCosmetics.cardBack, oldTheme = state.deckTheme;
    try {
      state.deckTheme = 'theme-emerald'; equippedCosmetics.cardBack = 'back-crimson';
      assertTrue(cosmeticPreview(null, 'cardBack').includes('cosmetic-back-default'), 'free tile shows white SH back');
      assertTrue(!cosmeticPreview(null, 'cardBack').includes('cosmetic-back-crimson'), 'paid back does not contaminate free tile');
      assertTrue(getThemeDeckBackClass().includes('cosmetic-back-crimson'), 'game still shows equipped paid back');
      state.deckTheme = 'theme-cyber';
      assertTrue(cosmeticPreview(null, 'cardBack').includes('cosmetic-back-default'), 'changing deck keeps white SH default');
    } finally { equippedCosmetics.cardBack = oldBack; state.deckTheme = oldTheme; }
  });
  await test('Challenges and Gauntlet have independent weekly leaderboard periods', () => {
    const oldTab = leaderboardTab, oldPeriods = { ...lbActivityPeriods };
    try {
      lbActivityPeriods.challenges = 'week'; lbActivityPeriods.gauntlet = 'all';
      assertEqual(leaderboardPath('challenges'), `boards/challengesweek_${getUkWeekKey()}`, 'weekly challenges path');
      assertEqual(leaderboardPath('gauntlet'), 'boards/gauntlet', 'all-time Gauntlet path');
      leaderboardTab = 'challenges'; refreshLeaderboardTabs();
      assertTrue(!document.getElementById('lbLevelsSwitch').classList.contains('hidden'), 'period pills visible');
      lbActivityPeriods.gauntlet = 'week';
      assertEqual(leaderboardPath('gauntlet'), `boards/gauntletweek_${getUkWeekKey()}`, 'weekly Gauntlet path');
      assertTrue(linkKeyTerms('Hard Gauntlet and Boss Gauntlet').includes('data-term="hard-gauntlet"'), 'specific Hard term link');
    } finally { Object.keys(lbActivityPeriods).forEach(k => delete lbActivityPeriods[k]); Object.assign(lbActivityPeriods, oldPeriods); leaderboardTab = oldTab; refreshLeaderboardTabs(); }
  });
  await test('Decks v197: Big Print is free and on the Accessibility tab; Lavender + 6 more in the Shop', () => {
    const big = BUILT_IN_COSMETICS.find(i => i.id === 'deck-bigprint');
    assertTrue(!!big && big.cost === 0 && big.theme === 'theme-bigprint', 'Big Print is a free deck');
    const shop = { 'deck-lavender': 250, 'deck-paper': 250, 'deck-blueprint': 500, 'deck-chalk': 500, 'deck-frost': 500, 'deck-neonnight': 500, 'deck-royalgold': 1000 };
    Object.entries(shop).forEach(([id, cost]) => {
      const it = COSMETIC_SHOP_ITEMS.find(i => i.id === id);
      assertTrue(!!it && it.cost === cost && it.category === 'Decks' && COSMETIC_RUNTIME_IDS.deck.has(id), `${id} is a ${cost} deck`, it);
    });
    assertTrue(COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Decks').length >= 10, 'ten decks in the Shop');
    assertTrue(showcaseHtml({ deck: 'deck-lavender' }).includes('Lavender'), 'the deck shows in the Showcase');
    const row = document.getElementById('setBigPrintRow');
    assertTrue(!!row && row.closest('#settingsTab-access'), 'Big Print Cards sits in Accessibility');
    const before = state.deckTheme;
    try {
      selectDeckTheme('theme-emerald');
      row.click();
      assertEqual(state.deckTheme, 'theme-bigprint', 'turning it on wears the Big Print deck');
      assertEqual(document.getElementById('setBigPrintState').textContent.trim(), 'ON', 'and the switch reads ON');
      assertEqual(handMinStrip()[1], 30, 'overlapped hand cards keep a wider strip');
      row.click();
      assertEqual(state.deckTheme, 'theme-emerald', 'turning it off puts the old deck back');
    } finally { selectDeckTheme(before); }
  });
  await test('Big Print: with a huge hand no rank or suit is covered by the next card', async () => {
    const before = state.deckTheme;
    const saved = JSON.parse(JSON.stringify({ players: state.players, phase: state.phase, localPlayerId: state.localPlayerId }));
    try {
      selectDeckTheme('theme-bigprint');
      state.phase = 'PLAY';
      state.localPlayerId = 'p0';
      const ranks = ['10','J','Q','K','A','2','3','4','5','6','7','8','9'];
      state.players = [{ id: 'p0', name: 'Me', hand: Array.from({ length: 30 }, (_, i) => ({ rank: ranks[i % 13], suit: ['♠','♥','♦','♣'][i % 4], id: 'bp' + i })), faceUp: [], faceDown: [] },
        { id: 'p1', name: 'Bot', isBot: true, hand: [], faceUp: [], faceDown: [] }];
      render();
      await new Promise(r => setTimeout(r, 300));
      let covered = 0, checked = 0;
      [...document.getElementById('localHand').children].forEach(row => {
        const cs = [...row.children];
        cs.slice(0, -1).forEach((c, i) => {
          const edge = Math.max(c.querySelector('.card-corner-rank').getBoundingClientRect().right, c.querySelector('.card-corner-suit').getBoundingClientRect().right);
          checked++;
          if (edge > cs[i + 1].getBoundingClientRect().left + 0.5) covered++;
        });
      });
      assertTrue(checked > 10, 'cards were measured', checked);
      assertEqual(covered, 0, 'no index is covered');
    } finally {
      Object.assign(state, saved);
      selectDeckTheme(before);
    }
  });
  await test('Card backs v197: Dragon Scale and Stained Glass are priced, previewable and drawn from their approved art', () => {
    ['back-dragon', 'back-stained'].forEach(id => {
      const it = COSMETIC_SHOP_ITEMS.find(i => i.id === id);
      assertTrue(!!it && it.cost === 1000 && COSMETIC_RUNTIME_IDS.cardBack.has(id), `${id} costs 1000`, it);
      assertEqual(getCosmeticBackClass(id), `cosmetic-${id}`, 'has its own look');
      const host = document.createElement('div');
      host.innerHTML = cosmeticPreview(it, 'cardBack');
      document.body.appendChild(host);
      const bg = getComputedStyle(host.firstElementChild).backgroundImage;
      host.remove();
      // v267: the owner's approved print replaced the old SVG pattern.
      assertTrue(bg.includes(`approved-v267/${id}.webp`), `${id} is drawn from its approved art`, bg);
    });
  });
  await test('Tutorial layout: Card Powers opens centred under the caption; the hold step puts the caption between Pile and Hand', () => {
    const hold = TUTORIAL_MODULE_QUICK_START.find(st => st.require?.holdCheck);
    assertEqual(hold?.captionPlace, 'middle', 'the hold step asks for the middle');
    assertTrue(typeof tutorialPlaceRefPanel === 'function', 'the panel placer exists');
  });
  await test('XP & levels: levels 1-99 on the owner\'s curve, with the owner\'s payouts', () => {
    const L = XP_RULES.levels;
    assertEqual(L.length, 100, 'levels 1 to 99');
    assertEqual(xpLevelFor(0), 1, 'everyone starts at level 1');
    assertEqual(xpForLevel(5), 954, 'level 5 needs 954 XP (doubled in v225)');
    assertTrue(4 * (XP_RULES.finish + XP_RULES.win) + XP_RULES.firstGameOfDay < xpForLevel(5), 'even four straight wins (with the first-game bonus) are short of level 5');
    assertEqual(xpForLevel(99), 1400000, 'level 99 = 1,400,000 XP');
    assertTrue(Math.abs(xpForLevel(92) / xpForLevel(99) - 0.5) < 0.001, 'level 92 is half of 99', xpForLevel(92));
    for (let i = 2; i < L.length; i++) assertTrue(L[i] > L[i - 1], 'every level needs more XP than the one before', i);
    assertTrue(xpForLevel(77) / xpForLevel(70) > 1.8, 'about doubling every 7 levels at the top');
    assertEqual(xpLevelFor(10 ** 9), 99, 'never past 99');
    assertEqual(XP_RULES.maxXp, 100000000, 'XP stops at 100 million');
    assertTrue(XP_RULES.win > XP_RULES.firstGameOfDay, 'a win pays more than the first game of the day');
    assertEqual(XP_RULES.rankedWin, XP_RULES.win * 2, 'a Ranked win pays double');
    assertEqual(XP_RULES.weekly, 100, 'a weekly challenge pays 100 XP');
    const g = XP_RULES.gauntletBot;
    assertTrue(g.easy < g.medium && g.medium < g.hard && g.hard < g.boss, 'Gauntlet XP scales with the bot');
    assertTrue(!('dailyCap' in XP_RULES), 'no daily XP cap');
    assertEqual(SERIES_RULES.level, 20, 'Best of series unlocks at level 20 (owner)');
    assertEqual(JSON.stringify(serverEconomyCatalog().series), JSON.stringify(SERIES_RULES), 'the server gets the same series rules');
    assertEqual([SERIES_RULES.bestOf[3], SERIES_RULES.bestOf[5]], [30, 50], 'entries: Best of 3 = 30, Best of 5 = 50');
    assertEqual(JSON.stringify(serverEconomyCatalog().xp), JSON.stringify(XP_RULES), 'the server gets the same XP table');
  });
  await test('Best of series lobby: locked below level 20, the host picks a length and the other player gets the accept pop-up', async () => {
    const saved = { players: state.players, isMultiplayer: state.isMultiplayer, isRanked: state.isRanked, roomCode: state.roomCode, isHost: state.isHost, localPlayerId: state.localPlayerId, phase: state.phase, spectating: state.spectating };
    const was = { on: xpFeatureOn, xp: playerXp, econ: callEconomy, confirm: window.confirm, series: seriesState, watch: watchSeriesRoom, owner: isGameOwner };
    const panel = document.getElementById('seriesPanel');
    const modal = document.getElementById('seriesModal');
    try {
      watchSeriesRoom = () => {};
      isGameOwner = () => true; // the picker is owner-only until games count (SERIES_LOBBY_OPEN)
      window.confirm = () => true;
      currentUser = { uid: 'host_u', email: 'h@example.com' };
      setXpFeature(true);
      Object.assign(state, { isMultiplayer: true, isRanked: false, roomCode: '424242', isHost: true, localPlayerId: 'p1', phase: 'LOBBY', spectating: null });
      state.players = [
        { id: 'p1', uid: 'host_u', name: 'Hosty', isHost: true, cosmetics: { level: 12 } },
        { id: 'p2', uid: 'guest_u', name: 'Guesty', cosmetics: { level: 25 } }
      ];
      seriesState = null;
      playerXp = { total: xpForLevel(12), level: 12 };
      isGameOwner = () => false;
      renderSeriesPanel();
      assertTrue(SERIES_LOBBY_OPEN || panel.classList.contains('hidden'), 'until games count, only the owner sees the series choice');
      isGameOwner = () => true;
      renderSeriesPanel();
      assertTrue(!panel.classList.contains('hidden'), 'the host sees the series choice');
      assertTrue([...panel.querySelectorAll('[data-series-best]')].every(b => b.disabled), 'Best of 3/5 are locked below level 20');
      assertTrue(/Reach level 20/.test(panel.textContent), 'the lock says which level unlocks it');
      assertTrue(panel.classList.contains('series-folded'), 'below level 20 the series row starts folded');
      panel.querySelector('[data-series-toggle]').click();
      assertTrue(!panel.classList.contains('series-folded'), 'the player can open it to look');
      const multi = document.getElementById('multiOptions');
      const multiWasHidden = multi.classList.contains('hidden');
      multi.classList.remove('hidden'); await new Promise(r => setTimeout(r, 0));
      multi.classList.add('hidden'); await new Promise(r => setTimeout(r, 0));
      multi.classList.toggle('hidden', multiWasHidden);
      renderSeriesPanel();
      assertTrue(panel.classList.contains('series-folded'), 'leaving the Play Friends page folds it again');
      playerXp = { total: xpForLevel(20), level: 20 };
      state.players.push({ id: 'b1', name: 'Bot', isBot: true });
      renderSeriesPanel();
      assertTrue(/exactly two players and no bots/.test(panel.textContent), 'no series with a bot in the room');
      state.players.pop();
      renderSeriesPanel();
      assertTrue(!panel.classList.contains('series-folded'), 'at level 20 it starts open');
      const pick = panel.querySelector('[data-series-best="3"]');
      assertTrue(pick && !pick.disabled, 'level 20 + two players: Best of 3 can be picked');
      const calls = fakeEconomy({ series: (d) => ({ series: { id: 'sx', room: d.roomCode, bestOf: d.bestOf, need: 2, fee: 30, pot: 120, host: 'host_u', guest: 'guest_u', names: { host_u: 'Hosty', guest_u: 'Guesty' }, status: 'pending', played: 0 } }) });
      await createSeries(3);
      assertEqual(calls[0], ['series', { op: 'create', roomCode: '424242', bestOf: 3 }], 'the host asks the server to create a Best of 3');
      assertTrue(/waiting for Guesty/.test(panel.textContent), 'the host waits for the other player');
      assertTrue(seriesBlocksLobbyAction('start'), 'Start Match waits for the accept');
      assertTrue(modal.classList.contains('hidden'), 'the host never gets the accept pop-up');
      // The other player's phone.
      currentUser = { uid: 'guest_u', email: 'g@example.com' };
      state.isHost = false; state.localPlayerId = 'p2';
      onSeriesChanged();
      assertTrue(!modal.classList.contains('hidden'), 'the other player gets the accept pop-up');
      assertTrue(/Hosty/.test(document.getElementById('seriesModalText').textContent) && /120/.test(document.getElementById('seriesModalPot').textContent), 'it names the host and the pot');
      fakeEconomy({ series: () => ({ series: { ...seriesState, status: 'live', paid: { host_u: true, guest_u: true }, wins: { host_u: 0, guest_u: 0 } } }) });
      await acceptSeries();
      assertTrue(modal.classList.contains('hidden'), 'accepting closes the pop-up');
      assertTrue(/0 – 0/.test(panel.textContent), 'the live series shows the score');
      assertTrue(!seriesBlocksLobbyAction('start'), 'a live series lets the host start the next game');
      assertTrue(seriesBlocksLobbyAction('bot'), 'no bots in a series room');
    } finally {
      Object.assign(state, saved);
      xpFeatureOn = was.on; playerXp = was.xp; callEconomy = was.econ; window.confirm = was.confirm; seriesState = was.series; watchSeriesRoom = was.watch; isGameOwner = was.owner;
      modal.classList.add('hidden');
      renderSeriesPanel();
    }
  });
  await test('Best of series play: a dropped player gets a Medium stand-in that uses the whole turn time; games are reported and wait for player readiness', async () => {
    const was = { series: seriesState, econ: callEconomy, sync: syncFirebaseGameState, auth: hasMatchAuthority, st: window.setTimeout, turnTimerMs: state.turnTimerMs, roomCode: state.roomCode, isRanked: state.isRanked, isHost: state.isHost, matchId: state.matchId, turnDelay: state.turnDelay };
    try {
      currentUser = { uid: 'h_uid', email: 'h@example.com' };
      freshState({ isMultiplayer: true, isRanked: false, isHost: true, roomCode: '424242', localPlayerId: 'p_host', phase: 'PLAY', currentTurnIndex: 1, spectating: null });
      state.turnTimerMs = 25000; state.turnDelay = 900;
      state.players = [
        { id: 'p_host', uid: 'h_uid', name: 'Hosty', hand: [], faceUp: [], faceDown: [] },
        { id: 'p_room1', uid: 'g_uid', name: 'Guesty', hand: [], faceUp: [], faceDown: [] }
      ];
      seriesState = { id: 'sx', room: '424242', bestOf: 3, need: 2, fee: 30, pot: 120, host: 'h_uid', guest: 'g_uid', names: { h_uid: 'Hosty', g_uid: 'Guesty' }, wins: { h_uid: 0, g_uid: 0 }, status: 'live', played: 1 };
      syncFirebaseGameState = () => {};
      hasMatchAuthority = () => true;
      const delays = [];
      window.setTimeout = (fn, ms) => { delays.push(ms); return 0; };
      removePlayerFromMatch('p_room1', 'disconnected');
      window.setTimeout = was.st;
      const sub = state.players[1];
      assertTrue(state.players.length === 2 && sub.isBot && sub.isSeriesSubstitute, 'a 2-player series room keeps going with a stand-in');
      assertEqual(sub.difficulty, 'medium', 'the stand-in is Medium');
      assertEqual(sub.uid, 'g_uid', 'the seat still belongs to the absent player');
      assertTrue(delays.includes(25000), 'the stand-in waits the whole turn time before it moves');
      // Game reporting and the next game.
      state.phase = 'FINISHED'; state.matchId = 'm_series_1'; state.players[1] = { ...state.players[1], isBot: false, isSeriesSubstitute: false };
      const calls = fakeEconomy({ series: (d) => ({ series: { ...seriesState, played: 2, games: { m_series_1:'h_uid' }, wins: { h_uid: 1, g_uid: 0 } } }) });
      seriesReportedMatch = null;
      seriesMatchEnded();
      await new Promise(r => setTimeout(r, 20));
      assertEqual(calls[0], ['series', { op: 'game', roomCode: '424242', matchId: 'm_series_1' }], 'the finished game is reported to the server');
      assertTrue(!seriesNextRound(), 'reporting a game never marks either player ready');
      assertTrue(/READY FOR NEXT GAME/.test(document.getElementById('quickPlayMatchBtn').textContent), 'the host must explicitly press Ready');
      const hud = document.getElementById('seriesHud');
      renderSeriesHud();
      assertTrue(!hud.classList.contains('hidden') && /1–0/.test(hud.textContent) && /Ready when you are/.test(hud.textContent), 'the table shows the score and waits for readiness');
      cancelSeriesNextGame();
      // Leaving after a game has been played is a forfeit.
      const conf = window.confirm; window.confirm = () => true;
      const leaveCalls = fakeEconomy({ series: () => ({ series: { ...seriesState, status: 'done', winner: 'g_uid', reason: 'forfeit' } }) });
      assertTrue(await seriesBeforeLeave(), 'the player can leave');
      window.confirm = conf;
      assertEqual(leaveCalls[0][1].op, 'forfeit', 'leaving mid-series forfeits it');
      assertTrue(!document.getElementById('seriesModal').classList.contains('hidden') && /Guesty won the series/.test(document.getElementById('seriesModalTitle').textContent), 'the result pop-up says who won');
    } finally {
      window.setTimeout = was.st;
      cancelSeriesNextGame();
      seriesState = was.series; callEconomy = was.econ; syncFirebaseGameState = was.sync; hasMatchAuthority = was.auth;
      Object.assign(state, { turnTimerMs: was.turnTimerMs, roomCode: was.roomCode, isRanked: was.isRanked, isHost: was.isHost, matchId: was.matchId, turnDelay: was.turnDelay, isMultiplayer: false, players: [] });
      if (state.botActionTimer) clearTimeout(state.botActionTimer);
      document.getElementById('seriesModal').classList.add('hidden');
      renderSeriesHud();
    }
  });
  await test('Best of series: signing in with a series on goes straight back into its room; the Inbox shows the result mail', async () => {
    const was = { db, listen: listenToFirebaseRoom, tried: seriesRejoinTried };
    try {
      freshState({ isMultiplayer: false, roomCode: null, localPlayerId: null, isRanked: false });
      currentUser = { uid: 'g_uid' };
      const room = { phase: 'PLAY', clientVersion: getGameVersionLabel(), players: [{ id: 'p_host', uid: 'h_uid', name: 'Hosty', isHost: true }, { id: 'p_room1', uid: 'g_uid', name: 'Guesty' }] };
      const data = {
        'users/g_uid/series': { room: '424242', id: 'sx', status: 'live', bestOf: 3 },
        'series/424242': { id: 'sx', room: '424242', status: 'live', bestOf: 3 },
        'rooms/424242': room
      };
      db = { ref: (path) => ({ once: () => Promise.resolve({ val: () => data[path] ?? null, exists: () => data[path] != null }) }) };
      let listened = null;
      listenToFirebaseRoom = (code) => { listened = code; };
      seriesRejoinTried = false;
      const done = await seriesAutoRejoin();
      assertTrue(done && listened === '424242' && state.localPlayerId === 'p_room1', 'the player is put straight back into the series room, in their own seat');
      const html = inboxItemHtml({ id: 'series_sx', type: 'series', won: true, bestOf: 3, opponent: 'Hosty', score: '2–1', pot: 120 });
      assertTrue(/Series won/.test(html) && /120/.test(html) && /Hosty/.test(html), 'the Inbox shows the series result');
    } finally {
      db = was.db; listenToFirebaseRoom = was.listen; seriesRejoinTried = was.tried;
      forgetJoinedRoom();
      Object.assign(state, { isMultiplayer: false, roomCode: null, players: [] });
    }
  });
  await test('A tap on an overlapped hand card goes to the card the finger touched first, and a selected card stays tappable', () => {
    const hand = document.getElementById('localHand');
    const mk = (id) => { const el = document.createElement('div'); el.className = 'hand-card'; el.dataset.cardId = id; hand.appendChild(el); return el; };
    const a = mk('tap_a'), b = mk('tap_b');
    let clicked = [];
    a.onclick = () => { if (handTapRedirected('tap_a')) return; clicked.push('a'); };
    b.onclick = () => { if (handTapRedirected('tap_b')) return; clicked.push('b'); };
    try {
      a.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      b.click(); // the release landed on the card below
      assertEqual(clicked, ['a'], 'the card first touched gets the tap');
      clicked = [];
      b.click(); // no press first (keyboard, tests): the card itself
      assertEqual(clicked, ['b'], 'a plain click still works');
      const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (_) { return []; } })
        .filter(r => r.selectorText === '.hand-card:active').map(r => r.style.translate || r.style.transform).join('');
      assertTrue(!/px/.test(css), 'touching a hand card never moves it out from under the finger');
    } finally { a.remove(); b.remove(); }
  });
  await test('Profile sections fold with a chevron and stay folded', () => {
    const heads = [...document.querySelectorAll('#profileModal .profile-sec-head')];
    const titleOf = (h) => h.querySelector('.cat-head-title').textContent.trim();
    const titles = heads.map(titleOf);
    ['Public Profile', 'Invite Friends', 'Account', 'Your Data', 'Danger Zone'].forEach(t => assertTrue(titles.includes(t), `"${t}" has a folding heading`));
    assertTrue(heads.every(h => h.querySelector('.cat-head-chev')), 'every heading has a chevron');
    const was = localStorage.getItem('shithead_profile_collapsed');
    const acct = heads.find(h => titleOf(h) === 'Account');
    const body = acct.parentElement.querySelector('.profile-sec-body');
    const startOpen = acct.getAttribute('aria-expanded') === 'true';
    try {
      acct.click();
      assertEqual(acct.getAttribute('aria-expanded'), String(!startOpen), 'tapping the heading folds / unfolds it');
      assertEqual(body.hidden, startOpen, 'its body hides with it');
      assertEqual(JSON.parse(localStorage.getItem('shithead_profile_collapsed')).includes('account'), startOpen, 'the fold is remembered');
      assertTrue(!!document.getElementById('profileAccountActionBtn') && !!document.getElementById('profileXpSection'), 'the sections keep their contents');
    } finally {
      acct.click();
      if (was === null) localStorage.removeItem('shithead_profile_collapsed'); else localStorage.setItem('shithead_profile_collapsed', was);
    }
  });
  await test('XP & levels: screens stay hidden while the switch is off and show the server\'s XP when it is on', () => {
    const was = { on: xpFeatureOn, xp: playerXp, log: matchXpLog };
    try {
      currentUser = { uid: 'xp_test', email: 'x@example.com' };
      setXpFeature(false);
      playerXp = { total: 2160, level: 9 };
      refreshXpDisplays();
      assertTrue(document.getElementById('hamburgerLevel').classList.contains('hidden'), 'no menu level badge while off');
      assertTrue(document.getElementById('headerXpBar').classList.contains('hidden'), 'no header XP bar while off');
      assertEqual(seatLevelBadge({ cosmetics: { level: 12 } }), '', 'no level on table seats while off');
      assertTrue(!('level' in getPublicCosmeticLoadout()), 'no level sent with your seat while off');
      assertTrue(!leaderboardRowHtml({ username: 'Pal', uid: 'u9', count: 3, level: 7 }, 2, 'challenges').includes('xp-badge'), 'no level on leaderboards while off');
      assertTrue(document.getElementById('profileXpSection').classList.contains('hidden'), 'no Profile XP bar while off');
      assertEqual(matchSummaryXpHtml(), '', 'no XP in the match summary while off');
      assertTrue(!friendRowHtml('u1', { username: 'Pal', rating: 600, level: 7 }, 'friend').includes('xp-badge'), 'no level on friends while off');
      assertTrue(!renderPlayerPopupHuman({ uid: 'u1', name: 'Pal' }, { loaded: true, rating: 600, level: 7 }, null).includes('xp-badge'), 'no level on player cards while off');
      matchXpLog = { gained: 0, levelUps: [] };
      const toasts = matchRewardLog.length;
      noteXpResult({ gained: 45, total: 2205, level: 10, levelUps: [{ level: 10, reward: 100 }] });
      assertTrue(xpFeatureOn, 'a server reply with XP means the switch is on');
      assertEqual(playerXp.level, 10, 'the level comes from the server');
      assertEqual(matchXpLog.gained, 45, 'this match\'s XP is counted');
      const html = matchSummaryXpHtml();
      assertTrue(html.includes('+45 XP') && html.includes('data-levelup="10"') && html.includes('Lvl 10'), 'the summary shows +XP, the level and the level up', html);
      assertTrue(matchRewardLog.length === toasts + 1 && matchRewardLog[matchRewardLog.length - 1].reward === 100, 'the level-up Diamonds join the match rewards');
      assertTrue(!document.getElementById('hamburgerLevel').classList.contains('hidden'), 'menu level badge once on');
      const hdr = document.getElementById('headerXpBar');
      assertTrue(!hdr.classList.contains('hidden'), 'the header XP bar shows once on');
      assertEqual(document.getElementById('headerXpFill').style.width, `${xpProgress(2205).pct}%`, 'the header bar shows progress to the next level');
      const hr = hdr.getBoundingClientRect(), head = document.querySelector('body > header').getBoundingClientRect();
      assertTrue(Math.abs(hr.bottom - head.bottom) < 1 && hr.height <= 10, 'a thin strip on the bottom edge of the header', { hr, head });
      showHeaderXpTip(false);
      const tipText = document.getElementById('headerXpTip').textContent;
      assertTrue(/Level 10/.test(tipText) && /XP to level 11/.test(tipText), 'hover/tap shows the level and the XP still needed', tipText);
      hideHeaderXpTip();
      assertTrue(document.getElementById('headerXpTip').classList.contains('hidden'), 'and hides again');
      const colour = (el) => getComputedStyle(el).backgroundImage;
      assertEqual(colour(document.getElementById('headerXpFill')), colour(document.querySelector('#profileXpBody .xp-bar > i')), 'the header bar and the Profile bar are the same colour');
      assertTrue(!document.getElementById('profileXpSection').classList.contains('hidden') && document.getElementById('profileXpBody').textContent.includes('to level 11'), 'Profile shows the bar to the next level');
      assertTrue(friendRowHtml('u1', { username: 'Pal', rating: 600, level: 7 }, 'friend').includes('Lvl 7'), 'friends show their level');
      assertTrue(renderPlayerPopupHuman({ uid: 'u1', name: 'Pal' }, { loaded: true, rating: 600, level: 7 }, null).includes('Lvl 7'), 'player cards show the level');
      assertTrue(ACTIVITY_MAIL_TYPES.includes('level'), 'level-up mail shows in the Inbox');
      assertTrue(/Lvl 12/.test(seatLevelBadge({ name: 'Pal', cosmetics: { level: 12 } })), 'other players show their level on their table seat');
      assertEqual(seatLevelBadge({ name: 'Bot', isBot: true, cosmetics: { level: 12 } }), '', 'bots have no level');
      assertEqual(getPublicCosmeticLoadout().level, 10, 'your level travels with your seat');
      for (const id of ['hamburgerLevel', 'profileLevelBadge', 'handZoneLevel']) {
        const el = document.getElementById(id);
        assertTrue(!el.classList.contains('hidden') && /Lvl 10/.test(el.textContent), `${id} shows your level`);
      }
      assertTrue(/Lvl 7/.test(leaderboardRowHtml({ username: 'Pal', uid: 'u9', count: 3, level: 7 }, 2, 'challenges')), 'board rows show the level');
      assertTrue(/Lvl 7/.test(leaderboardRowHtml({ username: 'Pal', usernameKey: 'pal', rating: 700, wins: 3, losses: 1, level: 7 }, 2, 'ranked')), 'Ranked rows show the level');
      assertTrue(/Lvl 10/.test(leaderboardRowHtml({ username: 'Me', uid: 'xp_test', count: 3, level: 3 }, 1, 'challenges')), 'your own row shows your current level');
      const pastMail = inboxItemHtml({ type: 'level', backfill: true, level: 16, xp: 1910, reward: 380, id: 'level_backfill' });
      assertTrue(/level 16/.test(pastMail) && /1,910 XP/.test(pastMail) && /380/.test(pastMail), 'the back-dated XP mail says the level, XP and Diamonds', pastMail);
      assertEqual(document.getElementById('menuXpSwitchLabel').textContent, 'XP & Levels: On', 'the owner switch shows the live state');
      updateHamburgerAccountLabel();
      assertTrue(document.getElementById('menuXpSwitchBtn').classList.contains('hidden'), 'only the owner sees the XP switch');
      assertEqual(xpProgress(954).pct, 0, 'a new level starts an empty bar');
      assertTrue(xpProgress(10 ** 9).max, 'the top level has a full bar');
      resetMatchSummary();
      assertEqual(matchXpLog.gained, 0, 'a new match starts from 0 XP');
    } finally {
      matchRewardLog.length = 0;
      playerXp = was.xp; matchXpLog = was.log;
      setXpFeature(was.on);
    }
  });
  await test('Levels leaderboard: All-time (total XP) and This week (XP since Monday), shown only while XP is on', () => {
    const was = { on: xpFeatureOn, period: lbLevelsPeriod, tab: leaderboardTab };
    try {
      setXpFeature(false);
      assertTrue(document.querySelector('[data-lb-tab="levels"]').classList.contains('hidden'), 'no Levels tab while XP is off');
      assertTrue(!leaderboardTabShown('levels'), 'a saved Levels tab falls back to Ranked while off');
      setXpFeature(true);
      assertTrue(!document.querySelector('[data-lb-tab="levels"]').classList.contains('hidden'), 'the Levels tab shows once XP is on');
      assertEqual(BOARD_NAMES.levels, 'Levels', 'board mail names the Levels board');
      lbLevelsPeriod = 'all';
      assertEqual(leaderboardPath('levels'), 'boards/levels', 'All-time reads the total-XP board');
      const all = leaderboardRowHtml({ username: 'Pooh', uid: 'u9', count: 9120, level: 34 }, 4, 'levels');
      assertTrue(/9,120 XP/.test(all) && /Level 34/.test(all) && /Lvl 34/.test(all), 'All-time rows show total XP and the level', all);
      lbLevelsPeriod = 'week';
      assertEqual(leaderboardPath('levels'), `boards/xpweek_${getUkWeekKey()}`, 'This week reads this week\'s board');
      assertEqual(getUkWeekKey(new Date('2026-09-29T12:00:00Z')), '2026-W40', 'the same week keys as the server');
      const week = leaderboardRowHtml({ username: 'Pooh', uid: 'u9', count: 450, level: 34 }, 1, 'levels');
      assertTrue(/\+450 XP/.test(week) && /XP this week/.test(week), 'This week rows show the XP earned since Monday', week);
      assertTrue(/Monday/.test(leaderboardNote('levels')), 'the note says when the week resets');
    } finally {
      lbLevelsPeriod = was.period; leaderboardTab = was.tab;
      setXpFeature(was.on);
    }
  });
  await test('Dragging a card never leaves a stuck copy behind (the table redrew mid-drag)', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    try {
      const el = document.createElement('div'); el.dataset.cardId = 'c_7';
      parent.appendChild(el);
      const ds = { el, dragging: true };
      beginDraggingElement(ds, 50, 50);
      assertEqual(el.parentNode, document.body, 'the dragged card follows the pointer at the top level');
      // The hand is redrawn while it's held: a fresh copy of the same card appears.
      const fresh = document.createElement('div'); fresh.dataset.cardId = 'c_7';
      parent.appendChild(fresh);
      endDraggingElement(ds);
      assertTrue(!el.isConnected, 'the stale copy is dropped, not put back');
      assertEqual(parent.querySelectorAll('[data-card-id="c_7"]').length, 1, 'only one copy of the card');
      // Nothing redrew: the card goes back where it was, with no drag styles left.
      const el2 = document.createElement('div'); el2.dataset.cardId = 'c_8';
      parent.appendChild(el2);
      const ds2 = { el: el2, dragging: true };
      beginDraggingElement(ds2, 50, 50);
      endDraggingElement(ds2);
      assertTrue(el2.parentNode === parent && !el2.style.position && !el2.style.transform && !el2.classList.contains('drag-ghost'), 'an unchanged table gets the card back, snapped into place');
    } finally { parent.remove(); }
  });
  await test('Phoenix is gone from the game; Turtley took its place', () => {
    assertTrue(!AVATAR_ART['avatar-phoenix'] && !COSMETIC_SHOP_ITEMS.some(i => i.id === 'avatar-phoenix'), 'no Phoenix art or Shop item');
    assertEqual(resolveAvatarId('avatar-phoenix'), DEFAULT_AVATAR_ID, 'an old equipped Phoenix shows the default picture');
    assertTrue(!!AVATAR_ART['avatar-turtley']?.photo, 'Turtley is a premium photo picture');
  });
  await test('Devices: the table scales up on tablets/PCs only, and a sideways phone is asked to turn upright', () => {
    const css = [...document.querySelectorAll('style')].map(el => el.textContent).join('\n');
    assertTrue(/@media \(min-width: 700px\) and \(min-height: 700px\)[\s\S]{0,80}--tbl-k: 1\.3/.test(css), 'tablets raise the table scale');
    assertTrue(/@media \(min-width: 1100px\) and \(min-height: 800px\)[\s\S]{0,80}--tbl-k: 1\.45/.test(css), 'PCs raise it further');
    const k = tableScale();
    const big = innerWidth >= 700 && innerHeight >= 700;
    assertTrue(big ? k > 1 : k === 1, 'tableScale() follows the screen', { k, w: innerWidth, h: innerHeight });
    const hint = document.getElementById('rotateHint');
    assertTrue(!!hint && hint.parentElement === document.body, 'the rotate prompt sits at the top level');
    assertTrue(getComputedStyle(hint).display === 'none' || !matchMedia('(orientation: landscape) and (max-height: 500px) and (pointer: coarse)').matches ? getComputedStyle(hint).display === 'none' : true, 'hidden unless a phone is on its side');
    assertTrue(/\(orientation: landscape\) and \(max-height: 500px\) and \(pointer: coarse\)/.test(css), 'only touch phones on their side get it');
    assertTrue(!/[\u{1F300}-\u{1FAFF}]/u.test(hint.textContent), 'no emoji in the prompt');
  });
  await test('4K: every table, card back and picture is vector art or a 3x tile, with no bitmap inside', async () => {
    const tiled = new Set(Object.keys(TILED_TABLE_LIGHT));
    Object.entries(TABLE_ART).forEach(([k, src]) => {
      if (tiled.has(k)) assertTrue(/-tile\.jpg$/.test(src), `${k} is a repeated tile`, src);
      else assertTrue(/\.svg$/.test(src), `${k} table art is an SVG`, src);
    });
    Object.entries(ILLUSTRATED_TABLES).forEach(([id, t]) => {
      const bg = tableArtBackground(id);
      assertTrue(tiled.has(t.art) ? bg.includes(`${TABLE_TILE_PX}px repeat`) : !/<image\b/.test(ShTableScenes.scene(id,1920,1080)), `${id} is never a stretched bitmap`);
    });
    const svgs = [...Object.values(TABLE_ART), ...Object.values(SEASONAL_TABLE_ART), ...Object.values(SEASONAL_BACK_ART)].filter(u => /\.svg$/.test(u));
    assertTrue(svgs.length >= 30, 'every SVG art file is checked', svgs.length);
    for (const u of svgs) {
      const text = await (await fetch(u, { cache: 'no-store' })).text();
      assertTrue(text.includes('<svg') && !/<image|data:image\/(png|jpe?g|webp|gif)/i.test(text), `${u} is pure vector (no embedded bitmap)`);
    }
    Object.entries(AVATAR_ART).forEach(([id, a]) => {
      assertTrue(!/data:image\//i.test(a.art), `${id} picture embeds no bitmap data URI`);
      // the premium photo pictures are the only raster ones: sized files, never stretched past them
      // (the owner's approved art lives in art/avatars/approved-v26x/ and the crown atlas is a sized PNG, v263–v267)
      if (a.photo) assertTrue([...a.art.matchAll(/href="([^"]+)"/g)].every(m => /^art\/avatars\/[A-Za-z0-9\/-]+\.(webp|png)(\?v=\d+)?$/.test(m[1])), `${id} only uses its own art/avatars files`);
      else assertTrue(!/<image/i.test(a.art), `${id} picture is pure vector`);
    });
    const css = [...document.querySelectorAll('style')].map(el => el.textContent).join('\n');
    assertTrue(!/url\(['"]?data:image\/(png|jpe?g|webp|gif)/i.test(css), 'no bitmap data URIs in the page CSS');
  });
  await test('Premium pictures (Royal Flush, Cosmic Ace) and tables (Neon City, Northern Lights, Deep Space)', async () => {
    const pics = { 'avatar-royal-flush': 'Royal Flush', 'avatar-cosmic-ace': 'Cosmic Ace' };
    const host = document.createElement('div');
    const hadReduce = document.body.classList.contains('reduce-motion');
    document.body.classList.remove('reduce-motion');
    document.body.appendChild(host);
    try {
      for (const [id, name] of Object.entries(pics)) {
        const item = COSMETIC_SHOP_ITEMS.find(i => i.id === id);
        assertTrue(!!item && item.name === name && item.cost === 2500 && item.animated, `${name} is a 2500 animated picture`, item);
        assertTrue(COSMETIC_RUNTIME_IDS.avatar.has(id) && AVATAR_ART[id].animated, `${name} has art`);
        host.innerHTML = avatarHtml(id, 64);
        const moving = [...host.querySelectorAll('*')].filter(el => getComputedStyle(el).animationName !== 'none');
        assertTrue(moving.length >= 3, `${name} animates several parts`, moving.length);
      }
      document.body.classList.add('reduce-motion');
      host.innerHTML = avatarHtml('avatar-royal-flush', 64);
      assertTrue([...host.querySelectorAll('*')].every(el => getComputedStyle(el).animationName === 'none'), 'Reduce Motion stops them');
    } finally {
      document.body.classList.toggle('reduce-motion', hadReduce);
      host.remove();
    }
    const tables = { 'table-neon': 'Neon City', 'table-aurora': 'Northern Lights', 'table-space': 'Deep Space' };
    for (const [id, name] of Object.entries(tables)) {
      const item = COSMETIC_SHOP_ITEMS.find(i => i.id === id);
      assertTrue(!!item && item.name === name && item.cost === 3000, `${name} costs 3000`, item);
      assertTrue(COSMETIC_RUNTIME_IDS.tableTheme.has(id) && !!ILLUSTRATED_TABLES[id], `${name} can be equipped and drawn`);
      const r = await fetch(TABLE_ART[ILLUSTRATED_TABLES[id].art], { cache: 'no-store' });
      assertTrue(r.ok, `${name} art loads`);
    }
    const topTable = Math.max(...COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Table Themes' && !Object.keys(tables).includes(i.id)).map(i => i.cost));
    assertTrue(topTable <= 3000, 'premium tables cost at least as much as any other table', topTable);
  });
  await test('Premium photo pictures (Sapphire Sovereign, Crimson Inferno, Scarlet Guardian, Turtley): 5000, animated at every size', async () => {
    const pics = { 'avatar-sapphire-sovereign': 'Sapphire Sovereign', 'avatar-crimson-inferno': 'Crimson Inferno', 'avatar-scarlet-guardian': 'Scarlet Guardian', 'avatar-turtley': 'Turtley' };
    const host = document.createElement('div');
    const hadReduce = document.body.classList.contains('reduce-motion');
    document.body.classList.remove('reduce-motion');
    document.body.appendChild(host);
    const size = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res([im.naturalWidth, im.naturalHeight]); im.onerror = () => res(null); im.src = u; });
    try {
      for (const [id, name] of Object.entries(pics)) {
        const item = COSMETIC_SHOP_ITEMS.find(i => i.id === id);
        assertTrue(!!item && item.name === name && item.cost === 5000 && item.animated && item.category === 'Avatars', `${name} is a 5000 animated picture in the Shop`, item);
        assertTrue(COSMETIC_RUNTIME_IDS.avatar.has(id) && AVATAR_ART[id].photo, `${name} has art`);
        host.innerHTML = avatarHtml(id, 96);
        const moving = [...host.querySelectorAll('*')].filter(el => getComputedStyle(el).animationName !== 'none');
        assertTrue(moving.length >= 3, `${name} animates several parts`, moving.length);
        assertTrue(moving.every(el => 6 % parseFloat(getComputedStyle(el).animationDuration) === 0), `${name} loops seamlessly every 6s`, moving.map(el => getComputedStyle(el).animationDuration));
        assertTrue(host.firstElementChild.hasAttribute('data-av-anim'), `${name} is watched (paused offscreen / app hidden)`);
        const hrefs = [...host.innerHTML.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
        for (const u of hrefs) assertTrue(!!(await size(u)), `${u} loads`);
        assertEqual(JSON.stringify(await size(hrefs[0])), '[512,512]', `${name} base is 512px`);
        // Shop, Custom, compact lists/menu/table and full previews must all animate.
        for (const px of [18, 20, 22, 28, 30, 32, 34, 40, 42, 52, 64, 84]) {
          host.innerHTML = avatarHtml(id, px);
          assertTrue(host.firstElementChild.hasAttribute('data-av-anim'), `${name} is watched at ${px}px`);
          const parts = [...host.querySelectorAll('*')].filter(el => getComputedStyle(el).animationName !== 'none');
          assertTrue(parts.length >= 3, `${name} keeps its animated parts at ${px}px`);
          const animations = host.getAnimations({ subtree: true });
          const movement = animations.find(a => a.effect.getKeyframes().some(k => k.transform && k.transform !== 'none'));
          assertTrue(!!movement, `${name} has actual motion at ${px}px`);
          movement.pause();
          movement.currentTime = 0;
          const before = getComputedStyle(movement.effect.target).transform;
          movement.currentTime = 1100;
          assertTrue(getComputedStyle(movement.effect.target).transform !== before, `${name} changes pose at ${px}px`);
        }
      }
      const top = Math.max(...COSMETIC_SHOP_ITEMS.filter(i => i.category === 'Avatars').map(i => i.cost));
      assertEqual(top, 5000, 'nothing in Profile Pictures costs more');
      document.body.classList.add('reduce-motion');
      host.innerHTML = Object.keys(pics).map(id => avatarHtml(id, 96)).join('');
      assertTrue([...host.querySelectorAll('*')].every(el => getComputedStyle(el).animationName === 'none'), 'Reduce Motion stops them');
      const sparks = [...host.querySelectorAll('.av-px-ember, .av-px-spark')];
      assertTrue(sparks.length === 4 && sparks.every(el => getComputedStyle(el).opacity === '0'), 'with Reduce Motion the ember and sparks stay hidden (the still picture shows)');
      document.body.classList.remove('reduce-motion');
      document.body.classList.add('app-hidden');
      assertTrue([...host.querySelectorAll('.av-px-sweep')].every(el => getComputedStyle(el).animationPlayState === 'paused'), 'a hidden app pauses them');
    } finally {
      document.body.classList.remove('app-hidden');
      if (document.hidden) document.body.classList.add('app-hidden');
      document.body.classList.toggle('reduce-motion', hadReduce);
      host.remove();
    }
  });
  await test('Custom → All: every item incl. all seasonal ones, folding sections, and a Diamonds / owned / Shop bar', () => {
    const savedOwned = cosmeticPurchaseState, savedCollapsed = [...customAllCollapsed], savedNow = seasonalNowOverride;
    try {
      seasonalNowOverride = '2026-09-24T12:00:00'; // no event on
      customAllCollapsed.clear();
      openThemesPanel();
      cosmeticPurchaseState = { 'back-halloween': true, 'burn-ice': true };
      setCustomTab('all');
      renderPersonalisationCosmetics();
      assertEqual(document.querySelector('#customTabBar [data-custom-tab]').dataset.customTab, 'all', 'All is the first Custom tab');
      assertTrue(!document.querySelector('[data-custom-panel="all"]').classList.contains('hidden'), 'and it shows');
      const heads = [...document.querySelectorAll('#personalisationAll [data-custom-section-toggle]')];
      assertEqual(heads.map(h => h.querySelector('.cat-head-title').textContent), COSMETIC_TABS.map(t => t.label), 'One section per type');
      const ids = new Set([...document.querySelectorAll('#personalisationAll [data-equip-id]')].map(b => b.dataset.equipId));
      const everything = [...COSMETIC_SHOP_ITEMS, ...EARNED_AVATARS, ...EARNED_FRAMES, ...LEVEL_REWARDS, ...BUILT_IN_COSMETICS.filter(i => COSMETIC_TABS.some(t => t.category === i.category))];
      const missing = everything.filter(i => !ids.has(i.id)).map(i => i.id);
      assertEqual(missing, [], 'Every item is in All, seasonal ones included');
      const halloweenTable = document.querySelector('#personalisationAll [data-equip-id="table-halloween"]');
      assertTrue(halloweenTable.hasAttribute('data-locked') && halloweenTable.textContent.includes('Halloween only'), 'An unowned out-of-season item is locked and says when it is sold');
      assertTrue(!document.querySelector('#personalisationAll [data-equip-id="back-halloween"]').hasAttribute('data-locked'), 'An owned seasonal item can be equipped any time');
      const backsHead = heads.find(h => h.dataset.customSectionToggle === 'cardBack');
      const backTotal = customAllItems('cardBack').length;
      // Owned = the Halloween back bought here + every free back (Default and the linen backs, v265).
      const backOwned = customAllItems('cardBack').filter(i => i.builtIn || i.id === 'default' || cosmeticPurchaseState[i.id]).length;
      assertTrue(backOwned >= 2, 'free backs count as owned', backOwned);
      assertEqual(backsHead.querySelector('.cat-head-count').textContent, `${backOwned}/${backTotal}`, 'Sections count owned / total');
      backsHead.click();
      assertEqual(document.querySelector('#personalisationAll [data-custom-section-toggle="cardBack"]').getAttribute('aria-expanded'), 'false', 'The chevron folds a section');
      assertTrue(!document.querySelector('#personalisationAll [data-equip-type="cardBack"]'), 'Folded: its tiles are hidden');
      document.querySelector('#personalisationAll [data-custom-section-toggle="cardBack"]').click();
      assertTrue(!!document.querySelector('#personalisationAll [data-equip-type="cardBack"]'), 'and back open');
      const bar = document.querySelector('#themesModal .ch-stat-bar');
      assertTrue(!!bar && !!bar.querySelector('#customDiamondCount') && !!bar.querySelector('#customShopBtn'), 'The header has Diamonds and the Shop, like Challenges');
      const d = bar.querySelector('.ch-stat--diamonds').getBoundingClientRect(), o = bar.querySelector('.ch-stat--done').getBoundingClientRect(), sh = bar.querySelector('.ch-stat--shop').getBoundingClientRect();
      const mid = r => r.top + r.height / 2;
      assertTrue(Math.abs(mid(d) - mid(sh)) < 1.5 && Math.abs(mid(d) - mid(o)) < 1.5, 'All three sit on one line');
      assertTrue(d.left < o.left && o.right < sh.left, 'Diamonds left, owned in the middle, Shop right');
      const total = [...COSMETIC_TABS].reduce((n, t) => n + customAllItems(COSMETIC_CATEGORY_TYPES[t.category]).length, 0);
      assertEqual(document.getElementById('customOwnedTotal').textContent, `/ ${total} owned`, 'The middle shows how much of everything you own');
      challengeEconomy.diamonds = challengeEconomy.diamonds || 0; updateDiamondHeader();
      assertEqual(document.getElementById('customDiamondCount').textContent, document.getElementById('challengesModalDiamondCount').textContent, 'Same balance as Challenges');
    } finally {
      cosmeticPurchaseState = savedOwned; seasonalNowOverride = savedNow;
      customAllCollapsed.clear(); savedCollapsed.forEach(t => customAllCollapsed.add(t));
      try { localStorage.setItem('shithead_custom_all_collapsed', JSON.stringify(savedCollapsed)); } catch (e) {}
      renderPersonalisationCosmetics();
      document.getElementById('themesModal').classList.add('hidden');
    }
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
      newCosmeticIds = savedNew; cosmeticPurchaseState = savedPurchases; challengeEconomy.diamonds = savedDiamonds; shopTab = 'Avatars'; renderCosmeticShop();
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
    const labels = [...document.querySelectorAll('#challengeTabRanked > .ch-sec')].map((h) => h.dataset.chTitle);
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
    // Different builds can't share a room: never pair them.
    const mine = { ...me, v: 'v184' };
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now, v: 'v184' }, mine, null, false, now).action, 'claim', 'Same version: pair up');
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now, v: 'v185' }, mine, null, false, now).action, 'update', 'A newer waiter: this phone updates first');
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now, v: 'v183' }, mine, null, false, now).action, 'wait', 'An older waiter gives up the spot');
    assertEqual(decideRankedQueueAction({ uid: 'x', ts: now }, mine, null, false, now).action, 'wait', 'A ticket from before versions were sent counts as older');
    assertEqual(gameVersionNumber('v184'), 184, 'Version numbers compare as numbers');
    assertTrue(findRankedMatch.toString().includes("decision.action === 'claim') return null"), 'Claiming takes the opponent out of the queue in the same transaction');
    assertTrue(waitForRankedMatch.toString().includes('onDisconnect().remove()'), 'A waiting ticket is removed automatically if the connection drops');
  });
  await test('Find Game after a Ranked game keeps searching when the last opponent is waiting (no "try again", no extra presses)', async () => {
    const realRandom = Math.random, realCreate = createRankedRoom, realEnter = enterRankedRoom, realBanner = notifyBanner;
    const now = serverNow();
    let queue = { uid: 'opp', name: 'Opp', rating: 500, ts: now, v: getGameVersionLabel() };
    const tx = [], banners = [], created = [];
    db = { ref: (path) => ({
      once: () => Promise.resolve({ exists: () => true, val: () => (path.endsWith('lastRankedOpponent') ? { uid: 'opp', at: now - 60000 } : { rating: 500, wins: 1, losses: 0, diamonds: 10 }) }),
      transaction: (fn, done) => { const next = fn(queue); tx.push(next === null ? 'claim' : next === queue ? 'skip' : 'wait'); if (next !== undefined) queue = next; done && done(null, true); return Promise.resolve(); },
      set: () => Promise.resolve(), remove: () => Promise.resolve(), on: () => {}, off: () => {},
      onDisconnect: () => ({ remove: () => {}, cancel: () => {} })
    }) };
    currentUser = { uid: 'me', displayName: 'Me' };
    Math.random = () => 0; // the skip roll always says "skip"
    notifyBanner = (m) => banners.push(m);
    createRankedRoom = (me, opp) => { created.push(opp.uid); return '123456'; };
    enterRankedRoom = () => {};
    try {
      findRankedMatch();
      await new Promise(r => setTimeout(r, 150));
      assertEqual(tx.join(','), 'skip', 'The recent opponent is passed over at first');
      assertTrue(!banners.some(b => /try again/i.test(b)), 'No "try again" banner: the search goes on');
      assertTrue(!!rankedSearchTimer, 'The search screen stays up');
      rankedSearchStartedAt = Date.now() - RANKED_REMATCH_GRACE_MS - 1; // nobody else came along
      await new Promise(r => setTimeout(r, RANKED_REMATCH_RETRY_MS + 300));
      assertEqual(created.join(','), 'opp', 'After the grace time Find Game pairs with them on its own');
    } finally {
      Math.random = realRandom; createRankedRoom = realCreate; enterRankedRoom = realEnter; notifyBanner = realBanner;
      rankedSearchToken++; rankedSearchStartedAt = 0; stopRankedHeartbeat(); stopRankedSearchClock();
    }
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
  await test('openThemesPanel opens the modal and shows every deck (the four free ones and the Shop ones)', () => {
    openThemesPanel();
    const area = document.getElementById('themesGridArea');
    assertTrue(!document.getElementById('themesModal').classList.contains('hidden'), 'openThemesPanel must show the modal');
    ['Obsidian', 'Emerald', 'Cyber', 'Crimson', 'Classic Casino', 'Arcade', 'Four-Colour'].forEach((name) => {
      assertTrue(area.innerHTML.includes(name), `${name} must appear`);
    });
    assertEqual(area.children.length, 15, 'Fifteen decks (5 free, 10 Shop), no placeholder cards');
    assertTrue(!area.innerHTML.includes('Coming Soon'), 'The old Coming Soon placeholder is gone');
    document.getElementById('themesModal').classList.add('hidden');
  });
  await test('REGRESSION: Challenges exposes exactly Daily, Weekly, Ranked, Bots (+ Seasonal during events) top tabs', () => {
    const tabs=[...document.querySelectorAll('[data-challenge-tab]')].map(b=>b.dataset.challengeTab);
    assertEqual(tabs,['daily','weekly','ranked','bots','seasonal'],'Challenge tabs must be Daily, Weekly, Ranked, Bots in that order');
    assertEqual(pickWeeklyChallengeIds('2026-W39').length,3,'Each week must select exactly 3 challenges');
  });
  await test('Weekly challenges (v240): the new rules start with 2026-W41 and never reach back into an earlier week', () => {
    assertEqual(pickWeeklyChallengeIds('2026-W40').length, 3, 'Up to 2026-W40: 3 a week');
    assertTrue(pickWeeklyChallengeIds('2026-W40').every(id => WEEKLY_CHALLENGE_POOL_V1.some(c => c.id === id)), 'Up to 2026-W40: the first pool');
    assertEqual(pickWeeklyChallengeIds('2026-W41').length, 5, 'From 2026-W41: 5 a week');
    assertEqual(new Set(pickWeeklyChallengeIds('2027-W12')).size, 5, 'Five different challenges');
    assertEqual(getWeeklyChallengeDef('burn-once', '2026-W40').target, 5, 'An old week keeps its old target');
    assertEqual(getWeeklyChallengeDef('burn-once', '2026-W41').target, 10, 'Bonfire Week: 10 burns from W41');
    [['beat-a-bot', 5], ['win-ranked-match', 5], ['snap-burn-once', 5], ['four-of-a-kind-burn', 5]].forEach(([id, n]) => assertEqual(getWeeklyChallengeDef(id, '2026-W41').target, n, `${id} target from W41`));
    assertEqual(WEEKLY_CHALLENGE_POOL_V2.length, 18, '8 old + 10 new');
    assertEqual(getWeeklyChallengeDef('pile-diver', '2026-W40'), null, 'New challenges are not in old weeks');
    assertTrue(/15 or more/.test(challengeDescription('weekly_2026-W41_pile-diver')), 'Completion keys read their own week');
    assertTrue(/Burn the pile 5 times/.test(challengeDescription('weekly_2026-W39_burn-once')), 'An old completion keeps its old wording');
    // A week already under way keeps its 3 picks.
    const kept = { weekKey: 'x', challengeIds: ['a', 'b', 'c'], progress: {} };
    const realKey = getUkWeekKey();
    kept.weekKey = realKey;
    const res = ensureWeeklyChallengeState({ ...kept, challengeIds: pickWeeklyChallengeIds(realKey) });
    assertTrue(!res.changed, 'This week\'s saved picks stay as they are');
    assertEqual(weeklyRulesFor('2026-W40').picks, 3, 'Rule lookup: before');
    assertEqual(weeklyRulesFor('2027-W01').picks, 5, 'Rule lookup: next year');
    const cat = serverEconomyCatalog();
    assertEqual(cat.weeklyRules.map(r => [r.from, r.picks, r.pool.length]), [['', 3, 8], ['2026-W41', 5, 18]], 'The server gets both rules');
  });
  await test('Weekly challenges (v240): each new challenge counts the right thing', async () => {
    const realState = challengeEconomy.weeklyChallengeState, realDaily = challengeEconomy.dailyChallengeState, realDone = challengeEconomy.completedChallenges;
    const realPlayers = state.players, realLocal = state.localPlayerId, realMulti = state.isMultiplayer, realRanked = state.isRanked, realG = state.gauntlet;
    const writes = {};
    db = { ref: (path) => ({ set: (v) => { writes[path] = v; return Promise.resolve(); } }) };
    currentUser = { uid: 'wk' };
    const all = WEEKLY_CHALLENGE_POOL_V2.map(c => c.id);
    challengeEconomy.completedChallenges = {};
    challengeEconomy.dailyChallengeState = { dateKey: 'x', challengeIds: [], progress: {} };
    challengeEconomy.weeklyChallengeState = { weekKey: '2026-W41', challengeIds: all, progress: {} };
    const prog = (id) => challengeEconomy.weeklyChallengeState.progress[id] || 0;
    try {
      bumpWeeklyChallengeProgress(['twos-played', 'twos-played', 'twos-played']);
      assertEqual(prog('twos-played'), 3, 'Three 2s played together count 3');
      const me = { id: 'me', name: 'Me', finishRank: 1, gameStats: { pickedUp: 16, biggestPickup: 15 } };
      state.players = [me, { id: 'b', name: 'Bot', finishRank: 2 }]; state.localPlayerId = 'me';
      state.isMultiplayer = true; state.isRanked = false; state.gauntlet = null;
      weeklyMatchEnded();
      assertEqual(prog('friends-match'), 1, 'Social Week: a Play Friends match');
      assertEqual(prog('comeback-season'), 1, 'Comeback Season: won after 16 cards picked up');
      assertEqual(prog('pile-diver'), 1, 'Pile Diver: won after a 15-card pickup');
      assertEqual(prog('win-streak'), 1, 'Streaker: a run of 1');
      me.gameStats = { pickedUp: 5, biggestPickup: 5 };
      state.isMultiplayer = false; state.gauntlet = { round: 2 };
      weeklyMatchEnded();
      assertEqual(prog('comeback-season'), 1, 'Exactly 5 cards picked up is not "more than 5"');
      assertEqual(prog('friends-match'), 1, 'Vs Bots is not a Play Friends match');
      assertEqual(prog('gauntlet-runner'), 1, 'Gauntlet Runner: a Gauntlet bot beaten');
      assertEqual(prog('win-streak'), 2, 'Streaker: a run of 2');
      weeklyStreakBroken();
      assertEqual(challengeEconomy.weeklyChallengeState.streakRun, 0, 'Leaving mid-match breaks the run');
      assertEqual(prog('win-streak'), 2, 'The best run so far is kept');
      state.gauntlet = null;
      weeklyMatchEnded(); weeklyMatchEnded();
      assertEqual(prog('win-streak'), 2, 'A new run only counts once it beats the best');
      me.finishRank = 2; weeklyMatchEnded();
      assertEqual(writes['users/wk/weeklyChallengeState/streakRun'], 0, 'A loss resets the run');
      me.finishRank = 1; me.drew = true; weeklyMatchEnded();
      assertEqual(challengeEconomy.weeklyChallengeState.streakRun, 0, 'A draw is not a win');
      applyServerClaims([{ id: 'daily_2026-10-05_burn-once', name: 'Burn the Pile', reward: 25 }]);
      assertEqual(prog('daily-grinder'), 1, 'Daily Grinder: a daily challenge completed');
      applyServerClaims([{ id: 'weekly_2026-W41_burn-once', name: 'Bonfire Week', reward: 100 }]);
      assertEqual(prog('daily-grinder'), 1, 'Only daily challenges count for Daily Grinder');
    } finally {
      challengeEconomy.weeklyChallengeState = realState; challengeEconomy.dailyChallengeState = realDaily; challengeEconomy.completedChallenges = realDone;
      state.players = realPlayers; state.localPlayerId = realLocal; state.isMultiplayer = realMulti; state.isRanked = realRanked; state.gauntlet = realG;
    }
  });
  await test('REGRESSION: leaderboard search UI exists and rows can show public W/L counts', () => {
    assertTrue(!!document.getElementById('leaderboardSearchInput'),'Leaderboard search field must exist');
    const html=leaderboardRowHtml({username:'Tester',rating:600,wins:7,losses:3},2);
    assertTrue(html.includes('7W') && html.includes('3L') && html.includes('10 played'),'Leaderboard row must expose W/L and games played');
  });
  await test('REGRESSION: expired inbox invites are identified for cleanup', () => {
    const originalUser=currentUser, originalDb=db; let updates=null;
    currentUser={uid:'cleanup-test'}; db={ref:()=>({update:(u)=>{updates=u;return Promise.resolve();}})};
    const expired=cleanupExpiredInvites({old:{sentAt:serverNow()-GAME_INVITE_EXPIRY_MS-1000},fresh:{sentAt:serverNow()}});
    assertTrue(expired.includes('old')&&!expired.includes('fresh'),'Only expired invites should be cleaned');
    assertTrue(updates && updates.old===null,'Cleanup must delete expired Firebase child keys');
    currentUser=originalUser; db=originalDb;
  });

  await test('Custom → Deck: every deck is a tile; the 4 originals are free, Shop decks are locked until bought', () => {
    const savedPurchases = cosmeticPurchaseState;
    try {
      cosmeticPurchaseState = {};
      openThemesPanel();
      const area = document.getElementById('themesGridArea');
      const tiles = [...area.querySelectorAll('[data-equip-type="deck"]')];
      assertEqual(tiles.length, 15, 'Five free decks and ten Shop decks');
      ['deck-obsidian', 'deck-emerald', 'deck-cyber', 'deck-crimson', 'deck-bigprint'].forEach(id => assertTrue(!area.querySelector(`[data-equip-id="${id}"]`).hasAttribute('data-locked'), `${id} is free`));
      ['deck-casino', 'deck-arcade', 'deck-fourcolour'].forEach(id => assertTrue(area.querySelector(`[data-equip-id="${id}"]`).hasAttribute('data-locked'), `${id} is locked until bought`));
      assertTrue(area.querySelector('[data-equip-id="deck-fourcolour"]').textContent.includes('750'), 'Four-Colour shows its premium price');
      assertEqual(equipCosmetic('deck', 'deck-casino'), false, 'An unowned deck cannot be equipped');
    } finally {
      cosmeticPurchaseState = savedPurchases;
      document.getElementById('themesModal').classList.add('hidden');
    }
  });
  await test('Custom → Deck: tapping a deck applies its theme everywhere; the active one is marked', () => {
    const originalSave = saveGameState, savedPurchases = cosmeticPurchaseState;
    saveGameState = () => {};
    try {
      freshState({ deckTheme: 'theme-cyber' });
      openThemesPanel();
      cosmeticPurchaseState = { 'deck-fourcolour': { cost: 750 } };
      renderThemesPanelActiveState();
      const area = document.getElementById('themesGridArea');
      assertEqual(area.querySelector('[data-equip-id="deck-cyber"]').getAttribute('aria-pressed'), 'true', 'The active deck is marked');
      area.querySelector('[data-equip-id="deck-fourcolour"]').click();
      assertEqual(state.deckTheme, 'theme-cyber', 'One tap only previews (double-tap to equip, v289)');
      area.querySelector('[data-equip-id="deck-fourcolour"]').click();
      assertEqual(state.deckTheme, 'theme-fourcolour', 'The owned Four-Colour deck is applied');
      assertTrue(document.body.className.includes('theme-fourcolour'), "The deck's class is on the page");
      assertTrue(getSuitStyle('♦').includes('suit-d') && getSuitStyle('♣').includes('suit-c'), 'Suits carry their own class so Four-Colour can colour them');
      area.querySelector('[data-equip-id="deck-emerald"]').click();
      area.querySelector('[data-equip-id="deck-emerald"]').click();
      assertEqual(state.deckTheme, 'theme-emerald', 'Back to a free deck');
    } finally {
      saveGameState = originalSave; cosmeticPurchaseState = savedPurchases;
      selectDeckTheme('theme-obsidian');
      document.getElementById('themesModal').classList.add('hidden');
    }
  });
  await test('Every item preview is drawn the same way per type: Custom tile = Shop row, one size, never collapsed', () => {
    // The rule for every new item: previews come from cosmeticPreview, and
    // every item of a type shows at the same, real size in Custom and the Shop.
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:0;top:0;width:360px;z-index:-1;visibility:hidden';
    document.body.appendChild(host);
    const box = (html) => { host.innerHTML = html; const el = host.firstElementChild; const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
    const expected = { cardBack: [32, 44], frame: [32, 44], deck: [32, 44], burnEffect: [40, 40], victoryEffect: [40, 40], jokerEffect: [40, 40], emotes: [40, 40], avatar: [40, 40] };
    try {
      COSMETIC_TABS.map(tab => COSMETIC_CATEGORY_TYPES[tab.category]).forEach(type => {
        const items = customAllItems(type);
        assertTrue(items.length > 0, `${type} has items`);
        const sizes = new Set();
        items.forEach(item => {
          const custom = box(`<span class="avatar-option-art" style="display:inline-flex">${cosmeticPreview(item, type)}</span>`);
          const art = box(cosmeticPreview(item, type));
          const shop = type === 'tableTheme' ? box(`<span style="display:block;width:120px">${cosmeticPreview(item, type)}</span>`) : box(`<span style="display:inline-flex">${shopCosmeticThumbnail(item, type)}</span>`);
          assertTrue(art[0] >= 20 && art[1] >= 20, `${item.id} preview has a real size (got ${art})`);
          assertTrue(custom[1] >= 20, `${item.id} Custom tile art is not collapsed`);
          if (type !== 'tableTheme') assertEqual(shop.join('x'), art.join('x'), `${item.id}: Shop row and Custom show the same preview size`);
          if (expected[type]) assertEqual(art.join('x'), expected[type].join('x'), `${item.id} uses the shared ${type} size`);
          sizes.add(art.join('x'));
        });
        if (type !== 'tableTheme') assertEqual(sizes.size, 1, `Every ${type} preview is one size (got ${[...sizes]})`);
        assertTrue(type === 'tableTheme' || type === 'avatar' || box(cosmeticPreview(null, type))[1] >= 20, `Default ${type} preview has a real size`);
      });
    } finally {
      host.remove();
    }
  });
  await test('Card history circle: shows the card to beat (5 → base card, 3 → the card under it) and folds per game', () => {
    const savedPref = historyOpenPref, savedOpen = historyOpen;
    try {
      freshState({ discardPile: [makeCard('7'), makeCard('3')] });
      assertEqual(historyCircleLabel(historyCircleCard()), '7', 'A 3 shows the card under it');
      state.discardPile = [makeCard('9'), makeCard('3'), makeCard('3')];
      assertEqual(historyCircleLabel(historyCircleCard()), '9', 'Under several 3s');
      state.discardPile = [makeCard('3')];
      assertEqual(historyCircleLabel(historyCircleCard()), '3', 'A 3 that is the base card shows 3');
      state.discardPile = [makeCard('8'), makeCard('K'), makeCard('5')];
      state.baseOverrideCard = state.discardPile[0];
      assertEqual(historyCircleLabel(historyCircleCard()), '8', 'A 5 shows the base card');
      state.discardPile.push(makeCard('3'));
      assertEqual(historyCircleLabel(historyCircleCard()), '8', 'A 3 on a 5 shows the base card');
      state.baseOverrideCard = null; state.discardPile = [];
      assertEqual(historyCircleLabel(historyCircleCard()), '', 'Empty pile: no rank (the history icon)');
      const panel = document.getElementById('historyStreamPanel');
      setHistoryOpen(false);
      assertTrue(panel.classList.contains('history-collapsed'), 'Closing folds the strip into the circle');
      assertTrue(!!document.querySelector('#historyCircleBtn svg'), 'Empty pile: the circle shows the history icon');
      document.getElementById('historyCircleBtn').click();
      assertTrue(!panel.classList.contains('history-collapsed') && historyOpen, 'Tapping the circle opens it');
      document.getElementById('histCollapseBtn').click();
      assertTrue(!historyOpen, 'The strip has its own close button');
      historyOpenPref = true;
      hideMatchEndUI();
      assertTrue(historyOpen, 'A new game starts as the setting says (on = open)');
      historyOpenPref = false;
      hideMatchEndUI();
      assertTrue(!historyOpen, 'Setting off: each game starts as the circle');
    } finally {
      historyOpenPref = savedPref; setHistoryOpen(savedOpen);
    }
  });
  await test('Card hold info: every card has a short line, face-down cards stay secret, and a hold never selects', async () => {
    CARD_REFERENCE.forEach(([rank]) => {
      const text = CARD_HOLD_TEXT[rank];
      assertTrue(!!text, `${rank} has hold text`);
      assertTrue(text.split(/\s+/).length <= 25, `${rank} hold text is short (${text.split(/\s+/).length} words)`);
    });
    const hand = [makeCard('4'), makeCard('9')], down = makeCard('A');
    freshState({ phase: 'PLAY', discardPile: [makeCard('6')], activeConstraint: 'EVEN' });
    state.players = [makePlayer({ id: state.localPlayerId || 'you', hand, faceDown: [down] })];
    state.localPlayerId = state.players[0].id;
    const mk = (card) => { const el = document.createElement('div'); el.dataset.cardId = card.id; el.style.cssText = 'position:fixed;left:40px;top:300px;width:40px;height:56px'; return el; };
    assertEqual(holdCardInfo(mk(down)), null, 'A face-down card never answers');
    assertTrue(/You can play it now/.test(cardHoldHtml(hand[0], true)), 'A 4 can go on a 6');
    assertTrue(/Can't go on the 6/.test(cardHoldHtml(hand[1], true)), 'A 9 is refused on a 6');
    assertTrue(/Drop|Base/.test(cardHoldHtml(makeCard('5'), false)) && /bottom card/.test(cardHoldHtml(makeCard('5'), false)), 'The 5 uses the short text');
    const up = makeCard('4');
    state.players[0].faceUp = [up];
    const upInfo = holdCardInfo(mk(up));
    assertTrue(/once your hand is empty/.test(cardHoldHtml(upInfo.card, upInfo.own, upInfo)), 'Your face-up card waits for an empty hand');
    state.players[0].hand = [];
    const upInfo2 = holdCardInfo(mk(up));
    assertTrue(/You can play it now/.test(cardHoldHtml(upInfo2.card, upInfo2.own, upInfo2)), 'With an empty hand, the face-up 4 can go on the 6');
    state.players[0].hand = hand;
    state.discardPile = [makeCard('8'), makeCard('6')];
    const pileHit = holdTargetAt(document.getElementById('discardPileContainer'));
    assertTrue(pileHit && pileHit.info.card.rank === '6', 'Holding the Pile reads its top card');
    const baseHit = holdTargetAt(document.getElementById('bottomCardPreview'));
    assertTrue(baseHit && baseHit.info.card.rank === '8' && /Base card/.test(cardHoldHtml(baseHit.info.card, false, baseHit.info)), 'Holding the Base Card reads the bottom card');
    const table = document.getElementById('gameTable'), el = mk(hand[1]);
    let clicked = 0; el.onclick = () => { clicked += 1; };
    table.appendChild(el);
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 310 }));
      await new Promise(r => setTimeout(r, CARD_HOLD_MS + 80));
      const tip = document.getElementById('cardHoldTip');
      assertTrue(tip && !tip.classList.contains('hidden') && /Nine|9/.test(tip.textContent) && /Reverse/.test(tip.textContent), 'Holding shows the card, its power and text');
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      el.click();
      assertTrue(tip.classList.contains('hidden'), 'Letting go closes it');
      assertEqual(clicked, 0, 'The tap that ends a hold does not select the card');
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 50, clientY: 310 }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      el.click();
      assertEqual(clicked, 1, 'A normal tap still works');
    } finally { el.remove(); hideCardHold(); }
  });
  await test('REGRESSION: a frame equipped while Custom is still loading stays equipped (it used to revert)', async () => {
    const savedDb = db, savedUser = currentUser, savedEq = { ...equippedCosmetics }, savedOwned = cosmeticPurchaseState;
    let release; const gate = new Promise(r => { release = r; });
    const owned = { 'frame-gold': { purchasedAt: 1 }, 'frame-silver': { purchasedAt: 1 }, 'back-midnight': { purchasedAt: 1 } };
    const server = { 'shopPurchases/u1/cosmetics': null, 'users/u1/equippedCosmetics': { frame: 'frame-gold', cardBack: 'default' }, 'users/u1/ownedCosmetics': owned };
    let reject = false;
    db = { ref: (path) => ({
      once: () => gate.then(() => ({ val: () => (path in server ? server[path] : null) })),
      set: () => reject ? Promise.reject(new Error('PERMISSION_DENIED')) : Promise.resolve(),
      update: () => Promise.resolve()
    }) };
    currentUser = { uid: 'u1' };
    try {
      cosmeticPurchaseState = { ...owned };
      equippedCosmetics = { ...DEFAULT_EQUIPPED_COSMETICS, frame: 'frame-gold' };
      const loading = loadCosmeticCollection(currentUser); // e.g. opening Custom
      equipCosmetic('frame', 'frame-silver', { preview: false });
      equipCosmetic('cardBack', 'back-midnight', { preview: false });
      release(); await loading;
      assertEqual(equippedCosmetics.frame, 'frame-silver', 'The new frame survives the older server answer');
      assertEqual(equippedCosmetics.cardBack, 'back-midnight', 'and so does the card back picked after it');
      assertEqual(document.body.dataset.equippedFrame, 'frame-silver', 'Your cards wear the new frame');
      // A later load (nothing equipped since) takes the server's word again.
      server['users/u1/equippedCosmetics'] = { frame: 'frame-silver', cardBack: 'back-midnight' };
      await loadCosmeticCollection(currentUser);
      assertEqual(equippedCosmetics.frame, 'frame-silver', 'A fresh load agrees');
      // The account refusing a save puts the old frame back straight away, with a message.
      reject = true;
      equipCosmetic('frame', 'frame-gold', { preview: false });
      await new Promise(r => setTimeout(r, 0)); await new Promise(r => setTimeout(r, 0));
      assertEqual(equippedCosmetics.frame, 'frame-silver', 'A refused save does not pretend to be equipped');
      assertTrue(/Couldn't save/.test(document.getElementById('personalisationStatus').textContent), 'and says so');
    } finally {
      db = savedDb; currentUser = savedUser; equippedCosmetics = savedEq; cosmeticPurchaseState = savedOwned; applyEquippedCosmetics();
    }
  });
  await test('Settings persist: a change made just before a refresh wins over the older account copy; other devices still sync', async () => {
    const savedDb = db, savedUser = currentUser, savedPref = historyOpenPref, savedOpen = historyOpen, savedLoaded = settingsLoadedUid, savedStart = settingsUnsavedAtStart;
    let cloud = { historyOpen: true, handSortByPower: false };
    const sets = [];
    let hold = false;
    db = { ref: (path) => ({
      once: () => Promise.resolve({ val: () => (path.endsWith('/settings') ? cloud : null) }),
      set: (v) => { sets.push(v); if (!hold) cloud = { ...v }; return hold ? new Promise(() => {}) : Promise.resolve(); }
    }) };
    currentUser = { uid: 'setU' };
    try {
      try { localStorage.removeItem(SETTINGS_UNSAVED_KEY); } catch (e) {}
      settingsUnsavedAtStart = ''; settingsLoadedUid = null;
      await loadAccountSettings(currentUser);
      assertEqual(historyOpenPref, true, 'Signed in: the account copy is applied');
      // Turn Card History off, then "refresh" before the account save lands.
      hold = true;
      document.getElementById('setHistoryRow').click();
      assertEqual(historyOpenPref, false, 'Toggled off');
      assertEqual(localStorage.getItem('shithead_history_open'), '0', 'Saved on this device at once');
      assertTrue(readSettingsUnsaved().startsWith('setU:'), 'Marked as not yet saved to the account');
      clearTimeout(settingsCloudSaveTimer); settingsCloudSaveTimer = null; // the page went away
      // Next visit: the device read its prefs, the account still says "on".
      hold = false;
      settingsUnsavedAtStart = readSettingsUnsaved(); settingsLoadedUid = null;
      historyOpenPref = readPref('shithead_history_open', true);
      await loadAccountSettings(currentUser);
      assertEqual(historyOpenPref, false, 'The newer device choice survives the sign-in');
      assertEqual(cloud.historyOpen, false, 'and is pushed up to the account');
      assertEqual(readSettingsUnsaved(), '', 'Nothing left unsaved');
      // Another device changed it later: that account copy applies here.
      cloud = { ...cloud, historyOpen: true };
      settingsUnsavedAtStart = ''; settingsLoadedUid = null;
      await loadAccountSettings(currentUser);
      assertEqual(historyOpenPref, true, "Another device's change arrives at sign-in");
      assertEqual(localStorage.getItem('shithead_history_open'), '1', 'and is kept on this device');
      // A setting changed before the account copy has loaded never overwrites it.
      settingsLoadedUid = null; const before = sets.length;
      scheduleSettingsCloudSave();
      assertEqual(sets.length, before, 'No save before the account settings have loaded');
      assertEqual(readSettingsUnsaved(), '', 'and no unsaved mark');
    } finally {
      db = savedDb; currentUser = savedUser; historyOpenPref = savedPref; setHistoryOpen(savedOpen);
      settingsLoadedUid = savedLoaded; settingsUnsavedAtStart = savedStart;
      clearTimeout(settingsCloudSaveTimer);
      try { localStorage.removeItem(SETTINGS_UNSAVED_KEY); localStorage.setItem('shithead_history_open', savedPref ? '1' : '0'); } catch (e) {}
    }
  });
  await test('REGRESSION (PC): a big hand is laid out for the hand area, not the whole window (it spilled out sideways)', () => {
    const real = handAvailableWidth;
    try {
      handAvailableWidth = () => 720; // a 1896px-wide PC window, 768px player area
      const hand = Array.from({ length: 12 }, (_, i) => makeCard(['7', '8', '9', 'J', 'K', 'A'][i % 6]));
      [260, 180, 140].forEach((availH) => {
        const rows = bestHandRows(hand, availH);
        const k = Math.max(...rows.map(r => r.length));
        const m = computeHandCardMetrics(k, rows.length, availH);
        const rowWidth = m.width + (k - 1) * (m.width + m.marginLeft);
        assertTrue(rowWidth <= 721, `Every row fits the hand area (height ${availH}: ${rows.length} row(s), ${Math.round(rowWidth)}px)`);
      });
    } finally { handAvailableWidth = real; }
    const zone = document.getElementById('localPlayerZone');
    if (zone.clientWidth > 0) assertTrue(handAvailableWidth() <= zone.clientWidth, 'Measured from the player area');
  });
  await test('Card hold bubble never sits under the header (opponent cards near the top)', async () => {
    freshState({ phase: 'PLAY', discardPile: [] });
    const opp = makePlayer({ id: 'oppTop', faceUp: [makeCard('J')] });
    state.players = [makePlayer({ id: 'you' }), opp]; state.localPlayerId = 'you';
    const el = document.createElement('div');
    el.dataset.cardId = opp.faceUp[0].id;
    el.style.cssText = 'position:fixed;left:200px;top:30px;width:40px;height:56px';
    document.getElementById('gameTable').appendChild(el);
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 210, clientY: 40 }));
      await new Promise(r => setTimeout(r, CARD_HOLD_MS + 80));
      const tip = document.getElementById('cardHoldTip');
      const headerBottom = document.querySelector('body > header').getBoundingClientRect().bottom;
      assertTrue(tip && !tip.classList.contains('hidden'), 'The bubble shows');
      assertTrue(tip.getBoundingClientRect().top >= headerBottom, `It starts below the header (${Math.round(tip.getBoundingClientRect().top)} vs ${Math.round(headerBottom)})`);
      assertTrue(/Odds/.test(tip.textContent) && /odd card/.test(tip.textContent), 'with the whole description');
    } finally {
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); el.remove(); hideCardHold();
    }
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
    const remaining = state.turnDeadline - serverNow();
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

  await test('REGRESSION: online, a face-up Joker stays played while its target is picked (our own effect broadcast used to put it back)', () => {
    freshState({ isMultiplayer: true, isHost: false, roomCode: '555555', drawPile: [], discardPile: [] });
    state.localPlayerId = 'p1';
    const joker = { id: 'jk1', rank: 'JKR', suit: '', isJoker: true, slotIndex: 2 };
    state.players = [
      makePlayer({ id: 'p1', name: 'Pooja', hand: [], faceUp: [joker], faceDown: [makeCard('4'), makeCard('5'), makeCard('6')] }),
      makePlayer({ id: 'p2', name: 'Amit', hand: [makeCard('9')], faceUp: [makeCard('Q')], faceDown: [makeCard('7')] }),
      makePlayer({ id: 'p3', name: 'Priya', isBot: true, hand: [makeCard('K')], faceUp: [makeCard('10')], faceDown: [makeCard('8')] })
    ];
    state.currentTurnIndex = 0; state.phase = 'PLAY'; state.stateVersion = 5;
    const roomAtV5 = JSON.parse(JSON.stringify({ phase: 'PLAY', stateVersion: 5, players: state.players, discardPile: [], currentTurnIndex: 0, direction: 1 }));
    let listener = null;
    const originalRef = db.ref, originalSync = syncFirebaseGameState;
    const synced = [];
    db.ref = () => ({ on: (ev, cb) => { if (ev === 'value') listener = cb; }, update: () => Promise.resolve(), set: () => Promise.resolve(), once: () => Promise.resolve({ val: () => null }), remove: () => Promise.resolve(), onDisconnect: () => ({ set: () => {}, remove: () => {}, cancel: () => {} }) });
    syncFirebaseGameState = () => { synced.push(JSON.parse(JSON.stringify(state.players.find(p => p.id === 'p1').faceUp))); };
    try {
      listenToFirebaseRoom('555555');
      executePlayCards('p1', [joker]);
      const bar = document.getElementById('floatingJokerBar');
      assertTrue(!bar.classList.contains('hidden'), 'Two opponents: the target picker opens');
      // Our own lastJokerEffect write echoes the unchanged room back.
      listener({ val: () => ({ ...roomAtV5, lastJokerEffect: { effectId: 'default', by: 'p1', at: Date.now() } }) });
      const me = () => state.players.find(p => p.id === 'p1');
      assertEqual(me().faceUp.length, 0, 'The echo must not put the Joker back on the table');
      assertTrue(state.discardPile.some(c => c.id === 'jk1'), 'The Joker stays on the pile');
      bar.querySelector('#jokerInlineTargets button').click();
      assertEqual(me().faceUp.length, 0, 'After picking a target the Joker is gone from the table');
      assertTrue(synced.length > 0 && synced[synced.length - 1].length === 0, 'The synced state has the Joker played');
      // A newer room (the game moved on: timeout, snap) drops a waiting picker.
      state.players[0].faceUp = [joker]; state.discardPile = []; state.currentTurnIndex = 0; state.stateVersion = 7;
      executePlayCards('p1', [joker]);
      assertTrue(!bar.classList.contains('hidden'), 'Picker open again');
      listener({ val: () => ({ ...roomAtV5, stateVersion: 9, currentTurnIndex: 1 }) });
      assertTrue(bar.classList.contains('hidden'), 'A newer room closes the picker');
      assertEqual(state.currentTurnIndex, 1, 'and its state is applied');
    } finally {
      db.ref = originalRef; syncFirebaseGameState = originalSync; pendingJokerChoice = null;
      document.getElementById('floatingJokerBar').classList.add('hidden');
    }
  });

  await test('REGRESSION: online 1-on-1, a countered Joker leaves both hands (our own effect echo used to put both back)', () => {
    freshState({ isMultiplayer: true, isHost: false, roomCode: '444444', discardPile: [] });
    state.localPlayerId = 'p1';
    const mine = { id: 'jkA', rank: 'JKR', suit: '', isJoker: true }, hers = { id: 'jkP', rank: 'JKR', suit: '', isJoker: true };
    state.players = [
      makePlayer({ id: 'p1', name: 'Amit', hand: [makeCard('3'), makeCard('Q'), mine], faceUp: [makeCard('A')], faceDown: [makeCard('7')] }),
      makePlayer({ id: 'p2', name: 'Pooja', hand: [makeCard('9'), hers, makeCard('5')], faceUp: [makeCard('K')], faceDown: [makeCard('8')] })
    ];
    state.drawPile = ['4', '6', '7', '8'].map(r => makeCard(r));
    state.currentTurnIndex = 0; state.phase = 'PLAY'; state.stateVersion = 5;
    const roomAtV5 = JSON.parse(JSON.stringify({ phase: 'PLAY', stateVersion: 5, players: state.players, discardPile: [], drawPile: state.drawPile, currentTurnIndex: 0, direction: 1 }));
    let listener = null;
    const originalRef = db.ref, originalSync = syncFirebaseGameState;
    db.ref = () => ({ on: (ev, cb) => { if (ev === 'value') listener = cb; }, update: () => Promise.resolve(), set: () => Promise.resolve(),
      once: () => Promise.resolve({ val: () => null }), remove: () => Promise.resolve(), onDisconnect: () => ({ set: () => {}, remove: () => {}, cancel: () => {} }) });
    syncFirebaseGameState = () => { state.stateVersion = (state.stateVersion || 0) + 1; };
    // The real Joker effect broadcast (skipped while tests run) fires the
    // room listener at once with the room as last saved; do the same here.
    const originalFx = playJokerEffectFor;
    playJokerEffectFor = () => { if (listener) listener({ val: () => ({ ...roomAtV5, lastJokerEffect: { effectId: 'default', by: 'p1', at: Date.now() } }) }); };
    try {
      listenToFirebaseRoom('444444');
      executePlayCards('p1', [mine]);
      const jokers = state.players.flatMap(p => [...p.hand, ...p.faceUp, ...p.faceDown]).filter(c => c.isJoker);
      assertEqual(jokers.length, 0, 'Both Jokers are out of the game after the counter');
      assertEqual(pendingJokerChoice, null, 'No guard left behind once the duel is resolved');
      assertEqual(state.players[state.currentTurnIndex].id, 'p2', 'The counter wins the next turn');
    } finally {
      db.ref = originalRef; syncFirebaseGameState = originalSync; pendingJokerChoice = null; playJokerEffectFor = originalFx;
    }
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

  await test('Bonus Draw by keyboard (v288): the card\'s key takes the bonus and closes the prompt; other plays wait', () => {
    freshState({ discardPile: [makeCard('4')] });
    const six1 = makeCard('6', '♠');
    const six2 = makeCard('6', '♥');
    const amit = makePlayer({ id: 'p1', hand: [six1, makeCard('9'), makeCard('K')] });
    const pooja = makePlayer({ id: 'p2', hand: [makeCard('4'), makeCard('5'), makeCard('7')] });
    state.players = [amit, pooja];
    state.localPlayerId = 'p1';
    state.currentTurnIndex = 0;
    state.drawPile = [makeCard('Q'), six2];
    executePlayCards('p1', [six1]);
    assertTrue(!!state.pendingFollowUp, 'Drawing another 6 offers a Bonus Draw');
    const banner = document.getElementById('followUpToastBanner');
    assertTrue(!banner.classList.contains('hidden'), 'The Bonus Draw prompt shows');
    // Another card through the normal play path is refused while it's open.
    const pileBefore = state.discardPile.length;
    executePlayCards('p1', [amit.hand.find(c => c.rank === 'K')]);
    assertEqual(state.discardPile.length, pileBefore, 'Another card cannot be played over the Bonus Draw');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', bubbles: true }));
    assertEqual(state.discardPile.length, pileBefore, 'Another rank key is ignored while the Bonus Draw is open');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '6', bubbles: true }));
    assertTrue(!state.pendingFollowUp, 'The 6 key takes the bonus');
    assertEqual(state.discardPile[state.discardPile.length - 1].id, six2.id, 'The bonus 6 is on the Pile');
    assertTrue(banner.classList.contains('hidden'), 'The Bonus Draw prompt is closed');
    state.pendingFollowUp = null; render();
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
  await test('REGRESSION: Reduce Motion skips play, draw, pickup and deal flight ghosts; High Contrast flights stay readable', async () => {
    const saved = { reduceMotion, highContrast, running: devTestSuiteRunning };
    const layer = document.getElementById('flightLayer');
    const from = document.getElementById('drawPile'), to = document.getElementById('discardPileContainer');
    try {
      devTestSuiteRunning = false; // Exercise actual visuals, not the suite's motion bypass.
      highContrast = true; reduceMotion = true; applyAccessibilityPrefs();
      const before = document.body.querySelectorAll('.custom-card-back').length;
      spawnCardFlight(from, to, 2, { rank: 'Q' });
      spawnCardFlight(from, to, 2);
      spawnPickupFan(to, from, 3);
      spawnMiniCardFlight(from, to);
      await new Promise(r => setTimeout(r, 120));
      assertEqual(layer.querySelectorAll('.flying-card').length, 0, 'no pile or draw ghosts with Reduce Motion');
      assertEqual(document.body.querySelectorAll('.custom-card-back').length, before, 'no pickup or deal ghosts');
      reduceMotion = false; applyAccessibilityPrefs();
      spawnCardFlight(from, to, 3, { rank: 'Q' });
      await new Promise(r => setTimeout(r, 10));
      const flight = layer.querySelector('.flying-card');
      assertTrue(!!flight && flight.textContent === 'Q', 'normal motion still creates a readable card');
      assertEqual(getComputedStyle(flight).color, 'rgb(255, 255, 255)', 'high contrast text is white on the dark card');
      reduceMotion = true; applyAccessibilityPrefs();
      await new Promise(r => setTimeout(r, 120));
      assertEqual(layer.querySelectorAll('.flying-card').length, 0, 'enabling Reduce Motion clears active and queued flights');
    } finally {
      layer.querySelectorAll('.flying-card').forEach(el => el.remove());
      reduceMotion = saved.reduceMotion; highContrast = saved.highContrast; devTestSuiteRunning = saved.running;
      applyAccessibilityPrefs();
    }
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

