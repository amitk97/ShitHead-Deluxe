/* Play Friends presentation and host configuration. Room writes stay transactional. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let draft = 'standard', setup = false, cursor = 2, returnFocus = null, busy = false, centeredMode = null;
  const inRoom = () => !!state.roomCode && state.isMultiplayer && !state.isRanked;
  const editable = () => inRoom() && state.isHost && state.phase === 'LOBBY' && !seriesIsActive(seriesState);
  const selected = () => seriesIsActive(seriesState) ? 'series' : inRoom() ? (state.friendsMode || state.ruleMode || 'standard') : draft;
  const seriesUnlocked = () => !!currentUser && xpShown() && !!playerXp && xpLevelFor(playerXp.total) >= SERIES_RULES.level;
  const modalOpen = () => !$('friendsConfigModal').classList.contains('hidden');

  function render() {
    roomCodeCard.hidden = !inRoom();
    const room = inRoom(), host = room && state.isHost, mode = room ? selected() : modes[cursor];
    $('friendsHub').classList.toggle('hidden', !room && !setup);
    $('friendsSeats').hidden = !room;
    $('friendsSetupBack').hidden = room;
    $('friendsModeCarousel').hidden = room;
    $('friendsCarouselControls').hidden = room;
    $('friendsConfirmMode').hidden = room;
    $('friendsRoomSettings').classList.toggle('hidden', !room || !host);
    $('friendsHostHint').parentElement.hidden = room;
    $('friendsConfirmMode').disabled = busy || mode.startsWith('soon') || (mode === 'series' && !seriesUnlocked());
    $('friendsConfirmMode').textContent = busy ? 'CREATING ROOM…' : mode.startsWith('soon') ? 'COMING SOON' : mode === 'series' && !seriesUnlocked() ? 'UNLOCKS AT LEVEL 20' : `HOST ${mode === 'house' ? 'HOUSE RULES' : mode === 'series' ? 'BEST OF SERIES' : 'STANDARD'} ROOM`;
    const preview = {id: state.localPlayerId, name: $('playerNameInput').value.trim() || currentUser?.displayName || 'You', cosmetics: getPublicCosmeticLoadout()};
    const players = room ? [...state.players].sort((a,b) => Number(b.isHost) - Number(a.isHost)) : [preview];
    const html = Array.from({length:4}, (_,i) => {
      const p = players[i];
      if (!p) return `<div class="pf-seat pf-seat-empty"><span class="pf-empty-avatar" aria-hidden="true">+</span><strong>Seat ${i+1}</strong><small>Waiting for a friend<br>or a bot</small></div>`;
      const own = p.id === state.localPlayerId;
      const level = own && playerXp ? xpLevelFor(playerXp.total) : Number(p.cosmetics?.level) || 1;
      return `<div class="pf-seat${p.isBot?' pf-seat-bot':''}">${avatarHtml(getPlayerAvatarId(p),56)}<strong title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</strong>${p.isBot?`<small>${escapeHtml(p.difficulty || 'medium')} bot</small>`:xpLevelBadge(level)}<small>${p.isHost || !room?'Host':own?'You':'Friend'}${room && mode==='house' ? (p.houseRulesReady?' · Ready':' · Not ready'):''}</small>${host&&!p.isHost&&!own?`<button type="button" class="pf-remove" data-seat-remove="${escapeAttr(p.id)}" aria-label="Remove ${escapeAttr(p.name)}">×</button>`:''}</div>`;
    }).join('');
    if ($('friendsSeats').innerHTML !== html) $('friendsSeats').innerHTML = html;
    $('friendsEntryActions').classList.toggle('hidden', room || setup || !$('friendsJoinView').classList.contains('hidden'));
    $('friendsHostHint').textContent = room ? host ? 'Host controls' : 'Host chooses the mode' : 'You host. You choose.';
    document.querySelectorAll('[data-friends-mode]').forEach(el => {
      const m = el.dataset.friendsMode;
      el.setAttribute('aria-pressed', String(m===mode));
      el.disabled = room && (!host || busy || seriesIsActive(seriesState));
    });
    document.querySelectorAll('[data-friends-config]').forEach(el => {el.hidden = room && !host; el.disabled = busy || (room && !editable());});
    const carousel = $('friendsModeCarousel');
    if (!room && carousel.clientWidth && centeredMode !== mode) {
      const card = carousel.querySelector(`[data-friends-mode="${mode}"]`);
      if (card) {
        const a = card.getBoundingClientRect(), b = carousel.getBoundingClientRect();
        carousel.scrollTo({left: carousel.scrollLeft + a.left - b.left - (b.width - a.width) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('reduce-motion') ? 'instant' : 'smooth'});
      }
      centeredMode = mode;
    }
    $('friendsSeriesLock').classList.toggle('hidden', seriesUnlocked());
    $('friendsSeriesLock').querySelector('span').textContent = `Level ${SERIES_RULES.level}`;
    $('friendsModeSummary').textContent = mode==='house' ? 'House Rules · Unranked · No Challenges or Diamonds' : mode==='series' ? 'Standard rules · Two signed-in players · Level 20+' : 'Standard rules · Invite a friend to start';
    $('friendsReadyRow').classList.toggle('hidden', !room || mode!=='house');
    const me=state.players.find(p=>p.id===state.localPlayerId);
    $('friendsReady').textContent = me?.houseRulesReady ? 'Ready ✓' : 'Ready';
    $('friendsReady').setAttribute('aria-pressed',String(!!me?.houseRulesReady));
    $('friendsReady').disabled = busy || (mode==='house' && !ShHouseRules.validate(state.houseRules||{}).valid);
    if(modalOpen()) {
      if(!room || state.phase!=='LOBBY') {closeConfig();return;}
      const house=state.ruleMode==='house';
      $('friendsConfigTitle').textContent = house ? (host?'House Rules settings':'House Rules') : 'Standard settings';
      $('houseRulesPanel').classList.toggle('hidden',!house);
      $('friendsCommonSettings').classList.toggle('hidden',!host);
      const humans=state.players.filter(p=>!p.isBot).length, bots=state.players.filter(p=>p.isBot).length;
      const max=Math.min(house?3:2,4-humans);
      $('friendsBotCount').innerHTML = Array.from({length:max+1},(_,n)=>`<option value="${n}" ${n===bots?'selected':''}>${n} ${n===1?'bot':'bots'}</option>`).join('');
      $('friendsBotDifficulty').innerHTML = Object.keys(DIFF_LABELS).map(d=>`<option value="${d}" ${d===(state.lobbyBotDifficulty||state.difficulty)?'selected':''} ${!unlockedDifficulties[d]?'disabled':''}>${d[0].toUpperCase()+d.slice(1)}${!unlockedDifficulties[d]?' (locked)':''}</option>`).join('');
      $('friendsBotCount').disabled = $('friendsBotDifficulty').disabled = !editable() || busy;
    }
  }
  const modes = ['soon-left', 'house', 'standard', 'series', 'soon-right'];
  // Keep the existing room-code and invite controls above the compact seats.
  const roomCodeCard = $('prominentRoomCode').parentElement;
  $('friendsHub').insertBefore(roomCodeCard, $('friendsSeats'));
  function showSetup() {
    if (inRoom() || busy) return;
    setup = true; cursor = 2; draft = 'standard'; centeredMode = null;
    $('friendsJoinView').classList.add('hidden'); render();
    $('friendsModeCarousel').querySelector('[data-friends-mode=standard]').focus({preventScroll:true});
  }
  function showHub() {
    setup = false;
    $('friendsJoinView').classList.add('hidden');
    roomCodeCard.hidden = !inRoom();
    render();
  }
  function closeConfig() {
    if (!modalOpen()) return;
    $('friendsConfigModal').classList.add('hidden');
    if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function backToHub() {
    if(modalOpen()) {closeConfig();return true;}
    if(!$('friendsJoinView').classList.contains('hidden')) {showHub();return true;}
    if(setup && !inRoom() && !busy) {showHub(); $('hostRoomBtn').focus(); return true;}
    return false;
  }
  async function selectMode(mode) {
    if(!inRoom()) {
      cursor=modes.indexOf(mode); if(cursor<0)cursor=2;
      draft=mode;render();return true;
    }
    if(mode.startsWith('soon')) {notifyBanner('This mode is coming soon.');return false;}
    if(mode==='series' && !seriesUnlocked()) {notifyBanner('Best of Series unlocks at level 20.');return false;}
    if(!editable() || busy) return false;
    if(mode===selected()) return true;
    if(mode==='series' && state.players.some(p=>p.isBot)) {notifyBanner('Remove the bots in settings before choosing a series.');return false;}
    return publishHouseRules(mode==='house'?'house':'standard',mode==='house'?(state.houseRules||ShHouseRules.CLASSIC):null,mode);
  }
  async function openConfig(mode, review=false) {
    if(!inRoom()) {notifyBanner('Host a room to configure your table.');return;}
    if(!review && !editable()) return;
    if(mode==='series') {await selectMode(mode); return;}
    returnFocus=document.activeElement;
    if(!review && !await selectMode(mode)) return;
    renderHouseRulesPanel(); renderTurnTimerButtons();
    $('friendsConfigModal').classList.remove('hidden');
    render(); $('friendsConfigBack').focus();
  }
  async function setBots(count,difficulty) {
    if(!editable() || busy || !unlockedDifficulties[difficulty]) return;
    busy=true;render();
    const code=state.roomCode;
    try {
      const res=await db.ref(`rooms/${code}`).transaction(room=>{
        if(!room || room.phase!=='LOBBY' || room.hostId!==state.localPlayerId || room.friendsMode==='series') return;
        const players=roomPlayerList(room.players), humans=players.filter(p=>!p.isBot);
        const max=Math.min(room.ruleMode==='house'?3:2,4-humans.length);
        const n=Math.max(0,Math.min(max,Math.trunc(Number(count)||0)));
        const bots=players.filter(p=>p.isBot).slice(0,n).map(p=>({...p,difficulty}));
        while(bots.length<n) {
          const names=new Set([...humans,...bots].map(p=>p.name.replace(/ \(Bot\)$/,'')));
          const name=BOT_NAMES.find(n=>!names.has(n))||`Bot ${bots.length+1}`;
          bots.push({id:'p_bot_'+Math.random().toString(36).slice(2,9),name:name+' (Bot)',isBot:true,isHost:false,difficulty,houseRulesReady:true,avatar:pickBotAvatar([...humans,...bots]),cosmetics:{cardBack:pickBotCardBack()},hand:[],faceUp:[],faceDown:[],isReady:false,hasFinished:false});
        }
        return {...room,players:[...humans,...bots],lobbyBotDifficulty:difficulty};
      });
      if(res.committed && state.roomCode===code) {
        state.players=roomPlayerList(res.snapshot.val().players);state.lobbyBotDifficulty=difficulty;updateLobbyPlayerList();
      }
    } catch(e) {notifyBanner('Could not save bot settings. Please try again.');}
    finally {busy=false;render();}
  }
  window.ShFriendsLobby={render,showHub,showSetup,closeConfig,backToHub,draftMode:()=>draft};
  document.querySelectorAll('[data-friends-mode]').forEach(el=>el.addEventListener('click',()=>selectMode(el.dataset.friendsMode)));
  document.querySelectorAll('[data-friends-config]').forEach(el=>el.addEventListener('click',()=>openConfig(el.dataset.friendsConfig)));
  $('friendsSetupBack').addEventListener('click', () => {if(!busy)showHub();});
  const move = direction => {cursor = direction==='first' ? 0 : direction==='last' ? 4 : Math.max(0,Math.min(4,cursor+(direction==='prev'?-1:1)));selectMode(modes[cursor]);};
  document.querySelectorAll('[data-friends-step]').forEach(el=>el.addEventListener('click',()=>move(el.dataset.friendsStep)));
  $('friendsConfirmMode').addEventListener('click', async () => {
    const mode=modes[cursor];
    if(busy || inRoom() || mode.startsWith('soon') || (mode==='series'&&!seriesUnlocked()) || !requireValidName()) return;
    draft=mode;busy=true;render();
    try {await initHostRoom();} catch(e) { /* initHostRoom reports the failure and restores the input. */ }
    finally {busy=false;render();}
  });
  document.addEventListener('keydown', e => {
    if(!setup || inRoom() || busy || !$('multiOptions').getClientRects().length || modalOpen() || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input,select,textarea,[contenteditable=true]') || document.querySelector('.pf-modal:not(.hidden), #hamburgerDrawer.open')) return;
    if(/^[1-5]$/.test(e.key)) {e.preventDefault();e.stopImmediatePropagation();selectMode(modes[Number(e.key)-1]);}
    else if(e.key==='ArrowLeft' || e.key==='ArrowRight') {e.preventDefault();e.stopImmediatePropagation();move(e.key==='ArrowLeft'?'prev':'next');}
  });
  $('friendsJoinOpen').addEventListener('click',()=>{setup=false;$('friendsEntryActions').classList.add('hidden');$('friendsHub').classList.add('hidden');$('friendsJoinView').classList.remove('hidden');$('joinCodeInput').focus();});
  $('friendsJoinBack').addEventListener('click',showHub);
  $('friendsConfigBack').addEventListener('click',closeConfig);
  $('friendsConfigModal').addEventListener('click',e=>{if(e.target===$('friendsConfigModal'))closeConfig();});
  $('friendsConfigModal').addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const items=[...$('friendsConfigModal').querySelectorAll('button,select,input')].filter(el=>!el.disabled && el.getClientRects().length);
    if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1)?.focus();}
    else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0]?.focus();}
  });
  $('friendsSeats').addEventListener('click',e=>{const btn=e.target.closest('[data-seat-remove]');if(btn && editable())kickPlayer(btn.dataset.seatRemove);});
  $('friendsReady').addEventListener('click',houseRulesReadyToggle);
  $('friendsReviewRules').addEventListener('click',()=>openConfig('house',true));
  $('friendsBotCount').addEventListener('change',e=>setBots(e.target.value,$('friendsBotDifficulty').value));
  $('friendsBotDifficulty').addEventListener('change',e=>setBots($('friendsBotCount').value,e.target.value));
  $('playerNameInput').addEventListener('input',render);
  new MutationObserver(()=>{if(!$('multiOptions').classList.contains('hidden'))render();else closeConfig();}).observe($('multiOptions'),{attributes:true,attributeFilter:['class']});
  render();
})();

