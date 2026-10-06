
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
      default: (k) => (window.ShLevel3D ? ShLevel3D.sound('default', k) : fireWhoosh(k)),
      // Coloured Flame: the fire, plus a rising shimmer of colour.
      'burn-coloured': (k) => { if (window.ShLevel3D) return ShLevel3D.sound('burn-coloured', k); fireWhoosh(k, 0.8); [660, 880, 1108, 1320, 1760].forEach((f, i) => k.tone({ at: 0.1 + i * 0.06, dur: 0.35, type: 'triangle', f0: f, level: 0.1 })); },
      // Ice Shatter: a sharp crack and falling glassy pings.
      'burn-ice': (k) => {
        k.tone({ dur: 0.09, type: 'square', f0: 220, f1: 60, level: 0.25 });
        k.noise({ dur: 0.2, type: 'highpass', f0: 2500, f1: 6000, level: 0.4 });
        k.scatter(9, 0.03, 0.45, (at) => k.tone({ at, dur: 0.3, f0: 2200 + Math.random() * 2600, level: 0.09 }));
      },
      // Electric Blast: a falling zap, mains buzz and sparks.
      'burn-electric': (k) => {
        if (window.ShLevel3D) return ShLevel3D.sound('burn-electric', k);
        k.tone({ dur: 0.35, type: 'sawtooth', f0: 1400, f1: 70, level: 0.32 });
        k.tone({ dur: 0.45, type: 'square', f0: 60, f1: 55, level: 0.14 });
        k.scatter(14, 0, 0.5, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 4000, q: 4, level: 0.5 }));
      },
      // Paint Splats: three wet splats.
      'burn-paint': (k) => [0, 0.14, 0.3].forEach((at, i) => {
        k.noise({ at, dur: 0.2, f0: 1200 - i * 200, f1: 180, level: 0.5 });
        k.tone({ at, dur: 0.12, f0: 170 - i * 20, f1: 60, level: 0.35 });
      }),
      // Stupendous Confectionery: a scatter of candy pops and a sparkle.
      'burn-sweets': (k) => { if (window.ShLevel3D) return ShLevel3D.sound('burn-sweets', k); popBurst(k, [0, 0.09, 0.16, 0.27, 0.35, 0.47, 0.55], 1.1); k.tone({ at: 0.5, dur: 0.4, type: 'triangle', f0: 2093, level: 0.08 }); },
      // Smoke Show: a slow, soft puff with a low rumble.
      'burn-smoke': (k) => {
        k.noise({ dur: 1.2, type: 'bandpass', f0: 420, f1: 160, q: 0.7, level: 0.45, attack: 0.3 });
        k.tone({ dur: 1.0, f0: 58, f1: 45, level: 0.25, attack: 0.2 });
      },
      // Black Hole: a deep pull that sinks as the cards spiral in (streaks
      // for each card), then the pop at 1.05s and twinkling starlight.
      'burn-blackhole': (k) => {
        k.tone({ dur: 1.05, f0: 90, f1: 32, level: 0.42, attack: 0.25, vibrato: 4 });
        k.noise({ dur: 1.0, type: 'bandpass', f0: 2400, f1: 180, q: 1.4, level: 0.3, attack: 0.35 });
        k.scatter(8, 0.15, 0.95, (at) => k.tone({ at, dur: 0.14, type: 'triangle', f0: 1400 + Math.random() * 600, f1: 300, level: 0.05 }));
        k.tone({ at: 1.06, dur: 0.12, f0: 180, f1: 1800, level: 0.3 });
        k.noise({ at: 1.06, dur: 0.25, type: 'highpass', f0: 3000, f1: 7000, level: 0.2 });
        k.scatter(10, 1.1, 1.6, (at) => k.tone({ at, dur: 0.3, type: 'triangle', f0: 2000 + Math.random() * 2500, level: 0.06 }));
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
      // Pixel Blast: two 8-bit blips as the card pixelates, a crunchy
      // chiptune boom at 0.2s and a falling arpeggio as the pixels scatter.
      'burn-pixel': (k) => {
        k.tone({ dur: 0.07, type: 'square', f0: 880, level: 0.12 });
        k.tone({ at: 0.09, dur: 0.07, type: 'square', f0: 660, level: 0.12 });
        k.noise({ at: 0.2, dur: 0.55, type: 'lowpass', f0: 3000, f1: 150, q: 0.7, level: 0.5 });
        k.tone({ at: 0.2, dur: 0.45, type: 'square', f0: 220, f1: 40, level: 0.18 });
        [1047, 784, 659, 523, 392].forEach((f, i) => k.tone({ at: 0.32 + i * 0.08, dur: 0.07, type: 'square', f0: f, level: 0.08 }));
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
      // Level burns v294: shared visual/audio timing in the layered renderer.
      'burn-lvl-spark-snap': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-spark-snap', k) : ShLevelBurns.sound('burn-lvl-spark-snap', k)),
      'burn-lvl-smoke-burst': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-smoke-burst', k) : ShLevelBurns.sound('burn-lvl-smoke-burst', k)),
      'burn-lvl-inferno-sweep': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-inferno-sweep', k) : ShLevelBurns.sound('burn-lvl-inferno-sweep', k)),
      'burn-lvl-hellfire-spiral': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-hellfire-spiral', k) : ShLevelBurns.sound('burn-lvl-hellfire-spiral', k)),
      'burn-lvl-royal-incineration': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-royal-incineration', k) : ShLevelBurns.sound('burn-lvl-royal-incineration', k)),
      'burn-lvl-shitstorm': k => (window.ShLevel3D ? ShLevel3D.sound('burn-lvl-shitstorm', k) : ShLevelBurns.sound('burn-lvl-shitstorm', k)),
      // Seasonal burns
      'burn-valentine': (k) => { fireWhoosh(k, 0.5); [784, 988, 1175].forEach((f, i) => k.tone({ at: 0.08 + i * 0.1, dur: 0.5, type: 'triangle', f0: f, level: 0.12 })); },
      // Cannonball: a deep plunk into the water and a big splash (flash +
      // first ripple), a second wash with the second ripple (0.22s), then
      // the thrown droplets pattering back down over the next second.
      'burn-summer': (k) => {
        k.tone({ dur: 0.2, f0: 320, f1: 65, level: 0.38 });
        k.tone({ at: 0.02, dur: 0.09, f0: 420, f1: 950, level: 0.1 });
        k.noise({ dur: 0.5, type: 'bandpass', f0: 2600, f1: 700, q: 0.8, level: 0.42, attack: 0.005 });
        k.noise({ at: 0.22, dur: 0.38, f0: 1800, f1: 400, level: 0.25, attack: 0.02 });
        k.scatter(14, 0.35, 1.05, (at) => k.tone({ at, dur: 0.05, f0: 900 + Math.random() * 1300, f1: 1600 + Math.random() * 1600, level: 0.07 }));
      },
      'burn-halloween': k => window.ShLevel3D && ShLevel3D.sound('burn-halloween', k),
      'burn-diwali': (k) => {
        k.tone({ dur: 0.3, f0: 180, f1: 45, level: 0.5 });
        k.noise({ dur: 0.25, f0: 1500, f1: 200, level: 0.35 });
        k.scatter(22, 0.2, 1.2, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 4500, level: 0.25 }));
      },
      'burn-christmas': (k) => {
        fireWhoosh(k, 0.5);
        [0.05, 0.17, 0.29, 0.41, 0.53].forEach((at) => [2637, 3136, 3951].forEach((f) => k.tone({ at: at + Math.random() * 0.02, dur: 0.18, type: 'triangle', f0: f, level: 0.05 })));
      },
      'burn-newyear': (k) => {
        k.tone({ dur: 0.45, f0: 700, f1: 2600, level: 0.1, attack: 0.05 });
        k.tone({ at: 0.45, dur: 0.35, f0: 120, f1: 40, level: 0.55 });
        k.noise({ at: 0.45, dur: 0.4, f0: 2000, f1: 200, level: 0.4 });
        k.scatter(18, 0.55, 1.3, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 5000, level: 0.2 }));
      },
      'burn-easter': (k) => { popBurst(k, [0, 0.12, 0.22, 0.36], 1.3, 0.2); [1047, 1319].forEach((f, i) => k.tone({ at: 0.35 + i * 0.08, dur: 0.4, type: 'triangle', f0: f, level: 0.1 })); },
      'burn-lunar': (k) => k.scatter(12, 0, 0.9, (at) => {
        k.noise({ at, dur: 0.035, type: 'bandpass', f0: 1800, q: 1.5, level: 0.55 });
        k.tone({ at, dur: 0.05, f0: 300, f1: 90, level: 0.25 });
      }),
      'burn-ramadan': (k) => { fireWhoosh(k, 0.35); [523.25, 1046.5, 1568].forEach((f, i) => k.tone({ dur: 1.4, f0: f, level: 0.14 / (i + 1), attack: 0.01 })); }
    };

    // Joker effect sounds, keyed by Joker effect id and timed to each
    // animation's beats (JOKER_FX_MS = 1.5s): same loudness as the burns.
    const jokerChime = ({ tone }, notes, at = 0, gap = 0.07, level = 0.12, type = 'triangle', dur = 0.35) =>
      notes.forEach((f, i) => tone({ at: at + i * gap, dur, type, f0: f, level }));
    const JOKER_SOUNDS = {
      // Default: a card flip whoosh and a rising sparkle.
      default: (k) => { k.noise({ dur: 0.25, type: 'bandpass', f0: 900, f1: 3200, q: 1.2, level: 0.3 }); k.tone({ dur: 0.2, f0: 140, f1: 60, level: 0.35 }); jokerChime(k, [784, 988, 1319, 1568], 0.14); },
      // Jester's Grin: three mocking "ha" blips as the HA!s pop, bells on the hat.
      'joker-grin': (k) => {
        [0.3, 0.52, 0.74].forEach((at, i) => { k.tone({ at, dur: 0.11, type: 'square', f0: 620 - i * 60, f1: 420 - i * 60, level: 0.13 }); k.tone({ at: at + 0.09, dur: 0.1, type: 'square', f0: 560 - i * 60, f1: 380 - i * 60, level: 0.1 }); });
        k.scatter(6, 0.05, 0.3, (at) => k.tone({ at, dur: 0.18, type: 'triangle', f0: 2637 + Math.random() * 600, level: 0.06 }));
      },
      // Jack-in-the-Box: crank clicks, the lid clacks open, a big spring boing.
      'joker-jackbox': (k) => {
        k.scatter(5, 0, 0.18, (at) => k.noise({ at, dur: 0.02, type: 'bandpass', f0: 2400, q: 6, level: 0.35 }));
        k.noise({ at: 0.22, dur: 0.05, type: 'bandpass', f0: 900, q: 2, level: 0.4 });
        k.tone({ at: 0.24, dur: 0.6, f0: 160, f1: 520, level: 0.3, vibrato: 60 });
      },
      // Puppet Master: wooden clacks as it swings and a plucked string.
      'joker-puppet': (k) => {
        [0.28, 0.5, 0.72, 0.94].forEach((at) => { k.noise({ at, dur: 0.04, type: 'bandpass', f0: 1300, q: 5, level: 0.4 }); k.tone({ at, dur: 0.06, f0: 420, f1: 300, level: 0.12 }); });
        k.tone({ at: 0.05, dur: 0.5, type: 'triangle', f0: 196, level: 0.14 });
      },
      // Magic Trick: three wand taps, a puff of smoke, then the reveal chime.
      'joker-magic': (k) => {
        [0.2, 0.32, 0.44].forEach((at) => k.tone({ at, dur: 0.05, type: 'triangle', f0: 3000, level: 0.12 }));
        k.noise({ at: 0.6, dur: 0.35, type: 'lowpass', f0: 1200, f1: 200, level: 0.3, attack: 0.03 });
        jokerChime(k, [1047, 1319, 1568, 2093], 0.68, 0.06, 0.1);
      },
      // Glitch: digital blips at random pitches over a low buzz.
      'joker-glitch': (k) => {
        k.tone({ dur: 1.2, type: 'sawtooth', f0: 55, f1: 50, level: 0.08, attack: 0.02 });
        k.scatter(12, 0.02, 1.1, (at) => k.tone({ at, dur: 0.04, type: 'square', f0: 200 + Math.random() * 1800, level: 0.1 }));
        k.scatter(5, 0.05, 1.0, (at) => k.noise({ at, dur: 0.06, type: 'highpass', f0: 3000, level: 0.2 }));
      },
      // Card Storm: a rising gust of flapping cards and the snap into one.
      'joker-storm': (k) => {
        k.noise({ dur: 0.62, type: 'bandpass', f0: 300, f1: 2800, q: 0.8, level: 0.35, attack: 0.3 });
        k.scatter(14, 0.05, 0.6, (at) => k.noise({ at, dur: 0.015, type: 'highpass', f0: 4200, level: 0.18 }));
        k.tone({ at: 0.64, dur: 0.22, f0: 180, f1: 60, level: 0.45 });
        jokerChime(k, [880, 1319], 0.68, 0.06, 0.1);
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
        k.noise({ dur: 0.4, type: 'bandpass', f0: 250, f1: 1400, q: 0.9, level: 0.6, attack: 0.12 });
        [147, 175, 220].forEach((f) => k.tone({ at: 0.3, dur: 0.95, type: 'triangle', f0: f, level: 0.07, attack: 0.05 }));
        k.scatter(10, 0.45, 1.3, (at) => k.tone({ at, dur: 0.05, f0: 3200 + Math.random() * 1800, f1: 4200 + Math.random() * 1500, level: 0.05 }));
        [0.58, 0.74, 0.9, 1.06].forEach((at, i) => k.tone({ at, dur: 0.12, type: 'sawtooth', f0: 210 - i * 14, f1: 170 - i * 14, level: 0.26, vibrato: 12 }));
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
        k.tone({ dur: 0.5, type: 'triangle', f0: 330, f1: 220, level: 0.12, vibrato: 14, attack: 0.08 });
        k.noise({ at: 0.46, dur: 0.3, type: 'bandpass', f0: 400, f1: 1800, q: 1.2, level: 0.2, attack: 0.06 });
        // v287: the owner's crowd boo, loudest as the BOO word lands (~0.72s), silent by the end (1.5s).
        if (!k.clip('boo', 0.5, 0.6)) k.tone({ at: 0.55, dur: 0.55, f0: 140, f1: 260, level: 0.3, vibrato: 10, attack: 0.05 });
      },
      // Santa Joker: sleigh bells and three deep HO notes.
      'joker-christmas': (k) => {
        k.scatter(14, 0, 1.1, (at) => k.tone({ at, dur: 0.12, type: 'triangle', f0: 2637 + Math.random() * 900, level: 0.05 }));
        [0.32, 0.5, 0.68].forEach((at) => k.tone({ at, dur: 0.16, f0: 150, f1: 120, level: 0.32 }));
      },
      // Midnight Joker: quick 3-2-1 ticks, a cork pop and firework crackle.
      'joker-newyear': (k) => {
        [0, 0.17, 0.34].forEach((at, i) => k.tone({ at, dur: 0.07, type: 'square', f0: 900 + i * 150, level: 0.12 }));
        k.tone({ at: 0.52, dur: 0.08, f0: 900, f1: 220, level: 0.4 });
        k.noise({ at: 0.52, dur: 0.3, type: 'highpass', f0: 2500, f1: 6000, level: 0.2 });
        k.scatter(16, 0.6, 1.2, (at) => k.noise({ at, dur: 0.02, type: 'highpass', f0: 5000, level: 0.18 }));
      },
      // Diya Joker: a soft chime for each lamp as it lights.
      'joker-diwali': (k) => {
        [523, 587, 659, 784, 880, 988, 1047, 1175, 1319, 1568].forEach((f, i) => k.tone({ at: 0.06 + i * 0.055, dur: 0.35, type: 'triangle', f0: f, level: 0.07 }));
        k.noise({ at: 0.62, dur: 0.4, type: 'highpass', f0: 4000, level: 0.12, attack: 0.05 });
      },
      // Fortune Joker: a gong as the envelope opens and clinking coins.
      'joker-lunar': (k) => {
        k.tone({ at: 0.28, dur: 1.1, f0: 110, f1: 104, level: 0.3, attack: 0.01 });
        k.tone({ at: 0.28, dur: 0.9, f0: 247, f1: 240, level: 0.12 });
        k.scatter(10, 0.52, 1.15, (at) => k.tone({ at, dur: 0.12, type: 'triangle', f0: 3000 + Math.random() * 1500, level: 0.07 }));
      },
      // Cupid Joker: a harp flourish, the arrow's twang, a kiss.
      'joker-valentine': (k) => {
        jokerChime(k, [523, 659, 784, 1047, 1319], 0.02, 0.05, 0.08);
        k.tone({ at: 0.6, dur: 0.18, type: 'triangle', f0: 220, f1: 180, level: 0.2 });
        k.noise({ at: 0.6, dur: 0.2, type: 'highpass', f0: 2000, f1: 5000, level: 0.12 });
        k.tone({ at: 0.66, dur: 0.1, f0: 1400, f1: 2400, level: 0.12 });
      },
      // Egg Joker: three wobble knocks, a crack and a happy pop.
      'joker-easter': (k) => {
        [0.14, 0.26, 0.38].forEach((at) => k.tone({ at, dur: 0.06, f0: 300, f1: 200, level: 0.2 }));
        k.noise({ at: 0.52, dur: 0.12, type: 'highpass', f0: 2500, level: 0.35 });
        k.tone({ at: 0.56, dur: 0.18, f0: 500, f1: 1400, level: 0.18 });
      },
      // Beach Joker: the wave washing across and a gull-ish whistle.
      'joker-summer': (k) => {
        k.noise({ dur: 1.3, type: 'lowpass', f0: 500, f1: 1800, level: 0.3, attack: 0.4 });
        k.tone({ at: 0.35, dur: 0.3, f0: 1800, f1: 2600, level: 0.06 });
        k.tone({ at: 0.7, dur: 0.3, f0: 2400, f1: 1600, level: 0.06 });
      },
      // Lantern Joker: calm, soft bells as the lantern glows.
      'joker-ramadan': (k) => [523.25, 783.99, 1046.5].forEach((f, i) => k.tone({ at: 0.3 + i * 0.14, dur: 1.0, f0: f, level: 0.12 / (i + 1), attack: 0.02 }))
    };

    const audio = new SoundFX();
  