// Play Friends room setup, lobby roster, House Rules and host controls.
// Classic script: shared state is accessed only when functions are invoked.
// app.js wires controls at the original startup position.

    function showMultiplayerLobbyView() {
      // Ranked gets its own minimal view instead — see
      // showRankedConnectedView() and the comment there for why reusing
      // this Online-Room-specific view (bot controls, turn timer picker,
      // manual Start button) was wrong for Ranked in the first place.
      if (state.isRanked) { showRankedConnectedView(); return; }
      document.getElementById('lobbyScreen')?.classList.remove('hidden');
      // Ranked reaches this function directly (enterRankedRoom), never
      // through the normal "tap Online Room" mode-button flow that would
      // otherwise have hidden Vs Bots/Ranked and shown this panel already.
      // #multiLobbyRoom lives INSIDE #multiOptions, so without forcing the
      // mode-select state here, a match found via Ranked could render
      // #multiLobbyRoom while #multiOptions (its own parent) — or the
      // still-visible Ranked search panel on top of it — never got hidden,
      // leaving both stacked on screen at once. Making the mode-select
      // state deterministic here (rather than trusting whatever was
      // already showing) fixes it for every path that reaches this
      // function, not only Ranked.
      document.getElementById('singleOptions')?.classList.add('hidden');
      document.getElementById('rankedOptions')?.classList.add('hidden');
      document.getElementById('multiOptions')?.classList.remove('hidden');
      if (document.getElementById('modeMultiBtn')) {
        document.getElementById('modeMultiBtn').className = MODE_BTN_ACTIVE;
        document.getElementById('modeSingleBtn').className = MODE_BTN_INACTIVE;
        document.getElementById('modeRankedBtn').className = MODE_BTN_INACTIVE;
      }
      document.getElementById('emoteLayer')?.classList.add('hidden');
      document.getElementById('activeDifficultyBadge')?.classList.add('hidden');
      document.getElementById('gameDirectionBadge')?.classList.add('hidden');

      // Belt-and-braces: these are re-hidden by the normal SWAP-phase entry
      // too, but clearing them here avoids a stale flash of last match's
      // controls the instant a new one actually starts.
      document.getElementById('swapControlBar')?.classList.add('hidden');
      document.getElementById('sacrificeControlBar')?.classList.add('hidden');
      document.getElementById('playActionControls')?.classList.add('hidden');

      document.getElementById('multiLobbyRoom')?.classList.remove('hidden');
      window.ShFriendsLobby?.showHub();
      document.getElementById('hostRoomBtn')?.classList.add('hidden');
      document.getElementById('joinRoomBtn')?.classList.add('hidden');
      const joinInput = document.getElementById('joinCodeInput');
      if (joinInput) joinInput.disabled = true;
      // Header room-code badge: Online Room (join/host) only, never Ranked
      // — Ranked reuses this same room-code system under the hood (see
      // enterRankedRoom), but its code is auto-matched and never something
      // a player needs to see or share. Set deterministically here (not
      // just "revealed"), same reasoning as the mode-select buttons above:
      // this function is the one shared path both Online Room and Ranked
      // funnel through, so it has to decide correctly for either.
      const roomBadge = document.getElementById('roomCodeBadge');
      if (roomBadge) {
        if (state.isRanked) {
          roomBadge.classList.add('hidden');
        } else {
          roomBadge.classList.remove('hidden');
          roomBadge.textContent = state.roomCode;
        }
      }
      const prominent = document.getElementById('prominentRoomCode');
      if (prominent) prominent.textContent = state.roomCode;
      // Adding/removing bots and starting the next match are host-only
      // actions, same as they are the first time a room is set up.
      document.getElementById('hostBotControls')?.classList.toggle('hidden', !state.isHost);
      document.getElementById('hostTimerControls')?.classList.toggle('hidden', !state.isHost);
      renderTurnTimerButtons();
      renderHouseRulesPanel();
      document.getElementById('startMultiGameBtn')?.classList.toggle('hidden', !state.isHost);
      // The deck theme picker matters during setup, not once you're actually
      // sitting in a room waiting to start — collapse it here so it can't
      // still be open by the time this view is reached, whether that's from
      // clicking Host, joining by code, or reconnecting into one.
      collapseDeckThemeSection();

      updateLobbyPlayerList();
      watchSeriesRoom();
    }

    function reserveUnusedRoom(payloadFactory, attemptsLeft = 12) {
      const code = generateNumericalRoomCode();
      const payload = payloadFactory(code);
      return db.ref(`rooms/${code}`).transaction(current => current == null ? payload : undefined)
        .then(result => {
          if (result.committed) return { code, payload };
          if (attemptsLeft <= 1) throw new Error('Could not reserve an unused room code. Please try again.');
          return reserveUnusedRoom(payloadFactory, attemptsLeft - 1);
        });
    }

    function initHostRoom() {
      state.isRanked = false;
      state.rankedRatingApplied = false;
      state.rankedAutoStarted = false;
      const pNameInput = document.getElementById('playerNameInput');
      const hostName = pNameInput.value.trim() || 'Host';
      localStorage.setItem('shithead_player_name', hostName);
      pNameInput.disabled = true;

      resetRoomMembershipConfirmation();
      state.isMultiplayer = true;
      state.isHost = true;
      state.localPlayerId = 'p_host';
      state.friendsMode = window.ShFriendsLobby?.draftMode() || 'standard';
      state.ruleMode = state.friendsMode === 'house' ? 'house' : 'standard';
      state.houseRules = state.ruleMode === 'house' ? JSON.parse(JSON.stringify(ShHouseRules.CLASSIC)) : null;

      const hostPlayer = {
        id: 'p_host',
        name: hostName,
        uid: currentUser?.uid || null,
        isHost: true,
        isBot: false,
        hand: [],
        faceUp: [],
        faceDown: [],
        isReady: false,
        hasFinished: false,
        finishRank: null,
        cosmetics: getPublicCosmeticLoadout()
      };

      state.players = [hostPlayer];
      return reserveUnusedRoom(code => ({
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        roomCode: code,
        phase: 'LOBBY',
        hostId: 'p_host',
        players: [hostPlayer],
        turnTimerMs: state.turnTimerMs,
        ruleMode: state.ruleMode,
        friendsMode: state.friendsMode,
        houseRules: state.houseRules,
        clientVersion: getGameVersionLabel()
      })).then(({ code }) => {
        state.roomCode = code;
        rememberJoinedRoom(code);
        showMultiplayerLobbyView();
        listenToFirebaseRoom(code);
        return code;
      }).catch(error => {
        state.isMultiplayer = false;
        pNameInput.disabled = false;
        notifyBanner(error.message || 'Could not create a room.');
        throw error;
      });
    }

    function joinMultiRoom() {
      state.isRanked = false;
      state.rankedRatingApplied = false;
      state.rankedAutoStarted = false;
      const code = document.getElementById('joinCodeInput').value.trim();
      if (code.length !== 6 || isNaN(code)) {
        alert("Please enter a valid 6-digit numeric room code.");
        return;
      }

      const pNameInput = document.getElementById('playerNameInput');
      const pName = pNameInput.value.trim() || 'Player';
      localStorage.setItem('shithead_player_name', pName);
      pNameInput.disabled = true;
      const joinBtnEl = document.getElementById('joinRoomBtn');
      if (joinBtnEl) joinBtnEl.disabled = true;

      resetRoomMembershipConfirmation();
      state.isMultiplayer = true;
      state.isHost = false;
      state.roomCode = code;

      db.ref(`rooms/${code}`).once('value', (snap) => {
        if (!snap.exists()) {
          alert("Room not found. Check the 6-digit code.");
          pNameInput.disabled = false;
          if (joinBtnEl) joinBtnEl.disabled = false;
          return;
        }

        const data = snap.val();
        if (!isRoomVersionCompatible(data)) {
          alert(`This room uses ${data.clientVersion}, but you are running ${getGameVersionLabel()}. Refresh or update the game before joining.`);
          state.isMultiplayer = false;
          state.roomCode = '';
          pNameInput.disabled = false;
          if (joinBtnEl) joinBtnEl.disabled = false;
          return;
        }
        const existingPlayers = roomPlayerList(data.players); // drops any corrupted/ghost entries

        // RECONNECTION: if a match is still running (not the pre-game lobby) and
        // the entered name exactly matches an existing NON-BOT seat, treat this
        // as that same player rejoining — not a new player. This is name-based
        // for now (there's no real account system yet), so it deliberately never
        // matches a bot's name — otherwise anyone could type a bot's name and
        // hijack its seat to dodge the "needs a human" rule. Once logins (Google
        // Play / email) exist, this exact check is where a real user-ID match
        // would replace the name comparison — the rest of the reconnection flow
        // (adopting the existing player's id, letting listenToFirebaseRoom pull
        // the live game state) stays the same either way.
        const normalizedEntered = pName.trim().toLowerCase();
        const existingMatch = existingPlayers.find(p => !p.isBot && p.name.trim().toLowerCase() === normalizedEntered);

        if (data.phase && data.phase !== 'LOBBY') {
          if (existingMatch) {
            state.localPlayerId = existingMatch.id;
            rememberJoinedRoom(code);

            document.getElementById('joinCodeInput').disabled = true;
            document.getElementById('roomCodeBadge').classList.remove('hidden');
            document.getElementById('roomCodeBadge').textContent = code;
            notifyBanner(`Welcome back, ${existingMatch.name} — rejoining the match in progress...`);

            listenToFirebaseRoom(code);
            return;
          }
          alert("A match is already in progress in this room. Enter the exact name you used before to rejoin it, or wait for the next match to start.");
          pNameInput.disabled = false;
          if (joinBtnEl) joinBtnEl.disabled = false;
          return;
        }

        // Still in the pre-game lobby: rejoining under your old name just
        // reclaims that seat instead of creating a duplicate.
        if (existingMatch) {
          state.localPlayerId = existingMatch.id;
          rememberJoinedRoom(code);
          showMultiplayerLobbyView();
          listenToFirebaseRoom(code);
          return;
        }

        const realPlayerCount = existingPlayers.filter(p => !p.isBot).length;
        if (realPlayerCount >= 4) {
          alert("Room is already full with 4 human players.");
          pNameInput.disabled = false;
          if (joinBtnEl) joinBtnEl.disabled = false;
          return;
        }

        if (existingPlayers.length >= 4) {
          const botIdx = existingPlayers.findIndex(p => p.isBot);
          if (botIdx !== -1) {
            existingPlayers.splice(botIdx, 1);
          }
        }

        const myId = 'p_' + Math.random().toString(36).substring(2, 8);
        state.localPlayerId = myId;

        const newPlayer = {
          id: myId,
          name: pName,
          uid: currentUser?.uid || null,
          isHost: false,
          isBot: false,
          hand: [],
          faceUp: [],
          faceDown: [],
          isReady: false,
          hasFinished: false,
          finishRank: null,
          cosmetics: getPublicCosmeticLoadout()
        };

        rememberJoinedRoom(code);

        // Atomic: two people tapping "Join" on the same shared link at
        // close to the same moment must not be able to overwrite each
        // other. The capacity check above was only a fast early bail-out
        // on the snapshot we already had — this re-checks against whatever
        // the list actually is the instant it commits, since another join
        // may have landed in the meantime.
        updatePlayersAtomic(code, (currentList) => {
          const realCount = currentList.filter(p => !p.isBot).length;
          if (realCount >= 4) return currentList; // genuinely full now — don't add
          let list = currentList;
          if (list.length >= 4) {
            const botIdx = list.findIndex(p => p.isBot);
            if (botIdx !== -1) list = list.filter((_, i) => i !== botIdx);
          }
          return [...list, newPlayer];
        }, (error, committed, snapshot) => {
          const finalList = (!error && committed && snapshot) ? snapshot.val() : null;
          const iMadeIt = Array.isArray(finalList) && finalList.some(p => p.id === myId);
          if (!iMadeIt) {
            alert("Room filled up just as you joined — ask the host for a fresh code.");
            forgetJoinedRoom();
            pNameInput.disabled = false;
            if (joinBtnEl) joinBtnEl.disabled = false;
            return;
          }
          listenToFirebaseRoom(code);
        });

        showMultiplayerLobbyView();
      });
    }

    function addBotToMultiplayerLobby() {
      if (seriesBlocksLobbyAction('bot')) return;
      if (!state.isHost || !state.roomCode) return;
      // An online room needs 2 human players, and the table seats 4 — so at
      // most 2 seats can go to bots. Checking total players alone couldn't
      // tell "the room is full" apart from "this would leave no seat for a
      // second human", so it gave a misleading message in the latter case.
      const botCount = state.players.filter(p => p.isBot).length;
      const botLimit = state.ruleMode === 'house' ? 3 : 2;
      if (botCount >= botLimit) {
        alert(state.ruleMode === 'house' ? "You can add up to 3 bots in House Rules." : "You can add up to 2 bots. An online room needs at least 2 human players.");
        return;
      }
      if (state.players.length >= 4) {
        alert("This room is full — 4 players maximum.");
        return;
      }
      const existingNames = state.players.map(p => p.name);
      const availableBots = BOT_NAMES.filter(n => !existingNames.includes(n));
      const botName = availableBots[Math.floor(Math.random() * availableBots.length)] || `Bot ${state.players.length + 1}`;

      const newBot = {
        id: `p_bot_${Math.random().toString(36).substring(2, 7)}`,
        name: `${botName} (Bot)`,
        isHost: false,
        isBot: true,
        difficulty: state.difficulty || 'medium',
        houseRulesReady: true,
        cosmetics: { cardBack: pickBotCardBack() },
        hand: [],
        faceUp: [],
        faceDown: [],
        isReady: false,
        hasFinished: false,
        finishRank: null
      };

      // Atomic: a player could join or leave in the instant between the
      // capacity check above and this write landing — re-check against
      // whatever the list actually is right as it commits.
      updatePlayersAtomic(state.roomCode, (currentList) => {
        const currentBotCount = currentList.filter(p => p.isBot).length;
        const limit = state.ruleMode === 'house' ? 3 : 2;
        if (currentBotCount >= limit || currentList.length >= 4) return currentList;
        return [...currentList, { ...newBot, avatar: pickBotAvatar(currentList) }];
      });
    }

    function removeBotFromMultiplayerLobby() {
      if (!state.isHost || !state.roomCode) return;
      updatePlayersAtomic(state.roomCode, (currentList) => {
        const botIdx = currentList.map(p => p.isBot).lastIndexOf(true);
        if (botIdx === -1) return currentList;
        return currentList.filter((_, i) => i !== botIdx);
      });
    }

    // Builds the three Turn Timer preset buttons and highlights whichever
    // matches state.turnTimerMs. Re-run any time the lobby view (re)shows,
    // so a value that arrived from Firebase (or was just clicked) is always
    // reflected correctly, never stale.
    function resetHouseRulesReady() {
      state.players = (state.players || []).map(p => ({ ...p, houseRulesReady: !!p.isBot }));
    }
    async function publishHouseRules(nextMode, rules, friendsMode) {
      if (!state.isHost || !state.roomCode || state.phase !== 'LOBBY' || seriesIsActive(seriesState)) return false;
      const mode = nextMode === 'house' ? 'house' : 'standard';
      const nextRules = mode === 'house' ? JSON.parse(JSON.stringify(rules || ShHouseRules.CLASSIC)) : null;
      const code = state.roomCode, hostId = state.localPlayerId;
      try {
        const result = await db.ref(`rooms/${code}`).transaction(room => {
          if (!room || room.phase !== 'LOBBY' || room.hostId !== hostId) return;
          const players = roomPlayerList(room.players);
          if (mode === 'standard' && players.filter(p => p.isBot).length > 2) return;
          if (friendsMode === 'series' && players.some(p => p.isBot)) return;
          return {...room, ruleMode: mode, friendsMode: friendsMode || mode, houseRules: nextRules,
            players: players.map(p => ({...p, houseRulesReady: !!p.isBot})), houseRulesChangedAt: firebase.database.ServerValue.TIMESTAMP};
        });
        if (!result.committed) { notifyBanner('Remove extra bots or wait for the current game to finish before changing modes.'); return false; }
        if (state.roomCode === code) {
          const room = result.snapshot.val();
          state.ruleMode = mode; state.friendsMode = room.friendsMode; state.houseRules = nextRules;
          state.players = roomPlayerList(room.players);
          renderHouseRulesPanel(); updateLobbyPlayerList();
        }
        return true;
      } catch (e) { notifyBanner('Could not save the rules. Please try again.'); return false; }
    }
    function setHouseRule(rank, value) {
      if (!state.isHost || !isHouseRulesMatch() || state.phase !== 'LOBBY' || seriesIsActive(seriesState)) return;
      const next=JSON.parse(JSON.stringify(state.houseRules));
      if(rank==='JOKER') next.joker=value; else if(rank==='FOUR') next.fourKind=value; else next.cards[rank]=value;
      const v=ShHouseRules.validate(next);
      // Individual illegal choices and a third use of a power are hard locked.
      if (value && v.errors.some(e => e.includes('cannot use') || e.includes('can only be assigned'))) { notifyBanner(v.errors[0]); return; }
      publishHouseRules('house', next);
    }
    function houseRulesReadyToggle() {
      if (state.ruleMode !== 'house' || !state.roomCode || state.phase !== 'LOBBY') return;
      const v=ShHouseRules.validate(state.houseRules || {});
      if (!v.valid) { notifyBanner(v.errors[0]); return; }
      updatePlayersAtomic(state.roomCode, list => list.map(p => p.id===state.localPlayerId ? {...p,houseRulesReady:!p.houseRulesReady} : p));
    }
    function houseOptionHtml(rank,current,isJoker=false) {
      const used=ShHouseRules.counts(state.houseRules||{});
      const values=isJoker?ShHouseRules.JOKER:ShHouseRules.POWERS;
      const label=p=>p==='off'?'Off':(ShHouseRules.LABEL[p]||p);
      return '<option value="">Please Select</option>'+values.map(p=>{
        const invalid=!isJoker&&!ShHouseRules.allowed(rank,p);
        const capped=p!=='none'&&p!=='off'&&(used[p]||0)>=2&&current!==p;
        return `<option value="${p}" ${p===current?'selected':''} ${invalid||capped?'disabled':''}>${label(p)}${capped?' — 2/2 used':''}</option>`;
      }).join('');
    }
    function loadHouseVariantsFromCloud() { window.ShHousePresets?.load(); }
    function saveCurrentHouseVariant() { window.ShHousePresets?.open(); }
    function renderHouseRulesPanel() {
      const el=document.getElementById('houseRulesPanel'); if(!el||!window.ShHouseRules)return;
      loadHouseVariantsFromCloud();
      const house=state.ruleMode==='house', host=!!state.isHost && state.phase==='LOBBY' && !seriesIsActive(seriesState);
      const rules=state.houseRules||ShHouseRules.fresh(), validation=house?ShHouseRules.validate(rules):{valid:true,errors:[],warnings:[]};
      const saved=currentUser?ShHouseRules.loadVariants(currentUser.uid):[];
      const humanReady=(state.players||[]).filter(p=>!p.isBot).filter(p=>p.houseRulesReady).length;
      const humans=(state.players||[]).filter(p=>!p.isBot).length;
      el.innerHTML=`
        <div class="flex items-center justify-between gap-2">
          <div><span class="text-[10px] font-black uppercase tracking-wider text-amber-300">House Rules</span>
          <button type="button" id="houseInfoBtn" class="ml-1 w-5 h-5 rounded-full border border-slate-600 text-[11px] font-black text-slate-300">i</button>
          <div class="text-[9px] font-bold text-slate-500">Unranked · No Challenges · No Diamonds</div></div>
          ${host?`<select id="houseModeSelect" class="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] font-black text-white"><option value="standard" ${!house?'selected':''}>Standard</option><option value="house" ${house?'selected':''}>House Rules</option></select>`:`<span class="text-[10px] font-black ${house?'text-amber-300':'text-slate-400'}">${house?'HOUSE RULES':'STANDARD'}</span>`}
        </div>
        <div id="houseInfoText" class="hidden mt-2 p-2 rounded bg-slate-900 text-[10px] leading-relaxed text-slate-300 border border-slate-700">The host assigns powers to card ranks. Every player sees the rules before Ready. Bots use the same rules and adapt by difficulty. House Rules never affect Ranked, Challenges or Diamond earnings.</div>
        ${house?`<div class="mt-2 space-y-2">
          <div class="house-presets" role="group" aria-label="Rulesets"><button type="button" data-house-preset="classic" ${host?'':'disabled'}>ShitHead Deluxe</button>${Array.from({length:3},(_,i)=>`<button type="button" data-house-preset="${i}" ${host?'':'disabled'} title="${escapeAttr(saved[i]?.name||'Custom Rule '+(i+1))}">${escapeHtml(saved[i]?.name||'Custom Rule '+(i+1))}</button>`).join('')}</div>
          ${host?'<button type="button" id="houseSaveBtn" class="pf-save">Name & save ruleset</button>':''}
          <div class="house-powers grid grid-cols-2 gap-x-2 gap-y-1">${ShHouseRules.RANKS.map(r=>`<label class="flex items-center justify-between gap-1 text-[10px] font-black text-slate-300"><span>${r}</span><select data-house-rank="${r}" ${host?'':'disabled'} class="w-28 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-white">${houseOptionHtml(r,rules.cards?.[r]||'')}</select></label>`).join('')}
          <label class="flex items-center justify-between gap-1 text-[10px] font-black text-slate-300"><span>Joker</span><select data-house-rank="JOKER" ${host?'':'disabled'} class="w-28 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-white">${houseOptionHtml('JOKER',rules.joker||'',true)}</select></label>
          <label class="flex items-center justify-between gap-1 text-[10px] font-black text-slate-300"><span>4 of a Kind</span><select data-house-rank="FOUR" ${host?'':'disabled'} class="w-28 bg-slate-900 border border-slate-700 rounded px-1 py-1 text-[9px] text-white"><option value="">Please Select</option><option value="burns" ${rules.fourKind==='burns'?'selected':''}>Burns</option><option value="none" ${rules.fourKind==='none'?'selected':''}>No Power</option></select></label></div>
          <div class="text-[9px] font-bold ${validation.valid?'text-emerald-400':'text-rose-400'}">${validation.valid?'✓ Rules valid':escapeHtml(validation.errors[0]||'Rules incomplete')}${validation.warnings.length?'<br><span class="text-amber-400">⚠ '+escapeHtml(validation.warnings.join(' '))+'</span>':''}</div>
          <button id="houseReadyBtn" ${validation.valid?'':'disabled'} class="w-full py-1.5 rounded border ${(state.players.find(p=>p.id===state.localPlayerId)?.houseRulesReady)?'bg-emerald-700 border-emerald-500':'bg-slate-800 border-slate-600'} text-[10px] font-black disabled:opacity-40">${(state.players.find(p=>p.id===state.localPlayerId)?.houseRulesReady)?'✓ READY':'READY FOR HOUSE RULES'} · ${humanReady}/${humans}</button>
        </div>`:''}`;
      el.querySelector('#houseInfoBtn')?.addEventListener('click',()=>el.querySelector('#houseInfoText')?.classList.toggle('hidden'));
      el.querySelector('#houseModeSelect')?.addEventListener('change',e=>publishHouseRules(e.target.value,e.target.value==='house'?ShHouseRules.CLASSIC:null));
      el.querySelectorAll('[data-house-rank]').forEach(s=>s.addEventListener('change',e=>setHouseRule(e.target.dataset.houseRank,e.target.value)));
      window.ShHousePresets?.bind(el, host);
      window.ShFriendsLobby?.layoutRules();
      el.querySelector('#houseSaveBtn')?.addEventListener('click',saveCurrentHouseVariant);
      el.querySelector('#houseReadyBtn')?.addEventListener('click',houseRulesReadyToggle);
    }

    function renderTurnTimerButtons() {
      const row = document.getElementById('turnTimerBtnRow');
      if (!row) return;
      row.innerHTML = '';
      TURN_TIMER_PRESETS.forEach(preset => {
        const isActive = (state.turnTimerMs || 15000) === preset.ms;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.timerMs = preset.ms;
        btn.className = `py-1 px-1 rounded-lg border-2 font-black text-[10px] uppercase tracking-wider transition ${
          isActive
            ? 'border-amber-500 bg-amber-950/60 text-amber-300'
            : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-amber-500'
        }`;
        btn.innerHTML = `${preset.label}<span class="block text-[8px] font-bold opacity-80">${Math.round(preset.ms / 1000)}s</span>`;
        btn.addEventListener('click', () => setMultiplayerTurnTimer(preset.ms));
        row.appendChild(btn);
      });
    }

    function setMultiplayerTurnTimer(ms) {
      if (!state.isHost || !state.roomCode || state.phase !== 'LOBBY' || seriesIsActive(seriesState) || !TURN_TIMER_PRESETS.some(p => p.ms === ms)) return;
      state.turnTimerMs = ms;
      renderTurnTimerButtons();
      db.ref(`rooms/${state.roomCode}`).update({ turnTimerMs: ms }).catch(() => notifyBanner('Could not save game speed. Please try again.'));
    }

    function updateLobbyPlayerList() {
      if (state.isHost && !state.isRanked) setTimeout(() => showHelperTip('host-invite', '#shareInviteLinkBtn'), 600); // § Helper tips
      const list = document.getElementById('connectedPlayersList');
      const counter = document.getElementById('playerCounter');
      list.innerHTML = '';
      counter.textContent = `${state.players.length} / 4`;
      const label = counter.previousElementSibling;
      if (label) label.innerHTML = state.ruleMode === 'house' ? 'Players / Bots: <span class="ml-1 px-1.5 py-0.5 rounded bg-amber-900/60 border border-amber-600 text-amber-300 text-[8px]">HOUSE RULES</span>' : 'Players / Bots:';
      
      window.ShFriendsLobby?.render();
      watchSeriesRoom();
      renderSeriesPanel();
      renderHouseRulesPanel();
      renderTurnTimerButtons();
    }

    function canStartMultiplayerGame() {
      // Checking human count first (rather than total player count) means this
      // always shows the accurate message — the old "need 2 players/bots"
      // wording was misleading, since 2 bots alone would still fail the real
      // requirement just below it anyway.
      const otherHumans = state.players.filter(p => !p.isBot && p.id !== state.localPlayerId).length;
      if (state.ruleMode === 'house') {
        const v = window.ShHouseRules ? ShHouseRules.validate(state.houseRules || {}) : {valid:false,errors:['House Rules are still loading.']};
        if (!v.valid) { notifyBanner(v.errors[0]); return false; }
        if (state.players.length < 2) { notifyBanner('Add at least one player or bot.'); return false; }
        const waiting = state.players.filter(p => !p.isBot && !p.houseRulesReady);
        if (waiting.length) { notifyBanner('Everyone must review the House Rules and press Ready.'); return false; }
        return true;
      }
      if (otherHumans < 1) {
        document.getElementById('needHumanRoomCode').textContent = state.roomCode || '------';
        document.getElementById('needHumanModal').classList.remove('hidden');
        return false;
      }
      return true;
    }

    function initMultiplayerLobbyControls() {
    document.getElementById('hostRoomBtn').addEventListener('click', () => {
      if (!requireValidName()) return;
      window.ShFriendsLobby?.showSetup();
    });
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
      if (!requireValidName()) return;
      joinMultiRoom();
    });
    document.getElementById('joinCodeInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        document.getElementById('joinRoomBtn').click();
      }
    });
    document.getElementById('leaveRoomBtn').addEventListener('click', () => leaveRoomAndReload());
    document.getElementById('addBotBtn').addEventListener('click', addBotToMultiplayerLobby);
    document.getElementById('removeBotBtn').addEventListener('click', removeBotFromMultiplayerLobby);
    document.getElementById('startMultiGameBtn').addEventListener('click', () => {
      if (seriesBlocksLobbyAction('start')) return;
      if (!canStartMultiplayerGame()) return;
      broadcastShuffleStart();
      runShuffleIntro(startMultiplayerGame);
    });

    }
