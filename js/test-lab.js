// § Test Lab (v405, owner): a home-carousel card that only the AmitK account sees. It opens a real Play Computer
// table that is already set up with a dummy position (a Pile, a Hand with a Joker, one bot) and a bottom sheet
// to fire any Burn, Joker or Victory effect on it, with its sound, and (v436) to try on any card back, table, deck,
// frame, emote pack or avatar, without owning or equipping anything. Looks are applied in memory only: the real look
// is kept when the lab opens and put back on Exit, and nothing is written to the account or the device.
// Nothing here is rewarded or saved: while it is open the match-win / finished / history reports and the saved
// game are switched off, and leaving (Exit Lab, or the header Exit) reloads to the home screen.
(() => {
  'use strict';
  const allowed = () => !!currentUser && isAmitkTestingAccount({});
  const SUITS = ['♠', '♥', '♦', '♣'], PILE_RANKS = ['K', '9', 'Q', '6', 'A', '8', 'J', '4', 'K', '5', 'Q', '9', '7', 'A', 'J', '10'];
  const mk = (rank, suit) => ({ id: 'lab_' + rank + suit + '_' + Math.random().toString(36).slice(2, 7), rank, suit: rank === 'JOKER' ? 'JOKER' : suit, isJoker: rank === 'JOKER' });
  const me = () => state.players.find((p) => p.id === state.localPlayerId);
  const bots = () => state.players.filter((p) => p.id !== state.localPlayerId);
  let tab = 'burn', counter = false, sheet = null, real = null, auto = null;
  const TAB_LABELS = { burn: 'Burn', joker: 'Joker', victory: 'Victory', cardBack: 'Back', tableTheme: 'Table', deck: 'Deck', frame: 'Frame', emotes: 'Emote', avatar: 'Avatar', table: 'Setup' };
  const LOOK = ['cardBack', 'tableTheme', 'deck', 'frame', 'emotes', 'avatar'];
  const curId = {};

  const CSS = `
    #testLab { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; max-height: 40vh; display: flex; flex-direction: column;
      background: rgba(8, 13, 28, .96); border-top: 1px solid #fbbf24; color: #e2e8f0; font-family: inherit; padding-bottom: env(safe-area-inset-bottom); }
    #testLab.tl-min { max-height: none; }
    #testLab .tl-head { display: flex; align-items: center; gap: 6px; padding: 6px 10px; }
    #testLab .tl-title { font-weight: 800; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #fbbf24; margin-right: auto; }
    #testLab .tl-head { flex-wrap: wrap; }
    #testLab .tl-tabs { display: flex; gap: 4px; order: 3; flex: 1 0 100%; overflow-x: auto; padding-bottom: 2px; }
    #testLab .tl-tab { flex: 0 0 auto; }
    #testLab .tl-bar { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 6px; align-items: center; }
    #testLab .tl-emotes { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 6px; }
    #testLab .tl-emotes button { font-size: 20px; padding: 4px 8px; }
    #testLab button { font: inherit; cursor: pointer; border: 1px solid #334155; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 6px 10px; font-size: 12px; font-weight: 700; touch-action: manipulation; }
    #testLab button:active { transform: scale(.97); }
    #testLab .tl-tab[aria-pressed="true"] { background: #fbbf24; border-color: #fbbf24; color: #1c1408; }
    #testLab .tl-exit { border-color: #ef4444; color: #fca5a5; }
    #testLab .tl-body { overflow-y: auto; padding: 4px 10px 10px; }
    #testLab.tl-min .tl-body, #testLab.tl-min .tl-tabs { display: none; }
    #testLab .tl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 6px; }
    #testLab .tl-btn { text-align: left; min-height: 36px; line-height: 1.2; }
    #testLab .tl-btn.tl-last { border-color: #fbbf24; box-shadow: 0 0 0 1px #fbbf24 inset; }
    #testLab .tl-note { font-size: 11px; color: #fca5a5; margin: 2px 0 6px; }
    #testLab .tl-opt { display: flex; align-items: center; gap: 6px; font-size: 12px; margin-bottom: 6px; }
    #testLab .tl-chev { width: 34px; padding: 6px 0; }
  `;

  function items(type, defaults) {
    const seen = new Set(), out = [];
    [{ id: 'default', name: 'Default' }, ...customAllItems(type)].forEach((it) => { if (!seen.has(it.id)) { seen.add(it.id); out.push(it); } });
    (defaults || []).forEach((id) => { if (!seen.has(id)) { seen.add(id); out.push({ id, name: id }); } });
    return out;
  }
  const LISTS = {
    burn: () => items('burnEffect'),
    joker: () => items('jokerEffect', Object.keys(JOKER_FX)).filter((it) => JOKER_FX[it.id]),
    victory: () => items('victoryEffect'),
    cardBack: () => items('cardBack'),
    tableTheme: () => items('tableTheme'),
    deck: () => deckItems(),
    frame: () => items('frame'),
    emotes: () => items('emotes'),
    avatar: () => items('avatar')
  };

  // ---- Looks: set in memory, never saved. snapshotReal() remembers the account's own look; restoreReal() puts it back.
  function snapshotReal() {
    real = { equipped: { ...equippedCosmetics }, deck: state.deckTheme,
      bots: bots().map((b) => ({ id: b.id, cosmetics: b.cosmetics ? { ...b.cosmetics } : undefined, avatar: b.avatar })) };
  }
  function applyLook(type, id) {
    if (type === 'deck') { const it = deckItems().find((d) => d.id === id); if (it) selectDeckTheme(it.theme); return; }
    equippedCosmetics[type] = id;
    const bot = bots()[0];
    if (bot) {
      if (type === 'cardBack' || type === 'frame') bot.cosmetics = { ...(bot.cosmetics || {}), [type]: id };
      if (type === 'avatar') bot.avatar = id;
    }
    applyEquippedCosmetics();
  }
  function restoreReal() {
    stopAuto();
    if (!real) return;
    Object.assign(equippedCosmetics, real.equipped);
    real.bots.forEach((s) => { const b = state.players.find((p) => p.id === s.id); if (b) { b.cosmetics = s.cosmetics; b.avatar = s.avatar; } });
    if (real.deck && real.deck !== state.deckTheme) selectDeckTheme(real.deck);
    applyEquippedCosmetics();
  }
  function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
  function stepLook(dir) {
    const list = LISTS[tab]();
    if (!list.length) return;
    const at = list.findIndex((it) => it.id === curId[tab]);
    const next = list[(at + dir + list.length) % list.length];
    pickLook(next.id);
  }
  function pickLook(id) {
    curId[tab] = id;
    try { applyLook(tab, id); } catch (err) { console.warn('Test Lab look failed:', err); }
    sheet.querySelectorAll('.tl-last').forEach((b) => b.classList.remove('tl-last'));
    const b = sheet.querySelector(`[data-id="${window.CSS.escape(id)}"]`);
    if (b) { b.classList.add('tl-last'); b.scrollIntoView({ block: 'nearest' }); }
    if (tab === 'emotes') paintEmotes();
  }
  function paintEmotes() {
    const box = sheet.querySelector('#tlEmotes');
    if (box) box.innerHTML = (EMOTE_PACKS[equippedCosmetics.emotes] || EMOTE_PACKS.default).map((e) => `<button type="button" data-emote="${e}" data-keep-emoji>${e}</button>`).join('');
  }

  function dealScene() {
    const you = me(), bot = bots()[0];
    state.phase = 'PLAY';
    state.players.forEach((p) => { p.isReady = true; });
    document.getElementById('swapControlBar')?.classList.add('hidden');
    document.getElementById('playActionControls')?.classList.remove('hidden');
    you.hand = [mk('10', '♥'), mk('5', '♦'), mk('7', '♠'), mk('JOKER', ''), mk('A', '♣')];
    you.faceUp = [['Q', '♣'], ['8', '♥'], ['6', '♦']].map(([r, s], i) => ({ ...mk(r, s), slotIndex: i }));
    you.faceDown = [['K', '♠'], ['9', '♣'], ['5', '♥']].map(([r, s], i) => ({ ...mk(r, s), slotIndex: i }));
    if (bot) {
      bot.hand = [mk('6', '♣'), mk('9', '♦')];
      bot.faceUp = [['A', '♦'], ['J', '♥'], ['2', '♠']].map(([r, s], i) => ({ ...mk(r, s), slotIndex: i }));
      bot.faceDown = [['9', '♥'], ['4', '♣'], ['Q', '♣']].map(([r, s], i) => ({ ...mk(r, s), slotIndex: i }));
    }
    state.discardPile = PILE_RANKS.map((r, i) => mk(r, SUITS[i % 4]));
    state.drawPile = [mk('3', '♦'), mk('4', '♠'), mk('J', '♣')];
    state.activeConstraint = null; state.baseOverrideCard = null; state.selectedPlayCardIds = [];
    state.currentTurnIndex = state.players.findIndex((p) => p.id === state.localPlayerId);
    state.labDummy = true;
    render();
  }

  // ---- The effects, played the way the game plays them.
  function playBurn(id) {
    const wrapper = document.getElementById('discardCardsWrapper');
    const rect = document.getElementById('discardPileContainer').getBoundingClientRect();
    burnFxPlayer = me();
    audio.burn(id);
    if (wrapper && bigEffectsOn) { wrapper.classList.add('animate-burn-flame'); setTimeout(() => wrapper.classList.remove('animate-burn-flame'), 1600); }
    playBurnEffect(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
  }
  const playJoker = (id) => playJokerEffect(id, { counter });
  function playVictory(id) {
    audio.win();
    playVictoryEffect(id, snapshotCardStyle(me()));
  }
  const PLAY = { burn: playBurn, joker: playJoker, victory: playVictory };

  const TABLE_TOOLS = [
    ['Reset dummy table', () => dealScene()],
    ['Pile +5 cards', () => { for (let i = 0; i < 5; i++) state.discardPile.push(mk(PILE_RANKS[(i * 3) % PILE_RANKS.length], SUITS[i % 4])); render(); }],
    ['Empty the Pile', () => { state.discardPile = []; render(); }],
    ['Hand +Joker', () => { me().hand.push(mk('JOKER', '')); render(); }],
    ['Hand +10', () => { me().hand.push(mk('10', SUITS[Math.floor(Math.random() * 4)])); render(); }]
  ];

  function paint() {
    if (!sheet) return;
    sheet.querySelectorAll('.tl-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
    sheet.querySelector(`.tl-tab[data-tab="${tab}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    const off = !bigEffectsOn || reduceMotion;
    const note = off ? `<div class="tl-note">Effects are off in Settings (${!bigEffectsOn ? 'Burn, Joker &amp; Victory Effects' : 'Reduce Motion'}): you will only hear them.</div>` : '';
    let html;
    if (LOOK.includes(tab)) {
      html = `<div class="tl-bar"><button type="button" data-tl-step="-1" aria-label="Previous">&#8249;</button><button type="button" data-tl-step="1" aria-label="Next">&#8250;</button>
        <button type="button" data-tl-auto>${auto ? 'Stop' : 'Auto-step'}</button><button type="button" data-tl-real>My real look</button></div>` +
        (tab === 'emotes' ? '<div class="tl-emotes" id="tlEmotes"></div>' : '') +
        '<div class="tl-grid">' + LISTS[tab]().map((it) => `<button type="button" class="tl-btn${it.id === curId[tab] ? ' tl-last' : ''}" data-id="${it.id}">${it.name}</button>`).join('') + '</div>';
    } else if (tab === 'table') html = '<div class="tl-grid">' + TABLE_TOOLS.map(([name], i) => `<button type="button" class="tl-btn" data-tool="${i}">${name}</button>`).join('') + '</div>';
    else html = note + (tab === 'joker' ? `<label class="tl-opt"><input type="checkbox" id="tlCounter" ${counter ? 'checked' : ''}> Show the COUNTERED tag</label>` : '') +
      '<div class="tl-grid">' + LISTS[tab]().map((it) => `<button type="button" class="tl-btn" data-id="${it.id}">${it.name}</button>`).join('') + '</div>';
    sheet.querySelector('.tl-body').innerHTML = html;
    if (tab === 'emotes') paintEmotes();
  }

  function mount() {
    if (document.getElementById('testLab')) return;
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    sheet = document.createElement('div');
    sheet.id = 'testLab';
    sheet.innerHTML = `<div class="tl-head"><span class="tl-title">Test Lab</span>
      <div class="tl-tabs">${Object.keys(TAB_LABELS).map((t) => `<button type="button" class="tl-tab" data-tab="${t}">${TAB_LABELS[t]}</button>`).join('')}</div>
      <button type="button" class="tl-chev" data-tl-min aria-label="Show or hide the Test Lab">&#9662;</button>
      <button type="button" class="tl-exit" data-tl-exit>Exit</button></div><div class="tl-body"></div>`;
    document.body.appendChild(sheet);
    sheet.addEventListener('click', (e) => {
      const t = e.target.closest('button, input');
      if (!t) return;
      if (t.dataset.tab) { stopAuto(); tab = t.dataset.tab; paint(); }
      else if (t.dataset.tlStep) stepLook(Number(t.dataset.tlStep));
      else if (t.hasAttribute('data-tl-auto')) { if (auto) stopAuto(); else auto = setInterval(() => stepLook(1), 1800); t.textContent = auto ? 'Stop' : 'Auto-step'; }
      else if (t.hasAttribute('data-tl-real')) { restoreReal(); Object.keys(curId).forEach((k) => delete curId[k]); paint(); }
      else if (t.dataset.emote) showEmoteFloat(t.dataset.emote, state.localPlayerId);
      else if (t.id === 'tlCounter') counter = t.checked;
      else if (t.hasAttribute('data-tl-min')) { sheet.classList.toggle('tl-min'); t.innerHTML = sheet.classList.contains('tl-min') ? '&#9652;' : '&#9662;'; }
      else if (t.hasAttribute('data-tl-exit')) { restoreReal(); leaveBotMatch(); }
      else if (t.dataset.tool) TABLE_TOOLS[Number(t.dataset.tool)][1]();
      else if (t.dataset.id && LOOK.includes(tab)) pickLook(t.dataset.id);
      else if (t.dataset.id) {
        sheet.querySelectorAll('.tl-last').forEach((b) => b.classList.remove('tl-last')); t.classList.add('tl-last');
        try { PLAY[tab](t.dataset.id); } catch (err) { console.warn('Test Lab effect failed:', err); }
      }
    });
    paint();
  }

  async function open() {
    if (!allowed() || document.getElementById('testLab')) return;
    // Nothing the dummy table does is rewarded, recorded or saved.
    window.reportMatchWin = window.reportMatchFinished = window.recordMatchHistory = window.saveGameState = () => {};
    window.syncShowcase = window.syncPublicProfile = window.scheduleSettingsCloudSave = () => {};
    const dealWas = dealAnimationOn;
    dealAnimationOn = false;
    try { startSinglePlayerGame(1); } finally { dealAnimationOn = dealWas; }
    for (let i = 0; i < 40 && !(me() && typeof state.currentTurnIndex === 'number'); i++) await new Promise((r) => setTimeout(r, 100));
    document.getElementById('shuffleIntroOverlay')?.classList.add('hidden');
    await new Promise((r) => setTimeout(r, 400));
    dealScene();
    snapshotReal();
    mount();
  }

  window.ShTestLab = { open, allowed, dealScene, applyLook, snapshotReal, restoreReal };
})();
