// Play Matrix floating panel positioning, persistence, drag and resize behaviour.
// Shared floating-panel clamping and panel open/close state remain in index.html.

const MATRIX_REF_ZOOM_MIN = 0.6;
const MATRIX_REF_ZOOM_MAX = 2.0;
let matrixRefZoom = loadMatrixRefZoom();

function loadMatrixRefZoom() {
  try {
    const raw = parseFloat(localStorage.getItem('shithead_matrixref_zoom'));
    if (!isFinite(raw)) return 1;
    return Math.min(MATRIX_REF_ZOOM_MAX, Math.max(MATRIX_REF_ZOOM_MIN, raw));
  } catch (e) { return 1; }
}

function saveMatrixRefZoom() {
  try { localStorage.setItem('shithead_matrixref_zoom', String(matrixRefZoom)); } catch (e) {}
}

function getMaxMatrixRefZoom() {
  const panel = document.getElementById('matrixRefPanel');
  const m = 6;
  const w = (panel && panel.offsetWidth) || 300;
  const h = (panel && panel.offsetHeight) || 340;
  const byWidth = (window.innerWidth - 2 * m) / w;
  const byHeight = (window.innerHeight - 2 * m) / h;
  return Math.max(MATRIX_REF_ZOOM_MIN, Math.min(MATRIX_REF_ZOOM_MAX, byWidth, byHeight));
}

function applyMatrixRefZoom() {
  const panel = document.getElementById('matrixRefPanel');
  if (!panel) return;
  const maxZoom = getMaxMatrixRefZoom();
  if (matrixRefZoom > maxZoom) matrixRefZoom = maxZoom;
  panel.style.transform = `scale(${matrixRefZoom})`;
  panel.querySelectorAll('.cardref-resize-handle').forEach((h) => {
    h.style.transform = `scale(${1 / matrixRefZoom})`;
  });
  const left = parseFloat(panel.style.left) || 0;
  const top = parseFloat(panel.style.top) || 0;
  const clamped = clampFloatingPanelPosition(left, top, panel.offsetWidth * matrixRefZoom, panel.offsetHeight * matrixRefZoom);
  panel.style.left = `${clamped.left}px`;
  panel.style.top = `${clamped.top}px`;
}

function setMatrixRefZoom(z) {
  matrixRefZoom = Math.min(MATRIX_REF_ZOOM_MAX, Math.max(MATRIX_REF_ZOOM_MIN, z));
  applyMatrixRefZoom();
  saveMatrixRefZoom();
}

function setMatrixRefZoomFromCorner(corner, z) {
  const panel = document.getElementById('matrixRefPanel');
  if (!panel) return;
  const newZoom = Math.min(MATRIX_REF_ZOOM_MAX, Math.max(MATRIX_REF_ZOOM_MIN, z));
  const w = panel.offsetWidth, h = panel.offsetHeight;
  const oldZoom = matrixRefZoom;
  const left = parseFloat(panel.style.left) || 0;
  const top = parseFloat(panel.style.top) || 0;
  const anchorRight = corner === 'tl' || corner === 'bl';
  const anchorBottom = corner === 'tl' || corner === 'tr';
  panel.style.left = `${anchorRight ? (left + w * oldZoom) - w * newZoom : left}px`;
  panel.style.top = `${anchorBottom ? (top + h * oldZoom) - h * newZoom : top}px`;
  matrixRefZoom = newZoom;
  applyMatrixRefZoom();
  saveMatrixRefZoom();
}

// Default position: deliberately anchored to where the hand-count badge
// used to live (the left edge of the Turn Indicator row, vertically
// centred on it) rather than some arbitrary screen point, so a
// first-time open feels like it's coming from a familiar spot on the
// HUD. Falls back to a safe on-screen default if that row is ever
// missing from the DOM.
function defaultMatrixRefPosition(w, h) {
  const row = document.getElementById('turnIndicatorRow');
  if (row) {
    const rect = row.getBoundingClientRect();
    return {
      left: rect.left + 2,
      top: rect.top + rect.height / 2 - h / 2
    };
  }
  return { left: 6, top: Math.max(6, (window.innerHeight - h) / 2) };
}

let matrixRefPlaced = false; // same as cardRefPlaced (v275)
function positionMatrixRefPanel(opts) {
  const panel = document.getElementById('matrixRefPanel');
  if (!panel || !matrixRefOpen) return;
  applyMatrixRefZoom();
  if (opts && opts.keep && matrixRefPlaced) return;
  matrixRefPlaced = true;
  const w = (panel.offsetWidth || 300) * matrixRefZoom, h = (panel.offsetHeight || 340) * matrixRefZoom;
  const saved = loadMatrixRefPosition();
  let left, top;
  if (saved) {
    left = saved.xPct * window.innerWidth;
    top = saved.yPct * window.innerHeight;
  } else {
    const def = defaultMatrixRefPosition(w, h);
    left = def.left;
    top = def.top;
  }
  const clamped = clampFloatingPanelPosition(left, top, w, h);
  panel.style.left = `${clamped.left}px`;
  panel.style.top = `${clamped.top}px`;
}

