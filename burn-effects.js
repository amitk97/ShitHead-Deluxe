
    const particleCanvas = document.getElementById('particleCanvas');
    const pCtx = particleCanvas.getContext('2d');
    let particles = [];

    function resizeParticleCanvas() {
      particleCanvas.width = window.innerWidth;
      particleCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeParticleCanvas);
    resizeParticleCanvas();

    class EmberParticle {
      constructor(x, y, palette) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.8) * 9;
        this.radius = Math.random() * 4 + 2;
        this.alpha = 1;
        const colors = palette || ['#f59e0b','#ef4444','#fbbf24'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.decay = Math.random() * 0.025 + 0.015;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.15;
        this.alpha -= this.decay;
      }
      draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(this.alpha, 0);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function triggerBurnEmberExplosion(x, y, palette, particleCount = 45) {
      for (let i = 0; i < particleCount; i++) {
        particles.push(new EmberParticle(x, y, palette));
      }
      const table = document.getElementById('gameTable');
      table.classList.add('animate-screen-shake');
      setTimeout(() => table.classList.remove('animate-screen-shake'), 400);
    }

    function renderParticleLoop() {
      pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw(pCtx);
        if (particles[i].alpha <= 0) {
          particles.splice(i, 1);
        }
      }
      requestAnimationFrame(renderParticleLoop);
    }
    renderParticleLoop();


    // ============================================================
    // SHAPE BURN EFFECTS
    // playBurnFx draws the premium burn effects as real shapes (bolts,
    // flames, wrapped sweets, paint, smoke) with the Web Animations API.
    // host: an absolutely-positioned container; x/y: impact point inside it;
    // scale: 1 in game, smaller inside the Shop/Custom preview stage.
    // ============================================================
    const LEVEL_BURN_IDS = ['burn-lvl-spark-snap', 'burn-lvl-smoke-burst', 'burn-lvl-inferno-sweep', 'burn-lvl-hellfire-spiral', 'burn-lvl-royal-incineration', 'burn-lvl-shitstorm'];
    const SHAPE_BURN_EFFECTS = new Set(['default', 'burn-electric', 'burn-coloured', 'burn-sweets', 'burn-paint', 'burn-smoke', 'burn-blackhole', 'burn-origami', 'burn-pixel', 'burn-lava', ...LEVEL_BURN_IDS]);
    let bfxGradientSeq = 0;
    const bfxRand = (min, max) => min + Math.random() * (max - min);
    function bfxAdd(host, html, x, y, w, h) {
      const el = document.createElement('div');
      el.className = 'bfx';
      el.style.left = `${x - w / 2}px`;
      el.style.top = `${y - h / 2}px`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.innerHTML = html;
      host.appendChild(el);
      return el;
    }
    function bfxAnimate(el, keyframes, options) {
      // All visual beats and their tails share the shortened owner victory clock.
      const speed = Number(el.closest('[data-owner-fx-speed]')?.dataset.ownerFxSpeed) || 1;
      if (speed !== 1) options = { ...options, duration:(options.duration || 1000) / speed, delay:(options.delay || 0) / speed };
      const total = (options.duration || 1000) + (options.delay || 0);
      if (typeof el.animate !== 'function') { setTimeout(() => el.remove(), total); return; }
      const anim = el.animate(keyframes, { fill: 'both', ...options });
      anim.onfinish = () => el.remove();
      setTimeout(() => el.remove(), total + 400); // safety net
    }
    function bfxLightning(host, x, y, k) {
      const flash = document.createElement('div');
      flash.className = 'bfx-flash';
      flash.style.background = 'radial-gradient(circle at ' + x + 'px ' + y + 'px, rgba(224,242,254,.75), rgba(56,189,248,.25) 35%, transparent 70%)';
      host.appendChild(flash);
      bfxAnimate(flash, [{ opacity: 0 }, { opacity: 1, offset: .08 }, { opacity: .1, offset: .2 }, { opacity: .8, offset: .32 }, { opacity: .15, offset: .5 }, { opacity: .6, offset: .62 }, { opacity: 0 }], { duration: 900 });
      for (let b = 0; b < 4; b++) {
        const w = 90 * k, h = 190 * k;
        const pts = [[w / 2 + bfxRand(-w * .35, w * .35), 0]];
        for (let i = 1; i < 9; i++) pts.push([w / 2 + bfxRand(-w * .3, w * .3) * (1 - i / 10), (h * i) / 9]);
        pts.push([w / 2, h]);
        const main = pts.map(p => p.join(',')).join(' ');
        const fork = pts[3];
        const branch = [fork, [fork[0] + bfxRand(-w * .45, w * .45), fork[1] + h * .18], [fork[0] + bfxRand(-w * .5, w * .5), fork[1] + h * .32]].map(p => p.join(',')).join(' ');
        const svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
          <polyline points="${main}" fill="none" stroke="#38bdf8" stroke-width="${11 * k}" stroke-opacity=".4" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${branch}" fill="none" stroke="#7dd3fc" stroke-width="${3 * k}" stroke-opacity=".6" stroke-linejoin="round"/>
          <polyline points="${main}" fill="none" stroke="#ffffff" stroke-width="${3.4 * k}" stroke-linejoin="round" stroke-linecap="round"/>
          <polyline points="${branch}" fill="none" stroke="#e0f2fe" stroke-width="${1.2 * k}" stroke-linejoin="round"/></svg>`;
        const bolt = bfxAdd(host, svg, x + bfxRand(-26, 26) * k, y - h / 2, w, h);
        bfxAnimate(bolt, [{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: .25, offset: .3 }, { opacity: 1, offset: .45 }, { opacity: .6, offset: .7 }, { opacity: 0 }], { duration: 460, delay: [0, 40, 260, 420][b] });
      }
      const core = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#fff,#bae6fd 35%,rgba(56,189,248,.35) 60%,transparent 72%)"></div>`, x, y, 70 * k, 70 * k);
      bfxAnimate(core, [{ transform: 'scale(.2)', opacity: 1 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 650, delay: 60, easing: 'ease-out' });
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2, d = bfxRand(40, 95) * k;
        const spark = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:2px;background:#e0f2fe;box-shadow:0 0 6px #38bdf8"></div>`, x, y, 2.5 * k, 11 * k);
        const deg = (a * 180) / Math.PI + 90;
        bfxAnimate(spark, [{ transform: `rotate(${deg}deg) translate(0,0)`, opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) rotate(${deg}deg)`, opacity: 0 }], { duration: bfxRand(380, 560), delay: bfxRand(60, 520), easing: 'ease-out' });
      }
    }
    const BFX_FLAME_PATH = 'M32 11c4 8.5 14 13 14 25.5C46 45 40 52 32 52s-14-7-14-15.5c0-7 4-11.5 7-15.5 0 6 3 9 5 9-1-6.5-.5-12.5 2-19Z';
    // Coloured Flame (v308, owner: procedural; every flame its own element): spectral violet, pink,
    // cyan and indigo flames, each an SVG tongue with its own flicker, sway, size and life (sampled
    // from its own sine mix), ignite under the REAL top card (0-CF_START) and lick it. From CF_START a
    // jagged burning edge climbs the card to the top by CF_END (clip-path, a white-pink-violet-char
    // glow riding it); a band of card just above the edge curls over in 3D about the edge (its own
    // preserve-3d box, rotateX), so its underside, the burner's own back, shows; the card itself
    // tilts back, rises in the heat and warps. Edge flames ride the burning edge up the card, a bed of
    // flames stays below, spectral sparks and coloured haze rise, and the fire dies down by 2.0s.
    // Sound: ShLevel3D.sound('burn-coloured') on the same times.
    const CF_MS = 2000, CF_START = .3, CF_END = 1.55;
    const CF_PALETTE = [['#4c1d95', '#a855f7', '#e9d5ff'], ['#831843', '#ec4899', '#fbcfe8'], ['#155e75', '#22d3ee', '#cffafe'], ['#312e81', '#6366f1', '#c7d2fe']];
    function bfxColouredFlame(host, x, y, k) {
      const { layer, W, H, cx, cy, radius, backCls, anim, end, face } = procBurnStage(host, x, y, CF_MS);
      const D = CF_MS / 1000, N = 80, rand = (a, b) => a + Math.random() * (b - a), id = ++pfxSeq;
      const TIMES = Array.from({ length: N + 1 }, (_, i) => i / N), clamp = v => Math.max(0, Math.min(1, v));
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const add = (css, html = '', cls = 'bfx') => { const el = document.createElement('div'); el.className = cls; el.style.cssText = css; el.innerHTML = html; layer.appendChild(el); return el; };
      // How far the burn has climbed (card pixels from the top: H = untouched, 0 = gone), and the heat.
      const cutAt = T => H * (1 - clamp((T - CF_START) / (CF_END - CF_START)) ** 1.35 * 1.04);
      const lift = T => -H * (.06 * ease(clamp(T / .3)) + .1 * clamp((T - CF_START) / (CF_END - CF_START)));
      const tilt = T => 22 * ease(clamp((T - CF_START) / (CF_END - CF_START)));
      const edgeY = T => cy - H / 2 + lift(T) + cutAt(T) * Math.cos(tilt(T) * Math.PI / 180);
      // ---- Glow behind it all and coloured haze.
      const glow = add(`position:absolute;left:${cx - H * 1.3}px;top:${cy - H * 1.2}px;width:${H * 2.6}px;height:${H * 2.6}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(192,132,252,.5),rgba(236,72,153,.22) 45%,rgba(34,211,238,.08) 70%,transparent)`);
      anim(glow, TIMES.map(o => { const T = o * D, on = clamp(T / .3) * (1 - clamp((T - 1.6) / .38)); return { offset: o, opacity: on * (.75 + .25 * Math.sin(T * 17)), transform: `translateY(${lift(T)}px) scale(${.6 + .5 * on})` }; }));
      // ---- The card: main face above the curl band, the curling band, all in one 3D box.
      const box = add(`position:absolute;left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;will-change:transform;transform-style:preserve-3d;transform-origin:50% 100%`);
      const band = H * .14, sway = rand(5, 9) * (Math.random() < .5 ? -1 : 1);
      const main = document.createElement('div');
      main.style.cssText = `position:absolute;inset:0`;
      const char = document.createElement('div');
      const charBg = (deep) => `linear-gradient(to top,#fdf4ff 0,#f0abfc 3%,#c084fc 7%,rgba(88,28,135,.9) 13%,rgba(30,10,40,${deep}) 24%,rgba(30,10,40,0) 42%)`;
      char.style.cssText = `position:absolute;left:-2px;top:0;width:${W + 4}px;height:${H}px;background:${charBg(.6)}`;
      main.append(face(), char);
      const curl = document.createElement('div'); // the band just above the edge, curling over
      curl.style.cssText = `position:absolute;inset:0;will-change:transform;transform-style:preserve-3d`;
      const cFront = document.createElement('div'), cBack = document.createElement('div');
      cFront.style.cssText = `position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden`;
      const cFrontChar = document.createElement('div');
      cFrontChar.style.cssText = `position:absolute;inset:0;background:linear-gradient(to top,rgba(240,171,252,.9),rgba(88,28,135,.55) 8%,rgba(20,8,28,.35) 14%)`;
      cFront.append(face(), cFrontChar);
      cBack.style.cssText = `position:absolute;inset:0;transform:rotateX(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden`;
      cBack.innerHTML = `<div class="custom-card-back ${backCls}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;border-radius:${radius};margin:0"></div><div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(240,171,252,.85),rgba(88,28,135,.5) 8%,rgba(20,8,28,.3) 14%)"></div>`;
      curl.append(cFront, cBack);
      box.append(main, curl);
      const jag = Array.from({ length: 9 }, () => rand(0, 6.3)), wob = (j, T) => H * (.03 * Math.sin(j * 2.3 + T * 16 + jag[j]) + .018 * Math.sin(j * 4.9 - T * 11));
      const edgePts = (c, T, rev) => { const p = jag.map((_, j) => [110 - j * 15, c + wob(j, T)]); return (rev ? p.reverse() : p).map(([u, v]) => `${u.toFixed(1)}% ${v.toFixed(1)}px`); };
      const curlAngle = T => T < CF_START ? 0 : Math.min(118, 30 + 88 * clamp((T - CF_START) / .35)) + 6 * Math.sin(T * 13);
      anim(box, TIMES.map(o => { const T = o * D, m = clamp((T - CF_START) / (CF_END - CF_START));
        return { offset: o, transform: `translateY(${lift(T).toFixed(2)}px) rotateX(${tilt(T).toFixed(2)}deg) rotateY(${(sway * Math.sin(T * 3.1) * m).toFixed(2)}deg) skewX(${(Math.sin(T * 8) * 3 * m).toFixed(2)}deg) scale(${(1 - .08 * m).toFixed(3)})` }; }));
      anim(main, TIMES.map(o => { const T = o * D, c = cutAt(T) - band;
        return { offset: o, clipPath: `polygon(-10% -10%, 110% -10%, ${edgePts(Math.max(c, -H * .2), T).join(', ')})`,
          filter: `drop-shadow(0 0 ${(3 + 12 * clamp(T / .3)).toFixed(1)}px rgba(192,132,252,${(.3 + .5 * clamp(T / .3)).toFixed(2)}))` }; }));
      anim(char, TIMES.map(o => { const T = o * D; return { offset: o, opacity: clamp((T - CF_START + .2) / .25), transform: `translateY(${(cutAt(T) - band - H + H * .02).toFixed(1)}px)` }; }));
      anim(curl, TIMES.map(o => { const T = o * D, c = cutAt(T); return { offset: o, transformOrigin: `50% ${c.toFixed(1)}px`, transform: `rotateX(${(-curlAngle(T)).toFixed(2)}deg)` }; }));
      // The band's clip: between the edge and a band above it (the back is mirrored top to bottom).
      const bandPoly = (T, mirror) => { const c = cutAt(T), top = edgePts(c - band, T).map(s => s.replace(/(-?[\d.]+)px$/, (m0, v) => `${(mirror ? H - v : +v).toFixed(1)}px`)), bot = edgePts(c, T, true).map(s => s.replace(/(-?[\d.]+)px$/, (m0, v) => `${(mirror ? H - v : +v).toFixed(1)}px`)); return `polygon(${top.join(', ')}, ${bot.join(', ')})`; };
      const backShows = T => curlAngle(T) > 90, fadeOut = T => 1 - clamp((T - CF_END + .05) / .12);
      anim(cFront, TIMES.map(o => { const T = o * D; return { offset: o, clipPath: bandPoly(T, false), opacity: T < CF_START || backShows(T) ? 0 : fadeOut(T) }; }));
      const lastCard = anim(cBack, TIMES.map(o => { const T = o * D; return { offset: o, clipPath: bandPoly(T, true), opacity: T >= CF_START && backShows(T) ? fadeOut(T) : 0 }; }));
      // ---- Flames: each its own SVG tongue, gradient and life.
      const flame = (pal, n) => `<svg viewBox="0 0 40 100" width="100%" height="100%" style="overflow:visible"><defs><linearGradient id="cf${id}-${n}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${pal[0]}" stop-opacity=".2"/><stop offset=".22" stop-color="${pal[1]}" stop-opacity=".95"/><stop offset=".7" stop-color="${pal[2]}" stop-opacity=".85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
        <path d="M20 100C6 96 2 78 8 62C12 50 10 38 16 22C18 30 20 34 22 30C26 20 24 10 20 0C32 14 38 34 36 52C35 64 38 74 34 86C31 96 26 100 20 100Z" fill="url(#cf${id}-${n})"/>
        <path d="M20 98C13 95 12 84 15 75C17 69 17 62 20 54C22 62 25 66 25 74C27 82 27 94 20 98Z" fill="#fdf4ff" opacity=".85"/></svg>`;
      let n = 0;
      const spawn = ({ fx, base, w, h, z, t0, t1, ride }) => {
        const pal = CF_PALETTE[n % CF_PALETTE.length], el = add(`position:absolute;left:${fx - w / 2}px;top:${-h}px;width:${w}px;height:${h}px;z-index:${z};mix-blend-mode:screen;transform-origin:50% 100%`, flame(pal, n++));
        const f1 = rand(9, 15), f2 = rand(5, 8), ph = rand(0, 6.3), sw = rand(6, 14);
        anim(el, TIMES.map(o => { const T = o * D, life = clamp((T - t0) / .18) * (1 - clamp((T - t1) / .3)), by = ride ? edgeY(T) : base;
          return { offset: o, opacity: life > 0 ? Math.min(1, life * 1.3) : 0,
            transform: `translateY(${by.toFixed(1)}px) skewX(${(Math.sin(T * f2 + ph) * sw).toFixed(2)}deg) scale(${(life * (1 + .12 * Math.sin(T * f1 + ph))).toFixed(3)},${(life * (1 + .3 * Math.sin(T * f1 * 1.3 + ph * 2) + .15 * Math.sin(T * f2 * 2.1))).toFixed(3)})` }; }));
      };
      for (let i = 0; i < 9; i++) spawn({ fx: cx + (i / 8 - .5) * W * 1.05 + rand(-4, 4), w: H * rand(.18, .26), h: H * rand(.26, .4), z: i % 2 ? 4 : 2, t0: CF_START - .1 + rand(0, .12), t1: CF_END - .25 + rand(0, .1), ride: true });
      for (let i = 0; i < 14; i++) { const depth = rand(-1, 1); spawn({ fx: cx + rand(-1, 1) * W * 1.15, base: cy + H * (.5 + .12 * depth), w: H * rand(.24, .38) * (1 + .25 * depth), h: H * rand(.45, .85) * (1 + .2 * depth), z: depth > .3 ? 4 : 1, t0: rand(0, .22), t1: rand(1.4, 1.65), ride: false }); }
      // ---- Spectral sparks and coloured haze rising.
      for (let i = 0; i < 40; i++) {
        const t0 = rand(.1, 1.55), life = rand(.35, .45), s = H * rand(.02, .045), rise = H * rand(1.1, 2.6), sw = rand(-.5, .5) * H, col = ['#e9d5ff', '#f9a8d4', '#a5f3fc', '#c7d2fe'][i % 4];
        const el = add(`position:absolute;left:${cx + rand(-.8, .8) * W - s / 2}px;top:${cy + rand(-.1, .5) * H}px;width:${s}px;height:${s}px;z-index:4;border-radius:50%;background:#fff;box-shadow:0 0 ${s * 2.5}px ${s * .8}px ${col}`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'translate(0,0)' }, { offset: t0 / D, opacity: 0, transform: 'translate(0,0)' }, { offset: t0 / D + .01, opacity: 1, transform: 'translate(0,0)' },
          { offset: (t0 + life * .5) / D, opacity: 1, transform: `translate(${sw * .5}px,${-rise * .5}px)` }, { offset: (t0 + life) / D, opacity: 0, transform: `translate(${sw}px,${-rise}px) scale(.3)` }, { offset: 1, opacity: 0, transform: 'scale(.3)' }]);
      }
      for (let i = 0; i < 6; i++) {
        const t0 = rand(.3, 1.3), s = H * rand(.6, .9), el = add(`position:absolute;left:${cx + rand(-.5, .5) * W - s / 2}px;top:${cy - H * .6 - s / 2}px;width:${s}px;height:${s}px;z-index:1;border-radius:50%;background:radial-gradient(closest-side,${['rgba(168,85,247,.28)', 'rgba(236,72,153,.22)', 'rgba(34,211,238,.2)'][i % 3]},transparent)`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'scale(.5)' }, { offset: t0 / D, opacity: 0, transform: 'scale(.5)' }, { offset: (t0 + .2) / D, opacity: 1, transform: `translate(${rand(-.2, .2) * H}px,${-H * .4}px) scale(1)` }, { offset: Math.min(1, (t0 + .65) / D), opacity: 0, transform: `translate(${rand(-.4, .4) * H}px,${-H * 1.3}px) scale(1.8)` }, { offset: 1, opacity: 0, transform: 'scale(1.8)' }]);
      }
      end(lastCard);
    }
    function bfxBlobPath(r, bumps) {
      const pts = [];
      for (let i = 0; i < bumps; i++) {
        const a = (i / bumps) * Math.PI * 2;
        const rr = r * (i % 2 ? bfxRand(.62, .8) : bfxRand(.95, 1.25));
        pts.push([50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]);
      }
      return 'M' + pts.map((p, i) => {
        const n = pts[(i + 1) % pts.length];
        return `${p[0].toFixed(1)},${p[1].toFixed(1)} Q${((p[0] + n[0]) / 2 + (Math.random() - .5) * 6).toFixed(1)},${((p[1] + n[1]) / 2 + (Math.random() - .5) * 6).toFixed(1)}`;
      }).join(' ') + ` ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}Z`;
    }
    function bfxPaint(host, x, y, k) {
      const colours = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6'];
      for (let i = 0; i < 8; i++) {
        const c = colours[i % colours.length];
        const size = bfxRand(44, 82) * k;
        const drops = Array.from({ length: 5 }, () => { const a = Math.random() * Math.PI * 2, d = bfxRand(36, 48); return `<circle cx="${50 + Math.cos(a) * d}" cy="${50 + Math.sin(a) * d}" r="${bfxRand(2.5, 6)}" fill="${c}"/>`; }).join('');
        const svg = `<svg width="${size}" height="${size}" viewBox="0 0 100 100"><path d="${bfxBlobPath(26, 12)}" fill="${c}"/>${drops}<rect x="${bfxRand(40, 55)}" y="60" width="5" height="${bfxRand(14, 26)}" rx="2.5" fill="${c}"/><ellipse cx="42" cy="40" rx="8" ry="4" fill="#fff" opacity=".35"/></svg>`;
        const el = bfxAdd(host, svg, x + bfxRand(-70, 70) * k, y + bfxRand(-55, 45) * k, size, size);
        const rot = bfxRand(0, 360);
        bfxAnimate(el, [
          { transform: `rotate(${rot}deg) scale(0)`, opacity: 1 },
          { transform: `rotate(${rot}deg) scale(1.15)`, opacity: 1, offset: .12 },
          { transform: `rotate(${rot}deg) scale(1)`, opacity: 1, offset: .2 },
          { transform: `rotate(${rot}deg) scale(1) translateY(3px)`, opacity: 1, offset: .75 },
          { transform: `rotate(${rot}deg) scale(1) translateY(6px)`, opacity: 0 }
        ], { duration: 1600, delay: i * 90, easing: 'ease-out' });
      }
    }
    function bfxSmoke(host, x, y, k) {
      const puff = (size, fill, blur) => `<div style="width:100%;height:100%;border-radius:50%;filter:blur(${blur}px);background:${fill}"></div>`;
      const light = 'radial-gradient(circle,rgba(226,232,240,.7),rgba(148,163,184,.35) 50%,transparent 70%)';
      const dark = 'radial-gradient(circle,rgba(30,41,59,.85),rgba(15,23,42,.45) 50%,transparent 70%)';
      const tints = ['radial-gradient(circle,rgba(167,139,250,.5),rgba(76,29,149,.2) 55%,transparent 72%)', 'radial-gradient(circle,rgba(45,212,191,.42),rgba(17,94,89,.18) 55%,transparent 72%)'];
      // Whole effect finishes within 2 seconds (delay + duration <= 2000ms).
      // 1) A dense ground ring that rolls outward from the pile.
      for (let i = 0; i < 16; i++) {
        const size = bfxRand(50, 90) * k;
        const dir = i % 2 ? 1 : -1;
        const el = bfxAdd(host, puff(size, i % 3 ? light : dark, 5 * k), x, y + 8 * k, size, size * .7);
        bfxAnimate(el, [
          { transform: 'translate(0,0) scale(.3)', opacity: 0 },
          { transform: `translate(${dir * bfxRand(20, 50) * k}px, ${-bfxRand(0, 10) * k}px) scale(1)`, opacity: .95, offset: .2 },
          { transform: `translate(${dir * bfxRand(110, 190) * k}px, ${-bfxRand(10, 40) * k}px) scale(${bfxRand(1.8, 2.6)})`, opacity: 0 }
        ], { duration: bfxRand(1500, 1800), delay: bfxRand(0, 200), easing: 'cubic-bezier(.2,.7,.3,1)' });
      }
      // 2) A tall swirling column with a few coloured wisps through it.
      for (let i = 0; i < 34; i++) {
        const size = bfxRand(46, 110) * k;
        const fill = i % 9 === 4 ? tints[0] : i % 9 === 7 ? tints[1] : (i % 3 === 0 ? dark : light);
        const el = bfxAdd(host, puff(size, fill, 6 * k), x + bfxRand(-26, 26) * k, y + bfxRand(-6, 6) * k, size, size);
        const sway = bfxRand(-1, 1) > 0 ? 1 : -1;
        const rise = bfxRand(150, 260) * k;
        bfxAnimate(el, [
          { transform: 'translate(0,0) rotate(0deg) scale(.35)', opacity: 0 },
          { transform: `translate(${sway * 22 * k}px, ${-rise * .25}px) rotate(${sway * 60}deg) scale(1)`, opacity: .92, offset: .22 },
          { transform: `translate(${-sway * 30 * k}px, ${-rise * .6}px) rotate(${sway * 140}deg) scale(1.6)`, opacity: .6, offset: .6 },
          { transform: `translate(${sway * bfxRand(40, 90) * k}px, ${-rise}px) rotate(${sway * 220}deg) scale(${bfxRand(2, 2.8)})`, opacity: 0 }
        ], { duration: bfxRand(1300, 1650), delay: bfxRand(0, 350), easing: 'ease-out' });
      }
      // 3) A brief dark flash at the base so it reads as a "puff" moment.
      const core = bfxAdd(host, puff(90 * k, dark, 8 * k), x, y, 90 * k, 60 * k);
      bfxAnimate(core, [{ transform: 'scale(.4)', opacity: .95 }, { transform: 'scale(1.8)', opacity: 0 }], { duration: 700, easing: 'ease-out' });
    }
    // ---- Premium burns: Black Hole, Origami Fold, Pixel Blast, Lava Melt ----
    // Each is over within ~2s and removes every piece it drew: nothing stays
    // on the table (Lava Melt's pool cools and sinks away completely).
    const bfxSvg = (w, h, body) => `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">${body}</svg>`;
    const bfxHostSize = (host) => [host.clientWidth || window.innerWidth, host.clientHeight || window.innerHeight];
    // A small playing card (40x56) for effects that start from the pile.
    const bfxMiniCard = (face = '#f8fafc', mark = '#dc2626', edge = '#334155') => bfxSvg(40, 56,
      `<rect x="1.5" y="1.5" width="37" height="53" rx="5" fill="${face}" stroke="${edge}" stroke-width="2"/>
      <path d="M20 37c-9-6-13-10-13-15 0-4 3-7 6.5-7 2.6 0 4.8 1.6 6.5 4 1.7-2.4 3.9-4 6.5-4 3.5 0 6.5 3 6.5 7 0 5-4 9-13 15Z" fill="${mark}"/>`);
    // An origami swan facing right (100x80). Its wing (.ori-wing) flaps.
    const bfxSwanSvg = (a = '#f8fafc', b = '#e2e8f0', c = '#cbd5e1') => bfxSvg(100, 80,
      `<path d="M6 50 52 44 46 70Z" fill="${a}"/><path d="M52 44 88 58 46 70Z" fill="${b}"/>
      <path d="M70 58 76 10 84 58Z" fill="${a}"/><path d="M76 10 94 18 81 17Z" fill="${c}"/>
      <g class="ori-wing"><path d="M24 49 58 12 66 51Z" fill="${a}"/><path d="M24 49 58 12 46 50Z" fill="${c}"/></g>
      <path d="M6 50 52 44 46 70M76 10 80 58" stroke="rgba(71,85,105,.4)" stroke-width="1" fill="none"/>`);
    const bfxStar4 = (c) => bfxSvg(20, 20, `<path d="M10 0 12 8 20 10 12 12 10 20 8 12 0 10 8 8Z" fill="${c}"/>`);

    // Black Hole: a dark core with a glowing ring opens on the pile, the
    // cards orbit in and stretch as they fall, then it collapses (1.05s)
    // into a pop of starlight.
    function bfxBlackHole(host, x, y, k) {
      const gid = `bfx-g-${++bfxGradientSeq}`;
      const arms = [0, 90, 180, 270].map(r => `<path d="M50 50m-40 0a40 40 0 0 1 40-40" stroke="${r % 180 ? '#f59e0b' : '#a78bfa'}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".75" transform="rotate(${r} 50 50)"/>`).join('');
      const hole = bfxAdd(host, bfxSvg(100, 100, `<defs><radialGradient id="${gid}"><stop offset=".3" stop-color="#000"/><stop offset=".46" stop-color="#6d28d9"/><stop offset=".58" stop-color="#f59e0b" stop-opacity=".9"/><stop offset=".78" stop-color="#c026d3" stop-opacity=".3"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
        <circle cx="50" cy="50" r="50" fill="url(#${gid})"/>${arms}<circle cx="50" cy="50" r="24" fill="#000"/>`), x, y, 160 * k, 160 * k);
      bfxAnimate(hole, [{ transform: 'scale(0) rotate(0deg)', opacity: 0 }, { transform: 'scale(1) rotate(-160deg)', opacity: 1, offset: .18 },
        { transform: 'scale(1.1) rotate(-560deg)', opacity: 1, offset: .8 }, { transform: 'scale(0) rotate(-760deg)', opacity: 1 }], { duration: 1100, easing: 'ease-in-out' });
      for (let i = 0; i < 10; i++) {
        const a0 = (i / 10) * Math.PI * 2, r0 = bfxRand(80, 120) * k;
        const card = bfxAdd(host, bfxMiniCard(i % 3 ? '#f8fafc' : '#fef3c7', i % 2 ? '#dc2626' : '#111827'), x, y, 26 * k, 36 * k);
        bfxAnimate(card, [0, .15, .3, .45, .6, .75, .9, 1].map(t => {
          const a = a0 - t * Math.PI * 2.4, r = r0 * Math.pow(1 - t, 1.3);
          return { transform: `translate(${Math.cos(a) * r}px,${Math.sin(a) * r}px) rotate(${(a * 180) / Math.PI - 90}deg) scale(${1 - .9 * t},${1 + 1.6 * t})`, opacity: t === 0 ? 0 : t > .92 ? 0 : 1 };
        }), { duration: 820, delay: 120 + i * 22, easing: 'linear' });
      }
      const flash = bfxAdd(host, '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#fff,rgba(196,181,253,.7) 30%,rgba(56,189,248,.25) 55%,transparent 70%)"></div>', x, y, 120 * k, 120 * k);
      bfxAnimate(flash, [{ transform: 'scale(.1)', opacity: 0 }, { transform: 'scale(.1)', opacity: 1, offset: .01 }, { transform: 'scale(2)', opacity: 0 }], { duration: 480, delay: 1060, easing: 'ease-out' });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2 + bfxRand(-.15, .15), d = bfxRand(60, 135) * k, s = bfxRand(9, 17) * k;
        const star = bfxAdd(host, bfxStar4(['#ffffff', '#c4b5fd', '#fde68a', '#7dd3fc'][i % 4]), x, y, s, s);
        bfxAnimate(star, [{ transform: 'translate(0,0) scale(0) rotate(0)', opacity: 0 }, { transform: 'translate(0,0) scale(.4)', opacity: 1, offset: .02 },
          { transform: `translate(${Math.cos(a) * d * .75}px,${Math.sin(a) * d * .75}px) scale(1.1) rotate(90deg)`, opacity: 1, offset: .5 },
          { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px) scale(0) rotate(180deg)`, opacity: 0 }], { duration: bfxRand(520, 720), delay: 1070 + bfxRand(0, 60), easing: 'ease-out' });
      }
    }

    // Origami Fold (v305, owner: procedural, no pictures): the REAL top Pile card (a clone of its own
    // element, so its face is exact and vector-sharp at any DPI) is folded like paper. Every crease is a
    // line: the card is cut along it into pieces (clip-path polygons, `oriClip`) and the pieces on one
    // side turn 180deg in 3D about that line (`rotate3d` round the crease), landing on top. Folds, in
    // order: both sides in to a kite, the kite in half, the neck up, the head down; then the two halves
    // open and beat as wings and the swan flies up off the screen. Every outside surface is the burner's
    // own equipped back (`burnBackClass`), as on real paper; the inside is the card's face. Gold sparkles
    // at each crease, paper scraps drift down. Never put a CSS filter on a preserve-3d box (it flattens
    // it and the backs never show): shading lives on the leaf faces only. The same goes for `will-change:
    // opacity` (the .bfx class has it), so the 3D boxes override it with `will-change:transform`.
    const ORI_MS = 2000;
    // Keep the part of a convex polygon on the side of the line through `a` (direction `d`) where `s`
    // is (Sutherland-Hodgman with one edge).
    function oriClip(poly, a, d, s) {
      const side = p => (p[0] - a[0]) * d[1] - (p[1] - a[1]) * d[0], want = Math.sign(side(s)) || 1, out = [];
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p) * want, sq = side(q) * want;
        if (sp >= 0) out.push(p);
        if ((sp > 0 && sq < 0) || (sp < 0 && sq > 0)) { const t = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
      }
      return out.length > 2 ? out : null;
    }
    // Shared by the procedural burns (v305+): the REAL top Pile card (or a lone 10 in a preview), a layer
    // over the whole screen (on the table) or the preview stage, every Pile card hidden at once (inline,
    // transition off first: the card's transition-all would keep a visibility change showing), and an
    // animation helper on the effect's own clock. `end(a)` clears it all when animation `a` finishes.
    function procBurnStage(host, x, y, ms) {
      const onTable = host.id === 'burnFxLayer';
      const pileEls = onTable ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')] : [];
      const top = pileEls.filter(el => el.offsetWidth).pop(), hr = host.getBoundingClientRect();
      let W, H, cx, cy, src;
      if (top) {
        const r = top.getBoundingClientRect();
        W = top.offsetWidth; H = top.offsetHeight; cx = r.left + r.width / 2 - hr.left; cy = r.top + r.height / 2 - hr.top; src = top;
      } else {
        H = Math.round(Math.max(56, Math.min(110, (hr.height || 160) * .5))); W = Math.round(H * .7);
        cx = x; cy = y + H * .25;
        src = createCardElement({ id: 'pfx-preview', rank: '10', suit: '♠' });
      }
      const layer = document.createElement('div');
      layer.className = 'pfx-layer';
      layer.style.cssText = `position:absolute;inset:0;pointer-events:none;overflow:visible;perspective:${Math.round(H * 8)}px;perspective-origin:${cx}px ${cy}px`;
      host.appendChild(layer);
      const hidden = onTable ? [...pileEls, ...document.querySelectorAll('#pileZone .empty-zone-pill')] : [];
      hidden.forEach(el => { el.style.setProperty('transition', 'none', 'important'); el.style.setProperty('visibility', 'hidden', 'important'); });
      const anims = [];
      const done = () => { layer.remove(); hidden.forEach(el => { el.style.removeProperty('visibility'); el.style.removeProperty('transition'); }); };
      const safety = () => anims.some(a => a.playState === 'paused') ? setTimeout(safety, 1000) : done();
      setTimeout(safety, ms + 4000); // normally `end` clears it
      return {
        onTable, layer, W, H, cx, cy, src, vw: host.clientWidth || innerWidth,
        radius: getComputedStyle(src).borderRadius || '8px', backCls: burnBackClass(),
        anim: (el, frames, easing = 'linear') => { const a = el.animate && el.animate(frames, { duration: ms, fill: 'both', easing }); if (a) anims.push(a); return a; },
        end: a => { if (a) a.onfinish = done; else setTimeout(done, ms); },
        // A copy of the card's face: no ids or data-card-id, so nothing mistakes it for the real card.
        face: () => {
          const f = src.cloneNode(true);
          f.removeAttribute('id'); f.removeAttribute('data-card-id');
          f.querySelectorAll('[id],[data-card-id]').forEach(q => { q.removeAttribute('id'); q.removeAttribute('data-card-id'); });
          f.classList.add('pfx-face');
          f.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;margin:0;transform:none;animation:none;transition:none;opacity:1;visibility:visible`;
          return f;
        }
      };
    }
    function bfxOrigami(host, x, y, k) {
      const st = procBurnStage(host, x, y, ORI_MS), { layer, cx, cy, radius, backCls, anim, end, vw, onTable } = st;
      // v311 (owner): the card leaves the Pile, grows and moves to the middle of the screen first. The swan
      // is built at its full size (the face drawn bigger with zoom, so it stays sharp; scaling a drawn
      // layer up blurs it) and starts shrunk to the card's size; the stage moves, so sparkles follow.
      const vh = host.clientHeight || innerHeight, E = onTable ? Math.max(1, Math.min(1.8, vh * .2 / st.H, vw * .36 / st.W)) : 1;
      const W = st.W * E, H = st.H * E, cardFace = () => { const f = st.face(); f.style.zoom = E; return f; };
      anim(layer, [{ transform: 'none' }, { transform: `translate(${vw / 2 - cx}px,${vh * .52 - cy}px)`, offset: .1, easing: 'ease-in-out' }, { transform: `translate(${vw / 2 - cx}px,${vh * .52 - cy}px)` }]);
      const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const norm = ([a, b]) => { const l = Math.hypot(a, b) || 1; return [a / l, b / l]; };
      const reflect = (p, a, d) => { const vx = p[0] - a[0], vy = p[1] - a[1], t = vx * d[0] + vy * d[1]; return [a[0] + 2 * t * d[0] - vx, a[1] + 2 * t * d[1] - vy]; };
      const centroid = poly => poly.reduce((s, p) => [s[0] + p[0] / poly.length, s[1] + p[1] / poly.length], [0, 0]);

      // ---- The folding, worked out flat (card pixels, y down). The swan is displayed turned 90deg, so
      // "up" on screen is -x here and its head end (the kite's top point) faces right.
      const T = [W / 2, 0], up = d => [d[1], -d[0]]; // screen direction -> card direction
      let pieces = [{ orig: [[0, 0], [W, 0], [W, H], [0, H]], world: [[0, 0], [W, 0], [W, H], [0, H]], z: 0, A: null, folds: [] }];
      const folds = [];
      // A fold: cut every piece along the crease, turn those on the `mover` side over the line onto the top.
      const fold = (a, d, mover, t0, t1) => {
        d = norm(d);
        const next = [], moving = [];
        for (const p of pieces) {
          for (const keepMover of [true, false]) {
            const sideRef = keepMover ? mover : (() => { const n = [-d[1], d[0]], m = (mover[0] - a[0]) * n[0] + (mover[1] - a[1]) * n[1]; return [mover[0] - 2 * m * n[0], mover[1] - 2 * m * n[1]]; })();
            const w = oriClip(p.world, a, d, sideRef);
            if (!w) continue;
            // Map the cut back onto the flat card: undo this piece's folds (each one a reflection).
            let o = w;
            for (let f = p.folds.length - 1; f >= 0; f--) { const F = folds[p.folds[f]]; o = o.map(q => reflect(q, F.a, F.d)); }
            const q = { orig: o, world: w, z: p.z, folds: p.folds.slice() };
            (keepMover ? moving : next).push(q);
          }
        }
        const zTop = Math.max(...pieces.map(p => p.z)), zMax = Math.max(...moving.map(p => p.z)), c = (zTop + 1 + zMax) / 2;
        const F = { a, d, t0, t1, c, i: folds.length };
        // Swing toward the viewer: pick the turn whose halfway point lifts the moving side's centre up (+z).
        const mid = centroid(moving.flatMap(p => p.world));
        F.sign = (typeof DOMMatrix === 'function' ? new DOMMatrix().translate(a[0], a[1], c).rotateAxisAngle(d[0], d[1], 0, 90).translate(-a[0], -a[1], -c).transformPoint(new DOMPoint(mid[0], mid[1], 0)).z : 1) >= c ? 1 : -1;
        folds.push(F);
        for (const p of moving) { p.world = p.world.map(q => reflect(q, a, d)); p.z = 2 * c - p.z; p.folds.push(F.i); }
        pieces = next.concat(moving);
        return F;
      };
      // v311 (owner: "a swan with a long neck"): two kites make the long thin point (the neck), then in
      // half, the tail corner tucked into a boat, the neck up and the head forward. Checked flat first
      // (outline: boat body, upright neck, beak to the right).
      const k1 = Math.PI / 6, k2 = Math.PI / 12;
      fold(T, [-Math.sin(k1), Math.cos(k1)], [0, 0], .1, .17);    // top edges in: a kite
      fold(T, [Math.sin(k1), Math.cos(k1)], [W, 0], .13, .2);
      fold(T, [-Math.sin(k2), Math.cos(k2)], [0, H * .3], .2, .26); // and in again: a long thin point
      fold(T, [Math.sin(k2), Math.cos(k2)], [W, H * .3], .23, .29);
      const half = fold(T, [0, 1], [W, H / 2], .31, .4);          // in half down its middle
      fold([W / 2, H * .85], [W * .2 - W / 2, H * .15], [W / 2, H], .41, .46); // tail corner tucked: a boat
      const neckDir = norm([-1, .12]), neckAt = [W / 2, H * .62];
      fold(neckAt, [neckDir[0], neckDir[1] - 1], T, .44, .53);     // the point up into a long neck
      const tip = reflect(T, neckAt, norm([neckDir[0], neckDir[1] - 1]));
      const headDir = norm([.4, -1]), headAt = [tip[0] - neckDir[0] * H * .13, tip[1] - neckDir[1] * H * .13];
      fold(headAt, [neckDir[0] + headDir[0], neckDir[1] + headDir[1]], tip, .53, .59); // and the head forward
      const neckFold = folds.length - 2;

      // ---- The swan's frame: turned 90deg, centred where the card was and a little above it.
      const all = pieces.flatMap(p => p.world), xs = all.map(p => p[0]), ys = all.map(p => p[1]);
      const bc = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      const S = 1.3;
      const fly = document.createElement('div'), group = document.createElement('div');
      fly.className = 'bfx'; group.className = 'bfx';
      fly.style.cssText = `position:absolute;left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;will-change:transform;transform-style:preserve-3d;transform-origin:50% 50%`;
      group.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;will-change:transform;transform-style:preserve-3d;transform-origin:0 0`;
      const glow = document.createElement('div'), shadow = document.createElement('div');
      glow.className = 'bfx'; shadow.className = 'bfx';
      glow.style.cssText = `position:absolute;left:${cx - H * 1.1}px;top:${cy - H * 1.3}px;width:${H * 2.2}px;height:${H * 2.2}px;border-radius:50%;background:radial-gradient(closest-side,rgba(253,230,138,.55),rgba(251,191,36,.18) 55%,transparent)`;
      shadow.style.cssText = `position:absolute;left:${cx - W * .8}px;top:${cy + H * .36}px;width:${W * 1.6}px;height:${H * .28}px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.5),transparent)`;
      layer.append(shadow, glow, fly);
      fly.appendChild(group);
      const groupAt = t => {
        const lift = ease(Math.min(1, t / .07)), turn = ease(Math.max(0, Math.min(1, (t - .25) / .17)));
        const px = W / 2 + (bc[0] - W / 2) * turn, py = H / 2 + (bc[1] - H / 2) * turn, grow = 1 / E + (1 - 1 / E) * ease(Math.min(1, t / .1)), s = grow * (1 + .1 * lift) + (S - 1.1) * turn;
        return `translate3d(${W / 2}px,${H / 2 - H * (.16 * lift + .12 * turn)}px,${36 * lift}px) rotateX(${14 * lift * (1 - turn)}deg) rotateY(${-12 * turn}deg) rotate(${90 * turn}deg) scale(${s}) translate(${-px}px,${-py}px)`;
      };
      // Times worth a keyframe: every 1/80th, so each curve is followed closely.
      const TIMES = Array.from({ length: 81 }, (_, i) => i / 80);
      anim(group, TIMES.map(t => ({ offset: t, transform: groupAt(t) })));
      // Wings: after the head, the near half opens a little from the keel and beats.
      const beat = [[.5, 0], [.6, 10], [.66, 2], [.72, 11], [.79, 2], [.86, 11], [.93, 2], [1, 8]]; // small, so the swan's outline stays readable
      const wingAt = t => {
        if (t <= beat[0][0]) return 0;
        for (let i = 1; i < beat.length; i++) if (t <= beat[i][0]) { const [t0, a0] = beat[i - 1], [t1, a1] = beat[i]; return a0 + (a1 - a0) * ease((t - t0) / (t1 - t0)); }
        return beat[beat.length - 1][1];
      };
      const keelA = [W / 2, 0], keelD = [0, 1], zSplit = half.c;
      // Which way about the keel lifts a piece off the page toward the viewer (sign of z at +90deg).
      const lifts = (p, c) => new DOMMatrix().translate(keelA[0], 0, c).rotateAxisAngle(0, 1, 0, 90).translate(-keelA[0], 0, -c).transformPoint(new DOMPoint(...centroid(p.world), p.z)).z > c ? 1 : -1;
      pieces.forEach((p, n) => {
        const inNeck = p.folds.includes(neckFold), near = p.folds.includes(half.i);
        const wingC = near ? zSplit : zSplit - .5, wingSign = inNeck || !near ? 0 : (typeof DOMMatrix === 'function' ? lifts(p, wingC) : 1); // only the near side beats: the far one kept the outline whole
        const tf = t => {
          let s = `translate3d(${keelA[0]}px,0px,${wingC}px) rotate3d(${keelD[0]},${keelD[1]},0,${(wingSign * wingAt(t)).toFixed(2)}deg) translate3d(${-keelA[0]}px,0px,${-wingC}px)`;
          for (let f = folds.length - 1; f >= 0; f--) {
            const F = folds[f], on = p.folds.includes(f), u = on ? ease(Math.max(0, Math.min(1, (t - F.t0) / (F.t1 - F.t0)))) : 0;
            s += ` translate3d(${F.a[0]}px,${F.a[1]}px,${F.c}px) rotate3d(${F.d[0]},${F.d[1]},0,${(F.sign * 180 * u).toFixed(2)}deg) translate3d(${-F.a[0]}px,${-F.a[1]}px,${-F.c}px)`;
          }
          return s;
        };
        const el = document.createElement('div');
        el.className = 'bfx';
        el.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;will-change:transform;transform-style:preserve-3d;transform-origin:0 0`;
        const pct = (pts, mirror) => `polygon(${pts.map(([u, v]) => `${((mirror ? W - u : u) / W * 100).toFixed(3)}% ${(v / H * 100).toFixed(3)}%`).join(',')})`;
        const edge = (pts, mirror, shade, line) => `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0;overflow:visible"><polygon points="${pts.map(([u, v]) => `${mirror ? W - u : u},${v}`).join(' ')}" fill="rgba(${shade > 0 ? '255,255,255' : '0,0,0'},${Math.abs(shade)})" stroke="rgba(255,255,255,${line})" stroke-width="1" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
        const shade = [-.14, .06, -.06, .1, -.1, 0, -.18, .04][n % 8];
        const face = cardFace();
        const faceSide = document.createElement('div');
        faceSide.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:${pct(p.orig)}`;
        faceSide.appendChild(face);
        faceSide.insertAdjacentHTML('beforeend', edge(p.orig, false, -.03, .07));
        const backSide = document.createElement('div');
        backSide.style.cssText = `position:absolute;left:0;top:0;width:${W}px;height:${H}px;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:${pct(p.orig, true)}`;
        backSide.innerHTML = `<div class="custom-card-back ${backCls}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;border-radius:${radius};margin:0"></div>` + edge(p.orig, true, shade, .45);
        el.append(faceSide, backSide);
        group.appendChild(el);
        anim(el, TIMES.map(t => ({ offset: t, transform: tf(t) })));
        // Which side faces the viewer, from the folds themselves (an odd number of turns past halfway =
        // the back): the cloned card's own layers don't always honour backface-visibility.
        const flips = t => p.folds.filter(f => (t - folds[f].t0) / (folds[f].t1 - folds[f].t0) >= .5).length % 2;
        anim(faceSide, TIMES.map(t => ({ offset: t, opacity: flips(t) ? 0 : 1 })));
        anim(backSide, TIMES.map(t => ({ offset: t, opacity: flips(t) ? 1 : 0 })));
      });
      // The flight: still until the swan is made, a gentle hover, then up and away off the top of the screen
      const flight = anim(fly, [
        { transform: 'translate3d(0,0,0) scale(1)', offset: 0 },
        { transform: 'translate3d(0,0,0) scale(1)', offset: .6, easing: 'ease-in-out' },
        { transform: `translate3d(0,${-H * .1}px,0) rotate(-3deg)`, offset: .68, easing: 'ease-in-out' },
        { transform: `translate3d(0,${H * .02}px,0) rotate(2deg)`, offset: .75, easing: 'ease-in-out' },
        { transform: `translate3d(0,${-H * .06}px,0) rotate(-2deg)`, offset: .8, easing: 'cubic-bezier(.5,0,.75,.35)' },
        { transform: `translate3d(${vw * .3}px,${-(vh * .52 + H * 2)}px,90px) rotate(-24deg) scale(.7)`, offset: 1 }
      ]);
      end(flight);
      anim(shadow, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: .07 }, { opacity: .9, transform: 'scale(1.2)', offset: .58 }, { opacity: 0, transform: 'scale(.4)', offset: .78 }, { opacity: 0, transform: 'scale(.4)' }]);
      anim(glow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 0, transform: 'scale(.4)', offset: .5 }, { opacity: 1, transform: 'scale(1)', offset: .6 }, { opacity: 0, transform: 'translateY(-40%) scale(1.3)', offset: .8 }, { opacity: 0, transform: 'scale(1.3)' }]);
      // Gold sparkles burst from each crease as it snaps flat and when the swan is made.
      const burst = (n, at, spread, size, ox = 0, oy = 0) => {
        for (let i = 0; i < n; i++) {
          const el = document.createElement('div'), ang = Math.random() * Math.PI * 2, d = spread * (.4 + Math.random() * .6), sz = size * (.5 + Math.random() * .7);
          el.className = 'bfx';
          el.style.cssText = `position:absolute;left:${cx + ox - sz / 2}px;top:${cy + oy - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:radial-gradient(circle,#fff,#fde68a 40%,rgba(251,191,36,0) 72%)`;
          layer.appendChild(el);
          anim(el, [{ opacity: 0, transform: 'translate(0,0) scale(.3)', offset: 0 }, { opacity: 0, transform: 'translate(0,0) scale(.3)', offset: at },
            { opacity: 1, transform: `translate(${Math.cos(ang) * d * .4}px,${Math.sin(ang) * d * .4}px) scale(1)`, offset: at + .03 },
            { opacity: 0, transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d + H * .15}px) scale(.2)`, offset: Math.min(1, at + .2) },
            { opacity: 0, transform: 'translate(0,0) scale(.2)', offset: 1 }]);
        }
      };
      burst(8, .17, H * .7, H * .08, -W * .25, -H * .2); burst(8, .22, H * .7, H * .08, W * .25, -H * .2); burst(10, .37, H * .8, H * .08, 0, -H * .3);
      burst(26, .58, H * 1.7, H * .11, 0, -H * .35);
      for (let i = 0; i < 16; i++) {
        const el = document.createElement('div'), sz = H * (.06 + Math.random() * .08), x0 = cx + (Math.random() - .3) * Math.min(vw, H * 5) * .6;
        const drop = H * (2 + Math.random() * 2.5), spin = (Math.random() - .5) * 900, start = .6 + Math.random() * .14, paper = i % 3;
        el.className = paper ? 'bfx' : `bfx custom-card-back ${backCls}`;
        el.style.cssText = `position:absolute;left:${x0}px;top:${cy - H * (1 + Math.random())}px;width:${sz}px;height:${sz * 1.3}px;border-radius:2px;${paper ? 'background:#f8fafc;' : ''}box-shadow:0 1px 2px rgba(0,0,0,.35);clip-path:polygon(0 0,100% ${Math.random() * 40}%,${60 + Math.random() * 40}% 100%,0 ${50 + Math.random() * 50}%)`;
        layer.appendChild(el);
        anim(el, [{ opacity: 0, transform: 'translate(0,0) rotate(0deg) rotateX(0deg)', offset: 0 }, { opacity: 0, transform: 'translate(0,0) rotate(0deg) rotateX(0deg)', offset: start },
          { opacity: 1, transform: `translate(${(Math.random() - .5) * 40}px,${drop * .3}px) rotate(${spin * .3}deg) rotateX(${spin * .5}deg)`, offset: start + .08 },
          { opacity: 0, transform: `translate(${(Math.random() - .5) * 120}px,${drop}px) rotate(${spin}deg) rotateX(${spin * 1.4}deg)`, offset: 1 }]);
      }
    }

    // Stupendous Confectionery (v306, owner: procedural; every sweet its own element): the REAL top Pile
    // card jiggles like jelly and swells (0-0.18s), then POPS: it tears down a zigzag like a sweet
    // wrapper, the two halves spin away showing the burner's back, and 26 sweets burst out of it. Each
    // sweet is its own vector SVG (bonbon, lollipop, peppermint, gumdrop, jelly bean, candy cane, heart)
    // with its own launch time, speed, spin and tumble, run through its own little physics sim
    // (gravity, a bounce with squash on the table at its own depth, friction), plus sprinkles, a candy
    // striped shock ring and sugar twinkles. Sound: ShLevel3D.sound('burn-sweets') on the same clock.
    const SWEETS_MS = 2000;
    const SWEET_COLOURS = [['#ef4444', '#fecaca'], ['#ec4899', '#fbcfe8'], ['#f59e0b', '#fde68a'], ['#22c55e', '#bbf7d0'], ['#3b82f6', '#bfdbfe'], ['#a855f7', '#e9d5ff'], ['#14b8a6', '#99f6e4']];
    // Each sweet: [viewBox w, h, art(main, light)]. Shading is drawn in (no gradients: ids would repeat).
    const SWEET_SHAPES = [
      [60, 34, (c, l) => `<path d="M16 17 2 5v24Z" fill="${c}"/><path d="M44 17 58 5v24Z" fill="${c}"/><path d="M5 9 10 17 5 25M55 9 50 17 55 25" stroke="${l}" stroke-width="1.6" fill="none"/>
        <ellipse cx="30" cy="17" rx="15" ry="12" fill="${c}"/><path d="M19 9c4 6 4 10 0 16M26 6c4 7 4 15 0 22M33 6c4 7 4 15 0 22M40 9c4 6 4 10 0 16" stroke="${l}" stroke-width="2.4" fill="none"/>
        <path d="M17 22a15 12 0 0 0 26 0a15 9 0 0 1-26 0Z" fill="rgba(0,0,0,.18)"/><ellipse cx="24" cy="11" rx="5" ry="2.4" fill="#fff" opacity=".7"/>`],
      [40, 66, (c, l) => `<rect x="18" y="34" width="4" height="31" rx="2" fill="#f8fafc"/><rect x="18" y="34" width="1.6" height="31" fill="#cbd5e1"/>
        <circle cx="20" cy="20" r="18" fill="${c}"/><path d="M20 20c0-3 4-3 4 0 0 6-9 6-9 0 0-9 14-9 14 0 0 12-19 12-19 0 0-15 24-15 24 0" stroke="${l}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M5 28a18 18 0 0 0 30 0a18 14 0 0 1-30 0Z" fill="rgba(0,0,0,.16)"/><ellipse cx="13" cy="11" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-30 13 11)"/>`],
      [40, 40, (c) => `<circle cx="20" cy="20" r="18" fill="#fff"/>${[0, 1, 2, 3, 4, 5].map(i => `<path d="M20 20 L${20 + 18 * Math.cos(i * 1.047)} ${20 + 18 * Math.sin(i * 1.047)} A18 18 0 0 1 ${20 + 18 * Math.cos(i * 1.047 + .52)} ${20 + 18 * Math.sin(i * 1.047 + .52)}Z" fill="${c}"/>`).join('')}
        <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1.5"/><circle cx="20" cy="20" r="4" fill="#fff"/><ellipse cx="13" cy="11" rx="5" ry="2.6" fill="#fff" opacity=".75" transform="rotate(-35 13 11)"/>`],
      [40, 36, (c, l) => `<path d="M3 34Q3 4 20 4Q37 4 37 34Z" fill="${c}"/><path d="M3 34Q20 28 37 34Z" fill="rgba(0,0,0,.2)"/>
        ${[[11, 14], [19, 10], [27, 15], [14, 23], [24, 22], [31, 27], [8, 27]].map(([a, b]) => `<circle cx="${a}" cy="${b}" r="1.3" fill="${l}"/>`).join('')}<ellipse cx="13" cy="11" rx="4" ry="2.4" fill="#fff" opacity=".6" transform="rotate(-40 13 11)"/>`],
      [44, 26, (c) => `<path d="M6 13C2 3 16 0 22 5c6 4 14-2 18 6s-4 14-14 13C14 23 9 22 6 13Z" fill="${c}"/><path d="M8 18c6 6 22 7 31-3-4 10-24 11-31 3Z" fill="rgba(0,0,0,.2)"/><ellipse cx="14" cy="8" rx="5" ry="2" fill="#fff" opacity=".65"/>`],
      [30, 62, (c) => `<path d="M8 60V18a7 7 0 0 1 14 0v4" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M8 60V18a7 7 0 0 1 14 0v4" stroke="${c}" stroke-width="7" fill="none" stroke-dasharray="5 5" stroke-linecap="butt"/>
        <path d="M5 60V18" stroke="rgba(0,0,0,.15)" stroke-width="1.5"/><path d="M10 56V20" stroke="#fff" stroke-width="1.4" opacity=".7"/>`],
      [40, 38, (c, l) => `<path d="M20 35C4 24 1 15 4 9c3-6 12-7 16 1 4-8 13-7 16-1 3 6 0 15-16 26Z" fill="${c}"/><path d="M20 35C8 27 4 21 4 15c4 9 20 15 32 0 0 6-4 12-16 20Z" fill="rgba(0,0,0,.16)"/>
        <path d="M12 18h16M14 23h12" stroke="${l}" stroke-width="2" stroke-linecap="round" opacity=".85"/><ellipse cx="11" cy="10" rx="4" ry="2.2" fill="#fff" opacity=".7" transform="rotate(-35 11 10)"/>`]
    ];
    function bfxSweets(host, x, y, k) {
      const { layer, W, H, cx, cy, radius, backCls, anim, end, face, vw } = procBurnStage(host, x, y, SWEETS_MS);
      const D = SWEETS_MS / 1000, POP = .18, N = 72, rand = (a, b) => a + Math.random() * (b - a);
      const TIMES = Array.from({ length: N + 1 }, (_, i) => i / N);
      const jelly = t => { // the card's squash and stretch before the pop (t in seconds)
        if (t >= POP) return [1.16, 1.16];
        const u = t / POP, w = Math.sin(u * Math.PI * 5) * .13 * u;
        return [1 + w + .14 * u * u, 1 - w * .85 + .14 * u * u];
      };
      // A body flying under gravity from `t0`: bounces on its own floor line (its depth on the table)
      // with a squash, friction and slowing spin; returns its state at each keyframe time.
      const fly = ({ x0, y0, vx, vy, t0, floor, spin, bounce = .42, g = H * 16 }) => {
        const out = [];
        let x = x0, y = y0, r = rand(-30, 30), t = 0, hit = -1, step = 1 / 240;
        for (const T of TIMES.map(f => f * D)) {
          while (t < T) {
            if (t >= t0) {
              vy += g * step; x += vx * step; y += vy * step; r += spin * step;
              if (y >= floor && vy > 0) {
                y = floor; hit = t;
                if (vy < H * 1.4) { vy = 0; g = 0; } else vy = -vy * bounce;
                vx *= .62; spin *= .55;
              }
              if (g === 0) { vx *= .985; spin *= .97; }
            }
            t += step;
          }
          const sq = hit >= 0 && T - hit < .09 ? (1 - (T - hit) / .09) * .32 : 0;
          out.push({ T, x, y, r, sx: 1 + sq, sy: 1 - sq, live: T >= t0 });
        }
        return out;
      };
      // ---- The card: the two halves of a zigzag tear, wobbling together, then flung apart at the POP.
      const teeth = 7, zig = Array.from({ length: teeth + 1 }, (_, i) => [W / 2 + (i % 2 ? 1 : -1) * W * .08, H * i / teeth]);
      const halves = [[[0, 0], ...zig, [0, H]], [...zig, [W, H], [W, 0]]];
      const pct = (pts, mirror) => `polygon(${pts.map(([u, v]) => `${((mirror ? W - u : u) / W * 100).toFixed(2)}% ${(v / H * 100).toFixed(2)}%`).join(',')})`;
      const glow = document.createElement('div');
      glow.className = 'bfx';
      glow.style.cssText = `position:absolute;left:${cx - H}px;top:${cy - H}px;width:${H * 2}px;height:${H * 2}px;border-radius:50%;background:radial-gradient(closest-side,rgba(251,207,232,.85),rgba(236,72,153,.35) 50%,transparent)`;
      layer.appendChild(glow);
      anim(glow, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(.9)', offset: POP / D }, { opacity: 0, transform: 'scale(1.8)', offset: (POP + .25) / D }, { opacity: 0, transform: 'scale(1.8)' }]);
      let last;
      halves.forEach((poly, side) => {
        const dir = side ? 1 : -1, path = fly({ x0: 0, y0: 0, vx: dir * H * rand(2.2, 2.8), vy: -H * rand(4.2, 5), t0: POP, floor: H * 9, spin: dir * rand(90, 160), g: H * 12 });
        const spinY = dir * rand(190, 220);
        const box = document.createElement('div');
        box.className = 'bfx';
        box.style.cssText = `position:absolute;left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:2;will-change:transform;transform-style:preserve-3d;transform-origin:50% 50%`;
        const front = document.createElement('div'), back = document.createElement('div');
        front.style.cssText = `position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:${pct(poly)}`;
        front.appendChild(face());
        back.style.cssText = `position:absolute;inset:0;transform:rotateY(180deg);backface-visibility:hidden;-webkit-backface-visibility:hidden;clip-path:${pct(poly, true)}`;
        back.innerHTML = `<div class="custom-card-back ${backCls}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;border-radius:${radius};margin:0"></div>`;
        box.append(front, back);
        layer.appendChild(box);
        const ry = T => T < POP ? 0 : spinY * Math.min(1, (T - POP) / .9);
        anim(box, path.map((p, i) => {
          const [jx, jy] = jelly(p.T), lift = Math.min(p.T / POP, 1) * -H * .08;
          return { offset: TIMES[i],
            transform: `translate(${p.x}px,${p.y + lift}px) rotate(${p.T < POP ? Math.sin(p.T * 40) * 3 : p.r}deg) rotateY(${ry(p.T)}deg) scale(${jx},${jy})` };
        }));
        // Fade and face swap live on the leaves: opacity on the 3D box would flatten it (no back).
        const backShows = T => { const a = ((ry(T) % 360) + 360) % 360; return a > 90 && a < 270; };
        const fade = T => T > 1.05 ? Math.max(0, 1 - (T - 1.05) / .3) : 1;
        anim(front, path.map((p, i) => ({ offset: TIMES[i], opacity: backShows(p.T) ? 0 : fade(p.T) })));
        last = anim(back, path.map((p, i) => ({ offset: TIMES[i], opacity: backShows(p.T) ? fade(p.T) : 0 })));
      });
      // ---- The pop: a flash and a candy-striped ring.
      const flash = document.createElement('div'), ring = document.createElement('div');
      flash.className = 'bfx'; ring.className = 'bfx';
      flash.style.cssText = `position:absolute;left:${cx - H}px;top:${cy - H}px;width:${H * 2}px;height:${H * 2}px;border-radius:50%;z-index:4;background:radial-gradient(closest-side,#fff,rgba(253,242,248,.8) 35%,rgba(244,114,182,.3) 60%,transparent)`;
      ring.style.cssText = `position:absolute;left:${cx - H}px;top:${cy - H}px;width:${H * 2}px;height:${H * 2}px;z-index:1`;
      ring.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%" style="overflow:visible"><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="50" cy="50" r="40" fill="none" stroke="#ec4899" stroke-width="2.5" stroke-dasharray="6 6"/></svg>`;
      layer.append(flash, ring);
      const p0 = POP / D;
      anim(flash, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 0, transform: 'scale(.2)', offset: p0 }, { opacity: .9, transform: 'scale(.8)', offset: p0 + .015 }, { opacity: 0, transform: 'scale(1.6)', offset: p0 + .1 }, { opacity: 0, transform: 'scale(1.6)' }]);
      anim(ring, [{ opacity: 0, transform: 'scale(.3) rotate(0deg)' }, { opacity: 0, transform: 'scale(.3) rotate(0deg)', offset: p0 }, { opacity: 1, transform: 'scale(.8) rotate(20deg)', offset: p0 + .03 }, { opacity: 0, transform: 'scale(2.1) rotate(70deg)', offset: p0 + .16 }, { opacity: 0, transform: 'scale(2.1) rotate(70deg)' }]);
      // ---- The sweets: each its own element on its own path, in waves as the pops sound.
      const waves = [.18, .22, .26, .3, .34, .39, .44];
      for (let i = 0; i < 26; i++) {
        const [vbw, vbh, art] = SWEET_SHAPES[i % SWEET_SHAPES.length], [c, l] = SWEET_COLOURS[(i * 3 + (Math.random() * 7 | 0)) % SWEET_COLOURS.length];
        const depth = rand(-1, 1), size = H * rand(.3, .44) * (1 + .22 * depth), w = size * vbw / Math.max(vbw, vbh), h = size * vbh / Math.max(vbw, vbh);
        const ang = -Math.PI / 2 + rand(-1.15, 1.15), sp = H * rand(4.5, 9.5), t0 = waves[i % waves.length] + rand(0, .03);
        const path = fly({ x0: cx + rand(-.25, .25) * W, y0: cy + rand(-.25, .2) * H, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t0, floor: cy + H * (.62 + .5 * depth), spin: rand(-720, 720) });
        const tumble = rand(-900, 900), fadeAt = rand(1.5, 1.8);
        const el = document.createElement('div');
        el.className = 'bfx';
        el.style.cssText = `position:absolute;left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;z-index:${depth > .1 ? 3 : 1}`;
        el.innerHTML = `<svg viewBox="0 0 ${vbw} ${vbh}" width="100%" height="100%" style="overflow:visible">${art(c, l)}</svg>`;
        layer.appendChild(el);
        anim(el, path.map((p, n) => {
          const age = p.T - t0, grow = p.live ? Math.min(1, .3 + age / .1) : .3;
          return { offset: TIMES[n], opacity: !p.live ? 0 : p.T > fadeAt ? Math.max(0, 1 - (p.T - fadeAt) / .2) : 1,
            transform: `translate(${p.x}px,${p.y}px) scale(${p.sx * grow},${p.sy * grow}) rotate(${p.r}deg) rotateY(${p.live ? tumble * Math.min(age, .9) * (1 - Math.min(age, .9) / 1.8) : 0}deg)` };
        }));
      }
      // ---- Sprinkles: tiny sugar rods, quicker and lighter.
      for (let i = 0; i < 44; i++) {
        const depth = rand(-1, 1), ang = -Math.PI / 2 + rand(-1.4, 1.4), sp = H * rand(5, 12), t0 = POP + rand(0, .08), fadeAt = rand(1.1, 1.6);
        const path = fly({ x0: cx + rand(-.3, .3) * W, y0: cy + rand(-.3, .3) * H, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t0, floor: cy + H * (.62 + .5 * depth), spin: rand(-1400, 1400), bounce: .3 });
        const el = document.createElement('div');
        el.className = 'bfx';
        el.style.cssText = `position:absolute;left:-1.5px;top:-5px;width:${H * .035}px;height:${H * .11}px;border-radius:9px;z-index:${depth > 0 ? 3 : 1};background:${['#f472b6', '#facc15', '#60a5fa', '#4ade80', '#fff', '#c084fc', '#fb923c'][i % 7]}`;
        layer.appendChild(el);
        anim(el, path.map((p, n) => ({ offset: TIMES[n], opacity: !p.live ? 0 : p.T > fadeAt ? Math.max(0, 1 - (p.T - fadeAt) / .2) : 1, transform: `translate(${p.x}px,${p.y}px) rotate(${p.r}deg)` })));
      }
      // ---- Sugar twinkles over the fallen sweets as it ends.
      for (let i = 0; i < 9; i++) {
        const el = document.createElement('div'), at = rand(1.3, 1.65) / D, s = H * rand(.12, .2);
        el.className = 'bfx';
        el.style.cssText = `position:absolute;left:${cx + rand(-1.6, 1.6) * H - s / 2}px;top:${cy + rand(-.2, 1.1) * H - s / 2}px;width:${s}px;height:${s}px;z-index:4`;
        el.innerHTML = '<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0C11 7 13 9 20 10 13 11 11 13 10 20 9 13 7 11 0 10 7 9 9 7 10 0Z" fill="#fff"/></svg>';
        layer.appendChild(el);
        anim(el, [{ opacity: 0, transform: 'scale(0) rotate(0deg)' }, { opacity: 0, transform: 'scale(0) rotate(0deg)', offset: at }, { opacity: 1, transform: 'scale(1) rotate(45deg)', offset: at + .04 }, { opacity: 0, transform: 'scale(0) rotate(90deg)', offset: Math.min(1, at + .1) }, { opacity: 0, transform: 'scale(0) rotate(90deg)' }]);
      }
      end(last);
    }

    // Pixel Blast: the top card turns into big square pixels, a stepped
    // 8-bit blast goes off (0.2s) and the pixels scatter in jerky steps.
    function bfxPixelBlast(host, x, y, k) {
      const cols = 7, rows = 9, s = 10 * k;
      const heart = new Set(['3,1', '3,2', '3,4', '3,5', '4,1', '4,2', '4,3', '4,4', '4,5', '5,2', '5,3', '5,4', '6,3']);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const edge = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
          const colour = edge ? '#1e293b' : heart.has(`${r},${c}`) ? '#ef4444' : '#f8fafc';
          const px0 = (c - (cols - 1) / 2) * s, py0 = (r - (rows - 1) / 2) * s;
          const el = bfxAdd(host, `<div style="width:100%;height:100%;background:${colour};box-shadow:inset -2px -2px 0 rgba(0,0,0,.25)"></div>`, x + px0, y + py0, s, s);
          const len = Math.hypot(px0, py0) || 1, v = bfxRand(90, 170) * k;
          const dx = (px0 / len) * v + bfxRand(-30, 30) * k, dy = (py0 / len) * v - bfxRand(40, 90) * k;
          bfxAnimate(el, [
            { transform: 'translate(0,0) scale(1)', opacity: 1, easing: 'steps(2, end)' }, { transform: 'translate(0,0) scale(1.1)', opacity: 1, offset: .16, easing: 'steps(3, end)' },
            ...[.25, .5, .75, 1].map(t => ({ transform: `translate(${dx * t}px,${dy * t + 260 * k * t * t}px)`, opacity: t < 1 ? 1 : 0, offset: .16 + t * .84, easing: 'steps(3, end)' }))
          ], { duration: bfxRand(1050, 1300), delay: 0, easing: 'linear' });
        }
      }
      const blast = bfxAdd(host, bfxSvg(20, 20, `<path d="M8 0h4v4h4v4h4v4h-4v4h-4v4H8v-4H4v-4H0V8h4V4h4Z" fill="#f97316"/><path d="M8 4h4v4h4v4h-4v4H8v-4H4V8h4Z" fill="#fde047"/><rect x="8" y="8" width="4" height="4" fill="#fff"/>`), x, y, 130 * k, 130 * k);
      blast.style.imageRendering = 'pixelated';
      bfxAnimate(blast, [{ transform: 'scale(.1)', opacity: 0 }, { transform: 'scale(.1)', opacity: 1, offset: .01 }, { transform: 'scale(1.1)', opacity: 1, offset: .5 }, { transform: 'scale(1.5)', opacity: 0 }], { duration: 520, delay: 200, easing: 'steps(5, end)' });
      const colours = ['#fde047', '#f97316', '#22d3ee', '#f472b6', '#a3e635'];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2, d = bfxRand(70, 120) * k, sz = bfxRand(5, 8) * k;
        const bit = bfxAdd(host, `<div style="width:100%;height:100%;background:${colours[i % colours.length]}"></div>`, x, y, sz, sz);
        bfxAnimate(bit, [{ transform: 'translate(0,0)', opacity: 0 }, { transform: 'translate(0,0)', opacity: 1, offset: .02 },
          { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 0 }], { duration: 640, delay: 220, easing: 'steps(5, end)' });
      }
    }

    // Lava Melt (v307, owner: procedural, the card melts into a live environment): a pool of lava wells
    // up under the Pile (one SVG, its flow and dark crust veins from an animated feTurbulence +
    // feDisplacementMap, so it stays vector-sharp), faceted rocks rise round its rim and bob, each its own
    // element with its own depth, turn and lava-lit underside. The REAL top card lifts in the heat, then
    // sinks: from the moment its bottom edge touches the surface (LAVA_TOUCH) a flickering jagged cut
    // follows the surface up the card (clip-path) with a white-hot charred edge, and the card softens
    // (squash, skew wobble, orange glow) until it is swallowed (LAVA_GONE). Splash, ripples, steam,
    // embers and bubbles popping at LAVA_POPS; then the pool cools to crust and sinks away. Sound:
    // ShLevel3D.sound('burn-lava') on the same times.
    const LAVA_MS = 2000, LAVA_TOUCH = .4, LAVA_GONE = 1.55, LAVA_POPS = [.3, .46, .58, .7, .83, .95, 1.08, 1.2, 1.33, 1.5, 1.62];
    let pfxSeq = 0;
    function lavaRockSvg(id, r) {
      const rand = (a, b) => a + Math.random() * (b - a), n = 7 + (Math.random() * 3 | 0);
      const pts = Array.from({ length: n }, (_, i) => {
        const a = -Math.PI + (i + rand(-.3, .3)) / n * Math.PI * 2, d = r * rand(.66, 1.05);
        return [Math.cos(a) * d, Math.min(Math.sin(a) * d, r * .42)];
      });
      const apex = [rand(-.25, .25) * r, -.3 * r], f = v => v.toFixed(1);
      const facets = pts.map((p, i) => {
        const q = pts[(i + 1) % n], mx = (p[0] + q[0]) / 2 - apex[0], my = (p[1] + q[1]) / 2 - apex[1], l = Math.hypot(mx, my) || 1;
        const b = (-.6 * mx - .8 * my) / l;
        return `<path d="M${f(apex[0])} ${f(apex[1])}L${f(p[0])} ${f(p[1])}L${f(q[0])} ${f(q[1])}Z" fill="${b > 0 ? `rgba(255,236,220,${(.2 * b).toFixed(2)})` : `rgba(0,0,0,${(-.38 * b).toFixed(2)})`}"/>`;
      }).join('');
      const poly = pts.map(p => p.map(f).join(' ')).join(' ');
      const crack = () => { let x = rand(-.5, .5) * r, y = .35 * r, d = `M${f(x)} ${f(y)}`; for (let i = 0; i < 3; i++) { x += rand(-.18, .18) * r; y -= rand(.12, .22) * r; d += `L${f(x)} ${f(y)}`; } return d; };
      const cracks = [crack(), crack()].map(d => `<path d="${d}" stroke="#f97316" stroke-width="${f(r * .14)}" fill="none" opacity=".35" stroke-linecap="round"/><path d="${d}" stroke="#fde68a" stroke-width="${f(r * .045)}" fill="none" stroke-linecap="round"><animate attributeName="opacity" values=".45;1;.45" dur="${rand(.5, .8).toFixed(2)}s" repeatCount="indefinite"/></path>`).join('');
      return `<svg viewBox="${f(-1.2 * r)} ${f(-1.1 * r)} ${f(2.4 * r)} ${f(2 * r)}" width="100%" height="100%" style="overflow:visible"><defs>
        <linearGradient id="rk${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#78716c"/><stop offset=".45" stop-color="#292524"/><stop offset="1" stop-color="#140c09"/></linearGradient>
        <linearGradient id="rl${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fb923c" stop-opacity=".95"/><stop offset=".4" stop-color="#c2410c" stop-opacity=".25"/><stop offset=".6" stop-color="#c2410c" stop-opacity="0"/></linearGradient>
        <clipPath id="rc${id}"><polygon points="${poly}"/></clipPath></defs>
        <polygon points="${poly}" fill="url(#rk${id})"/><g clip-path="url(#rc${id})">${facets}<rect x="${f(-1.2 * r)}" y="${f(-1.1 * r)}" width="${f(2.4 * r)}" height="${f(2 * r)}" fill="url(#rl${id})"/>${cracks}</g>
        <polygon points="${poly}" fill="none" stroke="#0c0a09" stroke-width="${f(r * .04)}" stroke-linejoin="round"/></svg>`;
    }
    function bfxLavaMelt(host, x, y, k) {
      const { layer, W, H, cx, cy, anim, end, face } = procBurnStage(host, x, y, LAVA_MS);
      const D = LAVA_MS / 1000, N = 80, rand = (a, b) => a + Math.random() * (b - a), id = ++pfxSeq;
      const TIMES = Array.from({ length: N + 1 }, (_, i) => i / N), clamp = v => Math.max(0, Math.min(1, v));
      const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const S = cy + H * .62, dy0 = S - (cy + H / 2), rx = Math.max(W * 1.9, H * 1.3), ry = rx * .26; // surface line and pool size
      const add = (css, html = '', cls = 'bfx') => { const el = document.createElement('div'); el.className = cls; el.style.cssText = 'position:absolute;' + css; el.innerHTML = html; layer.appendChild(el); return el; };
      // ---- The pool: halo, dark rim, flowing lava (turbulence displacement + crust veins), a cooling skin.
      const pw = rx * 2.7, ph = ry * 4.6, pcx = pw / 2, pcy = ph / 2;
      const pool = add(`left:${cx - pcx}px;top:${S - pcy}px;width:${pw}px;height:${ph}px;z-index:2`, `<svg width="${pw}" height="${ph}" viewBox="0 0 ${pw} ${ph}" style="overflow:visible"><defs>
        <radialGradient id="lg${id}"><stop offset="0" stop-color="#fff7c2"/><stop offset=".18" stop-color="#fde047"/><stop offset=".38" stop-color="#fb923c"/><stop offset=".62" stop-color="#ea580c"/><stop offset=".84" stop-color="#b91c1c"/><stop offset="1" stop-color="#450a0a"/></radialGradient>
        <radialGradient id="lh${id}"><stop offset="0" stop-color="#fb923c" stop-opacity=".6"/><stop offset=".55" stop-color="#ea580c" stop-opacity=".22"/><stop offset="1" stop-color="#ea580c" stop-opacity="0"/></radialGradient>
        <filter id="lf${id}" x="-15%" y="-40%" width="130%" height="180%"><feTurbulence type="fractalNoise" baseFrequency="${(3 / rx).toFixed(4)} ${(9 / rx).toFixed(4)}" numOctaves="3" seed="${id % 97}" result="n"><animate attributeName="baseFrequency" dur="2s" repeatCount="indefinite" values="${(3 / rx).toFixed(4)} ${(9 / rx).toFixed(4)};${(3.6 / rx).toFixed(4)} ${(10.5 / rx).toFixed(4)};${(3 / rx).toFixed(4)} ${(9 / rx).toFixed(4)}"/></feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="${(ry * .5).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="d"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 .16  0 0 0 0 .04  0 0 0 0 .02  0 0 0 -4.5 2.55" result="v"/><feComposite in="v" in2="d" operator="in" result="vd"/>
          <feMerge><feMergeNode in="d"/><feMergeNode in="vd"/></feMerge></filter></defs>
        <ellipse cx="${pcx}" cy="${pcy}" rx="${rx * 1.35}" ry="${ry * 2.1}" fill="url(#lh${id})"/>
        <ellipse cx="${pcx}" cy="${pcy}" rx="${rx * 1.05}" ry="${ry * 1.12}" fill="#1c0a05"/>
        <g filter="url(#lf${id})"><ellipse cx="${pcx}" cy="${pcy}" rx="${rx}" ry="${ry}" fill="url(#lg${id})"/></g>
        <ellipse class="lava-skin" cx="${pcx}" cy="${pcy}" rx="${rx * 1.06}" ry="${ry * 1.14}" fill="#1c0a05" opacity="0"/></svg>`);
      const poolAnim = anim(pool, [{ transform: 'scale(.05,.02)', opacity: 0 }, { transform: 'scale(1.08,1.12)', opacity: 1, offset: .1, easing: 'ease-out' }, { transform: 'scale(1,1)', opacity: 1, offset: .16 },
        { transform: 'scale(1.03,.97)', opacity: 1, offset: .45 }, { transform: 'scale(1,1.04)', opacity: 1, offset: .74 }, { transform: 'scale(.9,.9)', opacity: 1, offset: .86 }, { transform: 'scale(.2,.15)', opacity: 0, offset: 1 }]);
      anim(pool.querySelector('.lava-skin'), [{ opacity: 0 }, { opacity: 0, offset: .74 }, { opacity: .9, offset: .9 }, { opacity: .9 }]);
      // ---- Rocks round the rim (not in front of the card), each rising, bobbing, turning, then sinking.
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + rand(-.15, .15);
        if (Math.sin(a) > 0 && Math.abs(Math.cos(a)) < .35) continue;
        const f = rand(.86, 1.06), depth = Math.sin(a), r = H * rand(.2, .34) * (1 + .3 * depth);
        const rxp = cx + Math.cos(a) * rx * f, ryp = S + Math.sin(a) * ry * f;
        const el = add(`left:${rxp - r * 1.2}px;top:${ryp - r * .95}px;width:${r * 2.4}px;height:${r * 2}px;z-index:${depth > 0 ? 5 : 1}`, lavaRockSvg(`${id}-${i}`, r));
        const t0 = rand(0, .2), t1 = rand(1.45, 1.6), fb = rand(.7, 1.2), ph0 = rand(0, 6.3), spinY = rand(10, 22);
        anim(el, TIMES.map(o => {
          const T = o * D, e = ease(clamp((T - t0) / .3)), s = ease(clamp((T - t1) / .35));
          const ty = (1 - e) * r * 1.2 + Math.sin(T * 6.28 * fb + ph0) * H * .025 + s * r * 1.4;
          return { offset: o, opacity: e * (1 - s), transform: `translateY(${ty.toFixed(2)}px) rotate(${(Math.sin(T * 4 * fb + ph0) * 4).toFixed(2)}deg) rotateY(${(Math.sin(T * 1.7 + ph0) * spinY).toFixed(2)}deg) scale(${(.7 + .3 * e).toFixed(3)})` };
        }));
      }
      // ---- The card: lifts in the heat, sinks, burns away at the surface and softens as it goes.
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3`);
      const cut = add(`left:0;top:0;width:${W}px;height:${H}px;overflow:visible`, '', '');
      box.appendChild(cut);
      const char = document.createElement('div'), tint = document.createElement('div');
      tint.style.cssText = `position:absolute;inset:0;border-radius:8px;background:linear-gradient(to top,rgba(234,88,12,.45),rgba(234,88,12,.08) 70%)`;
      char.style.cssText = `position:absolute;left:-2px;top:0;width:${W + 4}px;height:${H}px;background:linear-gradient(to top,#fffbe6 0,#fde047 3%,#f97316 7%,rgba(124,45,18,.85) 14%,rgba(41,17,8,.55) 26%,rgba(41,17,8,0) 45%)`;
      cut.append(face(), tint, char);
      const dy = T => T < .2 ? -.1 * H * ease(T / .2) : T < LAVA_TOUCH ? -.1 * H + (dy0 + .1 * H) * ((T - .2) / (LAVA_TOUCH - .2)) ** 2 : dy0 + H * 1.06 * (1 - (1 - clamp((T - LAVA_TOUCH) / (LAVA_GONE - LAVA_TOUCH))) ** 1.5);
      const cutAt = T => H + dy0 - dy(T); // the surface, in the card's own pixels
      const melt = T => clamp((T - LAVA_TOUCH) / (LAVA_GONE - LAVA_TOUCH)), heat = T => clamp(T / LAVA_TOUCH);
      const jag = Array.from({ length: 9 }, () => rand(0, 6.3));
      anim(box, TIMES.map(o => {
        const T = o * D, m = melt(T), h = heat(T), c = cutAt(T);
        return { offset: o, transformOrigin: `50% ${Math.min(c, H).toFixed(1)}px`,
          transform: `translateY(${dy(T).toFixed(2)}px) rotate(${(Math.sin(T * 5) * 2 * m).toFixed(2)}deg) skewX(${(Math.sin(T * 9) * 6 * m).toFixed(2)}deg) scale(${(1 + .05 * m + .025 * Math.sin(T * 13) * m).toFixed(3)},${(1 - .16 * m).toFixed(3)})`,
          filter: `drop-shadow(0 0 ${(2 + 14 * h).toFixed(1)}px rgba(249,115,22,${(.2 + .6 * h).toFixed(2)})) drop-shadow(0 ${(4 * m).toFixed(1)}px ${(8 * m).toFixed(1)}px rgba(220,38,38,${(.6 * m).toFixed(2)}))` };
      }));
      anim(cut, TIMES.map(o => {
        const T = o * D, c = Math.min(cutAt(T), H * 1.1), edge = jag.map((p, j) => `${(110 - j * 15).toFixed(1)}% ${(c + H * (.035 * Math.sin(j * 2.1 + T * 14 + p) + .02 * Math.sin(j * 5.3 - T * 9))).toFixed(1)}px`);
        return { offset: o, clipPath: `polygon(-10% -10%, 110% -10%, ${edge.join(', ')})` };
      }));
      anim(char, TIMES.map(o => { const T = o * D; return { offset: o, opacity: clamp((T - LAVA_TOUCH + .06) / .1), transform: `translateY(${(cutAt(T) - H + H * .03).toFixed(1)}px)` }; }));
      anim(tint, TIMES.map(o => ({ offset: o, opacity: heat(o * D) })));
      // The white-hot seam where the card meets the lava.
      const seam = add(`left:${cx - W * .75}px;top:${S - H * .13}px;width:${W * 1.5}px;height:${H * .26}px;z-index:4;border-radius:50%;background:radial-gradient(closest-side,#fffbe6,rgba(253,224,71,.85) 35%,rgba(234,88,12,.4) 65%,transparent)`);
      anim(seam, TIMES.map(o => { const T = o * D, on = T >= LAVA_TOUCH - .02 && T <= LAVA_GONE + .05; return { offset: o, opacity: on ? .75 + .25 * Math.sin(T * 40) : 0, transform: `scaleX(${on ? (1 - .3 * melt(T)).toFixed(3) : .3})` }; }));
      // ---- Splash, ripples, bubbles, steam and embers.
      const p = T => T / D;
      for (let i = 0; i < 8; i++) {
        const side = i % 2 ? 1 : -1, s = H * rand(.04, .075), vx = side * H * rand(1.4, 3), vy = -H * rand(2.4, 4), g = H * 14, x0 = cx + side * W * rand(.4, .55), life = (-2 * vy / g) * .98;
        const el = add(`left:${x0 - s / 2}px;top:${S - s / 2}px;width:${s}px;height:${s * 1.15}px;z-index:4;border-radius:50% 50% 45% 45%;background:radial-gradient(circle at 40% 35%,#fffbe6,#fbbf24 35%,#ea580c 70%,#7f1d1d)`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'translate(0,0) scale(.3)' }, { offset: p(LAVA_TOUCH), opacity: 0, transform: 'translate(0,0) scale(.3)' },
          ...[.15, .35, .55, .75, 1].map(u => { const t = u * life; return { offset: p(LAVA_TOUCH + t), opacity: u < 1 ? 1 : 0, transform: `translate(${(vx * t).toFixed(1)}px,${(vy * t + g * t * t / 2).toFixed(1)}px) scale(${(1 - u * .4).toFixed(2)},${(1 + Math.abs(vy + g * t) / H * .08).toFixed(2)})` }; }),
          { offset: 1, opacity: 0, transform: 'translate(0,0) scale(.3)' }]);
      }
      [LAVA_TOUCH, LAVA_TOUCH + .12, LAVA_TOUCH + .26, LAVA_GONE].forEach((at, i) => {
        const el = add(`left:${cx - W * .6}px;top:${S - H * .1}px;width:${W * 1.2}px;height:${H * .2}px;z-index:2;border-radius:50%;border:${Math.max(1.5, H * .02)}px solid rgba(254,240,138,.8)`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'scale(.4)' }, { offset: p(at), opacity: 0, transform: 'scale(.4)' }, { offset: p(at) + .01, opacity: .9, transform: 'scale(.5)' }, { offset: Math.min(1, p(at + .38)), opacity: 0, transform: `scale(${2.2 + i * .2})` }, { offset: 1, opacity: 0, transform: 'scale(2.6)' }]);
      });
      LAVA_POPS.forEach(at => {
        const u = rand(-1, 1), v = rand(-1, 1) * Math.sqrt(1 - u * u) * .7, s = H * rand(.1, .2), bx = cx + u * rx * .8, by = S + v * ry;
        const bub = add(`left:${bx - s / 2}px;top:${by - s * .35}px;width:${s}px;height:${s * .7}px;z-index:2;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fffbe6,#fbbf24 30%,#ea580c 65%,#991b1b)`);
        const ring = add(`left:${bx - s}px;top:${by - s * .4}px;width:${s * 2}px;height:${s * .8}px;z-index:2;border-radius:50%;border:1.5px solid rgba(253,224,71,.85)`);
        anim(bub, [{ offset: 0, opacity: 0, transform: 'scale(0)' }, { offset: p(at - .22), opacity: 0, transform: 'scale(0)' }, { offset: p(at - .2), opacity: 1, transform: 'scale(.3)' }, { offset: p(at), opacity: 1, transform: 'scale(1.1,1.2)' }, { offset: p(at) + .006, opacity: 0, transform: 'scale(1.4)' }, { offset: 1, opacity: 0, transform: 'scale(1.4)' }]);
        anim(ring, [{ offset: 0, opacity: 0, transform: 'scale(.3)' }, { offset: p(at), opacity: 0, transform: 'scale(.3)' }, { offset: p(at) + .006, opacity: 1, transform: 'scale(.5)' }, { offset: Math.min(1, p(at + .3)), opacity: 0, transform: 'scale(1.6)' }, { offset: 1, opacity: 0, transform: 'scale(1.6)' }]);
      });
      for (let i = 0; i < 7; i++) {
        const t0 = rand(LAVA_TOUCH, 1.3), s = H * rand(.4, .6), el = add(`left:${cx + rand(-.4, .4) * W - s / 2}px;top:${S - s * .8}px;width:${s}px;height:${s}px;z-index:4;border-radius:50%;background:radial-gradient(closest-side,rgba(255,237,225,.38),rgba(214,211,209,.12) 60%,transparent)`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'translate(0,0) scale(.4)' }, { offset: p(t0), opacity: 0, transform: 'translate(0,0) scale(.4)' }, { offset: p(t0 + .15), opacity: 1, transform: `translate(${rand(-.2, .2) * H}px,${-H * .4}px) scale(.9)` }, { offset: p(t0 + .6), opacity: 0, transform: `translate(${rand(-.4, .4) * H}px,${-H * 1.5}px) scale(2)` }, { offset: 1, opacity: 0, transform: 'scale(2)' }]);
      }
      for (let i = 0; i < 28; i++) {
        const t0 = rand(.15, 1.4), life = rand(.4, .55), s = H * rand(.025, .05), rise = H * rand(1.2, 2.6), sway = rand(-.4, .4) * H;
        const el = add(`left:${cx + rand(-.85, .85) * rx - s / 2}px;top:${S + rand(-.5, .3) * ry}px;width:${s}px;height:${s}px;z-index:4;border-radius:50%;background:#fde68a;box-shadow:0 0 ${s * 2}px ${s * .6}px rgba(249,115,22,.85)`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'translate(0,0)' }, { offset: p(t0), opacity: 0, transform: 'translate(0,0)' }, { offset: p(t0) + .01, opacity: 1, transform: 'translate(0,0)' },
          { offset: p(t0 + life * .5), opacity: 1, transform: `translate(${sway * .6}px,${-rise * .55}px)` }, { offset: p(t0 + life), opacity: 0, transform: `translate(${sway}px,${-rise}px) scale(.4)` }, { offset: 1, opacity: 0, transform: 'scale(.4)' }]);
      }
      end(poolAnim);
    }
    // ---- Level burns (v253, owner's art): earn-only, one per level band ----
    // Spark Snap (5), Smoke Burst (20), Inferno Sweep (40), Hellfire Spiral
    // (60), Royal Incineration (80), The ShitStorm (99). Built from the
    // shared pieces below; each is over (every piece removed) within ~2.1s.
    const LB_SUITS = {
      spade: '<path d="M10 1C4 7 1 10 3 13.2c2 3 5 2.2 6-.2L8 19h4l-1-6c1 2.4 4 3.2 6 .2C19 10 16 7 10 1Z"/>',
      heart: '<path d="M10 18C2.5 12.5 0 8.6 1.8 5.2 3.6 1.9 8 2.2 10 6c2-3.8 6.4-4.1 8.2-.8C20 8.6 17.5 12.5 10 18Z"/>',
      diamond: '<path d="M10 1 18 10 10 19 2 10Z"/>',
      club: '<circle cx="10" cy="6" r="4.2"/><circle cx="5.3" cy="11.6" r="4.2"/><circle cx="14.7" cy="11.6" r="4.2"/><path d="M9 11.5 7.4 19h5.2L11 11.5Z"/>'
    };
    const lbSuitSvg = (suit, fill, stroke = 'none', sw = 0) => bfxSvg(20, 20, `<g fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round">${LB_SUITS[suit]}</g>`);
    // A card for the pile: face with a suit pip, or a dark back with a gold star.
    const lbCardSvg = (back, suit = 'spade', pip = '#111827') => bfxSvg(40, 56, back
      ? `<rect x="1.5" y="1.5" width="37" height="53" rx="4.5" fill="#1c1917" stroke="#b8872e" stroke-width="2"/><rect x="5" y="5" width="30" height="46" rx="3" fill="none" stroke="#a16207" stroke-width="1" opacity=".8"/><path d="M20 16 22.6 25.4 32 28 22.6 30.6 20 40 17.4 30.6 8 28 17.4 25.4Z" fill="#e8b64c"/><circle cx="20" cy="28" r="3.2" fill="#1c1917" stroke="#e8b64c" stroke-width="1"/>`
      : `<rect x="1.5" y="1.5" width="37" height="53" rx="4.5" fill="#f5efe1" stroke="#44403c" stroke-width="2"/><g transform="translate(10 18) scale(1)" fill="${pip}">${LB_SUITS[suit]}</g><g transform="translate(5 5) scale(.42)" fill="${pip}">${LB_SUITS[suit]}</g>`);
    // A burnt scrap of card: a jagged dark shard with a glowing edge.
    function lbShardSvg(edge, fill = '#1a0f0a') {
      const n = 6, pts = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + bfxRand(-.3, .3), r = bfxRand(5, 10); pts.push(`${(10 + Math.cos(a) * r).toFixed(1)},${(10 + Math.sin(a) * r).toFixed(1)}`); }
      return bfxSvg(20, 20, `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${edge}" stroke-width="1.6" stroke-linejoin="round"/>`);
    }
    // Soft glow disc (flashes, ground light).
    function lbGlow(host, x, y, w, h, gradient, frames, opts) {
      const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;background:${gradient}"></div>`, x, y, w, h);
      bfxAnimate(el, frames, opts);
      return el;
    }
    // Spark streaks shooting out from (x, y).
    function lbSparks(host, x, y, k, { n = 20, colors = ['#fde68a', '#fb923c'], dist = [60, 140], len = [14, 30], delay = [0, 100], dur = [420, 700], up = 0 } = {}) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + bfxRand(-.25, .25) - (up ? up * Math.sin((i / n) * Math.PI) * 0 : 0);
        const ang = up ? -Math.PI / 2 + bfxRand(-1.3, 1.3) : a;
        const d = bfxRand(...dist) * k, l = bfxRand(...len) * k, c = colors[i % colors.length];
        const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:2px;background:linear-gradient(90deg,transparent,${c} 55%,#fff);box-shadow:0 0 ${5 * k}px ${c}"></div>`, x, y, l, Math.max(1.5, 2.2 * k));
        const deg = (ang * 180) / Math.PI;
        el.style.transformOrigin = '0% 50%';
        el.style.left = `${x}px`;
        bfxAnimate(el, [
          { transform: `rotate(${deg}deg) translateX(0) scaleX(.2)`, opacity: 0 },
          { transform: `rotate(${deg}deg) translateX(${d * .15}px) scaleX(1)`, opacity: 1, offset: .12 },
          { transform: `rotate(${deg + (up ? 0 : bfxRand(-8, 8))}deg) translateX(${d}px) scaleX(.15)`, opacity: 0 }
        ], { duration: bfxRand(...dur), delay: bfxRand(...delay), easing: 'cubic-bezier(.15,.7,.3,1)' });
      }
    }
    // Glowing embers drifting up.
    function lbEmbers(host, x, y, k, { n = 16, colors = ['#fdba74', '#f97316'], spread = 60, rise = [60, 140], delay = [100, 500], dur = [700, 1100], size = [2.5, 5] } = {}) {
      for (let i = 0; i < n; i++) {
        const c = colors[i % colors.length], s = bfxRand(...size) * k;
        const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,#fff,${c} 55%);box-shadow:0 0 ${6 * k}px ${c}"></div>`, x + bfxRand(-spread, spread) * k, y + bfxRand(-10, 10) * k, s, s);
        const r = bfxRand(...rise) * k, sway = bfxRand(-30, 30) * k;
        bfxAnimate(el, [{ transform: 'translate(0,0) scale(.4)', opacity: 0 }, { transform: `translate(${sway * .3}px,${-r * .2}px) scale(1)`, opacity: 1, offset: .15 },
          { transform: `translate(${-sway * .4}px,${-r * .6}px) scale(.9)`, opacity: .9, offset: .55 }, { transform: `translate(${sway}px,${-r}px) scale(.3)`, opacity: 0 }],
          { duration: bfxRand(...dur), delay: bfxRand(...delay), easing: 'ease-out' });
      }
    }
    // A flattened ring on the table that spreads out.
    function lbRing(host, x, y, k, { w = 160, color = '#fb923c', core = '#fff7ed', width = 3, dash = '', delay = 0, dur = 700, from = .2, to = 1.2 } = {}) {
      const el = bfxAdd(host, bfxSvg(200, 80, `<ellipse cx="100" cy="40" rx="94" ry="34" fill="none" stroke="${color}" stroke-width="${width * 2.4}" opacity=".45" ${dash ? `stroke-dasharray="${dash}"` : ''}/>
        <ellipse cx="100" cy="40" rx="94" ry="34" fill="none" stroke="${core}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`), x, y, w * k, w * .4 * k);
      el.style.filter = `drop-shadow(0 0 ${6 * k}px ${color})`;
      bfxAnimate(el, [{ transform: `scale(${from})`, opacity: 0 }, { transform: `scale(${from + (to - from) * .35})`, opacity: 1, offset: .25 }, { transform: `scale(${to})`, opacity: 0 }], { duration: dur, delay, easing: 'cubic-bezier(.2,.7,.3,1)' });
    }
    // A flame tongue (BFX_FLAME_PATH) in the given colours.
    function lbFlame(host, x, y, k, size, [base, mid, tip], frames, opts) {
      const gid = `bfx-g-${++bfxGradientSeq}`;
      const el = bfxAdd(host, `<svg width="100%" height="100%" viewBox="10 8 44 46" preserveAspectRatio="none"><defs><linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${base}"/><stop offset=".55" stop-color="${mid}"/><stop offset="1" stop-color="${tip}"/></linearGradient></defs>
        <path d="${BFX_FLAME_PATH}" fill="${mid}" opacity=".35" transform="translate(32 52) scale(1.18) translate(-32 -52)"/>
        <path d="${BFX_FLAME_PATH}" fill="url(#${gid})" opacity=".92"/><path d="M32 29c3 4 7 7 7 12 0 4.5-3 7.5-7 7.5s-7-3-7-7.5c0-3.5 3-7 7-12Z" fill="${tip}" opacity=".8"/></svg>`, x, y - size * .45, size, size * 1.1);
      el.style.transformOrigin = '50% 100%';
      // Fire adds light: blended with screen and haloed, so it glows.
      el.style.mixBlendMode = 'screen';
      el.style.filter = `drop-shadow(0 0 ${Math.max(3, size * .12)}px ${mid}) blur(${Math.max(.3, size * .006)}px)`;
      bfxAnimate(el, frames || [
        { transform: 'scale(.2,.1)', opacity: 0 }, { transform: 'scale(1,1.1)', opacity: 1, offset: .2 },
        { transform: 'scale(.9,1.25) skewX(5deg)', opacity: 1, offset: .5 }, { transform: 'scale(1.05,1.1) skewX(-5deg)', opacity: .9, offset: .75 },
        { transform: 'scale(.5,1.5) translateY(-10%)', opacity: 0 }], opts);
      return el;
    }
    // Smoke puffs rising (dark or light).
    function lbSmoke(host, x, y, k, { n = 12, fill = 'radial-gradient(circle,rgba(28,20,18,.85),rgba(12,8,8,.45) 50%,transparent 70%)', rise = [120, 220], size = [50, 100], delay = [0, 300], dur = [1100, 1500], spread = 30 } = {}) {
      for (let i = 0; i < n; i++) {
        const s = bfxRand(...size) * k, sway = (i % 2 ? 1 : -1) * bfxRand(10, 40) * k, r = bfxRand(...rise) * k;
        const el = bfxAdd(host, `<div style="width:100%;height:100%;border-radius:50%;filter:blur(${5 * k}px);background:${typeof fill === 'function' ? fill(i) : fill}"></div>`, x + bfxRand(-spread, spread) * k, y, s, s);
        bfxAnimate(el, [{ transform: 'translate(0,0) scale(.3)', opacity: 0 }, { transform: `translate(${sway * .4}px,${-r * .25}px) scale(1)`, opacity: .9, offset: .25 },
          { transform: `translate(${sway}px,${-r}px) scale(${bfxRand(1.8, 2.5)})`, opacity: 0 }], { duration: bfxRand(...dur), delay: bfxRand(...delay), easing: 'ease-out' });
      }
    }
    // The pile's top cards catching and burning away.
    function lbPileBurn(host, x, y, k, { glow = '#f97316', cards = 3, delay = 0, dur = 700, back = false } = {}) {
      for (let i = 0; i < cards; i++) {
        const el = bfxAdd(host, lbCardSvg(back || i === cards - 1, ['spade', 'heart', 'club', 'diamond'][i % 4], i % 2 ? '#b91c1c' : '#111827'), x + (i - (cards - 1) / 2) * 6 * k, y + (i - 1) * 2 * k, 34 * k, 48 * k);
        el.style.filter = `drop-shadow(0 0 ${6 * k}px ${glow})`;
        const rot = (i - (cards - 1) / 2) * 9;
        bfxAnimate(el, [{ transform: `rotate(${rot}deg) scale(1)`, opacity: 1, filter: 'brightness(1)' },
          { transform: `rotate(${rot}deg) scale(1.04)`, opacity: 1, filter: 'brightness(1.6) sepia(.6)', offset: .35 },
          { transform: `rotate(${rot * 1.5}deg) scale(.7) translateY(${4 * k}px)`, opacity: .6, filter: 'brightness(.25)', offset: .75 },
          { transform: `rotate(${rot * 2}deg) scale(.4) translateY(${8 * k}px)`, opacity: 0, filter: 'brightness(0)' }], { duration: dur, delay: delay + i * 40, easing: 'ease-in' });
      }
    }
    // Burning scraps flung out (or up), turning as they go.
    function lbShards(host, x, y, k, { n = 14, edge = '#ef4444', fill, dist = [60, 130], lift = [20, 70], size = [8, 15], delay = [100, 300], dur = [900, 1250], fall = 50 } = {}) {
      for (let i = 0; i < n; i++) {
        const a = bfxRand(-Math.PI, 0) * (i % 3 ? 1 : .6), d = bfxRand(...dist) * k, s = bfxRand(...size) * k;
        const el = bfxAdd(host, lbShardSvg(edge, fill), x + bfxRand(-10, 10) * k, y, s, s);
        el.style.filter = `drop-shadow(0 0 ${3 * k}px ${edge})`;
        const dx = Math.cos(a) * d, dy = Math.sin(a) * d - bfxRand(...lift) * k;
        bfxAnimate(el, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { transform: 'translate(0,0) rotate(0)', opacity: 1, offset: .05 },
          { transform: `translate(${dx * .7}px,${dy * .8}px) rotate(${bfxRand(-240, 240)}deg)`, opacity: 1, offset: .55 },
          { transform: `translate(${dx}px,${dy + fall * k}px) rotate(${bfxRand(-480, 480)}deg) scale(.5)`, opacity: 0 }], { duration: bfxRand(...dur), delay: bfxRand(...delay), easing: 'cubic-bezier(.2,.6,.4,1)' });
      }
    }

    function bfxSparkSnap(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-spark-snap', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-spark-snap', host, x, y, k, calm);
    }
    function bfxSmokeBurst(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-smoke-burst', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-smoke-burst', host, x, y, k, calm);
    }
    // Any card part that turns over in a 3D burn shows the burning player's own card back.
    function burnBackClass() {
      const p = burnFxPlayer, own = !p || p.id === state?.localPlayerId;
      return getThemeDeckBackClass((p && p.cosmetics && p.cosmetics.cardBack) || (own ? equippedCosmetics.cardBack : 'default'));
    }
    // 3D level burns (v296): only the real top Pile card burns; previews burn a lone 10.
    function levelBurn3d(id, host, x, y, k, calm) {
      if (!window.ShLevel3D || !ShLevel3D.has(id)) return false;
      const onTable = host && host.id === 'burnFxLayer';
      const cardEls = onTable ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')] : [];
      const pile = onTable ? document.getElementById('discardPileContainer') : null;
      return ShLevel3D.play(id, host, x, y, k, calm, { cardEls, cardH: pile && pile.offsetHeight, backClass: burnBackClass() });
    }
    // Default Burn without WebGL (the 3D one plays from playBurnFx): the old ember burst.
    function bfxDefaultBurn(host, x, y, k) {
      if (host.id === 'burnFxLayer') triggerBurnEmberExplosion(x, y); else sfxFlash(host, x, y, k, '#f97316', 140, 700);
    }
    function bfxInfernoSweep(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-inferno-sweep', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-inferno-sweep', host, x, y, k, calm);
    }
    function bfxHellfireSpiral(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-hellfire-spiral', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-hellfire-spiral', host, x, y, k, calm);
    }
    function bfxRoyalIncineration(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-royal-incineration', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-royal-incineration', host, x, y, k, calm);
    }
    function bfxShitStorm(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-shitstorm', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-shitstorm', host, x, y, k, calm);
    }
    function playBurnFx(id, host, x, y, scale = 1) {
      if (!host) return false;
      if (id === PRIVATE_BURN_ID) { playPrivateBurn(host,x,y,scale); return true; }
      // Painted-art 3D burns (art/burns/level-3d/burns3d.js); their old effects stay as the fallback.
      if (window.ShLevel3D && ShLevel3D.has(id) && levelBurn3d(id, host, x, y, scale, reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches)) return true;
      ({ default: bfxDefaultBurn, 'burn-electric': bfxLightning, 'burn-coloured': bfxColouredFlame, 'burn-sweets': bfxSweets, 'burn-paint': bfxPaint, 'burn-smoke': bfxSmoke,
        'burn-blackhole': bfxBlackHole, 'burn-origami': bfxOrigami, 'burn-pixel': bfxPixelBlast, 'burn-lava': bfxLavaMelt,
        'burn-lvl-spark-snap': bfxSparkSnap, 'burn-lvl-smoke-burst': bfxSmokeBurst, 'burn-lvl-inferno-sweep': bfxInfernoSweep,
        'burn-lvl-hellfire-spiral': bfxHellfireSpiral, 'burn-lvl-royal-incineration': bfxRoyalIncineration, 'burn-lvl-shitstorm': bfxShitStorm }[id] || (typeof SEASONAL_BURN_FX !== 'undefined' && SEASONAL_BURN_FX[id]) || (() => {}))(host, x, y, scale);
      return true;
    }

    // Reduce motion: a single soft glow instead of flying particles and shakes.
    function playCalmBurn(x, y) {
      const layer = document.getElementById('burnFxLayer');
      if (!layer) return;
      const el = bfxAdd(layer, '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,rgba(253,186,116,.75),rgba(249,115,22,.25) 45%,transparent 70%)"></div>', x, y, 120, 120);
      bfxAnimate(el, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    }
    function playBurnEffect(effect, x, y) {
      if(effect===PRIVATE_BURN_ID)return playBurnFx(effect,document.getElementById('burnFxLayer'),x,y,1);
      if (ShLevelBurns.index(effect) >= 0) return playBurnFx(effect, document.getElementById('burnFxLayer'), x, y, .72);
      if (typeof reduceMotion !== 'undefined' && reduceMotion) return playCalmBurn(x, y);
      if (effect === 'burn-ice') return triggerBurnEmberExplosion(x, y, ['#e0f2fe','#7dd3fc','#38bdf8','#ffffff'], 70);
      if (SHAPE_BURN_EFFECTS.has(effect)) {
        playBurnFx(effect, document.getElementById('burnFxLayer'), x, y, 1);
        const table = document.getElementById('gameTable');
        if ((effect === 'burn-electric' || effect === 'burn-lvl-shitstorm') && table) {
          table.classList.add('animate-screen-shake');
          setTimeout(() => table.classList.remove('animate-screen-shake'), 400);
        }
        return;
      }
      triggerBurnEmberExplosion(x, y);
    }

    // The Burn cosmetic a player has equipped (their own from equippedCosmetics).
    function burnEffectIdFor(player) {
      if(player && player.id!==state?.localPlayerId && player.cosmetics?.burnEffect===PRIVATE_BURN_ID)return 'default';
      const ownEffect = (typeof equippedCosmetics !== 'undefined' && equippedCosmetics.burnEffect) || 'default';
      if (player?.id === state?.localPlayerId && ownEffect === PRIVATE_BURN_ID && ownedPrivateBurns().length) return ownEffect;
      if (player && player.id !== state?.localPlayerId && !othersEffectsOn) return 'default';
      return player?.cosmetics?.burnEffect || (player?.id === state?.localPlayerId ? ownEffect : 'default') || 'default';
    }
    let burnFxPlayer = null; // whose burn is playing, for effects that show their card back
    function triggerEquippedBurnEffect(x, y, player = null) {
      burnFxPlayer = player;
      try {
        playBurnEffect(burnEffectIdFor(player), x, y);
      } catch (error) {
        console.warn('Burn cosmetic skipped safely:', error);
      }
    }
  