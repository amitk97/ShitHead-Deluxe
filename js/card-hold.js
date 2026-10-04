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
