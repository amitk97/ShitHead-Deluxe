
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
    const SEASON_BURN_IDS = ['burn-ss2611-sandstorm', 'burn-ss2701-glacier', 'burn-ss2703-shuriken', 'burn-ss2705-whirlpool', 'burn-ss2707-zeus', 'burn-ss2709-hex'];
    const SHAPE_BURN_EFFECTS = new Set([...SEASON_BURN_IDS, 'default', 'burn-electric', 'burn-coloured', 'burn-sweets', 'burn-ice', 'burn-paint', 'burn-smoke', 'burn-blackhole', 'burn-origami', 'burn-pixel', 'burn-lava', 'burn-ldn-routemaster', 'burn-mum-monsoon', ...LEVEL_BURN_IDS]);
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
      for (let i = 0; i < 15; i++) spawn({ fx: cx + (i / 14 - .5) * W * 1.1 + rand(-4, 4), w: H * rand(.2, .3), h: H * rand(.36, .6), z: i % 2 ? 4 : 2, t0: CF_START - .1 + rand(0, .12), t1: CF_END - .25 + rand(0, .1), ride: true });
      for (let i = 0; i < 26; i++) { const depth = rand(-1, 1); spawn({ fx: cx + rand(-1, 1) * W * 1.25, base: cy + H * (.5 + .12 * depth), w: H * rand(.3, .5) * (1 + .25 * depth), h: H * rand(.8, 1.5) * (1 + .2 * depth), z: depth > .3 ? 4 : 1, t0: rand(0, .22), t1: rand(1.4, 1.65), ride: false }); }
      // ---- Spectral sparks and coloured haze rising.
      for (let i = 0; i < 90; i++) {
        const t0 = rand(.1, 1.4), life = rand(.35, .5), s = H * rand(.02, .045), rise = H * rand(1.1, 2.6), sw = rand(-.5, .5) * H, col = ['#e9d5ff', '#f9a8d4', '#a5f3fc', '#c7d2fe'][i % 4];
        const el = add(`position:absolute;left:${cx + rand(-.8, .8) * W - s / 2}px;top:${cy + rand(-.1, .5) * H}px;width:${s}px;height:${s}px;z-index:4;border-radius:50%;background:#fff;box-shadow:0 0 ${s * 2.5}px ${s * .8}px ${col}`);
        anim(el, [{ offset: 0, opacity: 0, transform: 'translate(0,0)' }, { offset: t0 / D, opacity: 0, transform: 'translate(0,0)' }, { offset: t0 / D + .01, opacity: 1, transform: 'translate(0,0)' },
          { offset: (t0 + life * .5) / D, opacity: 1, transform: `translate(${sw * .5}px,${-rise * .5}px)` }, { offset: (t0 + life) / D, opacity: 0, transform: `translate(${sw}px,${-rise}px) scale(.3)` }, { offset: 1, opacity: 0, transform: 'scale(.3)' }]);
      }
      for (let i = 0; i < 9; i++) {
        const t0 = rand(.3, 1.3), s = H * rand(.8, 1.3), el = add(`position:absolute;left:${cx + rand(-.5, .5) * W - s / 2}px;top:${cy - H * .6 - s / 2}px;width:${s}px;height:${s}px;z-index:1;border-radius:50%;background:radial-gradient(closest-side,${['rgba(168,85,247,.28)', 'rgba(236,72,153,.22)', 'rgba(34,211,238,.2)'][i % 3]},transparent)`);
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
    // ---- v404 procedural burns: Ice Shatter, Paint Splats, Smoke Show (owner: the real top card, DOM/SVG) ----
    // All three run on ONE 2s clock from `procBurnStage`, every animation a sampled keyframe list (PFX_N steps)
    // so physics and easing are exact on a paused frame. Fragments never turn past 65deg, so no back shows.
    const PFX_N = 100, PFX_MS = 2000;
    function pfxKit(st) {
      const clamp = v => Math.max(0, Math.min(1, v)), rand = (a, b) => a + Math.random() * (b - a), D = PFX_MS / 1000;
      const T = Array.from({ length: PFX_N + 1 }, (_, i) => i / PFX_N);
      return { clamp, rand, D, ease: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, out: t => 1 - Math.pow(1 - t, 3),
        sm: (a, b, t) => clamp((t - a) / (b - a)), fr: fn => T.map(o => ({ offset: o, ...fn(o * D) })),
        add: (css, html = '', parent = st.layer) => { const el = document.createElement('div'); el.className = 'bfx'; el.style.cssText = css; el.innerHTML = html; parent.appendChild(el); return el; } };
    }
    const pfxStar = (c, n) => `<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0 11.4 8.6 20 10 11.4 11.4 10 20 8.6 11.4 0 10 8.6 8.6Z" fill="${c}"/></svg>`;

    // Ice Shatter: frost creeps in from the edges (fern lines, a cold sheen, crystals grow round the card),
    // the card cracks from the strike point, jolts, then bursts into ~70 glassy shards that tumble, bounce off
    // the table and melt away; glints, a shock ring, cold mist and snow dust. Sound: BURN_SOUNDS['burn-ice'].
    const ICE_CRACK = .62, ICE_BREAK = .86;
    function bfxIce(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const { clamp, rand, ease, out, D, sm, fr, add } = pfxKit(st), px = H / 100;
      const ip = [W * rand(.4, .6), H * rand(.35, .55)], abs = (u, v) => [cx - W / 2 + u, cy - H / 2 + v];
      const glow = add(`left:${cx - H * 1.3}px;top:${cy - H * 1.3}px;width:${H * 2.6}px;height:${H * 2.6}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(125,211,252,.55),rgba(56,189,248,.2) 50%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: (.5 * sm(0, ICE_BREAK, t) + (t >= ICE_BREAK ? .5 * (1 - sm(ICE_BREAK, 1.4, t)) : 0)) * (1 - sm(1.3, 1.95, t)), transform: `scale(${(.7 + .4 * sm(0, ICE_BREAK, t) + .3 * sm(ICE_BREAK, 1.3, t)).toFixed(3)})` })));
      // ---- The card, frosting over.
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius};overflow:hidden`);
      const tint = document.createElement('div'), sheen = document.createElement('div'), rim = document.createElement('div');
      tint.style.cssText = `position:absolute;inset:0;background:linear-gradient(135deg,rgba(224,242,254,.6),rgba(125,211,252,.28) 50%,rgba(224,242,254,.55))`;
      sheen.style.cssText = `position:absolute;inset:0;background:linear-gradient(105deg,transparent 38%,rgba(255,255,255,.8) 50%,transparent 62%)`;
      rim.style.cssText = `position:absolute;inset:0;border-radius:${radius}`;
      const levels = [[], [], [], []], fern = (x0, y0, a, len, d) => {
        const ex = x0 + Math.cos(a) * len, ey = y0 + Math.sin(a) * len;
        levels[d].push(`M${x0.toFixed(1)} ${y0.toFixed(1)}L${ex.toFixed(1)} ${ey.toFixed(1)}`);
        if (d < 3) [.34, .6, .86].forEach((f, i) => fern(x0 + (ex - x0) * f, y0 + (ey - y0) * f, a + (i % 2 ? 1 : -1) * rand(.7, 1.05), len * (.5 - .07 * i), d + 1));
      };
      [[0, 0, .78], [W, 0, 2.36], [0, H, -.78], [W, H, -2.36], [W / 2, 0, 1.57], [W / 2, H, -1.57]].forEach(([sx, sy, a]) => fern(sx, sy, a + rand(-.15, .15), H * .46, 0));
      const lines = (pts, w, col, op) => `<path d="${pts}" pathLength="1" stroke-dasharray="1" stroke="${col}" stroke-opacity="${op}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
      const fernSvg = document.createElement('div');
      fernSvg.style.cssText = 'position:absolute;inset:0';
      fernSvg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${levels.map((l, d) => lines(l.join(''), (2.4 - d * .5) * px * 1.2, '#7dd3fc', .35) + lines(l.join(''), (1.3 - d * .25) * px, '#fff', .95)).join('')}</svg>`;
      const cracks = [], nC = 9;
      for (let i = 0; i < nC; i++) {
        const a = (i / nC) * Math.PI * 2 + rand(-.25, .25); let u = ip[0], v = ip[1], d = `M${u.toFixed(1)} ${v.toFixed(1)}`;
        for (let s = 0; s < 7; s++) { const aj = a + rand(-.35, .35); u += Math.cos(aj) * H * .13; v += Math.sin(aj) * H * .13; d += `L${u.toFixed(1)} ${v.toFixed(1)}`; }
        cracks.push(d);
      }
      const crackSvg = document.createElement('div');
      crackSvg.style.cssText = 'position:absolute;inset:0';
      crackSvg.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0">${cracks.map(d => lines(d, 3.4 * px, '#38bdf8', .4) + lines(d, 1.2 * px, '#fff', 1)).join('')}</svg>`;
      box.append(face(), tint, sheen, rim, fernSvg, crackSvg);
      const paths = [...fernSvg.querySelectorAll('path')], cpaths = [...crackSvg.querySelectorAll('path')];
      paths.forEach((p, i) => { const d = Math.floor(i / 2), s0 = ICE_CRACK * .1 + d * .13; anim(p, fr(t => ({ strokeDashoffset: 1 - out(sm(s0, s0 + .3, t)) }))); });
      cpaths.forEach((p, i) => { const s0 = ICE_CRACK + (i >> 1) * .008; anim(p, fr(t => ({ strokeDashoffset: 1 - out(sm(s0, s0 + .13, t)) }))); });
      anim(tint, fr(t => ({ opacity: .75 * sm(.05, ICE_CRACK, t) })));
      anim(sheen, fr(t => ({ opacity: t > .4 && t < .8 ? 1 : 0, transform: `translateX(${((sm(.42, .78, t) * 2 - 1) * 100).toFixed(1)}%)` })));
      anim(rim, fr(t => { const m = sm(0, ICE_CRACK, t); return { boxShadow: `inset 0 0 ${(H * .12 * m).toFixed(1)}px ${(H * .05 * m).toFixed(1)}px rgba(240,249,255,.95), inset 0 0 ${(H * .3 * m).toFixed(1)}px ${(H * .04 * m).toFixed(1)}px rgba(186,230,253,.75)` }; }));
      anim(box, fr(t => { const j = sm(ICE_CRACK, ICE_BREAK, t), sh = Math.sin(t * 90) * H * .014 * j; return { opacity: t < ICE_BREAK ? 1 : 0, transform: `translate(${sh.toFixed(2)}px,${(Math.sin(t * 71) * H * .01 * j).toFixed(2)}px) scale(${(1 + .05 * j * j).toFixed(3)})` }; }));
      // ---- Ice crystals growing round the card, bursting at the break.
      for (let i = 0; i < 14; i++) {
        const side = i % 4, u = rand(.08, .92), L = H * rand(.13, .3), w = H * rand(.05, .09), jit = rand(-14, 14);
        const [bx, by] = abs(side === 1 ? W : side === 3 ? 0 : u * W, side === 0 ? 0 : side === 2 ? H : u * H), rot = [0, 90, 180, 270][side] + jit;
        const s0 = .04 + i * .022, el = add(`left:${bx - w / 2}px;top:${by - L}px;width:${w}px;height:${L}px;z-index:4;transform-origin:50% 100%;clip-path:polygon(50% 0,100% 100%,0 100%);background:linear-gradient(to top,rgba(125,211,252,.85),rgba(224,242,254,.85) 60%,#fff)`);
        anim(el, fr(t => { const g = out(sm(s0, s0 + .42, t)), b = sm(ICE_BREAK, ICE_BREAK + .1, t); return { opacity: (1 - b) * Math.min(1, g * 3), transform: `rotate(${rot}deg) scale(${(1 + .25 * b).toFixed(3)},${(g * (1 + .3 * b)).toFixed(3)})` }; }));
      }
      // ---- The shards: a jittered grid, each cell split in two.
      const cols = 5, rows = 7, pts = [];
      for (let r = 0; r <= rows; r++) { pts.push([]); for (let c = 0; c <= cols; c++) pts[r].push([c / cols * W + (c && c < cols ? rand(-.32, .32) * W / cols : 0), r / rows * H + (r && r < rows ? rand(-.32, .32) * H / rows : 0)]); }
      const tris = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
        tris.push(...(Math.random() < .5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]]));
      }
      const dt = D / PFX_N;
      tris.forEach(tri => {
        const c = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3], dx = c[0] - ip[0], dy = c[1] - ip[1], dl = Math.hypot(dx, dy) || 1;
        const sp = H * rand(.7, 2.3) * (1.15 - Math.min(1, dl / H) * .6);
        let vx = dx / dl * sp + rand(-.2, .2) * H, vy = dy / dl * sp - H * rand(.1, .9), pxx = 0, pyy = 0, spin = rand(-8, 8), rz = 0;
        const floor = cy + H * rand(.5, .85) - (cy - H / 2 + c[1]), wx = rand(2.5, 6), wy = rand(2.5, 6), ph = rand(0, 6.3), fade0 = 1.5 + rand(0, .25);
        const poly = tri.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(','), el = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;transform-origin:${c[0].toFixed(1)}px ${c[1].toFixed(1)}px`);
        const clip = document.createElement('div');
        clip.style.cssText = `position:absolute;inset:0;clip-path:polygon(${poly})`;
        const ice = document.createElement('div');
        ice.style.cssText = `position:absolute;inset:0;background:linear-gradient(${Math.round(rand(0, 360))}deg,rgba(224,242,254,.6),rgba(125,211,252,.2) 55%,rgba(255,255,255,.45))`;
        clip.append(face(), ice);
        const edge = document.createElement('div');
        edge.style.cssText = 'position:absolute;inset:0';
        edge.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><polygon points="${tri.map(p => p.join(',')).join(' ')}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="${Math.max(.8, px * .9)}" stroke-linejoin="round"/></svg>`;
        el.append(clip, edge);
        let onFloor = false;
        anim(el, fr(t => {
          if (t < ICE_BREAK) return { opacity: 0, transform: 'none' };
          if (t - dt >= ICE_BREAK - 1e-6 || t === ICE_BREAK) { vy += H * 3.4 * dt; pxx += vx * dt; pyy += vy * dt; rz += spin * dt; if (pyy > floor) { pyy = floor; vy = -Math.abs(vy) * .32; vx *= .72; spin *= .6; onFloor = true; } }
          const tau = t - ICE_BREAK, damp = onFloor ? Math.max(0, 1 - tau / .9) : 1;
          return { opacity: 1 - sm(fade0, fade0 + .4, t), transform: `translate(${pxx.toFixed(2)}px,${pyy.toFixed(2)}px) rotateZ(${(rz * 57.3).toFixed(1)}deg) rotateX(${(60 * Math.sin(wx * tau + ph) * damp).toFixed(1)}deg) rotateY(${(60 * Math.sin(wy * tau + ph) * damp).toFixed(1)}deg) scale(${(1 - .35 * sm(fade0, fade0 + .4, t)).toFixed(3)})` };
        }));
      });
      // ---- Burst flash, shock ring, glints, mist and snow dust.
      const [fx, fy] = abs(ip[0], ip[1]);
      const flash = add(`left:${fx - H * .8}px;top:${fy - H * .8}px;width:${H * 1.6}px;height:${H * 1.6}px;border-radius:50%;z-index:5;background:radial-gradient(closest-side,#fff,rgba(186,230,253,.8) 40%,transparent)`);
      anim(flash, fr(t => ({ opacity: t < ICE_BREAK ? 0 : 1 - sm(ICE_BREAK, ICE_BREAK + .28, t), transform: `scale(${(.2 + 1.5 * out(sm(ICE_BREAK, ICE_BREAK + .28, t))).toFixed(3)})` })));
      const ring = add(`left:${fx - H * .5}px;top:${fy - H * .5}px;width:${H}px;height:${H}px;border-radius:50%;z-index:5;border:${Math.max(1.5, px * 1.6)}px solid rgba(224,242,254,.9);box-sizing:border-box`);
      anim(ring, fr(t => ({ opacity: t < ICE_BREAK ? 0 : .9 * (1 - sm(ICE_BREAK, ICE_BREAK + .45, t)), transform: `scale(${(.2 + 2.4 * out(sm(ICE_BREAK, ICE_BREAK + .45, t))).toFixed(3)})` })));
      for (let i = 0; i < 16; i++) {
        const gx = cx + rand(-.7, .7) * W * 1.2, gy = cy + rand(-.6, .7) * H, s = H * rand(.1, .2), t0 = ICE_BREAK + rand(.02, .75), spin = rand(-80, 80), el = add(`left:${gx - s / 2}px;top:${gy - s / 2}px;width:${s}px;height:${s}px;z-index:6`, pfxStar(i % 3 ? '#fff' : '#bae6fd'));
        anim(el, fr(t => { const u = sm(t0, t0 + .4, t), g = Math.sin(u * Math.PI); return { opacity: g, transform: `rotate(${(spin * u).toFixed(1)}deg) scale(${(g * 1.1).toFixed(3)})` }; }));
      }
      for (let i = 0; i < 9; i++) {
        const s = H * rand(.7, 1.2), mx = cx + rand(-1, 1) * W * 1.1, t0 = ICE_BREAK + rand(0, .25), dir = i % 2 ? 1 : -1, el = add(`left:${mx - s / 2}px;top:${cy + H * .5 - s * .22}px;width:${s}px;height:${s * .45}px;z-index:2;border-radius:50%;background:radial-gradient(closest-side,rgba(224,242,254,.5),rgba(125,211,252,.18) 60%,transparent)`);
        anim(el, fr(t => { const u = sm(t0, t0 + 1, t); return { opacity: Math.sin(Math.min(1, u) * Math.PI) * (t < t0 ? 0 : 1), transform: `translate(${(dir * H * (.2 + .9 * u)).toFixed(1)}px,${(-H * .1 * u).toFixed(1)}px) scale(${(.5 + 1.2 * u).toFixed(3)})` }; }));
      }
      for (let i = 0; i < 36; i++) {
        const s = H * rand(.012, .026), dx = cx + rand(-1, 1) * W * 1.3, dy = cy + rand(-1.1, .1) * H, t0 = ICE_BREAK + rand(0, .5), fall = H * rand(.6, 1.3), sw = rand(1, 4), el = add(`left:${dx}px;top:${dy}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#e0f2fe;box-shadow:0 0 ${s * 2}px #7dd3fc`);
        anim(el, fr(t => { const u = sm(t0, 1.95, t); return { opacity: t < t0 ? 0 : (1 - u) * (.6 + .4 * Math.sin(t * 24 + i)), transform: `translate(${(Math.sin(u * sw * 3 + i) * H * .12).toFixed(1)}px,${(fall * u).toFixed(1)}px)` }; }));
      }
      end(lastAnim);
    }

    // Paint Splats: eleven buckets of paint fly at the real top card from off screen (a stretched blob on its
    // way in), land with a squash and a spring on its face, fling droplets and run in drips; the painted card
    // then slides off the table. Each splat is a lit, wet-looking SVG blob (gradient, two highlights).
    // Sound: BURN_SOUNDS['burn-paint'] on the same impact times (PAINT_HITS).
    // A wet splat outline: a smooth lumpy blob plus tapered splash arms ending in round beads (viewBox 100).
    function pntBlob(r) {
      const n = 11, P = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, rr = r * bfxRand(.82, 1.14); return [50 + Math.cos(a) * rr, 50 + Math.sin(a) * rr]; });
      let d = `M${((P[0][0] + P[n - 1][0]) / 2).toFixed(1)} ${((P[0][1] + P[n - 1][1]) / 2).toFixed(1)}`;
      for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n]; d += `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`; }
      let arms = '';
      for (let i = 0; i < 5; i++) {
        const a = bfxRand(0, 6.28), len = r * bfxRand(1.3, 1.55), w = bfxRand(2.5, 5), nx = -Math.sin(a), ny = Math.cos(a), bx = 50 + Math.cos(a) * r * .7, by = 50 + Math.sin(a) * r * .7, tx = 50 + Math.cos(a) * len, ty = 50 + Math.sin(a) * len;
        arms += `M${(bx + nx * w).toFixed(1)} ${(by + ny * w).toFixed(1)}Q${((bx + tx) / 2 + nx * 1.2).toFixed(1)} ${((by + ty) / 2 + ny * 1.2).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}Q${((bx + tx) / 2 - nx * 1.2).toFixed(1)} ${((by + ty) / 2 - ny * 1.2).toFixed(1)} ${(bx - nx * w).toFixed(1)} ${(by - ny * w).toFixed(1)}Z`;
        arms += `M${(tx + 3.2).toFixed(1)} ${ty.toFixed(1)}a3.2 3.2 0 1 0-6.4 0a3.2 3.2 0 1 0 6.4 0Z`;
      }
      return d + 'Z' + arms;
    }
    const PAINT_HITS = Array.from({ length: 11 }, (_, i) => +(.12 + i * .068).toFixed(3));
    const PAINT_COLS = [['#fca5a5', '#ef4444', '#991b1b'], ['#fde68a', '#f59e0b', '#b45309'], ['#86efac', '#22c55e', '#166534'], ['#93c5fd', '#3b82f6', '#1e3a8a'],
      ['#d8b4fe', '#a855f7', '#6b21a8'], ['#f9a8d4', '#ec4899', '#9d174d'], ['#5eead4', '#14b8a6', '#115e59']];
    function bfxPaint(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const { clamp, rand, ease, out, D, sm, fr, add } = pfxKit(st), id = ++pfxSeq, dt = D / PFX_N, ox = cx - W / 2, oy = cy - H / 2;
      const grp = add(`left:${ox}px;top:${oy}px;width:${W}px;height:${H}px;z-index:3;transform-origin:50% 0`);
      grp.appendChild(face());
      const pb = add(`inset:0;left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;border-radius:${radius}`, '', grp);
      const lastAnim = anim(grp, fr(t => { const u = sm(1.42, 1.95, t); return { opacity: 1 - sm(1.62, 1.95, t), transform: `translateY(${(H * 1.1 * u * u).toFixed(1)}px) scaleY(${(1 + .5 * u).toFixed(3)}) rotate(${(2 * u).toFixed(2)}deg)` }; }));
      const cells = [];
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) cells.push([(c + rand(.2, .8)) / 3 * W, (r + rand(.2, .8)) / 4 * H]);
      cells.sort(() => Math.random() - .5);
      const cols = PAINT_COLS.slice().sort(() => Math.random() - .5);
      PAINT_HITS.forEach((ti, i) => {
        const last = i === PAINT_HITS.length - 1, [tx, ty] = last ? [W * .5, H * .5] : cells[i], pal = cols[i % cols.length], sz = H * (last ? .95 : rand(.55, .8)), rot = rand(0, 360);
        const [lx, ly] = [ox + tx, oy + ty], ang = rand(0, Math.PI * 2), dist = H * rand(1.5, 2.2), sx0 = lx + Math.cos(ang) * dist, sy0 = ly + Math.sin(ang) * dist, fl = .11;
        // the paint on its way in
        const dir = Math.atan2(ly - sy0, lx - sx0) * 57.3, bs = H * .15;
        const fly = add(`left:${-bs / 2}px;top:${-bs / 2}px;width:${bs}px;height:${bs}px;z-index:6;border-radius:50%;background:radial-gradient(circle at 35% 30%,${pal[0]},${pal[1]} 55%,${pal[2]})`);
        anim(fly, fr(t => { const u = sm(ti - fl, ti, t), e = u * u; return { opacity: t > ti - fl && t < ti ? 1 : 0, transform: `translate(${(sx0 + (lx - sx0) * e).toFixed(1)}px,${(sy0 + (ly - sy0) * e).toFixed(1)}px) rotate(${dir.toFixed(1)}deg) scale(${(1.4 + 1.6 * u).toFixed(2)},${(1 - .35 * u).toFixed(2)})` }; }));
        // the splat on the card
        const g = `ps${id}-${i}`, drops = Array.from({ length: 7 }, () => { const a = rand(0, 6.3), d = rand(39, 48); return `<circle cx="${(50 + Math.cos(a) * d).toFixed(1)}" cy="${(50 + Math.sin(a) * d).toFixed(1)}" r="${rand(1.6, 4.4).toFixed(1)}" fill="${pal[1]}"/>`; }).join('');
        const svg = `<svg width="100%" height="100%" viewBox="0 0 100 100"><defs><radialGradient id="${g}" cx=".38" cy=".34" r=".75"><stop offset="0" stop-color="${pal[0]}"/><stop offset=".45" stop-color="${pal[1]}"/><stop offset="1" stop-color="${pal[2]}"/></radialGradient></defs><path d="${pntBlob(30)}" fill="url(#${g})"/>${drops}<ellipse cx="40" cy="37" rx="9" ry="4" fill="#fff" opacity=".5" transform="rotate(-28 40 37)"/><ellipse cx="60" cy="58" rx="3.2" ry="1.6" fill="#fff" opacity=".35"/></svg>`;
        const sp = add(`left:${tx - sz / 2}px;top:${ty - sz / 2}px;width:${sz}px;height:${sz}px`, svg, pb);
        anim(sp, fr(t => { const tau = t - ti; if (tau < 0) return { opacity: 0, transform: 'scale(0)' }; const s = Math.min(1, tau / .08) * (1 + .2 * Math.exp(-tau * 12) * Math.sin(tau * 46)), q = Math.exp(-tau * 10); return { opacity: 1, transform: `rotate(${rot.toFixed(1)}deg) scale(${(s * (1 + .18 * q)).toFixed(3)},${(s * (1 - .14 * q)).toFixed(3)})` }; }));
        // a drip, and flung droplets
        if (ty < H * .75 && !last) {
          const w = H * rand(.034, .055), dx = tx + rand(-.2, .2) * sz, dy = ty + sz * .16, L = Math.min(H - dy + w * 2, H * rand(.22, .5)), t0 = ti + .2 + rand(0, .22), dur = rand(.75, 1.05);
          const stem = add(`left:${dx - w * .35}px;top:${dy}px;width:${w * .7}px;height:${L}px;border-radius:${w}px;transform-origin:50% 0;background:linear-gradient(90deg,${pal[0]},${pal[1]} 45%,${pal[2]})`, '', pb);
          const bulb = add(`left:${dx - w * .62}px;top:${dy - w * .62}px;width:${w * 1.24}px;height:${w * 1.24}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,${pal[0]},${pal[1]} 60%,${pal[2]})`, '', pb);
          anim(stem, fr(t => { const u = ease(sm(t0, t0 + dur, t)); return { opacity: t < t0 ? 0 : 1, transform: `scaleY(${Math.max(.001, u).toFixed(3)})` }; }));
          anim(bulb, fr(t => { const u = ease(sm(t0, t0 + dur, t)); return { opacity: t < t0 ? 0 : 1, transform: `translateY(${(L * u).toFixed(1)}px)` }; }));
        }
        for (let d = 0; d < 6; d++) {
          const a = rand(0, 6.3), v = H * rand(.5, 1.7), s = H * rand(.012, .03); let qx = 0, qy = 0, vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .6;
          const dr = add(`left:${lx - s / 2}px;top:${ly - s / 2}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:${pal[1]};box-shadow:inset ${-s * .2}px ${-s * .2}px ${s * .3}px ${pal[2]}`);
          anim(dr, fr(t => { if (t < ti) return { opacity: 0, transform: 'none' }; vy += H * 3 * dt; qx += vx * dt; qy += vy * dt; return { opacity: 1 - sm(ti + .45, ti + .85, t), transform: `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px)` }; }));
        }
        if (i % 2 === 0) { // paint on the table round the card
          const fs = H * rand(.12, .22), fx = cx + (i % 4 === 0 ? -1 : 1) * W * rand(.55, .95), fy = cy + H * rand(.3, .62), fe = add(`left:${fx - fs}px;top:${fy - fs * .35}px;width:${fs * 2}px;height:${fs * .7}px;z-index:1;border-radius:50%;background:radial-gradient(closest-side,${pal[1]},${pal[2]} 80%,transparent)`);
          anim(fe, fr(t => ({ opacity: t < ti + .06 ? 0 : .85 * (1 - sm(1.5, 1.9, t)), transform: `scale(${(.3 + .7 * out(sm(ti, ti + .2, t))).toFixed(3)})` })));
        }
      });
      end(lastAnim);
    }

    // Smoke Show: embers scorch the real card and it chars from the edges; a dark underlit ground roll and
    // a column of lumpy lit billows (each puff is three overlapping lobes, light from the top left, so it
    // reads as a cloud and not a smudge) rise and spread into a cloud at the top; thin wisps curl up through
    // it, embers and soot flakes fly; the card crumples into the smoke at ~1s. Sound: BURN_SOUNDS['burn-smoke'].
    const SMOKE_TONES = {
      light: ['rgba(226,232,240,.9)', 'rgba(160,174,192,.8)', 'rgba(100,116,139,.35)'], dark: ['rgba(120,134,155,.9)', 'rgba(71,85,105,.85)', 'rgba(30,41,59,.35)'],
      warm: ['rgba(254,226,196,.9)', 'rgba(150,128,128,.85)', 'rgba(60,45,45,.35)']
    };
    function bfxSmoke(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const { clamp, rand, ease, out, D, sm, fr, add } = pfxKit(st);
      const glow = add(`left:${cx - H * 1.1}px;top:${cy - H * .9}px;width:${H * 2.2}px;height:${H * 1.8}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(251,146,60,.6),rgba(239,68,68,.22) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: .8 * sm(0, .25, t) * (1 - sm(.55, 1.2, t)) })));
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      const scorch = document.createElement('div');
      scorch.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:linear-gradient(to top,rgba(24,14,10,.85),rgba(24,14,10,.3) 55%,rgba(24,14,10,.12))`;
      box.append(face(), scorch);
      anim(box, fr(t => ({ opacity: 1 - sm(.8, 1.22, t), transform: `translate(${(Math.sin(t * 41) * H * .008 * sm(.05, .6, t)).toFixed(2)}px,${(-H * .07 * ease(sm(.1, 1, t))).toFixed(2)}px) rotate(${(Math.sin(t * 9) * 2.5 * sm(.2, 1, t)).toFixed(2)}deg) scale(${(1 - .14 * sm(.3, 1.2, t)).toFixed(3)})` })));
      anim(scorch, fr(t => { const m = sm(.04, .8, t), q = sm(.6, 1, t); return { opacity: Math.min(1, m * 1.5), boxShadow: `inset 0 0 ${(H * .2 * m).toFixed(1)}px ${(H * .06 * m).toFixed(1)}px rgba(12,8,6,.96), inset 0 0 ${(H * .06 * m).toFixed(1)}px ${(H * .012 * m).toFixed(1)}px rgba(251,146,60,${(.9 * (1 - q)).toFixed(2)})` }; }));
      const LOBES = [[.5, .5, .8], [.3, .6, .6], [.7, .58, .62], [.5, .3, .55], [.28, .4, .5]];
      const puff = (s, tone, asp) => {
        const [l, m, d] = SMOKE_TONES[tone];
        return LOBES.map(([u, v, f]) => `<div style="position:absolute;left:${(u - f / 2) * 100}%;top:${(v - f / 2) * 100}%;width:${f * 100}%;height:${f * 100}%;border-radius:50%;background:radial-gradient(circle at 36% 30%,${l} 0,${m} 45%,${d} 78%,rgba(0,0,0,0) 82%)"></div>`).join('');
      };
      const spawn = ({ x0, y0, s, t0, life, rise, drift, tone, a, asp = 1, grow = 1.4, z = 2 }) => {
        const el = add(`left:${x0 - s / 2}px;top:${y0 - s / 2}px;width:${s}px;height:${s}px;z-index:${z}`, puff(s, tone, asp)), sw = rand(-1, 1) * W * .3, ph = rand(0, 6.3);
        anim(el, fr(t => { const u = clamp((t - t0) / life); if (t < t0 || u >= 1) return { opacity: 0, transform: 'scale(.2)' };
          const sc = .35 + grow * Math.sqrt(u); return { opacity: a * sm(0, .12, u) * (1 - sm(.5, 1, u)), transform: `translate(${(sw * Math.sin(u * 3 + ph) + drift * u * u * H).toFixed(1)}px,${(-rise * (1 - Math.pow(1 - u, 1.8))).toFixed(1)}px) scale(${(sc * asp).toFixed(3)},${sc.toFixed(3)})` }; }));
      };
      for (let i = 0; i < 14; i++) spawn({ x0: cx + rand(-.5, .5) * W, y0: cy + H * .5, s: H * rand(.5, .8), t0: .1 + rand(0, .55), life: rand(.9, 1.2), rise: H * rand(.04, .2), drift: (i % 2 ? 1 : -1) * rand(.5, 1.5), tone: i % 3 ? 'dark' : 'warm', a: .85, asp: 1.9, grow: 1.5, z: 1 });
      for (let i = 0; i < 40; i++) { const t0 = .14 + rand(0, .9); spawn({ x0: cx + rand(-.45, .45) * W, y0: cy + rand(-.1, .45) * H, s: H * rand(.45, .8), t0, life: rand(.9, 1.15), rise: H * rand(1.1, 2.1), drift: rand(-.6, .6), tone: t0 < .4 && i % 3 === 0 ? 'warm' : i % 3 ? 'light' : 'dark', a: .92, z: i % 2 ? 4 : 2 }); }
      for (let i = 0; i < 7; i++) spawn({ x0: cx + rand(-.6, .6) * W, y0: cy - H * rand(.6, 1), s: H * rand(.8, 1.2), t0: .75 + rand(0, .45), life: rand(.8, 1), rise: H * rand(.2, .5), drift: rand(-1.2, 1.2), tone: 'light', a: .7, asp: 1.3, grow: .9, z: 3 });
      // thin wisps curling up through the cloud
      for (let i = 0; i < 7; i++) {
        const w = W * 1.3, h = H * 2.4, ox = cx + rand(-.45, .45) * W - w / 2, t0 = .2 + rand(0, .6), dur = rand(.9, 1.2), c1 = rand(.1, .9) * w, c2 = rand(.1, .9) * w, c3 = rand(.2, .8) * w;
        const el = add(`left:${ox}px;top:${cy - h + H * .3}px;width:${w}px;height:${h}px;z-index:5`, `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="overflow:visible"><path d="M${w / 2} ${h}C${c1} ${h * .75} ${c2} ${h * .55} ${c3} ${h * .3}S${w / 2} ${h * .05} ${rand(.2, .8) * w} 0" pathLength="1" stroke-dasharray=".4 1" stroke="rgba(226,232,240,.65)" stroke-width="${Math.max(1.5, H * .028)}" stroke-linecap="round" fill="none"/></svg>`);
        anim(el.querySelector('path'), fr(t => { const u = clamp((t - t0) / dur); return { strokeDashoffset: .4 - u * 1.4, opacity: t < t0 ? 0 : Math.sin(Math.min(1, u) * Math.PI) }; }));
      }
      // embers and soot flakes
      for (let i = 0; i < 26; i++) {
        const t0 = rand(.04, .85), life = rand(.5, 1.0), s = H * rand(.014, .03), sx = cx + rand(-.5, .5) * W, sy = cy + rand(-.5, .5) * H, up = H * rand(.5, 1.6), sw = rand(-.4, .4) * H, col = ['#fdba74', '#fb923c', '#ef4444'][i % 3];
        const el = add(`left:${sx}px;top:${sy}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fff3d6;box-shadow:0 0 ${s * 2.5}px ${s * .8}px ${col}`);
        anim(el, fr(t => { const u = clamp((t - t0) / life); return { opacity: t < t0 || u >= 1 ? 0 : 1 - u * u, transform: `translate(${(sw * u + Math.sin(u * 9 + i) * H * .04).toFixed(1)}px,${(-up * u).toFixed(1)}px) scale(${(1 - .6 * u).toFixed(3)})` }; }));
      }
      for (let i = 0; i < 30; i++) {
        const t0 = .5 + rand(0, .6), s = H * rand(.018, .045), sx = cx + rand(-.5, .5) * W, sy = cy + rand(-.4, .4) * H, up = H * rand(.6, 1.6), sw = rand(-.7, .7) * H, spin = rand(-300, 300);
        const el = add(`left:${sx}px;top:${sy}px;width:${s}px;height:${s * .55}px;z-index:5;background:#1c1917;clip-path:polygon(0 30%,60% 0,100% 55%,40% 100%)`);
        anim(el, fr(t => { const u = clamp((t - t0) / 1.2); return { opacity: t < t0 ? 0 : (1 - sm(.55, 1, u)) * .9, transform: `translate(${(sw * u).toFixed(1)}px,${(-up * u + H * .15 * u * u).toFixed(1)}px) rotate(${(spin * u).toFixed(0)}deg)` }; }));
      }
      end(lastAnim);
    }
    // ---- v406 procedural burns, batch 2: Electric Blast, Inferno Sweep, Default Burn, Smoke Burst ----
    // Same kit as v404 (`pfxKit`, one 2s clock, sampled keyframes) on the real top card; the painted-layer
    // versions are retired (their ids are `iconOnly` in ShLevel3D: tile + nothing else). Sounds: BURN_SOUNDS.
    const FIRE_PAL = ['#7f1d1d', '#f97316', '#fde68a'];
    const pfxFlame = (pal, uid) => `<svg viewBox="0 0 40 100" width="100%" height="100%" style="overflow:visible"><defs><linearGradient id="pf${uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${pal[0]}" stop-opacity=".25"/><stop offset=".25" stop-color="${pal[1]}" stop-opacity=".95"/><stop offset=".7" stop-color="${pal[2]}" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="M20 100C6 96 2 78 8 62C12 50 10 38 16 22C18 30 20 34 22 30C26 20 24 10 20 0C32 14 38 34 36 52C35 64 38 74 34 86C31 96 26 100 20 100Z" fill="url(#pf${uid})"/><path d="M20 98C13 95 12 84 15 75C17 69 17 62 20 54C22 62 25 66 25 74C27 82 27 94 20 98Z" fill="#fffbeb" opacity=".85"/></svg>`;
    // One flame tongue: o = {x, y (number or t => number), w, h, t0, t1, z, pal}; sways, flickers, lives t0..t1.
    function pfxFlameEl(st, kit, o) {
      const { add, fr, clamp, rand } = kit, el = add(`left:${o.x - o.w / 2}px;top:${-o.h}px;width:${o.w}px;height:${o.h}px;z-index:${o.z || 4};mix-blend-mode:screen;transform-origin:50% 100%`, pfxFlame(o.pal || FIRE_PAL, ++pfxSeq));
      const f1 = rand(9, 15), f2 = rand(5, 8), ph = rand(0, 6.3), sw = rand(6, 14);
      return st.anim(el, fr(t => {
        const life = clamp((t - o.t0) / .15) * (1 - clamp((t - o.t1) / .3)), by = typeof o.y === 'function' ? o.y(t) : o.y;
        return { opacity: life > 0 ? Math.min(1, life * 1.3) : 0, transform: `translateY(${by.toFixed(1)}px) skewX(${(Math.sin(t * f2 + ph) * sw).toFixed(2)}deg) scale(${(life * (1 + .12 * Math.sin(t * f1 + ph))).toFixed(3)},${(life * (1 + .3 * Math.sin(t * f1 * 1.3 + ph * 2))).toFixed(3)})` };
      }));
    }
    // The card breaking into jittered-grid shards at t0 (no 3D turn: the back never shows). o: {t0, ip, cols, rows, speed, edge, tint(i)}.
    function pfxShatter(st, kit, o) {
      const { W, H, cx, cy, face } = st, { rand, sm, fr, add, D } = kit, dt = D / PFX_N, cols = o.cols || 5, rows = o.rows || 7, ip = o.ip, pts = [];
      for (let r = 0; r <= rows; r++) { pts.push([]); for (let c = 0; c <= cols; c++) pts[r].push([c / cols * W + (c && c < cols ? rand(-.32, .32) * W / cols : 0), r / rows * H + (r && r < rows ? rand(-.32, .32) * H / rows : 0)]); }
      const tris = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const a = pts[r][c], b = pts[r][c + 1], d = pts[r + 1][c], e = pts[r + 1][c + 1];
        tris.push(...(Math.random() < .5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]]));
      }
      tris.forEach((tri, i) => {
        const c = [(tri[0][0] + tri[1][0] + tri[2][0]) / 3, (tri[0][1] + tri[1][1] + tri[2][1]) / 3], dx = c[0] - ip[0], dy = c[1] - ip[1], dl = Math.hypot(dx, dy) || 1;
        const sp = H * rand(.7, 2.3) * (o.speed || 1) * (1.15 - Math.min(1, dl / H) * .6);
        let vx = dx / dl * sp + rand(-.2, .2) * H, vy = dy / dl * sp - H * rand(.1, .9), px = 0, py = 0, spin = rand(-8, 8), rz = 0, onFloor = false;
        const floor = cy + H * rand(.5, .85) - (cy - H / 2 + c[1]), wx = rand(2.5, 6), wy = rand(2.5, 6), ph = rand(0, 6.3), fade0 = 1.5 + rand(0, .25);
        const el = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;transform-origin:${c[0].toFixed(1)}px ${c[1].toFixed(1)}px`);
        const clip = document.createElement('div');
        clip.style.cssText = `position:absolute;inset:0;clip-path:polygon(${tri.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')})`;
        const tint = document.createElement('div');
        tint.style.cssText = `position:absolute;inset:0;background:${o.tint(i)}`;
        clip.append(face(), tint);
        el.appendChild(clip);
        if (o.edge) { const e = document.createElement('div'); e.style.cssText = 'position:absolute;inset:0'; e.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0"><polygon points="${tri.map(p => p.join(',')).join(' ')}" fill="none" stroke="${o.edge}" stroke-opacity=".9" stroke-width="${Math.max(.8, H * .009)}" stroke-linejoin="round"/></svg>`; el.appendChild(e); }
        st.anim(el, fr(t => {
          if (t < o.t0) return { opacity: 0, transform: 'none' };
          if (t - dt >= o.t0 - 1e-6) { vy += H * 3.4 * dt; px += vx * dt; py += vy * dt; rz += spin * dt; if (py > floor) { py = floor; vy = -Math.abs(vy) * .32; vx *= .72; spin *= .6; onFloor = true; } }
          const tau = t - o.t0, damp = onFloor ? Math.max(0, 1 - tau / .9) : 1, f = sm(fade0, fade0 + .4, t);
          return { opacity: 1 - f, transform: `translate(${px.toFixed(2)}px,${py.toFixed(2)}px) rotateZ(${(rz * 57.3).toFixed(1)}deg) rotateX(${(60 * Math.sin(wx * tau + ph) * damp).toFixed(1)}deg) rotateY(${(60 * Math.sin(wy * tau + ph) * damp).toFixed(1)}deg) scale(${(1 - .35 * f).toFixed(3)})` };
        }));
      });
    }
    const PFX_LOBES = [[.5, .5, .8], [.3, .6, .6], [.7, .58, .62], [.5, .3, .55], [.28, .4, .5]];
    const pfxPuff = (tone) => { const [l, m, d] = SMOKE_TONES[tone]; return PFX_LOBES.map(([u, v, f]) => `<div style="position:absolute;left:${(u - f / 2) * 100}%;top:${(v - f / 2) * 100}%;width:${f * 100}%;height:${f * 100}%;border-radius:50%;background:radial-gradient(circle at 36% 30%,${l} 0,${m} 45%,${d} 78%,rgba(0,0,0,0) 82%)"></div>`).join(''); };

    // Electric Blast: three forked bolts strike the real card from above (.12, .30, .50s; each bolt re-jags every
    // 32ms through five drawn variants), the sky flashes, the card shows as an x-ray negative and shakes; the third
    // strike overloads it into charred, blue-edged shards; arcs lash along the floor, sparks fly, scorch and smoke.
    const EL_HITS = [.12, .3, .5], EL_BREAK = .52;
    const boltPts = (x0, y0, x1, y1, seg, jit) => { const p = [[x0, y0]]; for (let i = 1; i < seg; i++) { const u = i / seg; p.push([x0 + (x1 - x0) * u + bfxRand(-jit, jit) * (1 - u * .5), y0 + (y1 - y0) * u + bfxRand(-jit, jit) * .25]); } p.push([x1, y1]); return p; };
    const ptsStr = (p) => p.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ');
    function bfxElectric(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face, vw } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out } = kit, vh = host.clientHeight || innerHeight, px = H / 100;
      const flash = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:7;mix-blend-mode:screen;background:radial-gradient(circle at ${cx}px ${cy}px,rgba(224,242,254,.9),rgba(56,189,248,.35) 40%,rgba(0,0,0,0) 85%)`);
      const lastAnim = anim(flash, fr(t => { let o = 0; EL_HITS.forEach((h, i) => { const u = t - h; if (u >= 0 && u < .2) o = Math.max(o, (1 - u / .2) * (i === 2 ? .95 : .55)); }); return { opacity: o }; }));
      const strokes = (pts, w, col, op) => `<polyline points="${ptsStr(pts)}" fill="none" stroke="${col}" stroke-opacity="${op}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`;
      const bolt = (pts, fork) => strokes(pts, 10 * px, '#38bdf8', .35) + strokes(pts, 4 * px, '#bae6fd', .8) + strokes(pts, 1.8 * px, '#fff', 1) + fork.map(f => strokes(f, 4 * px, '#38bdf8', .35) + strokes(f, 1.4 * px, '#e0f2fe', .95)).join('');
      const svgBox = (inner) => `<svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" style="position:absolute;left:0;top:0;overflow:visible">${inner}</svg>`;
      EL_HITS.forEach((h) => {
        const x0 = cx + rand(-1, 1) * W * 1.6, y0 = Math.min(cy - H * 3, -20);
        for (let v = 0; v < 5; v++) {
          const pts = boltPts(x0, y0, cx + rand(-.2, .2) * W, cy - H * .1, 11, H * .45), fk = [4, 7].map(i => [pts[i], [pts[i][0] + rand(-1, 1) * H * .6, pts[i][1] + H * rand(.3, .6)]]);
          const el = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:6`, svgBox(bolt(pts, fk)));
          anim(el, fr(t => { const u = t - h; return { opacity: u >= 0 && u < .16 && Math.floor(u / .032) % 5 === v ? 1 : 0 }; }));
        }
      });
      // the card: a negative (x-ray) while struck, shaking, then gone at EL_BREAK
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      const ov = document.createElement('div');
      ov.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:rgba(125,211,252,.35)`;
      box.append(face(), ov);
      const struck = t => EL_HITS.some(h => t >= h && t < h + .14 && Math.floor((t - h) / .03) % 2 === 0);
      anim(box, fr(t => { const on = struck(t), j = sm(.1, EL_BREAK, t); return { opacity: t < EL_BREAK ? 1 : 0, filter: on ? 'invert(.92) hue-rotate(180deg) brightness(1.5)' : `brightness(${(1 + .2 * j).toFixed(2)})`,
        transform: `translate(${(Math.sin(t * 130) * H * .018 * j).toFixed(2)}px,${(Math.cos(t * 97) * H * .012 * j).toFixed(2)}px)`, boxShadow: `0 0 ${(H * .25 * j).toFixed(1)}px ${(H * .06 * j).toFixed(1)}px rgba(56,189,248,${(.8 * j).toFixed(2)})` }; }));
      anim(ov, fr(t => ({ opacity: struck(t) ? 0 : .6 * sm(.1, EL_BREAK, t) * (.6 + .4 * Math.sin(t * 160)) })));
      pfxShatter(st, kit, { t0: EL_BREAK, ip: [W / 2, H * .4], cols: 5, rows: 7, speed: 1.25, edge: '#7dd3fc', tint: () => `linear-gradient(${Math.round(rand(0, 360))}deg,rgba(15,23,42,.65),rgba(56,189,248,.3))` });
      // ground arcs lashing out from the burst
      for (let i = 0; i < 7; i++) {
        const dir = i % 2 ? 1 : -1, len = H * rand(.9, 2.1), a = rand(-.35, .5), ex = cx + dir * Math.cos(a) * len, ey = cy + H * .35 + Math.sin(a) * len * .5;
        const vars = [0, 1, 2].map(() => { const pts = boltPts(cx, cy + H * .3, ex, ey, 9, H * .16); return add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:5`, svgBox(strokes(pts, 6 * px, '#38bdf8', .35) + strokes(pts, 2.2 * px, '#e0f2fe', 1))); });
        const s0 = EL_BREAK - .02 + i * .02;
        vars.forEach((el, v) => anim(el, fr(t => ({ opacity: t > s0 && t < s0 + .55 && Math.floor((t - s0) / .04) % 3 === v && Math.sin(t * 90 + i * 7) > -.4 ? 1 : 0 }))));
      }
      // sparks, floor ring, scorch and smoke
      for (let i = 0; i < 46; i++) {
        const a = rand(0, 6.3), v = H * rand(.8, 3), s = H * rand(.012, .03); let qx = 0, qy = 0, vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .5;
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:6;border-radius:50%;background:#fefce8;box-shadow:0 0 ${s * 2.5}px ${s}px #38bdf8`);
        anim(el, fr(t => { if (t < EL_BREAK) return { opacity: 0, transform: 'none' }; vy += H * 3.2 * kit.D / PFX_N; qx += vx * kit.D / PFX_N; qy += vy * kit.D / PFX_N; return { opacity: 1 - sm(EL_BREAK + .3, EL_BREAK + .9, t), transform: `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px)` }; }));
      }
      const ring = add(`left:${cx - H * .8}px;top:${cy + H * .5 - H * .2}px;width:${H * 1.6}px;height:${H * .4}px;z-index:2;border-radius:50%;border:${Math.max(1.5, px * 1.5)}px solid rgba(186,230,253,.9);box-sizing:border-box`);
      anim(ring, fr(t => ({ opacity: t < EL_BREAK ? 0 : .9 * (1 - sm(EL_BREAK, EL_BREAK + .5, t)), transform: `scale(${(.2 + 2.2 * out(sm(EL_BREAK, EL_BREAK + .5, t))).toFixed(3)})` })));
      const scorch = add(`left:${cx - W * .8}px;top:${cy + H * .35}px;width:${W * 1.6}px;height:${H * .32}px;z-index:1;border-radius:50%;background:radial-gradient(closest-side,rgba(10,10,20,.8),transparent)`);
      anim(scorch, fr(t => ({ opacity: t < EL_BREAK ? 0 : .9 * sm(EL_BREAK, EL_BREAK + .15, t) * (1 - sm(1.5, 1.95, t)) })));
      for (let i = 0; i < 6; i++) {
        const s = H * rand(.4, .7), sx = cx + rand(-.5, .5) * W, t0 = EL_BREAK + rand(0, .3), el = add(`left:${sx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:4`, pfxPuff('dark'));
        anim(el, fr(t => { const u = clamp((t - t0) / 1.2); return { opacity: t < t0 ? 0 : .5 * sm(0, .15, u) * (1 - sm(.5, 1, u)), transform: `translate(${(rand(-1, 1) * 0 + (i % 2 ? 1 : -1) * H * .25 * u).toFixed(1)}px,${(-H * 1.1 * u).toFixed(1)}px) scale(${(.3 + 1.1 * Math.sqrt(u)).toFixed(3)})` }; }));
      }
      end(lastAnim);
    }

    // Inferno Sweep: a thick whip of fire cracks in from off screen on a curve (its head runs 0.06-0.46s, the tail
    // eats up behind it, flames and embers left along it), lands on the real card at 0.46 with a flash and shock
    // ring; the card then burns away round a glowing, ragged rim under tall flames, embers and dark smoke.
    // Sound: BURN_SOUNDS['burn-lvl-inferno-sweep'] (whip crack at .46).
    const INF_HIT = .46;
    function bfxInferno(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face, vw } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out } = kit, vh = host.clientHeight || innerHeight, px = H / 100;
      const sx = Math.min(cx - W * 2.4, -30), sy = cy - H * 1.1, qx = cx - W * .5, qy = cy - H * 1.6, bz = u => [(1 - u) * (1 - u) * sx + 2 * u * (1 - u) * qx + u * u * cx, (1 - u) * (1 - u) * sy + 2 * u * (1 - u) * qy + u * u * cy];
      const lash = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:6`,
        `<svg width="${vw}" height="${vh}" viewBox="0 0 ${vw} ${vh}" style="position:absolute;left:0;top:0;overflow:visible">${[[22, '#ea580c', .5], [12, '#fb923c', .95], [5, '#fff7ed', 1]].map(([w, c, o]) => `<path d="M${sx} ${sy}Q${qx} ${qy} ${cx} ${cy}" pathLength="1" stroke-dasharray=".38 1.4" stroke="${c}" stroke-opacity="${o}" stroke-width="${w * px * .8}" stroke-linecap="round" fill="none"/>`).join('')}</svg>`);
      anim(lash, fr(() => ({ opacity: 1 })));
      const lastAnim = anim(lash.querySelector('path:nth-child(1)'), fr(t => ({ strokeDashoffset: .38 - sm(.06, INF_HIT, t) * 1.38, opacity: 1 - sm(INF_HIT + .15, INF_HIT + .3, t) })));
      [2, 3].forEach(n => anim(lash.querySelector(`path:nth-child(${n})`), fr(t => ({ strokeDashoffset: .38 - sm(.06, INF_HIT, t) * 1.38, opacity: 1 - sm(INF_HIT + .15, INF_HIT + .3, t) }))));
      for (let i = 0; i < 16; i++) { const u = .12 + i * .055, [fx, fy] = bz(u); pfxFlameEl(st, kit, { x: fx, y: fy, w: H * rand(.18, .3), h: H * rand(.35, .6), t0: .06 + u * .4, t1: .06 + u * .4 + .25, z: 5 }); }
      for (let i = 0; i < 34; i++) {
        const u = rand(.1, 1), [ex, ey] = bz(u), t0 = .06 + u * .4, life = rand(.4, .8), s = H * rand(.014, .032), vx = rand(-.5, .5) * H, up = H * rand(.3, 1.2);
        const el = add(`left:${ex}px;top:${ey}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fff3d6;box-shadow:0 0 ${s * 2.5}px ${s * .8}px #fb923c`);
        anim(el, fr(t => { const w = clamp((t - t0) / life); return { opacity: t < t0 || w >= 1 ? 0 : 1 - w * w, transform: `translate(${(vx * w).toFixed(1)}px,${(-up * w + H * .4 * w * w).toFixed(1)}px)` }; }));
      }
      const flash = add(`left:${cx - H * 1.1}px;top:${cy - H * 1.1}px;width:${H * 2.2}px;height:${H * 2.2}px;border-radius:50%;z-index:7;mix-blend-mode:screen;background:radial-gradient(closest-side,#fff,rgba(251,146,60,.8) 40%,transparent)`);
      anim(flash, fr(t => ({ opacity: t < INF_HIT ? 0 : 1 - sm(INF_HIT, INF_HIT + .3, t), transform: `scale(${(.3 + 1.2 * out(sm(INF_HIT, INF_HIT + .3, t))).toFixed(3)})` })));
      const ring = add(`left:${cx - H * .6}px;top:${cy - H * .6}px;width:${H * 1.2}px;height:${H * 1.2}px;border-radius:50%;z-index:6;border:${Math.max(2, px * 2)}px solid rgba(253,186,116,.95);box-sizing:border-box`);
      anim(ring, fr(t => ({ opacity: t < INF_HIT ? 0 : .95 * (1 - sm(INF_HIT, INF_HIT + .5, t)), transform: `scale(${(.2 + 2.4 * out(sm(INF_HIT, INF_HIT + .5, t))).toFixed(3)})` })));
      // the card: warm, then burning away round a ragged glowing rim
      const jag = Array.from({ length: 16 }, () => rand(.75, 1.2)), m = t => sm(INF_HIT + .1, 1.55, t);
      const poly = (t, grow) => `polygon(${jag.map((j, i) => { const a = i / jag.length * Math.PI * 2, r = Math.max(0, (1 - m(t)) * 75 * j * (1 + grow) + (m(t) > 0 ? 0 : 100)); return `${(50 + Math.cos(a) * r * (W > H ? 1 : .72)).toFixed(1)}% ${(50 + Math.sin(a) * r).toFixed(1)}%`; }).join(',')})`;
      const rim = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:2;background:radial-gradient(circle,#fff7ed,#fb923c 55%,#7c2d12)`);
      anim(rim, fr(t => ({ opacity: t < INF_HIT ? 0 : Math.min(1, m(t) * 5) * (1 - sm(1.5, 1.7, t)), clipPath: poly(t, .1) })));
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3`);
      const char = document.createElement('div');
      char.style.cssText = `position:absolute;inset:0;background:radial-gradient(circle,rgba(20,10,6,.2),rgba(20,10,6,.9))`;
      box.append(face(), char);
      anim(box, fr(t => ({ clipPath: poly(t, 0), transform: `translate(${(Math.sin(t * 60) * H * .012 * sm(INF_HIT, INF_HIT + .2, t) * (1 - m(t))).toFixed(2)}px,${(-H * .06 * m(t)).toFixed(2)}px) scale(${(1 - .08 * m(t)).toFixed(3)})`, filter: `brightness(${(1 + .6 * Math.exp(-(t - INF_HIT) * 9) * (t > INF_HIT ? 1 : 0)).toFixed(2)})` })));
      anim(char, fr(t => ({ opacity: sm(INF_HIT, 1.2, t) })));
      for (let i = 0; i < 20; i++) { const a = rand(0, 6.3), rr = rand(.2, .6), t0 = INF_HIT + rand(0, .45); pfxFlameEl(st, kit, { x: cx + Math.cos(a) * W * rr, y: cy + Math.sin(a) * H * rr * .6 + H * .25, w: H * rand(.24, .42), h: H * rand(.55, 1.1), t0, t1: rand(1.35, 1.75), z: i % 2 ? 4 : 2 }); }
      for (let i = 0; i < 40; i++) {
        const t0 = INF_HIT + rand(0, .9), life = rand(.5, 1), s = H * rand(.014, .03), ex = cx + rand(-.5, .5) * W, ey = cy + rand(-.4, .4) * H, up = H * rand(.6, 1.8), sw = rand(-.5, .5) * H;
        const el = add(`left:${ex}px;top:${ey}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fff3d6;box-shadow:0 0 ${s * 2.5}px ${s * .8}px #f97316`);
        anim(el, fr(t => { const w = clamp((t - t0) / life); return { opacity: t < t0 || w >= 1 ? 0 : 1 - w * w, transform: `translate(${(sw * w).toFixed(1)}px,${(-up * w).toFixed(1)}px)` }; }));
      }
      for (let i = 0; i < 7; i++) {
        const s = H * rand(.5, .9), t0 = INF_HIT + .3 + rand(0, .5), ex = cx + rand(-.4, .4) * W, el = add(`left:${ex - s / 2}px;top:${cy - H * .3 - s / 2}px;width:${s}px;height:${s}px;z-index:3`, pfxPuff('dark'));
        anim(el, fr(t => { const u = clamp((t - t0) / 1.1); return { opacity: t < t0 ? 0 : .55 * sm(0, .15, u) * (1 - sm(.5, 1, u)), transform: `translate(${((i % 2 ? 1 : -1) * H * .2 * u).toFixed(1)}px,${(-H * 1.3 * u).toFixed(1)}px) scale(${(.3 + 1.2 * Math.sqrt(u)).toFixed(3)})` }; }));
      }
      end(lastAnim);
    }

    // Default Burn: the everyday burn. Coals glow and the real card catches at the bottom (0.15s); a ragged glowing
    // edge climbs to the top by 1.45s with flames riding it and a bed of flames below, embers, soot and a little
    // smoke. Sound: BURN_SOUNDS.default.
    const DEF_START = .15, DEF_END = 1.45;
    function bfxDefault(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, ease } = kit;
      const glow = add(`left:${cx - H * 1.2}px;top:${cy - H * 1.1}px;width:${H * 2.4}px;height:${H * 2.2}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(251,146,60,.55),rgba(239,68,68,.2) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: sm(0, .3, t) * (1 - sm(1.4, 1.9, t)) * (.8 + .2 * Math.sin(t * 19)) })));
      const cut = t => H * (1 - Math.pow(sm(DEF_START, DEF_END, t), 1.3) * 1.04), edgeY = t => cy - H / 2 + cut(t);
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius};overflow:hidden`);
      const main = document.createElement('div'), band = document.createElement('div');
      main.style.cssText = 'position:absolute;inset:0';
      main.appendChild(face());
      band.style.cssText = `position:absolute;left:-5%;width:110%;height:${H * .2}px;top:0;background:linear-gradient(to bottom,rgba(20,8,4,0),rgba(20,8,4,.7) 35%,#7c2d12 52%,#fb923c 66%,#fff7ed 78%,rgba(251,146,60,.4) 90%,transparent)`;
      box.append(main, band);
      const jag = Array.from({ length: 9 }, () => rand(0, 6.3)), wob = (j, t) => H * (.03 * Math.sin(j * 2.3 + t * 16 + jag[j]) + .018 * Math.sin(j * 4.9 - t * 11));
      anim(main, fr(t => { const c = cut(t) - H * .06; return { clipPath: `polygon(-10% -10%,110% -10%,${jag.map((_, j) => `${(110 - j * 15).toFixed(1)}% ${(Math.max(c, -H * .2) + wob(j, t)).toFixed(1)}px`).join(',')})`, filter: `drop-shadow(0 0 ${(3 + 8 * sm(0, .3, t)).toFixed(1)}px rgba(251,146,60,.5))` }; }));
      anim(band, fr(t => ({ opacity: t < DEF_START - .05 ? 0 : 1 - sm(DEF_END - .05, DEF_END + .1, t), transform: `translateY(${(cut(t) - H * .17).toFixed(1)}px)` })));
      anim(box, fr(t => { const m = sm(DEF_START, DEF_END, t); return { transform: `translateY(${(-H * .05 * ease(sm(0, .4, t)) - H * .04 * m).toFixed(1)}px) rotate(${(Math.sin(t * 8) * 1.5 * m).toFixed(2)}deg) scale(${(1 - .06 * m).toFixed(3)})`, opacity: 1 - sm(DEF_END, DEF_END + .1, t) }; }));
      for (let i = 0; i < 12; i++) pfxFlameEl(st, kit, { x: cx + (i / 11 - .5) * W * .95 + rand(-4, 4), y: t => edgeY(t) + H * .03, w: H * rand(.14, .22), h: H * rand(.3, .5), t0: DEF_START - .05 + rand(0, .15), t1: DEF_END - .25 + rand(0, .1), z: i % 2 ? 4 : 2 });
      for (let i = 0; i < 16; i++) { const d = rand(-1, 1); pfxFlameEl(st, kit, { x: cx + rand(-1, 1) * W * .7, y: cy + H * (.5 + .1 * d), w: H * rand(.2, .32) * (1 + .2 * d), h: H * rand(.45, .85) * (1 + .2 * d), t0: rand(0, .25), t1: rand(1.35, 1.7), z: d > .3 ? 4 : 1 }); }
      for (let i = 0; i < 46; i++) {
        const t0 = rand(.1, 1.4), life = rand(.4, .9), s = H * rand(.014, .032), ex = cx + rand(-.5, .5) * W, ey = cy + rand(-.2, .5) * H, up = H * rand(.8, 2), sw = rand(-.5, .5) * H;
        const el = add(`left:${ex}px;top:${ey}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fff3d6;box-shadow:0 0 ${s * 2.5}px ${s * .8}px #f97316`);
        anim(el, fr(t => { const w = clamp((t - t0) / life); return { opacity: t < t0 || w >= 1 ? 0 : 1 - w * w, transform: `translate(${(sw * w).toFixed(1)}px,${(-up * w).toFixed(1)}px)` }; }));
      }
      for (let i = 0; i < 20; i++) {
        const t0 = .5 + rand(0, .9), s = H * rand(.016, .04), ex = cx + rand(-.5, .5) * W, ey = cy + rand(-.3, .3) * H, up = H * rand(.5, 1.4), sw = rand(-.7, .7) * H, spin = rand(-300, 300);
        const el = add(`left:${ex}px;top:${ey}px;width:${s}px;height:${s * .55}px;z-index:5;background:#1c1917;clip-path:polygon(0 30%,60% 0,100% 55%,40% 100%)`);
        anim(el, fr(t => { const w = clamp((t - t0) / 1.1); return { opacity: t < t0 ? 0 : (1 - sm(.5, 1, w)) * .9, transform: `translate(${(sw * w).toFixed(1)}px,${(-up * w + H * .15 * w * w).toFixed(1)}px) rotate(${(spin * w).toFixed(0)}deg)` }; }));
      }
      for (let i = 0; i < 5; i++) {
        const s = H * rand(.5, .8), t0 = .6 + rand(0, .5), ex = cx + rand(-.4, .4) * W, el = add(`left:${ex - s / 2}px;top:${cy - H * .5 - s / 2}px;width:${s}px;height:${s}px;z-index:3`, pfxPuff('dark'));
        anim(el, fr(t => { const u = clamp((t - t0) / 1.1); return { opacity: t < t0 ? 0 : .45 * sm(0, .15, u) * (1 - sm(.5, 1, u)), transform: `translate(${((i % 2 ? 1 : -1) * H * .15 * u).toFixed(1)}px,${(-H * 1.1 * u).toFixed(1)}px) scale(${(.3 + 1.1 * Math.sqrt(u)).toFixed(3)})` }; }));
      }
      end(lastAnim);
    }

    // Smoke Burst: the card swells and shakes (0-.36s), pops in a white flash and a shock ring, and a ball of
    // lit, lumpy smoke bursts outward from it in every direction (drag slows it, buoyancy lifts it) while a few
    // charred shards tumble out; it thins and clears by 2s. Sound: BURN_SOUNDS['burn-lvl-smoke-burst'] (pop at .36).
    const SB_POP = .36;
    function bfxSmokeBurst(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out, D } = kit, dt = D / PFX_N, px = H / 100;
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      box.appendChild(face());
      const lastAnim = anim(box, fr(t => { const j = sm(0, SB_POP, t); return { opacity: t < SB_POP ? 1 : 0, filter: `brightness(${(1 + .8 * j * j).toFixed(2)})`, transform: `translate(${(Math.sin(t * 120) * H * .02 * j).toFixed(2)}px,${(Math.cos(t * 83) * H * .015 * j).toFixed(2)}px) scale(${(1 + .3 * j * j).toFixed(3)})` }; }));
      pfxShatter(st, kit, { t0: SB_POP, ip: [W / 2, H / 2], cols: 4, rows: 5, speed: 1.1, tint: () => 'linear-gradient(160deg,rgba(28,25,23,.7),rgba(63,63,70,.45))' });
      const flash = add(`left:${cx - H}px;top:${cy - H}px;width:${H * 2}px;height:${H * 2}px;border-radius:50%;z-index:7;mix-blend-mode:screen;background:radial-gradient(closest-side,#fff,rgba(226,232,240,.7) 45%,transparent)`);
      anim(flash, fr(t => ({ opacity: t < SB_POP ? 0 : 1 - sm(SB_POP, SB_POP + .25, t), transform: `scale(${(.3 + 1.3 * out(sm(SB_POP, SB_POP + .25, t))).toFixed(3)})` })));
      const ring = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;border-radius:50%;z-index:6;border:${Math.max(2, px * 2)}px solid rgba(226,232,240,.9);box-sizing:border-box`);
      anim(ring, fr(t => ({ opacity: t < SB_POP ? 0 : .9 * (1 - sm(SB_POP, SB_POP + .5, t)), transform: `scale(${(.2 + 3 * out(sm(SB_POP, SB_POP + .5, t))).toFixed(3)})` })));
      const core = add(`left:${cx - H * .6}px;top:${cy - H * .6}px;width:${H * 1.2}px;height:${H * 1.2}px;z-index:2`, pfxPuff('dark'));
      anim(core, fr(t => { const u = clamp((t - SB_POP) / 1.2); return { opacity: t < SB_POP ? 0 : .8 * (1 - sm(.4, 1, u)), transform: `translateY(${(-H * .3 * u).toFixed(1)}px) scale(${(.3 + 1.7 * Math.sqrt(u)).toFixed(3)})` }; }));
      for (let i = 0; i < 38; i++) {
        const a = (i / 38) * Math.PI * 2 + rand(-.2, .2), v = H * rand(1, 2.4), kd = rand(2.2, 3.6), s = H * rand(.4, .75), tone = i % 3 === 0 ? 'dark' : 'light', t0 = SB_POP + rand(0, .1), life = rand(1.2, 1.5), zi = i % 2 ? 4 : 2;
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:${zi}`, pfxPuff(tone));
        anim(el, fr(t => { const tau = t - t0, u = clamp(tau / life); if (tau < 0 || u >= 1) return { opacity: 0, transform: 'scale(.2)' };
          const d = (1 - Math.exp(-kd * tau)) / kd; return { opacity: .92 * sm(0, .08, u) * (1 - sm(.5, 1, u)), transform: `translate(${(Math.cos(a) * v * d).toFixed(1)}px,${(Math.sin(a) * v * d * .8 - H * .55 * tau * tau).toFixed(1)}px) scale(${(.3 + 1.3 * Math.sqrt(u)).toFixed(3)})` }; }));
      }
      for (let i = 0; i < 24; i++) {
        const a = rand(0, 6.3), v = H * rand(1, 2.8), s = H * rand(.012, .03); let qx = 0, qy = 0, vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .4;
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fff;box-shadow:0 0 ${s * 2}px #cbd5e1`);
        anim(el, fr(t => { if (t < SB_POP) return { opacity: 0, transform: 'none' }; vy += H * 3 * dt; qx += vx * dt; qy += vy * dt; return { opacity: 1 - sm(SB_POP + .3, SB_POP + .8, t), transform: `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px)` }; }));
      }
      end(lastAnim);
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

    // Black Hole (v407, procedural on the real card): a dark core opens on the Pile (0.12s) with a tilted, spinning
    // accretion disk, a photon ring and a violet lens glow; the real card is cut into 12 strips that are
    // spaghettified - each spirals in, stretching along its path, and is swallowed - while 10 little cards and star
    // dust orbit in. At 1.2s it collapses to a point in a white-violet flash, a shock ring and a burst of starlight.
    // Sound: BURN_SOUNDS['burn-blackhole'] (collapse at 1.2s).
    const BH_OPEN = .12, BH_END = 1.2;
    function bfxBlackHole(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, anim, end, face, vw } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out } = kit, vh = host.clientHeight || innerHeight, px = H / 100, R = H * .85;
      const grow = t => out(sm(BH_OPEN, .55, t)) * (1 - sm(BH_END, BH_END + .12, t));
      const dim = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:1;background:radial-gradient(circle at ${cx}px ${cy}px,rgba(10,6,30,0) 20%,rgba(10,6,30,.65) 90%)`);
      const lastAnim = anim(dim, fr(t => ({ opacity: sm(0, .4, t) * (1 - sm(1.35, 1.8, t)) })));
      const glow = add(`left:${cx - R * 1.3}px;top:${cy - R * 1.3}px;width:${R * 2.6}px;height:${R * 2.6}px;border-radius:50%;z-index:2;background:radial-gradient(closest-side,rgba(124,58,237,.55),rgba(245,158,11,.22) 50%,transparent)`);
      anim(glow, fr(t => ({ opacity: .85 * grow(t), transform: `scale(${(.5 + .6 * grow(t)).toFixed(3)})` })));
      const disk = add(`left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px;z-index:3;border-radius:50%;background:conic-gradient(from 0deg,rgba(251,146,60,0),#f59e0b 12%,#fde68a 20%,#f59e0b 30%,rgba(168,85,247,0) 45%,#a78bfa 60%,#7c3aed 72%,rgba(251,146,60,0) 90%);-webkit-mask:radial-gradient(circle,transparent 30%,#000 35%,#000 62%,transparent 70%);mask:radial-gradient(circle,transparent 30%,#000 35%,#000 62%,transparent 70%)`);
      anim(disk, fr(t => { const g = grow(t); return { opacity: Math.min(1, g * 1.4), transform: `scale(${g.toFixed(3)},${(g * .42).toFixed(3)}) rotate(${(t * 420).toFixed(1)}deg)` }; }));
      const core = add(`left:${cx - R * .34}px;top:${cy - R * .34}px;width:${R * .68}px;height:${R * .68}px;z-index:6;border-radius:50%;background:#000;box-shadow:0 0 ${R * .2}px ${R * .05}px rgba(167,139,250,.8),inset 0 0 ${R * .1}px rgba(253,186,116,.5)`);
      anim(core, fr(t => ({ opacity: grow(t) > 0 ? 1 : 0, transform: `scale(${grow(t).toFixed(3)})` })));
      const ring = add(`left:${cx - R * .4}px;top:${cy - R * .4}px;width:${R * .8}px;height:${R * .8}px;z-index:7`, `<svg width="100%" height="100%" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="#ffedd5" stroke-opacity=".9" stroke-width="2"/></svg>`);
      anim(ring, fr(t => ({ opacity: .8 * grow(t) * (.8 + .2 * Math.sin(t * 40)), transform: `scale(${grow(t).toFixed(3)})` })));
      // the card, cut in strips that spiral in
      const N = 12;
      for (let i = 0; i < N; i++) {
        const yi = (i + .5) / N * H - H / 2, r0 = Math.max(Math.abs(yi), H * .1), a0 = yi >= 0 ? Math.PI / 2 : -Math.PI / 2, dir = i % 2 ? 1 : -1;
        const t0 = .22 + (i % 6) * .05 + (i < 6 ? 0 : .02), dur = BH_END - .06 - t0, y0 = (i / N * 100).toFixed(2), y1 = (100 - (i + 1) / N * 100).toFixed(2);
        const el = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:4;clip-path:inset(${y0}% 0 ${y1}% 0);transform-origin:50% ${((i + .5) / N * 100).toFixed(2)}%`);
        el.appendChild(face());
        anim(el, fr(t => {
          const u = clamp((t - t0) / dur);
          if (t < t0) return { opacity: 1, transform: `translateY(${(Math.sin(t * 90 + i) * H * .006 * sm(.05, t0, t)).toFixed(2)}px)` };
          const a = a0 + dir * u * Math.PI * 3, r = r0 * Math.pow(1 - u, 1.3), dx = r * Math.cos(a), dy = r * Math.sin(a) - yi;
          return { opacity: 1 - sm(.9, 1, u), transform: `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${(dir * (a - a0) * 57.3).toFixed(1)}deg) scale(${((1 + 1.8 * Math.pow(u, 1.5)) * (1 - sm(.85, 1, u))).toFixed(3)},${(1 - .85 * u).toFixed(3)})` };
        }));
      }
      // little cards and star dust drawn in
      for (let i = 0; i < 10; i++) {
        const r0 = R * rand(1.1, 1.7), a0 = rand(0, 6.3), t0 = .2 + rand(0, .45), dur = BH_END - .05 - t0, dir = i % 2 ? 1 : -1, w = H * .22;
        const el = add(`left:${cx - w / 2}px;top:${cy - w * .7}px;width:${w}px;height:${w * 1.4}px;z-index:4`, bfxMiniCard(i % 3 ? '#f8fafc' : '#fef3c7', i % 2 ? '#dc2626' : '#111827'));
        anim(el, fr(t => { const u = clamp((t - t0) / dur); if (t < t0 || u >= 1) return { opacity: 0, transform: 'scale(.2)' }; const a = a0 + dir * u * Math.PI * 2.6, r = r0 * Math.pow(1 - u, 1.4);
          return { opacity: sm(0, .1, u), transform: `translate(${(Math.cos(a) * r).toFixed(1)}px,${(Math.sin(a) * r * .8).toFixed(1)}px) rotate(${((a * 57.3) - 90).toFixed(0)}deg) scale(${(1 - .9 * u).toFixed(2)},${(1 + 1.6 * u).toFixed(2)})` }; }));
      }
      for (let i = 0; i < 44; i++) {
        const r0 = H * rand(1.2, 2.4), a0 = rand(0, 6.3), t0 = rand(.05, .85), life = rand(.45, .7), s = H * rand(.012, .03), dir = i % 2 ? 1 : -1, col = ['#fff', '#c4b5fd', '#fde68a'][i % 3];
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:${col};box-shadow:0 0 ${s * 3}px ${col}`);
        anim(el, fr(t => { const u = clamp((t - t0) / life); if (t < t0 || u >= 1) return { opacity: 0, transform: 'none' }; const a = a0 + dir * u * 2.2, r = r0 * Math.pow(1 - u, 1.6); return { opacity: Math.sin(u * Math.PI), transform: `translate(${(Math.cos(a) * r).toFixed(1)}px,${(Math.sin(a) * r * .85).toFixed(1)}px)` }; }));
      }
      // the collapse: flash, shock ring, starlight
      const flash = add(`left:${cx - H * 1.1}px;top:${cy - H * 1.1}px;width:${H * 2.2}px;height:${H * 2.2}px;border-radius:50%;z-index:8;mix-blend-mode:screen;background:radial-gradient(closest-side,#fff,rgba(196,181,253,.8) 40%,rgba(56,189,248,.25) 65%,transparent)`);
      anim(flash, fr(t => ({ opacity: t < BH_END ? 0 : 1 - sm(BH_END, BH_END + .3, t), transform: `scale(${(.2 + 1.6 * out(sm(BH_END, BH_END + .3, t))).toFixed(3)})` })));
      const shock = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;border-radius:50%;z-index:7;border:${Math.max(2, px * 2)}px solid rgba(221,214,254,.9);box-sizing:border-box`);
      anim(shock, fr(t => ({ opacity: t < BH_END ? 0 : .9 * (1 - sm(BH_END, BH_END + .55, t)), transform: `scale(${(.1 + 3.2 * out(sm(BH_END, BH_END + .55, t))).toFixed(3)})` })));
      for (let i = 0; i < 30; i++) {
        const a = rand(0, 6.3), v = H * rand(1.2, 3.2), s = H * rand(.05, .11), t0 = BH_END + rand(0, .1), col = ['#fff', '#c4b5fd', '#7dd3fc', '#fde68a'][i % 4], spin = rand(-120, 120);
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:8`, pfxStar(col));
        anim(el, fr(t => { const tau = t - t0; if (tau < 0) return { opacity: 0, transform: 'scale(0)' }; const d = (1 - Math.exp(-3 * tau)) / 3, u = clamp(tau / .75); return { opacity: Math.sin(Math.min(1, u * 1.2 + .1) * Math.PI) * (u < 1 ? 1 : 0), transform: `translate(${(Math.cos(a) * v * d).toFixed(1)}px,${(Math.sin(a) * v * d).toFixed(1)}px) rotate(${(spin * tau).toFixed(0)}deg) scale(${(1 - .5 * u).toFixed(2)})` }; }));
      }
      end(lastAnim);
    }

    // Pixel Blast (v407, procedural on the real card): a CRT scan bar sweeps the card (0.08-0.46s) while it
    // pixelates in six jerky steps (an SVG filter per block size, switched at each step) with an RGB glitch;
    // at 0.52s it blasts into 63 blocky chunks of its own picture plus loose 8-bit squares that fly in 80ms
    // steps, shrinking in quarters, under a stepped square shock ring and faint scanlines.
    // Sound: BURN_SOUNDS['burn-pixel'] (a rising blip at each step, the blast at .52).
    const PX_STEPS = [[.06, 2], [.14, 3], [.22, 4], [.3, 6], [.38, 8], [.46, 12]], PX_BLAST = .52;
    function pfxPixelFilters() {
      if (document.getElementById('pfxPixelDefs')) return;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'pfxPixelDefs'; svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
      svg.innerHTML = '<defs>' + [2, 3, 4, 6, 8, 12].map(p => `<filter id="pxf${p}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feFlood x="${p / 2 - .5}" y="${p / 2 - .5}" width="1" height="1" flood-color="#000"/><feComposite width="${p}" height="${p}"/><feTile result="t"/><feComposite in="SourceGraphic" in2="t" operator="in"/><feMorphology operator="dilate" radius="${p / 2}"/></filter>`).join('') + '</defs>';
      document.body.appendChild(svg);
    }
    function bfxPixelBlast(host, x, y, k) {
      pfxPixelFilters();
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face, vw } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp } = kit, vh = host.clientHeight || innerHeight, px = H / 100, QS = 12.5, q = t => Math.floor(t * QS) / QS;
      const level = t => { let p = 0; for (const [s, v] of PX_STEPS) if (t >= s) p = v; return p; };
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      box.appendChild(face());
      const lastAnim = anim(box, fr(t => { const p = level(t), g = t > .06 && t < PX_BLAST && Math.floor(t * 40) % 3 === 0; return { opacity: t < PX_BLAST ? 1 : 0, filter: `${p ? `url(#pxf${p})` : 'none'}${g ? ` drop-shadow(${(px * 2).toFixed(1)}px 0 rgba(255,0,60,.9)) drop-shadow(${(-px * 2).toFixed(1)}px 0 rgba(0,220,255,.9))` : ''}`, transform: `translate(${(Math.round(Math.sin(t * 70) * 2) * (p ? 1 : 0)).toFixed(0)}px,0) scale(${(1 + .04 * Math.sin(t * 25) * sm(.06, PX_BLAST, t)).toFixed(3)})` }; }));
      const bar = add(`left:${cx - W * .7}px;top:${cy - H / 2}px;width:${W * 1.4}px;height:${H * .1}px;z-index:5;mix-blend-mode:screen;background:linear-gradient(to bottom,transparent,rgba(125,211,252,.9),#fff,rgba(125,211,252,.9),transparent)`);
      anim(bar, fr(t => ({ opacity: t > .08 && t < .46 ? 1 : 0, transform: `translateY(${(H * .95 * sm(.08, .46, t)).toFixed(1)}px)` })));
      const scan = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:9;background:repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0,rgba(0,0,0,.3) 2px,transparent 2px,transparent 4px)`);
      anim(scan, fr(t => ({ opacity: (.35 * sm(.04, .2, t) * (1 - sm(1.5, 1.9, t))) * (.8 + .2 * Math.sin(t * 60)) })));
      const flashC = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:6;mix-blend-mode:screen;background:#fff`);
      anim(flashC, fr(t => ({ opacity: t >= PX_BLAST - .02 && t < PX_BLAST + .1 ? .8 * (1 - sm(PX_BLAST, PX_BLAST + .1, t)) : 0 })));
      // the blast: the card's own picture as blocky chunks
      const cols = 7, rows = 9;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const mx = (c + .5) / cols * W - W / 2, my = (r + .5) / rows * H - H / 2, dl = Math.hypot(mx, my) || 1, sp = H * rand(.8, 2.6), vx = mx / dl * sp + rand(-.3, .3) * H, vy = my / dl * sp - H * rand(.2, 1), s0 = rand(0, 4), fl = rand(1.4, 1.8);
        const el = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;filter:url(#pxf8);clip-path:inset(${(r / rows * 100).toFixed(2)}% ${(100 - (c + 1) / cols * 100).toFixed(2)}% ${(100 - (r + 1) / rows * 100).toFixed(2)}% ${(c / cols * 100).toFixed(2)}%);transform-origin:${((c + .5) / cols * 100).toFixed(1)}% ${((r + .5) / rows * 100).toFixed(1)}%`);
        el.appendChild(face());
        anim(el, fr(t => { if (t < PX_BLAST) return { opacity: 0, transform: 'none' }; const tau = q(t) - PX_BLAST, dy = Math.min(vy * tau + H * 1.7 * tau * tau, H * 1.1), sh = 1 - .25 * Math.floor(sm(fl, fl + .5, t) * 4);
          return { opacity: sh > 0 ? 1 : 0, transform: `translate(${(vx * tau).toFixed(0)}px,${dy.toFixed(0)}px) rotate(${(Math.floor(tau * 5 + s0) % 4 * 90)}deg) scale(${sh})` }; }));
      }
      const PAL = ['#ffffff', '#ef4444', '#38bdf8', '#fde047', '#22c55e', '#a855f7'];
      for (let i = 0; i < 46; i++) {
        const a = rand(0, 6.3), v = H * rand(.8, 3), s = Math.max(2, Math.round(H * rand(.03, .07))), vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .6, fl = rand(1.2, 1.8), col = PAL[i % PAL.length];
        const el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:5;background:${col};box-shadow:inset ${-Math.max(1, s * .2)}px ${-Math.max(1, s * .2)}px 0 rgba(0,0,0,.25)`);
        anim(el, fr(t => { if (t < PX_BLAST) return { opacity: 0, transform: 'none' }; const tau = q(t) - PX_BLAST, sh = 1 - .25 * Math.floor(sm(fl, fl + .5, t) * 4);
          return { opacity: sh > 0 ? 1 : 0, transform: `translate(${(vx * tau).toFixed(0)}px,${(vy * tau + H * 2.2 * tau * tau).toFixed(0)}px) scale(${sh})` }; }));
      }
      const sq = add(`left:${cx - H * .4}px;top:${cy - H * .4}px;width:${H * .8}px;height:${H * .8}px;z-index:6;border:${Math.max(3, px * 3)}px solid #fff;box-sizing:border-box`);
      anim(sq, fr(t => { const u = clamp((t - PX_BLAST) / .5), s = Math.floor(u * 6) / 6; return { opacity: t < PX_BLAST ? 0 : u < 1 ? 1 - s : 0, transform: `scale(${(.3 + 2.2 * s).toFixed(2)})` }; }));
      end(lastAnim);
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
    // ---- Seasonal burns rebuilt on procBurnStage (v409): Diwali, Easter, New Year. The real top card is part of
    // each story and is consumed, everything rides ONE 2s clock (paused frames are exact), and effects stay low so
    // they never cover the opponent's seat. Sounds: BURN_SOUNDS['burn-diwali' | 'burn-easter' | 'burn-newyear'].
    // A body under gravity from t0 (optional bounce on a floor), keyframes sampled on the shared clock.
    function pfxFly(st, kit, o) {
      const { fr, sm, D } = kit, dt = D / PFX_N, w = o.w, h = o.h || o.w;
      const el = kit.add(`left:${o.x - w / 2}px;top:${o.y - h / 2}px;width:${w}px;height:${h}px;z-index:${o.z || 5};${o.css || ''}`, o.html || '');
      let px = 0, py = 0, vx = o.vx, vy = o.vy, rz = o.rot || 0;
      st.anim(el, fr(t => {
        if (t < o.t0) return { opacity: 0, transform: 'none' };
        if (t - dt >= o.t0 - 1e-6) { vy += o.g * dt; px += vx * dt; py += vy * dt; rz += (o.spin || 0) * dt; if (o.floor != null && py > o.floor && vy > 0) { py = o.floor; vy = -vy * (o.bounce || .3); vx *= .7; } }
        const f = sm(o.fade0, o.fade0 + .25, t), flip = o.flutter ? Math.cos((t - o.t0) * o.flutter) : 1;
        return { opacity: (1 - f) * Math.min(1, (t - o.t0) * 20), transform: `translate(${px.toFixed(1)}px,${py.toFixed(1)}px) rotate(${(rz * 57.3).toFixed(1)}deg) scale(${((o.s || 1) * (1 - .3 * f)).toFixed(3)},${((o.s || 1) * (1 - .3 * f) * (o.flutter ? Math.max(.15, Math.abs(flip)) : 1)).toFixed(3)})` };
      }));
      return el;
    }
    // A radial burst of glowing streaks from (x, y) at t0: o = {n, len, dist, life, cols, w, z}.
    function pfxBurst(st, kit, o) {
      const { rand, out, sm, fr, add, clamp } = kit, w = o.w || 3;
      const flash = add(`left:${o.x - o.dist * .45}px;top:${o.y - o.dist * .45}px;width:${o.dist * .9}px;height:${o.dist * .9}px;border-radius:50%;z-index:${o.z || 5};background:radial-gradient(closest-side,#fff,${o.cols[0]}99 40%,transparent)`);
      st.anim(flash, fr(t => { const p = clamp((t - o.t0) / .22); return { opacity: p > 0 && p < 1 ? 1 - p : 0, transform: `scale(${(.2 + .9 * p).toFixed(3)})` }; }));
      for (let i = 0; i < o.n; i++) {
        const a = i / o.n * Math.PI * 2 + rand(-.12, .12), col = o.cols[i % o.cols.length], L = o.len * rand(.7, 1.3), D = o.dist * rand(.7, 1.1);
        const el = add(`left:${o.x}px;top:${o.y}px;width:${L}px;height:${w}px;border-radius:9px;z-index:${o.z || 5};transform-origin:0 50%;background:linear-gradient(90deg,transparent,${col});box-shadow:0 0 ${w * 2}px ${col}`);
        st.anim(el, fr(t => { const p = clamp((t - o.t0) / o.life); if (p <= 0 || p >= 1) return { opacity: 0, transform: `rotate(${a.toFixed(3)}rad)` }; return { opacity: 1 - sm(.5, 1, p), transform: `rotate(${a.toFixed(3)}rad) translateX(${(out(p) * D).toFixed(1)}px) scaleX(${(1 - .55 * p).toFixed(3)})` }; }));
      }
    }

    // Diwali, the festival of lights: a ring of clay diyas lights up round the card, which glows gold, a rocket whistles
    // up and the card bursts into golden shards inside three firework bursts, a rangoli ring spreads and marigold
    // petals drift down. Booms at .62 / .80 / .96s.
    const DIW_BOOMS = [.62, .8, .96];
    function bfxDiwali(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, out, sm, fr, add, clamp } = kit, PAL = ['#f97316', '#facc15', '#ec4899', '#22c55e', '#a855f7', '#fb7185'];
      const glow = add(`left:${cx - H * 1.2}px;top:${cy - H * 1.2}px;width:${H * 2.4}px;height:${H * 2.4}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(251,146,60,.6),rgba(236,72,153,.18) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: .9 * sm(0, .5, t) * (1 - sm(1.35, 1.95, t)), transform: `scale(${(.7 + .5 * sm(0, .62, t) + .2 * sm(.62, 1.2, t)).toFixed(3)})` })));
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`), warm = document.createElement('div');
      warm.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:linear-gradient(160deg,rgba(253,224,71,.5),rgba(249,115,22,.35))`;
      box.append(face(), warm);
      anim(warm, fr(t => ({ opacity: sm(.05, .6, t) })));
      anim(box, fr(t => { const g = sm(0, DIW_BOOMS[0], t); return { opacity: t < DIW_BOOMS[0] ? 1 : 0, transform: `scale(${(1 + .09 * g).toFixed(3)})`, filter: `brightness(${(1 + .35 * g).toFixed(2)}) drop-shadow(0 0 ${(H * .1 * g).toFixed(1)}px rgba(251,191,36,.95))` }; }));
      // The diyas: a clay bowl and a flickering flame, lit one after another round the card.
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * .5 + i / 12 * Math.PI * 2, dx = Math.cos(a) * W * .78, dy = Math.sin(a) * H * .6, s = H * .17, s0 = .04 + i * .035, ph = rand(0, 6.3);
        const wrap = add(`left:${cx + dx - s / 2}px;top:${cy + dy - s / 2}px;width:${s}px;height:${s}px;z-index:5`);
        wrap.innerHTML = `<div style="position:absolute;left:12%;right:12%;bottom:6%;height:38%;border-radius:0 0 50% 50%/0 0 100% 100%;background:linear-gradient(#c2410c,#7c2d12);box-shadow:inset 0 2px 0 #fb923c"></div><div class="dyf" style="position:absolute;left:36%;width:28%;bottom:34%;height:62%;border-radius:50% 50% 50% 50%/62% 62% 38% 38%;transform-origin:50% 100%;background:radial-gradient(circle at 50% 70%,#fff,#fde047 45%,#f97316 80%);box-shadow:0 0 ${s * .5}px ${s * .25}px rgba(251,191,36,.8)"></div>`;
        anim(wrap, fr(t => ({ opacity: clamp((t - s0) / .06) * (1 - sm(.9, 1.15, t)), transform: `scale(${(.3 + .7 * out(clamp((t - s0) / .12))).toFixed(3)})` })));
        anim(wrap.querySelector('.dyf'), fr(t => ({ transform: `scaleY(${(1 + .22 * Math.sin(t * 28 + ph) + .1 * Math.sin(t * 17 + ph)).toFixed(3)}) skewX(${(Math.sin(t * 13 + ph) * 7).toFixed(1)}deg)` })));
      }
      // A rocket rises into the first burst.
      const rk = add(`left:${cx - 2}px;top:${cy}px;width:4px;height:${H * .22}px;border-radius:3px;z-index:5;background:linear-gradient(to top,transparent,#fde68a 60%,#fff)`);
      anim(rk, fr(t => { const p = clamp((t - .4) / .22); return { opacity: p > 0 && p < 1 ? 1 : 0, transform: `translateY(${(-out(p) * H * .45).toFixed(1)}px)` }; }));
      // Fireworks, rangoli, petals; the card bursts into golden shards at the first boom.
      DIW_BOOMS.forEach((t0, i) => pfxBurst(st, kit, { x: cx + (i - 1) * W * .5 + rand(-.1, .1) * W, y: cy + (i === 1 ? -H * .32 : -H * .12) + rand(-.06, .06) * H, t0, n: i ? 20 : 26, len: H * .16, dist: H * (i ? .55 : .8), life: .7, cols: PAL.slice(i, i + 4).concat(['#fde68a']) }));
      pfxShatter(st, kit, { t0: DIW_BOOMS[0], ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .85, edge: '#fde68a', tint: () => 'linear-gradient(135deg,rgba(251,191,36,.6),rgba(249,115,22,.45))' });
      const rg = add(`left:${cx - H * .8}px;top:${cy - H * .8}px;width:${H * 1.6}px;height:${H * 1.6}px;z-index:1`);
      rg.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="46" fill="none" stroke="#facc15" stroke-width="2.4" stroke-dasharray="2 4.4" stroke-linecap="round"/><circle cx="50" cy="50" r="38" fill="none" stroke="#ec4899" stroke-width="1.6" stroke-dasharray="7 4"/><circle cx="50" cy="50" r="30" fill="none" stroke="#22c55e" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round"/></svg>`;
      anim(rg, fr(t => { const p = clamp((t - DIW_BOOMS[0]) / .9); return { opacity: p > 0 && p < 1 ? (1 - sm(.6, 1, p)) * .9 : 0, transform: `scale(${(.3 + .8 * out(p)).toFixed(3)}) rotate(${(p * 70).toFixed(1)}deg)` }; }));
      for (let i = 0; i < 28; i++) {
        const sx = cx + rand(-.7, .7) * W, c = ['#f97316', '#fb923c', '#facc15'][i % 3];
        pfxFly(st, kit, { x: sx, y: cy - H * rand(.1, .5), w: H * .07, h: H * .11, t0: .66 + rand(0, .45), vx: rand(-.3, .3) * H, vy: rand(-.25, .1) * H, g: H * .85, spin: rand(-4, 4), flutter: rand(6, 11), floor: H * .62, bounce: .05, fade0: 1.6 + rand(0, .25),
          css: `border-radius:50% 50% 50% 50%/70% 70% 30% 30%;background:radial-gradient(circle at 40% 30%,#fff2,${c} 40%,${c})` });
      }
      end(lastAnim);
    }

    // Easter: the card swells into a pastel-banded egg, wobbles and cracks, the shell splits open (top half flies
    // off) and a chick hops out among bouncing mini eggs and blossoms. Knocks .44-.59s, split .62s.
    const EAS_SPLIT = .62, EAS_PASTELS = [['#f9a8d4', '#a5b4fc', '#fde68a'], ['#a7f3d0', '#f9a8d4', '#bae6fd'], ['#c4b5fd', '#fde68a', '#fbcfe8']];
    function bfxEaster(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, out, sm, fr, add, clamp } = kit, [pa, pb, pc] = EAS_PASTELS[Math.floor(Math.random() * EAS_PASTELS.length)];
      const EGG = '50% 50% 50% 50% / 62% 62% 38% 38%', eW = W * .88, eH = H * .98, zz = [[0, 50], [12, 41], [25, 57], [37, 42], [50, 58], [62, 42], [75, 57], [88, 41], [100, 50]];
      const glow = add(`left:${cx - H}px;top:${cy - H}px;width:${H * 2}px;height:${H * 2}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(253,230,138,.5),rgba(249,168,212,.2) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: sm(0, .6, t) * (1 - sm(1.4, 1.95, t)) })));
      const poly = pts => `polygon(${pts.map(p => `${p[0]}% ${p[1]}%`).join(',')})`;
      const topPts = [[0, 0], [100, 0], ...zz.slice().reverse()], botPts = [...zz, [100, 100], [0, 100]];
      const stripes = `linear-gradient(to bottom,transparent 0 22%,${pa} 22% 31%,transparent 31% 44%,${pb} 44% 52%,transparent 52% 64%,${pc} 64% 74%,transparent 74%),radial-gradient(circle,#fff9 0 14%,transparent 15%) 0 0/22% 14%`;
      const half = (pts, z) => {
        const wrap = add(`left:${cx - eW / 2}px;top:${cy - eH / 2}px;width:${eW}px;height:${eH}px;z-index:${z};overflow:hidden;border-radius:${radius}`), inner = document.createElement('div');
        inner.style.cssText = `position:absolute;inset:0;clip-path:${poly(pts)}`;
        const f = face(); f.style.transformOrigin = '0 0'; f.style.transform = `scale(${eW / W},${eH / H})`;
        const paint = document.createElement('div'); paint.style.cssText = `position:absolute;inset:0;background:${stripes};box-shadow:inset ${-eW * .08}px ${-eH * .06}px ${eW * .16}px rgba(0,0,0,.22),inset ${eW * .06}px ${eH * .05}px ${eW * .12}px rgba(255,255,255,.5)`;
        inner.append(f, paint); wrap.appendChild(inner);
        anim(paint, fr(t => ({ opacity: .96 * sm(.05, .4, t) })));
        return wrap;
      };
      const top = half(topPts, 4), bot = half(botPts, 3);
      const shape = t => EGG, wob = t => { const g = sm(.38, EAS_SPLIT, t) * (t < EAS_SPLIT ? 1 : 0); return Math.sin(t * 60) * 9 * g; };
      [top, bot].forEach((el, i) => anim(el, fr(t => {
        const sw = sm(0, .4, t), rot = wob(t), j = t < EAS_SPLIT ? 0 : sm(EAS_SPLIT, EAS_SPLIT + .5, t), br = `${(8 * (1 - sw)).toFixed(1)}px`;
        const base = `scale(${(1 + .04 * sw).toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
        if (i === 0) return { borderRadius: sw > .02 ? EGG : radius, opacity: 1 - sm(.8, 1.1, t), transform: t < EAS_SPLIT ? base : `translate(${(-eW * .5 * out(j)).toFixed(1)}px,${(-H * .62 * out(j) + H * 1.1 * j * j * .6).toFixed(1)}px) rotate(${(-70 * out(j)).toFixed(1)}deg)` };
        return { borderRadius: sw > .02 ? EGG : radius, opacity: 1 - sm(1.45, 1.85, t), transform: t < EAS_SPLIT ? base : `translateY(${(H * .06 * out(sm(EAS_SPLIT, 1.5, t))).toFixed(1)}px) rotate(${(Math.sin((t - EAS_SPLIT) * 30) * 3 * (1 - clamp((t - EAS_SPLIT) / .4))).toFixed(2)}deg)` };
      })));
      // The crack: a zig-zag line that draws across the egg before it splits.
      const ck = add(`left:${cx - eW / 2}px;top:${cy - eH / 2}px;width:${eW}px;height:${eH}px;z-index:5`);
      ck.innerHTML = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%"><polyline points="${zz.map(p => p.join(',')).join(' ')}" pathLength="1" stroke-dasharray="1" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
      const cp = ck.querySelector('polyline');
      anim(cp, fr(t => ({ strokeDashoffset: 1 - sm(.5, EAS_SPLIT, t) })));
      anim(ck, fr(t => ({ opacity: t < EAS_SPLIT ? 1 : 0 })));
      // The chick.
      const chick = add(`left:${cx - H * .22}px;top:${cy - H * .3}px;width:${H * .44}px;height:${H * .44}px;z-index:5`);
      chick.innerHTML = `<svg viewBox="0 0 40 40" width="100%" height="100%" style="overflow:visible"><ellipse cx="20" cy="37" rx="11" ry="2.4" fill="rgba(0,0,0,.22)"/><path d="M13 33v4M27 33v4" stroke="#f97316" stroke-width="2" stroke-linecap="round"/><circle cx="20" cy="21" r="14.5" fill="#fde047"/><circle cx="20" cy="22" r="11" fill="#fef08a" opacity=".7"/><path d="M9 24c-3 1-5 5-2 8 3-1 4-5 2-8ZM31 24c3 1 5 5 2 8-3-1-4-5-2-8Z" fill="#facc15"/><circle cx="15" cy="18" r="2.2" fill="#1c1917"/><circle cx="25" cy="18" r="2.2" fill="#1c1917"/><circle cx="15.7" cy="17.3" r=".7" fill="#fff"/><circle cx="25.7" cy="17.3" r=".7" fill="#fff"/><path d="M17.5 22h5L20 26.5Z" fill="#f97316"/><path d="M18 7c1 3 1 4 2 7M22 7c-1 3-1 4-2 7" stroke="#ca8a04" stroke-width="1.6" stroke-linecap="round" fill="none"/><ellipse cx="11.5" cy="22.5" rx="2.4" ry="1.6" fill="#fda4af" opacity=".7"/><ellipse cx="28.5" cy="22.5" rx="2.4" ry="1.6" fill="#fda4af" opacity=".7"/></svg>`;
      anim(chick, fr(t => {
        if (t < EAS_SPLIT) return { opacity: 0, transform: `translateY(${H * .2}px) scale(.3)` };
        const u = t - EAS_SPLIT, rise = out(clamp(u / .22)), hop = h => Math.max(0, Math.sin(clamp((u - h) / .22) * Math.PI)) * H * .22;
        return { opacity: 1 - sm(1.55, 1.9, t), transform: `translate(${(Math.sin(u * 6) * W * .05).toFixed(1)}px,${(H * .2 * (1 - rise) - H * .22 * rise - hop(.3) - hop(.7)).toFixed(1)}px) scale(${(.3 + .7 * rise).toFixed(3)},${((.3 + .7 * rise) * (1 - .1 * Math.max(0, Math.sin(u * 30)) * (u < .9 ? 1 : 0))).toFixed(3)})` };
      }));
      // Mini eggs bounce out of the shell, blossoms and sparkles drift.
      const mini = (a, b) => `<svg viewBox="0 0 24 30" width="100%" height="100%"><path d="M12 1C18 1 22 11 22 18 22 25 17 29 12 29S2 25 2 18C2 11 6 1 12 1Z" fill="${a}"/><path d="M3 15Q12 20 21 15M3.5 21Q12 26 20.5 21" stroke="${b}" stroke-width="2.4" fill="none"/><ellipse cx="8" cy="9" rx="2" ry="3.4" fill="#fff" opacity=".6" transform="rotate(20 8 9)"/></svg>`;
      for (let i = 0; i < 7; i++) {
        const [c1, c2] = [[pa, pb], [pb, pc], [pc, pa]][i % 3], dir = i % 2 ? 1 : -1;
        pfxFly(st, kit, { x: cx + rand(-.1, .1) * W, y: cy - H * .05, w: H * .17, h: H * .21, t0: EAS_SPLIT + .04 + i * .035, vx: dir * H * rand(.5, 1.3), vy: -H * rand(1.1, 1.55), g: H * 3.4, spin: dir * rand(2, 7), floor: H * rand(.5, .75), bounce: .38, fade0: 1.6 + rand(0, .25), html: mini(c1, c2) });
      }
      for (let i = 0; i < 12; i++) {
        const c = [pa, pb, pc, '#fff'][i % 4];
        pfxFly(st, kit, { x: cx + rand(-.4, .4) * W, y: cy - H * .1, w: H * .12, t0: EAS_SPLIT + .06 + rand(0, .3), vx: rand(-.7, .7) * H, vy: -H * rand(.6, 1.2), g: H * 1.6, spin: rand(-5, 5), flutter: rand(8, 13), floor: H * .6, bounce: .05, fade0: 1.55 + rand(0, .3),
          html: `<svg viewBox="0 0 24 24" width="100%" height="100%">${[0, 72, 144, 216, 288].map(r => `<ellipse cx="12" cy="6.5" rx="4" ry="6" fill="${c}" transform="rotate(${r} 12 12)"/>`).join('')}<circle cx="12" cy="12" r="2.6" fill="#fde047"/></svg>` });
      }
      pfxBurst(st, kit, { x: cx, y: cy - H * .1, t0: EAS_SPLIT, n: 14, len: H * .1, dist: H * .55, life: .6, cols: ['#fde68a', pa, pb, '#fff'], w: 2.4 });
      end(lastAnim);
    }

    // New Year: a gold clock ring fills round the card as 3-2-1 flash over it, at midnight the cork pops, the card
    // bursts into gold shards, a champagne spray, confetti and streamers fly and starbursts crackle.
    const NY_MID = .62, NY_TICKS = [.05, .23, .41];
    function bfxNewYear(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, out, sm, fr, add, clamp } = kit, GOLD = ['#fde68a', '#facc15', '#fff7d6', '#f5d0fe', '#bae6fd'];
      const glow = add(`left:${cx - H * 1.2}px;top:${cy - H * 1.2}px;width:${H * 2.4}px;height:${H * 2.4}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(250,204,21,.5),rgba(99,102,241,.2) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: sm(0, .6, t) * (1 - sm(1.4, 1.95, t)) })));
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      box.appendChild(face());
      anim(box, fr(t => { const tk = NY_TICKS.reduce((m, a) => Math.max(m, Math.max(0, 1 - (t - a) / .09) * (t >= a ? 1 : 0)), 0); return { opacity: t < NY_MID ? 1 : 0, transform: `scale(${(1 + .05 * tk).toFixed(3)})`, filter: `brightness(${(1 + .25 * tk + .2 * sm(.3, NY_MID, t)).toFixed(2)})` }; }));
      // The clock ring.
      const R = Math.max(W, H) * .72, ring = add(`left:${cx - R}px;top:${cy - R}px;width:${R * 2}px;height:${R * 2}px;z-index:2`);
      ring.innerHTML = `<svg viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="47" fill="none" stroke="rgba(253,230,138,.22)" stroke-width="2"/><circle class="nyr" cx="50" cy="50" r="47" fill="none" stroke="#fde68a" stroke-width="2.6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" transform="rotate(-90 50 50)" style="filter:drop-shadow(0 0 2px #facc15)"/>${Array.from({ length: 12 }, (_, i) => `<path d="M50 3V${i % 3 ? 7 : 11}" stroke="#fde68a" stroke-width="${i % 3 ? 1 : 1.8}" transform="rotate(${i * 30} 50 50)"/>`).join('')}</svg>`;
      anim(ring.querySelector('.nyr'), fr(t => ({ strokeDashoffset: 1 - out(sm(0, NY_MID, t)) })));
      anim(ring, fr(t => { const p = sm(NY_MID, NY_MID + .3, t); return { opacity: (1 - p) * sm(0, .06, t), transform: `scale(${(1 + .5 * p).toFixed(3)})` }; }));
      // 3 - 2 - 1.
      ['3', '2', '1'].forEach((d, i) => {
        const el = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;z-index:6;display:flex;align-items:center;justify-content:center;font:800 ${H * .62}px/1 system-ui,sans-serif;color:#fff7d6;text-shadow:0 0 ${H * .08}px #facc15,0 0 ${H * .2}px rgba(250,204,21,.7)`, d), a = NY_TICKS[i];
        anim(el, fr(t => { const p = clamp((t - a) / .17); return { opacity: p > 0 && p < 1 ? 1 - sm(.6, 1, p) : 0, transform: `scale(${(1.6 - .6 * out(clamp(p * 3)) + .15 * p).toFixed(3)})` }; }));
      });
      // The champagne bottle (green glass, gold foil, wire cage, label) stands at the card's right, tipped toward it.
      // It pops in, fizzes (bubbles rise inside), shakes harder with every tick, and at midnight the cork flies, foam
      // pours down the neck and a stream of champagne and rising bubbles gushes out over the card.
      const Hb = H * 1.45, Wb = Hb * .34, bx = cx + W * .78, by = cy + H * .78, TH = -24 * Math.PI / 180;
      const mouthX = bx + Hb * Math.sin(TH), mouthY = by - Hb * Math.cos(TH);
      const dir = Math.atan2(-Math.cos(TH), Math.sin(TH));
      const bottle = add(`left:${bx - Wb / 2}px;top:${by - Hb}px;width:${Wb}px;height:${Hb}px;z-index:4;transform-origin:50% 100%`);
      bottle.innerHTML = `<svg viewBox="0 0 40 120" width="100%" height="100%" style="position:absolute;inset:0;overflow:visible"><defs><linearGradient id="nyg" x1="0" x2="1"><stop offset="0" stop-color="#0a2a1c"/><stop offset=".35" stop-color="#2a9d62"/><stop offset=".6" stop-color="#14683f"/><stop offset="1" stop-color="#08210f"/></linearGradient><linearGradient id="nyf" x1="0" x2="1"><stop offset="0" stop-color="#b8860b"/><stop offset=".4" stop-color="#fde68a"/><stop offset="1" stop-color="#b8860b"/></linearGradient></defs><path d="M15 8H25V38C25 52 38 56 38 74V112Q38 118 32 118H8Q2 118 2 112V74C2 56 15 52 15 38Z" fill="url(#nyg)"/><path d="M14.6 24H25.4V40H14.6Z" fill="url(#nyf)"/><rect x="5" y="80" width="30" height="24" rx="2.5" fill="#f5e6b8"/><rect x="5" y="80" width="30" height="5" fill="#d4a017"/><rect x="5" y="99" width="30" height="5" fill="#d4a017"/><path d="M20 87l1.8 3.6 4 .6-2.9 2.8.7 4L20 96l-3.6 1.9.7-4-2.9-2.8 4-.6Z" fill="#9a6b00"/><path d="M8 66V110" stroke="#fff" stroke-opacity=".3" stroke-width="2.6" stroke-linecap="round"/><path d="M17 30V50" stroke="#fff" stroke-opacity=".35" stroke-width="1.6" stroke-linecap="round"/></svg><svg class="nycap" viewBox="0 0 40 120" width="100%" height="100%" style="position:absolute;inset:0;overflow:visible"><path d="M14 0H26L27 26H13Z" fill="url(#nyf)"/><path d="M14 0H26" stroke="#fff7d6" stroke-width="2"/><path d="M13 9L27 21M27 9L13 21M13 15H27" stroke="#6b7280" stroke-width="1.3" stroke-linecap="round"/></svg>`;
      const cap = bottle.querySelector('.nycap');
      anim(cap, fr(t => ({ opacity: t < NY_MID ? 1 : 0 })));
      for (let i = 0; i < 9; i++) { // bubbles rising inside the glass
        const sz = Wb * rand(.07, .13), ph = rand(0, 1), spd = rand(.9, 1.7), lx = Wb * rand(.2, .75);
        const b = document.createElement('div'); b.style.cssText = `position:absolute;left:${lx}px;top:${Hb * .98}px;width:${sz}px;height:${sz}px;border-radius:50%;background:rgba(255,255,255,.8)`;
        bottle.appendChild(b);
        anim(b, fr(t => { const u = (t * spd + ph) % 1; return { opacity: sm(.1, .25, t) * (t < NY_MID ? 1 : 0) * Math.min(1, u * 8) * (1 - u * .6), transform: `translateY(${(-u * Hb * .5).toFixed(1)}px)` }; }));
      }
      const foam = document.createElement('div'); // foam running down the neck
      foam.style.cssText = `position:absolute;left:${Wb * .3}px;top:0;width:${Wb * .4}px;height:${Hb * .36}px;border-radius:0 0 ${Wb * .3}px ${Wb * .3}px;transform-origin:50% 0;background:linear-gradient(180deg,#fff,#fff7d6 60%,rgba(255,247,214,.5));box-shadow:0 0 ${H * .03}px rgba(255,255,255,.9)`;
      bottle.appendChild(foam);
      anim(foam, fr(t => ({ opacity: t < NY_MID ? 0 : 1 - sm(1.35, 1.8, t), transform: `scaleY(${(.15 + .85 * out(sm(NY_MID, NY_MID + .5, t))).toFixed(3)}) scaleX(${(1 + .35 * Math.sin(clamp((t - NY_MID) / .5) * Math.PI)).toFixed(3)})` })));
      anim(bottle, fr(t => {
        const pop = out(clamp(t / .15)), g = sm(.2, NY_MID, t), tk = NY_TICKS.reduce((m, a) => Math.max(m, t >= a ? Math.max(0, 1 - (t - a) / .1) : 0), 0), kick = t >= NY_MID ? Math.exp(-(t - NY_MID) * 9) : 0;
        const sh = Math.sin(t * 95) * (.4 + 3.2 * g), sx = Math.sin(t * 83) * H * .012 * g;
        return { opacity: sm(0, .06, t) * (1 - sm(1.55, 1.95, t)), transform: `translate(${(sx + H * .06 * kick).toFixed(1)}px,${(H * .05 * kick + H * .15 * (1 - pop)).toFixed(1)}px) rotate(${(-24 + sh - 5 * kick).toFixed(2)}deg) scale(${((.5 + .5 * pop) * (1 + .05 * tk)).toFixed(3)})` };
      }));
      // Midnight: the cork flies, the card bursts, champagne gushes, confetti, streamers and starbursts.
      pfxFly(st, kit, { x: mouthX, y: mouthY, w: H * .1, h: H * .14, t0: NY_MID, vx: Math.cos(dir) * H * 2.0, vy: Math.sin(dir) * H * 2.0, g: H * 3.4, spin: 9, floor: H * .55, bounce: .45, fade0: 1.6, z: 7,
        html: `<svg viewBox="0 0 20 26" width="100%" height="100%"><path d="M4 2h12l-2 20H6Z" fill="#b45309"/><path d="M4 2h12" stroke="#fde68a" stroke-width="2"/><path d="M7 8h6M7 13h6M7 18h6" stroke="#78350f" stroke-width="1"/></svg>` });
      pfxShatter(st, kit, { t0: NY_MID, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .85, edge: '#fff7d6', tint: i => `linear-gradient(135deg,${i % 2 ? 'rgba(250,204,21,.6)' : 'rgba(255,247,214,.5)'},rgba(250,204,21,.3))` });
      for (let i = 0; i < 120; i++) { // the champagne stream: a thick arc of amber drops, strong at first and slowing as the bottle empties
        const u = i / 120, a = dir + rand(-.06, .06) * (1 + 2 * u), sp = H * (2.6 - 1.1 * u) * rand(.97, 1.03), c = ['#fde68a', '#facc15', '#fff3b0', '#f5c542'][i % 4], w = H * rand(.045, .085);
        pfxFly(st, kit, { x: mouthX, y: mouthY, w, h: w * 1.6, rot: a + Math.PI / 2, t0: NY_MID + u * .85, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: H * 3.3, floor: H * .9, bounce: .08, fade0: 1.45 + u * .35 + rand(0, .1), z: 6,
          css: `border-radius:50% 50% 50% 50%/65% 65% 35% 35%;background:radial-gradient(circle at 35% 30%,#fff,${c} 50%,#d99a0b);box-shadow:0 0 ${H * .025}px rgba(250,204,21,.85)` });
      }
      for (let i = 0; i < 14; i++) { // foam clots
        const a = dir + rand(-.5, .5), sp = H * rand(.7, 1.5), w = H * rand(.09, .19);
        pfxFly(st, kit, { x: mouthX, y: mouthY, w, t0: NY_MID + rand(0, .45), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: H * 1.5, floor: H * .7, bounce: .05, fade0: 1.0 + rand(0, .45), z: 6,
          css: `border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,rgba(255,247,214,.85) 55%,rgba(255,247,214,0));box-shadow:0 0 ${H * .04}px rgba(255,255,255,.6)` });
      }
      for (let i = 0; i < 40; i++) { // bubbles float up and away
        const a = dir + rand(-.7, .7), sp = H * rand(.3, 1.1), w = H * rand(.03, .1);
        pfxFly(st, kit, { x: mouthX + rand(-.15, .15) * H, y: mouthY, w, t0: NY_MID + rand(0, .75), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: -H * .3, fade0: 1.25 + rand(0, .5), z: 8,
          css: `border-radius:50%;border:${Math.max(1.5, w * .08)}px solid rgba(255,255,255,.85);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.65),rgba(186,230,253,.12) 60%,rgba(255,255,255,0))` });
      }
      for (let i = 0; i < 26; i++) {
        const a = rand(0, Math.PI * 2), sp = H * rand(.6, 1.7), c = ['#facc15', '#f9a8d4', '#fff', '#93c5fd', '#fde68a', '#c4b5fd'][i % 6];
        pfxFly(st, kit, { x: cx, y: cy, w: H * .05, h: H * .09, t0: NY_MID + .02 + rand(0, .1), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .7 - H * .5, g: H * 1.5, spin: rand(-8, 8), flutter: rand(9, 16), floor: H * .66, bounce: .04, fade0: 1.5 + rand(0, .35), css: `background:${c}` });
      }
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i - 1) * .55 + .35, L = H * rand(.7, 1.0), el = add(`left:${cx}px;top:${cy}px;width:${L}px;height:${H * .3}px;z-index:5;transform-origin:0 50%`);
        el.innerHTML = `<svg viewBox="0 0 100 30" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible"><path d="M0 15c10-14 20 14 30 0s20 14 30 0 20 14 30 0 7 4 10 0" pathLength="1" stroke-dasharray="1" fill="none" stroke="${['#f9a8d4', '#fde68a', '#93c5fd', '#fff', '#c4b5fd'][i]}" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
        const p = el.querySelector('path');
        anim(p, fr(t => ({ strokeDashoffset: 1 - out(sm(NY_MID + .02, NY_MID + .5, t)) })));
        anim(el, fr(t => ({ opacity: t > NY_MID ? 1 - sm(1.3, 1.7, t) : 0, transform: `rotate(${a.toFixed(3)}rad) translateY(${(H * 1.0 * sm(NY_MID + .5, 1.7, t) * sm(NY_MID + .5, 1.7, t)).toFixed(1)}px)` })));
      }
      [[NY_MID + .04, 0, -.18, 20], [NY_MID + .22, -.55, -.05, 14], [NY_MID + .36, .6, -.1, 14]].forEach(([t0, dx, dy, n]) => pfxBurst(st, kit, { x: cx + dx * W, y: cy + dy * H, t0, n, len: H * .13, dist: H * (n > 16 ? .7 : .5), life: .55, cols: GOLD, w: 2.6 }));
      end(lastAnim);
    }


    // ---- Valentine, Summer, Christmas, Lunar New Year, Ramadan (v410), rebuilt on procBurnStage like Diwali / Easter /
    // New Year: the real card is part of the story and is consumed, one 2s clock, low effects. Sounds in BURN_SOUNDS.
    function pfxBase(host, x, y, glow) {
      const st = procBurnStage(host, x, y, PFX_MS), kit = pfxKit(st), { H, cx, cy } = st;
      const g = kit.add(`left:${cx - H * 1.2}px;top:${cy - H * 1.2}px;width:${H * 2.4}px;height:${H * 2.4}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,${glow[0]},${glow[1]} 55%,transparent)`);
      st.lastAnim = st.anim(g, kit.fr(t => ({ opacity: kit.sm(0, .6, t) * (1 - kit.sm(1.4, 1.95, t)) })));
      return { st, kit };
    }
    // The real card, tinting and shaking harder until t0, then gone (the shards take over).
    function pfxCard(st, kit, t0, o) {
      const { W, H, cx, cy, radius, anim, face } = st, { sm, fr, add } = kit, shake = o.shake || .012;
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      box.appendChild(face());
      if (o.tint) { const ov = document.createElement('div'); ov.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:${o.tint}`; box.appendChild(ov); anim(ov, fr(t => ({ opacity: sm(0, t0, t) }))); }
      anim(box, fr(t => { const g = sm(.2, t0, t); return { opacity: t < t0 ? 1 : 0, transform: `translate(${(Math.sin(t * 80) * H * shake * g).toFixed(2)}px,${(Math.cos(t * 67) * H * shake * .8 * g).toFixed(2)}px) scale(${(1 + .06 * g).toFixed(3)})`, filter: `brightness(${(1 + .3 * g).toFixed(2)}) drop-shadow(0 0 ${(H * .08 * g).toFixed(1)}px ${o.glow || '#fff'})` }; }));
      return box;
    }
    const PFX_HEART = '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 21C5 15 2 11 2 7.5A5 5 0 0 1 12 6a5 5 0 0 1 10 1.5C22 11 19 15 12 21Z" fill="CLR" stroke="rgba(255,255,255,.55)" stroke-width="1"/><ellipse cx="8" cy="8" rx="2.2" ry="1.4" fill="#fff" opacity=".6" transform="rotate(-30 8 8)"/></svg>';
    const pfxHeart = c => PFX_HEART.replace('CLR', c);
    const pfxDrop = c => `border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,${c} 55%);box-shadow:0 0 6px ${c}88`;

    // Valentine: hearts drift up round the card, a cupid's arrow flies in and strikes it at .42s, the card throbs pink
    // and bursts at .5s into shards, a big heart pulse, hearts and rose petals.
    function bfxValentine(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(244,114,182,.55)', 'rgba(225,29,72,.18)']), { W, H, cx, cy, anim, end } = st, { rand, out, sm, fr, add, clamp } = kit, HIT = .42, BURST = .5;
      pfxCard(st, kit, BURST, { tint: 'linear-gradient(160deg,rgba(251,113,133,.5),rgba(190,18,60,.35))', glow: '#fb7185' });
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2, s = H * rand(.14, .22), el = add(`left:${cx + Math.cos(a) * W * .75 - s / 2}px;top:${cy + Math.sin(a) * H * .55 - s / 2}px;width:${s}px;height:${s}px;z-index:5`, pfxHeart(['#fb7185', '#f43f5e', '#fda4af'][i % 3])), t0 = .02 + i * .045, ph = rand(0, 6);
        anim(el, fr(t => ({ opacity: clamp((t - t0) / .08) * (1 - sm(HIT, BURST + .05, t)), transform: `translate(${(Math.sin(t * 9 + ph) * H * .04).toFixed(1)}px,${(-H * .22 * sm(t0, HIT, t)).toFixed(1)}px) scale(${(.4 + .6 * out(clamp((t - t0) / .15)) + .08 * Math.sin(t * 20 + ph)).toFixed(3)})` })));
      }
      const L = H * 1.15, arrow = add(`left:${cx - L}px;top:${cy - H * .045}px;width:${L}px;height:${H * .09}px;z-index:6;transform-origin:100% 50%`);
      arrow.innerHTML = '<svg viewBox="0 0 120 12" preserveAspectRatio="none" width="100%" height="100%"><path d="M0 6H108" stroke="#92400e" stroke-width="2.4" stroke-linecap="round"/><path d="M106 0 120 6 106 12Z" fill="#fbbf24" stroke="#92400e" stroke-width=".8"/><path d="M2 6 12 0H22L14 6 22 12H12Z" fill="#fb7185"/></svg>';
      anim(arrow, fr(t => { const p = out(clamp(t / HIT)), v = t > HIT ? Math.sin((t - HIT) * 90) * H * .012 * (1 - clamp((t - HIT) / .12)) : 0; return { opacity: sm(.0, .03, t) * (1 - sm(BURST + .05, BURST + .3, t)), transform: `translate(${(-(1 - p) * W * 2.6 + v).toFixed(1)}px,${(-(1 - p) * H * .18).toFixed(1)}px) rotate(${(-6 * (1 - p)).toFixed(2)}deg)` }; }));
      const big = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;z-index:2;filter:drop-shadow(0 0 ${H * .1}px rgba(244,63,94,.9))`, pfxHeart('#f43f5e'));
      anim(big, fr(t => { const p = clamp((t - BURST) / .5); return { opacity: p > 0 && p < 1 ? (1 - sm(.35, 1, p)) * .95 : 0, transform: `scale(${(.3 + 1.2 * out(p)).toFixed(3)})` }; }));
      pfxShatter(st, kit, { t0: BURST, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .85, edge: '#fecdd3', tint: i => `linear-gradient(135deg,${i % 2 ? 'rgba(251,113,133,.6)' : 'rgba(255,228,230,.5)'},rgba(190,18,60,.35))` });
      pfxBurst(st, kit, { x: cx, y: cy, t0: BURST, n: 18, len: H * .12, dist: H * .8, life: .6, cols: ['#fb7185', '#fda4af', '#fff', '#f43f5e'], w: 2.6 });
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + rand(-1.2, 1.2), sp = H * rand(.9, 1.7); pfxFly(st, kit, { x: cx, y: cy, w: H * rand(.1, .17), t0: BURST + rand(0, .1), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: H * 2.6, spin: rand(-4, 4), floor: H * .62, bounce: .25, fade0: 1.45 + rand(0, .35), html: pfxHeart(['#fb7185', '#f43f5e', '#fda4af', '#e11d48'][i % 4]) }); }
      for (let i = 0; i < 14; i++) pfxFly(st, kit, { x: cx + rand(-.5, .5) * W, y: cy - H * rand(.1, .5), w: H * .09, h: H * .13, t0: BURST + .08 + rand(0, .35), vx: rand(-.4, .4) * H, vy: -H * rand(.1, .5), g: H * .9, spin: rand(-4, 4), flutter: rand(6, 11), floor: H * .62, bounce: .04, fade0: 1.55 + rand(0, .3), css: 'border-radius:60% 40% 60% 40%;background:radial-gradient(circle at 40% 30%,#fb7185,#9f1239)' });
      end(st.lastAnim);
    }

    // Summer: a rotating sun heats the card (it bleaches and shimmers), at .62s it pops in a splash: aqua shards, water
    // droplets, ripples on the floor and a beach ball bouncing out.
    const SUM_POP = .62;
    function bfxSummer(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(253,224,71,.5)', 'rgba(56,189,248,.18)']), { W, H, cx, cy, anim, end } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, SUM_POP, { tint: 'linear-gradient(160deg,rgba(253,224,71,.5),rgba(251,146,60,.35))', glow: '#fde047', shake: .008 });
      const sun = add(`left:${cx - H * 1.2}px;top:${cy - H * 1.2}px;width:${H * 2.4}px;height:${H * 2.4}px;border-radius:50%;z-index:1;background:repeating-conic-gradient(from 0deg,rgba(253,224,71,.5) 0 5deg,transparent 5deg 30deg);-webkit-mask-image:radial-gradient(closest-side,transparent 18%,#000 30%,transparent 100%);mask-image:radial-gradient(closest-side,transparent 18%,#000 30%,transparent 100%)`);
      anim(sun, fr(t => ({ opacity: sm(0, .35, t) * (1 - sm(SUM_POP, SUM_POP + .5, t)), transform: `rotate(${(t * 60).toFixed(1)}deg) scale(${(.8 + .4 * sm(0, SUM_POP, t)).toFixed(3)})` })));
      [0, 1].forEach(i => { const r = add(`left:${cx - H * .9}px;top:${cy + H * .35}px;width:${H * 1.8}px;height:${H * .5}px;border-radius:50%;z-index:1;border:${Math.max(2, H * .03)}px solid rgba(125,211,252,.85);box-shadow:0 0 ${H * .08}px rgba(56,189,248,.7)`);
        anim(r, fr(t => { const p = clamp((t - SUM_POP - i * .15) / .7); return { opacity: p > 0 && p < 1 ? (1 - p) * .9 : 0, transform: `scale(${(.2 + 1.1 * out(p)).toFixed(3)})` }; })); });
      pfxShatter(st, kit, { t0: SUM_POP, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .85, edge: '#bae6fd', tint: i => `linear-gradient(135deg,${i % 2 ? 'rgba(56,189,248,.55)' : 'rgba(224,242,254,.5)'},rgba(14,165,233,.35))` });
      pfxBurst(st, kit, { x: cx, y: cy, t0: SUM_POP, n: 14, len: H * .12, dist: H * .7, life: .55, cols: ['#fde047', '#7dd3fc', '#fff', '#fb923c'], w: 2.6 });
      for (let i = 0; i < 30; i++) { const a = -Math.PI / 2 + rand(-1.3, 1.3), sp = H * rand(.8, 1.8), c = ['#38bdf8', '#7dd3fc', '#bae6fd'][i % 3]; pfxFly(st, kit, { x: cx, y: cy, w: H * rand(.04, .09), t0: SUM_POP + rand(0, .1), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: H * 3, floor: H * .66, bounce: .12, fade0: 1.3 + rand(0, .4), css: pfxDrop(c) }); }
      const ball = '<svg viewBox="0 0 40 40" width="100%" height="100%"><defs><clipPath id="pbb"><circle cx="20" cy="20" r="18"/></clipPath></defs><g clip-path="url(#pbb)"><rect width="40" height="40" fill="#fff"/><path d="M20 20 20 0 36 6Z" fill="#ef4444"/><path d="M20 20 40 20 36 34Z" fill="#facc15"/><path d="M20 20 20 40 4 34Z" fill="#3b82f6"/><path d="M20 20 0 20 4 6Z" fill="#22c55e"/><path d="M20 20 36 6 40 20Z" fill="#fff"/></g><circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/><ellipse cx="13" cy="11" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-35 13 11)"/></svg>';
      pfxFly(st, kit, { x: cx, y: cy, w: H * .32, t0: SUM_POP + .02, vx: H * .55, vy: -H * 1.45, g: H * 3.4, spin: 6, floor: H * .5, bounce: .6, fade0: 1.65, html: ball });
      end(st.lastAnim);
    }

    // Christmas: red and gold ribbons wrap the card (.05-.45s) and a bow pops on, it rattles, then bursts at .62s into
    // red and green shards with ribbon streamers, baubles, a star glint and falling snow.
    const XM_OPEN = .62;
    function bfxChristmas(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(250,204,21,.4)', 'rgba(22,163,74,.22)']), { W, H, cx, cy, anim, end, radius } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, XM_OPEN, { tint: 'linear-gradient(160deg,rgba(22,163,74,.55),rgba(21,128,61,.4))', glow: '#facc15', shake: .014 });
      const band = (css, from, to, grow) => { const el = add(`${css};z-index:4;background:linear-gradient(90deg,#b91c1c,#ef4444 40%,#b91c1c);box-shadow:inset 0 0 0 1px rgba(253,224,71,.6)`); anim(el, fr(t => ({ opacity: t < XM_OPEN ? 1 : 0, transform: grow(clamp((t - from) / (to - from))) }))); return el; };
      band(`left:${cx - W * .1}px;top:${cy - H / 2}px;width:${W * .2}px;height:${H}px;transform-origin:50% 0`, .05, .3, p => `scaleY(${out(p).toFixed(3)})`);
      const hb = band(`left:${cx - W / 2}px;top:${cy - H * .08}px;width:${W}px;height:${H * .16}px;transform-origin:0 50%`, .2, .45, p => `scaleX(${out(p).toFixed(3)})`);
      hb.style.background = 'linear-gradient(180deg,#b91c1c,#ef4444 40%,#b91c1c)';
      const bow = add(`left:${cx - H * .22}px;top:${cy - H * .2}px;width:${H * .44}px;height:${H * .34}px;z-index:6`, '<svg viewBox="0 0 44 34" width="100%" height="100%"><path d="M22 20C12 4 2 6 4 14s14 6 18 6ZM22 20c10-16 20-14 18-6s-14 6-18 6Z" fill="#dc2626" stroke="#fde047" stroke-width="1.4"/><path d="M22 20 14 33M22 20 30 33" stroke="#dc2626" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="20" r="4.2" fill="#fde047" stroke="#ca8a04"/></svg>');
      anim(bow, fr(t => { const p = out(clamp((t - .4) / .12)); return { opacity: t > .4 && t < XM_OPEN ? 1 : 0, transform: `scale(${(p * (1 + .12 * Math.sin(clamp((t - .4) / .22) * Math.PI))).toFixed(3)}) rotate(${(Math.sin(t * 60) * 3 * sm(.45, XM_OPEN, t)).toFixed(2)}deg)` }; }));
      pfxShatter(st, kit, { t0: XM_OPEN, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .85, edge: '#fde68a', tint: i => i % 2 ? 'linear-gradient(135deg,rgba(239,68,68,.65),rgba(153,27,27,.4))' : 'linear-gradient(135deg,rgba(34,197,94,.6),rgba(21,128,61,.4))' });
      pfxBurst(st, kit, { x: cx, y: cy, t0: XM_OPEN, n: 16, len: H * .13, dist: H * .8, life: .6, cols: ['#fde047', '#fff', '#ef4444', '#4ade80'], w: 2.6 });
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * .42, L = H * rand(.7, 1), el = add(`left:${cx}px;top:${cy}px;width:${L}px;height:${H * .3}px;z-index:5;transform-origin:0 50%`);
        el.innerHTML = `<svg viewBox="0 0 100 30" preserveAspectRatio="none" width="100%" height="100%" style="overflow:visible"><path d="M0 15c10-14 20 14 30 0s20 14 30 0 20 14 30 0 7 4 10 0" pathLength="1" stroke-dasharray="1" fill="none" stroke="${['#ef4444', '#fde047', '#22c55e', '#fff', '#ef4444'][i]}" stroke-width="3.2" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
        anim(el.querySelector('path'), fr(t => ({ strokeDashoffset: 1 - out(sm(XM_OPEN + .02, XM_OPEN + .5, t)) })));
        anim(el, fr(t => ({ opacity: t > XM_OPEN ? 1 - sm(1.3, 1.7, t) : 0, transform: `rotate(${a.toFixed(3)}rad) translateY(${(H * .9 * Math.pow(sm(XM_OPEN + .5, 1.7, t), 2)).toFixed(1)}px)` })));
      }
      for (let i = 0; i < 6; i++) { const c = ['#dc2626', '#fbbf24', '#2563eb', '#16a34a'][i % 4], dir = i % 2 ? 1 : -1; pfxFly(st, kit, { x: cx, y: cy - H * .05, w: H * .15, h: H * .19, t0: XM_OPEN + .03 + i * .03, vx: dir * H * rand(.4, 1.2), vy: -H * rand(1.1, 1.5), g: H * 3.4, spin: dir * rand(2, 6), floor: H * rand(.5, .72), bounce: .4, fade0: 1.6 + rand(0, .25), html: `<svg viewBox="0 0 24 30" width="100%" height="100%"><rect x="9" y="1" width="6" height="4" rx="1" fill="#fbbf24"/><circle cx="12" cy="18" r="10.5" fill="${c}"/><path d="M3 18Q12 22 21 18" stroke="rgba(255,255,255,.55)" stroke-width="1.6" fill="none"/><ellipse cx="8" cy="13" rx="3" ry="2" fill="#fff" opacity=".6" transform="rotate(-30 8 13)"/></svg>` }); }
      for (let i = 0; i < 24; i++) pfxFly(st, kit, { x: cx + rand(-.9, .9) * W, y: cy - H * rand(.2, .6), w: H * rand(.07, .12), t0: XM_OPEN + rand(0, .6), vx: rand(-.25, .25) * H, vy: rand(-.05, .15) * H, g: H * .55, spin: rand(-2, 2), flutter: rand(5, 9), floor: H * .66, bounce: .02, fade0: 1.6 + rand(0, .3), html: '<svg viewBox="0 0 20 20" width="100%" height="100%"><path d="M10 0V20M0 10H20M3 3 17 17M17 3 3 17" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>' });
      end(st.lastAnim);
    }

    // Lunar New Year: a string of eight firecrackers hangs across the card and pops one by one (.12-.61s, each with a
    // flash and paper bits), the card throbs red and bursts at .74s into red and gold shards, gold coins and sparks.
    const LUN_BOOM = .74, LUN_POPS = Array.from({ length: 8 }, (_, i) => .12 + i * .07);
    function bfxLunar(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(239,68,68,.5)', 'rgba(250,204,21,.2)']), { W, H, cx, cy, anim, end } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, LUN_BOOM, { tint: 'linear-gradient(160deg,rgba(220,38,38,.55),rgba(153,27,27,.4))', glow: '#ef4444', shake: .012 });
      const x0 = cx - W * .62, y0 = cy - H * .62, x1 = cx + W * .62, y1 = cy + H * .62;
      const cord = add(`left:0;top:0;width:100%;height:100%;z-index:4`, `<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible"><path d="M${x0} ${y0 - H * .1}L${x1} ${y1 + H * .1}" stroke="#fbbf24" stroke-width="${Math.max(1.5, H * .015)}"/></svg>`);
      anim(cord, fr(t => ({ opacity: sm(0, .06, t) * (1 - sm(LUN_POPS[7], LUN_POPS[7] + .06, t)) })));
      LUN_POPS.forEach((pt, i) => {
        const u = i / 7, px = x0 + (x1 - x0) * u, py = y0 + (y1 - y0) * u, w = H * .09, h = H * .2, s0 = .03 + i * .012;
        const el = add(`left:${px - w / 2}px;top:${py - h * .1}px;width:${w}px;height:${h}px;z-index:5;transform-origin:50% 0`, '<svg viewBox="0 0 12 26" width="100%" height="100%"><rect x="1" y="3" width="10" height="21" rx="2" fill="#dc2626"/><rect x="1" y="9" width="10" height="3" fill="#fbbf24"/><rect x="1" y="17" width="10" height="3" fill="#fbbf24"/><path d="M6 3V0" stroke="#fbbf24" stroke-width="1.2"/></svg>');
        anim(el, fr(t => ({ opacity: clamp((t - s0) / .05) * (t < pt ? 1 : 0), transform: `rotate(${(Math.sin(t * 40 + i) * 4 + (t > pt - .05 ? Math.sin(t * 200) * 6 : 0)).toFixed(1)}deg) scale(${(.4 + .6 * out(clamp((t - s0) / .08))).toFixed(3)})` })));
        const fl = add(`left:${px - H * .2}px;top:${py - H * .2}px;width:${H * .4}px;height:${H * .4}px;border-radius:50%;z-index:6;background:radial-gradient(circle,#fff,rgba(253,224,71,.85) 35%,rgba(239,68,68,.4) 60%,transparent 72%)`);
        anim(fl, fr(t => { const p = clamp((t - pt) / .16); return { opacity: p > 0 && p < 1 ? 1 - p : 0, transform: `scale(${(.3 + 1.1 * out(p)).toFixed(3)})` }; }));
        for (let j = 0; j < 6; j++) { const a = rand(0, Math.PI * 2), sp = H * rand(.5, 1.1); pfxFly(st, kit, { x: px, y: py, w: H * .035, h: H * .05, t0: pt, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - H * .3, g: H * 2.4, spin: rand(-9, 9), floor: H * .66 - (py - cy), bounce: .1, fade0: 1.2 + rand(0, .5), css: `background:${j % 3 ? '#dc2626' : '#fbbf24'}` }); }
      });
      pfxShatter(st, kit, { t0: LUN_BOOM, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .9, edge: '#fde047', tint: i => i % 2 ? 'linear-gradient(135deg,rgba(220,38,38,.65),rgba(127,29,29,.4))' : 'linear-gradient(135deg,rgba(250,204,21,.6),rgba(217,119,6,.4))' });
      pfxBurst(st, kit, { x: cx, y: cy, t0: LUN_BOOM, n: 20, len: H * .14, dist: H * .85, life: .6, cols: ['#fbbf24', '#ef4444', '#fff', '#fde047'], w: 2.8 });
      for (let i = 0; i < 9; i++) { const dir = i % 2 ? 1 : -1; pfxFly(st, kit, { x: cx, y: cy, w: H * .14, t0: LUN_BOOM + .02 + i * .02, vx: dir * H * rand(.3, 1.2), vy: -H * rand(.9, 1.4), g: H * 3.4, spin: dir * rand(3, 8), flutter: rand(10, 16), floor: H * rand(.5, .7), bounce: .42, fade0: 1.65 + rand(0, .25), html: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="12" cy="12" r="11" fill="#fbbf24" stroke="#b45309" stroke-width="1.4"/><rect x="8.5" y="8.5" width="7" height="7" fill="#92400e" opacity=".85"/><ellipse cx="8" cy="7" rx="3" ry="1.6" fill="#fff" opacity=".6" transform="rotate(-30 8 7)"/></svg>' }); }
      end(st.lastAnim);
    }

    // Ramadan: three lanterns glow and sway beside the card, it turns gold and at .6s dissolves into shards and rising
    // stardust while a crescent moon and star bloom behind it with soft rays.
    const RAM_BURST = .6;
    function bfxRamadan(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(250,204,21,.45)', 'rgba(67,56,202,.28)']), { W, H, cx, cy, anim, end } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, RAM_BURST, { tint: 'linear-gradient(160deg,rgba(250,204,21,.5),rgba(180,83,9,.35))', glow: '#fde68a', shake: .006 });
      const lantern = '<svg viewBox="0 0 40 70" width="100%" height="100%" style="overflow:visible"><path d="M20 0V10" stroke="#ca8a04" stroke-width="2"/><path d="M12 14h16l4 6H8Z" fill="#d4a017"/><path d="M8 20c-3 12-2 24 4 34h16c6-10 7-22 4-34Z" fill="#fbbf24" opacity=".92"/><path d="M8 20c-3 12-2 24 4 34h16c6-10 7-22 4-34Z" fill="none" stroke="#b45309" stroke-width="1.6"/><path d="M20 20V54M14 20c-2 12-1 24 1 34M26 20c2 12 1 24-1 34" stroke="#b45309" stroke-width="1" fill="none"/><path d="M12 54h16l-2 6H14Z" fill="#d4a017"/><ellipse cx="20" cy="36" rx="5" ry="9" fill="#fff7d6" opacity=".7"/></svg>';
      [[-.95, -.62, .2], [.95, -.62, .24], [0, -.8, .28]].forEach(([dx, dy, d], i) => {
        const w = H * .22, el = add(`left:${cx + dx * W - w / 2}px;top:${cy + dy * H}px;width:${w}px;height:${w * 1.75}px;z-index:5;transform-origin:50% 0;filter:drop-shadow(0 0 ${H * .1}px rgba(251,191,36,.85))`, lantern), s0 = .04 + i * .05;
        anim(el, fr(t => ({ opacity: clamp((t - s0) / .1) * (1 - sm(1.35, 1.7, t)), transform: `rotate(${(Math.sin(t * 6 + i * 2) * 7 * (1 + sm(RAM_BURST, 1, t))).toFixed(2)}deg) translateY(${(-H * .25 * (1 - out(clamp((t - s0) / .25)))).toFixed(1)}px) scale(${(.6 + .4 * out(clamp((t - s0) / .2))).toFixed(3)})` })));
      });
      const moon = add(`left:${cx - H * .55}px;top:${cy - H * .55}px;width:${H * 1.1}px;height:${H * 1.1}px;z-index:2;filter:drop-shadow(0 0 ${H * .12}px rgba(253,224,71,.9))`, '<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><radialGradient id="prm" cx=".35" cy=".35"><stop offset="0" stop-color="#fffbeb"/><stop offset="1" stop-color="#f59e0b"/></radialGradient></defs><path d="M62 10A42 42 0 1 0 62 90 34 34 0 1 1 62 10Z" fill="url(#prm)"/><path d="M78 30 81.4 41 92 43 82 50 85 61 78 53 69 61 72 50 64 43 74 41Z" fill="#fde68a" stroke="#fff7d6" stroke-width=".8"/></svg>');
      anim(moon, fr(t => { const p = out(clamp((t - RAM_BURST) / .45)); return { opacity: p * (1 - sm(1.5, 1.9, t)), transform: `scale(${(.3 + .7 * p).toFixed(3)}) rotate(${(-12 + 12 * p).toFixed(2)}deg)` }; }));
      const rays = add(`left:${cx - H * 1.1}px;top:${cy - H * 1.1}px;width:${H * 2.2}px;height:${H * 2.2}px;border-radius:50%;z-index:1;background:repeating-conic-gradient(from 0deg,rgba(253,230,138,.3) 0 4deg,transparent 4deg 20deg);-webkit-mask-image:radial-gradient(closest-side,transparent 25%,#000 40%,transparent 100%);mask-image:radial-gradient(closest-side,transparent 25%,#000 40%,transparent 100%)`);
      anim(rays, fr(t => { const p = clamp((t - RAM_BURST) / .4); return { opacity: p * (1 - sm(1.4, 1.9, t)) * .9, transform: `rotate(${(t * 14).toFixed(1)}deg)` }; }));
      pfxShatter(st, kit, { t0: RAM_BURST, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: .8, edge: '#fde68a', tint: () => 'linear-gradient(135deg,rgba(253,224,71,.6),rgba(180,83,9,.4))' });
      pfxBurst(st, kit, { x: cx, y: cy, t0: RAM_BURST, n: 16, len: H * .12, dist: H * .75, life: .6, cols: ['#fde68a', '#fff', '#fbbf24', '#c7d2fe'], w: 2.4 });
      for (let i = 0; i < 30; i++) pfxFly(st, kit, { x: cx + rand(-.6, .6) * W, y: cy + rand(-.3, .4) * H, w: H * rand(.05, .1), t0: RAM_BURST + rand(0, .5), vx: rand(-.2, .2) * H, vy: -H * rand(.25, .6), g: H * .5, spin: rand(-2, 2), fade0: 1.5 + rand(0, .4), html: pfxStar(i % 2 ? '#fde68a' : '#fff') });
      end(st.lastAnim);
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
        { transform: `translate3d(0,${-H * .1}px,0) rotate(-3deg)`, offset: .7, easing: 'ease-in-out' },
        { transform: `translate3d(0,${H * .02}px,0) rotate(2deg)`, offset: .8, easing: 'ease-in-out' },
        { transform: `translate3d(0,${-H * .06}px,0) rotate(-2deg)`, offset: .88, easing: 'cubic-bezier(.5,0,.75,.35)' },
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
      [40, 66, (c, l) => `<rect x="16.5" y="30" width="7" height="35" rx="3.5" fill="#f8fafc"/><rect x="16.5" y="30" width="2.6" height="35" rx="1.3" fill="#cbd5e1"/><rect x="21" y="32" width="1.4" height="31" rx=".7" fill="#fff"/>
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
        const ang = i % 2 ? -rand(.1, .62) : -Math.PI + rand(.1, .62), sp = H * rand(4.2, 8.6), t0 = waves[i % waves.length] + rand(0, .03);
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
        const depth = rand(-1, 1), ang = Math.random() < .5 ? -rand(.1, .7) : -Math.PI + rand(.1, .7), sp = H * rand(4, 9), t0 = POP + rand(0, .08), fadeAt = rand(1.1, 1.6);
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

    // Spark Snap (v424, procedural on the real card): sparks stream in from all round and are sucked into the card
    // (0-.42s) while it trembles, glows gold and brightens; at .42s it SNAPS: a white flash, a shock ring, a big
    // glint, light beams, then the card bursts into gold-edged shards and a spray of comet-tail sparks that arc,
    // bounce and fade, with embers drifting up. Sound: BURN_SOUNDS['burn-lvl-spark-snap'] (pull-in, snap at .42).
    const SS_SNAP = .42;
    function bfxSparkSnap(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out, D } = kit, dt = D / PFX_N, px = H / 100, vw = st.vw, vh = host.clientHeight || innerHeight;
      const glow = add(`left:${cx - H * 1.4}px;top:${cy - H * 1.4}px;width:${H * 2.8}px;height:${H * 2.8}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(253,224,71,.6),rgba(249,115,22,.2) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: (.35 * sm(0, SS_SNAP, t) + (t >= SS_SNAP ? .65 * (1 - sm(SS_SNAP, 1.5, t)) : 0)) * (1 - sm(1.5, 1.95, t)), transform: `scale(${(.5 + .6 * sm(0, SS_SNAP, t) + .5 * sm(SS_SNAP, 1.2, t)).toFixed(3)})` })));
      // the card: trembles harder, glows and brightens until the snap
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      const hot = document.createElement('div'); hot.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:linear-gradient(160deg,rgba(254,240,138,.6),rgba(251,146,60,.4))`;
      box.append(face(), hot);
      anim(box, fr(t => { const j = sm(.05, SS_SNAP, t); return { opacity: t < SS_SNAP ? 1 : 0, filter: `brightness(${(1 + .9 * j * j).toFixed(2)})`, boxShadow: `0 0 ${(H * .3 * j).toFixed(1)}px ${(H * .07 * j).toFixed(1)}px rgba(253,224,71,${(.85 * j).toFixed(2)})`,
        transform: `translate(${(Math.sin(t * 150) * H * .022 * j).toFixed(2)}px,${(Math.cos(t * 113) * H * .016 * j).toFixed(2)}px) scale(${(1 - .05 * j).toFixed(3)})` }; }));
      anim(hot, fr(t => ({ opacity: .8 * sm(.15, SS_SNAP, t) * (.7 + .3 * Math.sin(t * 120)) })));
      // sparks pulled in from a wide ring (each streaks toward the card, faster as it goes)
      for (let i = 0; i < 34; i++) {
        const a = rand(0, 6.3), r0 = H * rand(1.6, 3.6), t0 = rand(0, .22), t1 = SS_SNAP - rand(0, .05), L = H * rand(.18, .4), col = ['#fef08a', '#fde047', '#fb923c', '#fff'][i % 4];
        const el = add(`left:${cx}px;top:${cy}px;width:${L}px;height:${Math.max(2, px * 1.8)}px;border-radius:9px;z-index:5;transform-origin:100% 50%;background:linear-gradient(90deg,transparent,${col});box-shadow:0 0 ${px * 3}px ${col}`);
        anim(el, fr(t => { const p = clamp((t - t0) / (t1 - t0)); if (p <= 0 || p >= 1) return { opacity: 0, transform: 'none' }; const e = p * p * (3 - 2 * p) * .35 + p * p * .65, r = r0 * (1 - e) + H * .06;
          return { opacity: Math.min(1, p * 5) * (1 - sm(.85, 1, p)), transform: `translate(${(Math.cos(a) * r - L).toFixed(1)}px,${(Math.sin(a) * r).toFixed(1)}px) rotate(${(a * 57.3 + 180).toFixed(1)}deg) scaleX(${(.4 + .8 * p).toFixed(2)})`, transformOrigin: '100% 50%' }; }));
      }
      // the snap
      const flash = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:7;mix-blend-mode:screen;background:radial-gradient(circle at ${cx}px ${cy}px,#fff,rgba(254,240,138,.7) 30%,rgba(251,146,60,.25) 55%,transparent 80%)`);
      anim(flash, fr(t => ({ opacity: t < SS_SNAP ? 0 : (1 - sm(SS_SNAP, SS_SNAP + .22, t)) * .7 })));
      const glint = add(`left:${cx - H * 1.3}px;top:${cy - H * 1.3}px;width:${H * 2.6}px;height:${H * 2.6}px;z-index:8;mix-blend-mode:screen`, pfxStar('#fff7ae'));
      anim(glint, fr(t => { const p = clamp((t - SS_SNAP) / .38); return { opacity: p > 0 && p < 1 ? 1 - p * p : 0, transform: `scale(${(.2 + 1.1 * out(p)).toFixed(3)}) rotate(${(p * 50).toFixed(1)}deg)` }; }));
      for (let i = 0; i < 2; i++) {
        const ring = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;border-radius:50%;z-index:6;border:${Math.max(2, px * (3 - i))}px solid ${i ? '#fff' : '#fde047'};box-shadow:0 0 ${px * 6}px #f59e0b;box-sizing:border-box`);
        anim(ring, fr(t => { const p = clamp((t - SS_SNAP - i * .06) / .5); return { opacity: p > 0 && p < 1 ? .95 * (1 - p) : 0, transform: `scale(${(.2 + (3.4 - i) * out(p)).toFixed(3)})` }; }));
      }
      for (let i = 0; i < 14; i++) {      // beams of light
        const a = i / 14 * 6.283 + rand(-.1, .1), L = H * rand(1.8, 3.2), w = px * rand(1.5, 4);
        const el = add(`left:${cx}px;top:${cy - w / 2}px;width:${L}px;height:${w}px;z-index:5;transform-origin:0 50%;background:linear-gradient(90deg,#fff,rgba(253,224,71,.7) 35%,transparent);mix-blend-mode:screen`);
        anim(el, fr(t => { const p = clamp((t - SS_SNAP) / .38); return { opacity: p > 0 && p < 1 ? 1 - p : 0, transform: `rotate(${a.toFixed(3)}rad) scaleX(${(.2 + .8 * out(p)).toFixed(3)})` }; }));
      }
      pfxShatter(st, kit, { t0: SS_SNAP, ip: [W / 2, H / 2], cols: 5, rows: 7, speed: 1.3, edge: '#fde047', tint: () => `linear-gradient(${Math.round(rand(0, 360))}deg,rgba(120,53,15,.5),rgba(251,191,36,.3))` });
      for (let i = 0; i < 54; i++) {      // comet sparks, bouncing on the table
        const a = rand(0, 6.3), v = H * rand(1, 3.4), s = H * rand(.014, .034), floor = H * rand(.5, .9); let qx = 0, qy = 0, vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .6;
        const col = ['#fef08a', '#fb923c', '#fff'][i % 3], el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:6;border-radius:50%;background:${col};box-shadow:0 0 ${s * 3}px ${s}px ${col}`);
        anim(el, fr(t => { if (t < SS_SNAP) return { opacity: 0, transform: 'none' }; vy += H * 3.3 * dt; qx += vx * dt; qy += vy * dt; if (qy > floor && vy > 0) { qy = floor; vy *= -.35; vx *= .7; } return { opacity: 1 - sm(SS_SNAP + .35, SS_SNAP + 1.0, t), transform: `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px)` }; }));
      }
      for (let i = 0; i < 16; i++) {      // embers rising
        const s = H * rand(.02, .045), x0 = cx + rand(-.6, .6) * W, t0 = SS_SNAP + rand(0, .3), el = add(`left:${x0 - s / 2}px;top:${cy + H * .1}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fbbf24;box-shadow:0 0 ${s * 2}px #f97316`);
        anim(el, fr(t => { const u = clamp((t - t0) / 1.2); return { opacity: u > 0 && u < 1 ? (1 - u) * sm(0, .1, u) : 0, transform: `translate(${(Math.sin(t * 9 + i) * H * .1).toFixed(1)}px,${(-H * 1.3 * u).toFixed(1)}px)` }; }));
      }
      end(lastAnim);
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
    function bfxHellfireSpiral(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-hellfire-spiral', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-hellfire-spiral', host, x, y, k, calm);
    }
    // Royal Incineration (v424, procedural on the real card): a gold, ruby and emerald crown descends on rays of
    // light (.05-.6s) and lands with a gold flash and shock ring (.6s); the card, glowing and shaking, is lifted
    // to it and consumed in golden fire at .78s: gold-edged shards, tall gold flames, dust and embers. The crown
    // hovers, glints on its jewels, and fades at the end. Sound: BURN_SOUNDS['burn-lvl-royal-incineration'].
    const RI_LAND = .6, RI_BURN = .78, RI_PAL = ['#78350f', '#f59e0b', '#fef3c7'];
    function bfxRoyalIncineration(host, x, y, k) {
      const st = procBurnStage(host, x, y, PFX_MS), { W, H, cx, cy, radius, anim, end, face } = st;
      const kit = pfxKit(st), { rand, sm, fr, add, clamp, out, D } = kit, dt = D / PFX_N, px = H / 100, vw = st.vw, vh = host.clientHeight || innerHeight, id = ++pfxSeq;
      const glow = add(`left:${cx - H * 1.5}px;top:${cy - H * 1.5}px;width:${H * 3}px;height:${H * 3}px;border-radius:50%;z-index:0;background:radial-gradient(closest-side,rgba(251,191,36,.6),rgba(180,83,9,.2) 55%,transparent)`);
      const lastAnim = anim(glow, fr(t => ({ opacity: (.8 * sm(.2, RI_LAND, t)) * (1 - sm(1.4, 1.95, t)), transform: `scale(${(.6 + .5 * sm(.2, RI_LAND, t) + .3 * sm(RI_LAND, 1.4, t)).toFixed(3)})` })));
      const CW = H * 1.25, CH = CW * .72, crownY = cy - H * .95;
      const rays = add(`left:${cx - H * 2.2}px;top:${crownY - H * 2.2}px;width:${H * 4.4}px;height:${H * 4.4}px;border-radius:50%;z-index:1;background:repeating-conic-gradient(rgba(253,224,71,.42) 0 6deg,transparent 6deg 18deg);-webkit-mask-image:radial-gradient(circle,#000 18%,transparent 66%);mask-image:radial-gradient(circle,#000 18%,transparent 66%)`);
      anim(rays, fr(t => ({ opacity: sm(.15, RI_LAND, t) * (1 - sm(1.4, 1.9, t)) * .9, transform: `rotate(${(t * 40).toFixed(1)}deg) scale(${(.5 + .6 * sm(.15, 1, t)).toFixed(3)})` })));
      // the card, shaking in the light, lifted to the crown, consumed at RI_BURN
      const box = add(`left:${cx - W / 2}px;top:${cy - H / 2}px;width:${W}px;height:${H}px;z-index:3;border-radius:${radius}`);
      const gold = document.createElement('div'); gold.style.cssText = `position:absolute;inset:0;border-radius:${radius};background:linear-gradient(160deg,rgba(254,240,138,.55),rgba(217,119,6,.45))`;
      box.append(face(), gold);
      anim(box, fr(t => { const j = sm(RI_LAND, RI_BURN, t), lift = out(sm(RI_LAND, RI_BURN, t)); return { opacity: t < RI_BURN ? 1 : 0, filter: `brightness(${(1 + .6 * j).toFixed(2)})`, boxShadow: `0 0 ${(H * .3 * j).toFixed(1)}px ${(H * .07 * j).toFixed(1)}px rgba(251,191,36,${(.9 * j).toFixed(2)})`,
        transform: `translate(${(Math.sin(t * 120) * H * .02 * j).toFixed(2)}px,${(-H * .25 * lift + Math.cos(t * 97) * H * .012 * j).toFixed(2)}px) scale(${(1 + .08 * j).toFixed(3)})` }; }));
      anim(gold, fr(t => ({ opacity: .85 * sm(RI_LAND, RI_BURN, t) })));
      // the crown (SVG, shaded gold with jewels and pearls)
      const J = [['#dc2626', '#fecaca', 22, 18], ['#16a34a', '#bbf7d0', 50, 14], ['#2563eb', '#bfdbfe', 78, 18]];
      const crown = add(`left:${cx - CW / 2}px;top:${-CH}px;width:${CW}px;height:${CH}px;z-index:6;filter:drop-shadow(0 0 ${H * .12}px rgba(251,191,36,.9));transform-origin:50% 100%`,
        `<svg viewBox="0 0 100 72" width="100%" height="100%" style="overflow:visible"><defs><linearGradient id="rg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fef3c7"/><stop offset=".35" stop-color="#fbbf24"/><stop offset=".75" stop-color="#b45309"/><stop offset="1" stop-color="#78350f"/></linearGradient><linearGradient id="rv${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7f1d1d"/><stop offset="1" stop-color="#450a0a"/></linearGradient></defs>
        <path d="M8 62 4 22 28 40 50 8 72 40 96 22 92 62Z" fill="url(#rg${id})" stroke="#78350f" stroke-width="2" stroke-linejoin="round"/>
        <path d="M14 56 10 32 28 46 50 18 72 46 90 32 86 56Z" fill="url(#rv${id})" opacity=".55"/>
        <rect x="6" y="58" width="88" height="12" rx="3" fill="url(#rg${id})" stroke="#78350f" stroke-width="2"/>
        <path d="M10 62H90" stroke="#fff7d6" stroke-width="1.4" opacity=".8"/>
        ${[4, 50, 96].map((cxp, i) => `<circle cx="${cxp}" cy="${[22, 8, 22][i]}" r="4.4" fill="#fff7ed" stroke="#b45309" stroke-width="1.4"/>`).join('')}
        ${J.map(([c, hi, jx]) => `<g><circle cx="${jx}" cy="64" r="5" fill="${c}" stroke="#450a0a" stroke-width="1.2"/><circle cx="${jx - 1.5}" cy="62" r="1.8" fill="${hi}"/></g>`).join('')}
        <path d="M24 62V44M50 62V24M76 62V44" stroke="#78350f" stroke-width="1" opacity=".35"/></svg>`);
      anim(crown, fr(t => {
        const fall = out(sm(.05, RI_LAND, t)), y = (crownY - CH / 2) + (1 - fall) * -(crownY + CH), bob = t > RI_LAND ? Math.sin((t - RI_LAND) * 6) * H * .015 : 0, sq = t > RI_LAND ? Math.exp(-(t - RI_LAND) / .14) * Math.cos((t - RI_LAND) * 38) * .08 : 0;
        return { opacity: t < .05 ? 0 : 1 - sm(1.55, 1.95, t), transform: `translate(0,${(y + CH / 2 + bob).toFixed(1)}px) rotate(${((1 - fall) * -10).toFixed(2)}deg) scale(${(1 + sq).toFixed(3)},${(1 - sq).toFixed(3)})` };
      }));
      [[22, 64, .70], [50, 12, .82], [78, 64, .94], [4, 24, 1.06], [96, 24, 1.16]].forEach(([jx, jy, t0], i) => {
        const g = add(`left:${cx - CW / 2 + CW * jx / 100 - H * .11}px;top:${crownY - CH / 2 + CH * jy / 72 - H * .11}px;width:${H * .22}px;height:${H * .22}px;z-index:8;mix-blend-mode:screen`, pfxStar('#fff'));
        anim(g, fr(t => { const p = clamp((t - t0) / .32); return { opacity: p > 0 && p < 1 ? 1 - p * .5 : 0, transform: `scale(${(Math.sin(p * 3.14) * 1.4).toFixed(3)}) rotate(${(p * 90).toFixed(1)}deg)` }; }));
      });
      // landing: flash, rings
      const flash = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:7;mix-blend-mode:screen;background:radial-gradient(circle at ${cx}px ${cy - H * .4}px,#fff,rgba(253,224,71,.65) 28%,rgba(217,119,6,.2) 55%,transparent 80%)`);
      anim(flash, fr(t => ({ opacity: t < RI_LAND ? 0 : (1 - sm(RI_LAND, RI_LAND + .3, t)) * .8 + (t >= RI_BURN ? 0 : 0) })));
      const flash2 = add(`left:${cx - H * 1.4}px;top:${cy - H * 1.4}px;width:${H * 2.8}px;height:${H * 2.8}px;border-radius:50%;z-index:7;mix-blend-mode:screen;background:radial-gradient(closest-side,#fff,rgba(253,224,71,.8) 40%,transparent)`);
      anim(flash2, fr(t => ({ opacity: t < RI_BURN ? 0 : 1 - sm(RI_BURN, RI_BURN + .3, t), transform: `scale(${(.3 + 1.1 * out(sm(RI_BURN, RI_BURN + .3, t))).toFixed(3)})` })));
      [RI_LAND, RI_BURN].forEach((t0, i) => {
        const ring = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;border-radius:50%;z-index:6;border:${Math.max(2, px * 2.6)}px solid ${i ? '#fff7d6' : '#fbbf24'};box-shadow:0 0 ${px * 6}px #f59e0b;box-sizing:border-box`);
        anim(ring, fr(t => { const p = clamp((t - t0) / .55); return { opacity: p > 0 && p < 1 ? .95 * (1 - p) : 0, transform: `scale(${(.3 + 3 * out(p)).toFixed(3)})` }; }));
      });
      pfxShatter(st, kit, { t0: RI_BURN, ip: [W / 2, H * .45], cols: 5, rows: 7, speed: 1.2, edge: '#fde047', tint: () => `linear-gradient(${Math.round(rand(0, 360))}deg,rgba(120,53,15,.55),rgba(251,191,36,.35))` });
      for (let i = 0; i < 16; i++) {      // golden fire
        const fx = cx + (i / 15 - .5) * W * 1.7 + rand(-.05, .05) * W, w = H * rand(.3, .5), h = H * rand(.9, 1.6), t0 = RI_BURN - .04 + rand(0, .12);
        pfxFlameEl(st, kit, { x: fx, y: t => cy + H * (.5 + .1 * Math.sin(t * 8 + i)) - H * .4 * sm(t0, t0 + .3, t), w, h, t0, t1: 1.45 + rand(0, .2), z: i % 3 ? 4 : 2, pal: RI_PAL });
      }
      for (let i = 0; i < 46; i++) {      // gold dust
        const a = rand(0, 6.3), v = H * rand(.8, 2.8), s = H * rand(.012, .03), floor = H * rand(.5, .9); let qx = 0, qy = 0, vx = Math.cos(a) * v, vy = Math.sin(a) * v - H * .7;
        const col = ['#fde047', '#fff7d6', '#f59e0b'][i % 3], el = add(`left:${cx - s / 2}px;top:${cy - s / 2}px;width:${s}px;height:${s}px;z-index:6;border-radius:50%;background:${col};box-shadow:0 0 ${s * 3}px ${s}px ${col}`);
        anim(el, fr(t => { if (t < RI_BURN) return { opacity: 0, transform: 'none' }; vy += H * 2.6 * dt; qx += vx * dt; qy += vy * dt; if (qy > floor && vy > 0) { qy = floor; vy *= -.3; vx *= .7; } return { opacity: 1 - sm(RI_BURN + .35, RI_BURN + 1.0, t), transform: `translate(${qx.toFixed(1)}px,${qy.toFixed(1)}px)` }; }));
      }
      for (let i = 0; i < 14; i++) {      // embers rising
        const s = H * rand(.02, .045), x0 = cx + rand(-.6, .6) * W, t0 = RI_BURN + rand(0, .3), el = add(`left:${x0 - s / 2}px;top:${cy + H * .1}px;width:${s}px;height:${s}px;z-index:5;border-radius:50%;background:#fbbf24;box-shadow:0 0 ${s * 2}px #f97316`);
        anim(el, fr(t => { const u = clamp((t - t0) / 1.1); return { opacity: u > 0 && u < 1 ? (1 - u) * sm(0, .1, u) : 0, transform: `translate(${(Math.sin(t * 8 + i) * H * .1).toFixed(1)}px,${(-H * 1.4 * u).toFixed(1)}px)` }; }));
      }
      end(lastAnim);
    }
    function bfxShitStorm(host, x, y, k) {
      const calm = reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
      return levelBurn3d('burn-lvl-shitstorm', host, x, y, k, calm) || ShLevelBurns.play('burn-lvl-shitstorm', host, x, y, k, calm);
    }
    function playBurnFx(id, host, x, y, scale = 1, card = null) {
      if (!host) return false;
      if (window.ShCityRedesign && (id==='burn-ldn-routemaster'||id==='burn-mum-monsoon')) {
        const cardEls = host.id==='burnFxLayer' ? [...document.querySelectorAll('#discardCardsWrapper > [data-card-id]')] : [];
        const back = cityDraftBack(burnBackClass());
        const face = cardEls.length ? ShCityRedesign.snapshotCard(cardEls[cardEls.length-1]) : cityDraftFace(card);
        if (back && ShCityRedesign.play(id,host,{x,y,cardEls,face,back,reducedMotion:reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches})) return true;
      }
      if (id === PRIVATE_BURN_ID) { playPrivateBurn(host,x,y,scale,card); return true; }
      // Season Pass burns (art/burns/season/season-burns.js): canvas particles + real card clones, 1.8s.
      if (window.ShSeasonBurns && ShSeasonBurns.has(id) && ShSeasonBurns.play(id, host, x, y, scale)) return true;
      // Painted-art 3D burns (art/burns/level-3d/burns3d.js); their old effects stay as the fallback.
      if (window.ShLevel3D && ShLevel3D.has(id) && levelBurn3d(id, host, x, y, scale, reduceMotion || matchMedia('(prefers-reduced-motion: reduce)').matches)) return true;
      ({ default: bfxDefault, 'burn-electric': bfxElectric, 'burn-coloured': bfxColouredFlame, 'burn-sweets': bfxSweets, 'burn-ice': bfxIce, 'burn-paint': bfxPaint, 'burn-smoke': bfxSmoke,
        'burn-blackhole': bfxBlackHole, 'burn-origami': bfxOrigami, 'burn-pixel': bfxPixelBlast, 'burn-lava': bfxLavaMelt,
        'burn-valentine': bfxValentine, 'burn-summer': bfxSummer, 'burn-christmas': bfxChristmas, 'burn-lunar': bfxLunar, 'burn-ramadan': bfxRamadan,
        'burn-diwali': bfxDiwali, 'burn-easter': bfxEaster, 'burn-newyear': bfxNewYear, 'burn-ldn-routemaster': bfxRoutemaster, 'burn-mum-monsoon': bfxMonsoon,
        'burn-lvl-spark-snap': bfxSparkSnap, 'burn-lvl-smoke-burst': bfxSmokeBurst, 'burn-lvl-inferno-sweep': bfxInferno,
        'burn-lvl-hellfire-spiral': bfxHellfireSpiral, 'burn-lvl-royal-incineration': bfxRoyalIncineration, 'burn-lvl-shitstorm': bfxShitStorm }[id] || (typeof SEASONAL_BURN_FX !== 'undefined' && SEASONAL_BURN_FX[id]) || (() => {}))(host, x, y, scale);
      return true;
    }


    // London Calling burn (v438, rebuilt v440 from the owner's video): the head-on FRONT of a Routemaster (Blender render,
    // art/london/bus-front2.webp) drives straight down a road from far behind the card toward the camera. The camera is
    // fixed, so perspective does the work: the bus scales with 1/distance (starting hidden behind the card, accelerating),
    // its ground line slides down the road, and it bursts through the card at .55s (shards fly out in front of it, sparks,
    // a shock ring), fills the screen and is gone by ~.85s while dust settles. The road and its centre dashes are static.
    // One 2s clock. Sound: BURN_SOUNDS['burn-ldn-routemaster'].
    const RM_HIT = .55;
    function bfxRoutemaster(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(220,38,38,.45)', 'rgba(30,58,138,.2)']), { W, H, cx, cy, anim, end, vw } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, RM_HIT, { tint: 'linear-gradient(160deg,rgba(220,38,38,.3),rgba(30,58,138,.3))', shake: .008 });
      const vh = host.clientHeight || innerHeight, hy = cy - H * .5, Y8 = cy + H * .62, span = vh * 1.2 - hy, BW = H * 2.8, BH = BW / .812;   // the sprite also holds its shadow: the bus is the left 68%, wheels at 90.7% of its height
      const gy = d => hy + (Y8 - hy) * 8 / d;                                  // ground line of something d away (d 8 = at the card)
      const dAt = t => t < .06 ? 24 : t < RM_HIT ? 24 - 16 * Math.pow((t - .06) / (RM_HIT - .06), 1.6) : 8 - (16 * 1.6 / (RM_HIT - .06)) * .55 * (t - RM_HIT);
      const road = add(`left:0;top:${hy}px;width:${vw}px;height:${span}px;z-index:1;clip-path:polygon(${cx - H * .05}px 0,${cx + H * .05}px 0,${cx + vw * 1.2}px 100%,${cx - vw * 1.2}px 100%);background:linear-gradient(180deg,rgba(15,23,42,0),rgba(15,23,42,.8) 14%,rgba(30,41,59,.95))`);
      anim(road, fr(t => ({ opacity: sm(0, .1, t) * (1 - sm(1.0, 1.4, t)) })));
      [34, 24, 17, 12, 9, 6.5, 5].forEach(d => {   // static centre-line dashes: the bus simply drives over them
        const g = gy(d), sc = 8 / d, dash = add(`left:${cx - 3}px;top:${g - 13 * sc}px;width:6px;height:26px;z-index:1;transform-origin:50% 50%;transform:scale(${(sc * .8).toFixed(3)},${sc.toFixed(3)});background:linear-gradient(180deg,rgba(254,240,138,.9),rgba(250,204,21,.9));border-radius:2px`);
        anim(dash, fr(t => ({ opacity: sm(0, .1, t) * (1 - sm(1.0, 1.3, t)) })));
      });
      const bus = add(`left:${cx - BW * .339}px;top:${Y8 - BH * .907}px;width:${BW}px;height:${BH}px;z-index:2;transform-origin:33.9% 90.7%`,
        `<div style="position:absolute;inset:0;background:url(art/london/bus-front2.webp) center/100% 100% no-repeat"></div>`);
      anim(bus, fr(t => { const d = Math.max(2.6, dAt(t)), sc = 8 / d, bump = Math.max(0, 1 - Math.abs(t - RM_HIT) / .05);
        return { opacity: t < .04 ? 0 : 1 - sm(.74, .86, t), transform: `translate(${(Math.sin(t * 95) * H * .003 * (1 + 3 * bump) * sc).toFixed(2)}px,${(gy(d) - Y8).toFixed(1)}px) scale(${sc.toFixed(3)})` }; }));
      pfxShatter(st, kit, { t0: RM_HIT, ip: [W * .5, H * .55], cols: 4, rows: 6, speed: 1.25, edge: '#fecaca', tint: i => `linear-gradient(135deg,${i % 2 ? 'rgba(220,38,38,.55)' : 'rgba(255,255,255,.45)'},rgba(30,58,138,.4))` });
      pfxBurst(st, kit, { x: cx, y: cy, t0: RM_HIT, n: 18, len: H * .12, dist: H * .8, life: .5, cols: ['#fde047', '#fff', '#ef4444', '#60a5fa'], w: 2.4 });
      const ring = add(`left:${cx - H * .5}px;top:${cy - H * .5}px;width:${H}px;height:${H}px;z-index:4;border-radius:50%;border:${Math.max(2, H * .03)}px solid rgba(255,255,255,.85);box-shadow:0 0 ${H * .12}px rgba(251,191,36,.8)`);
      anim(ring, fr(t => { const p = clamp((t - RM_HIT) / .45); return { opacity: p > 0 && p < 1 ? (1 - p) * .9 : 0, transform: `scale(${(.2 + 1.6 * out(p)).toFixed(3)})` }; }));
      for (let i = 0; i < 9; i++) {   // dust thrown out along the road as it blasts through
        const px = cx + rand(-.9, .9) * H, py = Y8 + rand(-.05, .1) * H, s = H * rand(.3, .55), t0 = RM_HIT + .02 + i * .03;
        const puff = add(`left:${px - s / 2}px;top:${py - s / 2}px;width:${s}px;height:${s}px;z-index:3;border-radius:50%;background:radial-gradient(closest-side,rgba(226,232,240,.55),rgba(148,163,184,.22) 60%,transparent)`);
        anim(puff, fr(t => { const p = clamp((t - t0) / .85); return { opacity: p > 0 && p < 1 ? (1 - p) * .8 : 0, transform: `translateY(${(-H * .2 * p).toFixed(1)}px) scale(${(.35 + 1.1 * out(p)).toFixed(3)})` }; }));
      }
      end(st.lastAnim);
    }


    // Mumbai Masala burn (v442): Monsoon Deluge. A storm rolls in (dark sky, drifting clouds, slanting rain), lightning
    // strikes the card at MS_HIT and shatters it, then a monsoon wave sweeps right to left across the table carrying the
    // pieces off in spray; ripples and mist settle. All DOM/SVG on one clock. Sound: BURN_SOUNDS['burn-mum-monsoon'].
    const MS_HIT = .45;
    function bfxMonsoon(host, x, y, k) {
      const { st, kit } = pfxBase(host, x, y, ['rgba(56,189,248,.3)', 'rgba(15,23,42,.35)']), { W, H, cx, cy, anim, end, vw } = st, { rand, out, sm, fr, add, clamp } = kit;
      pfxCard(st, kit, MS_HIT, { tint: 'linear-gradient(160deg,rgba(15,23,42,.5),rgba(56,189,248,.25))', shake: .01 });
      const vh = host.clientHeight || innerHeight, gy = cy + H * .42;
      const sky = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:0;background:linear-gradient(180deg,rgba(6,10,28,.85),rgba(15,30,60,.5) 55%,rgba(8,20,40,.12))`);
      anim(sky, fr(t => ({ opacity: sm(0, .22, t) * (1 - sm(1.55, 1.95, t)) })));
      for (let i = 0; i < 6; i++) {   // clouds drifting across the top
        const cw = vw * rand(.5, .8), ch = H * rand(.35, .55), cl = add(`left:${rand(-.2, .7) * vw}px;top:${rand(-.12, .12) * vh}px;width:${cw}px;height:${ch}px;z-index:0;border-radius:50%;filter:blur(${H * .06}px);background:radial-gradient(closest-side,rgba(30,41,70,.95),rgba(15,23,42,.6) 60%,transparent)`), dx = rand(-.12, .12) * vw;
        anim(cl, fr(t => ({ opacity: sm(0, .25, t) * (1 - sm(1.5, 1.95, t)), transform: `translateX(${(dx * t).toFixed(1)}px)` })));
      }
      for (let i = 0; i < 44; i++) {   // slanting rain
        const x0 = rand(-.1, 1.1) * vw, len = rand(.06, .11) * H, spd = rand(1.7, 2.5), off = rand(0, 1);
        const r = add(`left:${x0}px;top:0;width:${Math.max(1.5, H * .006)}px;height:${len}px;z-index:4;background:linear-gradient(180deg,transparent,rgba(186,230,253,.85))`);
        anim(r, fr(t => { const p = (t * spd + off) % 1; return { opacity: .8 * sm(.04, .2, t) * (1 - sm(1.35, 1.9, t)), transform: `translate(${(-p * vh * .25).toFixed(1)}px,${(p * vh * 1.1 - len).toFixed(1)}px) rotate(14deg)` }; }));
      }
      // the lightning bolt strikes the card at MS_HIT
      let bx = cx + rand(-.4, .4) * H, by = 0, pts = `${bx.toFixed(1)},0`;
      while (by < cy - H * .1) { by += H * rand(.08, .14); bx += (cx - bx) * .25 + rand(-.07, .07) * H; pts += ` ${bx.toFixed(1)},${by.toFixed(1)}`; }
      pts += ` ${cx.toFixed(1)},${cy.toFixed(1)}`;
      const bolt = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:6`, `<svg width="${vw}" height="${vh}" style="position:absolute;inset:0;overflow:visible"><polyline points="${pts}" fill="none" stroke="#7dd3fc" stroke-width="${H * .035}" stroke-linejoin="round" opacity=".6"/><polyline points="${pts}" fill="none" stroke="#fff" stroke-width="${H * .012}" stroke-linejoin="round"/></svg>`);
      anim(bolt, fr(t => ({ opacity: t < MS_HIT - .03 || t > MS_HIT + .14 ? 0 : (Math.floor(t * 60) % 2 ? 1 : .55) })));
      const flash = add(`left:0;top:0;width:${vw}px;height:${vh}px;z-index:7;background:#e0f2fe`);
      anim(flash, fr(t => ({ opacity: t < MS_HIT - .02 ? 0 : .85 * Math.max(0, 1 - (t - MS_HIT + .02) / .1) + (t > .62 && t < .68 ? .25 * (1 - (t - .62) / .06) : 0) })));
      pfxShatter(st, kit, { t0: MS_HIT, ip: [W * .5, H * .5], cols: 4, rows: 6, speed: 1.1, edge: '#bae6fd', tint: i => `linear-gradient(135deg,${i % 2 ? 'rgba(186,230,253,.6)' : 'rgba(255,255,255,.45)'},rgba(15,23,42,.45))` });
      pfxBurst(st, kit, { x: cx, y: cy, t0: MS_HIT, n: 16, len: H * .1, dist: H * .7, life: .45, cols: ['#e0f2fe', '#fff', '#7dd3fc'], w: 2.2 });
      // the monsoon wave: a wide water body with a rolling crest, sweeping right to left over the table
      const WW = vw * 2.8, WH = H * 1.6;
      let top = '';
      for (let i = 0; i <= 50; i++) { const u = i / 50, yy = 120 + 36 * Math.sin(u * 14) - (u < .3 ? (.3 - u) * 330 : 0); top += `${i ? 'L' : 'M'}${(u * 1000).toFixed(0)} ${yy.toFixed(1)}`; }
      const foam = Array.from({ length: 34 }, (_, i) => { const u = i / 33, yy = 120 + 36 * Math.sin(u * 14) - (u < .3 ? (.3 - u) * 330 : 0); return `<circle cx="${(u * 1000).toFixed(0)}" cy="${(yy + rand(-5, 8)).toFixed(1)}" r="${rand(5, 13).toFixed(1)}" fill="#f0f9ff" opacity=".9"/>`; }).join('');
      const wave = add(`left:${vw}px;top:${gy - H * .4}px;width:${WW}px;height:${vh - (gy - H * .4) + 40}px;z-index:5`,
        `<svg viewBox="0 0 1000 300" preserveAspectRatio="none" width="100%" height="100%"><defs><linearGradient id="mswg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dd3fc"/><stop offset=".35" stop-color="#0ea5e9"/><stop offset="1" stop-color="#075985"/></linearGradient></defs><path d="${top}L1000 300L0 300Z" fill="url(#mswg)"/><path d="${top}" fill="none" stroke="#f0f9ff" stroke-width="9" stroke-linejoin="round" opacity=".8"/>${foam}</svg>`);
      anim(wave, fr(t => { const p = clamp((t - .58) / .72), e = p * p * (3 - 2 * p); return { opacity: p > 0 && p < 1 ? 1 : 0, transform: `translateX(${(-e * (vw + WW * 1.05)).toFixed(1)}px)` }; }));
      for (let i = 0; i < 28; i++) {   // spray thrown off the front of the wave
        const t0 = .6 + i * .02, s = H * rand(.025, .06), yy = gy - H * rand(.1, .45), d = rand(.15, .5) * H;
        const dr = add(`left:${vw * rand(.2, .95)}px;top:${yy}px;width:${s}px;height:${s}px;z-index:6;border-radius:50%;background:rgba(224,242,254,.9)`);
        anim(dr, fr(t => { const p = clamp((t - t0) / .55); return { opacity: p > 0 && p < 1 ? 1 - p : 0, transform: `translate(${(-d * .5 * p).toFixed(1)}px,${(-d * (p - p * p * 2.2)).toFixed(1)}px)` }; }));
      }
      for (let i = 0; i < 3; i++) {   // ripples in the puddle once the wave has gone
        const t0 = 1.1 + i * .16, rp = add(`left:${cx - H * .5}px;top:${gy - H * .12}px;width:${H}px;height:${H * .24}px;z-index:2;border-radius:50%;border:${Math.max(1.5, H * .01)}px solid rgba(186,230,253,.8)`);
        anim(rp, fr(t => { const p = clamp((t - t0) / .6); return { opacity: p > 0 && p < 1 ? (1 - p) * .8 : 0, transform: `scale(${(.3 + 1.2 * out(p)).toFixed(3)})` }; }));
      }
      const mist = add(`left:0;top:${gy - H * .3}px;width:${vw}px;height:${H * .6}px;z-index:3;background:linear-gradient(180deg,transparent,rgba(186,230,253,.28),transparent)`);
      anim(mist, fr(t => ({ opacity: sm(1.1, 1.4, t) * (1 - sm(1.55, 1.95, t)) })));
      end(st.lastAnim);
    }

    // Reduce motion: a single soft glow instead of flying particles and shakes.
    function playCalmBurn(x, y) {
      const layer = document.getElementById('burnFxLayer');
      if (!layer) return;
      const el = bfxAdd(layer, '<div style="width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,rgba(253,186,116,.75),rgba(249,115,22,.25) 45%,transparent 70%)"></div>', x, y, 120, 120);
      bfxAnimate(el, [{ opacity: 0 }, { opacity: 1, offset: .3 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' });
    }
    function playBurnEffect(effect, x, y, card = null) {
      if(effect===PRIVATE_BURN_ID)return playBurnFx(effect,document.getElementById('burnFxLayer'),x,y,1,card);
      if (ShLevelBurns.index(effect) >= 0) return playBurnFx(effect, document.getElementById('burnFxLayer'), x, y, .72);
      if (typeof reduceMotion !== 'undefined' && reduceMotion) return playCalmBurn(x, y);
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
      if(player && player.id!==state?.localPlayerId && player.cosmetics?.burnEffect===PRIVATE_BURN_ID)return othersEffectsOn && PRIVATE_ACCOUNT_IDS.has(player.uid) ? PRIVATE_BURN_ID : 'default';
      const ownEffect = (typeof equippedCosmetics !== 'undefined' && equippedCosmetics.burnEffect) || 'default';
      if (player?.id === state?.localPlayerId && ownEffect === PRIVATE_BURN_ID && ownedPrivateBurns().length) return ownEffect;
      if (player && player.id !== state?.localPlayerId && !othersEffectsOn) return 'default';
      return eventBotItem(player, 'burnEffect') || player?.cosmetics?.burnEffect || (player?.id === state?.localPlayerId ? ownEffect : 'default') || 'default';
    }
    let burnFxPlayer = null; // whose burn is playing, for effects that show their card back
    function triggerEquippedBurnEffect(x, y, player = null, card = null) {
      burnFxPlayer = player;
      try {
        playBurnEffect(burnEffectIdFor(player), x, y, card);
      } catch (error) {
        console.warn('Burn cosmetic skipped safely:', error);
      }
    }
  
