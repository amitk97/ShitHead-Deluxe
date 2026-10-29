// § Daily Spin (v469): one free spin a UK day. The server draws and pays (economy `wheel`); this file draws the
// wheel from the catalog table `WHEEL` (cosmetics-data.js), turns it to a slice of the prize the server drew, ticks
// as each peg passes the pointer, and keeps the home chip / menu dot in step. Loads after app.js (shared globals).
(() => {
  'use strict';
  const C = 150, R = 134;
  const N = WHEEL.segments.length, SLICE = 360 / N;
  const COLOURS = { d25: '#1e40af', d50: '#0369a1', d100: '#0f766e', d250: '#6d28d9', d500: '#be185d', d1000: '#d97706', xp75: '#15803d', xp150: '#4d7c0f', avatar: '#b91c1c', back: '#9a3412' };
  const SPIN_MS = 4400, TURNS = 5, EASE = 'cubic-bezier(.12,.62,.14,1)';
  const $ = id => document.getElementById(id);
  const prize = id => WHEEL.prizes.find(p => p.id === id);
  const S = { status: null, busy: false, angle: 0, tick: null, timer: null, built: false, owned: {}, monty: null, scratch: null, tab: 'spin' };

  // ---- themes (v474): while an event is live the wheel wears its colours ----
  const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const mix = (a, b, t) => { const x = hex(a), y = hex(b); return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  function theme() {
    try {
      if (typeof activeSeasonalEvents !== 'function') return null;
      const w = activeSeasonalEvents()[0]; if (!w || !w.event || !w.event.tones) return null;
      return { name: w.event.name, tones: w.event.tones };
    } catch (e) { return null; }
  }
  // An owned wheel-only item is replaced by Diamonds on the wheel (the server pays the same).
  const view = p => (p.kind === 'item' && S.owned[p.itemId]) ? { ...p, kind: 'diamonds', amount: WHEEL.dupeDiamonds, owned: true } : p;
  function colour(id, i) {
    const th = S.theme;
    if (!th) return COLOURS[id];
    const p = prize(id);
    if (p.kind === 'item') return mix(th.tones[2], '#000', .5);
    return i % 2 ? mix(th.tones[0], '#fff', .14) : mix(th.tones[1], '#000', .12);
  }

  const pct = p => { const v = p.weight / 10; return `${v < 1 ? v.toFixed(1) : Math.round(v * 10) / 10}%`; };
  const nameOf = p => p.kind === 'diamonds' ? `${p.amount} Diamonds` : p.kind === 'xp' ? `${p.amount} XP` : p.itemId.startsWith('avatar') ? `${p.name} avatar` : `${p.name} card back`;
  const pt = (r, deg) => [C + r * Math.sin(deg * Math.PI / 180), C - r * Math.cos(deg * Math.PI / 180)];
  const wedge = (r, a0, a1) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); return `M${C} ${C}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`; };
  const STAR = (x, y, s) => `<path d="M${x} ${y - s}l${s * .3} ${s * .62} ${s * .7} .1-${s * .52} ${s * .48} ${s * .15} ${s * .7}-${s * .63}-${s * .36}-${s * .63} ${s * .36} ${s * .15}-${s * .7}-${s * .52}-${s * .48} ${s * .7}-.1Z" fill="#fff7d6"/>`;

  function label(p0, i) {
    const p = view(p0), a = i * SLICE, rot = `transform="rotate(${a} ${C} ${C})"`;
    if (p.kind === 'item') { const av = p.itemId.startsWith('avatar'); const t = (y, w) => `<text x="${C}" y="${y}" text-anchor="middle" font-size="${av ? 10 : 8.5}" font-weight="900" fill="#fff" letter-spacing="${av ? .5 : .2}">${w}</text>`; return `<g ${rot}>${STAR(C, C - R * .8, 9)}${av ? t(C - R * .56, 'AVATAR') : t(C - R * .6, 'CARD') + t(C - R * .48, 'BACK')}</g>`; }
    if (p.kind === 'xp') return `<g ${rot}><text x="${C}" y="${C - R * .72}" text-anchor="middle" font-size="20" font-weight="900" fill="#fff">${p.amount}</text><text x="${C}" y="${C - R * .56}" text-anchor="middle" font-size="10" font-weight="900" fill="#d9f99d" letter-spacing="1">XP</text></g>`;
    const big = String(p.amount).length > 3;
    return `<g ${rot}><use href="#ic-gem" x="${C - 8}" y="${C - R * .93}" width="16" height="16"/><text x="${C}" y="${C - R * .62}" text-anchor="middle" font-size="${big ? 17 : 20}" font-weight="900" fill="#fff">${p.amount}</text></g>`;
  }

  function build() {
    if (S.built) return;
    const svg = $('wheelSvg');
    if (!svg) return;
    S.theme = theme();
    const th = S.theme, rim = th ? [mix(th.tones[2], '#fff', .45), th.tones[1], mix(th.tones[1], '#000', .55)] : ['#fff2b0', '#f59e0b', '#8a5a0a'];
    const slices = WHEEL.segments.map((id, i) => `<path d="${wedge(R, i * SLICE - SLICE / 2, i * SLICE + SLICE / 2)}" fill="${colour(id, i)}" stroke="rgba(5,8,22,.55)" stroke-width="1.2"/>`).join('');
    const glow = WHEEL.segments.map((id, i) => `<path d="${wedge(R, i * SLICE - SLICE / 2, i * SLICE + SLICE / 2)}" fill="url(#lw-shade)"/>`).join('');
    const labels = WHEEL.segments.map((id, i) => label(prize(id), i)).join('');
    const pegs = WHEEL.segments.map((id, i) => { const [x, y] = pt(R + 6, i * SLICE + SLICE / 2); return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.4" fill="#fff7d6" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`; }).join('');
    svg.innerHTML = `<defs>
      <linearGradient id="lw-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${rim[0]}"/><stop offset=".5" stop-color="${rim[1]}"/><stop offset="1" stop-color="${rim[2]}"/></linearGradient>
      <radialGradient id="lw-shade" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#000" stop-opacity=".28"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></radialGradient></defs>
      <circle cx="${C}" cy="${C}" r="${R + 14}" fill="url(#lw-gold)" stroke="#3b2204" stroke-width="2"/>
      <circle cx="${C}" cy="${C}" r="${R + 2}" fill="#050816"/>
      ${slices}${glow}${labels}${pegs}
      <circle cx="${C}" cy="${C}" r="24" fill="url(#lw-gold)" stroke="#3b2204" stroke-width="2"/>
      <path d="M${C} ${C - 13}l3.6 7.4 8.1 1.1-5.9 5.7 1.4 8-7.2-3.9-7.2 3.9 1.4-8-5.9-5.7 8.1-1.1Z" fill="#7c2d12"/>`;
    $('wheelOdds').innerHTML = WHEEL.prizes.map(p0 => { const p = view(p0); return `<li><span class="lw-dot" style="background:${colour(p.id, WHEEL.segments.indexOf(p.id))}"></span><span class="lw-odds-name">${nameOf(p)}${p.owned ? ' (you own the item)' : ''}</span><b>${pct(p)}</b></li>`; }).join('')
      + `<li class="lw-odds-note">Once you own a wheel-only item, its slice pays ${WHEEL.dupeDiamonds.toLocaleString('en-GB')} Diamonds instead. XP prizes only come up while levels are on.${th ? ` <span class="lw-odds-themed">${th.name} colours are on while the event runs.</span>` : ''}</li>`;
    S.built = true;
  }

  // ---- state / chip ----
  const signedIn = () => typeof currentUser !== 'undefined' && !!currentUser && typeof callEconomy === 'function' && typeof firebaseAvailable !== 'undefined' && firebaseAvailable;
  function untilMidnightMs() {
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date()).map(x => [x.type, +x.value]));
      return (86400 - (p.hour * 3600 + p.minute * 60 + p.second)) * 1000;
    } catch (e) { return 3600e3; }
  }
  const nextText = () => { const m = Math.max(1, Math.ceil(untilMidnightMs() / 60000)); return `Next spin in ${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`; };

  function paint() {
    const chip = $('homeWheelChip'), ready = !!(S.status && S.status.canSpin), mReady = !!(S.monty && S.monty.canPlay);
    if (chip) {
      chip.classList.toggle('hidden', !S.status);
      chip.classList.toggle('lw-ready', ready);
    }
    const sc = $('homeScratchChip'), scReady = !!(S.scratch && S.scratch.canPlay);
    if (sc) { sc.classList.toggle('hidden', !S.scratch); sc.classList.toggle('lw-ready', scReady); }
    document.querySelectorAll('[data-scratch-dot]').forEach(el => el.classList.toggle('hidden', !scReady));
    const mc = $('homeMontyChip');
    if (mc) { mc.classList.toggle('hidden', !S.monty); mc.classList.toggle('lw-ready', mReady); }
    document.querySelectorAll('[data-wheel-dot]').forEach(el => el.classList.toggle('hidden', !ready));
    document.querySelectorAll('[data-monty-dot]').forEach(el => el.classList.toggle('hidden', !mReady));
    document.querySelectorAll('[data-dot-spin]').forEach(el => el.classList.toggle('hidden', !ready));
    document.querySelectorAll('[data-dot-cards]').forEach(el => el.classList.toggle('hidden', !mReady));
    const btn = $('wheelSpinBtn');
    if (btn && !S.busy) { btn.disabled = !ready; btn.textContent = ready ? 'SPIN' : nextText().toUpperCase(); }
    const sub = $('wheelSub'); if (sub) sub.textContent = ready ? 'One free spin every day.' : 'You have used today’s spin.';
    montyPaint();
    if (S.tab === 'scratch' && SCR) scratchPaintState();
    dzPaint();
  }
  async function refresh() {
    if (!signedIn()) { S.status = null; S.monty = null; S.scratch = null; D.cards = null; paint(); return; }
    const uid = currentUser.uid;
    try {
      const r = await callEconomy('wheel', { op: 'status' });
      if (currentUser && currentUser.uid === uid) { S.status = { canSpin: !!r.canSpin, last: r.last || null }; if (r.owned) { const was = JSON.stringify(S.owned); S.owned = r.owned; if (was !== JSON.stringify(S.owned) && !S.busy) S.built = false; } }
    } catch (e) { /* offline or not deployed yet: the chip stays hidden */ }
    try {
      const m = await callEconomy('monty', { op: 'status' });
      if (currentUser && currentUser.uid === uid && !M.busy) S.monty = { canPlay: !!m.canPlay, started: !!m.started, swaps: m.swaps || null, result: m.result || null };
    } catch (e) { /* not deployed yet */ }
    try {
      const c = await callEconomy('scratch', { op: 'status' });
      if (currentUser && currentUser.uid === uid && !SC.busy) { S.scratch = { canPlay: !!c.canPlay, last: c.last || null }; if (c.owned) S.scOwned = c.owned; }
    } catch (e) { /* not deployed yet */ }
    try {
      const z = await callEconomy('dropzone', { op: 'status' });
      if (currentUser && currentUser.uid === uid && !D.busy && Number.isFinite(Number(z.cards))) { D.cards = Number(z.cards); D.cap = Number(z.cap) || 10; D.owned = z.owned || {}; }
    } catch (e) { /* not deployed yet */ }
    paint();
  }
  function startTimer() {
    clearInterval(S.timer);
    S.timer = setInterval(() => {
      if (document.visibilityState !== 'visible' || !S.status) return;
      if (!S.status.canSpin && untilMidnightMs() < 61000) setTimeout(refresh, 62000);
      paint();
    }, 60000);
  }

  // ---- Scratch Card (v478): the server draws and pays at `play`; the foil is only the reveal ----
  const SC = { busy: false, card: null, pending: false, down: false, last: null, snd: 0 };
  const SCR = typeof SCRATCH !== 'undefined' ? SCRATCH : null;
  const SYMS = {
    J: '<span class="lw-sc-r">J</span>', Q: '<span class="lw-sc-r">Q</span>', K: '<span class="lw-sc-r">K</span>', A: '<span class="lw-sc-r">A</span>',
    JOKER: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 19 5 7.5l4.2 5L12 4.5l2.8 8 4.2-5 1.5 11.5Z" fill="currentColor" stroke="rgba(0,0,0,.45)" stroke-width="1" stroke-linejoin="round"/><circle cx="5" cy="6.5" r="1.7" fill="currentColor"/><circle cx="12" cy="3.6" r="1.7" fill="currentColor"/><circle cx="19" cy="6.5" r="1.7" fill="currentColor"/><path d="M5.5 21h13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
  };
  const SYM_NAMES = { J: 'Jack', Q: 'Queen', K: 'King', A: 'Ace', JOKER: 'Joker' };
  const scPrize = id => SCR.prizes.find(p => p.id === id);
  const scTier = p => p.kind === 'item' ? 'item' : p.amount >= 250 ? 'big' : p.amount >= 100 ? 'mid' : 'small';
  function scName(p) {
    if (p.kind === 'item') { const owned = S.scOwned && S.scOwned[p.itemId]; return `A line of ${SYM_NAMES[p.symbol]}s · ${p.name}${owned ? ' (you own it)' : ''}`; }
    return p.symbol ? `A line of ${SYM_NAMES[p.symbol]}s · ${p.amount} Diamonds` : `No line · ${p.amount} Diamonds`;
  }
  function scOdds() {
    $('scratchOdds').innerHTML = SCR.prizes.map(p => `<li><span class="lw-odds-name">${scName(p)}</span><b>${(p.weight / 10).toFixed(p.weight % 10 ? 1 : 0)}%</b></li>`).join('')
      + `<li class="lw-odds-note">Three of one card in a row, column or diagonal wins. Once you own a Prism item, winning it pays ${SCR.dupeDiamonds.toLocaleString('en-GB')} Diamonds instead. Every card pays something.</li>`;
  }
  const SC_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const SC_SUITS = ['♠', '♥', '♦', '♣'];
  // The winning line (an older card that won with three anywhere falls back to every cell of that symbol).
  function scWinCells(cells, win) {
    if (!win) return [];
    const l = SC_LINES.find(x => x.every(i => cells[i] === win));
    return l || cells.map((c, i) => c === win ? i : -1).filter(i => i >= 0);
  }
  // Nine real playing cards in the player's own deck, frame and card back (rebuilt on every open, so it follows what is equipped).
  function scGrid(cells, win) {
    const hit = scWinCells(cells, win), g = $('scratchGrid');
    let back = '<div class="custom-card-back"></div>';
    try { back = snapshotCardBackHtml(snapshotCardStyle(), 'w-full h-full'); } catch (e) { /* default back */ }
    g.innerHTML = cells.map((c, i) => {
      let face = '';
      if (c && typeof createCardElement === 'function') {
        try {
          const el = createCardElement(c === 'JOKER' ? { id: 'sc_' + i, suit: 'JOKER', rank: 'JOKER', isJoker: true } : { id: 'sc_' + i, rank: c, suit: SC_SUITS[(i * 3 + c.charCodeAt(0)) % 4] });
          el.removeAttribute('data-card-id'); face = el.outerHTML;
        } catch (e) { face = ''; }
      }
      return `<div class="lw-sc-cell${hit.includes(i) ? ' win' : ''}" data-sym="${c || ''}">${c ? face : back}</div>`;
    }).join('');
  }
  function scPrizeRows() {
    const el = $('scratchPrize'); if (!el || typeof avatarHtml !== 'function' || !SCR) return;
    const row = (id, sym) => { const p = SCR.prizes.find(x => x.symbol === sym); return { p, own: S.scOwned && S.scOwned[p.itemId] }; };
    const a = row('avatar', 'A'), b = row('back', 'JOKER');
    const line = r => r.own ? `You own it, so it pays ${SCR.dupeDiamonds.toLocaleString('en-GB')} Diamonds` : `${(r.p.weight / 10).toString().replace(/\.0$/, '')}% chance`;
    el.innerHTML = `<div class="lw-prize-row">${avatarHtml(a.p.itemId, 52)}<span class="lw-prize-t"><b>${a.p.name} avatar</b><span>Three Aces in a line · ${line(a)}</span></span></div>`
      + `<div class="lw-prize-row"><span class="lw-prize-back"><span class="custom-card-back ${getCosmeticBackClass(b.p.itemId)} lw-backprev"></span></span><span class="lw-prize-t"><b>${b.p.name} card back</b><span>Three Jokers in a line · ${line(b)}</span></span></div>`;
  }
  // Foil: silver-gold metal with a rainbow holo wash, brushed lines, glitter and bevelled edges; a second canvas sweeps a light band
  // and twinkles over what is left of it (destination-in with the foil, so scratched holes stay clear).
  const SC_GLITTER = Array.from({ length: 46 }, (_, i) => ({ x: ((i * 37) % 97) / 97, y: ((i * 61 + 13) % 89) / 89, r: .6 + (i % 4) * .45, ph: (i * 1.7) % 6.28, star: i % 5 === 0 }));
  let scShineRaf = 0;
  function scShine(t) {
    scShineRaf = 0;
    const fv = $('scratchFoil'), sh = $('scratchShine');
    if (!fv || !sh || fv.classList.contains('gone') || $('wheelModal').classList.contains('hidden') || !fv.width) return;
    if (sh.width !== fv.width || sh.height !== fv.height) { sh.width = fv.width; sh.height = fv.height; }
    const g = sh.getContext('2d'), w = sh.width, h = sh.height, dpr = w / (fv.getBoundingClientRect().width || w), calm = motionOff();
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, w, h);
    const p = calm ? .42 : ((t / 2600) % 1.5) - .25, cx = p * (w + h) - h * .5;
    const band = g.createLinearGradient(cx - h * .35, 0, cx + h * .35, h * .7);
    band.addColorStop(0, 'rgba(255,255,255,0)'); band.addColorStop(.42, 'rgba(255,255,255,.75)'); band.addColorStop(.5, 'rgba(190,235,255,.55)'); band.addColorStop(.58, 'rgba(255,190,240,.5)'); band.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = band; g.fillRect(0, 0, w, h);
    SC_GLITTER.forEach((d) => {
      const a = calm ? .55 : Math.max(0, Math.sin(t / 380 + d.ph)) ** 3;
      if (a < .05) return;
      const x = d.x * w, y = d.y * h, r = d.r * dpr * (d.star ? 3.2 : 1.4);
      g.fillStyle = `rgba(255,255,255,${a})`;
      if (d.star) { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * .22, y - r * .22); g.lineTo(x + r, y); g.lineTo(x + r * .22, y + r * .22); g.lineTo(x, y + r); g.lineTo(x - r * .22, y + r * .22); g.lineTo(x - r, y); g.lineTo(x - r * .22, y - r * .22); g.closePath(); g.fill(); }
      else { g.beginPath(); g.arc(x, y, r * .5, 0, 6.283); g.fill(); }
    });
    g.globalCompositeOperation = 'destination-in'; g.drawImage(fv, 0, 0);
    if (!calm) scShineRaf = requestAnimationFrame(scShine);
  }
  function scDrawFoil() {
    const cv = $('scratchFoil'), r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!r.width) return;
    if (!$('scratchShine')) { const sh = document.createElement('canvas'); sh.id = 'scratchShine'; sh.className = 'lw-sc-foil lw-sc-shine'; sh.setAttribute('aria-hidden', 'true'); cv.after(sh); }
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const g = cv.getContext('2d'), w = cv.width, h = cv.height;
    g.globalCompositeOperation = 'source-over';
    const f = g.createLinearGradient(0, 0, w, h);
    [[0, '#e6eaf3'], [.22, '#8c96ac'], [.4, '#f7f9ff'], [.58, '#737d95'], [.78, '#d6dcea'], [1, '#808aa2']].forEach(([o, c]) => f.addColorStop(o, c));
    g.fillStyle = f; g.fillRect(0, 0, w, h);
    const holo = g.createLinearGradient(0, h, w, 0);
    ['#ff5fa8', '#ffd35a', '#6dffb0', '#52d6ff', '#9a7bff', '#ff5fa8'].forEach((c, i) => holo.addColorStop(i / 5, c));
    g.globalCompositeOperation = 'overlay'; g.globalAlpha = .8; g.fillStyle = holo; g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = .1; g.strokeStyle = '#3b4560'; g.lineWidth = dpr * .6;
    for (let y = 0; y < h; y += 3 * dpr) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (y % 7)); g.stroke(); }
    g.globalAlpha = .22; g.strokeStyle = '#fff'; g.lineWidth = dpr * 1.4;
    for (let x = -h; x < w; x += 22 * dpr) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + h, 0); g.stroke(); }
    g.globalAlpha = 1;
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .72);
    vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(40,50,80,.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    g.font = `900 ${Math.round(w * .1)}px Outfit, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = `${Math.round(w * .008)}px`;
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillText('SCRATCH HERE', w / 2 + dpr, h / 2 + dpr);
    g.fillStyle = 'rgba(60,72,104,.85)'; g.fillText('SCRATCH HERE', w / 2, h / 2);
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = dpr * 2.4; g.strokeRect(dpr * 1.2, dpr * 1.2, w - dpr * 2.4, h - dpr * 2.4);
    g.strokeStyle = 'rgba(70,84,120,.6)'; g.lineWidth = dpr; g.strokeRect(dpr * 3.6, dpr * 3.6, w - dpr * 7.2, h - dpr * 7.2);
    cancelAnimationFrame(scShineRaf); scShineRaf = requestAnimationFrame(scShine);
  }
  function scCleared() {
    const cv = $('scratchFoil'), g = cv.getContext('2d'), w = cv.width, h = cv.height, step = 12;
    const d = g.getImageData(0, 0, w, h).data; let hit = 0, all = 0;
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) { all++; if (d[(y * w + x) * 4 + 3] < 40) hit++; }
    return hit / all;
  }
  function scatchPoint(e) { const cv = $('scratchFoil'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
  function scratchSettle() { if (SC.pending && SC.card) scratchReveal(true); }
  function scratchPaintState() {
    const btn = $('scratchBtn'), sub = $('scratchSub'), rv = $('scratchRevealBtn'), c = S.scratch;
    if (!c) { btn.disabled = true; btn.textContent = 'NOT AVAILABLE YET'; sub.textContent = 'The Scratch Card needs a connection.'; rv.classList.add('hidden'); return; }
    rv.classList.toggle('hidden', !SC.pending);
    if (SC.pending) { btn.disabled = true; btn.textContent = 'SCRATCH THE FOIL'; sub.textContent = 'Scratch to reveal. Get three in a row, column or diagonal.'; return; }
    if (c.canPlay) { btn.disabled = SC.busy; btn.textContent = 'GET CARD'; sub.textContent = 'One free card every day. Get three in a row, column or diagonal.'; return; }
    const m = Math.max(1, Math.ceil(untilMidnightMs() / 60000));
    btn.disabled = true; btn.textContent = `NEXT CARD IN ${Math.floor(m / 60)}H ${String(m % 60).padStart(2, '0')}M`; sub.textContent = 'You have used today’s card.';
  }
  function scratchResultHtml(card) {
    const p = scPrize(card.prize) || {};
    if (card.kind === 'item') return card.duplicate
      ? `<b class="lw-won">+${card.paid.toLocaleString('en-GB')} Diamonds</b><span>A line of ${SYM_NAMES[p.symbol]}s. You already own the ${card.name}, so it pays Diamonds.</span>`
      : `<b class="lw-won">${card.name}</b><span>A line of ${SYM_NAMES[p.symbol]}s. It is yours: find it in Custom.</span>`;
    return p.symbol ? `<b class="lw-won">+${card.amount} Diamonds</b><span>A line of ${SYM_NAMES[p.symbol]}s.</span>` : `<b class="lw-won">+${card.amount} Diamonds</b><span>No line this time. Every card pays a little.</span>`;
  }
  function scratchOpen() {
    if (!SCR) return;
    scOdds(); scPrizeRows();
    const c = S.scratch;
    if (SC.pending) { scratchPaintState(); return; }
    const last = c && c.last;
    if (last) {
      $('scratchFoil').classList.add('gone'); $('scratchShine')?.classList.add('gone'); scGrid(last.grid, (scPrize(last.prize) || {}).symbol);
      $('scratchResult').innerHTML = scratchResultHtml(last);
    } else {
      $('scratchFoil').classList.remove('gone'); $('scratchShine')?.classList.remove('gone'); scGrid(Array(9).fill(''), null); $('scratchResult').innerHTML = '';
      requestAnimationFrame(scDrawFoil);
    }
    scratchPaintState();
  }
  async function scratchGet() {
    if (SC.busy || SC.pending || !S.scratch || !S.scratch.canPlay || !signedIn()) return;
    SC.busy = true; $('scratchBtn').disabled = true; $('scratchBtn').textContent = 'GETTING YOUR CARD';
    let res;
    try { res = await callEconomy('scratch', { op: 'play' }); } catch (e) { SC.busy = false; $('scratchResult').innerHTML = '<span>Couldn’t get a card right now. Check your connection and try again.</span>'; scratchPaintState(); return; }
    SC.busy = false;
    if (res.already || !res.card) { S.scratch = { canPlay: false, last: res.last || null }; scratchOpen(); paint(); return; }
    SC.card = res; SC.pending = true;
    S.scratch = { canPlay: false, last: res.card };
    scGrid(res.card.grid, null); $('scratchResult').innerHTML = '';
    $('scratchFoil').classList.remove('gone'); $('scratchShine')?.classList.remove('gone'); scDrawFoil();
    scratchPaintState(); paint();
  }
  function scratchReveal(quiet) {
    if (!SC.pending || !SC.card) return;
    const res = SC.card, card = res.card, p = scPrize(card.prize) || {};
    SC.pending = false; SC.card = null; SC.down = false;
    $('scratchFoil').classList.add('gone'); $('scratchShine')?.classList.add('gone');
    scGrid(card.grid, p.symbol);
    if (Number.isFinite(Number(res.diamonds)) && typeof challengeEconomy !== 'undefined') challengeEconomy.diamonds = Number(res.diamonds);
    if (typeof updateDiamondHeader === 'function') updateDiamondHeader();
    if (card.kind === 'item' && typeof loadCosmeticCollection === 'function') loadCosmeticCollection(currentUser);
    if (!quiet) {
      $('scratchResult').innerHTML = scratchResultHtml(card);
      $('scratchResult').classList.remove('lw-in'); void $('scratchResult').offsetWidth; $('scratchResult').classList.add('lw-in');
      celebrate(scTier(p));
      setTimeout(() => {
        if (card.kind === 'item') winPop(card.duplicate
          ? { eyebrow: 'Already owned', big: `+${Number(card.paid).toLocaleString('en-GB')} Diamonds`, sub: `You own the ${card.name}, so it pays Diamonds instead.`, tier: 'jackpot' }
          : { eyebrow: 'New item', art: winArt(card.itemId), big: card.name, sub: 'Find it in Custom.', tier: 'item' });
        else winPop({ eyebrow: p.symbol ? 'A winning line' : 'Scratch Card', big: `+${Number(card.amount).toLocaleString('en-GB')} Diamonds`, sub: p.symbol ? `A line of ${SYM_NAMES[p.symbol]}s.` : 'No line this time. Every card pays a little.', tier: scTier(p) });
      }, motionOff() ? 0 : 450);
    }
    scratchPaintState();
  }
  (function wireScratch() {
    const cv = $('scratchFoil'); if (!cv) return;
    let last = null;
    const scrape = (e) => {
      if (!SC.pending || !SC.down) return;
      const g = cv.getContext('2d'), [x, y] = scatchPoint(e);
      g.globalCompositeOperation = 'destination-out'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = cv.width * .12;
      g.beginPath(); g.moveTo(last ? last[0] : x, last ? last[1] : y); g.lineTo(x + .01, y); g.stroke(); last = [x, y];
      const t = performance.now(); if (t - SC.snd > 55 && audio.playScratch) { SC.snd = t; audio.playScratch(); }
    };
    cv.addEventListener('pointerdown', (e) => { if (!SC.pending) { if (S.scratch && S.scratch.canPlay && !SC.busy && signedIn()) { SC.down = true; last = null; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } scratchGet(); e.preventDefault(); } return; } SC.down = true; last = null; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* fine */ } scrape(e); e.preventDefault(); });
    cv.addEventListener('pointermove', (e) => { scrape(e); });
    const up = () => { if (!SC.down) return; SC.down = false; last = null; if (SC.pending && scCleared() > .55) scratchReveal(); };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  })();

  // ---- the spin ----
  const angleOf = el => { const m = getComputedStyle(el).transform; if (!m || m === 'none') return 0; const v = m.match(/matrix\(([^)]+)\)/); if (!v) return 0; const [a, b] = v[1].split(',').map(Number); return Math.atan2(b, a) * 180 / Math.PI; };
  function flickPointer() {
    const el = $('wheelPointer');
    if (!el || motionOff() || typeof el.animate !== 'function') return;
    el.animate([{ transform: 'translateX(-50%) rotate(0deg)' }, { transform: 'translateX(-50%) rotate(-17deg)', offset: .35 }, { transform: 'translateX(-50%) rotate(0deg)' }], { duration: 110, easing: 'ease-out' });
  }
  function ticks(anim, el) {
    let last = null, total = 0, prev = angleOf(el);
    const loop = () => {
      if (anim.playState !== 'running') return;
      const a = angleOf(el); let d = a - prev; if (d < -180) d += 360; if (d > 180) d -= 360; prev = a; total += d;
      const k = Math.floor((total + SLICE / 2) / SLICE);
      if (last !== null && k !== last) { audio.playWheelTick && audio.playWheelTick(); flickPointer(); }
      last = k;
      S.tick = requestAnimationFrame(loop);
    };
    S.tick = requestAnimationFrame(loop);
  }
  const tierOf = p => p.owned ? 'jackpot' : p.kind === 'item' ? 'item' : p.id === 'd1000' ? 'jackpot' : (p.kind === 'diamonds' && p.amount >= 250) ? 'big' : (p.kind === 'diamonds' && p.amount >= 100) || p.id === 'xp150' ? 'mid' : 'small';

  function showResult(sp) {
    const p = view(prize(sp.prize)), el = $('wheelResult');
    let html;
    if (p.kind === 'item') {
      const isAvatar = p.itemId.startsWith('avatar');
      const thumb = isAvatar ? avatarHtml(p.itemId, 56) : `<span class="custom-card-back ${getCosmeticBackClass(p.itemId)} lw-backprev"></span>`;
      html = sp.duplicate
        ? `<b class="lw-won">You already own the ${nameOf(p)}</b><span>Here are ${sp.paid} Diamonds instead.</span>`
        : `<span class="lw-thumb">${thumb}</span><b class="lw-won">You won the ${nameOf(p)}</b><span>Find it in Custom. It is wheel-only.</span>`;
    } else html = `<b class="lw-won">+${p.amount} ${p.kind === 'xp' ? 'XP' : 'Diamonds'}</b><span>${p.kind === 'xp' ? 'Added to your level.' : 'Added to your balance.'}</span>`;
    el.innerHTML = html;
    el.classList.remove('lw-in'); void el.offsetWidth; el.classList.add('lw-in');
  }
  // Win pop-up (v493): every win from the Daily Spin, Scratch Card and Three Cards is also shown as a pop-up over the
  // game's pop-up, with the prize big in the middle. The result line under the wheel stays as the record.
  function closeWin() { const d = $('wheelWinPop'); if (!d) return false; d.remove(); return true; }
  function winPop(o) {
    const host = $('wheelModal'); if (!host) return;
    closeWin();
    const gem = '<svg class="lw-win-gem" viewBox="0 0 24 24" aria-hidden="true"><use href="#ic-gem"/></svg>';
    const art = o.art || gem;
    const d = document.createElement('div');
    d.id = 'wheelWinPop'; d.className = 'lw-winpop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'You won');
    d.innerHTML = `<div class="lw-win-card lw-win-${o.tier || 'small'}"><div class="lw-win-eyebrow">${o.eyebrow || 'You won'}</div><div class="lw-win-art">${art}</div><div class="lw-win-big">${o.big}</div><div class="lw-win-sub">${o.sub || ''}</div><button type="button" class="lw-win-ok" id="wheelWinOk">CONTINUE</button></div>`;
    host.appendChild(d);
    const ok = d.querySelector('#wheelWinOk'); if (ok) ok.focus({ preventScroll: true });
  }
  const winArt = (itemId) => itemId && itemId.startsWith('avatar') ? avatarHtml(itemId, 84) : itemId ? `<span class="custom-card-back ${getCosmeticBackClass(itemId)} lw-win-back"></span>` : '';
  function wheelWinPop(sp, p) {
    if (p.kind === 'item') {
      if (sp.duplicate) return winPop({ eyebrow: 'Already owned', big: `+${Number(sp.paid).toLocaleString('en-GB')} Diamonds`, sub: `You own the ${nameOf(p)}, so it pays Diamonds instead.`, tier: 'jackpot' });
      return winPop({ eyebrow: 'New item', art: winArt(p.itemId), big: nameOf(p), sub: 'Find it in Custom. It is wheel-only.', tier: 'item' });
    }
    if (p.kind === 'xp') return winPop({ art: '<span class="lw-win-xp">XP</span>', big: `+${p.amount} XP`, sub: 'Added to your level.', tier: tierOf(p) });
    return winPop({ big: `+${Number(p.amount).toLocaleString('en-GB')} Diamonds`, sub: 'Added to your balance.', tier: tierOf(p) });
  }
  function celebrate(tier) {
    if (audio.playWheelWin) audio.playWheelWin(tier);
    if (motionOff() || typeof confetti !== 'function' || (tier !== 'item' && tier !== 'jackpot' && tier !== 'big')) return;
    const n = tier === 'big' ? 40 : 90;
    try { confetti({ particleCount: n, spread: 80, startVelocity: 38, origin: { y: .62 }, zIndex: 120, colors: ['#fde68a', '#f59e0b', '#dc2626', '#fff'] }); } catch (e) { /* cosmetic only */ }
  }
  function applyEconomy(res) {
    if (Number.isFinite(Number(res.diamonds)) && typeof challengeEconomy !== 'undefined') challengeEconomy.diamonds = Number(res.diamonds);
    if (typeof updateDiamondHeader === 'function') updateDiamondHeader();
    if (res.xp && typeof noteXpResult === 'function') noteXpResult(res.xp);
    if (res.spin && res.spin.kind === 'item' && typeof loadCosmeticCollection === 'function') loadCosmeticCollection(currentUser);
  }

  async function spin() {
    if (S.busy || !S.status || !S.status.canSpin || !signedIn()) return;
    S.busy = true;
    const btn = $('wheelSpinBtn'); btn.disabled = true; btn.textContent = 'SPINNING';
    $('wheelResult').innerHTML = '';
    let res;
    try { res = await callEconomy('wheel', { op: 'spin' }); }
    catch (e) { S.busy = false; $('wheelResult').innerHTML = '<span>Couldn’t spin right now. Check your connection and try again.</span>'; paint(); return; }
    if (res.already || !res.spin) { S.busy = false; S.status = { canSpin: false, last: res.last || null }; paint(); return; }
    const sp = res.spin, p = view(prize(sp.prize));
    const slots = WHEEL.segments.map((id, i) => id === sp.prize ? i : -1).filter(i => i >= 0);
    const idx = slots[Math.floor(Math.random() * slots.length)];
    const from = S.angle, to = Math.ceil(from / 360) * 360 + 360 * TURNS - idx * SLICE + (Math.random() * 2 - 1) * SLICE * .32;
    const el = $('wheelSvg');
    const done = () => {
      S.angle = to; el.style.transform = `rotate(${to}deg)`;
      S.busy = false; S.status = { canSpin: false, last: { id: sp.prize } };
      const gotItem = prize(sp.prize).kind === 'item' && !sp.duplicate;
      if (gotItem) { S.owned = { ...S.owned, [prize(sp.prize).itemId]: true }; S.built = false; }
      applyEconomy(res); showResult(sp); celebrate(tierOf(p)); paint(); startTimer();
      setTimeout(() => wheelWinPop(sp, p), motionOff() ? 0 : 450);
    };
    if (motionOff() || typeof el.animate !== 'function') { done(); return; }
    const anim = el.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${to}deg)` }], { duration: SPIN_MS, easing: EASE, fill: 'forwards' });
    window.__wheelAnim = anim;
    ticks(anim, el);
    anim.finished.then(() => { cancelAnimationFrame(S.tick); try { anim.commitStyles(); } catch (e) { /* fine */ } anim.cancel(); done(); }, () => { cancelAnimationFrame(S.tick); done(); });
  }

  // ---- open / close ----
  function paintPrize() {
    const el = $('wheelPrize'); if (!el || typeof avatarHtml !== 'function') return;
    const odds = id => { const p = WHEEL.prizes.find(x => x.id === id); return p ? `${(p.weight / 10).toString().replace(/\.0$/, '')}% chance` : ''; };
    const own = id => S.owned[id === 'avatar' ? 'avatar-wheel' : 'back-wheel'], pay = `You own it, so that slice pays ${WHEEL.dupeDiamonds.toLocaleString('en-GB')} Diamonds`;
    el.innerHTML = `<div class="lw-prize-row">${avatarHtml('avatar-wheel', 52)}<span class="lw-prize-t"><b>Lucky Wheel avatar</b><span>Your profile picture · ${own('avatar') ? pay : odds('avatar')}</span></span></div>`
      + `<div class="lw-prize-row"><span class="lw-prize-back"><span class="custom-card-back ${getCosmeticBackClass('back-wheel')} lw-backprev"></span></span><span class="lw-prize-t"><b>Lucky Spin card back</b><span>The design on your cards' backs · ${own('back') ? pay : odds('back')}</span></span></div>`
      + `<span class="lw-prize-note">Wheel-only. You can't buy them.</span>`;
  }

  // ---- Three Cards (weekly) ----
  const M = { busy: false, els: [], pos: [0, 1, 2] };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const gem = v => `<svg aria-hidden="true"><use href="#ic-gem"/></svg><span>${v}</span>`;
  const bigAmt = () => (typeof MONTY !== 'undefined' ? MONTY.big : 300);
  function montyBuild() {
    const st = $('montyStage'); if (!st) return;
    let back = '<div class="custom-card-back"></div>';
    try { back = snapshotCardBackHtml(snapshotCardStyle(), 'w-full h-full'); } catch (e) { /* default back */ }
    st.innerHTML = [0, 1, 2].map(i => `<button type="button" class="lw-mc" data-mc="${i}" disabled aria-label="Card ${i + 1}"><span class="lw-mc-in"><span class="lw-mc-back">${back}</span><span class="lw-mc-face"></span></span></button>`).join('');
    M.els = [...st.querySelectorAll('.lw-mc')]; M.pos = [0, 1, 2];
    montyPlace(false);
  }
  const dx = () => Math.round((M.els[0] ? M.els[0].offsetWidth : 67) * 1.22);
  const xOf = q => (q - 1) * dx();
  function montyPlace() { M.els.forEach((el, i) => { el.style.transform = `translateX(${xOf(M.pos[i])}px)`; el.style.zIndex = ''; }); }
  const at = q => M.els[M.pos.indexOf(q)];
  const setFace = (el, v) => { const f = el.querySelector('.lw-mc-face'); f.innerHTML = gem(v); el.classList.toggle('big', v === bigAmt()); };
  async function swapCards(a, b) {
    const ea = at(a), eb = at(b), xa = xOf(a), xb = xOf(b);
    M.pos[M.els.indexOf(ea)] = b; M.pos[M.els.indexOf(eb)] = a;
    audio.playMontyCard && audio.playMontyCard('slide');
    if (motionOff() || typeof ea.animate !== 'function') {
      ea.classList.add('hl'); eb.classList.add('hl'); montyPlace(); await wait(520); ea.classList.remove('hl'); eb.classList.remove('hl'); await wait(120); return;
    }
    const D = 330, mid = (xa + xb) / 2;
    ea.style.zIndex = 2;
    const A = ea.animate([{ transform: `translateX(${xa}px)` }, { transform: `translate(${mid}px,-22px)`, offset: .5 }, { transform: `translateX(${xb}px)` }], { duration: D, easing: 'ease-in-out', fill: 'forwards' });
    const B = eb.animate([{ transform: `translateX(${xb}px)` }, { transform: `translate(${mid}px,14px)`, offset: .5 }, { transform: `translateX(${xa}px)` }], { duration: D, easing: 'ease-in-out', fill: 'forwards' });
    await Promise.all([A.finished, B.finished].map(f => f.catch(() => 0)));
    A.cancel(); B.cancel(); montyPlace(); await wait(70);
  }
  function montyPaint() {
    const btn = $('montyBtn'), sub = $('montySub'); if (!btn || M.busy) return;
    const m = S.monty, big = bigAmt();
    if (!m) { btn.disabled = true; btn.textContent = 'NOT AVAILABLE YET'; if (sub) sub.textContent = 'Three Cards needs a connection.'; return; }
    const playing = M.phase === 'pick';
    if (m.result) { btn.disabled = true; btn.textContent = 'BACK NEXT WEEK'; if (sub) sub.textContent = 'You have played this week’s game.'; return; }
    btn.disabled = playing || !m.canPlay;
    btn.textContent = playing ? 'PICK A CARD' : m.started ? 'WATCH THE SHUFFLE AGAIN' : 'START';
    if (sub) sub.textContent = playing ? 'Tap the card you think hides the big prize.' : `One free play every week. Follow the ${big} Diamond card.`;
  }
  function montyShowDone(r) {
    M.phase = 'done';
    M.els.forEach(el => { el.disabled = true; });
    r.reveal.forEach((v, q) => { const el = at(q); setFace(el, v); el.classList.add('up'); if (q === r.pick) el.classList.add('chosen'); });
    $('montyResult').innerHTML = r.prize === bigAmt() ? `<b class="lw-won">+${r.prize} Diamonds</b><span>You found the big prize.</span>` : `<b class="lw-won">+${r.prize} Diamonds</b><span>Not the big one. Try again next week.</span>`;
  }
  const flipSnd = () => { if (audio.playMontyCard) audio.playMontyCard('flip'); };
  async function montyStart() {
    if (M.busy || !S.monty || !signedIn()) return;
    M.busy = true; M.phase = 'show';
    const btn = $('montyBtn'); btn.disabled = true; btn.textContent = 'WATCH';
    $('montyResult').innerHTML = '';
    let res;
    try { res = await callEconomy('monty', { op: 'start' }); } catch (e) { M.busy = false; M.phase = ''; $('montyResult').innerHTML = '<span>Couldn’t start right now. Check your connection and try again.</span>'; montyPaint(); return; }
    if (res.result) { M.busy = false; S.monty = { canPlay: false, result: res.result }; montyBuild(); montyShowDone(res.result); paint(); return; }
    montyBuild();
    const m = at(res.bigAt == null ? 1 : res.bigAt);
    setFace(m, bigAmt()); m.classList.add('up'); flipSnd();
    $('montyResult').innerHTML = `<span>Watch the ${bigAmt()} Diamond card.</span>`;
    await wait(1300); m.classList.remove('up'); flipSnd(); await wait(500);
    for (const [a, b] of res.swaps) await swapCards(a, b);
    M.busy = false; M.phase = 'pick'; S.monty = { ...S.monty, started: true, swaps: res.swaps };
    M.els.forEach(el => { el.disabled = false; });
    $('montyResult').innerHTML = '';
    montyPaint();
    M.els[0].focus({ preventScroll: true });
  }
  async function montyPick(el) {
    if (M.phase !== 'pick' || M.busy) return;
    M.busy = true; M.els.forEach(x => { x.disabled = true; });
    const q = M.pos[M.els.indexOf(el)];
    let res;
    try { res = await callEconomy('monty', { op: 'pick', index: q }); } catch (e) { M.busy = false; M.els.forEach(x => { x.disabled = false; }); $('montyResult').innerHTML = '<span>Couldn’t check that card. Try again.</span>'; return; }
    const r = res.result; if (!r) { M.busy = false; return; }
    setFace(el, r.reveal[q]); el.classList.add('up', 'chosen'); flipSnd();
    await wait(motionOff() ? 100 : 650);
    r.reveal.forEach((v, p) => { const x = at(p); if (x !== el) { setFace(x, v); x.classList.add('up'); } });
    flipSnd();
    applyEconomy(res);
    S.monty = { canPlay: false, started: false, result: r };
    M.busy = false; M.phase = 'done';
    $('montyResult').innerHTML = r.prize === bigAmt() ? `<b class="lw-won">+${r.prize} Diamonds</b><span>You found the big prize.</span>` : `<b class="lw-won">+${r.prize} Diamonds</b><span>Not the big one. Try again next week.</span>`;
    $('montyResult').classList.remove('lw-in'); void $('montyResult').offsetWidth; $('montyResult').classList.add('lw-in');
    celebrate(r.prize === bigAmt() ? 'big' : 'small');
    setTimeout(() => winPop({ eyebrow: r.prize === bigAmt() ? 'The big prize' : 'Three Cards', big: `+${Number(r.prize).toLocaleString('en-GB')} Diamonds`, sub: r.prize === bigAmt() ? 'You followed the right card.' : 'Not the big one. Try again next week.', tier: r.prize === bigAmt() ? 'big' : 'small' }), motionOff() ? 0 : 450);
    paint();
  }

  // ---- Drop Zone (v503): a bank of cards (1 to start, +1 for every game won). The server draws each slot; the card is drawn falling to it ----
  const DZR = typeof DROPZONE !== 'undefined' ? DROPZONE : null;
  const D = { cards: null, cap: 10, owned: {}, busy: false, shown: null, built: false };
  const DG = { X0: 180, DX: 24, ROWS: 6, Y0: 92, DY: 46, SLOT_Y: 364, W: 360, CW: 32, CH: 45, TOP: 72 };
  const DZ_COL = ['#ffd36a', '#f0b43c', '#e5b04a', '#d99a2b', '#e5b04a', '#f0b43c', '#ffd36a'];
  const dzLabel = (sl) => sl.kind === 'item' ? (sl.itemId.startsWith('avatar') ? 'AVATAR' : 'BACK') : String(sl.amount);
  const dzName = (sl) => sl.kind === 'diamonds' ? `${sl.amount} Diamonds` : sl.itemId.startsWith('avatar') ? `${sl.name} avatar` : `${sl.name} card back`;
  const dzShown = () => D.shown != null ? D.shown : D.cards;
  const CARD_SVG = '<svg viewBox="0 0 20 20" aria-hidden="true"><rect x="4.5" y="1.5" width="11" height="17" rx="2" fill="#16295f" stroke="#ffd36a" stroke-width="1.3"/><path d="M10 6 13 10 10 14 7 10Z" fill="none" stroke="#f0b43c" stroke-width="1"/></svg>';
  function dzPaint() {
    const n = D.cards == null ? null : dzShown();
    const chip = $('homeDropChip'), b = $('dropBadge');
    if (chip) { chip.classList.toggle('hidden', n == null || !DZR); chip.classList.toggle('lw-ready', n > 0); }
    if (b) { b.textContent = n || ''; b.classList.toggle('hidden', !n); }
    document.querySelectorAll('[data-dot-drop]').forEach(el => el.classList.toggle('hidden', !(n > 0)));
    const c = $('dropCount'); if (c) c.innerHTML = `${CARD_SVG}<span>${n == null ? '…' : n} ${n === 1 ? 'card' : 'cards'}</span>`;
    const btn = $('dropBtn'); if (btn && !D.busy) { btn.disabled = !(n > 0); btn.textContent = n > 0 ? `DROP CARD${n > 1 ? ' (' + n + ' LEFT)' : ''}` : 'NO CARDS · WIN A GAME'; }
    const all = $('dropAllBtn'); if (all) { all.classList.toggle('hidden', !(n > 1)); all.disabled = D.busy; all.textContent = `Drop all (${n})`; }
    const sub = $('dropSub'); if (sub) sub.textContent = n > 0 ? 'Every game you win, in any mode, earns another card.' : 'Win a game in any mode to earn a card.';
  }
  // Gold Vault: black board, gold frame, diamond pins, framed gem bins.
  function dzBuild() {
    const host = $('dropBoard'); if (!host || !DZR) return;
    const GD = 'url(#dzGold)';
    let g = '<defs><linearGradient id="dzBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16131c"/><stop offset="1" stop-color="#060509"/></linearGradient><linearGradient id="dzGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#e5b04a"/><stop offset="1" stop-color="#7a5212"/></linearGradient><filter id="dzGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3"/></filter></defs>';
    g += `<rect x="3" y="3" width="354" height="464" rx="14" fill="url(#dzBg)"/><rect x="3" y="3" width="354" height="464" rx="14" fill="none" stroke="${GD}" stroke-width="3.5"/><rect x="11" y="11" width="338" height="448" rx="9" fill="none" stroke="#e5b04a" stroke-opacity=".35"/><path d="M180 26l10 12-10 12-10-12z" fill="${GD}"/><path d="M168 60l12 12 12-12" fill="none" stroke="#e5b04a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`;
    for (let r = 0; r < DG.ROWS; r++) {
      const off = r % 2 === 0 ? 36 : 12, n = r % 2 === 0 ? 7 : 8;
      for (let j = 0; j < n; j++) { const x = off + 48 * j, y = DG.Y0 + DG.DY * r; g += `<circle class="dz-halo" data-peg="${r}:${x}" cx="${x}" cy="${y}" r="10" fill="#ffd36a" opacity="0" filter="url(#dzGlow)"/><path d="M${x} ${y - 6.5}l5.4 6.5-5.4 6.5-5.4-6.5z" fill="${GD}" stroke="#3a2808" stroke-width=".6"/><path d="M${x} ${y - 6.5}l2.2 6.5h-4.4z" fill="#fff" opacity=".55"/>`; }
    }
    const SY = DG.SLOT_Y, T = '#fff';
    DZR.slots.forEach((sl, i) => {
      const cx = 36 + 48 * i, c = DZ_COL[i], w = 42;
      let lab;
      if (sl.kind !== 'item') lab = `<path d="M${cx - 8} ${SY + 19.6}l4-5.6h8l4 5.6-8 9.9z" fill="${c}" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/><text x="${cx}" y="${SY + 58}" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-size="20" font-weight="800" fill="${T}">${sl.amount}</text>`;
      else if (sl.itemId.startsWith('avatar')) lab = `<circle cx="${cx}" cy="${SY + 30}" r="12" fill="#13244d" stroke="${c}" stroke-width="2"/><circle cx="${cx}" cy="${SY + 26}" r="4.4" fill="${c}"/><path d="M${cx - 8} ${SY + 38}q8-10 16 0z" fill="${c}"/><text x="${cx}" y="${SY + 66}" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-size="9.5" font-weight="800" fill="${T}" letter-spacing=".5">AVATAR</text><text x="${cx}" y="${SY + 78}" text-anchor="middle" font-size="8" fill="${c}">1%</text>`;
      else lab = `<rect x="${cx - 9}" y="${SY + 14}" width="18" height="26" rx="3" fill="#13244d" stroke="${c}" stroke-width="2"/><path d="M${cx - 4} ${SY + 22}h8M${cx - 4} ${SY + 28}h8" stroke="${c}" stroke-width="1.6"/><text x="${cx}" y="${SY + 66}" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-size="9.5" font-weight="800" fill="${T}" letter-spacing=".5">BACK</text><text x="${cx}" y="${SY + 78}" text-anchor="middle" font-size="8" fill="${c}">1%</text>`;
      g += `<g class="dz-slot" data-slot="${i}"><rect class="dz-sglow" x="${cx - w / 2 - 3}" y="${SY - 3}" width="${w + 6}" height="92" rx="9" fill="#ffd36a" opacity="0" filter="url(#dzGlow)"/><rect x="${cx - w / 2}" y="${SY}" width="${w}" height="86" rx="8" fill="#0d0b12" stroke="${GD}" stroke-width="2"/><rect x="${cx - w / 2 + 4}" y="${SY + 4}" width="${w - 8}" height="78" rx="5" fill="none" stroke="#e5b04a" stroke-opacity=".3"/>${lab}</g>`;
    });
    let back = '<div class="custom-card-back"></div>';
    try { back = snapshotCardBackHtml(snapshotCardStyle(), 'w-full h-full'); } catch (e) { /* default back */ }
    host.innerHTML = `<svg viewBox="0 0 360 470" aria-hidden="true">${g}</svg><div id="dropCard" class="dz-card">${back}</div>`;
    dzPlaceCard();
    D.built = true;
  }
  function dzScale() { const b = $('dropBoard'); return b && b.clientWidth ? b.clientWidth / DG.W : 0.8; }
  function dzPlaceCard(x = DG.X0, y = DG.TOP, rot = 0) {
    const c = $('dropCard'); if (!c) return;
    const s = dzScale(), w = DG.CW * s, h = DG.CH * s;
    c.style.width = w + 'px'; c.style.height = h + 'px';
    c.style.transform = `translate(${x * s - w / 2}px, ${y * s - h / 2}px) rotate(${rot}deg)`;
  }
  const dzRoute = (slot) => { const R = 3 + (slot - 3), m = []; for (let i = 0; i < DG.ROWS; i++) m.push(i < R ? 1 : -1); for (let i = m.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [m[i], m[j]] = [m[j], m[i]]; } return m; };
  // One card falling into `slot`. Resolves when it has settled. The slot is the server's; only the path is made up here.
  function dzFall(slot, fast, near) {
    return new Promise((resolve) => {
      const c = $('dropCard'); if (!c) return resolve();
      const s = dzScale(), w = DG.CW * s, h = DG.CH * s;
      const seg = fast ? 230 : 430, lead = fast ? 250 : 460, tail = fast ? 320 : 620, hold = near ? 560 : 0;
      const moves = dzRoute(slot), kf = [], hits = [];
      const total = lead + DG.ROWS * seg + hold + tail;
      const push = (px, py, rot, t) => kf.push({ transform: `translate(${px * s - w / 2}px, ${py * s - h / 2}px) rotate(${rot}deg)`, offset: Math.min(1, t / total) });
      const pegTop = (r) => DG.Y0 + DG.DY * r - 24;
      let x = DG.X0, y = pegTop(0), time = lead;
      push(x, DG.TOP, 0, 0);
      for (let k = 1; k <= 8; k++) { const u = k / 8; push(x, DG.TOP + (pegTop(0) - DG.TOP) * u * u, 0, lead * u); }
      for (let r = 0; r < DG.ROWS; r++) {
        hits.push({ r, time, x });
        const dir = moves[r], nx = x + dir * DG.DX, ny = r < DG.ROWS - 1 ? pegTop(r + 1) : DG.SLOT_Y + 10, spin = dir * (14 + Math.random() * 10);
        for (let k = 1; k <= 10; k++) { const u = k / 10, hh = 20 * Math.sin(Math.PI * Math.min(1, u * 1.05)); push(x + (nx - x) * u, y + (ny - y) * u * u * .75 + (ny - y) * u * .25 - hh * (1 - u) * .9, spin * (1 - (1 - u) * (1 - u)) * (r % 2 ? 1 : 1.2), time + seg * u); }
        x = nx; y = ny; time += seg;
      }
      if (near) { for (let k = 1; k <= 10; k++) push(x, y - 4 * Math.sin(k * 1.3), 10 * Math.sin(k * 1.9) * (1 - k / 11), time + hold * k / 10); time += hold; }
      for (let k = 1; k <= 6; k++) push(x, y + 16 * Math.sin(k / 6 * Math.PI / 2), 0, time + tail * k / 6 * .8);
      push(x, y + 16, 0, total);
      kf.sort((a, b) => a.offset - b.offset);
      const settle = () => { dzPlaceCard(x, y + 16); resolve(); };
      if (motionOff() || typeof c.animate !== 'function') return settle();
      const anim = c.animate(kf, { duration: total, easing: 'linear', fill: 'forwards' });
      hits.forEach(h => setTimeout(() => {
        const peg = $('dropBoard') && $('dropBoard').querySelector(`[data-peg="${h.r}:${Math.round(h.x)}"]`);
        if (peg && peg.animate) peg.animate([{ opacity: .95 }, { opacity: 0 }], { duration: 320 });
        if (audio.playDropPeg) audio.playDropPeg(h.r);
      }, h.time));
      if (near && audio.playDropAww) setTimeout(() => audio.playDropAww(), time - hold + 80);
      anim.finished.then(() => { try { anim.commitStyles(); } catch (e) { /* fine */ } anim.cancel(); settle(); }, settle);
    });
  }
  function dzLand(slot, near) {
    const sl = $('dropBoard') && $('dropBoard').querySelector(`[data-slot="${slot}"] .dz-sglow`);
    if (sl && sl.animate) sl.animate([{ opacity: 0 }, { opacity: .8 }, { opacity: .45 }], { duration: 700, fill: 'forwards' });
    const rare = slot === 1 ? 0 : slot === 5 ? 6 : -1;
    if (near && rare >= 0 && !motionOff()) {
      const g = $('dropBoard').querySelector(`[data-slot="${rare}"]`);
      if (g && g.animate) g.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(-2px)' }, { transform: 'translateX(0)' }], { duration: 420 });
    }
  }
  function dzClearGlow() { document.querySelectorAll('#dropBoard .dz-sglow').forEach(e => { e.getAnimations && e.getAnimations().forEach(a => a.cancel()); e.setAttribute('opacity', 0); }); }
  async function dropGo(n) {
    if (D.busy || !DZR || !signedIn() || !(D.cards > 0)) return;
    D.busy = true; $('dropBtn').disabled = true; $('dropAllBtn').disabled = true; $('dropBtn').textContent = 'DROPPING';
    $('dropResult').innerHTML = ''; dzClearGlow();
    let res;
    try { res = await callEconomy('dropzone', { op: 'drop', n: n === 'all' ? D.cards : 1 }); }
    catch (e) { D.busy = false; $('dropResult').innerHTML = '<span>Couldn’t drop right now. Check your connection and try again.</span>'; dzPaint(); return; }
    if (res.none || !res.drops || !res.drops.length) { D.busy = false; D.cards = Number(res.cards) || 0; $('dropResult').innerHTML = '<span>You have no cards left.</span>'; dzPaint(); return; }
    const drops = res.drops, multi = drops.length > 1, before = D.cards;
    D.shown = before;
    for (let i = 0; i < drops.length; i++) {
      const dr = drops[i], near = !multi && (dr.slot === 1 || dr.slot === 5);
      dzClearGlow(); dzPlaceCard(); D.shown = before - i - 1; dzPaint();
      if (multi) $('dropResult').innerHTML = `<span>Dropping ${i + 1} of ${drops.length}…</span>`;
      await dzFall(dr.slot, multi, near);
      dzLand(dr.slot, near);
      if (!multi) {
        const sl = DZR.slots[dr.slot], rare = dr.slot === 1 ? 'avatar' : dr.slot === 5 ? 'card back' : '';
        $('dropResult').innerHTML = `<span>${near && rare ? `So close! One slot from the ${rare}. ` : ''}You won <b>${dr.duplicate ? `${Number(dr.paid).toLocaleString('en-GB')} Diamonds (you own it)` : dzName(sl)}</b>.</span>`;
      }
      if (multi) await wait(motionOff() ? 0 : 140);
    }
    D.shown = null; D.cards = Number(res.cards) || 0; D.busy = false;
    const newItems = drops.filter(d => d.kind === 'item' && !d.duplicate);
    if (newItems.length) { newItems.forEach(d => { D.owned = { ...D.owned, [d.itemId]: true }; }); }
    applyEconomy({ diamonds: res.diamonds, spin: newItems.length ? { kind: 'item' } : null });
    const dia = drops.reduce((a, d) => a + (d.kind === 'diamonds' || d.duplicate ? Number(d.paid || d.amount) : 0), 0);
    const first = newItems[0];
    const tier = first ? 'item' : drops.some(d => d.duplicate) ? 'jackpot' : tierOf({ kind: 'diamonds', amount: multi ? dia / drops.length : dia });
    if (multi) {
      $('dropResult').innerHTML = `<span>Dropped <b>${drops.length} cards</b>: <b>${dia.toLocaleString('en-GB')} Diamonds</b>${newItems.length ? ' and <b>' + newItems.map(d => dzName(DZR.slots[d.slot])).join(' + ') + '</b>' : ''}.</span>`;
    }
    celebrate(tier); dzPaint(); paint();
    const popAt = motionOff() ? 0 : 450;
    setTimeout(() => {
      if (first) return winPop({ eyebrow: multi ? `${drops.length} cards` : 'New item', art: winArt(first.itemId), big: dzName(DZR.slots[first.slot]), sub: multi ? `Plus ${dia.toLocaleString('en-GB')} Diamonds. Find it in Custom. It is Drop Zone-only.` : 'Find it in Custom. It is Drop Zone-only.', tier: 'item' });
      const dup = drops.find(d => d.duplicate);
      if (!multi && dup) return winPop({ eyebrow: 'Already owned', big: `+${Number(dup.paid).toLocaleString('en-GB')} Diamonds`, sub: `You own the ${dzName(DZR.slots[dup.slot])}, so it pays Diamonds instead.`, tier: 'jackpot' });
      winPop({ eyebrow: multi ? `${drops.length} cards` : 'You won', big: `+${dia.toLocaleString('en-GB')} Diamonds`, sub: 'Added to your balance.', tier });
    }, popAt);
  }
  function dzOpen() {
    if (!DZR) return;
    if (!D.built || !$('dropCard')) dzBuild(); else { let back = ''; try { back = snapshotCardBackHtml(snapshotCardStyle(), 'w-full h-full'); } catch (e) { /* default */ } const c = $('dropCard'); if (c && back && !D.busy) { c.innerHTML = back; dzPlaceCard(); } }
    const el = $('dropOdds');
    if (el) el.innerHTML = DZR.slots.map((sl, i) => `<li><span class="lw-dot" style="background:${DZ_COL[i]}"></span><span class="lw-odds-name">${dzName(sl)}${sl.kind === 'item' && D.owned[sl.itemId] ? ` (you own it, pays ${DZR.dupeDiamonds.toLocaleString('en-GB')} Diamonds)` : ''}</span><b>${sl.weight}%</b></li>`).join('');
    const pz = $('dropPrize');
    if (pz && typeof avatarHtml === 'function') {
      const own = (id) => D.owned[id], pay = `You own it, so it pays ${DZR.dupeDiamonds.toLocaleString('en-GB')} Diamonds`;
      pz.innerHTML = `<div class="lw-prize-row">${avatarHtml('avatar-dropzone', 52)}<span class="lw-prize-t"><b>Drop Zone avatar</b><span>Far left slot · ${own('avatar-dropzone') ? pay : '1% chance'}</span></span></div>`
        + `<div class="lw-prize-row"><span class="lw-prize-back"><span class="custom-card-back ${getCosmeticBackClass('back-dropzone')} lw-backprev"></span></span><span class="lw-prize-t"><b>Drop Zone card back</b><span>Far right slot · ${own('back-dropzone') ? pay : '1% chance'}</span></span></div>`;
    }
    dzPaint();
  }
  // A win elsewhere (match, Ranked, Gauntlet) came back with the new card count: show the card in the home circle.
  function dropNote(z) {
    if (!z || !Number.isFinite(Number(z.cards))) return;
    D.cards = Number(z.cards);
    dzPaint();
    if (z.awarded) {
      const chip = $('homeDropChip');
      if (chip && !motionOff()) { chip.classList.remove('dz-bump'); void chip.offsetWidth; chip.classList.add('dz-bump'); }
      if (typeof notifyBanner === 'function') notifyBanner(`You earned a Drop Zone card. You have ${D.cards}.`);
      if (audio.playWheelWin) audio.playWheelWin('small');
    }
  }

  function setTab(tab) {
    if (S.busy || M.busy || D.busy) return;
    S.tab = tab === 'cards' ? 'cards' : tab === 'scratch' ? 'scratch' : tab === 'drop' ? 'drop' : 'spin';
    $('wheelPanel').classList.toggle('hidden', S.tab !== 'spin');
    $('montyPanel').classList.toggle('hidden', S.tab !== 'cards');
    $('scratchPanel').classList.toggle('hidden', S.tab !== 'scratch');
    $('dropPanel').classList.toggle('hidden', S.tab !== 'drop');
    document.querySelectorAll('.lw-tab').forEach(b => { const on = b.dataset.lwTab === S.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    const th = S.theme;
    $('wheelTitle').textContent = S.tab === 'drop' ? 'Drop Zone' : S.tab === 'scratch' ? 'Scratch Card' : S.tab === 'cards' ? 'Three Cards' : th ? `${th.name} Spin` : 'Daily Spin';
    if (S.tab === 'cards' && M.phase !== 'pick') {
      montyBuild();
      const r = S.monty && S.monty.result; if (r) montyShowDone(r); else { M.phase = ''; $('montyResult').innerHTML = ''; }
    }
    if (S.tab === 'scratch') scratchOpen();
    if (S.tab === 'drop') dzOpen();
    paint();
  }
  function open(solo) {
    if (!signedIn()) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
    if (!S.busy && !M.busy) S.built = false;
    build();
    paintPrize();
    $('wheelSvg').style.transform = `rotate(${S.angle}deg)`;
    $('wheelModal').classList.remove('hidden');
    if (!S.busy) $('wheelResult').innerHTML = S.status && !S.status.canSpin && S.status.last && prize(S.status.last.id) ? `<span>Today’s prize: ${nameOf(view(prize(S.status.last.id)))}.</span>` : '';
    if (solo) $('wheelModal').dataset.solo = solo; else delete $('wheelModal').dataset.solo;
    setTab(solo || 'spin');
    paint();
    refresh().then(() => { if (!S.busy && !M.busy) { const was = S.built; if (!was) { build(); paintPrize(); } } });
    ($('wheelModal').querySelector('.lw-tab.on') || $('wheelCloseBtn')).focus({ preventScroll: true });
  }
  function close() { if (closeWin()) return; if (!S.busy && !M.busy && !SC.busy && !D.busy) { scratchSettle(); $('wheelModal')?.classList.add('hidden'); } }

  // Hover (PC) or keyboard focus on either home circle explains it in the shared info bubble.
  const CHIP_TIPS = {
    homeWheelChip: '<p><b>Daily Spin</b></p><p>One free spin a day for Diamonds, XP or a wheel-only avatar and card back.</p>',
    homeDropChip: '<p><b>Drop Zone</b></p><p>Drop a card through the pegs into a prize slot. Every game you win earns a card.</p>',
    homeScratchChip: '<p><b>Scratch Card</b></p><p>One free card a day. Scratch off the foil and get three of a kind in a line, like tic tac toe, to win Diamonds or a Prism item.</p>',
    homeMontyChip: '<p><b>Three Cards</b></p><p>Once a week, follow the 300 Diamond card as it is shuffled, then pick it.</p>'
  };
  const chipTip = (e) => {
    const c = e.target.closest && e.target.closest('#homeWheelChip, #homeMontyChip, #homeScratchChip, #homeDropChip');
    if (!c || typeof showInfoPop !== 'function') return;
    if (e.type === 'mouseover' && !window.matchMedia('(hover: hover)').matches) return;
    showInfoPop(c, CHIP_TIPS[c.id], { hover: true, side: c.id === 'homeScratchChip' || c.id === 'homeDropChip' ? 'right' : 'left' });
  };
  document.addEventListener('mouseover', chipTip);
  document.addEventListener('focusin', (e) => { if (e.target.matches && e.target.matches(':focus-visible')) chipTip(e); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('#homeWheelChip, #homeMontyChip, #homeScratchChip, #homeDropChip') && typeof hideInfoPop === 'function') hideInfoPop(); });

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest && t.closest('#homeWheelChip')) open('spin');
    else if (t.closest && t.closest('#homeMontyChip')) open('cards');
    else if (t.closest && t.closest('#homeScratchChip')) open('scratch');
    else if (t.closest && t.closest('#homeDropChip')) open('drop');
    else if (t.id === 'dropBtn') dropGo(1);
    else if (t.id === 'dropAllBtn') dropGo('all');
    else if (t.id === 'dropOddsBtn') { const o = $('dropOdds'), on = o.classList.toggle('hidden'); t.setAttribute('aria-expanded', String(!on)); }
    else if (t.id === 'scratchBtn') scratchGet();
    else if (t.id === 'scratchRevealBtn') scratchReveal();
    else if (t.id === 'scratchOddsBtn') { const o = $('scratchOdds'), on = o.classList.toggle('hidden'); t.setAttribute('aria-expanded', String(!on)); }
    else if (t.closest && t.closest('#menuWheelBtn')) { if (typeof closeHamburgerMenu === 'function') closeHamburgerMenu(); open('spin'); }
    else if (t.id === 'wheelWinOk' || t.id === 'wheelWinPop') closeWin();
    else if (t.id === 'wheelCloseBtn' || t.id === 'wheelModal') close();
    else if (t.id === 'wheelSpinBtn') spin();
    else if (t.closest && t.closest('.lw-tab')) setTab(t.closest('.lw-tab').dataset.lwTab);
    else if (t.id === 'montyBtn') montyStart();
    else if (t.closest && t.closest('.lw-mc')) montyPick(t.closest('.lw-mc'));
    else if (t.closest && t.closest('#wheelOddsBtn')) { const list = $('wheelOdds'), btn = $('wheelOddsBtn'); const show = list.classList.contains('hidden'); list.classList.toggle('hidden', !show); btn.setAttribute('aria-expanded', String(show)); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.status && !S.status.canSpin) refresh(); });

  window.ShWheel = {
    open, close, winPop, closeWin, dropNote,
    onSignIn() { S.angle = 0; S.status = null; setTimeout(() => { if (typeof devTestSuiteRunning !== 'undefined' && devTestSuiteRunning) return; refresh(); startTimer(); }, 2500); },
    reset() { D.cards = null; S.status = null; S.monty = null; S.owned = {}; S.built = false; S.angle = 0; clearInterval(S.timer); paint(); $('wheelModal')?.classList.add('hidden'); },
    refresh, state: S, tierOf
  };
})();
