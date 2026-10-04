// Card press-and-hold tooltip system, including tutorial hold guidance.
// Relies on existing global game state/rule helpers to preserve behaviour exactly.

// § Card hold info
// Press and hold a card you can see (your hand, any face-up card, the
// Pile) for CARD_HOLD_MS to read what it does: its power (CARD_REFERENCE)
// and a short line (CARD_HOLD_TEXT, shortened from the Guide), plus, for
// your own cards during play, whether it can go on the Pile now. Face-down
// cards never answer (the card is looked up in the visible zones only).
// Letting go closes it and swallows the tap, so a hold never selects.
const CARD_HOLD_MS = 450;
const RANK_WORDS = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace', JOKER: 'Joker' };
// The card behind an element, from the zones anyone can see; null for
// face-down or unknown cards.
function holdCardInfo(el) {
  const id = el?.dataset?.cardId;
  if (!id || el.classList.contains('custom-card-back')) return null;
  const me = state.players?.find(p => p.id === state.localPlayerId);
  const inHand = me && (me.hand || []).find(c => c && c.id === id);
  if (inHand) return { card: inHand, own: 'hand' };
  const myUp = me && (me.faceUp || []).find(c => c && c.id === id);
  if (myUp) return { card: myUp, own: 'faceUp', handLeft: (me.hand || []).length };
  const up = (state.players || []).flatMap(p => p.faceUp || []).find(c => c && c.id === id);
  if (up) return { card: up, own: false };
  const pile = (state.discardPile || []).find(c => c && c.id === id);
  return pile ? { card: pile, own: false } : null;
}
// What a press lands on: a card with an id, the Pile (its top card) or
// the Base Card box (the Pile's bottom card).
function holdTargetAt(node) {
  const cardEl = node?.closest?.('#gameTable [data-card-id]');
  if (cardEl) { const info = holdCardInfo(cardEl); return info ? { el: cardEl, info } : null; }
  const pile = state.discardPile || [];
  if (!pile.length) return null;
  const pileEl = node?.closest?.('#gameTable #discardPileContainer');
  if (pileEl) return { el: pileEl, info: { card: pile[pile.length - 1], own: false } };
  const baseEl = node?.closest?.('#gameTable #bottomCardPreview');
  if (baseEl) return { el: baseEl, info: { card: pile[0], own: false, base: true } };
  return null;
}
function cardHoldHtml(card, own, extra = {}) {
  const rank = card.isJoker ? 'JOKER' : String(card.rank);
  const power = cardReferenceLabel(rank);
  const name = RANK_WORDS[rank] || rank;
  let status = '';
  if (own === 'faceUp' && extra.handLeft > 0 && state.phase === 'PLAY') {
    status = '<span class="ch-no">Play this once your hand is empty.</span>';
  } else if (own && state.phase === 'PLAY') {
    const ok = isPlayLegal(card, state.discardPile || [], state.activeConstraint);
    const target = historyCircleLabel(historyCircleCard());
    status = ok ? '<span class="ch-ok">You can play it now.</span>'
      : `<span class="ch-no">Can't go on ${target ? `the ${RANK_WORDS[target] || target}` : 'this Pile'} now.</span>`;
  }
  const where = extra.base ? '<span class="ch-where">Base card</span>' : '';
  return `${where}<span class="ch-title">${escapeHtml(name)} <span class="ch-power">${escapeHtml(power)}</span></span><span class="ch-text">${escapeHtml(cardReferenceText(rank))}</span>${status}`;
}
let cardHoldTimer = null, cardHoldStart = null, cardHoldShownAt = 0, cardHoldEl = null;
function hideCardHold() {
  clearTimeout(cardHoldTimer); cardHoldTimer = null; cardHoldStart = null;
  document.getElementById('cardHoldTip')?.classList.add('hidden');
}
function showCardHold(el, info) {
  let tip = document.getElementById('cardHoldTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'cardHoldTip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  if (typeof window.hideDynamicTip === 'function') window.hideDynamicTip();
  tip.innerHTML = cardHoldHtml(info.card, info.own, info);
  tip.classList.remove('hidden');
  // In the tutorial the bubble sits above the spotlight and the caption.
  tip.style.zIndex = (typeof tutorialActive !== 'undefined' && tutorialActive) ? '90' : '';
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
  const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  // Never under the header (it sits above the table): cards near the top
  // (an opponent's face-up row) get the bubble below them instead.
  const headerBottom = document.querySelector('body > header')?.getBoundingClientRect().bottom || 0;
  const minTop = Math.max(8, headerBottom + 6);
  const above = r.top - h - 10;
  tip.style.left = `${left}px`;
  tip.style.top = `${above >= minTop ? above : Math.max(minTop, Math.min(window.innerHeight - h - 8, r.bottom + 10))}px`;
  cardHoldShownAt = Date.now();
  if (typeof Haptics !== 'undefined') Haptics.vibrate?.(8);
  if (tutorialWantsHold()) tutorialOnHold(el.id === 'discardPileContainer' ? 'pile' : info.own ? 'own' : 'other');
}
// Quick Start's hold step (require.holdCheck): hold the Pile and one of
// your own cards, in either order, to continue.
let tutorialHoldsDone = new Set();
function tutorialWantsHold() {
  return typeof tutorialActive !== 'undefined' && tutorialActive && tutorialAwaitingAction && !!TUTORIAL_STEPS[tutorialStep]?.require?.holdCheck;
}
// The hold step (v256, owner): each card's info stays up after letting go,
// and after the second hold the lesson waits TUTORIAL_HOLD_READ_MS so the
// player can read it before the note moves on.
const TUTORIAL_HOLD_READ_MS = 2800;
let tutorialHoldKeep = false;
function tutorialOnHold(kind) {
  if (kind === 'other') return;
  tutorialHoldsDone.add(kind);
  document.getElementById(kind === 'pile' ? 'discardPileContainer' : 'localHand')?.classList.remove('tutorial-glow');
  if (tutorialHoldsDone.has('pile') && tutorialHoldsDone.has('own')) {
    tutorialAwaitingAction = false;
    tutorialHoldKeep = true;
    const step = TUTORIAL_STEPS[tutorialStep];
    tutorialDelay(() => { tutorialHoldKeep = false; hideCardHold(); showCoachNote(step); }, TUTORIAL_HOLD_READ_MS);
  }
}
document.addEventListener('pointerdown', (e) => {
  hideCardHold();
  if (typeof tutorialActive !== 'undefined' && tutorialActive && !tutorialWantsHold()) return;
  const hit = holdTargetAt(e.target);
  if (!hit) return;
  const { el, info } = hit;
  cardHoldEl = el;
  cardHoldStart = { x: e.clientX, y: e.clientY };
  cardHoldTimer = setTimeout(() => { cardHoldTimer = null; if (el.isConnected) showCardHold(el, info); }, CARD_HOLD_MS);
}, true);
document.addEventListener('pointermove', (e) => {
  if (cardHoldTimer && cardHoldStart && Math.hypot(e.clientX - cardHoldStart.x, e.clientY - cardHoldStart.y) > 8) hideCardHold();
}, true);
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => {
  clearTimeout(cardHoldTimer); cardHoldTimer = null;
  if (tutorialWantsHold() || tutorialHoldKeep) return; // the lesson keeps it up to read
  document.getElementById('cardHoldTip')?.classList.add('hidden');
}, true));
// The tap that ends a hold must not select or play the card.
document.addEventListener('click', (e) => {
  if (cardHoldShownAt && Date.now() - cardHoldShownAt < 2500 && cardHoldEl && cardHoldEl.contains(e.target)) {
    cardHoldShownAt = 0; e.stopPropagation(); e.preventDefault();
  }
}, true);
document.addEventListener('contextmenu', (e) => { if (holdTargetAt(e.target)) e.preventDefault(); });

