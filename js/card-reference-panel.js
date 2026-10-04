// Card Powers floating panel positioning, persistence, drag and resize behaviour.
// Shared floating-panel clamping and panel open/close state remain in index.html.

// How big the card reference panel renders, as a CSS scale factor.
// Persisted like position — a size the player set up once should stay
// put, not reset every time the panel is reopened.
const CARD_REF_ZOOM_MIN = 0.7;
const CARD_REF_ZOOM_MAX = 2.4;
let cardRefZoom = loadCardRefZoom();

function loadCardRefZoom() {
  try {
    const raw = localStorage.getItem('shithead_cardref_zoom');
    const z = raw ? parseFloat(raw) : NaN;
    if (!isFinite(z)) return 1;
    return Math.min(CARD_REF_ZOOM_MAX, Math.max(CARD_REF_ZOOM_MIN, z));
  } catch (e) { return 1; }
}

function saveCardRefZoom() {
  try { localStorage.setItem('shithead_cardref_zoom', String(cardRefZoom)); } catch (e) {}
}

// The largest zoom that still lets the WHOLE panel fit on screen (with
// the same margin clampCardRefPosition uses), based on the panel's own
// natural, unscaled size. Falls back to its typical dimensions if the
// panel is currently hidden (offsetWidth/Height read 0 while
// display:none) — close enough for a first pass, and self-corrects the
// moment the panel is actually open and measurable.
function getMaxCardRefZoom() {
  const panel = document.getElementById('cardRefPanel');
  const m = 6;
  const w = (panel && panel.offsetWidth) || 118;
  const h = (panel && panel.offsetHeight) || 200;
  const byWidth = (window.innerWidth - 2 * m) / w;
  const byHeight = (window.innerHeight - 2 * m) / h;
  return Math.max(CARD_REF_ZOOM_MIN, Math.min(CARD_REF_ZOOM_MAX, byWidth, byHeight));
}

// Applies the current zoom as a CSS transform (top-left anchored by
// default), then re-clamps position since a bigger panel can now
// overhang an edge it didn't reach before. The corner handles are
// counter-scaled so they stay a constant, easy-to-grab size instead of
// growing alongside the content — exactly the "weirdly big" problem the
// old on-panel zoom buttons had.
//
// This is also the ONE place the viewport-fit cap is enforced (see
// getMaxCardRefZoom): every path that changes zoom — wheel, pinch,
// corner-drag, or just reopening with a value saved on a much bigger
// screen — funnels through here, so the panel can never end up larger
// than the screen regardless of how it got that size.
function applyCardRefZoom() {
  const panel = document.getElementById('cardRefPanel');
  if (!panel) return;
  const maxZoom = getMaxCardRefZoom();
  if (cardRefZoom > maxZoom) cardRefZoom = maxZoom;
  panel.style.transform = `scale(${cardRefZoom})`;
  panel.querySelectorAll('.cardref-resize-handle').forEach(h => {
    h.style.transform = `scale(${1 / cardRefZoom})`;
  });
  const left = parseFloat(panel.style.left) || 0;
  const top = parseFloat(panel.style.top) || 0;
  const clamped = clampCardRefPosition(left, top, panel.offsetWidth * cardRefZoom, panel.offsetHeight * cardRefZoom);
  panel.style.left = `${clamped.left}px`;
  panel.style.top = `${clamped.top}px`;
}

function setCardRefZoom(z) {
  cardRefZoom = Math.min(CARD_REF_ZOOM_MAX, Math.max(CARD_REF_ZOOM_MIN, z));
  applyCardRefZoom();
  saveCardRefZoom();
}

// Corner-aware resize: keeps whichever corner is OPPOSITE the one being
// dragged fixed on screen, so the panel grows/shrinks toward the
// dragged corner — the same feel as resizing a normal window from any
// corner. transform-origin always stays "top left" (everything else in
// this panel's position math assumes that), so the other three corners
// are simulated by hand: e.g. dragging the top-left handle should hold
// the bottom-right point (left + width*zoom, top + height*zoom) fixed,
// so left/top are recomputed as zoom changes to keep that point put.
function setCardRefZoomFromCorner(corner, z) {
  const panel = document.getElementById('cardRefPanel');
  if (!panel) return;
  const newZoom = Math.min(CARD_REF_ZOOM_MAX, Math.max(CARD_REF_ZOOM_MIN, z));
  const w = panel.offsetWidth, h = panel.offsetHeight;
  const oldZoom = cardRefZoom;
  const left = parseFloat(panel.style.left) || 0;
  const top = parseFloat(panel.style.top) || 0;
  const anchorRight = corner === 'tl' || corner === 'bl';   // right edge stays fixed
  const anchorBottom = corner === 'tl' || corner === 'tr';  // bottom edge stays fixed
  panel.style.left = `${anchorRight ? (left + w * oldZoom) - w * newZoom : left}px`;
  panel.style.top = `${anchorBottom ? (top + h * oldZoom) - h * newZoom : top}px`;
  cardRefZoom = newZoom;
  applyCardRefZoom();
  saveCardRefZoom();
}

