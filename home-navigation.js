// Home navigation, mode carousel, tutorial video and responsive backdrop.
// Classic script: shared game state is read when functions are invoked.
// Initializers run from app.js at the original startup positions.

    function initHomeVideoControls() {
      const player = document.getElementById('homeTutorialPlayer');
      const video = document.getElementById('homeTutorialVideo');
      const button = document.getElementById('homeVideoExpand');
      const expanded = () => document.fullscreenElement === player || player.classList.contains('video-expanded');
      const sync = () => { button.setAttribute('aria-label', expanded() ? 'Minimize tutorial video' : 'Expand tutorial video'); button.title = expanded() ? 'Minimize video' : 'Expand video'; };
      const close = () => { player.classList.remove('video-expanded'); if (document.fullscreenElement === player) document.exitFullscreen().catch(() => {}); sync(); };
      button.addEventListener('click', async () => {
        if (expanded()) { close(); return; }
        try {
          if (player.requestFullscreen) await player.requestFullscreen();
          else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
          else player.classList.add('video-expanded');
        } catch (_) { player.classList.add('video-expanded'); }
        sync();
      });
      document.addEventListener('fullscreenchange', sync);
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && expanded()) { e.preventDefault(); close(); } }, true);
      window.closeHomeVideoFullscreen = close;
    }

    // Home mode ⓘ (v256, owner): what each mode is, in the shared info bubble
    // (tap to toggle, hover on PC); the tap never switches mode.
    const MODE_TIPS = {
      bots: '<p><b>Vs Bots</b></p><p>Play against 1 to 3 computer players at the difficulty you pick. Wins unlock harder bots. Choose the speed and difficulty before starting.</p>',
      online: '<p><b>Play Friends</b></p><p>Host a private table and share the code or link, or join a friend\'s table. Up to 4 players; empty seats can be bots.</p>',
      gauntlet: '<p><b>Gauntlet</b></p><p>Beat successive bots with limited lives. Easy and Hard have 5 rounds; Boss has 3. Continue an unfinished run on the same UK day. Signed-in players can earn rewards.</p>',
      more: '<p><b>More Modes</b></p><p>Preview upcoming modes. Pin one to a Shortcut card, then use Swap to change your choice. These modes are not playable yet.</p>',
      ranked: '<p><b>Ranked</b></p><p>One-on-one against a real player near your level. Win to raise your rating and climb the tiers and the leaderboard.</p>'
    };
    function initHomeModeTips() {
      const target = (e) => e.target.closest && e.target.closest('[data-mode-tip]');
      document.addEventListener('click', (e) => {
        const t = target(e); if (!t) return;
        e.preventDefault(); e.stopPropagation();
        showInfoPop(t, MODE_TIPS[t.dataset.modeTip] || '', { toggle: true, centered: true });
      }, true);
      document.addEventListener('keydown', (e) => {
        const t = target(e); if (!t || (e.key !== 'Enter' && e.key !== ' ')) return;
        e.preventDefault(); e.stopPropagation();
        showInfoPop(t, MODE_TIPS[t.dataset.modeTip] || '', { toggle: true, centered: true });
      }, true);
      document.addEventListener('mouseover', (e) => {
        const t = target(e); if (!t || infoPopAnchor === t || !window.matchMedia('(hover: hover)').matches) return;
        showInfoPop(t, MODE_TIPS[t.dataset.modeTip] || '', { hover: true, centered: true });
      });
    }

    // Logo navigation resets navigation state, never account data or preferences.
    function resetHomeUI() {
      window.resetModeCarousel?.();
      if (rankedSearchTimer || rankedHeartbeatTimer || rankedAssignmentRef) cancelRankedSearch();
      shConfirmDone?.(false);
      closeHamburgerMenu(); closeBigPreview(); hideInfoPop(); hideHeaderXpTip();
      window.hideDynamicTip?.();
      guideReturnTo = null;
      const ids = new Set([...Object.keys(BACK_LAYERS), ...MENU_PAGE_IDS, ...BLOCKING_OVERLAY_IDS,
        'signOutConfirm', 'appClosingScreen', 'updatePrompt']);
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.add('hidden');
        el.getAnimations({ subtree: true }).forEach(a => a.cancel());
        el.scrollTop = 0;
      });
      // Drain the observer's close records before clearing its recent-page cache.
      exclusivePageObserver.takeRecords();
      Object.keys(pageTrail).forEach(k => delete pageTrail[k]);
      Object.keys(pageHiddenAt).forEach(k => delete pageHiddenAt[k]);
      pageTrailRestoring = null;
      document.body.classList.remove('app-closing', 'ui-overlay-open', 'mode-page');
      const lobby = document.getElementById('lobbyScreen');
      lobby.classList.remove('hidden'); lobby.scrollTop = 0;
      document.body.classList.add('lobby-open');
      const video = document.getElementById('homeTutorialVideo');
      if (video) { video.pause(); if (video.readyState) video.currentTime = 0; }
      syncBackgroundScrollLock(); syncBackGuard();
      document.getElementById('homeLogoBtn')?.focus({ preventScroll: true });
    }
    async function returnToHomeScreen() {
      if (tutorialActive) { endTutorial(false); resetHomeUI(); return; }
      if (!document.body.classList.contains('lobby-open') || (state.isMultiplayer && state.roomCode)) {
        await leaveCurrentScreen({ toRoot: true });
        return;
      }
      resetHomeUI();
    }

    // § Home screen: dimmed table backdrop, rotating card tip, panel fit
    // Behind the home panel: the player's equipped table, including local
    // guest/free selections, heavily dimmed
    // and never animated (#homeBackdrop, shown by body.lobby-open).
    // #homeCardTip shows one power card (5–J, Joker) and its rule, changing
    // every HOME_TIP_MS, only where there is free room: below the panel on
    // phones, in the side space on wide screens; otherwise not at all.
    const HOME_TIP_RANKS = ['5', '6', '7', '8', '9', '10', 'J', 'JOKER'];
    const HOME_TIP_MS = 8000;
    const HOME_BACKDROP_DIM = 'linear-gradient(rgba(2,6,23,.62),rgba(2,6,23,.74))';
    let homeTipRank = null, homeTipTimer = null;
    function homeBackdropTableId() {
      // The home screen always honours the player's equipped table, including
      // local free choices while signed out. Events must not replace that choice.
      return equippedCosmetics.tableTheme || 'default';
    }
    function homeBackdropCss(id) {
      if (ILLUSTRATED_TABLES[id]) return { bg: tableArtBackground(id) };
      return CSS_TABLE_PREVIEWS[id] || CSS_TABLE_PREVIEWS.default;
    }
    function refreshHomeBackdrop() {
      let el = document.getElementById('homeBackdrop');
      if (!el) { el = document.createElement('div'); el.id = 'homeBackdrop'; el.setAttribute('aria-hidden', 'true'); document.body.prepend(el); }
      const id = homeBackdropTableId();
      if (el.dataset.table === id) return;
      const look = homeBackdropCss(id);
      el.dataset.table = id;
      el.style.background = look.bg;
      ShTableScenes.draw(el, id);
      // The independent scene renderer extends its terrain and uniformly scales
      // anchored features. Only the legacy seamless surface uses repeat sizing.
      el.style.backgroundSize = look.size || 'auto';
    }
    // Tablets/PCs zoom the panel up (CSS); never past what fits under the
    // header, so its top (the title) is never hidden and nothing scrolls.
    // § Home layout (v314): Play Friends and Ranked take Vs Bots' height, so switching mode never moves the panel.
    function initHomePanelSizing() {
    if (window.ResizeObserver) {
      const homeOpts = document.getElementById('singleOptions');
      if (homeOpts) new ResizeObserver(() => { if (homeOpts.offsetHeight) document.getElementById('lobbyScreen')?.style.setProperty('--home-opts-h', homeOpts.offsetHeight + 'px'); }).observe(homeOpts);
    }
    }
    // § Mode carousel (v318): a 3D row that turns to one card in the middle.
    // Swipe, the arrows, the mouse wheel or keys 1-7 turn it; tapping a side
    // card brings it to the middle, tapping the middle card opens its mode
    // (and remembers it, localStorage shithead_home_mode). The old mode
    // switches stay hidden and are pressed for it.
    const HOME_MODE_KEY = 'shithead_home_mode';
    function initHomeModeCarousel() {
      const box = document.getElementById('modeCarousel');
      const track = box?.querySelector('.mc-track');
      if (!track) return;
      const cards = [...track.querySelectorAll('.mc-card')];
      const arrows = [...box.querySelectorAll('.mc-arrow')];
      const atStart = arrows.filter((b) => b.dataset.mcStep === '-1' || b.dataset.mcJump === 'first');
      const atEnd = arrows.filter((b) => b.dataset.mcStep === '1' || b.dataset.mcJump === 'last');
      const PANEL = { cpu: 'singleOptions', gauntlet: 'singleOptions', friends: 'multiOptions', ranked: 'rankedOptions' };
      const SWITCH = { singleOptions: 'modeSingleBtn', multiOptions: 'modeMultiBtn', rankedOptions: 'modeRankedBtn' };
      const indexOf = (mode) => Math.max(0, cards.findIndex((c) => c.dataset.mcMode === mode));
      let saved = null;
      try { saved = localStorage.getItem(HOME_MODE_KEY); } catch (e) {}
      let chosen = PANEL[saved] ? saved : 'cpu';
      let focus = indexOf(chosen);
      const shownPanel = () => Object.keys(SWITCH).find((id) => !document.getElementById(id)?.classList.contains('hidden')) || 'singleOptions';
      function paint() {
        const width = cards[0].offsetWidth;
        if (!width) return; // Hidden mode pages must never overwrite the last visible geometry.
        const step = width * .86;
        cards.forEach((c, i) => {
          const d = i - focus, a = Math.abs(d);
          c.style.setProperty('--mc-x', (Math.sign(d) * (a === 0 ? 0 : a === 1 ? step : step * (1 + (a - 1) * .7))).toFixed(1) + 'px');
          c.style.setProperty('--mc-z', (-a * 70) + 'px');
          c.style.setProperty('--mc-r', (-Math.sign(d) * Math.min(a, 2) * 18) + 'deg');
          c.style.setProperty('--mc-s', (1 - Math.min(a, 3) * .13).toFixed(2));
          c.style.setProperty('--mc-o', a > 2 ? '0' : '1');
          c.style.setProperty('--mc-dim', a === 0 ? '0' : a === 1 ? '.38' : '.62');
          c.style.setProperty('--mc-zi', String(10 - a));
          c.classList.toggle('mc-focus', a === 0);
          c.classList.toggle('mc-gone', a > 2);
          c.tabIndex = a === 0 ? 0 : -1;
          c.querySelectorAll('button').forEach(button => { button.tabIndex = a > 2 ? -1 : 0; });
          const lit = PANEL[c.dataset.mcMode] === shownPanel() && (c.dataset.mcMode === chosen || PANEL[chosen] !== shownPanel());
          c.setAttribute('aria-pressed', lit ? 'true' : 'false');
        });
        atStart.forEach((b) => { b.disabled = focus === 0; });
        atEnd.forEach((b) => { b.disabled = focus === cards.length - 1; });
      }
      function turnTo(i) {
        const next = Math.max(0, Math.min(cards.length - 1, i));
        if (next === focus) return false;
        focus = next; paint();
        Haptics.vibrate([15]);
        audio.playCarouselSnap();
        return true;
      }
      // § Mode pages (v320): '' = home (the carousel), else that mode's page.
      const lobby = document.getElementById('lobbyScreen');
      function setModePage(m) {
        if (m) { document.getElementById('homeTutorialVideo')?.pause(); window.closeHomeVideoFullscreen?.(); }
        const card = m && cards[indexOf(m)];
        document.body.classList.toggle('mode-page', !!card);
        if (!m || !card) { delete lobby.dataset.modePage; lobby.classList.remove('mode-page-open'); hideInfoPop(); paint(); requestAnimationFrame(paint); refreshGauntletLobbyBtn(); return; }
        hideInfoPop();
        const help = document.getElementById('modePageInfo');
        help.dataset.modeTip = ({cpu:'bots',friends:'online'})[m] || m;
        help.setAttribute('aria-label', 'About ' + card.querySelector('.mc-name').textContent);
        lobby.dataset.modePage = m;
        lobby.classList.add('mode-page-open');
        document.getElementById('modePageIcon').innerHTML = card.querySelector('.mc-ic').outerHTML;
        document.getElementById('modePageIcon').style.setProperty('--mp-tone', card.style.getPropertyValue('--mc-tone'));
        document.getElementById('modePageTitle').textContent = card.querySelector('.mc-name').textContent;
        document.getElementById('modePageSub').textContent = m === 'more' ? 'Coming soon' : card.querySelector('.mc-sub').textContent;
        lobby.scrollTop = 0;
      }
      window.setModePage = setModePage;
      function open(card, { immediate = false } = {}) {
        const m = card.dataset.mcMode;
        Haptics.vibrate([15]);
        if (PANEL[m]) {
          document.getElementById(SWITCH[PANEL[m]])?.click();
          if (document.getElementById(PANEL[m])?.classList.contains('hidden')) return; // offline: the switch said why
          chosen = m;
          try { localStorage.setItem(HOME_MODE_KEY, m); } catch (e) {}
          paint();
          if (immediate) setModePage(m); else enterModePage(card, m);
        } else if (m === 'more') { if (immediate) setModePage('more'); else enterModePage(card, 'more'); }
        else openPinPicker(card);
      }
      // § Shortcut pins (v323): slots 1 and 7 hold one of the coming modes
      // (localStorage shithead_home_pins = {pin1, pin2}). A placeholder: a
      // pinned card only says it's coming soon until that mode launches.
      const PIN_KEY = 'shithead_home_pins';
      const PIN_MODES = {
        twos: ['2 vs 2', 'M7 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM3 14a4 4 0 0 1 8 0M13 14a4 4 0 0 1 8 0M7 21v-3M17 21v-3'],
        puzzles: ['Puzzles', 'M10 4a2 2 0 1 1 4 0v2h4v4h-2a2 2 0 1 0 0 4h2v4h-4v-2a2 2 0 1 0-4 0v2H6v-4h2a2 2 0 1 0 0-4H6V6h4z'],
        random: ['Randomiser', 'M4 7h3l10 10h3M4 17h3l3-3M14 10l3-3h3M18 4l3 3-3 3M18 14l3 3-3 3'],
        decks: ['Multiple Decks', 'M7 4h10a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM3 7v12a2 2 0 0 0 2 2h9'],
        mercy: ['No Mercy', 'M12 3c4.4 0 8 3.1 8 7 0 2.4-1.3 4.4-3 5.6V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-3.4C5.3 14.4 4 12.4 4 10c0-3.9 3.6-7 8-7zM9 11h.01M15 11h.01']
      };
      const pinSvg = (d) => '<svg class="mc-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
      const emptyPinHtml = cards.find((c) => c.dataset.mcMode === 'pin1').innerHTML.replace(/<span class="mc-num"[^>]*>\d<\/span>/, '');
      const readPins = () => { try { return JSON.parse(localStorage.getItem(PIN_KEY)) || {}; } catch (e) { return {}; } };
      function paintPins() {
        const pins = readPins();
        cards.filter((c) => /^pin/.test(c.dataset.mcMode)).forEach((c) => {
          const m = PIN_MODES[pins[c.dataset.mcMode]];
          const num = '<span class="mc-num" aria-hidden="true">' + c.dataset.mc + '</span>';
          c.innerHTML = num + (m ? pinSvg(m[1]) + '<span class="mc-name">' + m[0] + '</span><span class="mc-sub">Coming soon</span><div class="mc-actions"><button type="button" class="mc-go" data-mc-preview>Info</button><button type="button" class="mc-go mc-swap" data-mc-swap>Swap</button></div>' : emptyPinHtml.replace(/data-mc-go(?:="")?>Go →/, 'data-mc-swap>Pin +'));
          c.classList.toggle('mc-pinned', !!m);
        });
      }
      function openPinPicker(card) {
        const cur = readPins()[card.dataset.mcMode];
        const rows = Object.entries(PIN_MODES).map(([id, [name, d]]) =>
          '<button type="button" data-mc-pin="' + id + '" aria-pressed="' + (id === cur) + '">' + pinSvg(d) + name + '</button>').join('');
        showInfoPop(card, '<b>' + (cur ? PIN_MODES[cur][0] + ' is coming soon' : 'Pin a mode here') + '</b><br>' +
          (cur ? 'It opens from here when it launches. Pin another:' : 'It opens from here when it launches.') +
          '<div class="mc-pin-list" data-mc-slot="' + card.dataset.mcMode + '">' + rows + (cur ? '<button type="button" data-mc-pin="">Clear this shortcut</button>' : '') + '</div>', { toggle: true });
      }
      document.addEventListener('click', (e) => {
        const b = e.target.closest('#infoPop [data-mc-pin]');
        if (!b) return;
        const pins = readPins(), slot = b.closest('[data-mc-slot]').dataset.mcSlot;
        if (b.dataset.mcPin) pins[slot] = b.dataset.mcPin; else delete pins[slot];
        try { localStorage.setItem(PIN_KEY, JSON.stringify(pins)); } catch (err) {}
        hideInfoPop(); paintPins(); Haptics.vibrate([15]);
      });
      paintPins();
      // More Modes page rows wear the same icons as the pins (same order).
      document.querySelectorAll('#moreModesPage .mp-row').forEach((row, i) => {
        const m = Object.values(PIN_MODES)[i];
        if (m && !row.querySelector('.mc-ic')) row.insertAdjacentHTML('afterbegin', pinSvg(m[1]).replace('mc-ic', 'mc-ic mp-row-ic'));
      });
      // § Card expand (v321): the middle card flips (edge-on at the half-way
      // point), grows to fill the screen as the page's background, the page
      // is switched underneath once it covers the screen, then the cover fades.
      // Reduce Motion / no Web Animations = a plain crossfade. A second tap,
      // a resize, Back or the app going to the background mid-way finishes
      // it at once (finishExpand), so nothing is left on screen.
      const panel = lobby.querySelector(':scope > div');
      let expand = null;
      function crossfade() {
        if (!panel.animate || (typeof motionOff === 'function' && motionOff())) return;
        panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      }
      function finishExpand() {
        if (!expand) return;
        const { cover, anims, mode } = expand;
        expand = null;
        anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
        cover.remove();
        if (lobby.dataset.modePage !== mode) setModePage(mode);
      }
      function enterModePage(card, mode) {
        if (expand) return finishExpand();
        const reduced = (typeof motionOff === 'function' && motionOff()) || matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduced || !card.animate) { setModePage(mode); crossfade(); return; }
        const r = card.getBoundingClientRect();
        const cover = document.createElement('div');
        cover.className = 'mc-expand';
        cover.style.setProperty('--mc-tone', card.style.getPropertyValue('--mc-tone'));
        cover.innerHTML = '<div class="mc-expand-face">' + card.innerHTML + '</div>';
        cover.querySelector('.mc-badge')?.remove();
        document.body.appendChild(cover);
        const W = innerWidth, H = innerHeight;
        const at = (k) => ({ left: (r.left * (1 - k)) + 'px', top: (r.top * (1 - k)) + 'px', width: (r.width + (W - r.width) * k) + 'px', height: (r.height + (H - r.height) * k) + 'px' });
        const half = { duration: 260, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' };
        try { scheduleBackGuardSync(); } catch (e) {} // Back mid-way returns home, never leaves the site
        const a1 = cover.animate([{ ...at(0), transform: 'perspective(900px) rotateY(0deg)' }, { ...at(.35), transform: 'perspective(900px) rotateY(90deg)' }], half);
        expand = { cover, anims: [a1], mode };
        a1.finished.then(() => {
          if (!expand || expand.cover !== cover) return;
          cover.classList.add('mc-expand-back');
          const a2 = cover.animate([{ ...at(.35), transform: 'perspective(900px) rotateY(-90deg)', borderRadius: '18px' }, { ...at(1), transform: 'perspective(900px) rotateY(0deg)', borderRadius: '0px' }], { ...half, duration: 300, easing: 'cubic-bezier(.22,1,.36,1)' });
          expand.anims.push(a2);
          return a2.finished;
        }).then(() => {
          if (!expand || expand.cover !== cover) return;
          setModePage(mode);
          const a3 = cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
          expand.anims.push(a3);
          return a3.finished;
        }).then(() => { if (expand && expand.cover === cover) finishExpand(); }).catch(() => {});
      }
      window.modeExpandRunning = () => !!expand;
      ['resize', 'popstate', 'pagehide'].forEach((ev) => window.addEventListener(ev, finishExpand));
      document.addEventListener('visibilitychange', () => { if (document.hidden) finishExpand(); });
      document.getElementById('modePageBack').addEventListener('click', () => {
        if (window.ShFriendsLobby?.backToHub()) return;
        finishExpand();
        window.resetModeCarousel(); crossfade();
        requestAnimationFrame(() => cards[focus].focus({ preventScroll: true }));
      });
      document.getElementById('gauntletPageStart').addEventListener('click', () => document.getElementById('gauntletBtn')?.click());
      let swiped = false, lastTap = null;
      track.addEventListener('click', (e) => {
        const card = e.target.closest('.mc-card');
        if (!card) return;
        if (swiped && (e.detail !== 0 || e.sourceCapabilities?.firesTouchEvents)) { e.preventDefault(); e.stopPropagation(); return; }
        if (e.target.closest('[data-mc-swap]')) { lastTap = null; turnTo(cards.indexOf(card)); openPinPicker(card); return; }
        if (e.target.closest('[data-mc-preview]')) { showInfoPop(card, '<b>' + card.querySelector('.mc-name').textContent + '</b><p>Coming soon. Use Swap to choose another shortcut.</p>', {toggle:true}); return; }
        const i = cards.indexOf(card), now = performance.now();
        const direct = !!e.target.closest('[data-mc-go]');
        const doubleTap = lastTap?.card === card && now - lastTap.at < 400;
        if (direct || doubleTap || (e.detail === 0 && i === focus)) {
          lastTap = null; turnTo(i); open(card, { immediate: direct });
        } else { lastTap = { card, at: now }; turnTo(i); }
      });
      track.addEventListener('keydown', (e) => {
        const card = e.target.closest('.mc-card');
        if (!card || e.target.closest('button') || !['Enter', ' '].includes(e.key)) return;
        e.preventDefault(); turnTo(cards.indexOf(card)); open(card, { immediate: true });
      });
      const arrowGo = (b) => turnTo(b.dataset.mcJump ? (b.dataset.mcJump === 'first' ? 0 : cards.length - 1) : focus + Number(b.dataset.mcStep));
      // ‹ › repeat while held (first step at once, then every 160ms after 400ms).
      let hold = null;
      const stopHold = () => { if (hold) { clearTimeout(hold); clearInterval(hold); hold = null; } };
      arrows.forEach((b) => {
        b.addEventListener('click', (e) => { if (e.detail === 0 || !b.dataset.mcStep) arrowGo(b); }); // keyboard, « and »
        if (!b.dataset.mcStep) return;
        b.addEventListener('pointerdown', (e) => {
          if (e.button) return;
          stopHold(); arrowGo(b);
          hold = setTimeout(() => { hold = setInterval(() => { if (!arrowGo(b)) stopHold(); }, 160); }, 400);
        });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, stopHold));
      });
      window.addEventListener('blur', stopHold);
      // v327: explicit desktop mouse tracking; touch/pen use pointer events.
      // One step per gesture, unless held beyond the threshold for 450ms.
      let down = null, dragHold = null, ignoreMouseUntil = 0;
      const dragStep = () => cards[0].getBoundingClientRect().width * .86;
      const stopDragHold = () => { clearTimeout(dragHold); dragHold = null; };
      const resetPull = () => {
        track.classList.remove('mc-dragging');
        track.style.removeProperty('--mc-dx');
      };
      const startDrag = (e) => {
        if (e.button || (e.type === 'mousedown' && performance.now() < ignoreMouseUntil)) return;
        // A new press replaces one whose release was never seen (let go outside the window).
        if (down) { stopDragHold(); resetPull(); down = null; }
        if (e.type === 'mousedown') e.preventDefault();
        down = { x: e.clientX, y: e.clientY, dx: 0, live: false, dir: 0, repeated: false, pointerId: e.pointerId };
        swiped = false;
      };
      const repeatDrag = () => {
        if (!down || !down.dir) return;
        down.repeated = true;
        resetPull();
        if (turnTo(focus + down.dir)) dragHold = setTimeout(repeatDrag, 520);
      };
      const moveDrag = (e) => {
        if (!down || (e.pointerId != null && e.pointerId !== down.pointerId)) return;
        const dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (!down.live) {
          if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
          down.live = true;
          if (e.pointerId != null) { try { track.setPointerCapture(e.pointerId); } catch (err) {} }
        }
        e.preventDefault();
        swiped = true; lastTap = null;
        down.dx = dx;
        const dir = Math.abs(dx) >= 30 ? (dx < 0 ? 1 : -1) : 0;
        if (dir !== down.dir) {
          stopDragHold(); down.dir = dir;
          if (dir) dragHold = setTimeout(repeatDrag, 450);
        }
        if (!down.repeated) {
          const edge = (dx > 0 && focus === 0) || (dx < 0 && focus === cards.length - 1);
          const pull = Math.max(-dragStep() * .7, Math.min(dragStep() * .7, dx));
          track.classList.add('mc-dragging');
          track.style.setProperty('--mc-dx', (edge ? pull / 3 : pull).toFixed(1) + 'px');
        }
      };
      const endDrag = (e) => {
        if (!down || (e.pointerId != null && e.pointerId !== down.pointerId)) return;
        const d = down; down = null;
        stopDragHold(); resetPull();
        if (d.pointerId != null) { try { track.releasePointerCapture(d.pointerId); } catch (err) {} }
        if (d.live && !d.repeated && (e.type === 'mouseup' || e.type === 'pointerup' || e.type === 'touchend' || e.type === 'mouseleave')) {
          if (d.dir) turnTo(focus + d.dir);
        }
        // Keep click suppression until the next genuine press (touch clicks may arrive late).
      };
      track.addEventListener('mousedown', startDrag);
      window.addEventListener('mousemove', moveDrag, { passive: false });
      window.addEventListener('mouseup', endDrag);
      track.addEventListener('mouseleave', endDrag);
      track.addEventListener('dragstart', (e) => e.preventDefault());
      track.addEventListener('selectstart', (e) => e.preventDefault());
      track.addEventListener('pointerdown', (e) => { if (e.pointerType === 'pen') startDrag(e); });
      track.addEventListener('pointermove', (e) => { if (e.pointerType === 'pen') moveDrag(e); }, { passive: false });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => track.addEventListener(ev, (e) => {
        if (e.pointerType === 'pen') endDrag(e);
      }));
      const touchEvent = (e, t) => ({ type: e.type, button: 0, clientX: t.clientX, clientY: t.clientY,
        preventDefault: () => { if (e.cancelable) e.preventDefault(); } });
      let touchId = null;
      track.addEventListener('touchstart', (e) => {
        ignoreMouseUntil = performance.now() + 900;
        if (e.touches.length !== 1) { endDrag({ type: 'cancel' }); touchId = null; return; }
        const t = e.touches[0]; touchId = t.identifier;
        startDrag(touchEvent(e, t));
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (touchId == null) return;
        if (e.touches.length !== 1) { endDrag({ type: 'cancel' }); touchId = null; return; }
        const t = [...e.touches].find(t => t.identifier === touchId);
        if (t) moveDrag(touchEvent(e, t));
      }, { passive: false });
      const endTouch = (e) => {
        if (touchId == null) return;
        const t = [...e.changedTouches].find(t => t.identifier === touchId);
        if (!t) return;
        ignoreMouseUntil = performance.now() + 900;
        if (down?.live && e.cancelable) e.preventDefault();
        endDrag(touchEvent(e, t)); touchId = null;
      };
      window.addEventListener('touchend', endTouch, { passive: false });
      window.addEventListener('touchcancel', endTouch, { passive: false });
      window.resetModeCarousel = () => {
        finishExpand(); endDrag({ type: 'cancel' }); stopHold(); touchId = null; lastTap = null; swiped = false;
        modePanelObservers.forEach(observer => observer.takeRecords());
        setModePage(''); paint();
      };
      ['blur', 'pagehide', 'resize'].forEach((ev) => window.addEventListener(ev, endDrag));
      document.addEventListener('visibilitychange', () => { if (document.hidden) { endDrag({ type: 'cancel' }); stopHold(); } });
      // Mouse wheel over the carousel: one card per notch (the page doesn't scroll).
      let wheelAt = 0;
      box.addEventListener('wheel', (e) => {
        if (!e.target.closest('.mc-track, .mc-controls')) return;
        const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (!d) return;
        e.preventDefault();
        if (performance.now() - wheelAt < 220) return;
        wheelAt = performance.now();
        turnTo(focus + (d > 0 ? 1 : -1));
      }, { passive: false });
      // Keys 1-7 on the home screen pick that card; ←/→ turn it.
      document.addEventListener('keydown', (e) => {
        if (!document.body.classList.contains('lobby-open') || document.body.classList.contains('mode-page') || e.ctrlKey || e.metaKey || e.altKey) return;
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName || '') || e.target?.isContentEditable) return;
        if (typeof tutorialActive !== 'undefined' && tutorialActive) return;
        if (typeof topBackLayer === 'function' && topBackLayer()) return;
        if (/^[1-7]$/.test(e.key)) { turnTo(Number(e.key) - 1); e.preventDefault(); }
        else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight')
          && (box.contains(e.target) || e.target === document.body || !e.target)) {
          if (turnTo(focus + (e.key === 'ArrowLeft' ? -1 : 1)) && box.contains(e.target)) cards[focus].focus({ preventScroll: true });
          e.preventDefault();
        }
      });
      // A mode switched from elsewhere (an invite link, Return To Ranked):
      // turn to its card unless the middle card already belongs to it.
      const modePanelObservers = [];
      Object.keys(SWITCH).forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const observer = new MutationObserver(() => {
          if (el.classList.contains('hidden')) return;
          if (PANEL[chosen] !== id) chosen = id === 'singleOptions' ? 'cpu' : id === 'multiOptions' ? 'friends' : 'ranked';
          if (PANEL[cards[focus].dataset.mcMode] !== id) focus = indexOf(chosen);
          if (id !== 'singleOptions') setModePage(chosen);
          paint();
        });
        observer.observe(el, { attributes: true, attributeFilter: ['class'] });
        modePanelObservers.push(observer);
      });
      window.addEventListener('resize', paint);
      new ResizeObserver(() => { if (track.offsetWidth) paint(); }).observe(track);
      // Start on the home screen, centred on the last mode opened (Play
      // Computer the first time), unless start-up already opened Play
      // Friends or Ranked (Return To Ranked).
      const startPanel = shownPanel();
      if (startPanel !== 'singleOptions') { chosen = startPanel === 'multiOptions' ? 'friends' : 'ranked'; focus = indexOf(chosen); setModePage(chosen); }
      paint();
    }
    function fitHomePanel() {
      const lobby = document.getElementById('lobbyScreen');
      const panel = lobby?.querySelector(':scope > div.bg-slate-900');
      if (!panel || lobby.classList.contains('hidden')) return;
      panel.style.zoom = '';
      const base = parseFloat(getComputedStyle(panel).zoom) || 1;
      if (base <= 1) return;
      const cs = getComputedStyle(lobby);
      const room = lobby.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const natural = panel.getBoundingClientRect().height / base;
      const fit = Math.max(1, Math.min(base, room / natural));
      if (fit < base) panel.style.zoom = String(Math.floor(fit * 100) / 100);
    }
    function pickHomeTipRank() {
      const pool = HOME_TIP_RANKS.filter(r => r !== homeTipRank);
      return pool[Math.floor(Math.random() * pool.length)];
    }
    function homeTipCard(rank) {
      const suits = ['♠', '♥', '♦', '♣'];
      const card = rank === 'JOKER'
        ? { id: 'home_tip_joker', rank: 'JOKER', suit: 'JOKER', isJoker: true }
        : { id: `home_tip_${rank}`, rank, suit: suits[Math.floor(Math.random() * 4)] };
      const el = createCardElement(card);
      el.classList.add('home-tip-card');
      el.removeAttribute('data-card-id');
      return el;
    }
    function fillHomeTip(tip, rank) {
      const name = rank === 'JOKER' ? 'Joker' : (RANK_WORDS[rank] || rank);
      const power = (CARD_REFERENCE.find(r => r[0] === rank) || [])[1] || '';
      tip.dataset.rank = rank;
      tip.setAttribute('aria-label', `${name}: ${power}. Open Card Powers in the Guide`);
      tip.querySelector('.home-tip-art').replaceChildren(homeTipCard(rank));
      tip.querySelector('.home-tip-name').textContent = `${name} · ${power}`;
      tip.querySelector('.home-tip-rule').textContent = CARD_HOLD_TEXT[rank] || '';
    }
    function homeTipElement() {
      let tip = document.getElementById('homeCardTip');
      if (!tip) {
        tip = document.createElement('button');
        tip.type = 'button';
        tip.addEventListener('click', () => openGuidePower(tip.dataset.rank));
        tip.id = 'homeCardTip';
        tip.className = 'hidden';
        tip.innerHTML = '<div class="home-tip-inner"><div class="home-tip-art"></div><div class="home-tip-text"><b class="home-tip-name"></b><span class="home-tip-rule"></span></div></div>';
        document.body.appendChild(tip);
      }
      return tip;
    }
    // Places the tip in free space or hides it; never moves anything else.
    function layoutHomeTip() {
      const tip = homeTipElement();
      const lobby = document.getElementById('lobbyScreen');
      const panel = lobby?.querySelector(':scope > div.bg-slate-900');
      const open = !!panel && !lobby.classList.contains('hidden') && !(typeof tutorialActive !== 'undefined' && tutorialActive);
      if (!open) { tip.classList.add('hidden'); return; }
      const r = panel.getBoundingClientRect();
      const W = window.innerWidth, H = window.innerHeight;
      // Only the home bar (the lobby's bottom padding less its 12px margin)
      // is off limits below the panel.
      const bottomSafe = Math.max(0, (parseFloat(getComputedStyle(lobby).paddingBottom) || 0) - 12);
      const GAP = 8, STRIP_H = 68, SIDE_W = 200, SIDE_H = 330;
      // The installed app has the status bar and home bar to fit around, so
      // it gets a slimmer strip when the normal one has no room.
      const COMPACT_GAP = 3, COMPACT_H = 48;
      const below = H - bottomSafe - r.bottom;
      tip.classList.remove('home-tip-side', 'home-tip-below', 'home-tip-compact');
      const strip = (h, gap) => {
        const w = Math.min(r.width, W - 32);
        tip.style.cssText = `left:${(W - w) / 2}px;top:${r.bottom + Math.max(gap, (below - h) / 2)}px;width:${w}px;height:${h}px;`;
      };
      if (r.left >= SIDE_W + 2 * GAP && r.height >= SIDE_H && H >= 480) {
        const w = Math.min(260, r.left - 2 * GAP);
        tip.classList.add('home-tip-side');
        tip.style.cssText = `left:${(r.left - w) / 2}px;top:${r.top + (r.height - SIDE_H) / 2}px;width:${w}px;height:${SIDE_H}px;`;
      } else if (below >= STRIP_H + 2 * GAP) {
        tip.classList.add('home-tip-below');
        strip(STRIP_H, GAP);
      } else if (isStandaloneApp() && below >= COMPACT_H + 2 * COMPACT_GAP) {
        tip.classList.add('home-tip-below', 'home-tip-compact');
        strip(COMPACT_H, COMPACT_GAP);
      } else {
        tip.classList.add('hidden');
        return;
      }
      if (!homeTipRank) { homeTipRank = pickHomeTipRank(); fillHomeTip(tip, homeTipRank); }
      tip.classList.remove('hidden');
    }
    function rotateHomeTip() {
      const tip = homeTipElement();
      if (tip.classList.contains('hidden') || document.hidden) return;
      homeTipRank = pickHomeTipRank();
      const inner = tip.querySelector('.home-tip-inner');
      if (motionOff()) { fillHomeTip(tip, homeTipRank); return; }
      inner.classList.add('home-tip-out');
      setTimeout(() => { fillHomeTip(tip, homeTipRank); inner.classList.remove('home-tip-out'); }, 260);
    }
    // Until Quick Start is done, the Tutorial button stands out so a new
    // player knows where to begin.
    function refreshTutorialNudge() {
      const btn = document.getElementById('startTutorialBtn');
      const label = document.getElementById('startTutorialLabel');
      if (!btn || !label || typeof getTutorialProgress !== 'function') return;
      const isNew = !getTutorialProgress()[QUICK_START_MODULE.id];
      btn.classList.toggle('tutorial-new', isNew);
      label.textContent = isNew ? 'New Here? 1-Minute Tutorial' : 'Tutorial';
    }
    function refreshHomeScreen() {
      const open = document.body.classList.contains('lobby-open');
      if (open) { refreshHomeBackdrop(); refreshTutorialNudge(); fitHomePanel(); }
      layoutHomeTip();
      if (open && !homeTipTimer) homeTipTimer = setInterval(rotateHomeTip, HOME_TIP_MS);
      if (!open && homeTipTimer) { clearInterval(homeTipTimer); homeTipTimer = null; }
    }
    function initHomeScreenObservers() {
      const lobby = document.getElementById('lobbyScreen');
      const panel = lobby?.querySelector(':scope > div.bg-slate-900');
      let queued = false;
      const soon = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; refreshHomeScreen(); }); };
      window.addEventListener('resize', soon);
      lobby?.addEventListener('scroll', soon, { passive: true });
      // The panel changes height when a mode opens (Play Friends, Ranked).
      if (panel && window.ResizeObserver) new ResizeObserver(soon).observe(panel);
      // Safe areas and fonts can settle after the first frame.
      window.addEventListener('load', soon);
      setTimeout(soon, 800);
      soon();
    }