function loadMatrixRefPosition() {
  try {
    const raw = localStorage.getItem('shithead_matrixref_pos');
    if (!raw) return null;
    const pos = JSON.parse(raw);
    if (typeof pos.xPct !== 'number' || typeof pos.yPct !== 'number') return null;
    return pos;
  } catch (e) { return null; }
}

function saveMatrixRefPosition(left, top) {
  try {
    localStorage.setItem('shithead_matrixref_pos', JSON.stringify({
      xPct: left / window.innerWidth,
      yPct: top / window.innerHeight
    }));
  } catch (e) {
    // Private browsing / storage disabled — falls back to the default
    // position next time, which is harmless.
  }
}

let matrixRefDrag = null;
const MATRIX_REF_DRAG_THRESHOLD = 6;

function initMatrixRefDrag() {
  const panel = document.getElementById('matrixRefPanel');
  if (!panel) return;

  panel.addEventListener('pointerdown', (e) => {
    if (!matrixRefOpen) return;
    if (e.target.closest('.cardref-resize-handle')) return;
    const rect = panel.getBoundingClientRect();
    matrixRefDrag = {
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
    if (!matrixRefDrag || e.pointerId !== matrixRefDrag.pointerId) return;
    const dx = e.clientX - matrixRefDrag.startX;
    const dy = e.clientY - matrixRefDrag.startY;
    if (!matrixRefDrag.moved && Math.hypot(dx, dy) < MATRIX_REF_DRAG_THRESHOLD) return;
    if (!matrixRefDrag.moved) panel.classList.add('cursor-grabbing');
    matrixRefDrag.moved = true;
    const clamped = clampFloatingPanelPosition(
      matrixRefDrag.origLeft + dx, matrixRefDrag.origTop + dy,
      panel.offsetWidth * matrixRefZoom, panel.offsetHeight * matrixRefZoom
    );
    panel.style.left = `${clamped.left}px`;
    panel.style.top = `${clamped.top}px`;
  });

  panel.addEventListener('pointerup', (e) => {
    if (!matrixRefDrag || e.pointerId !== matrixRefDrag.pointerId) return;
    const wasDrag = matrixRefDrag.moved;
    panel.classList.remove('cursor-grabbing');
    if (wasDrag) {
      saveMatrixRefPosition(parseFloat(panel.style.left), parseFloat(panel.style.top));
    }
    matrixRefDrag = null;
    if (!wasDrag) {
      toggleMatrixReference(true);
    }
  });
}

function initMatrixRefZoomControls() {
  const panel = document.getElementById('matrixRefPanel');
  if (!panel) return;

  panel.querySelectorAll('.cardref-resize-handle').forEach((handle) => {
    const corner = handle.dataset.corner;
    const signX = (corner === 'tl' || corner === 'bl') ? -1 : 1;
    const signY = (corner === 'tl' || corner === 'tr') ? -1 : 1;
    let drag = null;
    handle.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      drag = { startX: e.clientX, startY: e.clientY, startZoom: matrixRefZoom, pointerId: e.pointerId };
      handle.classList.add('resize-active');
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.pointerId) return;
      const dx = (e.clientX - drag.startX) * signX;
      const dy = (e.clientY - drag.startY) * signY;
      setMatrixRefZoomFromCorner(corner, drag.startZoom + (dx + dy) / 2 / 150);
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

  panel.addEventListener('wheel', (e) => {
    if (!matrixRefOpen) return;
    e.preventDefault();
    const step = e.deltaY < 0 ? 0.1 : -0.1;
    setMatrixRefZoom(matrixRefZoom + step);
  }, { passive: false });

  let pinch = null;
  panel.addEventListener('touchstart', (e) => {
    if (!matrixRefOpen) return;
    if (e.touches.length === 2) {
      matrixRefDrag = null;
      const [t1, t2] = e.touches;
      pinch = {
        startDist: Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY),
        startZoom: matrixRefZoom
      };
    }
  }, { passive: true });
  panel.addEventListener('touchmove', (e) => {
    if (!pinch || e.touches.length !== 2) return;
    e.preventDefault();
    const [t1, t2] = e.touches;
    const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    setMatrixRefZoom(pinch.startZoom * (dist / pinch.startDist));
  }, { passive: false });
  panel.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) pinch = null;
  });
  panel.addEventListener('touchcancel', () => { pinch = null; });
}
