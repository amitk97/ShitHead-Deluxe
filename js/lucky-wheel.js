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
  const S = { status: null, busy: false, angle: 0, tick: null, timer: null, built: false };

  const pct = p => { const v = p.weight / 10; return `${v < 1 ? v.toFixed(1) : Math.round(v * 10) / 10}%`; };
  const nameOf = p => p.kind === 'diamonds' ? `${p.amount} Diamonds` : p.kind === 'xp' ? `${p.amount} XP` : p.itemId.startsWith('avatar') ? `${p.name} avatar` : `${p.name} card back`;
  const pt = (r, deg) => [C + r * Math.sin(deg * Math.PI / 180), C - r * Math.cos(deg * Math.PI / 180)];
  const wedge = (r, a0, a1) => { const [x0, y0] = pt(r, a0), [x1, y1] = pt(r, a1); return `M${C} ${C}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`; };
  const STAR = (x, y, s) => `<path d="M${x} ${y - s}l${s * .3} ${s * .62} ${s * .7} .1-${s * .52} ${s * .48} ${s * .15} ${s * .7}-${s * .63}-${s * .36}-${s * .63} ${s * .36} ${s * .15}-${s * .7}-${s * .52}-${s * .48} ${s * .7}-.1Z" fill="#fff7d6"/>`;

  function label(p, i) {
    const a = i * SLICE, rot = `transform="rotate(${a} ${C} ${C})"`;
    if (p.kind === 'item') { const av = p.itemId.startsWith('avatar'); const t = (y, w) => `<text x="${C}" y="${y}" text-anchor="middle" font-size="${av ? 10 : 8.5}" font-weight="900" fill="#fff" letter-spacing="${av ? .5 : .2}">${w}</text>`; return `<g ${rot}>${STAR(C, C - R * .8, 9)}${av ? t(C - R * .56, 'AVATAR') : t(C - R * .6, 'CARD') + t(C - R * .48, 'BACK')}</g>`; }
    if (p.kind === 'xp') return `<g ${rot}><text x="${C}" y="${C - R * .72}" text-anchor="middle" font-size="20" font-weight="900" fill="#fff">${p.amount}</text><text x="${C}" y="${C - R * .56}" text-anchor="middle" font-size="10" font-weight="900" fill="#d9f99d" letter-spacing="1">XP</text></g>`;
    const big = String(p.amount).length > 3;
    return `<g ${rot}><use href="#ic-gem" x="${C - 8}" y="${C - R * .93}" width="16" height="16"/><text x="${C}" y="${C - R * .62}" text-anchor="middle" font-size="${big ? 17 : 20}" font-weight="900" fill="#fff">${p.amount}</text></g>`;
  }

  function build() {
    if (S.built) return;
    const svg = $('wheelSvg');
    if (!svg) return;
    const slices = WHEEL.segments.map((id, i) => `<path d="${wedge(R, i * SLICE - SLICE / 2, i * SLICE + SLICE / 2)}" fill="${COLOURS[id]}" stroke="rgba(5,8,22,.55)" stroke-width="1.2"/>`).join('');
    const glow = WHEEL.segments.map((id, i) => `<path d="${wedge(R, i * SLICE - SLICE / 2, i * SLICE + SLICE / 2)}" fill="url(#lw-shade)"/>`).join('');
    const labels = WHEEL.segments.map((id, i) => label(prize(id), i)).join('');
    const pegs = WHEEL.segments.map((id, i) => { const [x, y] = pt(R + 6, i * SLICE + SLICE / 2); return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3.4" fill="#fff7d6" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`; }).join('');
    svg.innerHTML = `<defs>
      <linearGradient id="lw-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#f59e0b"/><stop offset="1" stop-color="#8a5a0a"/></linearGradient>
      <radialGradient id="lw-shade" cx=".5" cy=".5" r=".5"><stop offset=".25" stop-color="#000" stop-opacity=".28"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></radialGradient></defs>
      <circle cx="${C}" cy="${C}" r="${R + 14}" fill="url(#lw-gold)" stroke="#3b2204" stroke-width="2"/>
      <circle cx="${C}" cy="${C}" r="${R + 2}" fill="#050816"/>
      ${slices}${glow}${labels}${pegs}
      <circle cx="${C}" cy="${C}" r="24" fill="url(#lw-gold)" stroke="#3b2204" stroke-width="2"/>
      <path d="M${C} ${C - 13}l3.6 7.4 8.1 1.1-5.9 5.7 1.4 8-7.2-3.9-7.2 3.9 1.4-8-5.9-5.7 8.1-1.1Z" fill="#7c2d12"/>`;
    $('wheelOdds').innerHTML = WHEEL.prizes.map(p => `<li><span class="lw-dot" style="background:${COLOURS[p.id]}"></span><span class="lw-odds-name">${nameOf(p)}</span><b>${pct(p)}</b></li>`).join('')
      + `<li class="lw-odds-note">Wheel-only items you already own pay ${WHEEL.dupeDiamonds} Diamonds instead. XP prizes only come up while levels are on.</li>`;
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
    const chip = $('homeWheelChip'), ready = !!(S.status && S.status.canSpin);
    if (chip) {
      chip.classList.toggle('hidden', !S.status);
      chip.classList.toggle('lw-ready', ready);
      const sub = $('homeWheelSub'); if (sub) sub.textContent = ready ? 'Your free spin is ready' : nextText();
    }
    document.querySelectorAll('[data-wheel-dot]').forEach(el => el.classList.toggle('hidden', !ready));
    const btn = $('wheelSpinBtn');
    if (btn && !S.busy) { btn.disabled = !ready; btn.textContent = ready ? 'SPIN' : nextText().toUpperCase(); }
    const sub = $('wheelSub'); if (sub) sub.textContent = ready ? 'One free spin every day.' : 'You have used today’s spin.';
  }
  async function refresh() {
    if (!signedIn()) { S.status = null; paint(); return; }
    const uid = currentUser.uid;
    try {
      const r = await callEconomy('wheel', { op: 'status' });
      if (currentUser && currentUser.uid === uid) S.status = { canSpin: !!r.canSpin, last: r.last || null };
    } catch (e) { /* offline or not deployed yet: the chip stays hidden */ }
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
  const tierOf = p => p.kind === 'item' ? 'item' : p.id === 'd1000' ? 'jackpot' : (p.kind === 'diamonds' && p.amount >= 250) ? 'big' : (p.kind === 'diamonds' && p.amount >= 100) || p.id === 'xp150' ? 'mid' : 'small';

  function showResult(sp) {
    const p = prize(sp.prize), el = $('wheelResult');
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
    const sp = res.spin, p = prize(sp.prize);
    const slots = WHEEL.segments.map((id, i) => id === sp.prize ? i : -1).filter(i => i >= 0);
    const idx = slots[Math.floor(Math.random() * slots.length)];
    const from = S.angle, to = Math.ceil(from / 360) * 360 + 360 * TURNS - idx * SLICE + (Math.random() * 2 - 1) * SLICE * .32;
    const el = $('wheelSvg');
    const done = () => {
      S.angle = to; el.style.transform = `rotate(${to}deg)`;
      S.busy = false; S.status = { canSpin: false, last: { id: sp.prize } };
      applyEconomy(res); showResult(sp); celebrate(tierOf(p)); paint(); startTimer();
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
    el.innerHTML = `<div class="lw-prize-row">${avatarHtml('avatar-wheel', 52)}<span class="lw-prize-t"><b>Lucky Wheel avatar</b><span>Your profile picture · ${odds('avatar')}</span></span></div>`
      + `<div class="lw-prize-row"><span class="lw-prize-back"><span class="custom-card-back ${getCosmeticBackClass('back-wheel')} lw-backprev"></span></span><span class="lw-prize-t"><b>Lucky Spin card back</b><span>The design on your cards' backs · ${odds('back')}</span></span></div>`
      + `<span class="lw-prize-note">Wheel-only. You can't buy them.</span>`;
  }
  function open() {
    if (!signedIn()) { if (typeof openAuthModal === 'function') openAuthModal(); return; }
    build();
    paintPrize();
    $('wheelSvg').style.transform = `rotate(${S.angle}deg)`;
    $('wheelModal').classList.remove('hidden');
    if (!S.busy) $('wheelResult').innerHTML = S.status && !S.status.canSpin && S.status.last && prize(S.status.last.id) ? `<span>Today’s prize: ${nameOf(prize(S.status.last.id))}.</span>` : '';
    paint(); refresh();
    $('wheelSpinBtn').focus({ preventScroll: true });
  }
  function close() { if (!S.busy) $('wheelModal')?.classList.add('hidden'); }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest && t.closest('#homeWheelChip')) open();
    else if (t.closest && t.closest('#menuWheelBtn')) { if (typeof closeHamburgerMenu === 'function') closeHamburgerMenu(); open(); }
    else if (t.id === 'wheelCloseBtn' || t.id === 'wheelModal') close();
    else if (t.id === 'wheelSpinBtn') spin();
    else if (t.closest && t.closest('#wheelOddsBtn')) { const list = $('wheelOdds'), btn = $('wheelOddsBtn'); const show = list.classList.contains('hidden'); list.classList.toggle('hidden', !show); btn.setAttribute('aria-expanded', String(show)); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.status && !S.status.canSpin) refresh(); });

  window.ShWheel = {
    open, close,
    onSignIn() { S.angle = 0; S.status = null; setTimeout(() => { if (typeof devTestSuiteRunning !== 'undefined' && devTestSuiteRunning) return; refresh(); startTimer(); }, 2500); },
    reset() { S.status = null; S.angle = 0; clearInterval(S.timer); paint(); $('wheelModal')?.classList.add('hidden'); },
    refresh, state: S, tierOf
  };
})();
