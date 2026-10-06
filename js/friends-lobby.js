/* Play Friends presentation and host configuration. Room writes stay transactional. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let draft = 'standard', setup = false, cursor = 2, returnFocus = null, busy = false, configTab = 'rules', rulesPage = 0;
  const inRoom = () => !!state.roomCode && state.isMultiplayer && !state.isRanked;
  const editable = () => inRoom() && state.isHost && state.phase === 'LOBBY' && !seriesIsActive(seriesState);
  const selected = () => seriesIsActive(seriesState) ? 'series' : inRoom() ? (state.friendsMode || state.ruleMode || 'standard') : draft;
  const seriesUnlocked = () => !!currentUser && xpShown() && !!playerXp && xpLevelFor(playerXp.total) >= SERIES_RULES.level;
  const modalOpen = () => !$('friendsConfigModal').classList.contains('hidden');

  function render() {
    roomCodeCard.hidden = !inRoom();
    $('multiOptions').classList.toggle('pf-in-room',inRoom());
    const room = inRoom(), host = room && state.isHost, mode = room ? selected() : modes[cursor];
    $('friendsHub').classList.toggle('hidden', !room && !setup);
    $('friendsSeats').hidden = !room;
    $('friendsModeCarousel').hidden = room;
    $('friendsCarouselControls').hidden = room;
    $('friendsConfirmMode').hidden = room;
    $('friendsRoomSettings').classList.toggle('hidden', !room || (!host && mode!=='series'));
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
      el.setAttribute('aria-disabled', String(room && (!host || busy || seriesIsActive(seriesState))));
    });
    document.querySelectorAll('[data-friends-config]').forEach(el => {el.hidden = room && !host && mode!=='series'; el.disabled = busy || (room && mode!=='series' && !editable());});
    paintCarousel();
    const trigger=$('friendsSettingsTrigger');
    trigger.dataset.friendsConfig=mode==='house'?'house':mode==='series'?'series':'standard';
    trigger.querySelector('span').textContent=mode==='house'?'Custom Rules':mode==='series'?'Series Settings':'Table Settings';
    trigger.hidden=false;
    $('friendsSeriesLock').classList.toggle('hidden', seriesUnlocked());
    $('friendsSeriesLock').querySelector('span').textContent = `Level ${SERIES_RULES.level}`;
    $('friendsModeSummary').hidden = true;
    $('friendsModeSummary').textContent = mode==='house' ? 'House Rules · Unranked · No Challenges or Diamonds' : mode==='series' ? 'Standard rules · Two signed-in players · Level 20+' : 'Standard rules · Invite a friend to start';
    $('friendsReadyRow').classList.toggle('hidden', !room || mode!=='house');
    const me=state.players.find(p=>p.id===state.localPlayerId);
    $('friendsReady').textContent = me?.houseRulesReady ? 'Ready ✓' : 'Ready';
    $('friendsReady').setAttribute('aria-pressed',String(!!me?.houseRulesReady));
    $('friendsReady').disabled = busy || (mode==='house' && !ShHouseRules.validate(state.houseRules||{}).valid);
    if(modalOpen()) {
      if(!room || state.phase!=='LOBBY') {closeConfig();return;}
      const house=state.ruleMode==='house', series=mode==='series';
      $('friendsConfigTitle').textContent = house ? (host?'Custom Rules':'House Rules') : series ? 'Best of Series' : 'Table Settings';
      $('friendsConfigTabs').hidden=!house || !host;
      $('houseRulesPanel').classList.toggle('hidden',!house || (host && configTab!=='rules'));
      $('friendsCommonSettings').classList.toggle('hidden',!host || series || (house && configTab!=='table'));
      const humans=state.players.filter(p=>!p.isBot).length, bots=state.players.filter(p=>p.isBot).length;
      const max=Math.min(house?3:2,4-humans);
      $('friendsBotCount').innerHTML = Array.from({length:max+1},(_,n)=>`<option value="${n}" ${n===bots?'selected':''}>${n} ${n===1?'bot':'bots'}</option>`).join('');
      $('friendsBotDifficulty').innerHTML = Object.keys(DIFF_LABELS).map(d=>`<option value="${d}" ${d===(state.lobbyBotDifficulty||state.difficulty)?'selected':''} ${!unlockedDifficulties[d]?'disabled':''}>${d[0].toUpperCase()+d.slice(1)}${!unlockedDifficulties[d]?' (locked)':''}</option>`).join('');
      $('friendsSeriesSettings').classList.toggle('hidden',!series);
      $('friendsBotCount').disabled = $('friendsBotDifficulty').disabled = !editable() || busy;
    }
  }
  const modes = ['soon-left', 'house', 'standard', 'series', 'soon-right'];
  // Keep the existing room-code and invite controls above the compact seats.
  const roomCodeCard = $('prominentRoomCode').parentElement;
  $('friendsHub').insertBefore(roomCodeCard, $('friendsSeats'));
  const seriesSettings=document.createElement('div');seriesSettings.id='friendsSeriesSettings';seriesSettings.className='hidden';
  $('friendsConfigModal').querySelector('.pf-config-card').append(seriesSettings);seriesSettings.append($('seriesPanel'));
  function showSetup() {
    if (inRoom() || busy) return;
    setup = true; cursor = 2; draft = 'standard';
    window.ShHousePresets?.resetSelection();
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
    window.ShHousePresets?.close();
    if (!modalOpen()) return;
    $('friendsConfigModal').classList.add('hidden');
    if(returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
  }
  function backToHub() {
    if(window.ShHousePresets?.isOpen()) {ShHousePresets.close();return true;}
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
    if(!review && mode!=='series' && !editable()) return;
    returnFocus=document.activeElement;
    if(!review && mode!=='series' && !await selectMode(mode)) return;
    if(mode==='series' && selected()!=='series')return;
    configTab=mode==='house'?'rules':'table'; rulesPage=0;
    renderHouseRulesPanel(); renderTurnTimerButtons();
    $('friendsConfigModal').classList.remove('hidden');
    render(); layoutRules(); $('friendsConfigBack').focus();
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
  function layoutRules() {
    const labels=[...$('houseRulesPanel').querySelectorAll('.house-powers > label')];
    const size=6, pages=Math.ceil(labels.length/size);
    rulesPage=Math.min(rulesPage,Math.max(0,pages-1));
    labels.forEach((el,i)=>el.hidden=Math.floor(i/size)!==rulesPage);
    let nav=$('houseRulesPages');
    if(!nav && labels.length) {
      nav=document.createElement('div');nav.id='houseRulesPages';nav.className='pf-pages';
      $('houseRulesPanel').querySelector('.house-powers').after(nav);
    }
    if(nav) {
      nav.innerHTML=Array.from({length:pages},(_,i)=>`<button type="button" aria-label="Card powers page ${i+1}" aria-pressed="${i===rulesPage}">${i===0?'2 – 7':i===1?'8 – K':'Ace · Joker · Four'}</button>`).join('');
      [...nav.children].forEach((btn,i)=>btn.addEventListener('click',()=>{rulesPage=i;layoutRules();$('houseRulesPages').children[i].focus({preventScroll:true});}));
    }
    document.querySelectorAll('[data-config-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.configTab===configTab)));
  }
  window.ShFriendsLobby={render,showHub,showSetup,closeConfig,backToHub,layoutRules,draftMode:()=>draft};
  document.querySelectorAll('[data-friends-config]').forEach(el=>el.addEventListener('click',()=>openConfig(el.dataset.friendsConfig)));
  document.querySelectorAll('[data-config-tab]').forEach(el=>el.addEventListener('click',()=>{configTab=el.dataset.configTab;render();layoutRules();}));
  const track=$('friendsModeCarousel'), cards=[...track.querySelectorAll('.mc-card')];
  const arrows=[...$('friendsCarouselControls').children];
  function paintCarousel() {
    const width=$('friendsModeCarousel').querySelector('.mc-card').offsetWidth;
    if(!width)return;
    const step=width*.86;
    [...$('friendsModeCarousel').children].forEach((c,i)=>{
      const d=i-cursor,a=Math.abs(d);
      c.style.setProperty('--mc-x',(Math.sign(d)*(a===0?0:a===1?step:step*(1+(a-1)*.7))).toFixed(1)+'px');
      c.style.setProperty('--mc-z',(-a*70)+'px');
      c.style.setProperty('--mc-r',(-Math.sign(d)*Math.min(a,2)*18)+'deg');
      c.style.setProperty('--mc-s',(1-Math.min(a,3)*.13).toFixed(2));
      c.style.setProperty('--mc-o',a>2?'0':'1');
      c.style.setProperty('--mc-dim',a===0?'0':a===1?'.38':'.62');
      c.style.setProperty('--mc-zi',String(10-a));
      c.classList.toggle('mc-focus',a===0);c.classList.toggle('mc-gone',a>2);c.tabIndex=a===0?0:-1;
      const go=c.querySelector('[data-friends-go]');
      go.disabled=busy || a!==0 || modes[i].startsWith('soon') || (modes[i]==='series'&&!seriesUnlocked());
      go.tabIndex=go.disabled?-1:0;go.hidden=a!==0 || modes[i].startsWith('soon');
    });
    document.querySelectorAll('[data-friends-step]').forEach(b=>b.disabled=(['first','prev'].includes(b.dataset.friendsStep)?cursor===0:cursor===4));
  }
  const turnTo=i=>{const n=Math.max(0,Math.min(4,i));if(n===cursor || busy)return false;selectMode(modes[n]);Haptics.vibrate([15]);audio.playCarouselSnap();return true;};
  const move=dir=>turnTo(dir==='first'?0:dir==='last'?4:cursor+(dir==='prev'?-1:1));
  let swiped=false,lastTap=null;
  track.addEventListener('click',e=>{
    const card=e.target.closest('[data-friends-mode]');if(!card)return;
    if(swiped && (e.detail!==0 || e.sourceCapabilities?.firesTouchEvents)){e.preventDefault();return;}
    const i=cards.indexOf(card),now=performance.now(),direct=!!e.target.closest('[data-friends-go]');
    const open=direct || (lastTap?.card===card && now-lastTap.at<400);
    turnTo(i);lastTap=open?null:{card,at:now};if(open)$('friendsConfirmMode').click();
  });
  track.addEventListener('keydown',e=>{if(e.target.closest('button') || !['Enter',' '].includes(e.key))return;e.preventDefault();const c=e.target.closest('[data-friends-mode]');if(c){turnTo(cards.indexOf(c));$('friendsConfirmMode').click();}});
  let hold=null;
  const stopHold=()=>{clearTimeout(hold);clearInterval(hold);hold=null;};
  arrows.forEach(b=>{
    const step=['prev','next'].includes(b.dataset.friendsStep);
    b.addEventListener('click',e=>{if(!step || e.detail===0)move(b.dataset.friendsStep);});
    if(step)b.addEventListener('pointerdown',e=>{if(e.button)return;stopHold();move(b.dataset.friendsStep);hold=setTimeout(()=>{hold=setInterval(()=>{if(!move(b.dataset.friendsStep))stopHold();},160);},400);});
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,stopHold));
  });
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
      let down = null, dragHold = null, ignoreMouseUntil = 0;
      const dragStep = () => cards[0].getBoundingClientRect().width * .86;
      const stopDragHold = () => { clearTimeout(dragHold); dragHold = null; };
      const resetPull = () => {
        track.classList.remove('mc-dragging');
        track.style.removeProperty('--mc-dx');
      };
      const startDrag = (e) => {
        if (e.button || (e.type === 'mousedown' && performance.now() < ignoreMouseUntil)) return;
        // A new press replaces one whose release was never seen (let go outside the window).
        if (down) { stopDragHold(); resetPull(); down = null; }
        if (e.type === 'mousedown') e.preventDefault();
        down = { x: e.clientX, y: e.clientY, dx: 0, live: false, dir: 0, repeated: false, pointerId: e.pointerId };
        swiped = false;
      };
      const repeatDrag = () => {
        if (!down || !down.dir) return;
        down.repeated = true;
        resetPull();
        if (turnTo(cursor + down.dir)) dragHold = setTimeout(repeatDrag, 520);
      };
      const moveDrag = (e) => {
        if (!down || (e.pointerId != null && e.pointerId !== down.pointerId)) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.live) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
          down.live = true;
          if (e.pointerId != null) { try { track.setPointerCapture(e.pointerId); } catch (err) {} }
        }
        e.preventDefault();
        swiped = true; lastTap = null;
        down.dx = dx;
        const dir = Math.abs(dx) >= 30 ? (dx < 0 ? 1 : -1) : 0;
        if (dir !== down.dir) {
          stopDragHold(); down.dir = dir;
          if (dir) dragHold = setTimeout(repeatDrag, 450);
        }
        if (!down.repeated) {
          const edge = (dx > 0 && cursor === 0) || (dx < 0 && cursor === cards.length - 1);
          const pull = Math.max(-dragStep() * .7, Math.min(dragStep() * .7, dx));
          track.classList.add('mc-dragging');
          track.style.setProperty('--mc-dx', (edge ? pull / 3 : pull).toFixed(1) + 'px');
        }
      };
      const endDrag = (e) => {
        if (!down || (e.pointerId != null && e.pointerId !== down.pointerId)) return;
        const d = down; down = null;
        stopDragHold(); resetPull();
        if (d.pointerId != null) { try { track.releasePointerCapture(d.pointerId); } catch (err) {} }
        if (d.live && !d.repeated && (e.type === 'mouseup' || e.type === 'pointerup' || e.type === 'touchend' || e.type === 'mouseleave')) {
          if (d.dir) turnTo(cursor + d.dir);
        }
        // Keep click suppression until the next genuine press (touch clicks may arrive late).
      };
      track.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', moveDrag, { passive: false });
      window.addEventListener('mouseup', endDrag);
      track.addEventListener('mouseleave', endDrag);
      track.addEventListener('dragstart', (e) => e.preventDefault());
      track.addEventListener('selectstart', (e) => e.preventDefault());
      track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'pen') startDrag(e); });
      track.addEventListener('pointermove', (e) => { if (e.pointerType === 'pen') moveDrag(e); }, { passive: false });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => track.addEventListener(ev, (e) => {
        if (e.pointerType === 'pen') endDrag(e);
      }));
      const touchEvent = (e, t) => ({ type: e.type, button: 0, clientX: t.clientX, clientY: t.clientY,
        preventDefault: () => { if (e.cancelable) e.preventDefault(); } });
      let touchId = null;
      track.addEventListener('touchstart', (e) => {
        ignoreMouseUntil = performance.now() + 900;
        if (e.touches.length !== 1) { endDrag({ type: 'cancel' }); touchId = null; return; }
        const t = e.touches[0]; touchId = t.identifier;
        startDrag(touchEvent(e, t));
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (touchId == null) return;
        if (e.touches.length !== 1) { endDrag({ type: 'cancel' }); touchId = null; return; }
        const t = [...e.touches].find(t => t.identifier === touchId);
        if (t) moveDrag(touchEvent(e, t));
      }, { passive: false });
      const endTouch = (e) => {
        if (touchId == null) return;
        const t = [...e.changedTouches].find(t => t.identifier === touchId);
        if (!t) return;
        ignoreMouseUntil = performance.now() + 900;
        if (down?.live && e.cancelable) e.preventDefault();
        endDrag(touchEvent(e, t)); touchId = null;
      };
      window.addEventListener('touchend', endTouch, { passive: false });
      window.addEventListener('touchcancel', endTouch, { passive: false });

  ['blur','pagehide','resize'].forEach(ev=>window.addEventListener(ev,()=>{endDrag({type:'cancel'});stopHold();paintCarousel();}));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){endDrag({type:'cancel'});stopHold();}});
  new ResizeObserver(()=>{if(!track.getClientRects().length){endDrag({type:'cancel'});stopHold();}paintCarousel();}).observe(track);
  let wheelAt=0;
  track.addEventListener('wheel',e=>{const d=Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY;if(!d)return;e.preventDefault();if(performance.now()-wheelAt<220)return;wheelAt=performance.now();turnTo(cursor+(d>0?1:-1));},{passive:false});
  $('playerNameInput').addEventListener('input',render);
  new MutationObserver(()=>{if(!$('multiOptions').classList.contains('hidden'))render();else closeConfig();}).observe($('multiOptions'),{attributes:true,attributeFilter:['class']});
  render();
})();

