// First sign-in tour (v337): a short, skippable walk round the header, the game modes and the
// Tutorial button. Shown once to a NEW signed-in account (created in the last 3 days), remembered
// on the device (localStorage shithead_welcome_tour) and on the account (settings.welcomeTourSeen).
// Menu → Take The Tour shows it again any time from the home screen.
(function () {
  const NEW_ACCOUNT_MS = 3 * 24 * 3600 * 1000;
  const STEPS = [
    { title: 'Welcome to ShitHead Deluxe', text: 'A 30-second look around, so you know where everything is. You can skip any time.' },
    { targets: ['#headerShopBtn', '#headerDiamondBtn', '#headerCustomBtn'], title: 'Shop, Diamonds and Custom',
      text: 'Win games and finish challenges to earn Diamonds. Spend them in the Shop, then wear what you own in Custom.' },
    { targets: ['#headerProfileBtn', '#headerInboxBtn'], title: 'Profile and Inbox',
      text: 'Your level, stats and avatar live in Profile. Gifts, invites and friend requests arrive in the Inbox.' },
    { targets: ['#headerGuideBtn', '#headerSettingsBtn', '#hamburgerBtn'], title: 'Guide, Settings and Menu',
      text: 'The Guide explains every rule and card. Settings has speed, sound and accessibility. The Menu holds Challenges, Friends and the leaderboards.' },
    { targets: ['#modeCarousel .mc-track'], mode: 'cpu', title: 'Pick a game mode',
      text: 'Swipe or use the arrows, then tap the middle card to open it. Press and hold a card to rearrange them.',
      modes: [['cpu', 'Play Computer', 'practise against bots'], ['gauntlet', 'Gauntlet', 'five bots, three lives'],
        ['friends', 'Play Friends', 'private rooms with a code'], ['ranked', 'Ranked', 'climb the leaderboard']] },
    { targets: ['#startTutorialBtn'], title: 'Learn in one minute',
      text: 'New to Shithead? The 1-minute Tutorial teaches the basics with a coach.', last: true }
  ];
  const $ = (id) => document.getElementById(id);
  let root, idx = 0, watch = null, active = false, startedAt = 0;

  function visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && getComputedStyle(el).visibility !== 'hidden';
  }
  function targetRect(step) {
    const rects = (step.targets || []).map((s) => document.querySelector(s)).filter(visible).map((el) => el.getBoundingClientRect());
    if (!rects.length) return null;
    const pad = 6;
    const l = Math.min(...rects.map((r) => r.left)) - pad, t = Math.min(...rects.map((r) => r.top)) - pad;
    return { left: l, top: t, width: Math.max(...rects.map((r) => r.right)) + pad - l, height: Math.max(...rects.map((r) => r.bottom)) + pad - t };
  }
  const stepShown = (i) => !STEPS[i].targets || !!targetRect(STEPS[i]);

  function build() {
    if (root) return;
    root = $('welcomeTour');
    root.innerHTML = '<div class="wt-ring"></div><div class="wt-card" role="dialog" aria-modal="true" aria-labelledby="wtTitle"></div>';
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-wt]');
      if (!b) return;
      const a = b.dataset.wt;
      if (a === 'next') go(1); else if (a === 'back') go(-1); else if (a === 'skip') finish(true);
      else if (a === 'done') finish(true); else if (a === 'tutorial') finish(true, true);
      else if (a === 'mode') window.ShHomeCarousel?.turnToMode(b.dataset.mode);
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); finish(true); }
      else if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1);
    });
    addEventListener('resize', place);
  }

  function render() {
    const step = STEPS[idx], shown = STEPS.map((_, i) => i).filter(stepShown);
    const pos = shown.indexOf(idx);
    const first = pos <= 0, last = pos === shown.length - 1;
    const card = root.querySelector('.wt-card');
    const modes = step.modes ? '<ul class="wt-modes">' + step.modes.map(([m, n, d]) => `<li><button type="button" data-wt="mode" data-mode="${m}"><b>${n}</b><span>${d}</span></button></li>`).join('') + '</ul>' : '';
    card.innerHTML = `<button type="button" class="wt-skip" data-wt="skip">Skip tour</button>
      <div class="wt-count">${pos + 1} of ${shown.length}</div>
      <h2 class="wt-title" id="wtTitle">${step.title}</h2><p class="wt-text">${step.text}</p>${modes}
      <div class="wt-actions"><div class="wt-dots" aria-hidden="true">${shown.map((_, i) => `<i${i === pos ? ' class="on"' : ''}></i>`).join('')}</div>
        ${first ? '' : '<button type="button" class="wt-btn" data-wt="back">Back</button>'}
        ${step.last ? '<button type="button" class="wt-btn" data-wt="done">Not Now</button><button type="button" class="wt-btn wt-primary" data-wt="tutorial">Start Tutorial</button>'
          : `<button type="button" class="wt-btn wt-primary" data-wt="next">${last ? 'Done' : first ? 'Start' : 'Next'}</button>`}</div>`;
    if (step.mode) window.ShHomeCarousel?.turnToMode(step.mode);
    place();
    card.querySelector('.wt-primary')?.focus({ preventScroll: true });
  }

  function place() {
    if (!active || !root) return;
    const step = STEPS[idx], ring = root.querySelector('.wt-ring'), card = root.querySelector('.wt-card');
    const r = targetRect(step), W = innerWidth, H = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight;
    root.classList.toggle('wt-plain', !r);
    let left = (W - cw) / 2, top = (H - ch) / 2;
    if (r) {
      Object.assign(ring.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      // Below the highlight if it fits, else above; on a very short screen the side with more room (it may then overlap a little).
      const roomBelow = H - 8 - (r.top + r.height + 12), roomAbove = r.top - 12 - 8;
      const below = roomBelow >= ch || (roomAbove < ch && roomBelow >= roomAbove);
      top = below ? r.top + r.height + 12 : Math.max(8, r.top - ch - 12);
      top = Math.min(top, H - ch - 8);
      left = Math.max(12, Math.min(W - cw - 12, r.left + r.width / 2 - cw / 2));
    }
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }

  function go(dir) {
    let i = idx + dir;
    while (i >= 0 && i < STEPS.length && !stepShown(i)) i += dir;
    if (i < 0) return;
    if (i >= STEPS.length) { finish(true); return; }
    idx = i; render();
  }

  // Only on the bare home screen: leaving it (a page opens, a match starts) ends the tour quietly.
  const onHome = () => document.body.classList.contains('lobby-open') && !document.body.classList.contains('mode-page')
    && !(typeof topBackLayer === 'function' && topBackLayer()) && !(typeof tutorialActive !== 'undefined' && tutorialActive);

  function start() {
    if (active) return false;
    build();
    if (typeof hideHelperTip === 'function') hideHelperTip();
    if (typeof hideInfoPop === 'function') hideInfoPop();
    window.resetModeCarousel?.();
    active = true; startedAt = Date.now(); idx = 0;
    root.classList.remove('hidden');
    render();
    watch = setInterval(() => {
      if (!document.body.classList.contains('lobby-open') || document.body.classList.contains('mode-page') ) { finish(false); return; }
      place();
    }, 300);
    return true;
  }

  // markSeen false = interrupted (a page opened): it may show again next time.
  function finish(markSeen, openTutorial) {
    if (!active) return;
    active = false; clearInterval(watch); watch = null;
    root.classList.add('hidden');
    if (markSeen) markWelcomeTourSeen();
    window.ShHomeCarousel?.turnToMode('cpu');
    if (openTutorial) setTimeout(() => $('startTutorialBtn')?.click(), 250);
  }

  // Waits for a quiet home screen (daily reward, What's New and other pop-ups go first).
  let tried = false;
  function maybeStart() {
    if (tried || IS_DEV_TEST_PAGE || welcomeTourSeen || !currentUser || devTestSuiteRunning) return;
    const made = Date.parse(currentUser.metadata?.creationTime || '');
    if (!(Date.now() - made < NEW_ACCOUNT_MS)) { markWelcomeTourSeen(); return; } // an older account never sees it
    tried = true;
    const busy = () => !onHome() || state.isMultiplayer || (state.phase && state.phase !== 'LOBBY') || $('bootSplash')?.isConnected && !$('bootSplash').classList.contains('boot-out')
      || [...BLOCKING_OVERLAY_IDS, 'rejoinModal', 'matchSummaryModal', 'dailyRewardModal', 'whatsNewModal', 'modeIntroModal', 'referralWelcomeModal', 'keepAccountModal', 'usernameModal']
        .some((id) => { const el = $(id); return el && !el.classList.contains('hidden'); });
    let quiet = 0;
    const poll = setInterval(() => {
      if (welcomeTourSeen || !currentUser) { clearInterval(poll); return; }
      quiet = busy() ? 0 : quiet + 1;
      if (quiet >= 3) { clearInterval(poll); start(); } // ~3s of calm
    }, 1000);
    setTimeout(() => clearInterval(poll), 5 * 60 * 1000);
  }

  window.ShWelcomeTour = { maybeStart, active: () => active, skip: () => finish(true),
    replay: () => {
      if (typeof closeHamburgerMenu === 'function') closeHamburgerMenu();
      if (!document.body.classList.contains('lobby-open')) { notifyBanner('Open the tour from the home screen.'); return false; }
      window.resetHomeUI?.();
      return start();
    } };
})();
