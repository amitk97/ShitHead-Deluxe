    // § Tutorial
    let tutorialActive = false;
    let tutorialStep = 0;
    let tutorialBotPaused = false;   // blocks the Coach until the step says go
    // When true, a burn triggered inside executePlayCards is captured as
    // state.pendingTutorialBurn instead of executing immediately — used to
    // pause on the burning card long enough to explain it before it happens.
    let tutorialDeferBurn = false;
    // True from the moment a step begins until its required action actually
    // happens — gates glows that only make sense BEFORE the play (like the
    // Base Card indicator), so they don't linger through the explanation
    // afterward once they're no longer relevant.
    let tutorialAwaitingAction = true;
    // Set by a paused wave: when present, the Continue button calls this
    // instead of advancing to the next step (which then itself decides what
    // happens next — resolving the deferred burn, playing the next wave, etc).
    let tutorialPendingContinueAction = null;
    let tutorialSnapshots = [];      // board as it was when each step first began
    let tutorialTimers = [];

    function tutorialClearTimers() {
      tutorialTimers.forEach(t => clearTimeout(t));
      tutorialTimers = [];
    }
    function tutorialDelay(fn, ms) {
      const t = setTimeout(() => { if (tutorialActive) fn(); }, ms);
      tutorialTimers.push(t);
      return t;
    }

    const C = (rank, suit) => ({ id: `tut_${rank}${suit}_${Math.random().toString(36).slice(2,8)}`, rank, suit, isJoker: rank === 'JOKER' });

    // Each scenario defines the board, what the player must do, and how the
    // Coach replies. `require` is what the player has to play to move on.

    // ===== TUTORIAL STEPS =====
    // Steps 1-6 are a self-contained intro + swap-phase practice — a small,
    // disposable scene like every non-stacked scene in this file, replaced
    // outright the moment Step 7 deals in.
    //
    // Steps 7-20 are ONE continuous hand, dealt once at Step 7 and never
    // re-scened until Step 16 — the draw pile is a hand-picked, ordered
    // stack (see scene.drawPile on Step 7) so every card anyone draws is
    // exactly the card the next lesson needs. Step 16 is a deliberate full
    // reset ("we're starting a fresh hand now that you know the ropes") into
    // a second stacked mini-deal for the endgame tiers, Steps 17-23.
    //
    // Every card used across BOTH deals is unique (verified: see the
    // "TUTORIAL AUDIT: stacked deck has no duplicate cards" dev test) —
    // suits are chosen so no rank is dealt more than 4 times (2 for Jokers)
    // and no exact rank+suit pair is ever reused, with ONE deliberate
    // exception: the Coach's 5♦ at Step 17 is picked back up during the
    // Joker duel at Step 18 and genuinely is the same physical card when it
    // reappears at Step 23 — not a duplicate, a card actually changing hands.
    // TUTORIAL_STEPS is intentionally `let`, not `const`: startTutorial() can
    // point it at any module's step array (see TUTORIAL_MODULE_* below) while
    // every existing engine function keeps reading from this one variable
    // unchanged. TUTORIAL_STEPS_FULL_LEGACY is the original all-in-one walkthrough,
    // kept as the fallback default until it's fully broken up into modules.
    // Static definitions loaded from tutorial-data.js.
    // The engine below reads/writes this variable, never the legacy array
    // directly, so startTutorial(moduleSteps) can swap in any module here.
    let TUTORIAL_STEPS = TUTORIAL_STEPS_FULL_LEGACY;

    // Static definitions loaded from tutorial-data.js.
    function getTutorialHubCollapsePrefs() {
      try { return JSON.parse(localStorage.getItem('shithead_tutorial_hub_collapsed') || '{}'); }
      catch (e) { return {}; }
    }

    function setTutorialHubCollapsePref(section, collapsed) {
      try {
        const prefs = getTutorialHubCollapsePrefs();
        prefs[section] = collapsed;
        localStorage.setItem('shithead_tutorial_hub_collapsed', JSON.stringify(prefs));
      } catch (e) {
        // Private browsing / storage disabled: the toggle still works for
        // this session via applyTutorialHubSectionState, it just won't be
        // remembered next time the Hub opens.
      }
    }

    // A section collapses automatically the moment every module inside it
    // is done — UNLESS the person has explicitly opened or closed it
    // themselves at some point, in which case that choice always wins over
    // the automatic rule, even if progress changes later.
    function isTutorialHubSectionCollapsed(section, allDone) {
      const prefs = getTutorialHubCollapsePrefs();
      if (prefs[section] !== undefined) return prefs[section];
      return allDone;
    }

    function applyTutorialHubSectionState(section, collapsed, doneCount, total) {
      const header = document.querySelector(`.tutorial-hub-section-header[data-section="${section}"]`);
      if (!header) return;
      const body = header.nextElementSibling;
      const chevron = header.querySelector('.section-chevron');
      const countLabel = header.querySelector('.section-count');
      if (body) body.classList.toggle('hidden', collapsed);
      if (chevron) chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
      if (countLabel) countLabel.textContent = `${doneCount}/${total}`;
    }

    function getTutorialProgress() {
      try { return JSON.parse(localStorage.getItem('shithead_tutorial_progress') || '{}'); }
      catch (e) { return {}; }
    }

    function getAllTutorialModuleIds() {
      const builtCards = TUTORIAL_CARD_ROSTER.filter(c => c.steps);
      return [...TUTORIAL_HUB_MODULES, ...TUTORIAL_HUB_ADVANCED_MODULES, ...builtCards].map(m => m.id);
    }
    function hasCompletedFullTutorialLocally() {
      const ids = getAllTutorialModuleIds();
      const progress = getTutorialProgress();
      return ids.length > 0 && ids.every((id) => progress[id]);
    }
    // Tutorial challenges: Quick Starter (50) for Quick Start; Tutorial
    // Graduate (200) once Quick Start AND every hub lesson are done. Safe
    // to call any time: claimChallenge pays each one only once.
    let accountTutorialLessonsDone = false; // users/{uid}/tutorialCompleted, set at load
    function syncTutorialChallenges() {
      if (typeof currentUser === 'undefined' || !currentUser) return Promise.resolve(false);
      const completed = (challengeEconomy && challengeEconomy.completedChallenges) || {};
      const quickDone = !!getTutorialProgress().quick_start || !!completed[QUICK_START_CHALLENGE.id];
      const lessonsDone = accountTutorialLessonsDone || hasCompletedFullTutorialLocally();
      let chain = Promise.resolve();
      if (lessonsDone && !accountTutorialLessonsDone) {
        accountTutorialLessonsDone = true;
        chain = db.ref(`users/${currentUser.uid}/tutorialCompleted`).set(true)
          .catch((e) => console.warn('tutorialCompleted sync failed', e));
      }
      if (quickDone) {
        chain = chain.then(() => claimChallenge(QUICK_START_CHALLENGE.id, QUICK_START_CHALLENGE.reward, QUICK_START_CHALLENGE.name));
      }
      if (quickDone && lessonsDone) {
        chain = chain.then(() => claimChallenge(TUTORIAL_COMPLETION_CHALLENGE.id, TUTORIAL_COMPLETION_CHALLENGE.reward, TUTORIAL_COMPLETION_CHALLENGE.name));
      }
      return chain;
    }
    function awardTutorialCompletionChallenge() {
      if (typeof currentUser === 'undefined' || !currentUser) return Promise.resolve(false);
      return initChallengeEconomy().then(() => syncTutorialChallenges());
    }
    function markTutorialModuleComplete(id) {
      if (!id) return;
      try {
        const progress = getTutorialProgress();
        progress[id] = true;
        localStorage.setItem('shithead_tutorial_progress', JSON.stringify(progress));
        // Account sync: only once, only when every module is actually done —
        // not on every single module completion, and only for a signed-in
        // player, since there's nowhere persistent to log it against
        // otherwise. currentUser/db are declared further down this same
        // script but already assigned by the time any tutorial step can
        // possibly complete (that requires the page to have fully loaded
        // and a person to have clicked through it).
        const allIds = getAllTutorialModuleIds();
        const lessonsDone = allIds.length > 0 && allIds.every((mid) => progress[mid]);
        if (typeof currentUser !== 'undefined' && currentUser && (id === 'quick_start' || lessonsDone)) {
          awardTutorialCompletionChallenge()
            .catch((e) => console.warn('Tutorial completion reward sync failed', e));
        }
      } catch (e) {
        // Private browsing / storage disabled: the Hub just won't show a
        // checkmark next time. Harmless — every module still works fine.
      }
    }

    function buildTutorialHubRow(mod, done) {
      const row = document.createElement('button');
      row.className = 'w-full flex items-center justify-between gap-2 p-2.5 bg-slate-900/70 hover:bg-slate-800 active:scale-[0.98] border border-slate-700 hover:border-amber-500/60 rounded-xl transition text-left cursor-pointer';
      row.innerHTML = `
        <span class="min-w-0">
          <span class="flex items-center gap-1.5">
            <span class="text-[11px] font-black text-slate-100">${mod.title}</span>
            ${done ? '<span class="text-emerald-400 text-[10px] font-black" aria-label="Completed">&#10003;</span>' : ''}
          </span>
          <span class="block text-[8.5px] text-slate-400 leading-snug">${mod.desc} &middot; ${mod.time}</span>
        </span>
        <span class="shrink-0 text-amber-400 text-[9px] font-black uppercase tracking-wider">${done ? 'Replay' : 'Start'}</span>
      `;
      row.addEventListener('click', () => launchTutorialModule(mod.id));
      return row;
    }

    function buildTutorialCardTile(card, done) {
      const btn = document.createElement('button');
      const built = !!card.steps;
      btn.className = built
        ? 'aspect-square flex flex-col items-center justify-center gap-0.5 bg-slate-900/70 hover:bg-slate-800 active:scale-95 border border-slate-700 hover:border-amber-500/60 rounded-lg transition cursor-pointer'
        : 'aspect-square flex flex-col items-center justify-center gap-0.5 bg-slate-900/30 border border-dashed border-slate-800 rounded-lg cursor-default opacity-50';
      btn.innerHTML = `
        <span class="text-[12px] font-black ${built ? 'text-amber-400' : 'text-slate-600'}">${card.label}</span>
        ${built ? (done ? '<span class="text-emerald-400 text-[8px] font-black">&#10003;</span>' : '<span class="text-slate-500 text-[7px] font-bold uppercase">Tap</span>') : '<span class="text-slate-700 text-[7px] font-bold uppercase">Soon</span>'}
      `;
      if (built) btn.addEventListener('click', () => launchTutorialModule(card.id));
      else btn.disabled = true;
      return btn;
    }

    function renderTutorialCardGrid() {
      const grid = document.getElementById('tutorialHubCardGrid');
      if (!grid) return;
      const progress = getTutorialProgress();
      grid.innerHTML = '';
      TUTORIAL_CARD_ROSTER.forEach(card => grid.appendChild(buildTutorialCardTile(card, !!progress[card.id])));
    }

    function renderTutorialHub() {
      const progress = getTutorialProgress();
      const quick = document.getElementById('tutorialHubQuickStart');
      if (quick) {
        quick.innerHTML = '';
        const row = buildTutorialHubRow(QUICK_START_MODULE, !!progress[QUICK_START_MODULE.id]);
        row.classList.add('tutorial-quick-row');
        quick.appendChild(row);
      }
      const coreList = document.getElementById('tutorialHubCoreList');
      if (coreList) {
        coreList.innerHTML = '';
        TUTORIAL_HUB_MODULES.forEach(mod => coreList.appendChild(buildTutorialHubRow(mod, !!progress[mod.id])));
      }
      const coreDone = TUTORIAL_HUB_MODULES.filter(m => progress[m.id]).length;
      applyTutorialHubSectionState('core', isTutorialHubSectionCollapsed('core', coreDone === TUTORIAL_HUB_MODULES.length), coreDone, TUTORIAL_HUB_MODULES.length);

      const advList = document.getElementById('tutorialHubAdvancedList');
      if (advList) {
        advList.innerHTML = '';
        TUTORIAL_HUB_ADVANCED_MODULES.forEach(mod => advList.appendChild(buildTutorialHubRow(mod, !!progress[mod.id])));
      }
      const advDone = TUTORIAL_HUB_ADVANCED_MODULES.filter(m => progress[m.id]).length;
      applyTutorialHubSectionState('advanced', isTutorialHubSectionCollapsed('advanced', advDone === TUTORIAL_HUB_ADVANCED_MODULES.length), advDone, TUTORIAL_HUB_ADVANCED_MODULES.length);

      renderTutorialCardGrid();
      const builtCards = TUTORIAL_CARD_ROSTER.filter(c => c.steps);
      const cardsDone = builtCards.filter(c => progress[c.id]).length;
      applyTutorialHubSectionState('cards', isTutorialHubSectionCollapsed('cards', builtCards.length > 0 && cardsDone === builtCards.length), cardsDone, builtCards.length);

      // Overall count across every registry — the card roster only counts
      // entries that actually have a built module, so it never claims
      // credit for a "Soon" tile the player couldn't possibly have done.
      const allIds = [
        ...TUTORIAL_HUB_MODULES,
        ...TUTORIAL_HUB_ADVANCED_MODULES,
        ...builtCards
      ].map(m => m.id);
      const doneCount = allIds.filter(id => progress[id]).length;
      const label = document.getElementById('tutorialHubProgressLabel');
      if (label) label.textContent = `${doneCount} / ${allIds.length} complete`;
    }

    function openTutorialHubInternal() {
      renderTutorialHub();
      document.getElementById('tutorialHubScreen')?.classList.remove('hidden');
    }

    function openTutorialHub() {
      openTutorialHubInternal();
    }

    function closeTutorialHub() {
      document.getElementById('tutorialHubScreen')?.classList.add('hidden');
    }

    // Set the instant a module is launched FROM the Hub, and read by
    // endTutorial() below to decide whether finishing/skipping a module
    // should land back on the Hub (with its checkmark now set) rather than
    // the bare lobby screen.
    let tutorialLaunchedFromHub = false;
    let tutorialCurrentModuleId = null;
    let tutorialCurrentModuleTitle = '';

    function launchTutorialModule(id, { fromHub = true } = {}) {
      const mod = (id === QUICK_START_MODULE.id ? QUICK_START_MODULE : null)
        || TUTORIAL_HUB_MODULES.find(m => m.id === id)
        || TUTORIAL_HUB_ADVANCED_MODULES.find(m => m.id === id)
        || TUTORIAL_CARD_ROSTER.find(m => m.id === id && m.steps);
      if (!mod) return;
      tutorialLaunchedFromHub = fromHub;
      tutorialCurrentModuleId = id;
      // Card Power Reference entries only carry a short "label" (e.g. "2",
      // "JKR") rather than a full title like the other two registries.
      tutorialCurrentModuleTitle = mod.title || (mod.label ? `Card: ${mod.label}` : '');
      closeTutorialHub();
      startTutorial(mod.steps, mod.players || 2);
    }

    function tutorialSnapshot() {
      return JSON.stringify({
        players: state.players, discardPile: state.discardPile, drawPile: state.drawPile,
        playedHistory: state.playedHistory, currentTurnIndex: state.currentTurnIndex,
        direction: state.direction, activeConstraint: state.activeConstraint,
        baseOverrideCard: state.baseOverrideCard, selectedPlayCardIds: state.selectedPlayCardIds,
        pendingFollowUp: state.pendingFollowUp, pendingFaceUpSacrifice: state.pendingFaceUpSacrifice,
        phase: state.phase, selectedSwapHandCardId: state.selectedSwapHandCardId,
        selectedSwapFaceUpSlot: state.selectedSwapFaceUpSlot, selectAllOfRank: selectAllOfRank
      });
    }
    function tutorialRestore(snap) {
      if (!snap) return;
      const d = JSON.parse(snap);
      if (typeof d.selectAllOfRank === 'boolean') {
        selectAllOfRank = d.selectAllOfRank;
        updateMultiSelectToggleUI();
      }
      delete d.selectAllOfRank;
      Object.assign(state, d);
    }

    // Plain ranks a scene isn't using (hand, pile, Coach's cards and plays).
    function tutorialNeutralCards(scene, n, suits, avoidToo = []) {
      const used = new Set(avoidToo);
      [scene.hand, scene.pile, scene.coach, scene.rival, scene.drawPile].forEach(list => (list || []).forEach(([r]) => used.add(r)));
      const plays = TUTORIAL_STEPS.flatMap(st => [].concat(st.coachPlays || []));
      JSON.stringify(plays).replace(/"(10|[2-9JQKA]|JOKER)"/g, (m, r) => { used.add(r); return m; });
      TUTORIAL_STEPS.forEach(st => [].concat(st.require?.rank || []).forEach(r => used.add(r)));
      const pool = ['K', 'Q', 'J', '8', '5', '9', '6', '4', 'A'].filter(r => !used.has(r));
      return pool.slice(0, n).map((r, i) => ({ ...C(r, suits[i % suits.length]), slotIndex: i }));
    }
    function tutorialApplyScene(scene) {
      const you = state.players[0], coach = state.players[1];
      // Only present in modules that asked startTutorial for a 3rd seat
      // (see playerCount) — every 2-player module leaves this undefined and
      // simply never sets scene.rival*, so this is a pure capability add.
      const rival = state.players[2];
      if (scene.hand) you.hand = scene.hand.map(([r, s]) => C(r, s));
      // A scene that sets a hand but not the table cards used to keep the
      // random deal's Face-Up row, which could show the very rank the step
      // asks for (a locked 5 beside "Play your 5!"). Fill such rows with
      // calm ranks the step doesn't use.
      // (An empty scene hand means "carry on from the table as it is".)
      const dealsHand = !!(scene.hand && scene.hand.length);
      if (dealsHand && !scene.faceUp) you.faceUp = tutorialNeutralCards(scene, 3, ['♣', '♥', '♠']);
      if (dealsHand && !scene.coachFaceUp) coach.faceUp = tutorialNeutralCards(scene, 3, ['♦', '♠', '♥'], you.faceUp.map(c => c.rank));
      // Rival too (3-seat lessons): the random deal could show a card the
      // lesson has on the Pile (a second K♠ in Snap Burn). Your ranks are
      // allowed again here, but never in the same suit.
      if (dealsHand && rival && !scene.rivalFaceUp) rival.faceUp = tutorialNeutralCards(scene, 3, ['♠', '♦', '♣'], coach.faceUp.map(c => c.rank));
      if (scene.faceUp) you.faceUp = scene.faceUp.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
      if (scene.faceDown) you.faceDown = scene.faceDown.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
      // The Coach's own table cards are never scripted by default, which
      // means without this they'd still be whatever the random shuffle at
      // startTutorial() dealt — invisible, but still real cards that could
      // collide with a rank/suit a scripted step is depending on. Scenes
      // that care (the ones building a fully hand-stacked deck) set these
      // explicitly; scenes that don't leave the Coach's table untouched.
      if (scene.coachFaceUp) coach.faceUp = scene.coachFaceUp.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
      if (scene.coachFaceDown) coach.faceDown = scene.coachFaceDown.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
      if (rival) {
        if (scene.rival) rival.hand = scene.rival.map(([r, s]) => C(r, s));
        if (scene.rivalFaceUp) rival.faceUp = scene.rivalFaceUp.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
        if (scene.rivalFaceDown) rival.faceDown = scene.rivalFaceDown.map(([r, s], i) => ({ ...C(r, s), slotIndex: i }));
      }
      // The endgame tiers only unlock once the DECK is empty too, so scenes
      // teaching them must drain it.
      if (scene.emptyDeck) state.drawPile = [];
      if (scene.coach) coach.hand = scene.coach.map(([r, s]) => C(r, s));
      if (scene.pile) {
        state.discardPile = scene.pile.map(([r, s]) => C(r, s));
      }
      // A forced toggle state — e.g. a step that assumes "select all of a
      // rank" is already on (or already off) the moment it begins, rather
      // than whatever the player last left it as.
      if (typeof scene.toggle === 'boolean') { selectAllOfRank = scene.toggle; updateMultiSelectToggleUI(); }
      // Each scene is a fresh, self-contained situation, so the play history
      // must be cleared with it. Otherwise the Recent Card History keeps
      // showing moves from earlier steps that have nothing to do with the
      // board now on screen — which is exactly as confusing as it sounds.
      // A scene that seeds the Pile directly gets matching history entries
      // instead of a bare clear — previously the Pile could show a card
      // while the strip still claimed "No cards played yet", which is
      // exactly the inconsistency this fixes. Ownership defaults to the
      // Coach, but each pile entry can carry its own owner as a 3rd tuple
      // element (['7','♦','you']) for scenes that pre-build a multi-card
      // Pile out of alternating plays — falls back to the old whole-Pile
      // scene.pileOwner: 'you' flag when no entry specifies one, so every
      // existing single-owner scene keeps working unchanged.
      const pileOwners = scene.pile
        ? scene.pile.map(entry => entry[2] || (scene.pileOwner === 'you' ? 'you' : 'coach'))
        : [];
      const pileOwnerName = (owner) => owner === 'you' ? you.name : owner === 'rival' ? (rival ? rival.name : coach.name) : coach.name;
      state.playedHistory = scene.pile
        ? state.discardPile.map((c, i) => ({
            type: 'play',
            playerName: pileOwnerName(pileOwners[i]),
            rank: c.rank, suit: c.suit, isJoker: c.isJoker
          }))
        : [];

      // Derive the constraint the top card would really have created, exactly
      // as a live game would. Previously this was forced to null, which made
      // scenes behave differently from the real game — e.g. a 5 looked illegal
      // on a Jack, when in fact a Jack demands an ODD card and 5 qualifies.
      const top = state.discardPile[state.discardPile.length - 1];
      state.activeConstraint = scene.constraint !== undefined
        ? scene.constraint
        : (top ? deriveConstraintFromRank(top.rank) : null);
      state.baseOverrideCard = null;
      state.selectedPlayCardIds = [];
      state.currentTurnIndex = 0;
      // Only set when a scene depends on a particular direction (e.g. Snap
      // Burn's Coach play must pass the turn to Rival); otherwise left alone.
      if (scene.direction !== undefined) state.direction = scene.direction;
      // Show the scene's direction at once (the badge otherwise kept the
      // previous one, so a 9 flipping it looked like it did nothing).
      lastShownDirection = null;
      updateDirectionBadge();

      // Refills come from a controlled supply of cards. A scene that names an
      // exact stack (the hand-stacked continuous lessons) gets exactly that,
      // popped in the order given — drawPile.pop() takes the LAST array
      // element first, so a natural "drawn 1st, 2nd, 3rd..." list is stored
      // reversed here. Anything else falls back to a safe generic filler of
      // low cards so an un-stacked scene can never accidentally draw
      // something that breaks its own commentary.
      if (scene.drawPile) {
        state.drawPile = scene.drawPile.map(([r, s]) => C(r, s)).reverse();
      } else if (!scene.emptyDeck) {
        state.drawPile = ['4', '5', '4', '5', '4', '5', '4', '5', '4', '5', '4', '5']
          .map((r, i) => C(r, ['♦', '♣', '♠', '♥'][i % 4]));
      }

      // A scene only scripts the hand, pile and Coach — the table cards are
      // leftover filler from the deal. That filler can duplicate a scripted
      // rank and push the total past what a real deck holds (the burn lesson
      // needs all four 9s, so a stray 9 on the table made five). Swap any
      // over-quota filler for a rank that isn't in play.
      if (!scene.drawPile) {
        const quota = {};
        const tally = (arr) => (arr || []).forEach(c => { quota[c.rank] = (quota[c.rank] || 0) + 1; });
        tally(state.discardPile); tally(you.hand); tally(coach.hand);
        const limitFor = (r) => (r === 'JOKER' ? 2 : 4);
        const spareRanks = ['Q', 'K', 'A', 'J', '6', '7', '8', '4', '5', '2'];
        const swapIfOver = (card) => {
          if ((quota[card.rank] || 0) < limitFor(card.rank)) {
            quota[card.rank] = (quota[card.rank] || 0) + 1;
            return card;
          }
          const spare = spareRanks.find(r => (quota[r] || 0) < limitFor(r));
          if (!spare) return card;
          quota[spare] = (quota[spare] || 0) + 1;
          return { ...C(spare, card.suit), slotIndex: card.slotIndex };
        };
        you.faceUp = (you.faceUp || []).map(swapIfOver);
        you.faceDown = (you.faceDown || []).map(swapIfOver);
      }
    }

    let tutorialPrevSelectAll = null;
    function startTutorial(moduleSteps, playerCount = 2) {
      TUTORIAL_STEPS = moduleSteps || TUTORIAL_STEPS_FULL_LEGACY;
      tutorialActive = true;
      document.body.classList.add('tutorial-on');
      tutorialStep = 0;
      tutorialSnapshots = [];
      tutorialPrevSelectAll = selectAllOfRank;
      tutorialBotPaused = true;
      tutorialClearTimers();

      state.isMultiplayer = false; state.isHost = false; state.roomCode = null;
      state.difficulty = 'easy'; state.selectedBotCount = 1;
      state.phase = 'PLAY'; state.direction = 1; state.currentTurnIndex = 0;
      state.discardPile = []; state.playedHistory = [];
      state.activeConstraint = null; state.baseOverrideCard = null;
      state.lastJokerInitiatorId = null;
      state.jokerTurnOwnerId = null;
      state.jokerTurnLockConsumedPending = false;
      state.selectedSacrificeIds = []; state.selectedPlayCardIds = [];
      state.turnDeadline = null; state.localPlayerId = 'tut_you';

      const localName = document.getElementById('playerNameInput').value.trim() || 'You';
      state.players = [
        // isReady must start FALSE: the swap lesson needs a live "Ready"
        // button, and a pre-readied player renders it disabled as "Waiting...".
        { id: 'tut_you', name: localName, isBot: false, hand: [], faceUp: [], faceDown: [], isReady: false, hasFinished: false, finishRank: null },
        { id: 'tut_bot', name: 'Coach', isBot: true, cosmetics: { cardBack: pickBotCardBack() }, hand: [], faceUp: [], faceDown: [], isReady: true, hasFinished: false, finishRank: null }
      ];
      // A third seat, only for modules that genuinely need one — the Joker
      // Duel lesson can't show a real choice-of-target picker with only one
      // possible opponent to pick.
      if (playerCount >= 3) {
        state.players.push({ id: 'tut_rival', name: 'Rival', isBot: true, cosmetics: { cardBack: pickBotCardBack() }, hand: [], faceUp: [], faceDown: [], isReady: true, hasFinished: false, finishRank: null });
      }
      // Table cards are cosmetic during the tutorial — the lesson is about the
      // hand. A big draw pile keeps the "deck isn't empty" rule intact so
      // face-up cards stay correctly locked throughout.
      // The deck's two Jokers go to the very bottom of the Deck, never onto
      // the table: a lesson's scripted Jokers must be the only ones in play.
      const fullDeck = generateDeck();
      const fillerJokers = fullDeck.filter(c => c.isJoker);
      const filler = fullDeck.filter(c => !c.isJoker);
      state.players.forEach(p => {
        p.faceDown = filler.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i }));
        p.faceUp = filler.splice(0, 3).map((c, i) => ({ ...c, slotIndex: i }));
        p.hand = filler.splice(0, 3);
      });
      state.drawPile = [...fillerJokers, ...filler];

      resetPileInspectHint();
      dismissLobbyAndStart();
      document.getElementById('swapControlBar')?.classList.add('hidden');
      document.getElementById('sacrificeControlBar')?.classList.add('hidden');
      document.getElementById('playActionControls')?.classList.remove('hidden');
      document.getElementById('emoteLayer')?.classList.add('hidden');
      document.getElementById('tutorialLayer').classList.remove('hidden');
      showTutorialStep(0);
    }

    function showTutorialStep(idx) {
      if (!tutorialActive) return;
      if (idx >= TUTORIAL_STEPS.length) { endTutorial(true); return; }
      if (idx < 0) idx = 0;
      tutorialClearTimers();
      tutorialPendingContinueAction = null;
      state.pendingTutorialBurn = null;
      tutorialDeferBurn = false;
      tutorialAwaitingAction = true;
      tutorialStep = idx;
      const step = TUTORIAL_STEPS[idx];
      tutorialBotPaused = true;

      // Re-entering a step (via Back, or replaying it) restores the exact
      // board from when it first began. Continuation steps carry no scene, so
      // this snapshot is the only thing that can undo them.
      if (tutorialSnapshots[idx]) {
        tutorialRestore(tutorialSnapshots[idx]);
      } else {
        if (step.scene) tutorialApplyScene(step.scene);
        tutorialSnapshots[idx] = tutorialSnapshot();
      }
      state.selectedPlayCardIds = [];
      // Almost every step is framed as the player's own turn (index 0). Snap
      // Burn is the one exception that needs to visibly NOT be your turn —
      // that's the entire point of the lesson — so a step can override this
      // via turnIndex. tutorialBotPaused (set above) already prevents any
      // bot from actually acting regardless of which index this is.
      state.currentTurnIndex = step.turnIndex !== undefined ? step.turnIndex : 0;
      // Swap steps put the game into the real SWAP phase so the genuine swap
      // controls and click handlers are what the player learns on.
      state.phase = step.phase || 'PLAY';
      state.selectedSwapHandCardId = null;
      state.selectedSwapFaceUpSlot = null;
      // Tracks progress through a LOCKED sequence of swaps (require.swap
      // with a `sequence` array) — reset fresh every time a step begins.
      tutorialSwapSequenceProgress = 0;
      // Highlight the PLAY button whenever the step asks for a card to be
      // played, and lift the player's own area above the dimmer so the cards
      // and the button are both clearly lit rather than greyed out.
      const playBtnEl = document.getElementById('playSelectedBtn');
      const zoneEl = document.getElementById('localPlayerZone');
      const wantsCardPlay = !!(step.require && step.require.rank);
      if (playBtnEl) playBtnEl.classList.toggle('tutorial-glow', wantsCardPlay);
      if (zoneEl) zoneEl.style.zIndex = wantsCardPlay ? '80' : '';
      document.getElementById('finishSwapBtn')?.classList.toggle('tutorial-glow', !!(step.require && step.require.ready));
      const tapSel = step.require && step.require.tapCheck;
      const refBtnTap = tapSel === '#cardRefBtn' || tapSel === '#matrixRefBtn';
      document.getElementById('localTableSlots')?.classList.toggle('tutorial-glow', !!tapSel && !refBtnTap && tapSel.includes('#localTableSlots'));
      document.getElementById('cardRefBtn')?.classList.toggle('tutorial-glow', tapSel === '#cardRefBtn');
      document.getElementById('matrixRefBtn')?.classList.toggle('tutorial-glow', tapSel === '#matrixRefBtn');
      // Hold step: the Pile and the hand glow until each has been held.
      const holdStep = !!(step.require && step.require.holdCheck);
      if (holdStep) tutorialHoldsDone = new Set();
      document.getElementById('discardPileContainer')?.classList.toggle('tutorial-glow', holdStep);
      document.getElementById('localHand')?.classList.toggle('tutorial-glow', holdStep);
      // The Card Powers / Play Matrix panel opened by a tap step closes once the lesson moves on.
      if (tapSel !== '#cardRefBtn' && typeof cardRefOpen !== 'undefined' && cardRefOpen) toggleCardReference(true);
      if (tapSel !== '#matrixRefBtn' && typeof matrixRefOpen !== 'undefined' && matrixRefOpen) toggleMatrixReference(true);

      const inSwap = state.phase === 'SWAP';
      if (inSwap && state.players[0]) state.players[0].isReady = false;
      document.getElementById('swapControlBar')?.classList.toggle('hidden', !inSwap);
      document.getElementById('playActionControls')?.classList.toggle('hidden', inSwap);
      tutorialSnapshots[idx] = tutorialSnapshots[idx] || tutorialSnapshot();

      renderTutorialCaption(step, idx, step.text);
      render();
      const applySpotlight = () => {
        positionTutorialUI(step.target);
        if (step.swapColorGroups) renderSwapColorSpotlights(step.swapColorGroups, tutorialSwapSequenceProgress);
        if (step.matchSpotlightWidthPair) syncSpotlightBoxWidths(...step.matchSpotlightWidthPair);
      };
      applySpotlight();
      startTutorialSpotlightFollow();
      // The caption's own size can shift the layout underneath it, leaving the
      // spotlight measured against a stale position. Re-measure once the
      // browser has settled.
      requestAnimationFrame(applySpotlight);
      tutorialDelay(applySpotlight, 320);
      // A narration step (no require) can still script a live Coach reply —
      // e.g. Transparent needs the player to actually SEE the Coach's 3 land on
      // top of a card, not just read about it in a static pre-set scene.
      // Waits for an explicit Continue tap rather than firing on a timer, so
      // the player controls the pacing instead of the animation potentially
      // running before they've finished reading. Reuses the exact same
      // reply machinery a real action step uses.
      if (!step.require && step.coachPlays) {
        document.getElementById('tutorialNextBtn').textContent = 'Continue';
        tutorialPendingContinueAction = () => tutorialRunCoachReply(step, 400);
      }
    }

    function renderTutorialCaption(step, idx, text) {
      document.getElementById('tutorialText').textContent = text;
      document.getElementById('tutorialStepCounter').textContent = `Step ${idx + 1} of ${TUTORIAL_STEPS.length}`;
      document.getElementById('tutorialModuleTitle').textContent = tutorialCurrentModuleTitle;
      // Back is ALWAYS available (except on the very first step) and performs a
      // genuine undo by restoring the snapshot taken when the step began.
      const backBtn = document.getElementById('tutorialBackBtn');
      // 'hidden' keeps the button's space so Continue stays on the right.
      backBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';
      const nextBtn = document.getElementById('tutorialNextBtn');
      nextBtn.textContent = idx === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next';
      // On an action step there's no Next — the instruction is to actually
      // play the card, which is the entire point.
      nextBtn.style.display = step.require ? 'none' : '';
    }

    // Swap Phase's locked-sequence step spotlights each pair in a distinct
    // color rather than one uniform amber box, and drops a pair from the
    // spotlight entirely the moment it's actually been swapped — otherwise
    // an already-completed pair keeps looking exactly as "still needs
    // action" as the one actually next, which is genuinely misleading even
    // though the swap itself is already correctly locked against redoing.
    function renderSwapColorSpotlights(groups, activeFromIndex) {
      const holesGroup = document.getElementById('tutorialSpotlightHoles');
      const bordersGroup = document.getElementById('tutorialSpotlightBorders');
      if (!holesGroup || !bordersGroup) return;
      holesGroup.innerHTML = '';
      bordersGroup.innerHTML = '';
      const svgNS = 'http://www.w3.org/2000/svg';
      const pad = 8;
      groups.forEach((group, idx) => {
        if (idx < activeFromIndex) return;
        group.cards.forEach(sel => {
          let els;
          try { els = document.querySelectorAll(sel); } catch (e) { return; }
          els.forEach(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) return;
            const x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
            const hole = document.createElementNS(svgNS, 'rect');
            hole.setAttribute('x', x); hole.setAttribute('y', y);
            hole.setAttribute('width', w); hole.setAttribute('height', h);
            hole.setAttribute('rx', 12); hole.setAttribute('fill', 'black');
            holesGroup.appendChild(hole);
            const border = document.createElementNS(svgNS, 'rect');
            border.setAttribute('x', x); border.setAttribute('y', y);
            border.setAttribute('width', w); border.setAttribute('height', h);
            border.setAttribute('rx', 12);
            border.setAttribute('stroke', group.color);
            bordersGroup.appendChild(border);
          });
        });
      });
    }

    // Widens whichever of two ALREADY-DRAWN spotlight boxes (identified by
    // their position in the target array, 0-indexed) is narrower, centered
    // on its own original position — so e.g. an empty Hand's thin
    // placeholder box can visually match a 3-card Face-Up row's width
    // without disturbing any OTHER box a step also highlights (a blanket
    // "widen every box to the max" first attempt at this also widened an
    // unrelated single-card Deck box into overlapping the Pile beside it).
    function syncSpotlightBoxWidths(indexA, indexB) {
      const holes = document.querySelectorAll('#tutorialSpotlightHoles rect');
      const borders = document.querySelectorAll('#tutorialSpotlightBorders rect');
      const holeA = holes[indexA], holeB = holes[indexB];
      const borderA = borders[indexA], borderB = borders[indexB];
      if (!holeA || !holeB || !borderA || !borderB) return;
      const wA = parseFloat(holeA.getAttribute('width'));
      const wB = parseFloat(holeB.getAttribute('width'));
      const wide = wA >= wB ? wA : wB;
      const narrowEls = wA < wB ? [holeA, borderA] : [holeB, borderB];
      const narrowWidth = Math.min(wA, wB);
      if (wide <= narrowWidth) return;
      const x = parseFloat(narrowEls[0].getAttribute('x'));
      const newX = x + narrowWidth / 2 - wide / 2;
      narrowEls.forEach(el => { el.setAttribute('x', newX); el.setAttribute('width', wide); });
    }

    // The spotlight follows its targets: every frame while the tutorial runs,
    // tutorialFollowSpotlight re-measures them and redraws only when something
    // moved or resized (a hand growing after a pickup, a card lifting or
    // leaving, a pop-up springing open or being resized/zoomed).
    let tutorialSpotlightSel = null, tutorialSpotlightSig = '', tutorialFollowRaf = null;
    function tutorialSpotlightSignature(selector) {
      const selectors = Array.isArray(selector) ? selector : (selector ? [selector] : []);
      const parts = selectors.flatMap(s => { try { return Array.from(document.querySelectorAll(s)); } catch (e) { return []; } })
        .map(el => { const r = el.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)}`; });
      const arena = document.getElementById('centerArena')?.getBoundingClientRect();
      const cap = document.getElementById('tutorialCaption');
      return `${parts.join('|')}#${arena ? Math.round(arena.top) : ''}#${cap ? cap.offsetWidth + 'x' + cap.offsetHeight : ''}#${window.innerWidth}x${window.innerHeight}`;
    }
    function tutorialFollowSpotlight() {
      if (!tutorialActive) { tutorialFollowRaf = null; return; }
      if (tutorialSpotlightSignature(tutorialSpotlightSel) !== tutorialSpotlightSig) positionTutorialUI(tutorialSpotlightSel);
      tutorialFollowRaf = requestAnimationFrame(tutorialFollowSpotlight);
    }
    function startTutorialSpotlightFollow() {
      if (tutorialFollowRaf === null) tutorialFollowRaf = requestAnimationFrame(tutorialFollowSpotlight);
    }

    function positionTutorialUI(selector) {
      tutorialSpotlightSel = selector;
      tutorialSpotlightSig = tutorialSpotlightSignature(selector);
      drawTutorialSpotlight(selector);
      // Step-level extras redraw with it (only for the step's own target).
      const step = tutorialActive ? TUTORIAL_STEPS[tutorialStep] : null;
      if (step && selector === step.target) {
        if (step.swapColorGroups) renderSwapColorSpotlights(step.swapColorGroups, tutorialSwapSequenceProgress);
        if (step.matchSpotlightWidthPair) syncSpotlightBoxWidths(...step.matchSpotlightWidthPair);
      }
    }
    // The Card Powers / Play Matrix steps: the opened panel sits centred on
    // the screen, just below the caption, so the caption never covers it.
    function tutorialPlaceRefPanel(cap) {
      const step = tutorialActive ? TUTORIAL_STEPS[tutorialStep] : null;
      const which = step?.require?.tapCheck;
      const id = which === '#cardRefBtn' ? 'cardRefPanel' : which === '#matrixRefBtn' ? 'matrixRefPanel' : null;
      const panel = id && document.getElementById(id);
      if (!panel || panel.classList.contains('hidden')) return;
      const pr = panel.getBoundingClientRect();
      if (!pr.width) return;
      const capR = cap.getBoundingClientRect();
      const m = 6;
      // The whole panel must show below the caption (v256: on PCs the saved
      // zoom made it taller than the space left, so it slid up under the
      // caption). Shrink it to fit for the lesson only; the player's own zoom
      // comes back the next time they open it.
      const baseH = panel.offsetHeight, baseW = panel.offsetWidth;
      const scaleNow = baseH ? pr.height / baseH : 1;
      const room = window.innerHeight - (capR.bottom + 10) - m;
      const fit = baseH && pr.height > room + 0.5 ? Math.max(0.4, room / baseH) : scaleNow;
      if (Math.abs(fit - scaleNow) > 0.005) {
        panel.style.transformOrigin = 'top left';
        panel.style.transform = `scale(${fit})`;
        panel.querySelectorAll('.cardref-resize-handle').forEach(h => { h.style.transform = `scale(${1 / fit})`; });
      }
      const w = baseW * fit, h = baseH * fit;
      const left = Math.max(m, (window.innerWidth - w) / 2);
      const top = Math.max(m, Math.min(capR.bottom + 10, window.innerHeight - h - m));
      if (Math.abs(pr.left - left) > 0.5) panel.style.left = `${left}px`;
      if (Math.abs(pr.top - top) > 0.5) panel.style.top = `${top}px`;
    }
    function drawTutorialSpotlight(selector) {
      const cap = document.getElementById('tutorialCaption');
      const holesGroup = document.getElementById('tutorialSpotlightHoles');
      const bordersGroup = document.getElementById('tutorialSpotlightBorders');
      // These can be gone by the time a deferred reposition fires (the dev
      // test report replaces the whole body, for instance), so bail rather
      // than throwing.
      if (!cap || !holesGroup || !bordersGroup) return;
      // A step can name more than one area (e.g. the Hand AND the Pile, when
      // the lesson is about a card the player has to look at on the Pile
      // before playing from their Hand) — matched elements are collected
      // here; whether they render as one merged spotlight or several
      // separate ones is decided below.
      const selectors = Array.isArray(selector) ? selector : (selector ? [selector] : []);
      // querySelectorAll (not querySelector) so a single selector can light up
      // every matching element — e.g. '#localTableSlots .card-table' spotlights
      // all 3 Face-Up cards at once, not just the first. Every existing #id
      // selector still resolves to exactly one element either way, so this is
      // a pure capability add with no change to prior behaviour.
      const rects = selectors
        .flatMap(s => { try { return Array.from(document.querySelectorAll(s)); } catch (e) { return []; } })
        .map(el => el.getBoundingClientRect())
        .filter(r => r.width > 0 || r.height > 0);
      const rect = rects.length
        ? rects.reduce((u, r) => ({
            top: Math.min(u.top, r.top), left: Math.min(u.left, r.left),
            right: Math.max(u.right, r.right), bottom: Math.max(u.bottom, r.bottom)
          }), rects[0])
        : null;
      if (rect) { rect.width = rect.right - rect.left; rect.height = rect.bottom - rect.top; }
      const capW = cap.offsetWidth || 320, capH = cap.offsetHeight || 150;
      const m = 8;

      cap.style.transform = 'none';
      cap.style.left = `${Math.max(m, Math.min((window.innerWidth - capW) / 2, window.innerWidth - capW - m))}px`;

      // The caption ALWAYS sits directly above the deck/pile/base row and
      // grows upward. That keeps the pile, the hand, the table cards and the
      // PLAY button permanently visible — the things the player actually
      // needs to see — while the caption uses the emptier space up top.
      const arena = document.getElementById('centerArena');
      const arenaRect = arena ? arena.getBoundingClientRect() : null;
      const arenaTop = arenaRect ? arenaRect.top : window.innerHeight * 0.45;
      let top = arenaTop - capH - 10;
      // If the caption is too tall to fit above the deck/pile row (long text on
      // a small screen), drop it BELOW the arena instead. Clamping it upward
      // would slide it straight over the pile — the one thing it must never
      // cover.
      if (top < m && arenaRect) {
        const below = arenaRect.bottom + 10;
        if (below + capH <= window.innerHeight - m) top = below;
      }
      // If the highlighted element is itself up there, drop below it instead
      // so the caption never covers its own spotlight.
      const refPanelStep = tutorialActive && /RefBtn$/.test(TUTORIAL_STEPS[tutorialStep]?.require?.tapCheck || '');
      if (!refPanelStep && rect && rect.height > 0 && rect.bottom < arenaTop && rect.bottom + capH + 10 < arenaTop) {
        top = rect.bottom + 10;
      }
      // captionPlace 'middle': between the Pile and the Hand, so the hold
      // bubble (it opens above the Pile or the held card) stays in view.
      const stepNow = tutorialActive ? TUTORIAL_STEPS[tutorialStep] : null;
      if (stepNow && stepNow.captionPlace === 'middle') {
        const pileR = document.getElementById('pileZone')?.getBoundingClientRect();
        const handR = document.getElementById('localHand')?.getBoundingClientRect();
        if (pileR && handR && pileR.height && handR.height) {
          const lo = pileR.bottom + 6, hi = handR.top - capH - 6;
          top = hi >= lo ? (lo + hi) / 2 : Math.max(lo, (pileR.bottom + handR.top - capH) / 2);
        }
      }
      cap.style.top = `${Math.max(m, Math.min(top, window.innerHeight - capH - m))}px`;
      tutorialPlaceRefPanel(cap);

      holesGroup.innerHTML = '';
      bordersGroup.innerHTML = '';
      if (!rects.length) return;

      const pad = 4;
      // Adjacent/overlapping elements (e.g. the Hand and the center Pile)
      // read naturally as one highlighted area — but elements far apart on
      // screen (e.g. the header's ? button and the far-away i button) must
      // NOT be merged into a single box, since that lights up everything
      // sitting between them (other buttons, banners, unrelated UI) along
      // with the two things actually being pointed at. If the individual
      // rects only account for a small fraction of their own union's area,
      // there's a lot of irrelevant space between them — spotlight each one
      // separately instead of the union.
      let groups = rects;
      if (rects.length > 1) {
        const unionArea = rect.width * rect.height;
        const sumArea = rects.reduce((s, r) => s + r.width * r.height, 0);
        if (unionArea > 0 && (sumArea / unionArea) >= 0.5) groups = [rect];
      }

      const svgNS = 'http://www.w3.org/2000/svg';
      groups.forEach(r => {
        const x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
        const hole = document.createElementNS(svgNS, 'rect');
        hole.setAttribute('x', x); hole.setAttribute('y', y);
        hole.setAttribute('width', w); hole.setAttribute('height', h);
        hole.setAttribute('rx', 12); hole.setAttribute('fill', 'black');
        holesGroup.appendChild(hole);

        const border = document.createElementNS(svgNS, 'rect');
        border.setAttribute('x', x); border.setAttribute('y', y);
        border.setAttribute('width', w); border.setAttribute('height', h);
        border.setAttribute('rx', 12);
        bordersGroup.appendChild(border);
      });
    }

    // Card-level highlight: is THIS specific card the one the current step
    // wants tapped/played? Used to glow the exact card(s) rather than just
    // the general area, on top of the container-level spotlight.
    // `pool` tells it which zone is being rendered ('hand' or 'faceUp') —
    // a rank match sitting in inert Face-Up filler cards must NOT glow while
    // the Hand is still the actual reachable tier (only once Hand+Deck are
    // both empty does Face-Up become live, same rule the game itself uses).
    function tutorialWantsCard(card, pool) {
      // Once the player has acted (e.g. the Coach's reply is landing), the
      // cards the step asked for stop glowing.
      if (!tutorialActive || !card || !tutorialAwaitingAction) return false;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (!step || !step.require) return false;
      const r = step.require;
      if (r.rank) {
        const wantRanks = Array.isArray(r.rank) ? r.rank : [r.rank];
        if (!wantRanks.includes(card.rank)) return false;
        if (pool === 'faceUp') {
          if (canAccessFaceUp(state.players[0])) return true;
          // Cross-Phase exception: a Hand that is ENTIRELY one rank can
          // reach a matching Face-Up card early once the Deck is empty —
          // same condition getLegalMovesForPlayer itself checks. Without
          // this, the one Face-Up card that lesson is about would never
          // glow despite genuinely being playable right now.
          const you = state.players[0];
          return canSelectCrossPhaseFaceUp(you, card);
        }
        return true;
      }
      if (r.swap) {
        const current = tutorialCurrentSwapRequirement(step);
        return !!current && (card.rank === current.handRank || card.rank === current.faceUpRank);
      }
      return false;
    }

    // Gate: only the required card may be played on an action step.
    // Returns true if the play should proceed.
    function tutorialInterceptPlay(cards, viaSnap) {
      if (!tutorialActive) return true;
      const step = TUTORIAL_STEPS[tutorialStep];
      // Explanation steps are read-only: nothing may be played until a step
      // actually asks for it. Without this the player can wander off-script
      // and the whole lesson desynchronises.
      if (!step || !step.require) {
        notifyBanner('Just read along for now — tap Next to continue.');
        return false;
      }
      if (step.require.requireSnap && !viaSnap) {
        notifyBanner('Use the pulsing Snap Burn button for this one, not the Play Selected Cards button.');
        return false;
      }
      if (step.require.pickup) {
        notifyBanner('Tap the PILE to pick it up.');
        return false;
      }
      if (step.require.swap || step.require.ready) {
        notifyBanner("We're still in the swap phase — no cards played yet.");
        return false;
      }
      if (step.require.blind) {
        notifyBanner('Tap one of your face-down cards to flip it.');
        return false;
      }
      if (step.require.toggleRankSelect) {
        notifyBanner(step.require.toggleRankSelect === 'off'
          ? 'Tap the Select All Of A Rank button beside your hand count to switch it off first.'
          : 'Tap the Select All Of A Rank button beside your hand count first.');
        return false;
      }
      if (step.require.tapCheck) {
        notifyBanner('Tap the highlighted area for this step.');
        return false;
      }
      if (step.require.holdCheck) {
        notifyBanner('Press and hold the Pile, then one of your cards.');
        return false;
      }
      const want = step.require;
      // require.rank can be a single rank ('K') or a list of equally-valid
      // ranks (['Q','K']) when a step genuinely doesn't care which one the
      // player uses — e.g. either beats the pile just as well. Every
      // selected card still has to share the same rank as each other
      // (multi-card plays are always same-rank in this game); that shared
      // rank just has to be SOME member of the allowed set rather than one
      // fixed value.
      const wantRanks = Array.isArray(want.rank) ? want.rank : [want.rank];
      const selectedRank = cards[0] ? cards[0].rank : null;
      const okRank = cards.length > 0 && cards.every(c => c.rank === selectedRank) && wantRanks.includes(selectedRank);
      const okCount = want.count ? cards.length === want.count : cards.length >= 1;
      if (!okRank) {
        const rankLabel = (r) => (r === 'JOKER' ? 'Joker' : r);
        notifyBanner(`Not quite — play your ${wantRanks.map(rankLabel).join(' or ')} for this step.`);
        return false;
      }
      if (!okCount) {
        notifyBanner(`Select ${want.count} of them and play together.`);
        return false;
      }
      return true;
    }

    // Shared by every completion path (normal play, blind flip, snap-burn,
    // swap, ready, pickup) — runs the Coach's scripted reply, if any, then
    // shows the outcome note. Waves let one Coach "turn" cover more than one
    // play, e.g. a burn that keeps the turn followed by an immediate second
    // card. Legacy single-wave data (a flat array of [rank, suit] pairs) is
    // normalized into one wave so any existing single-wave step keeps
    // working unchanged.
    function tutorialRunCoachReply(step, initialDelay) {
      tutorialDelay(() => {
        if (step.coachPlays && !step.noCoachReply) {
          const coach = state.players[1];
          // Three supported shapes for coachPlays:
          //  - flat single wave:        [['7','♦']]
          //  - nested multi-wave:       [[['10','♠']], [['4','♠']]]
          //  - paused wave(s) mixed in: [{ cards: [['10','♠']], pauseNote: '...' }, [['4','♠']]]
          // A "flat single wave" is the only shape where every entry is
          // itself a plain [rank, suit] pair — anything else is already an
          // array of waves.
          const looksFlat = step.coachPlays.every(w => Array.isArray(w) && typeof w[0] === 'string');
          const waves = looksFlat ? [step.coachPlays] : step.coachPlays;
          state.currentTurnIndex = 1;
          // Bot-paused stays TRUE until playWave() itself is about to run —
          // see the note there for why this can't be released any earlier.

          // Decides what happens once a wave has fully resolved: either the
          // step is done (show the final coachNote) or the next wave chains
          // on automatically after a short visual gap.
          const advance = (waveIdx, lastWave, gap) => {
            const nextIdx = waveIdx + 1;
            if (nextIdx >= waves.length) {
              tutorialBotPaused = true;
              // A Joker wave resolves its duel (and any resulting pickup) on
              // its own internal timer tied to turn speed — this note must
              // never appear before that's actually finished. A burn holds
              // the pile visible before clearing (see executeBurn's holdMs)
              // and needs the matching wait. Neither applies to an ordinary
              // card that just landed — that only needs long enough for its
              // ~350ms flight animation to finish, not the longer pacing
              // gap used between chained plays; waiting the full gap here
              // left the explanation trailing well behind the card, which
              // had already landed and hand already passed to the player.
              const containsJoker = lastWave.some(([r]) => r === 'JOKER');
              const isBurning = document.getElementById('discardCardsWrapper')?.classList.contains('animate-burn-flame');
              const noteDelay = containsJoker ? Math.max(1200, state.turnDelay + 400) : (isBurning ? 2500 : 400);
              tutorialDelay(() => showCoachNote(step), noteDelay);
              return;
            }
            tutorialDelay(() => playWave(nextIdx), gap);
          };

          const playWave = (waveIdx) => {
            // Only released here, right as a scripted card is about to be
            // played — never earlier (e.g. on the Continue click that kicks
            // off a burn's hold delay), or triggerNextTurn() would see an
            // un-paused Coach sitting with an empty hand during that async
            // gap and let the real bot AI hijack the turn out from under
            // the script (auto-picking up the empty pile and handing the
            // turn to the player before the next scripted wave ever plays).
            tutorialBotPaused = false;
            const raw = waves[waveIdx];
            const isPaused = raw && !Array.isArray(raw);
            const wave = isPaused ? raw.cards : raw;

            if (isPaused) tutorialDeferBurn = true;
            // If this wave's card is one the Coach's Face-Up row is already
            // showing, remove it from there first — otherwise the card
            // appears to be conjured from nowhere while an identical one
            // keeps sitting in Face-Up, which looks exactly like cards
            // coming from thin air instead of a real, visible source.
            wave.forEach(([r, su]) => {
              const fIdx = (coach.faceUp || []).findIndex(c => c.rank === r && c.suit === su);
              if (fIdx !== -1) coach.faceUp.splice(fIdx, 1);
            });
            coach.hand = wave.map(([r, su]) => C(r, su));
            executePlayCards(coach.id, [...coach.hand]);
            tutorialDeferBurn = false;

            if (isPaused) {
              // The card (and, if it triggered a burn, the burn) is captured
              // as pending rather than resolved — explain it now, with the
              // card genuinely visible sitting on the pile.
              tutorialDelay(() => {
                tutorialBotPaused = true;
                tutorialShowInterimNote(raw.pauseNote);
                if (raw.advanceOnly) {
                  // Nothing to resolve here (e.g. a Joker, which doesn't
                  // burn) — Continue just moves to the next tutorial step,
                  // which is itself a real required action (the player
                  // countering with their own Joker).
                  tutorialPendingContinueAction = null;
                  return;
                }
                // Bot stays paused across the whole resolve — the burn's
                // hold delay (see executeBurn's holdMs) runs asynchronously,
                // and if the Coach were un-paused here, triggerNextTurn()
                // would step in with real bot AI the instant the burn
                // actually finishes, well before `advance` below ever runs.
                tutorialPendingContinueAction = () => tutorialResolvePendingBurn(() => advance(waveIdx, wave, 700));
              }, 500);
              return;
            }

            // A burn (10, or completing 4-of-a-kind) holds the pile visible
            // for a few seconds in the tutorial before actually clearing it
            // (see executeBurn's holdMs) — the next wave must not land until
            // that's genuinely finished, or it'll be wiped out along with it.
            const isBurning = document.getElementById('discardCardsWrapper')?.classList.contains('animate-burn-flame');
            const gap = isBurning ? 2500 : 900;
            advance(waveIdx, wave, gap);
          };
          tutorialDelay(() => playWave(0), 800);
        } else {
          const isBurning = document.getElementById('discardCardsWrapper')?.classList.contains('animate-burn-flame');
          tutorialDelay(() => showCoachNote(step), isBurning ? 2500 : 700);
        }
      }, initialDelay);
    }

    // Called after the player successfully acts. Lets the Coach reply on a
    // visible delay, then moves on. A step with postPlayNote pauses here
    // first — some explanations (e.g. "your Hand just refilled from the
    // Deck") describe something that happens the instant the player's OWN
    // card lands, before the Coach has replied at all, so showing them only
    // after the Coach's reply would put them in the wrong chronological
    // order. Continue is wired to actually run the Coach's reply, exactly
    // like the existing blindPause / paused-coachPlays-wave patterns.
    function tutorialOnPlayerActed() {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (!step || !step.require) return;
      // The player's part of this step is done the moment their card lands —
      // any highlight scoped to "still waiting on you" (e.g. highlightBaseCard)
      // should drop right away rather than lingering through the Coach's reply.
      tutorialAwaitingAction = false;
      render();
      // A Bonus Draw offer or an open Joker target picker are their own
      // real, separate game prompts — let them resolve on their own rather
      // than racing this step's own postPlayNote/coachPlays/coachNote
      // against them. Their own resolution paths (resolveFollowUpPlay, the
      // picker's button onclick) call back into this same function once
      // settled.
      if (state.pendingFollowUp) {
        if (step.bonusPromptText) {
          document.getElementById('tutorialText').textContent = step.bonusPromptText;
          requestAnimationFrame(() => positionTutorialUI('#followUpToastBanner'));
        }
        return;
      }
      if (!document.getElementById('floatingJokerBar')?.classList.contains('hidden')) {
        if (step.jokerPromptText) {
          document.getElementById('tutorialText').textContent = step.jokerPromptText;
          requestAnimationFrame(() => positionTutorialUI('#floatingJokerBar'));
        }
        return;
      }
      if (step.postPlayNote) {
        tutorialDelay(() => {
          tutorialShowInterimNote(step.postPlayNote, step.postPlayNoteTarget);
          tutorialPendingContinueAction = () => tutorialRunCoachReply(step, 400);
        }, 500);
        return;
      }
      // A blind flip is a bigger reveal than an ordinary play — the player
      // needs a real beat to actually see and register what just turned
      // face-up before the Coach's reply lands on top of it and covers it.
      tutorialRunCoachReply(step, step.require.blind ? 1400 : 600);
    }

    // Shows the outcome note and WAITS for the player to press Continue.
    // Previously this auto-advanced after ~1.4s, which was far too quick to
    // read — the explanation of what just happened is the whole payoff of the
    // step, so it should never disappear on a timer.
    function showCoachNote(step) {
      if (!tutorialActive) return;
      tutorialAwaitingAction = false;
      document.getElementById('playSelectedBtn')?.classList.remove('tutorial-glow');
      document.getElementById('localTableSlots')?.classList.remove('tutorial-glow');
      const note = step.coachNote || 'Nice one.';
      document.getElementById('tutorialText').textContent = note;
      const noteTarget = step.noteTarget || step.target;
      requestAnimationFrame(() => positionTutorialUI(noteTarget));
      document.getElementById('tutorialStepCounter').textContent = `Step ${tutorialStep + 1} of ${TUTORIAL_STEPS.length}`;
      document.getElementById('tutorialBackBtn').style.visibility = 'visible';
      const nextBtn = document.getElementById('tutorialNextBtn');
      nextBtn.style.display = '';
      nextBtn.textContent = tutorialStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Continue';
      positionTutorialUI(noteTarget);
    }

    // A mid-wave pause — e.g. "the Coach just played a 10, here's what that
    // does" — shown BEFORE the burn it's about actually happens. Same visual
    // treatment as showCoachNote, but the step itself isn't finished yet
    // (there's more of this step's sequence still to come), so it's never
    // "Finish", and the Continue press is wired to tutorialPendingContinueAction
    // rather than advancing to the next step.
    function tutorialShowInterimNote(text, targetOverride) {
      if (!tutorialActive) return;
      tutorialAwaitingAction = false;
      document.getElementById('playSelectedBtn')?.classList.remove('tutorial-glow');
      document.getElementById('tutorialText').textContent = text;
      const step = TUTORIAL_STEPS[tutorialStep];
      const target = targetOverride !== undefined ? targetOverride : step?.target;
      requestAnimationFrame(() => positionTutorialUI(target));
      document.getElementById('tutorialBackBtn').style.visibility = 'visible';
      const nextBtn = document.getElementById('tutorialNextBtn');
      nextBtn.style.display = '';
      nextBtn.textContent = 'Continue';
      positionTutorialUI(target);
    }

    // Swap steps name the exact pair to swap (or, for a LOCKED SEQUENCE, the
    // exact pair for whichever step of the sequence is next). Touching
    // anything else is refused with a nudge — otherwise the player can swap
    // the wrong cards, the lesson's premise stops being true, and the coach
    // ends up claiming something that didn't happen. Checking against
    // sequence[tutorialSwapSequenceProgress] specifically (never the whole
    // array) is what enforces the ORDER: a pair that's valid later in the
    // sequence is still refused if it's attempted out of turn.
    let tutorialSwapSequenceProgress = 0;

    function tutorialCurrentSwapRequirement(step) {
      if (!step || !step.require || !step.require.swap) return null;
      if (step.require.sequence) return step.require.sequence[tutorialSwapSequenceProgress] || null;
      return { handRank: step.require.handRank, faceUpRank: step.require.faceUpRank };
    }

    function tutorialAllowSwapPick(kind, card) {
      if (!tutorialActive) return true;
      const step = TUTORIAL_STEPS[tutorialStep];
      // Any step in the Swap Phase that ISN'T the one actually asking for a
      // swap blocks all swap interaction outright, not just a mismatched
      // pick — otherwise the player can rearrange Face-Up cards during a
      // purely informational step, and the specific cards a later step
      // names no longer match what's actually on the table.
      if (state.phase === 'SWAP' && (!step || !step.require || !step.require.swap)) {
        notifyBanner("Hold on for the next step.");
        return false;
      }
      const current = tutorialCurrentSwapRequirement(step);
      if (!current) return true;
      const want = kind === 'hand' ? current.handRank : current.faceUpRank;
      if (!want || !card) return true;
      if (card.rank !== want) {
        notifyBanner(kind === 'hand'
          ? `Tap your ${want} in hand for this step.`
          : `Tap the ${want} on your table for this step.`);
        return false;
      }
      return true;
    }

    // Swap steps complete only when the REQUIRED swap actually happened. A
    // sequence advances one pair at a time and only calls showCoachNote once
    // every pair in it is done — the caption's own text already describes
    // the whole sequence up front, so there's nothing new to say between
    // individual swaps, just the lock enforced above.
    function tutorialOnSwap() {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      const current = tutorialCurrentSwapRequirement(step);
      if (!current) return;
      const you = state.players[0];
      const done = !current.faceUpRank
        || ((you.faceUp || []).some(c => c.rank === current.handRank)
            && (you.hand || []).some(c => c.rank === current.faceUpRank));
      if (!done) return;
      if (step.require.sequence && tutorialSwapSequenceProgress < step.require.sequence.length - 1) {
        tutorialSwapSequenceProgress++;
        if (step.swapColorGroups) renderSwapColorSpotlights(step.swapColorGroups, tutorialSwapSequenceProgress);
        return;
      }
      tutorialDelay(() => showCoachNote(step), 500);
    }

    // The Ready step completes when the player locks their swap in.
    function tutorialOnReady() {
      if (!tutorialActive) return false;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step && step.require && step.require.ready) {
        tutorialDelay(() => showCoachNote(step), 400);
        return true;
      }
      // Ready pressed on a step that didn't ask for it — ignore it so the
      // lesson can't be skipped past.
      if (state.phase === 'SWAP') {
        notifyBanner('Swap a card first — tap your 2, then your 4.');
        return true;
      }
      return false;
    }

    // The rank-toggle step completes when the player flips the toggle on.
    function tutorialOnRankToggle() {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (!step || !step.require || !step.require.toggleRankSelect) return;
      // Default requirement is turning it ON; 'off' asks for the opposite —
      // used once the earlier lesson has already switched it on and a later
      // step wants it switched off again.
      const wantsOn = step.require.toggleRankSelect !== 'off';
      if (selectAllOfRank === wantsOn) {
        tutorialDelay(() => showCoachNote(step), 500);
      }
    }

    // Blind (face-down) steps complete when the player flips a card.
    function tutorialOnBlindPlay() {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step && step.require && step.require.blind) {
        tutorialRunCoachReply(step, 300);
      }
    }

    // Shared by both the tap handler and the "1/2/3" keyboard shortcut for
    // flipping a face-down card. If the tutorial's current step wants to
    // pause on what gets revealed (blindPause — e.g. a blind flip landing on
    // a 10), the burn is deferred and the explanation shown exactly the same
    // way regardless of which input triggered the flip. Previously the
    // keyboard shortcut called executePlayCards directly and skipped this
    // entirely, so flipping a burn card via keyboard jumped straight past
    // the explanation to the next step.
    function tutorialPlayBlindCard(playerId, card) {
      const step = tutorialActive ? TUTORIAL_STEPS[tutorialStep] : null;
      const wantsPause = tutorialActive && step && step.blindPause;
      if (wantsPause) tutorialDeferBurn = true;
      executePlayCards(playerId, [card], true);
      tutorialDeferBurn = false;
      if (!tutorialActive) return;
      if (wantsPause && state.pendingTutorialBurn) {
        tutorialBotPaused = true;
        tutorialDelay(() => {
          tutorialShowInterimNote(step.blindPause);
          tutorialPendingContinueAction = () => {
            tutorialResolvePendingBurn(() => tutorialOnBlindPlay());
          };
        }, 500);
        return;
      }
      tutorialOnBlindPlay();
    }
    // Blind cards aren't routed through the play button, so they need their
    // own guard to stay on-script.
    function tutorialAllowBlindPlay(slotIndex) {
      if (!tutorialActive) return true;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (!step || !step.require || !step.require.blind) {
        notifyBanner('Not this step — follow the instruction above.');
        return false;
      }
      if (step.require.blindSlot !== undefined && step.require.blindSlot !== slotIndex) {
        const label = ['left', 'middle', 'right'][step.require.blindSlot] || 'other';
        notifyBanner(`Try the ${label} card for this step.`);
        return false;
      }
      return true;
    }

    // Pure comprehension-check steps ("tap your Face-Down cards") that don't
    // correspond to any real game action — just confirms the player can find
    // the zone being talked about. Completed via a document-level delegated
    // click listener (see its registration near the other tutorial init
    // calls) rather than a per-element handler, since the target selector
    // differs from step to step and the element it names isn't necessarily
    // clickable in the real game at this point (e.g. Face-Down cards before
    // Hand/Deck/Face-Up are actually empty carry no click handler at all).
    function tutorialOnTapCheck(matchedSelector) {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (!step || !step.require || !step.require.tapCheck) return;
      if (matchedSelector !== step.require.tapCheck) return;
      document.getElementById('localTableSlots')?.classList.remove('tutorial-glow');
      document.getElementById('cardRefBtn')?.classList.remove('tutorial-glow');
      document.getElementById('matrixRefBtn')?.classList.remove('tutorial-glow');
      tutorialAwaitingAction = false;
      tutorialDelay(() => showCoachNote(step), 300);
    }

    // Pickup steps complete when the player takes the pile.
    function tutorialOnPickup() {
      if (!tutorialActive) return;
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step && step.require && step.require.pickup) {
        tutorialDelay(() => showCoachNote(step), 1000);
      }
    }

    // Pre-accounts completion logging: there's no login system yet, so this
    // is keyed by an anonymous id generated once and kept in localStorage —
    // NOT a real user id. When accounts exist, swap the id this uses for the
    // real uid and the rest of this needs no changes.
    function getAnonDeviceId() {
      try {
        let id = localStorage.getItem('shithead_device_id');
        if (!id) {
          id = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
          localStorage.setItem('shithead_device_id', id);
        }
        return id;
      } catch (e) {
        return 'anon_' + Math.random().toString(36).slice(2, 10);
      }
    }
    function logTutorialCompletion() {
      try {
        // Analytics writes are authenticated-only; guest completions are not
        // persisted, avoiding an anonymous public write endpoint.
        if (!currentUser || !currentUser.uid) return;
        const id = currentUser.uid;
        const nameInput = document.getElementById('playerNameInput');
        db.ref(`tutorialCompletions/${id}`).set({
          completedAt: firebase.database.ServerValue.TIMESTAMP,
          playerName: (nameInput && nameInput.value.trim()) || 'Player'
        });
      } catch (e) {
        // Never let a logging failure interrupt the player finishing the tutorial.
        console.warn('Could not log tutorial completion', e);
      }
    }

    function endTutorial(completed) {
      applyBotPrefs();
      // Lessons force Select All Of A Rank on/off; give the player's own
      // setting back.
      if (tutorialPrevSelectAll !== null) {
        selectAllOfRank = tutorialPrevSelectAll;
        tutorialPrevSelectAll = null;
        updateMultiSelectToggleUI();
      }
      tutorialActive = false;
      document.body.classList.remove('tutorial-on');
      tutorialHoldKeep = false;
      if (typeof hideCardHold === 'function') hideCardHold();
      tutorialBotPaused = false;
      tutorialStep = 0;
      tutorialSnapshots = [];
      tutorialClearTimers();
      resetPileInspectHint();
      document.getElementById('playSelectedBtn')?.classList.remove('tutorial-glow');
      document.getElementById('cardRefBtn')?.classList.remove('tutorial-glow');
      ['discardPileContainer', 'localHand'].forEach(id => document.getElementById(id)?.classList.remove('tutorial-glow'));
      document.getElementById('matrixRefBtn')?.classList.remove('tutorial-glow');
      document.getElementById('multiSelectToggleBtn')?.classList.remove('tutorial-glow');
      if (typeof cardRefOpen !== 'undefined' && cardRefOpen) toggleCardReference(true);
      if (typeof matrixRefOpen !== 'undefined' && matrixRefOpen) toggleMatrixReference(true);
      const zoneReset = document.getElementById('localPlayerZone');
      if (zoneReset) zoneReset.style.zIndex = '';
      document.getElementById('tutorialLayer').classList.add('hidden');
      // A player who exits/skips the tutorial while the Joker duel-target
      // picker is open (having just played a Joker but not yet chosen who
      // to duel) would otherwise leave this floating over the real game
      // indefinitely — nothing else ever hides it.
      document.getElementById('floatingJokerBar')?.classList.add('hidden');
      try { localStorage.setItem('shithead_tutorial_seen', '1'); } catch (e) {}
      try { localStorage.removeItem('shithead_game_state'); } catch (e) {}
      state.players = []; state.phase = 'LOBBY';
      state.discardPile = []; state.drawPile = []; state.playedHistory = [];
      state.selectedPlayCardIds = []; state.pendingFollowUp = null;
      state.pendingFaceUpSacrifice = null;
      state.lastJokerInitiatorId = null;
      state.jokerTurnOwnerId = null;
      state.jokerTurnLockConsumedPending = false;
      if (state.botActionTimer) clearTimeout(state.botActionTimer);
      document.getElementById('lobbyScreen').classList.remove('hidden');
      document.getElementById('emoteLayer')?.classList.add('hidden');
      if (completed) {
        if (tutorialCurrentModuleId === QUICK_START_MODULE.id && !tutorialLaunchedFromHub) {
          markTutorialModuleComplete(tutorialCurrentModuleId);
          notifyBanner("You're ready. Tap Start Game to play Vs Bots.");
        } else if (tutorialCurrentModuleId) {
          markTutorialModuleComplete(tutorialCurrentModuleId);
          notifyBanner('Lesson complete.');
        } else {
          notifyBanner('Tutorial complete. Good luck.');
        }
        logTutorialCompletion();
      }
      if (tutorialLaunchedFromHub) {
        tutorialLaunchedFromHub = false;
        tutorialCurrentModuleId = null;
        openTutorialHubInternal();
      }
      tutorialCurrentModuleId = null;
    }