// Placed once when opened (and again on a window resize); the refresh
// after every play only keeps it on screen, so it never jumps about as
// its contents or the table below change (v275, owner).
let cardRefPlaced = false;
function positionCardRefPanel(opts) {
  const panel = document.getElementById('cardRefPanel');
  if (!panel || !cardRefOpen) return;
  applyCardRefZoom();
  if (opts && opts.keep && cardRefPlaced) return; // applyCardRefZoom already kept it on screen
  cardRefPlaced = true;
  // offsetWidth/Height are the pre-transform box — the actual on-screen
  // footprint (needed for clamping against the viewport) is that times
  // the current zoom, since transform-origin is top-left. cardRefZoom
  // may just have been capped by applyCardRefZoom above, so this reads
  // whatever it actually ended up being, not the pre-cap request.
  const w = (panel.offsetWidth || 132) * cardRefZoom, h = (panel.offsetHeight || 300) * cardRefZoom;
  const m = 6;
  // Stored as a fraction of the viewport, not raw pixels — a saved
  // "62% across, 40% down" still makes sense after a resize, window
  // rotation, or on a completely different screen; a saved "412px,
  // 260px" could easily land off-screen or on top of something else.
  const saved = loadCardRefPosition();
  let left, top;
  if (saved) {
    left = saved.xPct * window.innerWidth;
    top = saved.yPct * window.innerHeight;
  } else {
    // Default: a narrow strip hugging the right edge, vertically
    // centred — out of the middle so it never lies across the pile or
    // the hand, reading as a side panel rather than a popup over the
    // table.
    left = window.innerWidth - w - m;
    top = (window.innerHeight - h) / 2;
  }
  const clamped = clampCardRefPosition(left, top, w, h);
  panel.style.left = `${clamped.left}px`;
  panel.style.top = `${clamped.top}px`;
}

function clampCardRefPosition(left, top, w, h) {
  return clampFloatingPanelPosition(left, top, w, h);
}

function loadCardRefPosition() {
  try {
    const raw = localStorage.getItem('shithead_cardref_pos');
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos.xPct !== 'number' || typeof pos.yPct !== 'number') return null;
    return pos;
  } catch (e) { return null; }
}

function saveCardRefPosition(left, top) {
  try {
    localStorage.setItem('shithead_cardref_pos', JSON.stringify({
      xPct: left / window.innerWidth,
      yPct: top / window.innerHeight
    }));
  } catch (e) {
    // Private browsing / storage disabled — the panel just falls back
    // to its default position next time, which is harmless.
  }
}

// Dragging the panel: pointerdown/move/up rather than separate mouse and
// touch handlers, so the same code works identically on a phone tap-drag
// and a desktop mouse-drag. The panel already closes on a plain tap
// (see the pointerup handler below), so a small movement threshold is
// what tells a genuine drag apart from a slightly-shaky tap — without
// it, any tap-to-close on a touchscreen risks being read as a drag.
let cardRefDrag = null;
const CARD_REF_DRAG_THRESHOLD = 6;

