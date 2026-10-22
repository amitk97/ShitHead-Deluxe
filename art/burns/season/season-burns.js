/* Season Burns: six 1.8s burns (Seasons 1-6) for the Season Pass.
 * Canvas particles (additive glow, analytic physics, so any frame can be scrubbed) over real card clones moved by
 * the Web Animations API (3D transforms, clip-path fragments, filters). Everything shares ONE clock, the driver
 * animation's currentTime, so pausing the animations pauses the canvas too.
 * Needs procBurnStage / createCardElement (burn-effects.js / app.js). Public API: ShSeasonBurns.play(id, host, x, y, k),
 * .has(id), .sound(id, kit), .icon(id), .IDS, .MS. */
(function () {
  'use strict';
  const MS = 1800, TAU = Math.PI * 2;
  const IDS = ['burn-ss2611-sandstorm', 'burn-ss2701-glacier', 'burn-ss2703-shuriken', 'burn-ss2705-whirlpool', 'burn-ss2707-zeus', 'burn-ss2709-hex'];
  const NAMES = { 'burn-ss2611-sandstorm': 'Sandstorm Vortex', 'burn-ss2701-glacier': 'Glacial Shatter', 'burn-ss2703-shuriken': 'Shuriken Barrage', 'burn-ss2705-whirlpool': 'Abyssal Whirlpool', 'burn-ss2707-zeus': "Zeus's Bolt", 'burn-ss2709-hex': 'Arcane Hex' };
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
  const lin = (a, b, t) => clamp((t - a) / (b - a));
  const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
  const eIn = (t) => Math.pow(clamp(t), 3);
  const eIO = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // ---------- sprites (drawn once, drawImage'd every frame) ----------
  const cache = {};
  function sprite(key, size, paint) {
    if (cache[key]) return cache[key];
    const c = document.createElement('canvas'); c.width = c.height = size;
    paint(c.getContext('2d'), size); return (cache[key] = c);
  }
  const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const glow = (c) => sprite('g' + c, 64, (g, s) => { const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); r.addColorStop(0, rgba(c, 1)); r.addColorStop(.3, rgba(c, .4)); r.addColorStop(1, rgba(c, 0)); g.fillStyle = r; g.fillRect(0, 0, s, s); });
  // A soft, lumpy cloud puff (several overlapping blobs).
  const puff = (c, seed = 1) => sprite('p' + c + seed, 128, (g, s) => { const R = rng(seed * 977); for (let i = 0; i < 9; i++) { const x = s / 2 + (R() - .5) * s * .38, y = s / 2 + (R() - .5) * s * .38, r = s * (.16 + R() * .16); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(c, .5)); gr.addColorStop(1, rgba(c, 0)); g.fillStyle = gr; g.fillRect(0, 0, s, s); } });
  // Four-point glint.
  const glint = (c) => sprite('s' + c, 64, (g, s) => {
    g.translate(s / 2, s / 2); const a = g.createRadialGradient(0, 0, 0, 0, 0, s / 2); a.addColorStop(0, rgba(c, 1)); a.addColorStop(1, rgba(c, 0)); g.fillStyle = a;
    g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? s * .06 : s * .48, an = i * Math.PI / 4 - Math.PI / 2; g.lineTo(Math.cos(an) * r, Math.sin(an) * r); } g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, s * .05, 0, TAU); g.fill();
  });
  function put(ctx, img, x, y, size, alpha, rot = 0, sx = 1) {
    if (alpha <= 0.003 || size <= 0.2) return;
    ctx.globalAlpha = Math.min(1, alpha);
    if (!rot && sx === 1) { ctx.drawImage(img, x - size / 2, y - size / 2, size, size); return; }
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sx, 1); ctx.drawImage(img, -size / 2, -size / 2, size, size); ctx.restore();
  }
  // Brushed-metal four-point throwing star with a bevelled face and a hub hole.
  const shuriken = () => sprite('shuriken', 192, (g, s) => {
    const c = s / 2, R = s * .47, r = s * .13;
    g.translate(c, c);
    for (let i = 0; i < 4; i++) {
      g.save(); g.rotate(i * Math.PI / 2);
      const tip = [0, -R], l = [-R * .42, -r * .5], rr = [R * .42, -r * .5], ctr = [0, 0];
      g.beginPath(); g.moveTo(...ctr); g.lineTo(...l); g.lineTo(...tip); g.closePath(); g.fillStyle = '#d6dde6'; g.fill();
      g.beginPath(); g.moveTo(...ctr); g.lineTo(...tip); g.lineTo(...rr); g.closePath(); g.fillStyle = '#5b6573'; g.fill();
      const gr = g.createLinearGradient(-R * .4, -R, R * .4, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,.35)');
      g.beginPath(); g.moveTo(...l); g.lineTo(...tip); g.lineTo(...rr); g.lineTo(0, -r * 1.4); g.closePath(); g.fillStyle = gr; g.fill();
      g.strokeStyle = 'rgba(20,24,32,.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(...l); g.lineTo(...tip); g.lineTo(...rr); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(0, -r * .6); g.lineTo(0, -R * .93); g.stroke();
      g.restore();
    }
    const hub = g.createRadialGradient(-r * .3, -r * .3, 1, 0, 0, r * 1.5); hub.addColorStop(0, '#f1f5f9'); hub.addColorStop(1, '#47505e');
    g.beginPath(); g.arc(0, 0, r * 1.45, 0, TAU); g.fillStyle = hub; g.fill(); g.strokeStyle = '#1b2029'; g.lineWidth = 2; g.stroke();
    g.beginPath(); g.arc(0, 0, r * .62, 0, TAU); g.fillStyle = '#0b0e14'; g.fill();
  });
  const petal = (c1, c2) => sprite('pt' + c1 + c2, 64, (g, s) => {
    g.translate(s / 2, s / 2);
    const gr = g.createLinearGradient(0, s * .4, 0, -s * .4); gr.addColorStop(0, rgba(c2, 1)); gr.addColorStop(1, rgba(c1, 1));
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, s * .42); g.bezierCurveTo(s * .46, s * .12, s * .34, -s * .36, s * .08, -s * .42); g.lineTo(0, -s * .3); g.lineTo(-s * .08, -s * .42); g.bezierCurveTo(-s * .34, -s * .36, -s * .46, s * .12, 0, s * .42); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, s * .36); g.lineTo(0, -s * .2); g.stroke();
  });

  // ---------- DOM helpers ----------
  const css = document.createElement('style');
  css.textContent = '.ssb{position:absolute;pointer-events:none;will-change:transform,opacity}.ssb-c{position:absolute;left:0;top:0;pointer-events:none}.ssb-piece{position:absolute;pointer-events:none;will-change:transform,opacity,filter}';
  document.head.appendChild(css);
  function cloneCard(el) {
    const f = el.cloneNode(true);
    f.removeAttribute('id'); f.removeAttribute('data-card-id');
    f.querySelectorAll('[id],[data-card-id]').forEach(q => { q.removeAttribute('id'); q.removeAttribute('data-card-id'); });
    f.classList.add('pfx-face');
    return f;
  }
  const px = (n) => Math.round(n * 100) / 100;
  // Marble: veins from feTurbulence, as a data-URL overlay (made once).
  const MARBLE = (() => {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='280'><filter id='m' x='0' y='0' width='100%' height='100%'><feTurbulence type='fractalNoise' baseFrequency='.012 .035' numOctaves='5' seed='7'/><feColorMatrix values='0 0 0 0 .28  0 0 0 0 .26  0 0 0 0 .24  4.6 0 0 0 -1.5'/></filter><rect width='100%' height='100%' filter='url(#m)'/></svg>";
    return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")';
  })();

  function scene(id, host, x, y, k, build) {
    const st = procBurnStage(host, x, y, MS);
    const { layer, cx, cy, W, H } = st;
    const hr = host.getBoundingClientRect();
    const vw = Math.round(host.clientWidth || hr.width || innerWidth), vh = Math.round(host.clientHeight || hr.height || innerHeight);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const canvases = [];
    const mkCanvas = () => {
      const c = document.createElement('canvas'); c.className = 'ssb-c'; c.width = Math.round(vw * dpr); c.height = Math.round(vh * dpr);
      c.style.width = vw + 'px'; c.style.height = vh + 'px'; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.style.zIndex = canvases.length ? 9 : 0; layer.appendChild(c); canvases.push({ c, g }); return g;
    };
    const driver = st.anim(layer, [{ opacity: 1 }, { opacity: 1 }]);
    const T = () => (driver && driver.currentTime != null ? Math.min(MS, +driver.currentTime) : 0);
    // Sampled keyframes on the shared clock (so 3D transforms follow real physics, not one big ease).
    const track = (el, fn) => {
      const kf = [], N = 90;
      for (let i = 0; i <= N; i++) { const t = MS * i / N, f = fn(t); f.offset = i / N; kf.push(f); }
      return st.anim(el, kf);
    };
    const S = { st, W, H, cx, cy, vw, vh, u: H, layer, mkCanvas, track, driver, T, host,
      add(el) { layer.appendChild(el); return el; },
      box(el, w, h, ox, oy) { el.style.cssText += `;position:absolute;left:${px(ox)}px;top:${px(oy)}px;width:${px(w)}px;height:${px(h)}px;margin:0`; return el; } };
    const sc = build(S) || {};
    // keep tall effects off the opponent seat: transparent above cy - a*H, fully opaque below cy - b*H
    if (sc.topFade) canvases.forEach(({ c }) => { const m = `linear-gradient(to bottom,transparent ${px(cy - sc.topFade[0] * H)}px,#000 ${px(cy - sc.topFade[1] * H)}px)`; c.style.webkitMaskImage = c.style.maskImage = m; });
    let raf = 0, alive = true;
    const frame = () => {
      if (!alive) return;
      const t = T();
      canvases.forEach(({ g }) => { g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, vw, vh); });
      if (sc.draw) sc.draw(t);
      if (sc.dom) sc.dom(t);
      raf = requestAnimationFrame(frame);
    };
    frame();
    st.end(driver);
    const done = driver && driver.onfinish;
    if (driver) driver.onfinish = () => { alive = false; cancelAnimationFrame(raf); canvases.length = 0; if (done) done(); };
    setTimeout(() => { alive = false; cancelAnimationFrame(raf); }, MS + 4200);
    return true;
  }

  // The top n visible Pile cards as clones, positioned where they lie (one preview card when not on the table).
  function pileClones(S, n) {
    const { st, layer } = S, hr = S.host.getBoundingClientRect();
    const els = st.onTable ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')].filter(e => e.offsetWidth).slice(-n) : [];
    const out = [];
    if (!els.length) { const f = st.face(); f.style.left = px(S.cx - S.W / 2) + 'px'; f.style.top = px(S.cy - S.H / 2) + 'px'; layer.appendChild(f); return [f]; }
    els.forEach(el => {
      const r = el.getBoundingClientRect(), f = cloneCard(el), cs = getComputedStyle(el);
      f.style.cssText = `position:absolute;left:${px(r.left + r.width / 2 - hr.left - el.offsetWidth / 2)}px;top:${px(r.top + r.height / 2 - hr.top - el.offsetHeight / 2)}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;margin:0;animation:none;transition:none;opacity:1;visibility:visible;transform:${cs.transform === 'none' ? '' : cs.transform}`;
      layer.appendChild(f); out.push(f);
    });
    return out;
  }
  function topFace(S) { const f = S.st.face(); f.style.left = px(S.cx - S.W / 2) + 'px'; f.style.top = px(S.cy - S.H / 2) + 'px'; S.layer.appendChild(f); return f; }

  // Cracks drawn over the card (stroke-dashoffset reveal on the shared clock).
  function cracks(S, wrap, color, glowCol, seed) {
    const R = rng(seed), { W, H } = S, ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible`;
    const paths = [];
    const arm = (x0, y0, ang, len, depth) => {
      let x = x0, y = y0, d = `M${px(x)} ${px(y)}`;
      const n = 5 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        ang += (R() - .5) * .9; x += Math.cos(ang) * len / n; y += Math.sin(ang) * len / n; d += `L${px(x)} ${px(y)}`;
        if (depth < 2 && R() < .38) arm(x, y, ang + (R() < .5 ? -1 : 1) * (.6 + R() * .6), len * .45, depth + 1);
      }
      paths.push(d);
    };
    const ox = W * (.35 + R() * .3), oy = H * (.35 + R() * .3);
    for (let i = 0; i < 7; i++) arm(ox, oy, i / 7 * TAU + R() * .5, Math.max(W, H) * (.5 + R() * .35), 0);
    const els = paths.map((d, i) => {
      const g = document.createElementNS(ns, 'path'); g.setAttribute('d', d); g.setAttribute('pathLength', '1'); g.setAttribute('fill', 'none');
      g.setAttribute('stroke', color); g.setAttribute('stroke-width', px(Math.max(1, W * .02))); g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round');
      g.style.filter = `drop-shadow(0 0 ${px(W * .05)}px ${glowCol})`; g.style.strokeDasharray = '1'; g.style.strokeDashoffset = '1'; svg.appendChild(g); return g;
    });
    wrap.appendChild(svg);
    return { svg, els, set(p) { els.forEach((e, i) => { e.style.strokeDashoffset = String(1 - clamp(p * 1.35 - i * .06, 0, 1)); }); } };
  }

  // Jittered-grid fragments that tile the card exactly (8-sided, so every edge is jagged). Returns piece elements.
  function fragments(S, source, cols, rows, seed) {
    const R = rng(seed), { W, H } = S, cw = W / cols, ch = H / rows;
    const V = [];
    for (let j = 0; j <= rows; j++) { V[j] = []; for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
      V[j][i] = [i * cw + (edgeX ? 0 : (R() - .5) * cw * .7), j * ch + (edgeY ? 0 : (R() - .5) * ch * .7)];
    } }
    const HM = [], VM = [];
    for (let j = 0; j <= rows; j++) { HM[j] = []; for (let i = 0; i < cols; i++) { const a = V[j][i], b = V[j][i + 1], o = (j === 0 || j === rows) ? 0 : (R() - .5) * ch * .3; HM[j][i] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + o]; } }
    for (let j = 0; j < rows; j++) { VM[j] = []; for (let i = 0; i <= cols; i++) { const a = V[j][i], b = V[j + 1][i], o = (i === 0 || i === cols) ? 0 : (R() - .5) * cw * .3; VM[j][i] = [(a[0] + b[0]) / 2 + o, (a[1] + b[1]) / 2]; } }
    const out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const poly = [V[j][i], HM[j][i], V[j][i + 1], VM[j][i + 1], V[j + 1][i + 1], HM[j + 1][i], V[j + 1][i], VM[j][i]];
      const mx = poly.reduce((s, p) => s + p[0], 0) / 8, my = poly.reduce((s, p) => s + p[1], 0) / 8;
      const el = source.cloneNode(true);
      el.style.left = px(S.cx - W / 2) + 'px'; el.style.top = px(S.cy - H / 2) + 'px'; el.style.clipPath = `polygon(${poly.map(p => `${px(p[0])}px ${px(p[1])}px`).join(',')})`;
      el.style.transformOrigin = `${px(mx)}px ${px(my)}px`; el.classList.add('ssb-piece');
      // A directional facet shade (lit from the top-left), so each shard reads as its own plane.
      const sh = document.createElement('i'); const a = R() * 360;
      sh.style.cssText = `position:absolute;inset:0;pointer-events:none;background:linear-gradient(${px(a)}deg,rgba(255,255,255,${px(.12 + R() * .3)}),rgba(0,0,0,${px(.1 + R() * .32)}))`;
      el.appendChild(sh);
      S.layer.appendChild(el);
      out.push({ el, mx: mx - W / 2, my: my - H / 2, R: rng(seed * 31 + out.length * 7 + 3) });
    }
    return out;
  }
  // Physical pieces: ballistic with drag, tumble in 3D, shaded by their facing.
  function flyPieces(S, pieces, t0, o) {
    const { W, H } = S;
    pieces.forEach(p => {
      const base = p.el.style.filter || '', R = p.R, dirx = p.mx / (W * .5) + (R() - .5) * .8, diry = p.my / (H * .5) + (R() - .5) * .8 - (o.up || 0);
      const sp = o.speed * (.6 + R() * .8), vx = dirx * sp, vy = diry * sp, vz = (R() - .2) * o.speed * .7;
      const ax = R() - .5, ay = R() - .5, az = R() - .5, spin = (R() < .5 ? -1 : 1) * (240 + R() * 620), drag = o.drag || 1.2;
      p.fn = (t) => {
        const s = Math.max(0, (t - t0) / 1000), k = (1 - Math.exp(-drag * s)) / drag;
        const X = p.mx * 0 + vx * k + (o.jolt ? (p.mx > 0 ? 1 : -1) * o.jolt * Math.min(1, s * 6) : 0), Y = vy * k + .5 * o.grav * s * s, Z = vz * k;
        const ang = spin * s * (s < .6 ? 1 : .8), vis = t < t0 ? 1 : 1 - sm(o.fadeFrom, o.fadeTo, t);
        const ca = Math.cos(ang * Math.PI / 180), br = t < t0 ? 1 : .62 + .5 * Math.max(0, ca);
        return { transform: `translate3d(${px(X)}px,${px(Y)}px,${px(Z)}px) rotate3d(${px(ax)},${px(ay)},${px(az)},${px(ang)}deg)`, opacity: t < t0 ? 0 : vis, filter: `${base} brightness(${px(br)})` };
      };
      S.track(p.el, p.fn);
    });
  }
  // The intact card: visible until t0, then gone (the fragments take over).
  function intactUntil(S, el, t0) { S.track(el, (t) => ({ opacity: t < t0 ? 1 : 0 })); }

  // ====================== SEASON 1: Sandstorm Vortex ======================
  function sandstorm(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W, vw } = S;
    const SAND = [[196, 140, 52], [214, 160, 66], [168, 116, 40], [226, 182, 96]], R = rng(11);
    const cards = pileClones(S, 5);
    cards.forEach((el, i) => {
      const n = cards.length, order = i / Math.max(1, n - 1);
      S.track(el, (t) => {
        const e = eIn(lin(550 + (1 - order) * 40, 1350, t)), a = e;
        const lift = -H * 1.0 * e, drift = Math.sin(t / 90 + i) * W * .06 * e;
        return { transform: `translate3d(${px(drift)}px,${px(lift)}px,${px(60 * e)}px) rotateZ(${px(1080 * e)}deg) scale(${px(Math.max(0.0001, 1 - e))})`, opacity: 1 - Math.max(0, a - .55) / .45, filter: `blur(${px(e * 2.5)}px) sepia(${px(e * .6)})` };
      });
    });
    // grains: arrive from the screen edges (0-550), orbit a funnel (550-1400), rise into a golden cloud (1400-1800)
    const N = 1500, g = [];
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1, hh = R(), hy = cy + (R() - .5) * H * 3.2;
      g.push({ side, sy: hy, dly: R() * 140, th0: R() * TAU, wv: 5 + R() * 6, hgt: R(), rad: .4 + R() * .75, sz: .014 + R() * .03, col: SAND[i % 4], cl: R() < .22, drift: (R() - .5) * W * 1.6, lift: .7 + R() * 1.3, hh, curl: (R() - .5) * 2 });
    }
    return {
      topFade: [1.9, .8],
      draw(t) {
        // dusty mist sweeping in
        const mist = lin(0, 450, t) * (1 - lin(1300, 1800, t));
        back.globalCompositeOperation = 'source-over';
        for (let s = 0; s < 8; s++) { const side = s % 2 ? 1 : -1, p = eOut(lin(0, 520 + s * 15, t)), x0 = side < 0 ? -W : vw + W;
          put(back, puff([214, 168, 96], s % 3 + 1), lerp(x0, cx + side * -W * .2, p), cy + Math.sin(s * 2.1) * H * .6, H * (1.5 + (s % 3) * .35), (.34 - .18 * p) * mist * (s < 6 ? 1 : .8), t / 900 + s); }
        front.globalCompositeOperation = 'source-over';
        for (let i = 0; i < N; i++) {
          const q = g[i], tt = t - q.dly; if (tt < 0) continue;
          let X, Y, a = 1, size = q.sz * H * 1.55;
          if (t < 600) {                                  // phase 1: streak in from the edges, converging
            const p = eOut(lin(0, 520, tt)), x0 = q.side < 0 ? -20 : vw + 20, wob = Math.sin(tt / 70 + q.th0) * H * .12 * (1 - p);
            X = lerp(x0, cx + Math.cos(q.th0) * W * .9, p); Y = lerp(q.sy, cy + Math.sin(q.th0) * H * .25, p) + wob;
            const pp = eOut(lin(0, 520, tt - 22)), px2 = lerp(x0, cx + Math.cos(q.th0) * W * .9, pp);
            front.globalAlpha = .22; front.strokeStyle = rgba(q.col, .6); front.lineWidth = size * .7; front.beginPath(); front.moveTo(px2, lerp(q.sy, cy, pp)); front.lineTo(X, Y); front.stroke();
            a = Math.min(1, tt / 120);
          } else {
            const spin = (tt - 520) / 1000, up = sm(550, 1250, t), dis = lin(1400, 1800, t);
            const th = q.th0 + q.wv * spin * (1 + up * .6), h = (q.hgt * up) + dis * q.lift * .5;
            const funnel = (.12 + .88 * q.hgt * q.hgt) * q.rad * H * .9;
            const rx = funnel * (1 + dis * .9), ry = rx * .34;
            X = cx + Math.cos(th) * rx + q.drift * dis * .4; Y = cy - h * H * 1.45 + Math.sin(th) * ry - (up < 1 ? 0 : 0);
            // grains swept in from phase 1 settle into the funnel
            const settle = sm(520, 760, t); if (settle < 1) { const x1 = cx + Math.cos(q.th0) * W * .9, y1 = cy + Math.sin(q.th0) * H * .25; X = lerp(x1, X, settle); Y = lerp(y1, Y, settle); }
            a = (1 - dis) * (.6 + .4 * (Math.sin(th) > 0 ? 1 : .5)) * (.55 + .45 * q.hgt);
          }
          put(front, glow(q.col), X, Y, size * (q.cl ? 3.2 : 1.7), a * (q.cl ? .32 : .95));
        }
        // glowing golden core / dust cloud
        const core = sm(500, 900, t) * (1 - sm(1450, 1800, t));
        front.globalCompositeOperation = 'lighter'; put(front, glow([255, 190, 90]), cx, cy - H * .35 * sm(500, 1300, t), H * 2.2 * (.6 + .5 * sm(1350, 1800, t)), .16 * core + .5 * sm(1400, 1600, t) * (1 - sm(1600, 1800, t)));
        const cloud = sm(1380, 1560, t) * (1 - sm(1560, 1800, t));
        front.globalCompositeOperation = 'source-over'; for (let c = 0; c < 6; c++) put(front, puff([232, 188, 100], c % 3 + 1), cx + (c - 2.5) * W * .35, cy - H * (.4 + c * .04 + .3 * lin(1400, 1800, t)), H * 1.4, .38 * cloud, c);
      }
    };
  }

  // ====================== SEASON 2: Glacial Shatter ======================
  function pileClones(S, n) {
    const { st, layer } = S, hr = S.host.getBoundingClientRect();
    const els = st.onTable ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')].filter(e => e.offsetWidth).slice(-n) : [];
    const out = [];
    if (!els.length) { const f = st.face(); f.style.left = px(S.cx - S.W / 2) + 'px'; f.style.top = px(S.cy - S.H / 2) + 'px'; layer.appendChild(f); return [f]; }
    els.forEach(el => {
      const r = el.getBoundingClientRect(), f = cloneCard(el), cs = getComputedStyle(el);
      f.style.cssText = `position:absolute;left:${px(r.left + r.width / 2 - hr.left - el.offsetWidth / 2)}px;top:${px(r.top + r.height / 2 - hr.top - el.offsetHeight / 2)}px;width:${el.offsetWidth}px;height:${el.offsetHeight}px;margin:0;animation:none;transition:none;opacity:1;visibility:visible;transform:${cs.transform === 'none' ? '' : cs.transform}`;
      layer.appendChild(f); out.push(f);
    });
    return out;
  }
  function topFace(S) { const f = S.st.face(); f.style.left = px(S.cx - S.W / 2) + 'px'; f.style.top = px(S.cy - S.H / 2) + 'px'; S.layer.appendChild(f); return f; }

  // Cracks drawn over the card (stroke-dashoffset reveal on the shared clock).
  function cracks(S, wrap, color, glowCol, seed) {
    const R = rng(seed), { W, H } = S, ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;overflow:visible`;
    const paths = [];
    const arm = (x0, y0, ang, len, depth) => {
      let x = x0, y = y0, d = `M${px(x)} ${px(y)}`;
      const n = 5 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) {
        ang += (R() - .5) * .9; x += Math.cos(ang) * len / n; y += Math.sin(ang) * len / n; d += `L${px(x)} ${px(y)}`;
        if (depth < 2 && R() < .38) arm(x, y, ang + (R() < .5 ? -1 : 1) * (.6 + R() * .6), len * .45, depth + 1);
      }
      paths.push(d);
    };
    const ox = W * (.35 + R() * .3), oy = H * (.35 + R() * .3);
    for (let i = 0; i < 7; i++) arm(ox, oy, i / 7 * TAU + R() * .5, Math.max(W, H) * (.5 + R() * .35), 0);
    const els = paths.map((d, i) => {
      const g = document.createElementNS(ns, 'path'); g.setAttribute('d', d); g.setAttribute('pathLength', '1'); g.setAttribute('fill', 'none');
      g.setAttribute('stroke', color); g.setAttribute('stroke-width', px(Math.max(1, W * .02))); g.setAttribute('stroke-linecap', 'round'); g.setAttribute('stroke-linejoin', 'round');
      g.style.filter = `drop-shadow(0 0 ${px(W * .05)}px ${glowCol})`; g.style.strokeDasharray = '1'; g.style.strokeDashoffset = '1'; svg.appendChild(g); return g;
    });
    wrap.appendChild(svg);
    return { svg, els, set(p) { els.forEach((e, i) => { e.style.strokeDashoffset = String(1 - clamp(p * 1.35 - i * .06, 0, 1)); }); } };
  }

  // Jittered-grid fragments that tile the card exactly (8-sided, so every edge is jagged). Returns piece elements.
  function fragments(S, source, cols, rows, seed) {
    const R = rng(seed), { W, H } = S, cw = W / cols, ch = H / rows;
    const V = [];
    for (let j = 0; j <= rows; j++) { V[j] = []; for (let i = 0; i <= cols; i++) {
      const edgeX = i === 0 || i === cols, edgeY = j === 0 || j === rows;
      V[j][i] = [i * cw + (edgeX ? 0 : (R() - .5) * cw * .7), j * ch + (edgeY ? 0 : (R() - .5) * ch * .7)];
    } }
    const HM = [], VM = [];
    for (let j = 0; j <= rows; j++) { HM[j] = []; for (let i = 0; i < cols; i++) { const a = V[j][i], b = V[j][i + 1], o = (j === 0 || j === rows) ? 0 : (R() - .5) * ch * .3; HM[j][i] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + o]; } }
    for (let j = 0; j < rows; j++) { VM[j] = []; for (let i = 0; i <= cols; i++) { const a = V[j][i], b = V[j + 1][i], o = (i === 0 || i === cols) ? 0 : (R() - .5) * cw * .3; VM[j][i] = [(a[0] + b[0]) / 2 + o, (a[1] + b[1]) / 2]; } }
    const out = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const poly = [V[j][i], HM[j][i], V[j][i + 1], VM[j][i + 1], V[j + 1][i + 1], HM[j + 1][i], V[j + 1][i], VM[j][i]];
      const mx = poly.reduce((s, p) => s + p[0], 0) / 8, my = poly.reduce((s, p) => s + p[1], 0) / 8;
      const el = source.cloneNode(true);
      el.style.left = px(S.cx - W / 2) + 'px'; el.style.top = px(S.cy - H / 2) + 'px'; el.style.clipPath = `polygon(${poly.map(p => `${px(p[0])}px ${px(p[1])}px`).join(',')})`;
      el.style.transformOrigin = `${px(mx)}px ${px(my)}px`; el.classList.add('ssb-piece');
      // A directional facet shade (lit from the top-left), so each shard reads as its own plane.
      const sh = document.createElement('i'); const a = R() * 360;
      sh.style.cssText = `position:absolute;inset:0;pointer-events:none;background:linear-gradient(${px(a)}deg,rgba(255,255,255,${px(.12 + R() * .3)}),rgba(0,0,0,${px(.1 + R() * .32)}))`;
      el.appendChild(sh);
      S.layer.appendChild(el);
      out.push({ el, mx: mx - W / 2, my: my - H / 2, R: rng(seed * 31 + out.length * 7 + 3) });
    }
    return out;
  }
  // Physical pieces: ballistic with drag, tumble in 3D, shaded by their facing.
  function flyPieces(S, pieces, t0, o) {
    const { W, H } = S;
    pieces.forEach(p => {
      const base = p.el.style.filter || '', R = p.R, dirx = p.mx / (W * .5) + (R() - .5) * .8, diry = p.my / (H * .5) + (R() - .5) * .8 - (o.up || 0);
      const sp = o.speed * (.6 + R() * .8), vx = dirx * sp, vy = diry * sp, vz = (R() - .2) * o.speed * .7;
      const ax = R() - .5, ay = R() - .5, az = R() - .5, spin = (R() < .5 ? -1 : 1) * (240 + R() * 620), drag = o.drag || 1.2;
      p.fn = (t) => {
        const s = Math.max(0, (t - t0) / 1000), k = (1 - Math.exp(-drag * s)) / drag;
        const X = p.mx * 0 + vx * k + (o.jolt ? (p.mx > 0 ? 1 : -1) * o.jolt * Math.min(1, s * 6) : 0), Y = vy * k + .5 * o.grav * s * s, Z = vz * k;
        const ang = spin * s * (s < .6 ? 1 : .8), vis = t < t0 ? 1 : 1 - sm(o.fadeFrom, o.fadeTo, t);
        const ca = Math.cos(ang * Math.PI / 180), br = t < t0 ? 1 : .62 + .5 * Math.max(0, ca);
        return { transform: `translate3d(${px(X)}px,${px(Y)}px,${px(Z)}px) rotate3d(${px(ax)},${px(ay)},${px(az)},${px(ang)}deg)`, opacity: t < t0 ? 0 : vis, filter: `${base} brightness(${px(br)})` };
      };
      S.track(p.el, p.fn);
    });
  }
  // The intact card: visible until t0, then gone (the fragments take over).
  function intactUntil(S, el, t0) { S.track(el, (t) => ({ opacity: t < t0 ? 1 : 0 })); }

  // ====================== SEASON 1: Sandstorm Vortex ======================
  function sandstorm(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W, vw } = S;
    const SAND = [[196, 140, 52], [214, 160, 66], [168, 116, 40], [226, 182, 96]], R = rng(11);
    const cards = pileClones(S, 5);
    cards.forEach((el, i) => {
      const n = cards.length, order = i / Math.max(1, n - 1);
      S.track(el, (t) => {
        const e = eIn(lin(550 + (1 - order) * 40, 1350, t)), a = e;
        const lift = -H * 1.0 * e, drift = Math.sin(t / 90 + i) * W * .06 * e;
        return { transform: `translate3d(${px(drift)}px,${px(lift)}px,${px(60 * e)}px) rotateZ(${px(1080 * e)}deg) scale(${px(Math.max(0.0001, 1 - e))})`, opacity: 1 - Math.max(0, a - .55) / .45, filter: `blur(${px(e * 2.5)}px) sepia(${px(e * .6)})` };
      });
    });
    // grains: arrive from the screen edges (0-550), orbit a funnel (550-1400), rise into a golden cloud (1400-1800)
    const N = 1500, g = [];
    for (let i = 0; i < N; i++) {
      const side = i % 2 ? 1 : -1, hh = R(), hy = cy + (R() - .5) * H * 3.2;
      g.push({ side, sy: hy, dly: R() * 140, th0: R() * TAU, wv: 5 + R() * 6, hgt: R(), rad: .4 + R() * .75, sz: .014 + R() * .03, col: SAND[i % 4], cl: R() < .22, drift: (R() - .5) * W * 1.6, lift: .7 + R() * 1.3, hh, curl: (R() - .5) * 2 });
    }
    return {
      topFade: [1.9, .8],
      draw(t) {
        // dusty mist sweeping in
        const mist = lin(0, 450, t) * (1 - lin(1300, 1800, t));
        back.globalCompositeOperation = 'source-over';
        for (let s = 0; s < 8; s++) { const side = s % 2 ? 1 : -1, p = eOut(lin(0, 520 + s * 15, t)), x0 = side < 0 ? -W : vw + W;
          put(back, puff([214, 168, 96], s % 3 + 1), lerp(x0, cx + side * -W * .2, p), cy + Math.sin(s * 2.1) * H * .6, H * (1.5 + (s % 3) * .35), (.34 - .18 * p) * mist * (s < 6 ? 1 : .8), t / 900 + s); }
        front.globalCompositeOperation = 'source-over';
        for (let i = 0; i < N; i++) {
          const q = g[i], tt = t - q.dly; if (tt < 0) continue;
          let X, Y, a = 1, size = q.sz * H * 1.55;
          if (t < 600) {                                  // phase 1: streak in from the edges, converging
            const p = eOut(lin(0, 520, tt)), x0 = q.side < 0 ? -20 : vw + 20, wob = Math.sin(tt / 70 + q.th0) * H * .12 * (1 - p);
            X = lerp(x0, cx + Math.cos(q.th0) * W * .9, p); Y = lerp(q.sy, cy + Math.sin(q.th0) * H * .25, p) + wob;
            const pp = eOut(lin(0, 520, tt - 22)), px2 = lerp(x0, cx + Math.cos(q.th0) * W * .9, pp);
            front.globalAlpha = .22; front.strokeStyle = rgba(q.col, .6); front.lineWidth = size * .7; front.beginPath(); front.moveTo(px2, lerp(q.sy, cy, pp)); front.lineTo(X, Y); front.stroke();
            a = Math.min(1, tt / 120);
          } else {
            const spin = (tt - 520) / 1000, up = sm(550, 1250, t), dis = lin(1400, 1800, t);
            const th = q.th0 + q.wv * spin * (1 + up * .6), h = (q.hgt * up) + dis * q.lift * .5;
            const funnel = (.12 + .88 * q.hgt * q.hgt) * q.rad * H * .9;
            const rx = funnel * (1 + dis * .9), ry = rx * .34;
            X = cx + Math.cos(th) * rx + q.drift * dis * .4; Y = cy - h * H * 1.45 + Math.sin(th) * ry - (up < 1 ? 0 : 0);
            // grains swept in from phase 1 settle into the funnel
            const settle = sm(520, 760, t); if (settle < 1) { const x1 = cx + Math.cos(q.th0) * W * .9, y1 = cy + Math.sin(q.th0) * H * .25; X = lerp(x1, X, settle); Y = lerp(y1, Y, settle); }
            a = (1 - dis) * (.6 + .4 * (Math.sin(th) > 0 ? 1 : .5)) * (.55 + .45 * q.hgt);
          }
          put(front, glow(q.col), X, Y, size * (q.cl ? 3.2 : 1.7), a * (q.cl ? .32 : .95));
        }
        // glowing golden core / dust cloud
        const core = sm(500, 900, t) * (1 - sm(1450, 1800, t));
        front.globalCompositeOperation = 'lighter'; put(front, glow([255, 190, 90]), cx, cy - H * .35 * sm(500, 1300, t), H * 2.2 * (.6 + .5 * sm(1350, 1800, t)), .16 * core + .5 * sm(1400, 1600, t) * (1 - sm(1600, 1800, t)));
        const cloud = sm(1380, 1560, t) * (1 - sm(1560, 1800, t));
        front.globalCompositeOperation = 'source-over'; for (let c = 0; c < 6; c++) put(front, puff([232, 188, 100], c % 3 + 1), cx + (c - 2.5) * W * .35, cy - H * (.4 + c * .04 + .3 * lin(1400, 1800, t)), H * 1.4, .38 * cloud, c);
      }
    };
  }

  // ====================== SEASON 2: Glacial Shatter ======================
  function glacier(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W } = S, R = rng(22);
    const face = topFace(S);
    const frost = document.createElement('div');
    // the rank stays visible under the ice: only a light blur + a cool tint, never an opaque cover
    frost.style.cssText = `position:absolute;inset:0;border-radius:${S.st.radius};background:linear-gradient(135deg,rgba(150,210,255,.5),rgba(235,248,255,.38) 45%,rgba(120,190,245,.5));backdrop-filter:blur(1.4px) saturate(1.5);-webkit-backdrop-filter:blur(1.4px) saturate(1.5);box-shadow:inset 0 0 ${px(W * .18)}px rgba(210,240,255,.95),0 0 ${px(W * .22)}px rgba(120,200,255,.7);opacity:1`;
    face.appendChild(frost);
    const ck = cracks(S, face, 'rgba(235,248,255,.97)', 'rgba(120,200,255,.95)', 33);
    const pieces = fragments(S, face, 4, 5, 77);
    pieces.forEach(p => { p.el.style.opacity = 0; });
    pieces.forEach(p => { const ice = document.createElement('i'); ice.style.cssText = 'position:absolute;inset:0;pointer-events:none;background:linear-gradient(135deg,rgba(190,235,255,.55),rgba(90,170,240,.35) 55%,rgba(235,250,255,.5));box-shadow:inset 0 0 6px rgba(255,255,255,.9)'; p.el.appendChild(ice); });
    flyPieces(S, pieces, 600, { speed: H * 2.1, grav: H * 5.2, drag: 1.1, up: .3, fadeFrom: 1500, fadeTo: 1780 });
    intactUntil(S, face, 600);
    S.track(frost, (t) => ({ opacity: sm(0, 520, t) }));
    // shiver while it freezes
    S.track(face, (t) => ({ opacity: t < 600 ? 1 : 0, transform: `translate(${px(Math.sin(t / 23) * W * .012 * sm(250, 600, t))}px,${px(Math.cos(t / 31) * W * .01 * sm(250, 600, t))}px)` }));
    const sparks = [], puffs = [], tri = [], spk = [];
    for (let i = 0; i < 38; i++) tri.push({ a: R() * TAU, sp: H * (1.1 + R() * 2.7), sz: H * (.07 + R() * .16), spin: (R() - .5) * 16, ph: R() * TAU, fl: 6 + R() * 10, g: H * (2 + R() * 2.2) });
    for (let i = 0; i < 16; i++) { const u = i / 16, per = u * 4, side = Math.floor(per), f = per - side, o = [[f * W - W / 2, -H / 2, -1.57], [W / 2, f * H - H / 2, 0], [W / 2 - f * W, H / 2, 1.57], [-W / 2, H / 2 - f * H, 3.14]][side % 4]; spk.push({ x: o[0], y: o[1], ang: o[2] + (R() - .5) * .5, len: H * (.14 + R() * .22), w: H * (.035 + R() * .03), at: 80 + R() * 260 }); }
    for (let i = 0; i < 96; i++) { const a = R() * TAU, sp = H * (.8 + R() * 2.4); sparks.push({ a, sp, sz: .035 + R() * .07, tw: R() * TAU, dr: R() * .5, c: R() < .5 ? [255, 255, 255] : [160, 220, 255], g: H * (.4 + R()) }); }
    for (let i = 0; i < 16; i++) { const a = R() * TAU; puffs.push({ a, sp: H * (.35 + R() * .9), sz: H * (.9 + R() * .9), seed: i % 3 + 1, rot: (R() - .5) * 1.2 }); }
    return {
      draw(t) {
        ck.set(lin(80, 560, t));
        // ice spikes grow out of the card edges while it freezes, then burst with it
        if (t < 620) { front.globalCompositeOperation = 'source-over'; spk.forEach(q => { const g = eOut(lin(q.at, q.at + 300, t)); if (g <= 0) return; front.save(); front.translate(cx + q.x, cy + q.y); front.rotate(q.ang + 1.57); const L = q.len * g;
          const gr = front.createLinearGradient(0, 0, 0, -L); gr.addColorStop(0, 'rgba(120,190,245,.85)'); gr.addColorStop(1, 'rgba(255,255,255,.95)'); front.globalAlpha = .95; front.fillStyle = gr; front.strokeStyle = 'rgba(255,255,255,.9)'; front.lineWidth = 1;
          front.beginPath(); front.moveTo(-q.w, 0); front.lineTo(0, -L); front.lineTo(q.w, 0); front.closePath(); front.fill(); front.stroke(); front.restore(); }); }
        // frost haze gathering over the card
        put(back, glow([150, 210, 255]), cx, cy, H * 1.5, .28 * sm(0, 520, t) * (1 - sm(600, 900, t)));
        if (t > 590) {
          const s = (t - 600) / 1000, fade = 1 - sm(1300, 1800, t);
          back.globalCompositeOperation = 'source-over';
          puffs.forEach(p => { const k = (1 - Math.exp(-1.8 * s)) / 1.8; put(back, puff([205, 232, 255], p.seed), cx + Math.cos(p.a) * p.sp * k, cy + Math.sin(p.a) * p.sp * k * .85 - s * H * .25, p.sz * (.45 + .8 * eOut(s * 1.4)), .06 * fade * (1 - lin(.2, 1.2, s) * .4), p.rot * s); });
          front.globalCompositeOperation = 'lighter';
          sparks.forEach(q => { const k = (1 - Math.exp(-2.2 * s)) / 2.2, X = cx + Math.cos(q.a) * q.sp * k, Y = cy + Math.sin(q.a) * q.sp * k + .5 * q.g * s * s - s * H * .1; const tw = .55 + .45 * Math.sin(t / 55 + q.tw); put(front, glint(q.c), X, Y, q.sz * H * 1.4 * (.7 + .5 * tw), fade * tw, t / 700 + q.tw); });
          // glassy shards: bright facets that tumble (flat-on bright, edge-on thin)
          front.globalCompositeOperation = 'source-over';
          tri.forEach(q => { const k = (1 - Math.exp(-1.6 * s)) / 1.6, X = cx + Math.cos(q.a) * q.sp * k, Y = cy + Math.sin(q.a) * q.sp * k + .5 * q.g * s * s - H * .2 * s, fl = Math.cos(s * q.fl + q.ph);
            front.save(); front.translate(X, Y); front.rotate(q.ph + q.spin * s); front.scale(1, Math.max(.12, Math.abs(fl)));
            const gr = front.createLinearGradient(-q.sz, -q.sz, q.sz, q.sz); gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(.55, 'rgba(165,215,255,.8)'); gr.addColorStop(1, 'rgba(70,150,230,.75)');
            front.globalAlpha = fade * (.55 + .45 * Math.abs(fl)); front.fillStyle = gr; front.strokeStyle = 'rgba(255,255,255,.95)'; front.lineWidth = 1.2;
            front.beginPath(); front.moveTo(0, -q.sz); front.lineTo(q.sz * .75, q.sz * .6); front.lineTo(-q.sz * .85, q.sz * .5); front.closePath(); front.fill(); front.stroke(); front.restore(); });
          front.globalCompositeOperation = 'lighter';
          // the impact flash
          put(front, glow([220, 242, 255]), cx, cy, H * 2.2 * (1 - lin(0, 180, t - 600)), (1 - lin(0, 180, t - 600)) * .5);
        }
      }
    };
  }

  // ====================== SEASON 3: Shuriken Barrage ======================
  function shurikenBarrage(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W, vw, vh } = S, R = rng(44);
    const face = topFace(S);
    const pieces = fragments(S, face, 4, 5, 91);
    pieces.forEach(p => { p.el.style.opacity = 0; });
    // five stars: each flies in, drives into the card and tears through it; the pieces nearest it are ripped off along its path
    const stars = [];
    for (let i = 0; i < 5; i++) {
      const a = -2.5 + i * 1.25 + (R() - .5) * .3, from = [(i % 2 ? vw + 80 : -80), cy - H * (1.2 + R() * 1.4)], to = [cx + Math.cos(a) * W * .3, cy + Math.sin(a) * H * .26], dx = to[0] - from[0], dy = to[1] - from[1], d = Math.hypot(dx, dy);
      stars.push({ t0: i * 55, from, to, dir: [dx / d, dy / d], rot0: R() * TAU, spin: (i % 2 ? -1 : 1) * (11 + R() * 5) });
    }
    const IMP = (s) => s.t0 + 430, SL = IMP(stars[0]);
    pieces.forEach(p => {
      let bi = 0, bd = 1e9; stars.forEach((s, i) => { const d = Math.hypot(p.mx - (s.to[0] - cx), p.my - (s.to[1] - cy)); if (d < bd) { bd = d; bi = i; } });
      const st = stars[bi], T = IMP(st) + bd * .35 + p.R() * 40, q1 = p.R(), q2 = p.R(), q3 = p.R(), q4 = p.R(), sp = W * (2.2 + q1 * 1.6);
      S.track(p.el, (t) => {
        const s = Math.max(0, t - T) / 1000, k = (1 - Math.exp(-3.2 * s)) / 3.2, go = eIn(lin(1150, 1700, t)), r = t < T ? 0 : 1;
        const X = st.dir[0] * sp * k + (q2 - .5) * W * .9 * k + (q3 - .5) * go * W * .6, Y = st.dir[1] * sp * k + (q4 - .5) * H * .5 * k + 120 * s * s * (H / 100) - go * H * .35;
        const rot = r * (q1 < .5 ? -1 : 1) * (200 + q2 * 520) * Math.min(1, s * 1.6) * (1 + s);
        return { transform: `translate3d(${px(X)}px,${px(Y)}px,${px(r * (40 + q3 * 80) * Math.min(1, s * 5))}px) rotate3d(${px(q3 - .3)},${px(q4 - .3)},${px(.4 + q1)},${px(rot)}deg) scale(${px(1 - go * .5)})`, opacity: t < IMP(stars[0]) ? 0 : 1 - sm(1250, 1600, t), filter: `brightness(${px(1.5 + (t >= T ? Math.max(0, 1 - s * 4) * 1.4 : 0))}) contrast(1.1)` };
      });
    });
    intactUntil(S, face, SL);
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;inset:0;background:radial-gradient(circle at ${px(cx)}px ${px(cy)}px,rgba(255,255,255,.5),rgba(255,200,215,.14) 38%,transparent 62%);opacity:0;mix-blend-mode:screen`;
    S.layer.appendChild(flash); S.track(flash, (t) => ({ opacity: t < SL ? 0 : Math.max(0, 1 - lin(SL, SL + 260, t)) * 1 }));
    const SLASHES = [0, 2, 4].map((i, k) => ({ a: Math.atan2(stars[i].dir[1], stars[i].dir[0]), bend: [.14, -.12, .18][k], t0: IMP(stars[i]) - 20 })), SPARKS = [];
    for (let i = 0; i < 80; i++) SPARKS.push({ c: i % 3, u: .12 + R() * .76, d: R() * TAU, v: H * (.35 + R() * 1.1), life: 260 + R() * 330, hot: R() < .4 });
    const petals = [], mist = [];
    for (let i = 0; i < 200; i++) petals.push({ a: R() * TAU, r: R(), sp: 4 + R() * 3, sz: .09 + R() * .1, flip: R() * TAU, fs: 6 + R() * 8, c: R() < .5 ? 0 : 1, rise: .4 + R(), delay: R() * 140, rot: R() * TAU });
    for (let i = 0; i < 12; i++) mist.push({ a: R() * TAU, r: R(), seed: i % 3 + 1 });
    const PC = [[[255, 183, 206], [255, 140, 177]], [[255, 214, 226], [244, 114, 160]]];
    return {
      draw(t) {
        // stars: scale 3 -> 0.5 with motion-blur ghosts, landing at 450-500ms; they sit, then drop away
        stars.forEach(s => {
          const p = eIn(lin(s.t0, s.t0 + 430, t));
          if (t < s.t0) return;
          const out = 1 - lin(1000, 1250, t);
          const pos = (pp) => [lerp(s.from[0], s.to[0], pp), lerp(s.from[1], s.to[1], pp)], size = (pp) => H * .8 * lerp(3, .5, pp);
          for (let g = 6; g >= 0; g--) { const pp = Math.max(0, p - g * .035), [gx, gy] = pos(pp); put(front, shuriken(), gx, gy, size(pp), (g ? .17 * (1 - g / 7) : 1) * out, s.rot0 + s.spin * pp * 3, 1); }
          if (p >= 1) {
            const dr = (u) => eOut(lin(IMP(s), IMP(s) + 240, u)), D = W * .85;
            for (let g = 5; g >= 0; g--) { const dd = dr(t - g * 14); put(front, shuriken(), s.to[0] + s.dir[0] * D * dd, s.to[1] + s.dir[1] * D * dd, size(1), (g ? .2 * (1 - g / 6) : 1) * out, s.rot0 + s.spin * (3 + (t - IMP(s)) / 90), 1); }
          }
          const hit = lin(s.t0 + 400, s.t0 + 700, t); if (hit > 0 && hit < 1) { front.globalCompositeOperation = 'lighter'; put(front, glint([255, 255, 255]), pos(1)[0], pos(1)[1], H * .8 * (1 - hit), 1 - hit, 0); front.globalCompositeOperation = 'source-over'; }
        });
        front.globalCompositeOperation = 'lighter';
        // three katana cuts: tapered curved blades of light sweep across the card, crimson only at the edge
        const len = Math.hypot(W, H) * 1.45, Wd = W * .05;
        SLASHES.forEach(c => {
          const head = eOut(lin(c.t0, c.t0 + 120, t)), tail = eIn(lin(c.t0 + 70, c.t0 + 360, t));
          if (head <= 0 || tail >= 1) return;
          const ux = Math.cos(c.a), uy = Math.sin(c.a), nx = -uy, ny = ux, bx = nx * c.bend * len, by = ny * c.bend * len;
          const pt = (u) => { const k = 1 - u; return [cx + ux * len * (u - .5) * 2 * .5 + bx * 4 * u * k, cy + uy * len * (u - .5) * 2 * .5 + by * 4 * u * k]; };
          const u0 = Math.min(tail, head), u1 = head, N = 22, top = [], bot = [];
          for (let i = 0; i <= N; i++) {
            const u = lerp(u0, u1, i / N), q = pt(u), q2 = pt(Math.min(1, u + .01)), dx = q2[0] - q[0], dy = q2[1] - q[1], d = Math.hypot(dx, dy) || 1;
            const w = Math.sin(Math.PI * i / N) ** .8 * Wd * (1 - .5 * tail), ox = -dy / d * w, oy = dx / d * w;
            top.push([q[0] + ox, q[1] + oy]); bot.push([q[0] - ox, q[1] - oy]);
          }
          const fill = (grow, col, al) => { front.globalAlpha = al; front.fillStyle = col; front.beginPath(); top.forEach((p, i) => { const m = pt(lerp(u0, u1, i / N)); i ? front.lineTo(m[0] + (p[0] - m[0]) * grow, m[1] + (p[1] - m[1]) * grow) : front.moveTo(m[0] + (p[0] - m[0]) * grow, m[1] + (p[1] - m[1]) * grow); }); for (let i = N; i >= 0; i--) { const m = pt(lerp(u0, u1, i / N)), p = bot[i]; front.lineTo(m[0] + (p[0] - m[0]) * grow, m[1] + (p[1] - m[1]) * grow); } front.closePath(); front.fill(); };
          fill(2.4, 'rgba(210,30,60,1)', .32); fill(1.5, 'rgba(255,120,140,1)', .5); fill(.8, '#fff', 1);
        });
        // metal sparks thrown off the cuts
        SPARKS.forEach(k => {
          const c = SLASHES[k.c], s = t - (c.t0 + 120 * k.u); if (s < 0 || s > k.life) return;
          const ux = Math.cos(c.a), uy = Math.sin(c.a), nx = -uy, ny = ux, bx = nx * c.bend * len, by = ny * c.bend * len, u = k.u, kk = 1 - u;
          const X0 = cx + ux * len * (u - .5) + bx * 4 * u * kk, Y0 = cy + uy * len * (u - .5) + by * 4 * u * kk, p = s / 1000, e = 1 - Math.exp(-4 * p);
          const X = X0 + Math.cos(k.d) * k.v * e, Y = Y0 + Math.sin(k.d) * k.v * e + .5 * H * 2.2 * p * p, e2 = 1 - Math.exp(-4 * Math.max(0, p - .018));
          const X2 = X0 + Math.cos(k.d) * k.v * e2, Y2 = Y0 + Math.sin(k.d) * k.v * e2 + .5 * H * 2.2 * Math.max(0, p - .018) ** 2, a = 1 - s / k.life;
          front.globalAlpha = a; front.strokeStyle = k.hot ? '#fff' : 'rgba(255,170,90,1)'; front.lineWidth = Math.max(1, H * .012); front.lineCap = 'round'; front.beginPath(); front.moveTo(X2, Y2); front.lineTo(X, Y); front.stroke();
        });
        const hit = lin(SL - 30, SL + 40, t) * (1 - lin(SL + 40, SL + 260, t));
        if (hit > 0) put(front, glow([255, 235, 240]), cx, cy, H * 1.5, .6 * hit);
        // sakura cloud
        const s0 = 1000;
        if (t > s0) {
          front.globalCompositeOperation = 'source-over';
          const fade = 1 - sm(1560, 1800, t), seed = 6;
          mist.forEach(m => { const s = (t - s0 - 20) / 1000, d = (1 - Math.exp(-1.6 * s)) / 1.6; put(back, puff([255, 190, 214], m.seed), cx + Math.cos(m.a) * m.r * H * 1.6 * d * 1.6, cy + Math.sin(m.a) * m.r * H * .9 * d * 1.6 - s * H * .35, H * 1.5, .17 * fade * Math.min(1, s * 5), m.a); });
          petals.forEach(p => {
            const s = (t - s0 - p.delay) / 1000; if (s < 0) return;
            const th = p.a + s * 3.2 * (1 + p.r), rr = (1 - Math.exp(-p.sp * s * .42)) * H * (.5 + p.r * 1.9);
            const X = cx + Math.cos(th) * rr * 1.25, Y = cy + Math.sin(th) * rr * .62 - s * H * p.rise * .55 + s * s * H * .25;
            const flip = Math.cos(p.flip + s * p.fs);
            put(front, petal(...PC[p.c]), X, Y, p.sz * H * 1.5, Math.min(1, s * 7) * fade, p.rot + s * 3 + th * .3, flip);
          });
        }
      }
    };
  }

  // ====================== SEASON 4: Abyssal Whirlpool ======================
  function whirlpool(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W } = S, R = rng(55);
    const cards = pileClones(S, 5);
    cards.forEach((el, i) => {
      S.track(el, (t) => {
        const e = eIO(lin(60 + i * 70, 1100, t)), rz = 1440 * e, tilt = 62 * e;
        return { transform: `translate3d(${px(Math.sin(e * 9 + i) * W * .12 * e)}px,${px(H * .14 * e)}px,${px(-80 * e)}px) rotateX(${px(tilt)}deg) rotateZ(${px(rz)}deg) skewX(${px(Math.sin(e * 14) * 14 * e)}deg) scale(${px(Math.max(.0001, 1 - e))})`, opacity: 1 - Math.max(0, e - .7) / .3, filter: `brightness(${px(1 - e * .82)}) saturate(${px(1 + e * .8)}) hue-rotate(${px(e * 50)}deg)` };
      });
    });
    const bub = [], micro = [];
    for (let i = 0; i < 78; i++) { const a = R() * TAU, r = Math.sqrt(R()) * W * 1.5; bub.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * .45, sz: .04 + R() * .1, rise: H * (.3 + R() * .6), life: 420 + R() * 520, t0: 1100 + R() * 220, ph: R() * TAU, wb: W * (.06 + R() * .14) }); }
    for (let i = 0; i < 130; i++) micro.push({ x: (R() - .5) * W * 3, y: (R() - .5) * H * 1.4, sz: .012 + R() * .022, rise: H * (.2 + R() * .5), t0: 1250 + R() * 350, ph: R() * TAU });
    const TEAL = [30, 210, 200], NAVY = [8, 28, 70], DEEP = [4, 12, 34];
    return {
      topFade: [1.25, .55],
      draw(t) {
        const open = eOut(lin(0, 260, t)), snap = 1 - eIn(lin(1100, 1230, t)), size = open * snap, Rw = H * 1.45 * size;
        if (size > 0.01) {
          // layered whirlpool: dark hole, navy body, teal glowing spiral arms
          const spin = t / 1000, ry = .46;
          back.save(); back.translate(cx, cy + H * .1); back.scale(1, ry);
          let gr = back.createRadialGradient(0, 0, 0, 0, 0, Rw); gr.addColorStop(0, rgba(DEEP, 1)); gr.addColorStop(.35, rgba(NAVY, .95)); gr.addColorStop(.75, rgba([12, 80, 110], .7)); gr.addColorStop(1, rgba(TEAL, 0));
          back.globalAlpha = .96; back.fillStyle = gr; back.beginPath(); back.arc(0, 0, Rw, 0, TAU); back.fill();
          back.globalCompositeOperation = 'lighter'; back.lineCap = 'round';
          for (let layer = 0; layer < 4; layer++) {
            const arms = 3 + (layer % 2), dirn = layer % 2 ? -1 : 1, base = spin * (3.2 + layer * 1.2) * dirn, rr = Rw * (1 - layer * .16);
            for (let a = 0; a < arms; a++) {
              back.beginPath();
              for (let s = 0; s <= 36; s++) { const q = s / 36, ang = base + a / arms * TAU + q * 4.4 * dirn, r = rr * (.12 + .88 * q); const X = Math.cos(ang) * r, Y = Math.sin(ang) * r; s ? back.lineTo(X, Y) : back.moveTo(X, Y); }
              back.strokeStyle = rgba(layer % 2 ? [120, 255, 235] : TEAL, .42 - layer * .06); back.lineWidth = Rw * (.075 - layer * .01); back.stroke();
              back.strokeStyle = 'rgba(200,255,250,.55)'; back.lineWidth = Rw * .012; back.stroke();
            }
          }
          back.restore();
          put(back, glow(TEAL), cx, cy + H * .1, Rw * 2.3, .45 * size);
          back.globalCompositeOperation = 'source-over';
          // rim foam sparkles riding the whirl
          for (let i = 0; i < 40; i++) { const ang = spin * 4 + i * 0.7, rr = Rw * (.35 + (i * 37 % 60) / 100); put(back, glow([190, 255, 245]), cx + Math.cos(ang) * rr, cy + H * .1 + Math.sin(ang) * rr * ry, H * .07, .7 * size); }
        }
        // the snap: a ring + flash
        const sn = lin(1100, 1330, t); if (sn > 0 && sn < 1) { front.globalCompositeOperation = 'lighter'; front.strokeStyle = rgba([170, 255, 245], 1 - sn); front.lineWidth = H * .06 * (1 - sn); front.beginPath(); front.ellipse(cx, cy + H * .1, H * (.3 + 1.6 * sn), H * (.3 + 1.6 * sn) * .46, 0, 0, TAU); front.stroke(); put(front, glow([200, 255, 250]), cx, cy, H * 2.4 * (1 - sn), .8 * (1 - sn)); }
        // bubbles: rise, wobble, pop
        front.globalCompositeOperation = 'lighter';
        bub.forEach(b => {
          const s = t - b.t0; if (s < 0 || s > b.life + 90) return;
          const p = s / b.life, X = cx + b.x + Math.sin(p * 7 + b.ph) * b.wb, Y = cy + b.y - b.rise * eOut(p) * .85, r = b.sz * H * (.5 + .5 * Math.min(1, p * 5));
          if (s > b.life) { const q = (s - b.life) / 90; front.strokeStyle = rgba([210, 255, 250], (1 - q) * .8); front.lineWidth = 1.6; front.beginPath(); front.arc(X, Y, r * (1 + q * .9), 0, TAU); front.stroke(); return; }
          front.globalAlpha = .75 * Math.min(1, p * 8) * (1 - p * .2); front.strokeStyle = 'rgba(190,250,255,.9)'; front.lineWidth = Math.max(1, r * .12); front.beginPath(); front.arc(X, Y, r, 0, TAU); front.stroke();
          const g = front.createRadialGradient(X - r * .35, Y - r * .4, 0, X, Y, r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.5, 'rgba(120,230,230,.1)'); g.addColorStop(1, 'rgba(40,170,200,.2)');
          front.globalAlpha = .9; front.fillStyle = g; front.beginPath(); front.arc(X, Y, r, 0, TAU); front.fill();
          front.globalAlpha = .95; front.fillStyle = '#fff'; front.beginPath(); front.arc(X - r * .38, Y - r * .4, Math.max(1, r * .16), 0, TAU); front.fill();
        });
        // current trails + micro-bubbles fading back into the deep
        const tail = 1 - lin(1500, 1800, t);
        if (t > 1100) {
          micro.forEach(m => { const s = (t - m.t0) / 1000; if (s < 0) return; put(front, glow([160, 245, 240]), cx + m.x + Math.sin(s * 8 + m.ph) * W * .05, cy + m.y - m.rise * s, m.sz * H * 2, .6 * tail * Math.min(1, s * 6)); });
          for (let a = 0; a < 3; a++) { front.strokeStyle = rgba(TEAL, .22 * tail); front.lineWidth = H * .03; front.beginPath(); for (let s = 0; s <= 20; s++) { const q = s / 20, ang = a * 2.1 + q * 3 + t / 500, r = H * (.2 + q * 1.1); const X = cx + Math.cos(ang) * r, Y = cy + H * .1 + Math.sin(ang) * r * .46 - q * H * .4; s ? front.lineTo(X, Y) : front.moveTo(X, Y); } front.stroke(); }
        }
      }
    };
  }

  // ====================== SEASON 5: Zeus's Bolt & Stone Shatter ======================
  function lightningPath(R, x0, y0, x1, y1, rough, out = []) {
    const mid = (a, b, d, ro) => { if (d === 0) { out.push([b[0], b[1]]); return; } const m = [(a[0] + b[0]) / 2 + (R() - .5) * ro, (a[1] + b[1]) / 2 + (R() - .5) * ro * .5]; mid(a, m, d - 1, ro / 2); mid(m, b, d - 1, ro / 2); };
    out.push([x0, y0]); mid([x0, y0], [x1, y1], 6, rough); return out;
  }
  function zeus(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W, vw, vh } = S, R = rng(66);
    const face = topFace(S);
    face.style.filter = 'invert(.9) grayscale(.85) sepia(.4) contrast(1.08) brightness(.97)';           // marble relief: rank + suit stay readable
    const vein = document.createElement('div'); vein.style.cssText = `position:absolute;inset:0;border-radius:${S.st.radius};background:${MARBLE} center/cover,linear-gradient(120deg,rgba(255,250,235,.35),rgba(120,116,108,.3));mix-blend-mode:multiply;opacity:.95`;
    face.appendChild(vein);
    const edge = document.createElement('div'); edge.style.cssText = `position:absolute;inset:0;border-radius:${S.st.radius};box-shadow:inset 0 0 ${px(W * .14)}px rgba(40,36,30,.7),inset 2px 2px 3px rgba(255,255,255,.55)`; face.appendChild(edge);
    const ck = cracks(S, face, 'rgba(255,214,90,.98)', 'rgba(255,190,40,1)', 71);
    const pieces = fragments(S, face, 4, 6, 123);
    pieces.forEach(p => { p.el.style.opacity = 0; });
    const SH = 700;
    flyPieces(S, pieces, SH, { speed: H * 3.0, grav: H * 6.4, drag: 1.0, up: .5, fadeFrom: 1560, fadeTo: 1790 });
    S.track(face, (t) => { const r = sm(0, 650, t) * (1 - lin(SH - 20, SH, t)); return { opacity: t < SH ? 1 : 0, transform: `translate(${px(Math.sin(t / 17) * W * .02 * r)}px,${px(Math.cos(t / 13) * W * .016 * r)}px) rotate(${px(Math.sin(t / 29) * 1.4 * r)}deg)` }; });
    const flash = document.createElement('div'); flash.style.cssText = 'position:absolute;inset:0;background:radial-gradient(circle at 50% 8%,#fff,rgba(255,236,160,.85) 40%,rgba(255,220,120,.35));opacity:0';
    S.layer.appendChild(flash); S.track(flash, (t) => ({ opacity: t < 660 ? 0 : t < 700 ? .5 : Math.max(0, .42 * (1 - lin(700, 920, t))) }));
    const smoke = [], dust = [], arcs = [];
    for (let i = 0; i < 18; i++) smoke.push({ x: (R() - .5) * W * 1.1, y: (R() - .5) * H * .5, sz: H * (.8 + R() * .9), v: H * (.5 + R() * .9), seed: i % 3 + 1, dl: R() * 200, dx: (R() - .5) * W });
    for (let i = 0; i < 110; i++) dust.push({ a: R() * TAU, sp: H * (.5 + R() * 2), sz: .012 + R() * .03, g: H * (1 + R() * 1.4) });
    for (let i = 0; i < 16; i++) arcs.push({ a: R() * TAU, r: .25 + R() * .75, t0: 680 + R() * 540, seed: i * 17 + 3 });
    return {
      draw(t) {
        ck.set(lin(120, 640, t));
        // ominous rumble haze
        put(back, glow([255, 210, 90]), cx, cy, H * 1.7, .3 * sm(200, 650, t) * (1 - sm(700, 900, t)) * (.7 + .3 * Math.sin(t / 40)));
        // the bolt (re-jagged every 40ms, each frame deterministic)
        if (t >= 650 && t < 1050) {
          const fr = Math.floor(t / 40), Rb = rng(fr * 9973 + 5), inten = t < 800 ? 1 : (fr % 2 ? .55 : .85) * (1 - lin(800, 1050, t));
          const path = lightningPath(Rb, cx + (Rb() - .5) * W * .5, -20, cx, cy - H * .1, H * .9);
          front.globalCompositeOperation = 'lighter'; front.lineCap = 'round'; front.lineJoin = 'round';
          const stroke = (lw, col, a) => { front.globalAlpha = a * inten; front.strokeStyle = col; front.lineWidth = lw; front.beginPath(); path.forEach((p, i) => i ? front.lineTo(p[0], p[1]) : front.moveTo(p[0], p[1])); front.stroke(); };
          stroke(H * .28, 'rgba(255,190,60,.22)', 1); stroke(H * .12, 'rgba(255,210,90,.6)', 1); stroke(H * .045, 'rgba(255,245,200,1)', 1); stroke(H * .016, '#fff', 1);
          for (let b = 0; b < 3; b++) { const i0 = 8 + Math.floor(Rb() * (path.length - 16)), pt = path[i0], br = lightningPath(Rb, pt[0], pt[1], pt[0] + (Rb() - .5) * W * 2.2, pt[1] + H * (.4 + Rb() * .7), H * .5); front.globalAlpha = .8 * inten; front.strokeStyle = 'rgba(255,225,130,1)'; front.lineWidth = H * .02; front.beginPath(); br.forEach((p, i) => i ? front.lineTo(p[0], p[1]) : front.moveTo(p[0], p[1])); front.stroke(); }
          put(front, glow([255, 230, 150]), cx, cy, H * 3.4, inten);
        }
        // crackling gold electric arcs around the debris
        front.globalCompositeOperation = 'lighter';
        arcs.forEach(a => {
          const s = t - a.t0; if (s < 0 || s > 520) return;
          const fr = Math.floor(t / 45), Ra = rng(a.seed + fr * 13), cxp = cx + Math.cos(a.a) * a.r * H * 1.1, cyp = cy + Math.sin(a.a) * a.r * H * .8;
          const path = lightningPath(Ra, cxp, cyp, cxp + (Ra() - .5) * H * .8, cyp + (Ra() - .5) * H * .8, H * .22).slice(0, 40);
          front.globalAlpha = .9 * (1 - s / 520); front.strokeStyle = 'rgba(255,215,100,1)'; front.lineWidth = Math.max(1.2, H * .014); front.beginPath(); path.forEach((p, i) => i ? front.lineTo(p[0], p[1]) : front.moveTo(p[0], p[1])); front.stroke();
          front.globalAlpha *= .5; front.strokeStyle = '#fff'; front.lineWidth = Math.max(.8, H * .005); front.stroke();
        });
        if (t >= SH) {
          const s = (t - SH) / 1000, fade = 1 - sm(1350, 1800, t);
          front.globalCompositeOperation = 'source-over';
          dust.forEach(d => { const k = (1 - Math.exp(-1.5 * s)) / 1.5; put(front, glow([225, 205, 170]), cx + Math.cos(d.a) * d.sp * k, cy + Math.sin(d.a) * d.sp * k * .8 + .5 * d.g * s * s, d.sz * H * 2, .6 * fade); });
          smoke.forEach(m => { const q = s - m.dl / 1000; if (q < 0) return; put(back, puff([90, 86, 84], m.seed), cx + m.x + m.dx * q * .5, cy + m.y - m.v * q * .8, m.sz * (.6 + q * .9), .42 * fade * Math.min(1, q * 4), q * .6); });
          const imp = 1 - lin(0, 220, t - SH); put(front, glow([255, 240, 190]), cx, cy, H * 2.8 * imp, imp);
        }
      }
    };
  }

  // ====================== SEASON 6: Arcane Hex & Void Dissolve ======================
  const GLYPHS = [
    (g, r) => { g.moveTo(0, -r); g.lineTo(r * .87, r * .5); g.lineTo(-r * .87, r * .5); g.closePath(); g.moveTo(-r * .5, r * .05); g.lineTo(r * .5, r * .05); },
    (g, r) => { g.moveTo(r, 0); g.arc(0, 0, r, 0, TAU); g.moveTo(r * .2, 0); g.arc(0, 0, r * .2, 0, TAU); },
    (g, r) => { g.arc(0, 0, r, -2.2, 2.2); g.moveTo(r * .55, -r * .72); g.arc(r * .35, 0, r * .85, -1.9, 1.9, true); },
    (g, r) => { g.moveTo(0, -r); g.lineTo(0, r); g.moveTo(-r * .7, -r * .3); g.lineTo(r * .7, -r * .3); g.moveTo(r * .35, r * .6); g.arc(0, r * .6, r * .35, 0, TAU); },
    (g, r) => { g.moveTo(-r, r * .6); g.lineTo(-r * .4, -r * .6); g.lineTo(r * .1, r * .6); g.lineTo(r * .7, -r * .6); g.lineTo(r, r * .2); },
    (g, r) => { g.moveTo(0, -r); g.lineTo(r * .7, 0); g.lineTo(0, r); g.lineTo(-r * .7, 0); g.closePath(); g.moveTo(0, -r * .5); g.lineTo(0, r * .5); }
  ];
  function glyphAt(g, i, x, y, r, rot, col, lw, a, sx = 1) {
    g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); GLYPHS[i % GLYPHS.length](g, r); g.stroke(); g.restore();
  }
  function runeCircle(g, x, y, Rr, rot, a, pulse) {
    const VIO = '#b36bff', EME = '#3dffb0', PUR = '#7a2cff';
    g.save(); g.translate(x, y); g.globalCompositeOperation = 'lighter';
    const ring = (r, col, lw, al) => { g.globalAlpha = al * a; g.strokeStyle = col; g.lineWidth = lw; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); };
    ring(Rr, PUR, Rr * .06, .35); ring(Rr, VIO, Rr * .014, 1); ring(Rr * .93, VIO, Rr * .008, .9); ring(Rr * .62, EME, Rr * .012, .85); ring(Rr * .56, PUR, Rr * .03, .35);
    g.rotate(rot);
    for (let i = 0; i < 72; i++) { const an = i / 72 * TAU, l = i % 6 ? .025 : .06; g.globalAlpha = .8 * a; g.strokeStyle = VIO; g.lineWidth = 1.4; g.beginPath(); g.moveTo(Math.cos(an) * Rr * .95, Math.sin(an) * Rr * .95); g.lineTo(Math.cos(an) * Rr * (.95 - l), Math.sin(an) * Rr * (.95 - l)); g.stroke(); }
    for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; glyphAt(g, i, Math.cos(an) * Rr * .78, Math.sin(an) * Rr * .78, Rr * .07, an + Math.PI / 2, i % 2 ? EME : VIO, Math.max(1.2, Rr * .012), .95 * a); }
    g.rotate(-rot * 2.2);
    g.globalAlpha = a; g.strokeStyle = EME; g.lineWidth = Math.max(1.4, Rr * .014); g.beginPath();
    for (let i = 0; i <= 5; i++) { const an = i * 2 / 5 * TAU - Math.PI / 2, X = Math.cos(an) * Rr * .6, Y = Math.sin(an) * Rr * .6; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke();
    g.globalAlpha = .5 * a; g.strokeStyle = VIO; g.beginPath(); for (let i = 0; i <= 3; i++) { const an = i / 3 * TAU - Math.PI / 2, X = Math.cos(an) * Rr * .5, Y = Math.sin(an) * Rr * .5; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.stroke();
    g.beginPath(); for (let i = 0; i <= 3; i++) { const an = i / 3 * TAU + Math.PI / 2, X = Math.cos(an) * Rr * .5, Y = Math.sin(an) * Rr * .5; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.closePath(); g.stroke();
    g.rotate(rot * 1.2);
    for (let i = 0; i < 5; i++) { const an = i / 5 * TAU - Math.PI / 2; glyphAt(g, i + 2, Math.cos(an) * Rr * .38, Math.sin(an) * Rr * .38, Rr * .055, an, VIO, Math.max(1.1, Rr * .01), .9 * a); }
    g.restore();
    put(g, glow([160, 80, 255]), x, y, Rr * 2.2, (.3 + .25 * pulse) * a);
  }
  function hex(S) {
    const back = S.mkCanvas(), front = S.mkCanvas(), { cx, cy, H, W } = S, R = rng(88);
    const face = topFace(S), cols = 8, rows = 12, cw = W / cols, ch = H / rows;
    const rad = S.st.radius;
    const dark = document.createElement('div'); dark.style.cssText = `position:absolute;inset:0;border-radius:${rad};background:radial-gradient(circle at 50% 50%,rgba(90,20,160,.55),rgba(10,0,30,.75));mix-blend-mode:multiply;opacity:0`;
    face.appendChild(dark); S.track(dark, (t) => ({ opacity: sm(0, 600, t) }));
    S.track(face, (t) => { const c = sm(0, 620, t); return { filter: `brightness(${px(1 - .55 * c)}) saturate(${px(1 + .6 * c)}) hue-rotate(${px(-30 * c)}deg)` }; });
    // pixel dissolve: each cell leaves at its own time, nearest the centre first, edge cells glow as they burn
    const cells = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const dx = (i + .5) / cols - .5, dy = (j + .5) / rows - .5; cells.push({ i, j, key: Math.min(1, Math.hypot(dx * 1.3, dy) * 1.5 + R() * .55) / 1.55 }); }
    cells.forEach(c => { c.t = 760 + c.key * 600; });
    let last = '';
    const rune = [], chains = [], embers = [];
    for (let i = 0; i < 46; i++) { const a = R() * TAU; rune.push({ a, sp: H * (1 + R() * 2.4), g: i % 6, t0: 680 + R() * 280, fs: 5 + R() * 7, ph: R() * TAU, z: R(), c: R() < .5 ? '#c58bff' : '#4dffb8' }); }
    for (let i = 0; i < 7; i++) chains.push({ a: i / 7 * TAU + R() * .5, len: H * (1.2 + R() * .9), bend: (R() - .5) * 1.4, t0: 680 + R() * 160 });
    for (let i = 0; i < 150; i++) embers.push({ a: R() * TAU, r: R(), v: H * (.5 + R() * 1.4), sz: .014 + R() * .03, t0: 100 + R() * 1200, col: R() < .5 ? [190, 110, 255] : R() < .5 ? [70, 255, 175] : [255, 150, 60], dx: (R() - .5) * W * 1.4 });
    const vent = [];
    for (let i = 0; i < 40; i++) vent.push({ x: (R() - .5) * W, t0: R() * 600, v: H * (.7 + R()), sz: .02 + R() * .03, col: R() < .5 ? [190, 110, 255] : [70, 255, 175], sm: R() < .35 });
    return {
      draw(t) {
        const collapse = 1 - eIn(lin(1400, 1760, t)), form = eOut(lin(0, 600, t)), flashN = 1 - lin(650, 850, t);
        const RR = H * (.3 + .33 * form + .22 * lin(650, 800, t)) * collapse;
        // void vortex under the card
        if (t >= 640 && t < 1800) {
          const o = eOut(lin(640, 900, t)) * (1 - lin(1400, 1760, t)), spin = t / 1000;
          back.save(); back.translate(cx, cy); back.scale(1, .8);
          const rv = H * 1.35 * o, gr = back.createRadialGradient(0, 0, 0, 0, 0, rv); gr.addColorStop(0, 'rgba(0,0,0,.95)'); gr.addColorStop(.55, 'rgba(26,4,60,.8)'); gr.addColorStop(1, 'rgba(90,30,170,0)');
          back.fillStyle = gr; back.beginPath(); back.arc(0, 0, rv, 0, TAU); back.fill(); back.globalCompositeOperation = 'lighter'; back.lineCap = 'round';
          for (let a = 0; a < 5; a++) { back.beginPath(); for (let s = 0; s <= 30; s++) { const q = s / 30, ang = spin * 6 + a / 5 * TAU + q * 3.6, r = rv * (.1 + .9 * q); const X = Math.cos(ang) * r, Y = Math.sin(ang) * r; s ? back.lineTo(X, Y) : back.moveTo(X, Y); } back.strokeStyle = a % 2 ? 'rgba(77,255,184,.4)' : 'rgba(160,90,255,.5)'; back.lineWidth = rv * .05; back.stroke(); }
          back.restore();
        }
        // rune circle on the card (spawns, pulses, flashes, then collapses inward)
        const a = Math.min(1, form * 1.4) * (1 - lin(1640, 1780, t)), pulse = .5 + .5 * Math.sin(t / 70);
        if (RR > 1) { runeCircle(front, cx, cy, RR, t / 900, a, pulse); if (flashN > 0 && t >= 650) put(front, glow([220, 190, 255]), cx, cy, H * 3.2 * (.6 + .4 * flashN), flashN); }
        front.globalCompositeOperation = 'lighter';
        // venting sparks and smoke while the card corrupts
        vent.forEach(v => { const s = (t - v.t0) / 1000; if (s < 0 || t > 1500 && t > v.t0 + 900) return; const a2 = Math.min(1, s * 6) * (1 - lin(.2, 1.1, s)) * (t < 1400 ? 1 : 1 - lin(1400, 1700, t)); put(front, v.sm ? puff(v.col, 2) : glow(v.col), cx + v.x * (1 + s * .2), cy + H * .3 - v.v * s, v.sz * H * (v.sm ? 6 : 2.2), (v.sm ? .22 : .9) * a2); });
        // the pixel dissolve burns: cells glow white-violet as they go, then cool to green embers
        if (t > 700) for (const c of cells) {
          const s = t - c.t; if (s < -70 || s > 300) continue;
          const X = cx - W / 2 + (c.i + .5) * cw, Y = cy - H / 2 + (c.j + .5) * ch, hot = s < 0 ? 1 + s / 70 : 1 - s / 300;
          put(front, glow(s < 90 ? [235, 210, 255] : [90, 255, 180]), X, Y, cw * 2.6, .85 * hot);
          if (s >= 0 && s < 160) { front.globalAlpha = hot; front.fillStyle = 'rgba(255,255,255,.9)'; front.fillRect(X - cw * .3, Y - ch * .3, cw * .6, ch * .6); }
        }
        // burst: runes, embers, chains
        if (t > 650) {
          rune.forEach(r => { const s = (t - r.t0) / 1000; if (s < 0) return; const k = (1 - Math.exp(-2 * s)) / 2, z = 1 + r.z * .9 * k * 2; const X = cx + Math.cos(r.a) * r.sp * k * z, Y = cy + Math.sin(r.a) * r.sp * k * z * .8 - s * H * .35, al = Math.min(1, s * 8) * (1 - lin(.55, 1.1, s)) * (t < 1500 ? 1 : 1 - lin(1500, 1800, t));
            put(front, glow(r.c === '#c58bff' ? [170, 90, 255] : [60, 255, 170]), X, Y, H * .42 * z, .6 * al); glyphAt(front, r.g, X, Y, H * .09 * z, s * r.fs * .5 + r.ph, r.c, Math.max(1.5, H * .014), al, Math.cos(s * r.fs + r.ph)); });
          embers.forEach(e => { const s = (t - e.t0) / 1000; if (s < 0 || s > 1.3) return; const al = Math.min(1, s * 6) * (1 - lin(.5, 1.3, s)) * (t < 1500 ? 1 : 1 - lin(1500, 1800, t)); put(front, glow(e.col), cx + Math.cos(e.a) * e.r * W * .6 + e.dx * s * .5 + Math.sin(s * 9 + e.a) * W * .03, cy + Math.sin(e.a) * e.r * H * .4 - e.v * s, e.sz * H * 2.4, al); });
          chains.forEach(c => { const g = eOut(lin(c.t0, c.t0 + 260, t)) * (1 - lin(1150, 1400, t)); if (g <= 0) return; const links = 14;
            for (let l = 0; l < links * g; l++) { const q = l / links, ang = c.a + c.bend * q, r = c.len * q, X = cx + Math.cos(ang) * r, Y = cy + Math.sin(ang) * r * .85; const lg = l % 2 ? 1 : .35;
              front.save(); front.translate(X, Y); front.rotate(ang); front.scale(1, lg); front.globalAlpha = .9 * g; front.strokeStyle = 'rgba(190,150,255,1)'; front.lineWidth = Math.max(1.4, H * .018); front.beginPath(); front.ellipse(0, 0, H * .045, H * .028, 0, 0, TAU); front.stroke(); front.restore(); put(front, glow([140, 80, 240]), X, Y, H * .2, .5 * g); } });
        }
      },
      dom(t) {
        // the card face is clipped cell by cell: remaining cells = the clip-path
        let d = '';
        for (const c of cells) if (t < c.t) d += `M${px(c.i * cw)} ${px(c.j * ch)}h${px(cw + .6)}v${px(ch + .6)}h${px(-cw - .6)}z`;
        const next = t >= MS ? 'path("M0 0h0v0z")' : `path("${d || 'M0 0h0v0z'}")`;
        if (next !== last) { face.style.clipPath = next; last = next; }
      }
    };
  }

  // ---------- public API ----------
  const BUILDERS = { 'burn-ss2611-sandstorm': sandstorm, 'burn-ss2701-glacier': glacier, 'burn-ss2703-shuriken': shurikenBarrage, 'burn-ss2705-whirlpool': whirlpool, 'burn-ss2707-zeus': zeus, 'burn-ss2709-hex': hex };
  function play(id, host, x, y, k) { const b = BUILDERS[id]; if (!b || !host || typeof procBurnStage !== 'function') return false; return scene(id, host, x, y, k || 1, b); }
  window.ShSeasonBurns = { IDS, NAMES, MS, has: (id) => !!BUILDERS[id], play };
})();