// § Opponent hand fan preview
// The number under each opponent remains the source of truth. This is only a
// compact visualisation of that already-public hand count: it never reads or
// renders the identities of cards in an opponent's hand.
(function opponentHandFanPreview() {
  const style = document.createElement('style');
  style.textContent = `
    #opponentsContainer { padding-top:52px !important; overflow:visible !important; }
    #opponentsContainer .opp-seat { position:relative; overflow:visible !important; }
    #opponentsContainer [data-tip="Cards in Hand"] { cursor:pointer; touch-action:manipulation; }
    #opponentsContainer [data-tip="Cards in Hand"]:focus-visible { outline:2px solid #a855f7; outline-offset:2px; }
    .opp-hand-preview { position:absolute; left:50%; top:-47px; width:min(calc(100% - 4px), 148px); height:48px; transform:translateX(-50%); pointer-events:none; z-index:35; }
    .opp-hand-preview-card { position:absolute; left:50%; top:0; border-radius:7px; overflow:hidden; box-shadow:0 3px 8px rgba(0,0,0,.6),0 0 0 1px rgba(148,163,184,.38),0 0 8px rgba(56,189,248,.22); transform-origin:50% 112%; will-change:transform; }
    .opp-hand-preview-card svg { max-width:72%; max-height:72%; }
    .opp-hand-preview::after { content:""; position:absolute; left:12%; right:12%; bottom:-2px; height:12px; border-radius:50%; background:radial-gradient(ellipse,rgba(0,0,0,.38),transparent 70%); filter:blur(3px); z-index:-1; }
    .opp-hand-preview-open [data-tip="Cards in Hand"] { border-color:#a855f7 !important; color:#f5d0fe !important; box-shadow:0 0 8px rgba(168,85,247,.38); }
    body.reduce-motion .opp-hand-preview-card { transition:none !important; }
    @media (max-width:420px) {
      #opponentsContainer { padding-top:48px !important; }
      .opp-hand-preview { top:-43px; height:44px; }
    }
  `;
  document.head.appendChild(style);

  let pinnedPlayerId = null;
  let hoveredPlayerId = null;
  let lastOpenPlayerId = null;
  const finePointer = () => window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;
  const motionDisabled = () => (typeof reduceMotion !== 'undefined' && reduceMotion) || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function playerForSeat(seat) {
    if (!seat?.id?.startsWith('opp-') || typeof state === 'undefined') return null;
    const id = seat.id.slice(4);
    return (state.players || []).find(p => String(p.id) === id) || null;
  }

  function handControl(seat) {
    return seat?.querySelector?.('[data-tip="Cards in Hand"]') || null;
  }

  function decorateHandControl(seat) {
    const control = handControl(seat);
    if (!control) return;
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
    control.setAttribute('aria-label', 'Show cards in hand');
    control.setAttribute('aria-expanded', seat.classList.contains('opp-hand-preview-open') ? 'true' : 'false');
  }

  function removePreview(seat) {
    if (!seat) return;
    seat.querySelector('.opp-hand-preview')?.remove();
    seat.classList.remove('opp-hand-preview-open');
    const control = handControl(seat);
    if (control) control.setAttribute('aria-expanded', 'false');
  }

  function clearPreviews(exceptId = null) {
    document.querySelectorAll('#opponentsContainer .opp-seat').forEach(seat => {
      if (!exceptId || seat.id !== `opp-${exceptId}`) removePreview(seat);
    });
    if (!exceptId) lastOpenPlayerId = null;
  }

  function buildCardBack(player) {
    const card = document.createElement('div');
    card.className = 'opp-hand-preview-card custom-card-back';
    try {
      const backClass = typeof getCosmeticBackClass === 'function'
        ? getCosmeticBackClass(player?.cosmetics?.cardBack || 'default')
        : (typeof getThemeDeckBackClass === 'function' ? getThemeDeckBackClass(player?.cosmetics?.cardBack || 'default') : '');
      if (backClass) card.classList.add(...String(backClass).split(/\s+/).filter(Boolean));
      if (typeof getEmblemSvg === 'function') card.innerHTML = getEmblemSvg();
    } catch (e) {
      card.style.background = 'linear-gradient(145deg,#0f2948,#071522 60%,#020617)';
    }
    return card;
  }

  function showPreview(seat, source = 'hover') {
    const player = playerForSeat(seat);
    const count = player?.hand?.length || 0;
    if (!player || player.hasFinished || count < 1) { removePreview(seat); return; }
    if (source === 'hover' && pinnedPlayerId && pinnedPlayerId !== String(player.id)) return;

    const playerId = String(player.id);
    clearPreviews(playerId);
    removePreview(seat);

    const fan = document.createElement('div');
    fan.className = 'opp-hand-preview';
    fan.setAttribute('aria-hidden', 'true');

    const seatWidth = Math.max(72, seat.getBoundingClientRect().width || 112);
    const fanWidth = Math.max(66, Math.min(148, seatWidth - 4));
    const cardW = Math.max(22, Math.min(34, fanWidth * 0.27));
    const cardH = cardW * 1.42;
    const usable = Math.max(0, fanWidth - cardW);
    const step = count > 1 ? Math.min(cardW * 0.56, usable / (count - 1)) : 0;
    const spread = step * Math.max(0, count - 1);
    const maxRotate = count > 14 ? 9 : count > 8 ? 10 : 12;

    for (let i = 0; i < count; i++) {
      const card = buildCardBack(player);
      const centred = count > 1 ? (i / (count - 1)) * 2 - 1 : 0;
      const x = i * step - spread / 2;
      const y = Math.pow(Math.abs(centred), 1.6) * 6;
      const rot = centred * maxRotate;
      card.style.width = `${cardW}px`;
      card.style.height = `${cardH}px`;
      card.style.zIndex = String(i + 1);
      card.style.transform = `translate(calc(-50% + ${x}px), ${y}px) rotate(${rot}deg)`;
      fan.appendChild(card);

      if (!motionDisabled() && typeof card.animate === 'function') {
        card.animate([
          { transform:'translate(-50%, 11px) rotate(0deg) scale(.88)', opacity:.15 },
          { transform:`translate(calc(-50% + ${x}px), ${y}px) rotate(${rot}deg) scale(1)`, opacity:1 }
        ], { duration:170, delay:Math.min(i * 7, 70), easing:'cubic-bezier(.2,.85,.3,1)', fill:'both' });
      }
    }

    seat.prepend(fan);
    seat.classList.add('opp-hand-preview-open');
    const control = handControl(seat);
    if (control) control.setAttribute('aria-expanded', 'true');
    lastOpenPlayerId = playerId;
  }

  function syncPinnedPreview() {
    const seats = document.querySelectorAll('#opponentsContainer .opp-seat');
    seats.forEach(decorateHandControl);
    if (!pinnedPlayerId) return;
    const seat = document.getElementById(`opp-${pinnedPlayerId}`);
    if (seat) showPreview(seat, 'pinned');
    else pinnedPlayerId = null;
  }

  const container = document.getElementById('opponentsContainer');
  if (!container) return;

  container.addEventListener('pointerover', (event) => {
    if (!finePointer()) return;
    const seat = event.target.closest('.opp-seat');
    if (!seat || seat.contains(event.relatedTarget)) return;
    const player = playerForSeat(seat);
    if (!player) return;
    hoveredPlayerId = String(player.id);
    showPreview(seat, 'hover');
  });

  container.addEventListener('pointerout', (event) => {
    if (!finePointer()) return;
    const seat = event.target.closest('.opp-seat');
    if (!seat || seat.contains(event.relatedTarget)) return;
    const player = playerForSeat(seat);
    if (!player) return;
    hoveredPlayerId = null;
    if (pinnedPlayerId !== String(player.id)) removePreview(seat);
  });

  container.addEventListener('click', (event) => {
    const control = event.target.closest('[data-tip="Cards in Hand"]');
    if (!control) return;
    const seat = control.closest('.opp-seat');
    const player = playerForSeat(seat);
    if (!player || player.hasFinished || !(player.hand?.length)) return;
    const id = String(player.id);
    if (pinnedPlayerId === id) {
      pinnedPlayerId = null;
      if (!finePointer() || hoveredPlayerId !== id) removePreview(seat);
    } else {
      pinnedPlayerId = id;
      showPreview(seat, 'pinned');
    }
  });

  container.addEventListener('keydown', (event) => {
    const control = event.target.closest('[data-tip="Cards in Hand"]');
    if (!control || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    control.click();
  });

  document.addEventListener('pointerdown', (event) => {
    if (!pinnedPlayerId || event.target.closest('#opponentsContainer [data-tip="Cards in Hand"]')) return;
    pinnedPlayerId = null;
    clearPreviews();
  }, true);

  let syncQueued = false;
  new MutationObserver(() => {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => { syncQueued = false; syncPinnedPreview(); });
  }).observe(container, { childList:true });
  syncPinnedPreview();
})();