function initCardRefDrag() {
  const panel = document.getElementById('cardRefPanel');
  if (!panel) return;
  // A tap on the X already closes via the tap-anywhere path below; this
  // also covers keyboard activation.
  document.getElementById('cardRefCloseBtn')?.addEventListener('click', () => toggleCardReference(true));
  document.getElementById('matrixRefCloseBtn')?.addEventListener('click', (e) => { e.stopPropagation(); toggleMatrixReference(true); });

  panel.addEventListener('pointerdown', (e) => {
    if (!cardRefOpen) return;
    // The resize handle and the zoom +/- buttons handle their own
    // pointerdown — letting it bubble up here would also start a panel
    // drag (and, on release, misread it as a tap-to-close) at the same
    // time as its own gesture.
    if (e.target.closest('.cardref-resize-handle')) return;
    const rect = panel.getBoundingClientRect();
    cardRefDrag = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
      moved: false,
      pointerId: e.pointerId
    };
    panel.setPointerCapture(e.pointerId);
  });

  panel.addEventListener('pointermove', (e) => {
    if (!cardRefDrag || e.pointerId !== cardRefDrag.pointerId) return;
    const dx = e.clientX - cardRefDrag.startX;
    const dy = e.clientY - cardRefDrag.startY;
    if (!cardRefDrag.moved && Math.hypot(dx, dy) < CARD_REF_DRAG_THRESHOLD) return;
    if (!cardRefDrag.moved) panel.classList.add('cursor-grabbing');
    cardRefDrag.moved = true;
    const clamped = clampCardRefPosition(
      cardRefDrag.origLeft + dx, cardRefDrag.origTop + dy,
      panel.offsetWidth * cardRefZoom, panel.offsetHeight * cardRefZoom
    );
    panel.style.left = `${clamped.left}px`;
    panel.style.top = `${clamped.top}px`;
  });

  panel.addEventListener('pointerup', (e) => {
    if (!cardRefDrag || e.pointerId !== cardRefDrag.pointerId) return;
    const wasDrag = cardRefDrag.moved;
    panel.classList.remove('cursor-grabbing');
    if (wasDrag) {
      saveCardRefPosition(parseFloat(panel.style.left), parseFloat(panel.style.top));
    }
    cardRefDrag = null;
    if (!wasDrag) {
      // A genuine tap with no real movement — preserve the existing
      // tap-to-close behaviour.
      toggleCardReference(true);
    }
  });
}

// Four corner drag-handles (the primary resize interaction — same
// direct-manipulation pattern as resizing a native window, and the
// reason there's no separate zoom-title/+-/- row anymore), scroll-wheel
// zoom (no modifier needed: the panel has no internal scroll of its own
// to fight over), and two-finger pinch (mobile).
function initCardRefZoomControls() {
  const panel = document.getElementById('cardRefPanel');
  if (!panel) return;

  // --- Corner drag-handles ---
  // Diagonal movement is measured in the direction that means "away
  // from the panel" for THAT corner, so dragging any of the four
  // outward always grows it and inward always shrinks it — signX/signY
  // flip the raw pointer delta into that per-corner sense.
  panel.querySelectorAll('.cardref-resize-handle').forEach((handle) => {
    const corner = handle.dataset.corner;
    const signX = (corner === 'tl' || corner === 'bl') ? -1 : 1;
    const signY = (corner === 'tl' || corner === 'tr') ? -1 : 1;
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      drag = { startX: e.clientX, startY: e.clientY, startZoom: cardRefZoom, pointerId: e.pointerId };
      handle.classList.add('resize-active');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = (e.clientX - drag.startX) * signX;
      const dy = (e.clientY - drag.startY) * signY;
      // 150px of drag roughly doubles/halves the size — tuned to feel
      // direct without being twitchy.
      setCardRefZoomFromCorner(corner, drag.startZoom + (dx + dy) / 2 / 150);
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      try { handle.releasePointerCapture(drag.pointerId); } catch (err) {}
      handle.classList.remove('resize-active');
      drag = null;
    };
    handle.addEventListener('pointerup', endDrag);
    handle.addEventListener('pointercancel', endDrag);
  });

  // --- Scroll-wheel zoom ---
  panel.addEventListener('wheel', (e) => {
    if (!cardRefOpen) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.1 : -0.1;
    setCardRefZoom(cardRefZoom + step);
  }, { passive: false });

  // --- Two-finger pinch (mobile) ---
  // A second finger landing mid-drag cancels any single-finger
  // move-the-panel drag in progress, so the two gestures can never
  // fight each other.
  let pinch = null;
  panel.addEventListener('touchstart', (e) => {
    if (!cardRefOpen) return;
    if (e.touches.length === 2) {
      cardRefDrag = null;
      const [t1, t2] = e.touches;
      pinch = {
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startZoom: cardRefZoom
      };
    }
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    setCardRefZoom(pinch.startZoom * (dist / pinch.startDist));
  }, { passive: false });
  panel.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinch = null;
  });
  panel.addEventListener('touchcancel', () => { pinch = null; });
}
