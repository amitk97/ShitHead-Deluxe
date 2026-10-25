
    const AUDIO_SOURCES = {
      riffle: "audio/riffle.mp3",
      place: "audio/place.mp3",
      take: "audio/take.mp3",
      turn: "audio/turn.mp3",      // Your-turn alert
      notify: "audio/notify.mp3"   // New invite / friend request / gift
    };
    // Clips for the owner's effects (v257, made by tools/make-effect-sounds.py).
    // v287: the roar and the boo are the owner's own recordings, fitted to their animations by tools/make-owner-clips.py.
    const EFFECT_CLIPS = { 'lion-roar': 'audio/lion-roar-v287.mp3', boo: 'audio/boo-v287.mp3', fireworks: 'audio/fireworks-v275.mp3' };
    // The your-turn chime plays softer than the card sounds.
    const TURN_ALERT_GAIN = 0.08; // a faint cue, well under the card sounds

    const Haptics = {
      vibrate(pattern) {
        if (typeof hapticsOn !== 'undefined' && !hapticsOn) return;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(pattern); } catch(e) {}
        }
      }
    };

    class SoundFX {
      constructor() {
        this.enabled = true;
        // One base <audio> element per clip. It holds the volume (set from
        // Settings), the riffle's duration, and is the fallback player.
        this.riffleEl = new Audio(AUDIO_SOURCES.riffle);
        this.placeEl = new Audio(AUDIO_SOURCES.place);
        this.takeEl = new Audio(AUDIO_SOURCES.take);
        this.turnEl = new Audio(AUDIO_SOURCES.turn);
        this.notifyEl = new Audio(AUDIO_SOURCES.notify);
        this.allEls().forEach(a => { a.preload = 'auto'; a.volume = 0.85; });
        this.gain = new Map([[this.turnEl, TURN_ALERT_GAIN]]);
        // Web Audio plays each clip from a buffer decoded once, so a sound
        // starts on the same frame as its animation. Cloning <audio> made
        // iPhones fetch and decode the file again on every play (a
        // noticeable lag on the shuffle and every dealt card) and iOS
        // ignores <audio>.volume anyway; a GainNode respects it.
        this.ctx = null;
        this.buffers = new Map();
        this._initWebAudio();
      }
      _initWebAudio() {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        try { this.ctx = new Ctx(); } catch (e) { this.ctx = null; return; }
        this.allEls().forEach(el => {
          const src = el.getAttribute('src');
          fetch(src).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
            .then(data => new Promise((resolve, reject) => {
              // Callback form: older Safari has no promise-returning decodeAudioData.
              const p = this.ctx.decodeAudioData(data, resolve, reject);
              if (p && p.then) p.then(resolve, reject);
            }))
            .then(buffer => this.buffers.set(el, buffer))
            .catch(() => {});
        });
        // iOS starts the context suspended until a tap; resume on every
        // gesture (it is suspended again after calls/backgrounding).
        const unlock = () => {
          if (!this.ctx || this.ctx.state === 'running') return;
          this.ctx.resume().catch(() => {});
          try {
            const silent = this.ctx.createBufferSource();
            silent.buffer = this.ctx.createBuffer(1, 1, 22050);
            silent.connect(this.ctx.destination);
            silent.start(0);
          } catch (e) {}
        };
        // Effect clips (§ Owner effects: lion roar, ghost's BOO, fireworks)
        // load a few seconds after start-up, off the critical path.
        this.clipBuffers = new Map();
        this.clipSources = new Map();
        this.clipLoads = new Map();
        setTimeout(() => Object.keys(EFFECT_CLIPS).forEach(name => this.loadEffectClip(name)), 3000);
        ['pointerdown', 'touchend', 'keydown'].forEach(t => document.addEventListener(t, unlock, { capture: true, passive: true }));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });
      }
      allEls() { return [this.riffleEl, this.placeEl, this.takeEl, this.turnEl, this.notifyEl]; }
      _play(base) {
        if (!this.enabled) return;
        const level = base.volume * (this.gain?.get(base) ?? 1);
        const buffer = this.buffers.get(base);
        // Only while running: a sound started on a suspended context would
        // wait and play whenever it resumes, i.e. late.
        if (buffer && this.ctx && this.ctx.state === 'running') {
          try {
            const src = this.ctx.createBufferSource();
            src.buffer = buffer;
            const gain = this.ctx.createGain();
            gain.gain.value = level;
            src.connect(gain).connect(this.ctx.destination);
            src.start(0);
            return;
          } catch (e) {}
        }
        try {
          const inst = base.cloneNode();
          inst.volume = level;
          inst.play().catch(() => {});
        } catch (e) {}
      }
      /* Deck being shuffled before the deal, at the start of a match (like an online poker table) */
      playRiffleShuffle() {
        this._play(this.riffleEl);
      }
      /* It has just become this player's turn (Settings → Turn Alert) */
      playTurnAlert() {
        if (typeof turnAlertOn !== 'undefined' && !turnAlertOn) return;
        this._play(this.turnEl);
      }
      /* A new game invite, friend request or gift arrived (Settings → Notification Sound) */
      playNotify() {
        if (typeof notifySoundOn !== 'undefined' && !notifySoundOn) return;
        this._play(this.notifyEl);
      }
      /* Blind flip reveal: a rising whoosh with two heartbeat thumps, then a
         bright two-note chime (playable) or a low thud (forced pickup).
         Synthesised on the fly; silent without a running Web Audio context. */
      playRevealTension(seconds) {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return;
        const vol = this.riffleEl.volume;
        if (!vol) return;
        const t0 = ctx.currentTime;
        const len = Math.max(0.3, seconds);
        const noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
        const data = noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = noise;
        const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 3;
        filter.frequency.setValueAtTime(250, t0); filter.frequency.exponentialRampToValueAtTime(2200, t0 + len);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.22 * vol, t0 + len * 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
        src.connect(filter).connect(g).connect(ctx.destination); src.start(t0); src.stop(t0 + len);
        [0.05, 0.05 + Math.min(0.32, len * 0.35)].forEach((at) => {
          const o = ctx.createOscillator(); o.type = 'sine';
          o.frequency.setValueAtTime(70, t0 + at); o.frequency.exponentialRampToValueAtTime(40, t0 + at + 0.16);
          const og = ctx.createGain();
          og.gain.setValueAtTime(0.0001, t0 + at); og.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + at + 0.015); og.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.18);
          o.connect(og).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + 0.2);
        });
      }
      playRevealResult(good) {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return;
        const vol = this.riffleEl.volume;
        if (!vol) return;
        const t0 = ctx.currentTime;
        const notes = good ? [[880, 0], [1318.5, 0.07]] : [[110, 0], [82.4, 0.05]];
        notes.forEach(([freq, at]) => {
          const o = ctx.createOscillator(); o.type = good ? 'triangle' : 'sawtooth';
          o.frequency.setValueAtTime(freq, t0 + at);
          const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = good ? 5000 : 500;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime((good ? 0.25 : 0.4) * vol, t0 + at + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + (good ? 0.35 : 0.45));
          o.connect(f).connect(g).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + 0.5);
        });
      }
      /* Equipping a cosmetic: a short two-part "slot in" click. */
      playEquipClick() {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return;
        const vol = this.riffleEl.volume;
        if (!vol) return;
        const t0 = ctx.currentTime;
        [[1800, 0, 0.1], [2600, 0.045, 0.07]].forEach(([freq, at, level]) => {
          const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(freq, t0 + at);
          const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 6;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(level * vol, t0 + at + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.05);
          o.connect(f).connect(g).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + 0.06);
        });
      }
      /* An opponent is down to their last card: two quick, soft rising pings. */
      playLastCard() {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return;
        const vol = this.riffleEl.volume;
        if (!vol) return;
        const t0 = ctx.currentTime;
        [[988, 0], [1480, 0.11]].forEach(([freq, at]) => {
          const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(freq, t0 + at);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0 + at); g.gain.exponentialRampToValueAtTime(0.14 * vol, t0 + at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.28);
          o.connect(g).connect(ctx.destination); o.start(t0 + at); o.stop(t0 + at + 0.3);
        });
      }
      /* Last five seconds of your online turn: one soft tick per second. */
      playTick() {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return;
        const vol = this.riffleEl.volume;
        if (!vol) return;
        const t0 = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(1250, t0);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12 * vol, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
        o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.07);
      }
      /* The home carousel settles on a new card (v319): the card-place
         recording, softer, from its decoded buffer (no <audio> clone). */
      playCarouselSnap() {
        const buffer = this.buffers.get(this.placeEl);
        if (!this.enabled || !buffer || !this.ctx || this.ctx.state !== 'running') return;
        try {
          const src = this.ctx.createBufferSource(); src.buffer = buffer; src.playbackRate.value = 1.15;
          const gain = this.ctx.createGain(); gain.gain.value = this.placeEl.volume * 0.45;
          src.connect(gain).connect(this.ctx.destination); src.start(0);
        } catch (e) {}
      }
      /* A card is dealt to a player, or a card is played to the discard pile */
      playCardPlace() {
        this._play(this.placeEl);
      }
      /* A single card is taken from the draw pile */
      playCardTake() {
        this._play(this.takeEl);
        Haptics.vibrate(12);
      }
      /* Several cards taken at once, e.g. picking up the whole discard pile */
      pickupSequence(count = 1) {
        const steps = Math.min(Math.max(count, 1), 8);
        for (let i = 0; i < steps; i++) {
          setTimeout(() => this._play(this.takeEl), i * 85);
        }
      }
      /* ---- Burn sounds: one synthesised recipe per burn effect ----
         Every Burn cosmetic (and each seasonal one) has its own sound,
         matched to its animation; anything unknown gets the default fire
         whoosh. Built from two primitives on one master gain. */
      _burnKit() {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return null;
        const vol = this.riffleEl.volume;
        if (!vol) return null;
        const t0 = ctx.currentTime + 0.01;
        const out = ctx.createGain(); out.gain.value = vol; out.connect(ctx.destination);
        const env = (g, at, dur, level, attack) => {
          g.gain.setValueAtTime(0.0001, t0 + at);
          g.gain.exponentialRampToValueAtTime(Math.max(0.0002, level), t0 + at + attack);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
        };
        // Filtered noise: whooshes, crackles, splats, hiss.
        const noise = ({ at = 0, dur = 0.3, type = 'lowpass', f0 = 800, f1 = f0, q = 1, level = 0.3, attack = 0.01 }) => {
          const buf = ctx.createBuffer(1, Math.max(1, Math.ceil(ctx.sampleRate * dur)), ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          const src = ctx.createBufferSource(); src.buffer = buf;
          const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
          f.frequency.setValueAtTime(f0, t0 + at); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + at + dur);
          const g = ctx.createGain(); env(g, at, dur, level, Math.min(attack, dur / 2));
          src.connect(f).connect(g).connect(out); src.start(t0 + at); src.stop(t0 + at + dur + 0.02);
        };
        // Oscillator: thumps, zaps, pops, chimes and bells.
        const tone = ({ at = 0, dur = 0.2, type = 'sine', f0 = 440, f1 = f0, level = 0.2, attack = 0.005, vibrato = 0 }) => {
          const o = ctx.createOscillator(); o.type = type;
          o.frequency.setValueAtTime(f0, t0 + at); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + at + dur);
          if (vibrato) {
            const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
            const depth = ctx.createGain(); depth.gain.value = vibrato;
            lfo.connect(depth).connect(o.frequency); lfo.start(t0 + at); lfo.stop(t0 + at + dur + 0.02);
          }
          const g = ctx.createGain(); env(g, at, dur, level, Math.min(attack, dur / 2));
          o.connect(g).connect(out); o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
        };
        const scatter = (n, from, to, fn) => { for (let i = 0; i < n; i++) fn(from + Math.random() * (to - from), i); };
        const clip = (name, at = 0, level = 1) => this.playEffectClip(name, at, level);
        return { noise, tone, scatter, clip };
      }
      /* An effect's recorded clip (EFFECT_CLIPS), `delay` seconds from now,
         at the card sounds' volume. Silent until it has loaded. */
      loadEffectClip(name) {
        if (!this.ctx || !EFFECT_CLIPS[name]) return Promise.resolve(null);
        if (this.clipBuffers?.has(name)) return Promise.resolve(this.clipBuffers.get(name));
        if (this.clipLoads?.has(name)) return this.clipLoads.get(name);
        const promise = fetch(EFFECT_CLIPS[name]).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
          .then(data => new Promise((resolve, reject) => {
            const p = this.ctx.decodeAudioData(data, resolve, reject);
            if (p?.then) p.then(resolve, reject);
          })).then(buffer => { this.clipBuffers.set(name, buffer); return buffer; })
          .catch(() => { this.clipLoads.delete(name); return null; });
        this.clipLoads.set(name, promise);
        return promise;
      }
      playEffectClip(name, delay = 0, level = 1) {
        const ctx = this.ctx;
        if (!this.enabled || !ctx || ctx.state !== 'running') return false;
        const buffer = this.clipBuffers && this.clipBuffers.get(name);
        const vol = this.riffleEl.volume;
        if (!buffer || !vol) return false;
        try {
          const src = ctx.createBufferSource(); src.buffer = buffer;
          const g = ctx.createGain(); g.gain.value = vol * level;
          src.connect(g).connect(ctx.destination);
          this.stopEffectClip(name);
          this.clipSources.set(name, src);
          src.onended = () => { if (this.clipSources.get(name) === src) this.clipSources.delete(name); };
          src.start(ctx.currentTime + Math.max(0, delay));
          return true;
        } catch (e) { return false; }
      }
      stopEffectClip(name) {
        const src = this.clipSources?.get(name);
        if (src) { try { src.stop(); } catch (e) {} this.clipSources.delete(name); }
      }
      playBurnSound(effectId = 'default') {
        if(effectId==='burn-private-keepsake')return; // Private sequence schedules its own sounds.
        const kit = this._burnKit();
        if (!kit) return;
        const recipe = BURN_SOUNDS[effectId] || BURN_SOUNDS.default;
        try { recipe(kit); } catch (e) {}
      }
      // Joker effects (§ Joker effects): one recipe per effect, same kit.
      playJokerSound(effectId = 'default') {
        const kit = this._burnKit();
        if (!kit) return;
        const recipe = JOKER_SOUNDS[effectId] || JOKER_SOUNDS.default;
        try { recipe(kit); } catch (e) {}
      }
      // Victory effects (§ Victory effects): one recipe per effect, same kit; an effect without one is silent
      // here (Lion's Roar and Fireworks play their recorded clips instead).
      playVictorySound(effectId) {
        const recipe = VICTORY_SOUNDS[effectId];
        if (!recipe) return;
        const kit = this._burnKit();
        if (!kit) return;
        try { recipe(kit); } catch (e) {}
      }
      /* The pile burns (10, four of a kind, Joker counter): the burner's sound + a buzz. */
      burn(effectId = 'default') { Haptics.vibrate([30, 50, 40]); this.playBurnSound(effectId); }
      turnNotify() { Haptics.vibrate(20); }
      win() { Haptics.vibrate([50, 80, 50, 100]); }
    }

    // Burn sound recipes, keyed by Burn cosmetic id (see playBurnSound).
    const fireWhoosh = ({ noise, tone, scatter }, level = 1) => {
      noise({ dur: 0.55, f0: 350, f1: 2600, q: 0.8, level: 0.45 * level, attack: 0.08 });
      tone({ dur: 0.28, f0: 95, f1: 40, level: 0.55 * level, attack: 0.01 });
      scatter(10, 0.08, 0.8, (at) => noise({ at, dur: 0.025, type: 'highpass', f0: 3500, level: 0.22 * level }));
    };
    const popBurst = ({ tone }, times, pitch = 1, level = 0.25) => times.forEach((at, i) => {
      const f = (700 + (i % 3) * 220) * pitch;
      tone({ at, dur: 0.08, f0: f, f1: f * 0.35, level });
      tone({ at: at + 0.01, dur: 0.05, type: 'triangle', f0: f * 3, level: level * 0.3 });
    });
    const BURN_SOUNDS = {
      // Default Burn (v406): ember crackle as the coals glow, the ignition whoosh at .15, a roar that builds while the
      // edge climbs (to ~1.45s) with crackles, then a hiss as it dies.
      default: (k) => {
        k.scatter(12, 0, 0.3, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 3500, q: 2, level: 0.18 }));
        k.noise({ at: 0.15, dur: 0.5, f0: 350, f1: 2600, q: 0.8, level: 0.42, attack: 0.08 });
        k.tone({ at: 0.15, dur: 0.3, f0: 95, f1: 40, level: 0.5, attack: 0.01 });
        k.noise({ at: 0.25, dur: 1.2, type: 'bandpass', f0: 800, f1: 450, q: 0.7, level: 0.26, attack: 0.4 });
        k.scatter(26, 0.3, 1.5, (at) => k.noise({ at, dur: 0.025, type: 'highpass', f0: 3500, level: 0.2 }));
        k.noise({ at: 1.4, dur: 0.5, type: 'bandpass', f0: 1800, f1: 700, q: 0.5, level: 0.07, attack: 0.1 });
      },
      // Coloured Flame: the fire, plus a rising shimmer of colour.
      'burn-coloured': (k) => { if (window.ShLevel3D) return ShLevel3D.sound('burn-coloured', k); fireWhoosh(k, 0.8); [660, 880, 1108, 1320, 1760].forEach((f, i) => k.tone({ at: 0.1 + i * 0.06, dur: 0.35, type: 'triangle', f0: f, level: 0.1 })); },
      // Ice Shatter (v404): frost creeping in (airy shimmer + crystal ticks, 0-.62s), the crack at .62 and a
      // second at .72, the shatter at .86 (glass burst, low thud, a cascade of glassy pings), cold mist to 1.9s.
      'burn-ice': (k) => {
        k.noise({ dur: 0.6, type: 'highpass', f0: 3000, f1: 7000, level: 0.1, attack: 0.3 });
        k.scatter(11, 0.04, 0.6, (at) => k.noise({ at, dur: 0.014, type: 'bandpass', f0: 5200, q: 4, level: 0.16 }));
        [[0.62, 0.5], [0.72, 0.3]].forEach(([at, v]) => {
          k.noise({ at, dur: 0.05, type: 'bandpass', f0: 1800, q: 3, level: v });
          k.tone({ at, dur: 0.08, type: 'square', f0: 300, f1: 90, level: v * 0.5 });
        });
        k.noise({ at: 0.86, dur: 0.35, type: 'highpass', f0: 2500, f1: 7000, level: 0.5 });
        k.tone({ at: 0.86, dur: 0.18, f0: 170, f1: 45, level: 0.4 });
        k.scatter(22, 0.88, 1.6, (at) => k.tone({ at, dur: 0.25, f0: 2200 + Math.random() * 3000, level: 0.07 }));
        k.scatter(14, 0.9, 1.5, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 6000, level: 0.12 }));
        k.noise({ at: 0.9, dur: 1.0, type: 'bandpass', f0: 6000, q: 0.6, level: 0.05, attack: 0.2 });
      },
      // Electric Blast (v406): mains hum, three strikes at .12 / .30 / .50s (zap + crack each), the overload at .52
      // (a broad crack, shatter and low thunder), crackling floor arcs to ~1s and sparks pinging down.
      'burn-electric': (k) => {
        k.tone({ dur: 0.5, type: 'square', f0: 60, f1: 58, level: 0.07 });
        [[0.12, 0.35], [0.3, 0.4], [0.5, 0.55]].forEach(([at, v]) => {
          k.tone({ at, dur: 0.22, type: 'sawtooth', f0: 1800, f1: 90, level: v * 0.8 });
          k.noise({ at, dur: 0.07, type: 'highpass', f0: 3000, level: v });
          k.noise({ at: at + 0.02, dur: 0.12, type: 'bandpass', f0: 1400, f1: 400, q: 1.2, level: v * 0.6 });
        });
        k.noise({ at: 0.52, dur: 0.3, type: 'highpass', f0: 2500, f1: 6000, level: 0.45 });
        k.tone({ at: 0.52, dur: 0.9, f0: 70, f1: 32, level: 0.5, attack: 0.02 });
        k.noise({ at: 0.55, dur: 0.9, type: 'bandpass', f0: 180, f1: 90, q: 0.6, level: 0.35, attack: 0.1 });
        k.scatter(22, 0.52, 1.0, (at) => k.noise({ at, dur: 0.018, type: 'bandpass', f0: 4200, q: 4, level: 0.35 }));
        k.scatter(14, 0.6, 1.5, (at) => k.tone({ at, dur: 0.2, f0: 2400 + Math.random() * 2400, level: 0.06 }));
      },
      // Paint Splats (v404): a short whoosh as each bucket flies in and a wet slap as it lands, on the effect's
      // eleven impact times (PAINT_HITS: .12 + .068 each), droplet flecks, drips plinking down, then the
      // painted card sliding off at ~1.45s.
      'burn-paint': (k) => {
        for (let i = 0; i < 11; i++) {
          const at = 0.12 + i * 0.068, big = i === 10;
          k.noise({ at: at - 0.1, dur: 0.1, type: 'bandpass', f0: 900, f1: 2400, q: 1, level: 0.12, attack: 0.05 });
          k.noise({ at, dur: big ? 0.3 : 0.18, type: 'bandpass', f0: (big ? 800 : 1300 - (i % 4) * 150), f1: 160, q: 0.9, level: big ? 0.5 : 0.34 });
          k.tone({ at, dur: 0.11, f0: (big ? 120 : 190 - (i % 3) * 25), f1: 55, level: big ? 0.4 : 0.26 });
          k.scatter(3, at + 0.02, at + 0.14, (t) => k.noise({ at: t, dur: 0.02, type: 'highpass', f0: 4200, level: 0.08 }));
        }
        k.scatter(7, 0.95, 1.6, (at) => k.tone({ at, dur: 0.09, f0: 760 + Math.random() * 200, f1: 420, level: 0.06 }));
        k.noise({ at: 1.45, dur: 0.5, type: 'bandpass', f0: 600, f1: 150, q: 0.8, level: 0.3, attack: 0.12 });
      },
      // Stupendous Confectionery: a scatter of candy pops and a sparkle.
      'burn-sweets': (k) => { if (window.ShLevel3D) return ShLevel3D.sound('burn-sweets', k); popBurst(k, [0, 0.09, 0.16, 0.27, 0.35, 0.47, 0.55], 1.1); k.tone({ at: 0.5, dur: 0.4, type: 'triangle', f0: 2093, level: 0.08 }); },
      // Smoke Show (v404): ember crackle as the card scorches (0-.7s), the soft whoosh of the first puff at
      // .14, a low billow rumble that rises with the column to ~1.5s, the card crumpling at ~1s, a hiss tail.
      'burn-smoke': (k) => {
        k.scatter(14, 0, 0.75, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 3500, q: 2, level: 0.2 }));
        k.noise({ at: 0.14, dur: 0.55, type: 'bandpass', f0: 500, f1: 200, q: 0.8, level: 0.45, attack: 0.06 });
        k.tone({ at: 0.14, dur: 0.5, f0: 70, f1: 45, level: 0.32, attack: 0.05 });
        k.noise({ at: 0.25, dur: 1.3, type: 'bandpass', f0: 240, f1: 120, q: 0.6, level: 0.3, attack: 0.5 });
        k.noise({ at: 0.95, dur: 0.25, type: 'bandpass', f0: 1400, f1: 500, q: 1.1, level: 0.18, attack: 0.04 });
        k.noise({ at: 1.0, dur: 0.9, type: 'bandpass', f0: 1800, f1: 900, q: 0.5, level: 0.07, attack: 0.25 });
      },
      // Black Hole (v407): the core opens at .12s with a deep falling drone, a swirl of rising pulls as the card's
      // strips spiral in (a whoosh each), a hard sucking sweep up to the collapse at 1.2s, the pop and flash
      // there, a sub thump, and twinkling starlight to ~1.9s.
      'burn-blackhole': (k) => {
        k.tone({ at: 0.12, dur: 1.1, f0: 110, f1: 30, level: 0.42, attack: 0.25, vibrato: 4 });
        k.noise({ at: 0.15, dur: 1.0, type: 'bandpass', f0: 2400, f1: 180, q: 1.4, level: 0.28, attack: 0.35 });
        [0.22, 0.3, 0.38, 0.46, 0.54, 0.62].forEach((at, i) => k.noise({ at, dur: 0.14, type: 'bandpass', f0: 900 + i * 220, f1: 300, q: 1.2, level: 0.12 }));
        k.scatter(8, 0.25, 1.1, (at) => k.tone({ at, dur: 0.14, type: 'triangle', f0: 1400 + Math.random() * 600, f1: 300, level: 0.05 }));
        k.tone({ at: 0.75, dur: 0.45, type: 'sine', f0: 180, f1: 1500, level: 0.16, attack: 0.1 });
        k.tone({ at: 1.2, dur: 0.12, f0: 180, f1: 1800, level: 0.32 });
        k.tone({ at: 1.2, dur: 0.5, f0: 70, f1: 28, level: 0.45 });
        k.noise({ at: 1.2, dur: 0.3, type: 'highpass', f0: 3000, f1: 7000, level: 0.22 });
        k.scatter(12, 1.25, 1.9, (at) => k.tone({ at, dur: 0.3, type: 'triangle', f0: 2000 + Math.random() * 2500, level: 0.06 }));
      },
      // Origami Fold: a crisp paper crease for each fold (card, triangle,
      // kite, swan), then wing beats fading as the swans fly off.
      'burn-origami': (k) => {
        if (window.ShLevel3D) return ShLevel3D.sound('burn-origami', k);
        [0.02, 0.16, 0.3, 0.42].forEach((at, i) => {
          k.noise({ at, dur: 0.06, type: 'bandpass', f0: 3200 - i * 300, q: 2.5, level: 0.6 });
          k.noise({ at: at + 0.03, dur: 0.05, type: 'highpass', f0: 5000, level: 0.12 });
        });
        [0.56, 0.69, 0.82, 0.95, 1.08, 1.21].forEach((at, i) => k.noise({ at, dur: 0.09, type: 'bandpass', f0: 700, f1: 480, q: 1.2, level: 0.55 * (1 - i * 0.13) }));
        k.tone({ at: 0.5, dur: 0.9, type: 'triangle', f0: 660, f1: 1320, level: 0.06, attack: 0.1 });
      },
      // Pixel Blast (v407): glitch crackle, a rising 8-bit blip at each pixelation step (.06 .14 .22 .30 .38 .46),
      // the crunchy blast at .52 (noise burst + square drop), a falling chip arpeggio and pixels pinging down.
      'burn-pixel': (k) => {
        k.scatter(8, 0.04, 0.46, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 4000, q: 2, level: 0.14 }));
        [0.06, 0.14, 0.22, 0.3, 0.38, 0.46].forEach((at, i) => k.tone({ at, dur: 0.07, type: 'square', f0: 330 * Math.pow(1.26, i), level: 0.12 }));
        k.noise({ at: 0.52, dur: 0.55, type: 'lowpass', f0: 3000, f1: 150, q: 0.7, level: 0.5 });
        k.tone({ at: 0.52, dur: 0.45, type: 'square', f0: 220, f1: 40, level: 0.2 });
        k.noise({ at: 0.52, dur: 0.12, type: 'highpass', f0: 5000, level: 0.25 });
        [1047, 784, 659, 523, 392].forEach((f, i) => k.tone({ at: 0.62 + i * 0.08, dur: 0.07, type: 'square', f0: f, level: 0.08 }));
        k.scatter(14, 0.7, 1.7, (at) => k.tone({ at, dur: 0.05, type: 'square', f0: 500 + Math.random() * 900, level: 0.05 }));
      },
      // Lava Melt: a sizzle as the cards heat, a heavy slump into the pool,
      // blorping bubbles, then a hiss as it cools and sinks away.
      'burn-lava': (k) => {
        if (window.ShLevel3D) return ShLevel3D.sound('burn-lava', k);
        k.noise({ dur: 0.5, type: 'highpass', f0: 2500, f1: 4500, level: 0.11, attack: 0.15 });
        k.tone({ at: 0.32, dur: 0.7, f0: 70, f1: 45, level: 0.28, attack: 0.1 });
        k.noise({ at: 0.32, dur: 0.4, type: 'lowpass', f0: 600, f1: 200, level: 0.2, attack: 0.05 });
        k.scatter(9, 0.76, 1.45, (at) => { const f = 90 + Math.random() * 90; k.tone({ at, dur: 0.1, f0: f, f1: f * 2.2, level: 0.13 }); });
        k.noise({ at: 1.35, dur: 0.55, type: 'highpass', f0: 4000, f1: 1500, level: 0.08, attack: 0.05 });
      },
      // Season burns (art/burns/season/season-burns.js, 1.8s): each follows its visual beats.
      // Sandstorm Vortex: wind sweeping in (0-.55), a whirling funnel (.55-1.4), a soft dust cloud (1.4-1.8).
      'burn-ss2611-sandstorm': (k) => {
        k.noise({ dur: 0.6, type: 'bandpass', f0: 350, f1: 1300, q: 0.8, level: 0.28, attack: 0.3 });
        k.tone({ at: 0.45, dur: 1.0, type: 'sawtooth', f0: 60, f1: 95, level: 0.07, attack: 0.3 });
        k.noise({ at: 0.55, dur: 0.9, type: 'bandpass', f0: 1100, f1: 1800, q: 1.4, level: 0.22, attack: 0.15 });
        k.scatter(26, 0.55, 1.4, (at) => k.noise({ at, dur: 0.05, type: 'highpass', f0: 5200, level: 0.07 }));
        k.noise({ at: 1.4, dur: 0.4, type: 'lowpass', f0: 1400, f1: 300, level: 0.12, attack: 0.05 });
      },
      // Glacial Shatter: a freezing creak and ice ticks (0-.6), a heavy shatter + tinkling shards (.6), frosty drift.
      'burn-ss2701-glacier': (k) => {
        k.scatter(14, 0.02, 0.58, (at) => k.noise({ at, dur: 0.03, type: 'bandpass', f0: 4200 + Math.random() * 2000, q: 3, level: 0.16 }));
        k.tone({ at: 0.05, dur: 0.55, type: 'sine', f0: 1500, f1: 2600, level: 0.04, attack: 0.3 });
        k.noise({ at: 0.6, dur: 0.35, type: 'highpass', f0: 2800, f1: 1200, level: 0.5, attack: 0.005 });
        k.tone({ at: 0.6, dur: 0.3, type: 'triangle', f0: 130, f1: 55, level: 0.3 });
        k.scatter(18, 0.65, 1.55, (at) => { const f = 1800 + Math.random() * 3600; k.tone({ at, dur: 0.12, type: 'sine', f0: f, f1: f * 0.97, level: 0.06 }); });
        k.noise({ at: 0.8, dur: 0.9, type: 'highpass', f0: 6000, level: 0.05, attack: 0.1 });
      },
      // Shuriken Barrage: five whooshes and thunks (0-.5), a metal slash ring (.5), petals swirling on soft chimes.
      'burn-ss2703-shuriken': (k) => {
        [0, 0.055, 0.11, 0.165, 0.22].forEach((at, i) => {
          k.noise({ at, dur: 0.2, type: 'bandpass', f0: 3000 - i * 150, f1: 900, q: 1.5, level: 0.3 });
          k.noise({ at: at + 0.4, dur: 0.04, type: 'lowpass', f0: 1800, level: 0.3 });
          k.tone({ at: at + 0.4, dur: 0.12, type: 'triangle', f0: 190, f1: 80, level: 0.18 });
        });
        k.noise({ at: 0.5, dur: 0.3, type: 'highpass', f0: 4500, f1: 1600, level: 0.45, attack: 0.005 });
        k.tone({ at: 0.5, dur: 0.6, type: 'sine', f0: 2700, f1: 2500, level: 0.12, attack: 0.002 });
        k.tone({ at: 0.5, dur: 0.5, type: 'sine', f0: 3900, f1: 3700, level: 0.06 });
        k.noise({ at: 1.1, dur: 0.7, type: 'bandpass', f0: 1800, f1: 900, q: 0.6, level: 0.08, attack: 0.15 });
        [784, 988, 1175, 1318, 1568].forEach((f, i) => k.tone({ at: 1.12 + i * 0.1, dur: 0.35, type: 'sine', f0: f, level: 0.05, attack: 0.01 }));
      },
      // Abyssal Whirlpool: a deep swirling pull (0-1.1), the snap-shut gulp (1.1), a burst of popping bubbles.
      'burn-ss2705-whirlpool': (k) => {
        k.noise({ dur: 1.1, type: 'lowpass', f0: 300, f1: 1000, q: 1.2, level: 0.3, attack: 0.25 });
        k.tone({ at: 0.05, dur: 1.05, type: 'sine', f0: 150, f1: 48, level: 0.22, attack: 0.2 });
        k.tone({ at: 0.2, dur: 0.9, type: 'triangle', f0: 400, f1: 120, level: 0.06 });
        k.noise({ at: 1.1, dur: 0.18, type: 'lowpass', f0: 500, f1: 120, level: 0.4, attack: 0.003 });
        k.tone({ at: 1.1, dur: 0.2, type: 'sine', f0: 220, f1: 55, level: 0.3 });
        k.scatter(34, 1.12, 1.75, (at) => { const f = 380 + Math.random() * 800; k.tone({ at, dur: 0.08, type: 'sine', f0: f, f1: f * 2.2, level: 0.08 }); });
      },
      // Zeus's Bolt: an ominous rumble (0-.65), the thunder crack at .65, stone bursting, crackling arcs, drifting dust.
      'burn-ss2707-zeus': (k) => {
        k.noise({ dur: 0.7, type: 'lowpass', f0: 160, f1: 120, level: 0.3, attack: 0.4 });
        k.tone({ dur: 0.7, type: 'sawtooth', f0: 48, f1: 60, level: 0.08, attack: 0.4 });
        k.noise({ at: 0.65, dur: 0.12, type: 'highpass', f0: 6000, level: 0.55, attack: 0.002 });
        k.noise({ at: 0.66, dur: 0.9, type: 'lowpass', f0: 900, f1: 90, level: 0.5, attack: 0.005 });
        k.tone({ at: 0.66, dur: 0.6, type: 'sine', f0: 90, f1: 38, level: 0.35 });
        k.scatter(16, 0.7, 1.3, (at) => k.noise({ at, dur: 0.05, type: 'bandpass', f0: 700 + Math.random() * 1500, q: 2, level: 0.2 }));
        k.scatter(22, 0.72, 1.5, (at) => k.noise({ at, dur: 0.03, type: 'highpass', f0: 6500, level: 0.1 }));
        k.noise({ at: 1.3, dur: 0.5, type: 'lowpass', f0: 800, f1: 200, level: 0.08, attack: 0.1 });
      },
      // Arcane Hex: a rising violet drone and chimes (0-.65), the flash and void at .65, dissolving crackle, a collapse.
      'burn-ss2709-hex': (k) => {
        k.tone({ dur: 0.7, type: 'triangle', f0: 110, f1: 220, level: 0.16, attack: 0.3 });
        k.tone({ dur: 0.7, type: 'sine', f0: 165, f1: 330, level: 0.08, attack: 0.3 });
        [523, 659, 784, 1047].forEach((f, i) => k.tone({ at: 0.1 + i * 0.13, dur: 0.3, type: 'sine', f0: f, level: 0.05, attack: 0.005 }));
        k.tone({ at: 0.65, dur: 0.35, type: 'sawtooth', f0: 200, f1: 1600, level: 0.1, attack: 0.02 });
        k.noise({ at: 0.65, dur: 0.5, type: 'highpass', f0: 3000, f1: 800, level: 0.3, attack: 0.01 });
        k.noise({ at: 0.7, dur: 0.8, type: 'lowpass', f0: 500, f1: 100, level: 0.28, attack: 0.1 });
        k.scatter(30, 0.75, 1.4, (at) => k.noise({ at, dur: 0.025, type: 'highpass', f0: 5500, level: 0.1 }));
        k.tone({ at: 1.4, dur: 0.4, type: 'sine', f0: 900, f1: 90, level: 0.14 });
      },
      // Level burns v294: shared visual/audio timing in the layered renderer.
      // Spark Snap (v424): sparks sucked in with a rising whine and a crackle (0-.42s), the SNAP at .42 (a sharp crack,
      // a thump and a glassy ring), light beams shimmering out, shards and sparks pinging down to ~1.5s.
      'burn-lvl-spark-snap': (k) => {
        k.tone({ at: 0, dur: 0.42, type: 'sawtooth', f0: 220, f1: 1800, level: 0.1, attack: 0.3 });
        k.noise({ at: 0, dur: 0.42, type: 'bandpass', f0: 800, f1: 5000, q: 1.2, level: 0.14, attack: 0.3 });
        k.scatter(26, 0.02, 0.4, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 5500, level: 0.16 }));
        k.noise({ at: 0.42, dur: 0.09, type: 'highpass', f0: 2800, level: 0.5 });
        k.tone({ at: 0.42, dur: 0.18, f0: 200, f1: 55, level: 0.45, attack: 0.005 });
        k.tone({ at: 0.42, dur: 0.6, type: 'triangle', f0: 1568, f1: 1480, level: 0.12 });
        k.tone({ at: 0.44, dur: 0.5, type: 'sine', f0: 2349, level: 0.07 });
        k.noise({ at: 0.45, dur: 0.5, type: 'bandpass', f0: 4200, f1: 900, q: 0.9, level: 0.22 });
        k.scatter(18, 0.5, 1.5, (at) => k.tone({ at, dur: 0.12, type: 'sine', f0: 1800 + Math.random() * 2200, level: 0.06 }));
        k.scatter(10, 0.5, 1.3, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 3000 + Math.random() * 2000, q: 3, level: 0.12 }));
      },
      // Smoke Burst (v406): the card swells (a rising strain to the pop at .36s), the pop, a deep whoomph as the
      // smoke ball bursts out and billows to ~1.5s, a soft hiss tail.
      'burn-lvl-smoke-burst': (k) => {
        k.tone({ dur: 0.36, type: 'triangle', f0: 110, f1: 320, level: 0.2, attack: 0.1 });
        k.noise({ dur: 0.36, type: 'bandpass', f0: 500, f1: 1800, q: 1, level: 0.15, attack: 0.2 });
        k.noise({ at: 0.36, dur: 0.14, type: 'bandpass', f0: 900, q: 0.6, level: 0.55 });
        k.tone({ at: 0.36, dur: 0.3, f0: 170, f1: 38, level: 0.5 });
        k.noise({ at: 0.4, dur: 1.2, type: 'bandpass', f0: 500, f1: 140, q: 0.7, level: 0.4, attack: 0.05 });
        k.scatter(8, 0.4, 0.9, (at) => k.noise({ at, dur: 0.03, type: 'highpass', f0: 4500, level: 0.1 }));
        k.noise({ at: 1.1, dur: 0.8, type: 'bandpass', f0: 1800, f1: 900, q: 0.5, level: 0.07, attack: 0.2 });
      },
      // Inferno Sweep (v406): the whip of fire rushes in (a rising whoosh .06-.46s), the crack at .46, then the
      // fire roars while the card burns away (to ~1.6s) with crackles and a low rumble.
      'burn-lvl-inferno-sweep': (k) => {
        k.noise({ at: 0.06, dur: 0.42, type: 'bandpass', f0: 600, f1: 3500, q: 0.9, level: 0.35, attack: 0.3 });
        k.noise({ at: 0.46, dur: 0.06, type: 'highpass', f0: 3000, level: 0.6 });
        k.tone({ at: 0.46, dur: 0.14, type: 'square', f0: 420, f1: 80, level: 0.4 });
        k.tone({ at: 0.46, dur: 0.5, f0: 90, f1: 40, level: 0.45 });
        k.noise({ at: 0.5, dur: 1.1, type: 'bandpass', f0: 900, f1: 420, q: 0.7, level: 0.3, attack: 0.1 });
        k.scatter(28, 0.5, 1.6, (at) => k.noise({ at, dur: 0.025, type: 'highpass', f0: 3500, level: 0.2 }));
        k.noise({ at: 1.5, dur: 0.45, type: 'bandpass', f0: 1800, f1: 800, q: 0.5, level: 0.07, attack: 0.1 });
      },
      'burn-lvl-hellfire-spiral': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-hellfire-spiral', k) : ShLevelBurns.sound('burn-lvl-hellfire-spiral', k)),
      // Royal Incineration (v424): a rising brass-like swell as the crown descends (.05-.6s), a metallic clang and thump
      // as it lands (.6), jewel chimes (.70, .82, .94, 1.06, 1.16), the golden fire igniting with a roar and chord at
      // .78, gold dust pinging and fire crackling to ~1.6s.
      'burn-lvl-royal-incineration': (k) => {
        [196, 247, 294].forEach((f, i) => k.tone({ at: 0.05, dur: 0.6, type: 'sawtooth', f0: f, f1: f * 1.5, level: 0.06, attack: 0.4 }));
        k.noise({ at: 0.05, dur: 0.55, type: 'bandpass', f0: 600, f1: 3500, q: 1, level: 0.1, attack: 0.4 });
        [523, 1319, 2093, 3136].forEach((f, i) => k.tone({ at: 0.6, dur: 0.9 - i * 0.15, type: 'sine', f0: f, level: 0.16 / (i + 1) + 0.03 }));
        k.noise({ at: 0.6, dur: 0.06, type: 'bandpass', f0: 2500, q: 2, level: 0.4 });
        k.tone({ at: 0.6, dur: 0.2, f0: 150, f1: 48, level: 0.42, attack: 0.005 });
        [0.70, 0.82, 0.94, 1.06, 1.16].forEach((at, i) => k.tone({ at, dur: 0.4, type: 'triangle', f0: [1319, 1568, 1976, 2349, 2637][i], level: 0.08 }));
        k.noise({ at: 0.78, dur: 0.9, type: 'lowpass', f0: 900, f1: 260, level: 0.3, attack: 0.04 });
        k.noise({ at: 0.78, dur: 0.35, type: 'bandpass', f0: 3000, f1: 700, q: 0.9, level: 0.24 });
        k.tone({ at: 0.78, dur: 0.22, f0: 130, f1: 45, level: 0.4 });
        [392, 494, 587, 784].forEach((f, i) => k.tone({ at: 0.8 + i * 0.03, dur: 0.9, type: 'triangle', f0: f, level: 0.09 }));
        k.scatter(20, 0.85, 1.7, (at) => k.tone({ at, dur: 0.14, type: 'sine', f0: 2000 + Math.random() * 2400, level: 0.05 }));
        k.scatter(26, 0.85, 1.6, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 1500 + Math.random() * 2500, q: 2, level: 0.1 }));
      },
      'burn-lvl-shitstorm': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-shitstorm', k) : ShLevelBurns.sound('burn-lvl-shitstorm', k)),
      // Valentine (v410): heartbeat thumps (.10-.38s), an arrow whoosh into the strike at .42, the burst at .50 with a
      // harp run and soft petal rustle.
      'burn-valentine': (k) => {
        [0.1, 0.2, 0.3, 0.4].forEach((at, i) => k.tone({ at, dur: 0.12, f0: 85 - (i % 2) * 15, f1: 40, level: i % 2 ? 0.3 : 0.45 }));
        k.noise({ at: 0.18, dur: 0.24, type: 'highpass', f0: 1200, f1: 6000, level: 0.2, attack: 0.18 });
        k.tone({ at: 0.42, dur: 0.12, type: 'triangle', f0: 260, f1: 70, level: 0.5 });
        k.noise({ at: 0.42, dur: 0.06, type: 'bandpass', f0: 1800, q: 2, level: 0.35 });
        k.noise({ at: 0.5, dur: 0.25, type: 'highpass', f0: 3000, f1: 7000, level: 0.35 });
        k.tone({ at: 0.5, dur: 0.2, f0: 300, f1: 90, level: 0.35 });
        [1319, 1568, 1976, 2349, 2637].forEach((f, i) => k.tone({ at: 0.55 + i * 0.07, dur: 0.5, f0: f, level: 0.07 }));
        k.noise({ at: 0.6, dur: 0.9, type: 'bandpass', f0: 4000, q: 0.5, level: 0.04, attack: 0.2 });
      },
      // Summer (v410): a rising sizzle as the sun heats the card (to .62s), the pop and splash at .62, droplets pattering
      // down, three ball bounces and a wave wash.
      'burn-summer': (k) => {
        k.noise({ at: 0.05, dur: 0.57, type: 'highpass', f0: 2500, f1: 7000, level: 0.09, attack: 0.4 });
        k.scatter(14, 0.2, 0.62, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 5000, level: 0.12 }));
        k.tone({ at: 0.62, dur: 0.14, f0: 280, f1: 90, level: 0.45, attack: 0.004 });
        k.noise({ at: 0.62, dur: 0.4, type: 'bandpass', f0: 1400, f1: 500, q: 0.8, level: 0.5 });
        k.scatter(16, 0.66, 1.3, (at) => k.tone({ at, dur: 0.05, f0: 1800 + Math.random() * 1200, f1: 900 + Math.random() * 500, level: 0.08 }));
        [0.86, 1.1, 1.3].forEach((at, i) => k.tone({ at, dur: 0.1, f0: 190 - i * 25, f1: 80, level: 0.28 - i * 0.05 }));
        k.noise({ at: 0.7, dur: 0.9, type: 'lowpass', f0: 900, f1: 300, level: 0.12, attack: 0.3 });
      },
      'burn-halloween': k => window.ShLevel3D && ShLevel3D.sound('burn-halloween', k),
      // Diwali (v409): twelve clay diyas light one after another (.04-.43s, a flame swell under them), a rocket
      // whistles up to the booms at .62 / .80 / .96s (thump, crack, glitter crackle), then bells shimmer down.
      'burn-diwali': (k) => {
        k.noise({ dur: 0.5, type: 'bandpass', f0: 500, f1: 1400, q: 0.8, level: 0.07, attack: 0.25 });
        for (let i = 0; i < 12; i++) {
          const at = 0.04 + i * 0.035;
          k.tone({ at, dur: 0.12, type: 'triangle', f0: 1500 + i * 60, level: 0.08 });
          k.noise({ at, dur: 0.03, type: 'bandpass', f0: 2600, q: 3, level: 0.1 });
        }
        [[0.4, 0.62], [0.58, 0.8], [0.74, 0.96]].forEach(([a, b], i) => k.tone({ at: a, dur: b - a, f0: 500 + i * 150, f1: 2800, level: 0.1 - i * 0.02, attack: 0.05 }));
        [[0.62, 0.55], [0.8, 0.4], [0.96, 0.35]].forEach(([at, v], i) => {
          k.tone({ at, dur: 0.35, f0: 150 - i * 20, f1: 40, level: v, attack: 0.01 });
          k.noise({ at, dur: 0.3, type: 'lowpass', f0: 1800, f1: 200, level: v * 0.8 });
          k.noise({ at: at + 0.03, dur: 0.5, type: 'highpass', f0: 4000, f1: 7000, level: v * 0.25, attack: 0.05 });
          k.scatter(10, at + 0.05, at + 0.6, (t) => k.noise({ at: t, dur: 0.014, type: 'highpass', f0: 5500, level: 0.12 }));
        });
        [1319, 1568, 1976].forEach((f, i) => k.tone({ at: 1.1 + i * 0.09, dur: 0.5, f0: f, level: 0.05 }));
      },
      // Christmas (v410): ribbon zips as the bands wrap (.05-.30 and .20-.45s), a bow ping at .45, a rattle, the burst
      // at .62 with a bell chord and a shimmer of sleigh bells.
      'burn-christmas': (k) => {
        [[0.05, 0.3], [0.2, 0.45]].forEach(([a, b]) => k.noise({ at: a, dur: b - a, type: 'bandpass', f0: 1200, f1: 4200, q: 1.5, level: 0.14, attack: 0.1 }));
        k.tone({ at: 0.45, dur: 0.45, f0: 1760, level: 0.12 });
        k.scatter(10, 0.46, 0.62, (at) => k.noise({ at, dur: 0.015, type: 'bandpass', f0: 3000, q: 3, level: 0.12 }));
        k.noise({ at: 0.62, dur: 0.3, type: 'highpass', f0: 2500, f1: 7000, level: 0.4 });
        k.tone({ at: 0.62, dur: 0.25, f0: 220, f1: 70, level: 0.4 });
        [2093, 2637, 3136].forEach((f) => k.tone({ at: 0.64, dur: 0.7, type: 'triangle', f0: f, level: 0.07 }));
        k.scatter(22, 0.7, 1.45, (at) => k.tone({ at, dur: 0.12, type: 'triangle', f0: 2800 + Math.random() * 1400, level: 0.05 }));
      },
      // New Year (v409, champagne bottle v435): three clock ticks (3-2-1 at .05 / .23 / .41, rising) while the
      // shaken bottle rattles and fizzes, the cork pops at midnight (.62) with a boom, then the champagne gushes
      // (a long foamy hiss with glugs and fizzing bubbles to ~1.5s), confetti rustle and a chime run.
      // London Calling (v438): Routemaster Rush. Horn beep-beep (.04/.20s), the engine revs up as it approaches, impact at .55
      // (thump, crunch, glass), then it passes away (falling Doppler roar) while shards patter down.
      'burn-ldn-routemaster': (k) => {
        [0.04, 0.2].forEach((at) => { k.tone({ at, dur: 0.12, type: 'sawtooth', f0: 392, f1: 388, level: 0.2 }); k.tone({ at, dur: 0.12, type: 'square', f0: 494, f1: 490, level: 0.09 }); });
        k.tone({ at: 0.06, dur: 0.5, type: 'sawtooth', f0: 60, f1: 190, level: 0.22, attack: 0.2 });
        k.noise({ at: 0.06, dur: 0.5, type: 'bandpass', f0: 300, f1: 1500, q: 0.7, level: 0.2, attack: 0.4 });
        k.tone({ at: 0.55, dur: 0.3, f0: 140, f1: 38, level: 0.55, attack: 0.004 });
        k.noise({ at: 0.55, dur: 0.16, type: 'bandpass', f0: 1800, f1: 700, q: 1, level: 0.5 });
        k.scatter(16, 0.55, 0.9, (at) => k.tone({ at, dur: 0.05, type: 'triangle', f0: 1800 + Math.random() * 2200, f1: 900, level: 0.06 }));
        k.tone({ at: 0.56, dur: 0.65, type: 'sawtooth', f0: 200, f1: 60, level: 0.2 });
        k.noise({ at: 0.56, dur: 0.7, type: 'bandpass', f0: 1600, f1: 250, q: 0.6, level: 0.2 });
        k.scatter(18, 0.7, 1.5, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 4500, level: 0.07 }));
      },
      'burn-newyear': (k) => {
        [0.05, 0.23, 0.41].forEach((at, i) => { k.tone({ at, dur: 0.07, type: 'square', f0: 900 + i * 220, f1: 700 + i * 220, level: 0.2 }); k.noise({ at, dur: 0.02, type: 'highpass', f0: 3500, level: 0.18 }); });
        k.scatter(18, 0.2, 0.61, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 2600 + Math.random() * 1400, q: 3, level: 0.1 }));
        k.noise({ at: 0.3, dur: 0.32, type: 'highpass', f0: 4000, f1: 8000, level: 0.1, attack: 0.9 });
        k.noise({ at: 0.45, dur: 0.17, type: 'highpass', f0: 1500, f1: 7000, level: 0.15, attack: 0.15 });
        k.tone({ at: 0.62, dur: 0.1, f0: 320, f1: 1100, level: 0.5, attack: 0.004 });
        k.noise({ at: 0.62, dur: 0.12, type: 'bandpass', f0: 1800, q: 1.2, level: 0.5 });
        k.tone({ at: 0.66, dur: 0.4, f0: 110, f1: 38, level: 0.45, attack: 0.01 });
        k.noise({ at: 0.64, dur: 0.95, type: 'bandpass', f0: 4200, f1: 2600, q: 0.6, level: 0.3, attack: 0.04 });
        k.noise({ at: 0.66, dur: 0.9, type: 'highpass', f0: 6000, level: 0.14, attack: 0.05 });
        [0.84, 0.97, 1.08, 1.2].forEach((at, i) => k.tone({ at, dur: 0.09, f0: 260 + i * 40, f1: 130 + i * 20, level: 0.1 }));
        k.scatter(34, 0.7, 1.5, (at) => k.tone({ at, dur: 0.04, f0: 1800 + Math.random() * 1800, f1: 2600 + Math.random() * 1500, level: 0.05 }));
        k.noise({ at: 0.7, dur: 0.9, type: 'bandpass', f0: 3000, q: 0.7, level: 0.08, attack: 0.2 });
        k.scatter(14, 0.78, 1.3, (at) => k.noise({ at, dur: 0.014, type: 'highpass', f0: 5000, level: 0.14 }));
        [1047, 1319, 1568, 2093].forEach((f, i) => k.tone({ at: 0.78 + i * 0.1, dur: 0.45, type: 'triangle', f0: f, level: 0.07 }));
      },
      // Easter (v409): the egg wobbles with four woody knocks (.44-.59s) and a crackle, splits at .62 (shell crack and
      // pop), the chick peeps at .74 and .92, mini eggs bounce (thuds), blossoms chime in a rising run.
      'burn-easter': (k) => {
        [0.44, 0.5, 0.55, 0.59].forEach((at, i) => { k.tone({ at, dur: 0.08, f0: 520 - i * 20, f1: 260, level: 0.22 + i * 0.04 }); k.noise({ at, dur: 0.02, type: 'bandpass', f0: 2400, q: 2, level: 0.12 }); });
        k.scatter(10, 0.5, 0.62, (at) => k.noise({ at, dur: 0.01, type: 'highpass', f0: 4500, level: 0.14 }));
        k.noise({ at: 0.62, dur: 0.18, type: 'bandpass', f0: 2200, f1: 700, q: 1.1, level: 0.45 });
        k.tone({ at: 0.62, dur: 0.14, type: 'triangle', f0: 380, f1: 110, level: 0.4 });
        [0.74, 0.92].forEach((at) => { k.tone({ at, dur: 0.09, f0: 1900, f1: 2600, level: 0.1, vibrato: 60 }); k.tone({ at: at + 0.11, dur: 0.07, f0: 2200, f1: 2900, level: 0.08 }); });
        [0.86, 0.99, 1.11, 1.23, 1.33, 1.42, 1.5].forEach((at, i) => k.tone({ at, dur: 0.09, f0: 190 - i * 8, f1: 80, level: 0.2 - i * 0.015 }));
        [1047, 1319, 1568, 1976, 2349].forEach((f, i) => k.tone({ at: 0.75 + i * 0.12, dur: 0.4, f0: f, level: 0.06 }));
        k.noise({ at: 0.65, dur: 0.6, type: 'highpass', f0: 5000, level: 0.04, attack: 0.15 });
      },
      // Lunar New Year (v410): eight firecracker pops at .12 + .07n (crack, bit of tone), a big boom and gong at .74 and
      // gold coins clinking down to ~1.5s.
      'burn-lunar': (k) => {
        for (let i = 0; i < 8; i++) { const at = 0.12 + i * 0.07; k.noise({ at, dur: 0.035, type: 'highpass', f0: 3000, level: 0.45 }); k.tone({ at, dur: 0.05, type: 'square', f0: 800, f1: 200, level: 0.12 }); }
        k.tone({ at: 0.74, dur: 0.5, f0: 120, f1: 36, level: 0.55, attack: 0.01 });
        k.noise({ at: 0.74, dur: 0.35, type: 'lowpass', f0: 2500, f1: 200, level: 0.5 });
        k.tone({ at: 0.75, dur: 1.0, f0: 330, f1: 310, level: 0.1, attack: 0.01 });
        k.noise({ at: 0.77, dur: 0.6, type: 'highpass', f0: 4500, level: 0.18 });
        k.scatter(10, 0.85, 1.5, (at) => k.tone({ at, dur: 0.14, f0: 3000 + Math.random() * 1600, level: 0.06 }));
      },
      // Ramadan (v410): a soft pad swell with two lantern chimes (.10 / .20s), a gentle boom at .60 as the card dissolves,
      // a rising crescent chime run and drifting stardust shimmer.
      'burn-ramadan': (k) => {
        k.tone({ dur: 0.7, f0: 220, f1: 230, level: 0.06, attack: 0.35 });
        [1175, 1397].forEach((f, i) => k.tone({ at: 0.1 + i * 0.1, dur: 0.5, f0: f, level: 0.08 }));
        k.tone({ at: 0.6, dur: 0.4, f0: 130, f1: 80, level: 0.28, attack: 0.02 });
        k.noise({ at: 0.6, dur: 0.3, type: 'bandpass', f0: 2500, f1: 800, q: 0.7, level: 0.25 });
        [880, 1109, 1319, 1760].forEach((f, i) => k.tone({ at: 0.66 + i * 0.1, dur: 0.6, type: 'triangle', f0: f, level: 0.09 }));
        k.scatter(18, 0.65, 1.5, (at) => k.tone({ at, dur: 0.15, f0: 2000 + Math.random() * 2200, level: 0.04 }));
      },
    };

    // Joker effect sounds, keyed by Joker effect id and timed to each
    // animation's beats (JOKER_FX_MS = 1.5s): same loudness as the burns.
    const jokerChime = ({ tone }, notes, at = 0, gap = 0.07, level = 0.12, type = 'triangle', dur = 0.35) =>
      notes.forEach((f, i) => tone({ at: at + i * gap, dur, type, f0: f, level }));
    // Victory sound recipes, on the same beats as their effects in app.js (vfxSparklers, vfxFiveStars, vfxKarate).
    const VICTORY_SOUNDS = {
      // Confetti Burst: a cannon pop and whoosh per volley (0, .3, .6s), a shaker-like rustle for the shower from
      // .9s and a bright finale pop with sparkle at 1.4s (same beats as CONFETTI_VOLLEYS / CONFETTI_FINALE).
      'victory-confetti': (k) => {
        [0, 0.3, 0.6].forEach((at, i) => {
          k.tone({ at, dur: 0.12, type: 'sine', f0: 200 - i * 20, f1: 60, level: 0.34 });
          k.noise({ at, dur: 0.07, type: 'bandpass', f0: 1800, q: 1, level: 0.3 });
          k.noise({ at: at + 0.02, dur: 0.35, type: 'bandpass', f0: 3000, f1: 1200, q: 0.8, level: 0.1 });
          [880, 1175, 1568].forEach((f, j) => k.tone({ at: at + 0.04 + j * 0.04, dur: 0.25, type: 'triangle', f0: f * (1 + i * .12), level: 0.07 }));
        });
        k.scatter(40, 0.9, 2.4, (at) => k.noise({ at, dur: 0.03, type: 'highpass', f0: 5000, level: 0.07 }));
        k.tone({ at: 1.4, dur: 0.2, type: 'sine', f0: 170, f1: 55, level: 0.32 });
        k.noise({ at: 1.4, dur: 0.3, type: 'bandpass', f0: 3200, f1: 700, q: 0.9, level: 0.22 });
        [1047, 1319, 1568, 2093].forEach((f, i) => k.tone({ at: 1.42 + i * 0.05, dur: 0.5, type: 'triangle', f0: f, level: 0.09 }));
        k.scatter(14, 1.5, 2.6, (at) => k.tone({ at, dur: 0.1, type: 'sine', f0: 2400 + Math.random() * 1800, level: 0.04 }));
      },
      // Sparkler Salute: hiss and crackle as the two sparklers write their loops (0-2.2s), a rising shimmer,
      // the burst when they meet at 2.2s and glitter falling to ~3.4s.
      'victory-sparklers': (k) => {
        k.noise({ dur: 2.3, type: 'highpass', f0: 5200, q: 0.7, level: 0.05, attack: 0.15 });
        k.noise({ dur: 2.2, type: 'bandpass', f0: 700, f1: 3400, q: 1, level: 0.07, attack: 0.7 });
        k.scatter(80, 0.05, 2.2, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 5800, level: 0.13 }));
        k.tone({ at: 0.1, dur: 2.1, type: 'sine', f0: 600, f1: 2000, level: 0.03, attack: 0.9 });
        k.noise({ at: 2.2, dur: 0.3, type: 'bandpass', f0: 2600, f1: 500, q: 0.8, level: 0.32 });
        k.tone({ at: 2.2, dur: 0.5, type: 'triangle', f0: 523, f1: 1046, level: 0.13 });
        [1319, 1568, 1976, 2637].forEach((f, i) => k.tone({ at: 2.28 + i * 0.07, dur: 0.4, type: 'sine', f0: f, level: 0.08 }));
        k.scatter(26, 2.3, 3.4, (at) => k.tone({ at, dur: 0.09, type: 'sine', f0: 2400 + Math.random() * 1800, level: 0.045 }));
      },
      // 5-Star Finish: a pentatonic chime as each star lights (.45, .75, 1.05, 1.35, 1.65s), then a flash,
      // a rising sparkle run and falling glitter as the sunburst opens.
      'victory-stars': (k) => {
        [784, 880, 988, 1175, 1319].forEach((f, i) => {
          const at = 0.45 + i * 0.3;
          k.tone({ at, dur: 0.38, type: 'triangle', f0: f, level: 0.12 });
          k.tone({ at, dur: 0.22, type: 'sine', f0: f * 2, level: 0.05 });
          k.noise({ at, dur: 0.04, type: 'highpass', f0: 6000, level: 0.12 });
        });
        k.noise({ at: 1.65, dur: 0.5, type: 'bandpass', f0: 500, f1: 4200, q: 0.9, level: 0.22, attack: 0.15 });
        [1568, 1976, 2349, 3136].forEach((f, i) => k.tone({ at: 1.7 + i * 0.06, dur: 0.5, type: 'sine', f0: f, level: 0.08 }));
        k.tone({ at: 1.65, dur: 0.9, type: 'triangle', f0: 392, level: 0.1 });
        k.scatter(22, 1.8, 3.0, (at) => k.tone({ at, dur: 0.08, type: 'sine', f0: 2600 + Math.random() * 1600, level: 0.04 }));
      },
      // Karate Chop: the hand lifts (0-.75s), a shout and a whoosh as it drops at .78s, then three CRACKs as
      // the boards snap (.94, 1.01, 1.08s) with splinters and a last dull thud.
      'victory-karate': (k) => {
        k.noise({ at: 0.15, dur: 0.6, type: 'bandpass', f0: 300, f1: 1100, q: 1.2, level: 0.1, attack: 0.5 });
        k.tone({ at: 0.74, dur: 0.28, type: 'sawtooth', f0: 430, f1: 210, level: 0.1, attack: 0.02, vibrato: 14 });
        k.noise({ at: 0.78, dur: 0.22, type: 'bandpass', f0: 3000, f1: 350, q: 1.4, level: 0.3 });
        [0.94, 1.01, 1.08].forEach((at, i) => {
          k.noise({ at, dur: 0.07, type: 'highpass', f0: 3200, level: 0.42 });
          k.tone({ at, dur: 0.06, type: 'square', f0: 950 - i * 120, f1: 240, level: 0.16 });
          k.tone({ at, dur: 0.16, type: 'sine', f0: 130 - i * 15, f1: 48, level: 0.36 });
          k.scatter(6, at + 0.03, at + 0.4, (t) => k.noise({ at: t, dur: 0.02, type: 'bandpass', f0: 1800 + Math.random() * 1500, q: 3, level: 0.1 }));
        });
        k.noise({ at: 1.1, dur: 0.5, type: 'lowpass', f0: 600, f1: 200, level: 0.12, attack: 0.05 });
      },
      // Trophy Lift: a rising swell as the cup is raised (0-1s), a bright flash and fanfare at 1s, shimmer
      // on the glints, then a confetti rustle.
      // London Calling (v438): Tower Bridge Salute. Gear ratchet as the leaves rise (.7-1.5s), a ship's horn at 1.5s,
      // rocket whistles + crack at TB_BURSTS (1.6/1.95/2.3s, sound repeats the numbers), the leaves close with a thud
      // at ~3.3s and Big Ben bongs at 3.0s over it.
      'victory-ldn-towerbridge': (k) => {
        for (let i = 0; i < 16; i++) k.noise({ at: 0.7 + i * 0.05, dur: 0.02, type: 'bandpass', f0: 1800, q: 4, level: 0.07 });
        k.tone({ at: 0.7, dur: 0.8, type: 'sawtooth', f0: 70, f1: 90, level: 0.12, attack: 0.3 });
        k.tone({ at: 1.5, dur: 0.7, type: 'sawtooth', f0: 98, f1: 94, level: 0.22, attack: 0.05 }); k.tone({ at: 1.5, dur: 0.7, type: 'square', f0: 147, f1: 141, level: 0.08, attack: 0.05 });
        [1.6, 1.95, 2.3].forEach((at) => {
          k.tone({ at: at - 0.32, dur: 0.3, f0: 500, f1: 2200, level: 0.06, attack: 0.1 });
          k.noise({ at, dur: 0.14, type: 'highpass', f0: 2500, level: 0.4 }); k.tone({ at, dur: 0.22, f0: 160, f1: 50, level: 0.4, attack: 0.004 });
          k.scatter(14, at + 0.05, at + 0.6, (a) => k.noise({ at: a, dur: 0.015, type: 'highpass', f0: 5000 + Math.random() * 2000, level: 0.09 }));
        });
        [[3.0, 164.8], [3.0, 329.6], [3.0, 494]].forEach(([at, f], i) => k.tone({ at, dur: 0.9, type: 'sine', f0: f, f1: f * .995, level: 0.2 / (i + 1), attack: 0.003 }));
        k.tone({ at: 3.28, dur: 0.3, f0: 120, f1: 36, level: 0.5, attack: 0.004 }); k.noise({ at: 3.28, dur: 0.1, type: 'bandpass', f0: 700, q: 1, level: 0.3 });
        [2.2, 2.45, 2.7].forEach((at, i) => k.tone({ at, dur: 0.3, type: 'triangle', f0: [659, 784, 880][i], level: 0.07 }));
      },
      'victory-trophy': (k) => {
        k.noise({ at: 0.1, dur: 0.9, type: 'bandpass', f0: 400, f1: 2600, q: 1, level: 0.1, attack: 0.8 });
        k.tone({ at: 0.1, dur: 0.9, type: 'sine', f0: 220, f1: 660, level: 0.07, attack: 0.7 });
        k.tone({ at: 1.0, dur: 0.18, f0: 160, f1: 50, level: 0.34 });
        k.noise({ at: 1.0, dur: 0.4, type: 'bandpass', f0: 3200, f1: 700, q: 0.9, level: 0.26 });
        [523, 659, 784, 1046].forEach((f, i) => {
          k.tone({ at: 1.02 + i * 0.09, dur: 0.55, type: 'triangle', f0: f, level: 0.12 });
          k.tone({ at: 1.02 + i * 0.09, dur: 0.3, type: 'sine', f0: f * 2, level: 0.05 });
        });
        k.tone({ at: 1.4, dur: 0.9, type: 'triangle', f0: 1046, level: 0.09 });
        k.scatter(7, 1.2, 2.2, (at) => k.tone({ at, dur: 0.14, type: 'sine', f0: 2800 + Math.random() * 1500, level: 0.05 }));
        k.scatter(40, 1.0, 3.2, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 4800, level: 0.07 }));
      },
      // Rocket Launch: three countdown beeps, ignition at 1.15s, a long roaring climb to ~2.9s, a fading rumble
      // and a starburst pop as it leaves the top of the screen.
      'victory-rocket': (k) => {
        [0.1, 0.5, 0.9].forEach((at) => k.tone({ at, dur: 0.12, type: 'square', f0: 880, level: 0.08 }));
        k.noise({ at: 1.15, dur: 0.12, type: 'bandpass', f0: 900, q: 1, level: 0.4 });
        k.noise({ at: 1.15, dur: 2.0, type: 'lowpass', f0: 500, f1: 1500, level: 0.28, attack: 0.25 });
        k.noise({ at: 1.2, dur: 1.9, type: 'bandpass', f0: 1200, f1: 3200, q: 0.7, level: 0.14, attack: 0.4 });
        k.tone({ at: 1.15, dur: 1.9, type: 'sawtooth', f0: 70, f1: 150, level: 0.14, attack: 0.2, vibrato: 30 });
        k.scatter(14, 1.2, 2.6, (at) => k.noise({ at, dur: 0.05, type: 'bandpass', f0: 600 + Math.random() * 600, q: 2, level: 0.1 }));
        k.noise({ at: 2.9, dur: 0.3, type: 'bandpass', f0: 3000, f1: 600, q: 0.9, level: 0.2 });
        [1319, 1760, 2349].forEach((f, i) => k.tone({ at: 2.9 + i * 0.06, dur: 0.4, type: 'sine', f0: f, level: 0.07 }));
      },
      // Cupid's Heart: whoosh + thunk as each arrow lands (.45, .75, 1.05s), two heartbeats (1.25, 1.42s), a harp
      // run and sparkle as the heart bursts at 1.6s, then chimes as the hearts drift up.
      'victory-valentine': (k) => {
        [0.45, 0.75, 1.05].forEach((at, i) => {
          k.noise({ at: at - 0.32, dur: 0.3, type: 'bandpass', f0: 500, f1: 3200, q: 1.2, level: 0.12, attack: 0.25 });
          k.tone({ at, dur: 0.14, type: 'sine', f0: 190, f1: 70, level: 0.3 });
          k.noise({ at, dur: 0.03, type: 'highpass', f0: 3500, level: 0.25 });
          k.tone({ at: at + 0.02, dur: 0.4, type: 'triangle', f0: 1047 + i * 262, level: 0.08 });
        });
        [1.25, 1.42].forEach((at, i) => k.tone({ at, dur: 0.16, type: 'sine', f0: 90 - i * 12, f1: 45, level: 0.38 }));
        k.noise({ at: 1.6, dur: 0.4, type: 'bandpass', f0: 3000, f1: 600, q: 0.9, level: 0.24 });
        k.tone({ at: 1.6, dur: 0.2, type: 'sine', f0: 150, f1: 50, level: 0.32 });
        [523, 659, 784, 988, 1175, 1319, 1568, 1976].forEach((f, i) => k.tone({ at: 1.62 + i * 0.045, dur: 0.6, type: 'triangle', f0: f, level: 0.1 }));
        [392, 494, 587].forEach((f) => k.tone({ at: 1.65, dur: 1.0, type: 'sine', f0: f, level: 0.05, attack: 0.05 }));
        k.scatter(14, 1.8, 3.2, (at) => k.tone({ at, dur: 0.22, type: 'sine', f0: 1568 + Math.random() * 1400, level: 0.045 }));
      },
      // Beach Party: a bright pop and ukulele jingle as the sun rises (0.7s), waves washing in, and a bouncy thump
      // at every ball landing (same landings as SUMMER_BALLS in app.js).
      'victory-summer': (k) => {
        [0.1, 1.5, 2.7].forEach((at) => k.noise({ at, dur: 1.2, type: 'lowpass', f0: 300, f1: 1800, level: 0.11, attack: 0.55 }));
        k.tone({ at: 0.55, dur: 0.3, type: 'sine', f0: 400, f1: 1200, level: 0.1, attack: 0.1 });
        [523, 659, 784, 1047, 784, 659, 784, 1047].forEach((f, i) => { k.tone({ at: 0.7 + i * 0.13, dur: 0.22, type: 'triangle', f0: f, level: 0.11 }); k.noise({ at: 0.7 + i * 0.13, dur: 0.02, type: 'bandpass', f0: 2500, q: 3, level: 0.08 }); });
        for (let i = 0; i < 6; i++) for (let m = 1; m < 4; m++) {
          const at = (300 + i * 280 + 1900 * m / 4) / 1000;
          k.tone({ at, dur: 0.13, type: 'sine', f0: 240 - i * 10, f1: 90, level: 0.14 });
          k.noise({ at, dur: 0.08, type: 'bandpass', f0: 2800, f1: 900, q: 1, level: 0.06 });
        }
      },
      // Bat Swarm: wind over the moon rising, two thunder cracks at .76 and 1.03s, a flutter of wings, ghostly wails
      // (1.0, 1.4s), the pumpkin's pop at 1.1s and a low cackle after it.
      'victory-halloween': (k) => {
        k.noise({ at: 0, dur: 1.4, type: 'bandpass', f0: 250, f1: 900, q: 1.5, level: 0.1, attack: 0.9 });
        k.tone({ at: 0.05, dur: 0.8, type: 'sine', f0: 110, f1: 220, level: 0.07, attack: 0.5, vibrato: 4 });
        [0.76, 1.03].forEach((at, i) => {
          k.noise({ at, dur: 0.1, type: 'highpass', f0: 2500, level: 0.38 });
          k.noise({ at: at + 0.02, dur: 0.9 - i * 0.3, type: 'lowpass', f0: 500, f1: 80, level: 0.34 });
          k.tone({ at, dur: 0.5, type: 'sine', f0: 80, f1: 38, level: 0.3 });
        });
        k.scatter(40, 0.5, 2.9, (at) => k.noise({ at, dur: 0.05, type: 'bandpass', f0: 1200 + Math.random() * 1500, q: 2, level: 0.05 }));
        [1.0, 1.4].forEach((at, i) => k.tone({ at, dur: 0.8, type: 'sine', f0: 320 + i * 60, f1: 560, level: 0.07, attack: 0.15, vibrato: 7 }));
        k.tone({ at: 1.1, dur: 0.16, type: 'sine', f0: 400, f1: 130, level: 0.3 });
        k.noise({ at: 1.1, dur: 0.05, type: 'bandpass', f0: 1500, q: 2, level: 0.25 });
        [0, 1, 2, 3, 4].forEach((i) => k.tone({ at: 1.3 + i * 0.12, dur: 0.1, type: 'square', f0: 420 - i * 30, f1: 300 - i * 30, level: 0.09 }));
        k.tone({ at: 1.5, dur: 1.4, type: 'triangle', f0: 175, level: 0.05, attack: 0.3, vibrato: 3 });
      },
      // Festival of Lights: a soft "whoomp" as each diya lights (.3s + .14s each), a sitar-like pluck run, then a
      // whistle and boom for each firework (1.0, 1.35, 1.7, 2.1s) with bells and falling sparkle.
      'victory-diwali': (k) => {
        k.tone({ at: 0.05, dur: 0.7, type: 'sine', f0: 200, f1: 520, level: 0.08, attack: 0.5 });
        for (let i = 0; i < 7; i++) {
          k.noise({ at: 0.3 + i * 0.14, dur: 0.08, type: 'lowpass', f0: 900, f1: 300, level: 0.14 });
          k.tone({ at: 0.3 + i * 0.14, dur: 0.3, type: 'triangle', f0: [392, 440, 523, 587, 659, 784, 880][i], level: 0.1 });
        }
        [1000, 1350, 1700, 2100].forEach((ms, i) => {
          const at = ms / 1000;
          k.tone({ at: at - 0.3, dur: 0.3, type: 'sine', f0: 500, f1: 1800, level: 0.06, attack: 0.1 });
          k.tone({ at, dur: 0.2, type: 'sine', f0: 150, f1: 48, level: 0.34 });
          k.noise({ at, dur: 0.35, type: 'bandpass', f0: 3000, f1: 700, q: 0.9, level: 0.22 });
          [1047, 1319, 1568].forEach((f, j) => k.tone({ at: at + 0.04 + j * 0.05, dur: 0.5, type: 'triangle', f0: f * (1 + i * 0.06), level: 0.07 }));
        });
        k.scatter(22, 1.2, 3.0, (at) => k.tone({ at, dur: 0.16, type: 'sine', f0: 2200 + Math.random() * 1600, level: 0.04 }));
        k.tone({ at: 1.5, dur: 1.2, type: 'triangle', f0: 523, level: 0.05, attack: 0.2 });
      },
      // Santa's Sleigh: sleigh bells jingling while it crosses (.2-2.7s), a chime run as the tree lights (1.2s),
      // a soft thud as each present lands (1.3, 1.62, 1.94, 2.26, 2.58s) and three deep "ho"s (1.7, 1.95, 2.2s).
      'victory-christmas': (k) => {
        k.scatter(60, 0.2, 2.7, (at) => { k.tone({ at, dur: 0.12, type: 'triangle', f0: 3200 + Math.random() * 1400, level: 0.06 }); k.noise({ at, dur: 0.02, type: 'highpass', f0: 6500, level: 0.06 }); });
        k.tone({ at: 0.2, dur: 1.6, type: 'sine', f0: 262, level: 0.04, attack: 0.5 });
        [523, 659, 784, 1047, 1319].forEach((f, i) => k.tone({ at: 1.2 + i * 0.07, dur: 0.6, type: 'triangle', f0: f, level: 0.1 }));
        [1.3, 1.62, 1.94, 2.26, 2.58].forEach((at, i) => { k.tone({ at, dur: 0.12, type: 'sine', f0: 170, f1: 70, level: 0.26 }); k.tone({ at: at + 0.03, dur: 0.2, type: 'triangle', f0: [659, 784, 880, 988, 1175][i], level: 0.07 }); });
        [1.7, 1.95, 2.2].forEach((at, i) => { k.tone({ at, dur: 0.22, type: 'sawtooth', f0: 150 - i * 8, f1: 110 - i * 8, level: 0.11, attack: 0.02, vibrato: 7 }); });
      },
      // Midnight: tick-tock for 3-2-1 (.15, .6, 1.05s), a deep bell and cork pop at 1.5s with fizz, fireworks
      // booms (1.5, 1.7, 1.95, 2.2, 2.45s) and a crowd cheer swelling under the confetti.
      'victory-newyear': (k) => {
        [150, 600, 1050].forEach((ms, i) => { const at = ms / 1000; k.tone({ at, dur: 0.05, type: 'square', f0: 1400, level: 0.12 }); k.tone({ at: at + 0.2, dur: 0.05, type: 'square', f0: 1000, level: 0.09 }); k.tone({ at, dur: 0.3, type: 'sine', f0: 440 + i * 110, level: 0.07 }); });
        k.tone({ at: 1.5, dur: 1.6, type: 'sine', f0: 196, level: 0.2 });
        k.tone({ at: 1.5, dur: 1.2, type: 'sine', f0: 392 * 1.5, level: 0.1 });
        k.tone({ at: 1.5, dur: 0.9, type: 'sine', f0: 587, level: 0.06 });
        k.tone({ at: 1.52, dur: 0.1, type: 'sine', f0: 700, f1: 120, level: 0.28 });
        k.noise({ at: 1.52, dur: 0.05, type: 'bandpass', f0: 1800, q: 2, level: 0.3 });
        k.noise({ at: 1.55, dur: 0.9, type: 'highpass', f0: 4500, level: 0.1, attack: 0.05 });
        [1.5, 1.7, 1.9, 2.1, 2.3].forEach((at, i) => { k.tone({ at, dur: 0.2, type: 'sine', f0: 150, f1: 48, level: 0.3 }); k.noise({ at, dur: 0.35, type: 'bandpass', f0: 3000, f1: 700, q: 0.9, level: 0.2 }); [1047, 1319, 1760].forEach((f, j) => k.tone({ at: at + 0.04 + j * 0.05, dur: 0.45, type: 'triangle', f0: f * (1 + i * 0.05), level: 0.06 })); });
        k.noise({ at: 1.7, dur: 1.8, type: 'bandpass', f0: 1200, f1: 2200, q: 0.6, level: 0.1, attack: 0.7 });
      },
      // Egg Hunt: a marimba note and thud as each egg lands (.45s + .16s each), small cracks and a high peep as
      // each chick hatches (1.4s + .13s each), soft bunny hops (.7s + .42s each) and a bell for the shout (1.9s).
      'victory-easter': (k) => {
        [523, 587, 659, 784, 880, 988, 1175].forEach((f, i) => { const at = (450 + i * 160) / 1000; k.tone({ at, dur: 0.25, type: 'triangle', f0: f, level: 0.12 }); k.tone({ at, dur: 0.1, type: 'sine', f0: 190, f1: 80, level: 0.18 }); });
        for (let m = 0; m < 5; m++) k.tone({ at: 0.7 + m * 0.42, dur: 0.12, type: 'sine', f0: 130, f1: 70, level: 0.12 });
        for (let i = 0; i < 7; i++) {
          const at = (1400 + i * 130) / 1000;
          k.noise({ at, dur: 0.04, type: 'highpass', f0: 3500, level: 0.22 });
          k.tone({ at: at + 0.07, dur: 0.1, type: 'sine', f0: 2200 + i * 80, f1: 3200 + i * 80, level: 0.07 });
          k.tone({ at: at + 0.17, dur: 0.08, type: 'sine', f0: 2600 + i * 80, f1: 3400 + i * 80, level: 0.05 });
        }
        [1319, 1568, 2093].forEach((f, i) => k.tone({ at: 1.9 + i * 0.07, dur: 0.6, type: 'triangle', f0: f, level: 0.08 }));
      },
      // Dragon Dance: a gong at .3s, drums every .3s from .3 to 2.1s, a cymbal crash at 1.2s, firecracker crackle
      // from 1.3 to 2.3s and fireworks booms (1.4, 1.9, 2.3s).
      'victory-lunar': (k) => {
        [196, 293, 415, 523].forEach((f, i) => k.tone({ at: 0.3, dur: 2.0 - i * 0.3, type: 'sine', f0: f, level: 0.13 / (i + 1) + 0.02 }));
        k.noise({ at: 0.3, dur: 0.4, type: 'bandpass', f0: 900, q: 0.8, level: 0.14 });
        for (let i = 0; i < 7; i++) { const at = 0.3 + i * 0.3; k.tone({ at, dur: 0.14, type: 'sine', f0: i % 2 ? 130 : 95, f1: 55, level: 0.34 }); k.noise({ at, dur: 0.04, type: 'bandpass', f0: 600, q: 2, level: 0.16 }); }
        k.noise({ at: 1.2, dur: 1.0, type: 'highpass', f0: 5000, level: 0.14 });
        k.scatter(46, 1.3, 2.3, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 1800 + Math.random() * 2400, q: 2, level: 0.22 }));
        [1.4, 1.9, 2.3].forEach((at) => { k.tone({ at, dur: 0.2, type: 'sine', f0: 150, f1: 48, level: 0.3 }); k.noise({ at, dur: 0.35, type: 'bandpass', f0: 3000, f1: 700, q: 0.9, level: 0.2 }); });
        k.tone({ at: 1.5, dur: 0.9, type: 'triangle', f0: 587, level: 0.06 });
      },
      // Crescent Night: a shimmer as the moon rises (0-.9s), oud-like plucks in a Hijaz run, a soft "ting" as each
      // lantern lights (.9s + .2s each) and a warm bell for RAMADAN KAREEM (1.7s).
      'victory-ramadan': (k) => {
        k.tone({ at: 0, dur: 3.0, type: 'sine', f0: 147, level: 0.05, attack: 0.8 });
        k.noise({ at: 0.1, dur: 0.8, type: 'bandpass', f0: 800, f1: 3500, q: 1.2, level: 0.08, attack: 0.6 });
        [294, 311, 370, 392, 440, 466, 587, 622].forEach((f, i) => { const at = 0.3 + i * 0.17; k.tone({ at, dur: 0.3, type: 'triangle', f0: f, level: 0.1 }); k.noise({ at, dur: 0.015, type: 'bandpass', f0: 2200, q: 3, level: 0.07 }); });
        for (let i = 0; i < 5; i++) k.tone({ at: 0.9 + i * 0.2, dur: 0.5, type: 'sine', f0: 1568 + i * 220, level: 0.07 });
        [392, 587, 784].forEach((f) => k.tone({ at: 1.7, dur: 1.4, type: 'sine', f0: f, level: 0.07, attack: 0.03 }));
        k.scatter(16, 1.2, 3.0, (at) => k.tone({ at, dur: 0.2, type: 'sine', f0: 2000 + Math.random() * 1500, level: 0.04 }));
      }
    };
    const JOKER_SOUNDS = {
      // Default: a card flip whoosh and a rising sparkle.
      default: (k) => {
        k.noise({ dur: 0.3, type: 'bandpass', f0: 700, f1: 3400, q: 1.1, level: 0.28, attack: 0.1 });
        k.tone({ at: 0.3, dur: 0.22, f0: 150, f1: 55, level: 0.4 });
        k.noise({ at: 0.3, dur: 0.05, type: 'bandpass', f0: 1600, q: 2, level: 0.3 });
        jokerChime(k, [784, 988, 1319, 1568, 2093], 0.33, 0.06, 0.1);
        k.tone({ at: 0.3, dur: 0.6, type: 'sine', f0: 1175, f1: 1760, level: 0.06, attack: 0.02 });
        k.scatter(10, 0.35, 0.95, (at) => k.tone({ at, dur: 0.1, type: 'triangle', f0: 2200 + Math.random() * 1400, level: 0.04 }));
      },
      // Jester's Grin: three mocking "ha" blips as the HA!s pop, bells on the hat.
      'joker-grin': (k) => {
        [0.3, 0.52, 0.74].forEach((at, i) => { k.tone({ at, dur: 0.11, type: 'square', f0: 620 - i * 60, f1: 420 - i * 60, level: 0.13 }); k.tone({ at: at + 0.09, dur: 0.1, type: 'square', f0: 560 - i * 60, f1: 380 - i * 60, level: 0.1 }); });
        k.scatter(6, 0.05, 0.3, (at) => k.tone({ at, dur: 0.18, type: 'triangle', f0: 2637 + Math.random() * 600, level: 0.06 }));
      },
      // Jack-in-the-Box: crank clicks, the lid clacks open, a big spring boing.
      'joker-jackbox': (k) => {
        // Crank clicks with a tinkling music-box tune while it winds, the lid clacks off at .4s, a big springy boing and a confetti pop.
        k.scatter(9, 0, 0.36, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 2400, q: 6, level: 0.3 }));
        [784, 880, 784, 659, 523, 659, 784].forEach((f, i) => k.tone({ at: 0.04 + i * 0.05, dur: 0.12, type: 'triangle', f0: f * 2, level: 0.06 }));
        k.noise({ at: 0.4, dur: 0.05, type: 'bandpass', f0: 900, q: 2, level: 0.45 });
        k.tone({ at: 0.4, dur: 0.7, f0: 140, f1: 560, level: 0.3, vibrato: 70 });
        k.tone({ at: 0.46, dur: 0.6, type: 'sine', f0: 280, f1: 840, level: 0.1, vibrato: 50 });
        k.scatter(8, 0.42, 0.9, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 4500, level: 0.12 }));
        k.tone({ at: 0.5, dur: 0.3, type: 'triangle', f0: 1568, level: 0.08 });
      },
      // Puppet Master: wooden clacks as it swings and a plucked string.
      'joker-puppet': (k) => {
        // Curtains swish open, the puppet drops on its strings, wooden stomps and plucked notes on each beat, curtains swish shut.
        k.noise({ dur: 0.3, type: 'bandpass', f0: 500, f1: 1800, q: 0.8, level: 0.25, attack: 0.1 });
        k.tone({ at: 0.28, dur: 0.1, f0: 300, f1: 140, level: 0.3 });
        [0.45, 0.66, 0.87, 1.08].forEach((at, i) => {
          k.noise({ at, dur: 0.04, type: 'bandpass', f0: 1200, q: 5, level: 0.4 });
          k.tone({ at, dur: 0.07, f0: 420, f1: 280, level: 0.14 });
          k.tone({ at: at + 0.02, dur: 0.3, type: 'triangle', f0: [392, 494, 587, 494][i], level: 0.1 });
        });
        k.tone({ at: 0.05, dur: 0.5, type: 'triangle', f0: 196, level: 0.1 });
        k.noise({ at: 1.18, dur: 0.28, type: 'bandpass', f0: 1800, f1: 400, q: 0.8, level: 0.22, attack: 0.05 });
      },
      // Magic Trick: three wand taps, a puff of smoke, then the reveal chime.
      'joker-magic': (k) => {
        // Three wand taps with a spark each, a rising shimmer, the poof of smoke at .5s, a thrown fan of cards and the reveal chord.
        [0.2, 0.31, 0.42].forEach((at) => { k.tone({ at, dur: 0.05, type: 'triangle', f0: 3000, level: 0.12 }); k.tone({ at, dur: 0.12, type: 'sine', f0: 2093, f1: 3136, level: 0.05 }); });
        k.tone({ at: 0.3, dur: 0.2, type: 'sine', f0: 600, f1: 2400, level: 0.06, attack: 0.1 });
        k.noise({ at: 0.5, dur: 0.4, type: 'lowpass', f0: 1800, f1: 200, level: 0.32, attack: 0.03 });
        k.tone({ at: 0.5, dur: 0.15, f0: 220, f1: 70, level: 0.3 });
        k.scatter(7, 0.54, 0.8, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 4000, level: 0.15 }));
        jokerChime(k, [1047, 1319, 1568, 2093], 0.6, 0.06, 0.1);
        k.scatter(8, 0.7, 1.2, (at) => k.tone({ at, dur: 0.12, type: 'triangle', f0: 2200 + Math.random() * 1600, level: 0.04 }));
      },
      // Glitch: digital blips at random pitches over a low buzz.
      'joker-glitch': (k) => {
        // Hard digital jumps on the same beats as the slices, a tape-stop dive, then a clean lock-in chime at ~.78s.
        k.tone({ dur: 0.75, type: 'sawtooth', f0: 70, f1: 45, level: 0.1, attack: 0.02 });
        [0.08, 0.14, 0.21, 0.29, 0.38, 0.51, 0.61, 0.7].forEach((at, i) => {
          k.tone({ at, dur: 0.045, type: 'square', f0: 180 + ((i * 397) % 1600), level: 0.1 });
          if (i % 2 === 0) k.noise({ at, dur: 0.07, type: 'highpass', f0: 3200, level: 0.22 });
        });
        k.tone({ at: 0.45, dur: 0.3, type: 'square', f0: 1600, f1: 90, level: 0.08 });
        k.noise({ at: 0.15, dur: 0.1, type: 'bandpass', f0: 5000, q: 3, level: 0.18 });
        k.tone({ at: 0.78, dur: 0.12, type: 'square', f0: 1568, level: 0.1 });
        jokerChime(k, [988, 1319, 1976], 0.8, 0.07, 0.1, 'square', 0.25);
        k.scatter(5, 0.95, 1.3, (at) => k.noise({ at, dur: 0.04, type: 'highpass', f0: 4000, level: 0.14 }));
      },
      // Card Storm: a rising gust of flapping cards and the snap into one.
      'joker-storm': (k) => {
        // A gust that rises and tightens with fluttering cards, an implosion at .66s, a bright snap and the cards thrown back out.
        k.noise({ dur: 0.68, type: 'bandpass', f0: 250, f1: 3200, q: 0.8, level: 0.34, attack: 0.35 });
        k.tone({ dur: 0.66, type: 'triangle', f0: 110, f1: 720, level: 0.1, attack: 0.3, vibrato: 30 });
        k.scatter(22, 0.04, 0.64, (at) => k.noise({ at, dur: 0.014, type: 'highpass', f0: 4200, level: 0.16 }));
        k.tone({ at: 0.66, dur: 0.3, f0: 190, f1: 50, level: 0.5 });
        k.noise({ at: 0.66, dur: 0.18, type: 'lowpass', f0: 3000, f1: 300, level: 0.35 });
        jokerChime(k, [880, 1319, 1760], 0.7, 0.06, 0.11);
        k.scatter(8, 0.7, 1.15, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 3800, level: 0.14 }));
      },
      // Hypnotist: a dreamy, wobbling drone, the watch ticking at each end
      // of its swing, and a low drop into "PICK IT UP".
      'joker-hypnotist': (k) => {
        k.tone({ dur: 1.3, f0: 330, f1: 220, level: 0.1, attack: 0.3, vibrato: 25 });
        k.tone({ dur: 1.3, type: 'triangle', f0: 333, f1: 223, level: 0.08, attack: 0.3, vibrato: 18 });
        [0.26, 0.53, 0.8, 1.08].forEach((at, i) => k.noise({ at, dur: 0.03, type: 'bandpass', f0: i % 2 ? 2600 : 3400, q: 8, level: 0.3 }));
        k.tone({ at: 0.8, dur: 0.5, f0: 196, f1: 98, level: 0.28, attack: 0.02 });
      },
      // Vampire: the cape's swoop, a dark organ chord as he appears, bat
      // squeaks and a low "mwahaha".
      'joker-vampire': (k) => {
        // The cape's swoop, a dark organ chord as he appears, a hiss as he draws back, a rushing lunge, the BITE at .73s (crunch, wet snap, low thud), blood drips, bat squeaks and a low laugh.
        k.noise({ dur: 0.4, type: 'bandpass', f0: 250, f1: 1400, q: 0.9, level: 0.5, attack: 0.12 });
        [147, 175, 220].forEach((f) => k.tone({ at: 0.3, dur: 0.95, type: 'triangle', f0: f, level: 0.07, attack: 0.05 }));
        k.noise({ at: 0.45, dur: 0.15, type: 'highpass', f0: 3500, level: 0.14 });
        k.noise({ at: 0.55, dur: 0.18, type: 'bandpass', f0: 400, f1: 2600, q: 1, level: 0.35, attack: 0.1 });
        k.noise({ at: 0.73, dur: 0.05, type: 'bandpass', f0: 2400, q: 2, level: 0.5 });
        k.tone({ at: 0.73, dur: 0.14, f0: 190, f1: 55, level: 0.5 });
        k.tone({ at: 0.74, dur: 0.07, type: 'square', f0: 900, f1: 300, level: 0.12 });
        k.scatter(4, 0.75, 0.85, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 3500, level: 0.15 }));
        [0.9, 1.0].forEach((at, i) => k.tone({ at, dur: 0.1, type: 'sine', f0: 1000 - i * 200, f1: 500, level: 0.07 }));
        k.scatter(8, 0.76, 1.3, (at) => k.tone({ at, dur: 0.05, f0: 3200 + Math.random() * 1800, f1: 4200 + Math.random() * 1500, level: 0.05 }));
        [1.02, 1.17, 1.32].forEach((at, i) => k.tone({ at, dur: 0.12, type: 'sawtooth', f0: 200 - i * 16, f1: 160 - i * 16, level: 0.2, vibrato: 12 }));
      },
      // Red Card: two short whistle blasts and a long one as the card goes
      // up, then the crowd and camera clicks.
      'joker-redcard': (k) => {
        [[0, 0.12], [0.17, 0.12], [0.36, 0.42]].forEach(([at, dur]) => {
          k.tone({ at, dur, f0: 2900, level: 0.24, vibrato: 140 });
          k.noise({ at, dur, type: 'bandpass', f0: 2900, q: 6, level: 0.12 });
        });
        k.noise({ at: 0.6, dur: 0.85, type: 'bandpass', f0: 700, f1: 900, q: 0.6, level: 0.42, attack: 0.2 });
        k.scatter(6, 0.56, 1.2, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 5000, level: 0.12 }));
      },
      // Portal: a rising warp as it opens, a swirling hum, a chime as the
      // Joker steps through, cards whipping in and the snap shut.
      'joker-portal': (k) => {
        k.tone({ dur: 0.35, type: 'sawtooth', f0: 90, f1: 700, level: 0.1, vibrato: 30 });
        k.noise({ dur: 1.3, type: 'bandpass', f0: 500, f1: 1500, q: 3, level: 0.16, attack: 0.25 });
        jokerChime(k, [1319, 1760, 2349], 0.3, 0.07, 0.08);
        k.scatter(8, 0.76, 1.2, (at) => k.noise({ at, dur: 0.03, type: 'highpass', f0: 3800, level: 0.16 }));
        k.tone({ at: 1.3, dur: 0.18, f0: 400, f1: 70, level: 0.35 });
      },
      // Pumpkin Joker: a spooky wobble as the pumpkin shakes, a whoosh as
      // the ghost bursts out, and the ghost's own voice: "Boooo!"
      'joker-halloween': (k) => {
        // A low creak and candle whoosh as the pumpkin rocks, a flare as the ghost is let out (.55s), a rising wail, bat squeaks, and the owner's crowd boo timed to the BOO word.
        k.tone({ dur: 0.5, type: 'triangle', f0: 330, f1: 220, level: 0.12, vibrato: 14, attack: 0.08 });
        k.tone({ at: 0.16, dur: 0.22, type: 'sawtooth', f0: 90, f1: 140, level: 0.06, vibrato: 20 });
        k.noise({ at: 0.46, dur: 0.3, type: 'bandpass', f0: 400, f1: 1800, q: 1.2, level: 0.2, attack: 0.06 });
        k.noise({ at: 0.68, dur: 0.12, type: 'bandpass', f0: 300, f1: 2400, q: 1.5, level: 0.3, attack: 0.02 });
        k.tone({ at: 0.58, dur: 0.6, type: 'sine', f0: 420, f1: 900, level: 0.07, vibrato: 30, attack: 0.15 });
        k.scatter(6, 0.66, 1.15, (at) => k.tone({ at, dur: 0.05, f0: 3400 + Math.random() * 1600, f1: 4400 + Math.random() * 1200, level: 0.05 }));
        // v287: the owner's crowd boo, loudest as the BOO word lands (~0.72s), silent by the end (1.5s).
        if (!k.clip('boo', 0.5, 0.6)) k.tone({ at: 0.55, dur: 0.55, f0: 140, f1: 260, level: 0.3, vibrato: 10, attack: 0.05 });
      },

      // Santa Joker: sleigh bells and three deep HO notes.
      'joker-christmas': (k) => {
        // A globe pops in, sleigh bells jingle with the shake, the glass shatters at .74s, a warm chord, then three "ho"s.
        k.tone({ dur: 0.18, type: 'sine', f0: 400, f1: 900, level: 0.08 });
        k.scatter(18, 0.18, 0.62, (at) => { k.tone({ at, dur: 0.12, type: 'triangle', f0: 3000 + Math.random() * 1400, level: 0.06 }); k.noise({ at, dur: 0.03, type: 'highpass', f0: 5200, level: 0.08 }); });
        k.noise({ at: 0.74, dur: 0.12, type: 'highpass', f0: 3000, level: 0.4 });
        k.scatter(9, 0.76, 1.0, (at) => k.tone({ at, dur: 0.15, type: 'sine', f0: 2800 + Math.random() * 2400, f1: 1800, level: 0.07 }));
        jokerChime(k, [523, 659, 784, 1047], 0.76, 0.08, 0.11);
        [0.86, 1.04, 1.22].forEach((at) => k.tone({ at, dur: 0.15, type: 'triangle', f0: 165, f1: 120, level: 0.22 }));
      },
      // Midnight Joker: quick 3-2-1 ticks, a cork pop and firework crackle.
      'joker-newyear': (k) => {
        // Clock ticks for 3-2-1, a bell at midnight, the cork pops, champagne fizz, three firework bursts and a bright chord.
        [0.02, 0.17, 0.32].forEach((at, i) => k.tone({ at, dur: 0.07, type: 'square', f0: 1500 - i * 100, level: 0.1 }));
        k.tone({ at: 0.5, dur: 0.6, type: 'sine', f0: 880, level: 0.14 });
        k.tone({ at: 0.52, dur: 0.07, type: 'square', f0: 700, f1: 140, level: 0.4 });
        k.noise({ at: 0.52, dur: 0.06, type: 'bandpass', f0: 1800, q: 2, level: 0.5 });
        k.noise({ at: 0.56, dur: 0.6, type: 'highpass', f0: 5000, level: 0.14, attack: 0.02 });
        [0.6, 0.69, 0.78].forEach((at) => { k.tone({ at, dur: 0.18, f0: 120, f1: 55, level: 0.3 }); k.scatter(7, at + 0.02, at + 0.28, (a) => k.noise({ at: a, dur: 0.015, type: 'highpass', f0: 4800, level: 0.16 })); });
        jokerChime(k, [784, 988, 1319, 1568], 0.56, 0.07, 0.1);
      },
      // Diya Joker: a soft chime for each lamp as it lights.
      'joker-diwali': (k) => {
        // A soft bell for each of twelve lamps as they light, a warm swell for the Joker, then the golden sparks crackling off.
        const pent = [523, 587, 659, 784, 880, 1047];
        for (let i = 0; i < 12; i++) k.tone({ at: 0.09 + i * 0.055, dur: 0.3, type: 'sine', f0: pent[i % 6] * (i > 5 ? 2 : 1), level: 0.08 });
        k.tone({ at: 0.12, dur: 1.0, type: 'triangle', f0: 262, f1: 330, level: 0.07, attack: 0.3 });
        k.noise({ at: 0.12, dur: 0.35, type: 'bandpass', f0: 500, f1: 2600, q: 1, level: 0.16, attack: 0.2 });
        jokerChime(k, [784, 988, 1319, 1568], 0.52, 0.07, 0.1);
        [0.62, 0.7, 0.78, 0.86].forEach((at) => { k.tone({ at, dur: 0.15, f0: 130, f1: 60, level: 0.25 }); k.scatter(6, at, at + 0.24, (a) => k.noise({ at: a, dur: 0.015, type: 'highpass', f0: 5000, level: 0.14 })); });
      },
      // Fortune Joker: a gong as the envelope opens and clinking coins.
      // London Calling (v438): Phone Box Prank. The box lands (.14s thud), the phone rings in six double-bursts (.2-.5s),
      // a bell-like ding as the Joker pops out at .58s, a swoosh and confetti ticks, then a cheeky two-note laugh.
      'joker-ldn-phonebox': (k) => {
        k.tone({ at: 0.12, dur: 0.16, f0: 130, f1: 48, level: 0.4, attack: 0.004 }); k.noise({ at: 0.12, dur: 0.06, type: 'bandpass', f0: 900, q: 1, level: 0.2 });
        for (let i = 0; i < 6; i++) { const at = 0.2 + i * 0.062; k.tone({ at, dur: 0.045, type: 'square', f0: 1400, f1: 1400, level: 0.1 }); k.tone({ at: at + 0.026, dur: 0.03, type: 'square', f0: 1750, f1: 1750, level: 0.08 }); }
        k.tone({ at: 0.58, dur: 0.5, type: 'triangle', f0: 1568, f1: 1560, level: 0.16 }); k.tone({ at: 0.58, dur: 0.5, type: 'sine', f0: 2349, f1: 2340, level: 0.07 });
        k.noise({ at: 0.58, dur: 0.22, type: 'bandpass', f0: 500, f1: 3500, q: 0.8, level: 0.18, attack: 0.08 });
        k.scatter(14, 0.62, 1.3, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 5500, level: 0.1 }));
        [0.8, 0.95].forEach((at, i) => k.tone({ at, dur: 0.13, type: 'sawtooth', f0: 330 - i * 70, f1: 300 - i * 80, level: 0.1 }));
      },
      'joker-lunar': (k) => {
        // Metal pings as the gold plate spins and slows, a clink and gong on landing at .73s, firecracker pops and falling coins.
        // The fortune cookie pops in, rattles, and cracks open at .22s as the plate rises out of it.
        k.tone({ at: 0, dur: 0.08, type: 'sine', f0: 300, f1: 520, level: 0.2 });
        k.scatter(4, 0.14, 0.21, (at) => k.noise({ at, dur: 0.012, type: 'bandpass', f0: 2200, q: 3, level: 0.16 }));
        k.noise({ at: 0.22, dur: 0.05, type: 'highpass', f0: 3500, level: 0.4 });
        k.tone({ at: 0.22, dur: 0.04, type: 'square', f0: 900, f1: 300, level: 0.12 });
        k.scatter(5, 0.24, 0.5, (at) => k.noise({ at, dur: 0.012, type: 'highpass', f0: 4200, level: 0.1 }));
        [0.26, 0.36, 0.46, 0.56, 0.68].forEach((at, i) => k.tone({ at, dur: 0.18, type: 'sine', f0: 1568 - i * 90, level: 0.1 - i * 0.012 }));
        k.noise({ at: 0.2, dur: 0.55, type: 'bandpass', f0: 600, f1: 1800, q: 1.2, level: 0.12, attack: 0.25 });
        k.tone({ at: 0.73, dur: 0.9, type: 'sine', f0: 196, f1: 180, level: 0.25 });
        k.tone({ at: 0.73, dur: 0.5, type: 'triangle', f0: 392, level: 0.12 });
        k.noise({ at: 0.73, dur: 0.06, type: 'highpass', f0: 3000, level: 0.35 });
        [0.78, 0.86].forEach((at) => k.scatter(7, at, at + 0.22, (a) => k.noise({ at: a, dur: 0.015, type: 'highpass', f0: 4800, level: 0.17 })));
        k.scatter(14, 0.75, 1.4, (at) => k.tone({ at, dur: 0.1, type: 'sine', f0: 2600 + Math.random() * 1400, level: 0.05 }));
      },
      // Cupid Joker: a harp flourish, the arrow's twang, a kiss.
      'joker-valentine': (k) => {
        // Heartbeat thumps (lub-dub, lub-dub), the arrow whooshing in and thunking home at .44s, the heart splits with a harp run, then a kiss.
        [0.12, 0.2, 0.28, 0.36].forEach((at, i) => k.tone({ at, dur: 0.1, f0: i % 2 ? 75 : 95, f1: 45, level: 0.42 }));
        k.noise({ at: 0.18, dur: 0.26, type: 'bandpass', f0: 500, f1: 3200, q: 1.2, level: 0.25, attack: 0.15 });
        k.tone({ at: 0.44, dur: 0.1, f0: 220, f1: 90, level: 0.4 });
        k.noise({ at: 0.44, dur: 0.04, type: 'bandpass', f0: 1400, q: 3, level: 0.4 });
        [1047, 1319, 1568, 1976, 2349, 2637].forEach((f, i) => k.tone({ at: 0.5 + i * 0.05, dur: 0.45, type: 'sine', f0: f, level: 0.09 }));
        k.noise({ at: 0.74, dur: 0.05, type: 'bandpass', f0: 1800, f1: 900, q: 4, level: 0.3 });
        k.tone({ at: 0.75, dur: 0.1, type: 'sine', f0: 1200, f1: 500, level: 0.2 });
      },
      // Egg Joker: three wobble knocks, a crack and a happy pop.
      'joker-easter': (k) => {
        [0.14, 0.26, 0.38].forEach((at) => k.tone({ at, dur: 0.06, f0: 300, f1: 200, level: 0.2 }));
        k.noise({ at: 0.52, dur: 0.12, type: 'highpass', f0: 2500, level: 0.35 });
        k.tone({ at: 0.56, dur: 0.18, f0: 500, f1: 1400, level: 0.18 });
      },
      // Beach Joker: the wave washing across and a gull-ish whistle.
      'joker-summer': (k) => {
        // Waves washing the whole way through, a bright ukulele-ish strum as the board rides in, a flip whoosh, a big splash on the landing.
        k.noise({ dur: 1.3, type: 'lowpass', f0: 900, f1: 500, level: 0.18, attack: 0.4 });
        [523, 659, 784, 659].forEach((f, i) => k.tone({ at: 0.26 + i * 0.12, dur: 0.22, type: 'triangle', f0: f, level: 0.13 }));
        k.noise({ at: 0.62, dur: 0.3, type: 'bandpass', f0: 600, f1: 2400, q: 1, level: 0.22, attack: 0.1 });
        k.noise({ at: 1.07, dur: 0.3, type: 'bandpass', f0: 1500, f1: 600, q: 0.7, level: 0.4 });
        k.tone({ at: 1.07, dur: 0.18, f0: 150, f1: 60, level: 0.35 });
        k.scatter(8, 1.1, 1.4, (at) => k.tone({ at, dur: 0.06, type: 'sine', f0: 1800 + Math.random() * 1600, level: 0.05 }));
        k.scatter(10, 0.3, 1.0, (at) => k.noise({ at, dur: 0.05, type: 'highpass', f0: 4500, level: 0.07 }));
      },
      // Lantern Joker: calm, soft bells as the lantern glows.
      'joker-ramadan': (k) => {
        // A calm pad that swells, soft bells as each lantern lowers (.1, .22), a chime run as the star turns, a gentle bell for the Joker and shimmer.
        k.tone({ dur: 1.4, type: 'triangle', f0: 196, f1: 220, level: 0.07, attack: 0.5 });
        k.tone({ dur: 1.4, type: 'sine', f0: 294, level: 0.05, attack: 0.5 });
        [0.1, 0.24, 0.38].forEach((at, i) => k.tone({ at, dur: 0.5, type: 'sine', f0: [880, 1175, 1397][i], level: 0.08 }));
        [523.25, 783.99, 1046.5].forEach((f, i) => k.tone({ at: 0.38 + i * 0.14, dur: 1.0, f0: f, level: 0.12 / (i + 1), attack: 0.02 }));
        k.scatter(10, 0.1, 1.2, (at) => k.tone({ at, dur: 0.2, type: 'sine', f0: 2800 + Math.random() * 1800, level: 0.035 }));
      },
    };

    const audio = new SoundFX();
  