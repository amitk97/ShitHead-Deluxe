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
// This is a visualisation of the already-public hand count only. Card identities
// are never rendered. The permanent anchor also gives card-flight animations a
// stable origin/destination even while the visual fan itself is closed.
(function opponentHandFanPreview() {
  const style = document.createElement('style');
  style.textContent = `
    #opponentsContainer { position:relative; padding-top:60px !important; overflow:visible !important; }
    #opponentsContainer .opp-seat { position:relative; overflow:visible !important; }
    #opponentsContainer .opp-hand-count { cursor:pointer; touch-action:manipulation; }
    #opponentsContainer .opp-hand-count:focus-visible { outline:2px solid #a855f7; outline-offset:2px; }
    .opp-hand-anchor { position:absolute; left:50%; top:-55px; width:min(calc(100% - 4px),154px); height:54px; transform:translateX(-50%); pointer-events:none; z-index:35; }
    .opp-hand-fan { position:absolute; inset:0; pointer-events:none; opacity:0; visibility:hidden; transform:translateY(5px) scale(.96); transform-origin:50% 100%; transition:opacity .15s ease,transform .18s cubic-bezier(.2,.85,.3,1),visibility 0s linear .18s; }
    .opp-seat.opp-hand-open .opp-hand-fan { opacity:1; visibility:visible; transform:translateY(0) scale(1); transition:opacity .15s ease,transform .18s cubic-bezier(.2,.85,.3,1); }
    .opp-hand-fan-card { position:absolute; left:50%; bottom:0; width:var(--opp-fan-card-w,30px); height:var(--opp-fan-card-h,43px); border-radius:6px; overflow:hidden; transform-origin:50% 115%; transform:translateX(-50%) translateX(var(--fan-x,0px)) translateY(var(--fan-y,0px)) rotate(var(--fan-rotate,0deg)); z-index:var(--fan-z,1); box-shadow:0 3px 8px rgba(0,0,0,.55),0 0 0 1px rgba(148,163,184,.38),0 0 7px rgba(56,189,248,.22); }
    .opp-hand-fan-art { position:absolute !important; inset:0 !important; width:100% !important; height:100% !important; margin:0 !important; border-radius:inherit !important; transform:none !important; transform-origin:50% 50% !important; overflow:hidden; }
    .opp-hand-fan-art svg { width:70%; height:70%; max-width:70%; max-height:70%; }
    .opp-hand-fan::after { content:""; position:absolute; left:14%; right:14%; bottom:-3px; height:10px; border-radius:50%; background:radial-gradient(ellipse,rgba(0,0,0,.34),transparent 72%); filter:blur(3px); z-index:-1; }
    .opp-seat.opp-hand-open .opp-hand-count { border-color:#a855f7 !important; color:#f5d0fe !important; box-shadow:0 0 0 1px rgba(168,85,247,.35),0 0 9px rgba(168,85,247,.32); }
    body.reduce-motion .opp-hand-fan { transition:none !important; }
    @media (prefers-reduced-motion:reduce) { .opp-hand-fan { transition:none !important; } }
    @media (max-width:420px) {
      #opponentsContainer { padding-top:56px !important; }
      .opp-hand-anchor { top:-50px; height:49px; }
    }
  `;
  document.head.appendChild(style);

  const container = document.getElementById('opponentsContainer');
  if (!container) return;

  let pinnedPlayerId = null;
  let hoveredPlayerId = null;
  const finePointer = () => window.matchMedia?.('(hover:hover) and (pointer:fine)').matches;

  function playerForSeat(seat) {
    if (!seat?.id?.startsWith('opp-') || typeof state === 'undefined') return null;
    const id = seat.id.slice(4);
    return (state.players || []).find(p => String(p.id) === id) || null;
  }

  function handControl(seat) {
    return seat?.querySelector?.('.opp-hand-count,[data-opponent-hand-toggle],[data-tip="Cards in Hand"]') || null;
  }

  function ensureAnchor(seat) {
    if (!seat) return null;
    let anchor = seat.querySelector(':scope > .opp-hand-anchor');
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.className = 'opp-hand-anchor';
      anchor.setAttribute('aria-hidden', 'true');
      anchor.innerHTML = '<div class="opp-hand-fan"></div>';
      seat.prepend(anchor);
    }
    return anchor;
  }

  function decorateSeat(seat) {
    const player = playerForSeat(seat);
    if (!player) return;
    ensureAnchor(seat);
    const control = handControl(seat);
    if (!control) return;
    control.classList.add('opp-hand-count');
    control.dataset.opponentHandToggle = String(player.id);
    // The generic data-tip bubble was sitting over the playable cards on touch.
    // The count is self-explanatory and the accessible label carries the detail.
    if (control.getAttribute('data-tip') === 'Cards in Hand') control.removeAttribute('data-tip');
    control.setAttribute('role', 'button');
    control.setAttribute('tabindex', '0');
    control.setAttribute('aria-expanded', seat.classList.contains('opp-hand-open') ? 'true' : 'false');
    control.setAttribute('aria-label', `${seat.classList.contains('opp-hand-open') ? 'Hide' : 'Show'} ${player.name || 'opponent'}'s ${player.hand?.length || 0} cards in hand`);
  }

  function buildCardBack(player) {
    const shell = document.createElement('div');
    shell.className = 'opp-hand-fan-card';
    const art = document.createElement('div');
    art.className = 'opp-hand-fan-art custom-card-back';
    try {
      const backClass = typeof getCosmeticBackClass === 'function'
        ? getCosmeticBackClass(player?.cosmetics?.cardBack || 'default')
        : (typeof getThemeDeckBackClass === 'function' ? getThemeDeckBackClass(player?.cosmetics?.cardBack || 'default') : '');
      if (backClass) art.classList.add(...String(backClass).split(/\s+/).filter(Boolean));
      if (typeof getEmblemSvg === 'function') art.innerHTML = getEmblemSvg();
    } catch (e) {
      art.style.background = 'linear-gradient(145deg,#0f2948,#071522 60%,#020617)';
    }
    shell.appendChild(art);
    return shell;
  }

  function renderFan(seat) {
    const player = playerForSeat(seat);
    const anchor = ensureAnchor(seat);
    const fan = anchor?.querySelector('.opp-hand-fan');
    const count = player?.hand?.length || 0;
    if (!player || !fan || player.hasFinished || count < 1) {
      if (fan) fan.replaceChildren();
      seat?.classList.remove('opp-hand-open');
      return;
    }

    fan.replaceChildren();
    const seatWidth = Math.max(72, seat.getBoundingClientRect().width || 112);
    const fanWidth = Math.max(68, Math.min(154, seatWidth - 4));
    const cardW = Math.max(25, Math.min(31, fanWidth * .25));
    const cardH = cardW * 1.43;
    const travel = Math.max(0, fanWidth - cardW);
    const step = count > 1 ? Math.min(cardW * .54, travel / (count - 1)) : 0;
    const spread = step * Math.max(0, count - 1);
    const maxRotation = count <= 3 ? 9 : count <= 7 ? 13 : count <= 12 ? 11 : 9;

    for (let i = 0; i < count; i++) {
      const card = buildCardBack(player);
      const normal = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
      const x = i * step - spread / 2;
      const y = Math.pow(Math.abs(normal), 1.55) * 7;
      const rotation = normal * maxRotation;
      card.style.setProperty('--fan-x', `${x}px`);
      card.style.setProperty('--fan-y', `${y}px`);
      card.style.setProperty('--fan-rotate', `${rotation}deg`);
      card.style.setProperty('--fan-z', String(i + 1));
      card.style.setProperty('--opp-fan-card-w', `${cardW}px`);
      card.style.setProperty('--opp-fan-card-h', `${cardH}px`);
      fan.appendChild(card);
    }
  }

  function closeSeat(seat) {
    if (!seat) return;
    seat.classList.remove('opp-hand-open');
    const control = handControl(seat);
    if (control) {
      control.setAttribute('aria-expanded', 'false');
      const p = playerForSeat(seat);
      control.setAttribute('aria-label', `Show ${p?.name || 'opponent'}'s ${p?.hand?.length || 0} cards in hand`);
    }
  }

  function closeAll(exceptId = null) {
    container.querySelectorAll('.opp-seat').forEach(seat => {
      if (!exceptId || seat.id !== `opp-${exceptId}`) closeSeat(seat);
    });
  }

  function openSeat(seat, pin = false) {
    const player = playerForSeat(seat);
    if (!player || player.hasFinished || !(player.hand?.length)) return;
    const id = String(player.id);
    closeAll(id);
    renderFan(seat);
    seat.classList.add('opp-hand-open');
    const control = handControl(seat);
    if (control) {
      control.setAttribute('aria-expanded', 'true');
      control.setAttribute('aria-label', `Hide ${player.name || 'opponent'}'s ${player.hand.length} cards in hand`);
    }
    if (pin) pinnedPlayerId = id;
  }

  function syncSeats() {
    container.querySelectorAll('.opp-seat').forEach(decorateSeat);
    if (!pinnedPlayerId) return;
    const seat = document.getElementById(`opp-${pinnedPlayerId}`);
    const player = playerForSeat(seat);
    if (!seat || !player || player.hasFinished || !(player.hand?.length)) {
      pinnedPlayerId = null;
      return;
    }
    openSeat(seat, true);
  }

  // Clicking/tapping the existing hand-count badge toggles the fan.
  container.addEventListener('click', event => {
    const control = event.target.closest('[data-opponent-hand-toggle]');
    if (!control) return;
    event.preventDefault();
    event.stopPropagation();
    const seat = control.closest('.opp-seat');
    const player = playerForSeat(seat);
    if (!player) return;
    const id = String(player.id);
    if (pinnedPlayerId === id && seat.classList.contains('opp-hand-open')) {
      pinnedPlayerId = null;
      closeSeat(seat);
    } else {
      pinnedPlayerId = id;
      openSeat(seat, true);
    }
  });

  container.addEventListener('keydown', event => {
    const control = event.target.closest('[data-opponent-hand-toggle]');
    if (!control || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    control.click();
  });

  // Desktop convenience: hover the count itself. A clicked/pinned fan stays open.
  container.addEventListener('pointerover', event => {
    if (!finePointer()) return;
    const control = event.target.closest('[data-opponent-hand-toggle]');
    if (!control || control.contains(event.relatedTarget)) return;
    const seat = control.closest('.opp-seat');
    const player = playerForSeat(seat);
    if (!player || (pinnedPlayerId && pinnedPlayerId !== String(player.id))) return;
    hoveredPlayerId = String(player.id);
    openSeat(seat, false);
  });

  container.addEventListener('pointerout', event => {
    if (!finePointer()) return;
    const control = event.target.closest('[data-opponent-hand-toggle]');
    if (!control || control.contains(event.relatedTarget)) return;
    const seat = control.closest('.opp-seat');
    const player = playerForSeat(seat);
    if (!player) return;
    hoveredPlayerId = null;
    if (pinnedPlayerId !== String(player.id)) closeSeat(seat);
  });

  document.addEventListener('pointerdown', event => {
    if (!pinnedPlayerId || event.target.closest('[data-opponent-hand-toggle]')) return;
    pinnedPlayerId = null;
    closeAll();
  }, true);

  let syncQueued = false;
  new MutationObserver(() => {
    if (syncQueued) return;
    syncQueued = true;
    requestAnimationFrame(() => {
      syncQueued = false;
      syncSeats();
    });
  }).observe(container, { childList:true });

  // Keep card-flight physics intact but map other players to the new, stable
  // hand anchor instead of the whole opponent seat. The anchor exists even
  // while the fan is visually closed, so pickup/play coordinates never jump.
  const previousAnimationTarget = window.getPlayerAnimationTarget;
  window.getPlayerAnimationTarget = function opponentHandAnimationTarget(playerId) {
    if (typeof state !== 'undefined' && playerId === state.localPlayerId) {
      return document.getElementById('localHand') || previousAnimationTarget?.(playerId);
    }
    const seat = document.getElementById(`opp-${playerId}`);
    if (seat) return ensureAnchor(seat);
    return previousAnimationTarget?.(playerId) || container;
  };

  window.getOpponentHandAnchor = function getOpponentHandAnchor(playerId) {
    const seat = document.getElementById(`opp-${playerId}`);
    return seat ? ensureAnchor(seat) : null;
  };

  syncSeats();
})();