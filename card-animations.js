
    // The one correct way to find where a card-flight animation should
    // land/originate for a given player. Previously, every call site did
    // this inline as `player.id === localPlayerId ? localHand :
    // opponentsContainer` — landing every OTHER player's animation on the
    // shared opponents row itself rather than that specific opponent's own
    // card stack, since there was no per-opponent element to target. With
    // 2+ opponents this meant the flight visually landed on whichever
    // opponent happened to sit at whatever point inside that shared
    // container the animation resolved to — not necessarily, and often not,
    // the player who actually acted. Each opponent's div now has a real
    // id (`opp-${player.id}`, set in render()), so this can target the
    // right one directly; the shared container is only a fallback for the
    // brief moment before that player's own div exists in the DOM.
    function getPlayerAnimationTarget(playerId) {
      if (playerId === state.localPlayerId) return document.getElementById('localHand');
      return document.getElementById(`opp-${playerId}`) || document.getElementById('opponentsContainer');
    }

    // JS twin of the CSS motion curves (see :root --ease-*).
    const EASE = (() => {
      const spring = 'linear(0, 0.009, 0.035 2.1%, 0.141, 0.281 6.7%, 0.723 12.9%, 0.938 16.7%, 1.017, 1.077, 1.121, 1.149 24.3%, 1.159, 1.163, 1.161, 1.154 29.9%, 1.129 32.8%, 1.051 39.6%, 1.017 43.1%, 0.991, 0.977 51%, 0.974 53.8%, 0.975 57.1%, 0.997 69.8%, 1.003 76.9%, 1)';
      let springOk = false;
      try { springOk = typeof CSS !== 'undefined' && CSS.supports('transition-timing-function', 'linear(0, 1)'); } catch (e) {}
      const bouncy = 'cubic-bezier(.34,1.56,.64,1)';
      return { snappy: 'cubic-bezier(.2,.9,.3,1)', bouncy, soft: 'cubic-bezier(.22,1,.36,1)', spring: springOk ? spring : bouncy };
    })();
    const motionOff = () => (typeof reduceMotion !== 'undefined' && reduceMotion) || (typeof devTestSuiteRunning !== 'undefined' && devTestSuiteRunning);

    // Picking up the pile: the cards fly into that player's seat as a
    // quick fan of card backs rather than one blob.
    function spawnPickupFan(fromEl, toEl, count) {
      if (!fromEl || !toEl || motionOff() || typeof Element.prototype.animate !== 'function') { spawnCardFlight(fromEl, toEl, count); return; }
      const f = fromEl.getBoundingClientRect(), t = toEl.getBoundingClientRect();
      const n = Math.min(Math.max(count, 1), 7);
      const backTemplate = document.querySelector('.custom-card-back');
      const w = 34, h = 49;
      for (let i = 0; i < n; i++) {
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;z-index:190;pointer-events:none;width:${w}px;height:${h}px;left:${f.left + f.width / 2 - w / 2}px;top:${f.top + f.height / 2 - h / 2}px;border-radius:6px;overflow:hidden;box-shadow:0 6px 12px rgba(0,0,0,.45);`;
        if (backTemplate) { const b = backTemplate.cloneNode(true); b.style.cssText += ';width:100%;height:100%;position:absolute;inset:0;margin:0;'; el.appendChild(b); }
        else el.style.background = 'linear-gradient(135deg,#1e293b,#0f172a)';
        document.body.appendChild(el);
        const spread = (i - (n - 1) / 2) * 14;
        const dx = t.left + t.width / 2 - (f.left + f.width / 2), dy = t.top + t.height / 2 - (f.top + f.height / 2);
        el.animate([
          { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
          { transform: `translate(${spread * 1.6}px, ${-18 - Math.abs(spread) * .3}px) rotate(${spread}deg) scale(1.05)`, opacity: 1, offset: .3 },
          { transform: `translate(${dx + spread * .5}px, ${dy}px) rotate(${spread * .4}deg) scale(.55)`, opacity: .15 }
        ], { duration: 520, delay: i * 45, easing: EASE.soft, fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
      }
    }

    // Spending in the Shop: Diamonds pop out of the header balance and get
    // tossed away, spinning off the bottom of the screen, while the pill dips.
    function spawnDiamondSpend(balanceEl, count = 9) {
      if (!balanceEl || motionOff() || typeof Element.prototype.animate !== 'function') return;
      const icon = balanceEl.querySelector('span') || balanceEl;
      const r = icon.getBoundingClientRect();
      const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
      const fall = window.innerHeight - y0 + 60;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.textContent = '💎';
        el.style.cssText = `position:fixed;z-index:200;pointer-events:none;left:${x0 - 8}px;top:${y0 - 8}px;font-size:16px;line-height:16px;`;
        document.body.appendChild(el);
        const side = (Math.random() * 2 - 1);                // left/right toss
        const vx = side * (60 + Math.random() * 120);
        const peak = -(30 + Math.random() * 45);              // pops up first
        const spin = (Math.random() < .5 ? -1 : 1) * (360 + Math.random() * 360);
        el.animate([
          { transform: 'translate(0,0) rotate(0deg) scale(.6)', opacity: 0 },
          { transform: `translate(${vx * .3}px, ${peak}px) rotate(${spin * .25}deg) scale(1.1)`, opacity: 1, offset: .22, easing: 'cubic-bezier(.3,0,.6,1)' },
          { transform: `translate(${vx}px, ${fall}px) rotate(${spin}deg) scale(.9)`, opacity: .9 }
        ], { duration: 1000 + Math.random() * 350, delay: i * 45, easing: 'linear', fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
      }
      balanceEl.animate([{ scale: 1 }, { scale: .86 }, { scale: 1 }], { duration: 480, easing: EASE.spring });
    }

    // Earning Diamonds: they appear mid-screen and stream up into the header
    // balance, which bumps as they land (the mirror of spawnDiamondSpend).
    function spawnDiamondGain(balanceEl, amount) {
      if (!balanceEl || motionOff() || typeof Element.prototype.animate !== 'function') return;
      const count = Math.max(4, Math.min(12, Math.round(Math.log2(Math.max(2, amount)) * 1.6)));
      const t = (balanceEl.querySelector('span') || balanceEl).getBoundingClientRect();
      const tx = t.left + t.width / 2, ty = t.top + t.height / 2;
      for (let i = 0; i < count; i++) {
        const el = document.createElement('div');
        el.textContent = '💎';
        const x0 = innerWidth * (.3 + Math.random() * .4), y0 = innerHeight * (.28 + Math.random() * .14);
        el.style.cssText = `position:fixed;z-index:200;pointer-events:none;left:${x0 - 9}px;top:${y0 - 9}px;font-size:18px;line-height:18px;`;
        document.body.appendChild(el);
        el.animate([
          { transform: 'translate(0,0) scale(.2)', opacity: 0 },
          { transform: `translate(${(Math.random() - .5) * 30}px, ${-10 - Math.random() * 20}px) scale(1.15)`, opacity: 1, offset: .25 },
          { transform: `translate(${tx - x0}px, ${ty - y0}px) scale(.55)`, opacity: .9 }
        ], { duration: 850, delay: i * 55, easing: EASE.soft, fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
      }
      setTimeout(() => balanceEl.animate([{ scale: 1 }, { scale: 1.2 }, { scale: 1 }], { duration: 420, easing: EASE.spring }), 850 + count * 55 - 150);
    }

    // Pop-ups and pages spring in when they open (see watchOverlayEntrances).
    function springIn(panel) {
      if (!panel || motionOff() || typeof panel.animate !== 'function') return;
      panel.animate([{ opacity: 0, scale: .94, translate: '0 10px' }, { opacity: 1, scale: 1, translate: '0 0' }], { duration: 420, easing: EASE.spring });
    }

    // Tab strips: one highlight pill glides to whichever tab is selected.
    function attachTabGlide(strip) {
      const wrap = strip.closest('.hscroll-wrap');
      if (!wrap || wrap.querySelector(':scope > .tab-glide')) return;
      const pill = document.createElement('div');
      pill.className = 'tab-glide';
      wrap.appendChild(pill);
      wrap.classList.add('has-glide');
      let placed = false;
      const place = () => {
        const tab = strip.querySelector('[aria-selected="true"]');
        if (!tab || !strip.clientWidth) { pill.style.opacity = '0'; return; }
        const wr = wrap.getBoundingClientRect(), tr = tab.getBoundingClientRect();
        // Pages spring in with a scale: measured mid-animation the rects are
        // scaled, so convert back to the wrap's own (unscaled) pixels.
        const k = wrap.offsetWidth ? (wr.width / wrap.offsetWidth) || 1 : 1;
        if (!placed || motionOff()) pill.style.transition = 'none';
        pill.style.left = `${(tr.left - wr.left) / k}px`;
        pill.style.top = `${(tr.top - wr.top) / k}px`;
        pill.style.width = `${tr.width / k}px`;
        pill.style.height = `${tr.height / k}px`;
        pill.style.opacity = '1';
        if (!placed || motionOff()) { void pill.offsetWidth; pill.style.transition = ''; }
        placed = true;
      };
      new MutationObserver(() => requestAnimationFrame(place)).observe(strip, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
      strip.addEventListener('scroll', () => { const t = pill.style.transition; pill.style.transition = 'none'; place(); void pill.offsetWidth; pill.style.transition = t; }, { passive: true });
      window.addEventListener('resize', () => { placed = false; place(); });
      // Strips are often built while hidden: re-place once they show.
      if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => { if (!placed || pill.style.opacity === '0') { placed = false; place(); } }).observe(strip);
      requestAnimationFrame(place);
    }

    function spawnCardFlight(fromEl, toEl, count = 1, cardData = null) {
      // CSS shortening the transition still leaves a ghost card over the pile.
      // Reduced motion renders the updated cards directly, without projectiles.
      if (!fromEl || !toEl || motionOff()) return;
      const layer = document.getElementById('flightLayer');
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();

      const numProjectiles = Math.min(Math.max(count, 1), 5);
      
      for (let i = 0; i < numProjectiles; i++) {
        setTimeout(() => {
          if (motionOff()) return; // The preference may change during a staggered flight.
          const el = document.createElement('div');
          el.className = 'flying-card card-opponent-slot rounded-lg bg-amber-500/90 border border-amber-300 shadow-2xl flex items-center justify-center text-slate-950 font-black';
          el.style.left = `${fromRect.left + (fromRect.width / 2) - 18}px`;
          el.style.top = `${fromRect.top + (fromRect.height / 2) - 26}px`;
          el.textContent = cardData ? cardData.rank : '🂠';

          layer.appendChild(el);
          el.getBoundingClientRect();

          const duration = 0.35;
          el.style.transitionDuration = `${duration}s`;
          el.style.left = `${toRect.left + (toRect.width / 2) - 18}px`;
          el.style.top = `${toRect.top + (toRect.height / 2) - 26}px`;
          el.style.transform = `rotate(${(Math.random() * 30) - 15}deg) scale(0.9)`;
          el.style.opacity = '0.9';

          setTimeout(() => el.remove(), duration * 1000);
        }, i * 40);
      }
    }

    // Blind (face-down) flips get a short, tense reveal before the play
    // applies: the card rises over the pile, the table dims, it wobbles and
    // turns edge-on... then snaps over, glowing green if it can be played
    // or red if it forces a pickup. Yours ~1.2s, bots ~0.8s so a run of
    // bot flips doesn't drag. Off for the tutorial (scripted), Reduce
    // Motion, fast-forward and the test suite: those flip instantly.
    const BLIND_REVEAL_MS = { self: 1200, other: 800 };
    function shouldRevealBlind() {
      if (typeof devTestSuiteRunning !== 'undefined' && devTestSuiteRunning) return false;
      if (typeof tutorialActive !== 'undefined' && tutorialActive) return false;
      if (typeof reduceMotion !== 'undefined' && reduceMotion) return false;
      if (state.isFastForwarding) return false;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
      return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
    }
    // The face-down card element a blind play comes from (by its fixed slot).
    function blindSlotElement(playerId, card) {
      const owner = state.players.find(p => p.id === playerId);
      if (!owner || !card) return null;
      const slot = buildFixedSlots(owner.faceDown || []).findIndex(c => c && c.id === card.id);
      if (slot < 0) return null;
      const scope = playerId === state.localPlayerId ? '#localTableSlots' : `#opp-${CSS.escape(playerId)}`;
      const el = document.querySelector(`${scope} .custom-card-back[data-slot="${slot}"]`);
      return el && el.getBoundingClientRect().width > 0 ? el : null;
    }
    // opts (another player's flip, broadcast through the room): { good, ms }.
    function playBlindReveal(playerId, card, done, opts = {}) {
      let finished = false;
      // Apply the play first (the pile renders underneath), then fade the
      // reveal card away over it, so nothing blinks or jumps.
      const finish = () => {
        if (finished) return; finished = true;
        done();
        wrap.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: 'ease-out', fill: 'forwards' });
        dim.style.opacity = '0';
        setTimeout(cleanup, 180);
      };
      const pile = document.getElementById('discardPileContainer');
      // The flipped card itself travels: find its face-down slot so the
      // reveal starts there (same size) and the slot card is hidden meanwhile.
      const slotCard = blindSlotElement(playerId, card);
      const origin = slotCard || getPlayerAnimationTarget(playerId);
      const layer = document.body;
      if (!pile) { done(); return; }
      const isSelf = playerId === state.localPlayerId;
      const total = opts.ms || (isSelf ? BLIND_REVEAL_MS.self : BLIND_REVEAL_MS.other);
      const good = typeof opts.good === 'boolean' ? opts.good : isPlayLegal(card, state.discardPile, state.activeConstraint);
      const p = pile.getBoundingClientRect();
      const o = origin ? origin.getBoundingClientRect() : p;
      const w = p.width, h = p.height;
      const endX = p.left, endY = p.top;
      const startX = o.left + o.width / 2 - w / 2, startY = o.top + o.height / 2 - h / 2;
      const startScale = slotCard ? Math.max(0.4, Math.min(1.6, o.width / w)) : 0.8;

      const dim = document.createElement('div');
      dim.className = 'blind-reveal-dim';
      dim.style.setProperty('--rx', `${p.left + w / 2}px`);
      dim.style.setProperty('--ry', `${p.top + h / 2}px`);
      const wrap = document.createElement('div');
      wrap.className = 'blind-reveal-card';
      wrap.style.cssText += `left:${endX}px;top:${endY}px;width:${w}px;height:${h}px;`;
      const inner = document.createElement('div');
      inner.className = 'blind-reveal-inner';
      const back = document.createElement('div');
      back.className = 'blind-reveal-face blind-reveal-back';
      const existingBack = slotCard || (isSelf ? document.querySelector('#localTableSlots .custom-card-back') : document.querySelector(`#opp-${CSS.escape(playerId)} .custom-card-back`))
        || document.querySelector('.custom-card-back');
      if (existingBack) back.appendChild(existingBack.cloneNode(true));
      else back.style.background = 'linear-gradient(135deg,#1e293b,#0f172a)';
      const front = document.createElement('div');
      front.className = 'blind-reveal-face blind-reveal-front';
      try { front.appendChild(createCardElement(card, false, false, false, false, false)); } catch (e) {}
      const glow = document.createElement('div');
      glow.className = 'blind-reveal-glow';
      inner.append(back, front);
      wrap.append(glow, inner);
      layer.append(dim, wrap);
      if (slotCard) slotCard.style.visibility = 'hidden';
      const cleanup = () => { dim.remove(); wrap.remove(); if (slotCard) slotCard.style.visibility = ''; };
      requestAnimationFrame(() => { dim.style.opacity = '1'; });

      // Phase timings as fractions of the total.
      const lift = 0.3, tease = 0.4; // then the snap
      const dx = startX - endX, dy = startY - endY;
      wrap.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${startScale})`, offset: 0, easing: 'cubic-bezier(.3,.7,.2,1)' },
        { transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 18}px) scale(${(startScale + 1.28) / 2}) rotate(-4deg)`, offset: lift * 0.55 },
        { transform: 'translate(0,0) scale(1.28)', offset: lift, easing: 'cubic-bezier(.2,.8,.2,1)' },
        { transform: 'translate(0,0) scale(1.28) rotate(-2deg)', offset: lift + tease * 0.3 },
        { transform: 'translate(0,0) scale(1.3) rotate(2deg)', offset: lift + tease * 0.6 },
        { transform: 'translate(0,0) scale(1.32)', offset: lift + tease },
        { transform: 'translate(0,0) scale(1.22)', offset: 0.9, easing: 'cubic-bezier(.34,1.56,.64,1)' },
        { transform: 'translate(0,0) scale(1)', offset: 1 }
      ], { duration: total, fill: 'forwards' });
      inner.animate([
        { transform: 'rotateY(0deg)', offset: 0 },
        { transform: 'rotateY(0deg)', offset: lift + tease * 0.35 },
        { transform: 'rotateY(80deg)', offset: lift + tease, easing: 'cubic-bezier(.6,0,.9,.4)' },
        { transform: 'rotateY(180deg)', offset: lift + tease + 0.12, easing: 'cubic-bezier(.2,1.4,.4,1)' },
        { transform: 'rotateY(180deg)', offset: 1 }
      ], { duration: total, fill: 'forwards' });
      audio.playRevealTension((total * (lift + tease)) / 1000);
      setTimeout(() => {
        wrap.classList.add(good ? 'is-good' : 'is-bad');
        audio.playRevealResult(good);
        // A miss gets a soft red swell rather than a shake, so the pickup
        // that follows reads as one smooth motion.
        if (!good) glow.animate([{ opacity: 0.6 }, { opacity: 1 }, { opacity: 0.8 }], { duration: 320, easing: 'ease-out' });
        Haptics.vibrate(good ? 15 : [30, 40, 30]);
      }, total * (lift + tease + 0.1));
      setTimeout(() => { dim.style.opacity = '0'; }, total * 0.9);
      setTimeout(finish, total + 60);
    }
  