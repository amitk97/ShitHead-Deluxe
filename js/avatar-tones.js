// Static avatar colour-tone definitions.
const AVATAR_TONES = {
  navy:   ['#1e3a5f', '#0b1220', '#3b5170'],
  bronze: ['#6b3a17', '#140b06', '#8a5a33'],
  silver: ['#475569', '#0b1220', '#94a3b8'],
  gold:   ['#7c5a0b', '#150f03', '#b8912b'],
  cyan:   ['#0e5d73', '#04121a', '#2aa6c4'],
  purple: ['#5b21b6', '#0f0620', '#8b5cf6'],
  red:    ['#7f1d2d', '#16060a', '#b4424f'],
  ember:  ['#8a2d0b', '#170704', '#c2531f'],
  ice:    ['#1d4f7a', '#07131f', '#5aa9d6'],
  green:  ['#14532d', '#05140c', '#2f8a57'],
  brown:  ['#5c3a1e', '#140c06', '#8b6440'],
  ghost:  ['#334d66', '#0a1119', '#6f8fae'],
  cosmos: ['#3b1d8f', '#05030f', '#a78bfa'],
  // Seasonal event pictures
  rose:    ['#9f1239', '#1a0509', '#e8798f'],
  sea:     ['#0e7490', '#03161c', '#38bdf8'],
  pumpkin: ['#9a3412', '#140703', '#f97316'],
  indigo:  ['#4338ca', '#0b0a24', '#818cf8'],
  pine:    ['#166534', '#04140a', '#4ade80'],
  night:   ['#1e3a8a', '#050a1c', '#c4b5fd'],
  pastel:  ['#7c3aed', '#1e1433', '#f0abfc'],
  lacquer: ['#b91c1c', '#1c0303', '#fbbf24'],
  moon:    ['#1e40af', '#050b24', '#fde68a'],
  // Premium photo pictures (their own art draws the frame)
  sovereign: ['#1d3a8a', '#050b1f', '#c9a14a'],
  inferno:   ['#5c1414', '#0a0612', '#c9a14a'],
  guardian:  ['#5c1a24', '#080a18', '#c9a14a'],
  turtley:   ['#065f46', '#03140c', '#c9a14a']
};

// § Header + Home shell behaviour (owner, v316)
// One consolidated enhancement owns the responsive header, Home mode persistence,
// fixed Home mode-card sizing and the game-styled Exit confirmation.
(() => {
  const HOME_MODE_KEY = 'shithead_home_mode';

  function initHeaderAndHomeShell() {
    const header = document.querySelector('body > header');
    const lobby = document.getElementById('lobbyScreen');
    const leaveBtn = document.getElementById('leaveGameBtn');
    const shop = document.getElementById('headerShopBtn');
    const diamonds = document.getElementById('headerDiamondBtn');
    const diamondCount = document.getElementById('headerDiamondCount');
    const roomCode = document.getElementById('roomCodeBadge');
    const profile = document.getElementById('headerProfileBtn');
    const inbox = document.getElementById('headerInboxBtn');
    const menu = document.getElementById('hamburgerBtn');
    if (!header || !lobby || !leaveBtn || !shop || !diamonds || !profile || !inbox || !menu) return;

    const headerParts = [...header.children].filter(el => el.tagName === 'DIV');
    const left = headerParts[0];
    const logo = headerParts[1];
    const right = headerParts[2];
    if (!left || !logo || !right) return;

    left.classList.add('home-header-left');
    logo.classList.add('home-header-logo');
    right.classList.add('home-header-right');
    header.style.zIndex = '110';

    const makeHeaderButton = (id, label, icon, targetId, transient = false) => {
      let btn = document.getElementById(id);
      if (!btn) {
        btn = document.createElement('button');
        btn.id = id;
        btn.type = 'button';
        btn.className = 'relative h-7 flex items-center justify-center bg-transparent hover:brightness-125 active:scale-95 transition tip-below';
        btn.style.width = '1.75rem';
        btn.dataset.tip = label;
        btn.setAttribute('aria-label', label);
        btn.innerHTML = `<svg style="width:28px;height:28px" viewBox="0 0 32 32" aria-hidden="true"><use href="#${icon}"/></svg>`;
        btn.addEventListener('click', () => document.getElementById(targetId)?.click());
      }
      btn.classList.toggle('header-home-transient', transient);
      return btn;
    };

    const challenges = makeHeaderButton('homeHeaderChallengesBtn', 'Challenges', 'ui-challenges', 'menuChallengesBtn', true);
    const custom = makeHeaderButton('homeHeaderCustomBtn', 'Custom', 'ui-personalise', 'menuThemesBtn', false);
    const settings = makeHeaderButton('homeHeaderSettingsBtn', 'Settings', 'ui-settings', 'menuSettingsBtn', false);
    const guide = makeHeaderButton('homeHeaderGuideBtn', 'Guide', 'ui-guide', 'menuGuideBtn', true);

    // Home-only controls collapse away once the player leaves Home. Custom,
    // Profile, Mailbox and Settings remain because they are part of the compact
    // non-Home header too.
    shop.classList.add('header-home-transient');
    menu.classList.add('header-home-transient');

    // Physical grouping: Home reads
    // Exit · Shop · Diamonds/value-or-room · Challenges · Custom · Settings ·
    // Profile · Mailbox · Guide · Menu.
    left.insertBefore(leaveBtn, left.firstChild);
    left.insertBefore(shop, diamonds);
    if (roomCode && roomCode.parentElement === left) left.insertBefore(diamonds, roomCode);
    else if (!diamonds.parentElement || diamonds.parentElement !== left) left.appendChild(diamonds);

    right.appendChild(challenges);
    right.appendChild(custom);
    right.appendChild(settings);
    right.appendChild(profile);
    right.appendChild(inbox);
    right.appendChild(guide);
    right.appendChild(menu);

    const style = document.createElement('style');
    style.id = 'headerHomeShellStyles';
    style.textContent = `
      :root { --home-head-btn:1.75rem; }
      @media (min-width:768px) { :root { --home-head-btn:38px; } }

      /* Global header layout: no wrapping or overlap. The centre logo is allowed
         to use the remaining width off Home; button hit-boxes keep their size. */
      body > header {
        overflow:hidden;
        flex-wrap:nowrap !important;
      }
      .home-header-left,
      .home-header-right {
        min-width:0 !important;
        flex-wrap:nowrap !important;
      }
      .home-header-logo {
        min-width:0 !important;
        flex:1 1 auto !important;
        max-width:min(180px, calc(100vw - 214px));
        overflow:hidden;
        opacity:1;
        transform:translateX(0) scale(1);
        transition:max-width .26s cubic-bezier(.2,.8,.2,1), opacity .18s ease,
          transform .26s cubic-bezier(.2,.8,.2,1), padding .26s cubic-bezier(.2,.8,.2,1) !important;
      }
      .home-header-logo > * { max-width:100%; }

      /* Home-only icons fade, slide and collapse toward Menu instead of popping
         out. The negative margin removes their layout footprint only after their
         width has visually collapsed, so neighbouring icons glide into place. */
      .header-home-transient {
        display:flex !important;
        flex:0 0 var(--home-head-btn);
        width:var(--home-head-btn);
        max-width:0;
        min-width:0;
        opacity:0;
        overflow:hidden;
        pointer-events:none;
        transform:translateX(12px) scale(.86);
        transform-origin:right center;
        margin-left:calc(var(--home-head-btn) * -1);
        transition:max-width .26s cubic-bezier(.2,.8,.2,1), opacity .17s ease,
          transform .26s cubic-bezier(.2,.8,.2,1), margin-left .26s cubic-bezier(.2,.8,.2,1) !important;
      }
      body.home-shell-active .header-home-transient {
        max-width:var(--home-head-btn);
        opacity:1;
        pointer-events:auto;
        transform:translateX(0) scale(1);
        margin-left:0;
      }

      #leaveGameBtn {
        display:flex !important;
        flex:0 0 var(--home-head-btn);
      }
      #headerDiamondBtn {
        display:flex !important;
        flex:0 0 auto;
      }
      body.header-room-code-active #headerDiamondCount { display:none !important; }

      /* Home has no small header logo, allowing the ten requested controls to use
         the full width without shrinking their button boxes. */
      body.home-shell-active .home-header-logo {
        flex:0 0 0 !important;
        max-width:0 !important;
        opacity:0;
        padding-left:0 !important;
        padding-right:0 !important;
        pointer-events:none;
        transform:translateX(10px) scale(.9);
      }
      body.home-shell-active > header {
        justify-content:center !important;
        gap:1px !important;
        padding-left:2px !important;
        padding-right:2px !important;
      }
      body.home-shell-active .home-header-left,
      body.home-shell-active .home-header-right {
        flex:0 1 auto !important;
        gap:1px !important;
      }

      /* Explicit ordering. Off Home the transient items collapse, leaving exactly:
         Exit · Diamonds/value-or-room · logo · Custom · Profile · Mailbox · Settings. */
      #leaveGameBtn { order:1; }
      #headerShopBtn { order:2; }
      #headerDiamondBtn { order:3; }
      #roomCodeBadge { order:4; }

      body.home-shell-active #homeHeaderChallengesBtn { order:10; }
      body.home-shell-active #homeHeaderCustomBtn { order:20; }
      body.home-shell-active #homeHeaderSettingsBtn { order:30; }
      body.home-shell-active #headerProfileBtn { order:40; }
      body.home-shell-active #headerInboxBtn { order:50; }
      body.home-shell-active #homeHeaderGuideBtn { order:60; }
      body.home-shell-active #hamburgerBtn { order:70; }

      body:not(.home-shell-active) #homeHeaderCustomBtn { order:10; }
      body:not(.home-shell-active) #headerProfileBtn { order:20; }
      body:not(.home-shell-active) #headerInboxBtn { order:30; }
      body:not(.home-shell-active) #homeHeaderSettingsBtn { order:40; }

      /* Speed belongs in Settings/in-match controls, not the Home decision flow. */
      #lobbySpeedBox { display:none !important; }

      /* Stable Home mode-card footprint. A live Friends room can expand because
         its player/rule controls genuinely need extra room. */
      #singleOptions, #multiOptions, #rankedOptions {
        box-sizing:border-box;
        height:220px;
        min-height:220px;
        padding:10px !important;
        border:1px solid rgba(51,65,85,.78);
        border-radius:14px;
        background:rgba(2,6,23,.38);
      }
      #multiOptions:has(#multiLobbyRoom:not(.hidden)) {
        height:auto;
        min-height:220px;
      }

      #headerExitConfirm {
        position:fixed;
        inset:0;
        z-index:140;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:18px;
        background:rgba(2,6,23,.86);
        backdrop-filter:blur(8px);
      }
      #headerExitConfirm.hidden { display:none !important; }
      #headerExitConfirm .hex-card {
        width:min(340px,calc(100vw - 32px));
        border:2px solid #f59e0b;
        border-radius:18px;
        background:#020617;
        box-shadow:0 22px 60px rgba(0,0,0,.65);
        padding:18px;
        text-align:center;
      }
      #headerExitConfirm .hex-icon { width:42px; height:42px; margin:0 auto 10px; }
      #headerExitConfirm .hex-title { color:#f8fafc; font-size:15px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; }
      #headerExitConfirm .hex-copy { margin:8px 0 15px; color:#94a3b8; font-size:11px; font-weight:650; line-height:1.45; }
      #headerExitConfirm .hex-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      #headerExitConfirm .hex-btn { min-height:40px; border-radius:11px; border:1px solid #475569; background:#1e293b; color:#e2e8f0; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; }
      #headerExitConfirm .hex-btn.confirm { border-color:#be123c; background:#4c0519; color:#fda4af; }
      #headerExitConfirm .hex-btn:hover { filter:brightness(1.14); }

      body.reduce-motion .header-home-transient,
      body.reduce-motion .home-header-logo { transition:none !important; }
      @media (prefers-reduced-motion:reduce) {
        .header-home-transient, .home-header-logo { transition:none !important; }
        #headerExitConfirm { backdrop-filter:none; }
      }
    `;
    document.head.appendChild(style);

    const pagePanelIds = [
      'shopModal','challengesModal','themesModal','settingsModal','profileModal',
      'rulesModal','friendsModal','leaderboardModal','tutorialHubScreen','statsModal',
      'supportModal','inboxModal','levelLadderModal','matchStatsModal','historyGameModal'
    ];
    const pagePanels = pagePanelIds.map(id => document.getElementById(id)).filter(Boolean);
    const isVisible = el => !!el && !el.classList.contains('hidden');
    const visiblePanel = () => pagePanels.find(isVisible) || null;

    function syncHeaderSurface() {
      const lobbyVisible = !lobby.classList.contains('hidden');
      const pageOpen = pagePanels.some(isVisible);
      const onHome = lobbyVisible && !pageOpen;
      document.body.classList.toggle('home-shell-active', onHome);

      const codeActive = !!roomCode && !roomCode.classList.contains('hidden') && !!roomCode.textContent.trim();
      document.body.classList.toggle('header-room-code-active', codeActive);
      diamondCount?.setAttribute('aria-hidden', codeActive ? 'true' : 'false');
    }
    window.syncHomeShellHeader = syncHeaderSurface;

    const observer = new MutationObserver(() => requestAnimationFrame(syncHeaderSurface));
    [lobby, roomCode, ...pagePanels].filter(Boolean).forEach(el => observer.observe(el, {
      attributes:true,
      attributeFilter:['class'],
      childList:el === roomCode,
      characterData:el === roomCode,
      subtree:el === roomCode
    }));
    window.addEventListener('pageshow', syncHeaderSurface);

    // Keep Exit global even though older game paths still add .hidden to it.
    new MutationObserver(() => {
      if (leaveBtn.classList.contains('hidden')) leaveBtn.classList.remove('hidden');
    }).observe(leaveBtn, { attributes:true, attributeFilter:['class'] });
    leaveBtn.classList.remove('hidden');

    // Primary play/start language stays green everywhere.
    const hostRoom = document.getElementById('hostRoomBtn');
    if (hostRoom) {
      hostRoom.classList.remove('bg-amber-600','hover:bg-amber-500');
      hostRoom.classList.add('bg-emerald-600','hover:bg-emerald-500');
    }

    // Persist the last top-level Home mode without persisting transient room/search state.
    const modeMap = {
      bots: document.getElementById('modeSingleBtn'),
      friends: document.getElementById('modeMultiBtn'),
      ranked: document.getElementById('modeRankedBtn')
    };
    Object.entries(modeMap).forEach(([mode, btn]) => btn?.addEventListener('click', () => {
      try { localStorage.setItem(HOME_MODE_KEY, mode); } catch (e) {}
    }));

    let savedMode = 'bots';
    try {
      const candidate = localStorage.getItem(HOME_MODE_KEY);
      if (candidate && modeMap[candidate]) savedMode = candidate;
    } catch (e) {}

    function buildConfirm() {
      let modal = document.getElementById('headerExitConfirm');
      if (modal) return modal;
      modal = document.createElement('div');
      modal.id = 'headerExitConfirm';
      modal.className = 'hidden';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.innerHTML = `<div class="hex-card"><svg class="hex-icon" viewBox="0 0 32 32" aria-hidden="true"><use href="#ui-exit"/></svg><div id="headerExitTitle" class="hex-title">Leave ShitHead?</div><p id="headerExitCopy" class="hex-copy"></p><div class="hex-actions"><button type="button" id="headerExitCancel" class="hex-btn">Stay</button><button type="button" id="headerExitConfirmBtn" class="hex-btn confirm">Exit</button></div></div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
      modal.querySelector('#headerExitCancel')?.addEventListener('click', () => modal.classList.add('hidden'));
      return modal;
    }

    function showExitConfirm({ title, copy, confirmLabel, onConfirm }) {
      const modal = buildConfirm();
      modal.querySelector('#headerExitTitle').textContent = title;
      modal.querySelector('#headerExitCopy').textContent = copy;
      const yes = modal.querySelector('#headerExitConfirmBtn');
      yes.textContent = confirmLabel;
      yes.onclick = () => { modal.classList.add('hidden'); onConfirm(); };
      modal.classList.remove('hidden');
      requestAnimationFrame(() => modal.querySelector('#headerExitCancel')?.focus());
    }

    function closeCurrentPage(panel) {
      if (!panel) return false;
      const close = panel.querySelector('button[aria-label="Close"],button[id$="CloseBtn"],button[id$="Close"],.pp-x');
      if (close) close.click();
      else panel.classList.add('hidden');
      requestAnimationFrame(syncHeaderSurface);
      return true;
    }

    function exitSite() {
      if (history.length > 1) { history.back(); return; }
      try { window.close(); } catch (e) {}
      setTimeout(() => { if (!document.hidden) location.replace('about:blank'); }, 120);
    }

    const nativeConfirm = window.confirm.bind(window);
    let approvedNativeExit = false;
    let approvedConfirmUntil = 0;
    window.confirm = function(message) {
      if (Date.now() < approvedConfirmUntil && /leave|return to the main menu/i.test(String(message || ''))) return true;
      return nativeConfirm(message);
    };

    const isLiveMatch = () => typeof state !== 'undefined'
      && (state.phase === 'PLAY' || state.phase === 'SWAP')
      && lobby.classList.contains('hidden');

    leaveBtn.addEventListener('click', e => {
      if (approvedNativeExit) { approvedNativeExit = false; return; }

      const drawer = document.getElementById('hamburgerDrawer');
      if (drawer?.classList.contains('open')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (typeof closeHamburgerMenu === 'function') closeHamburgerMenu();
        else drawer.classList.remove('open');
        return;
      }

      const panel = visiblePanel();
      if (panel) {
        e.preventDefault();
        e.stopImmediatePropagation();
        closeCurrentPage(panel);
        return;
      }

      if (isLiveMatch()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const ranked = !!(state.isRanked && state.isMultiplayer);
        showExitConfirm({
          title: ranked ? 'Leave Ranked Match?' : 'Leave Match?',
          copy: ranked
            ? 'A bot will take your seat and this counts as a loss, so your rating can go down.'
            : 'Your progress in this match will be lost and you may not be able to rejoin.',
          confirmLabel: 'Leave Match',
          onConfirm: () => {
            approvedNativeExit = true;
            approvedConfirmUntil = Date.now() + 4000;
            leaveBtn.click();
          }
        });
        return;
      }

      if (!lobby.classList.contains('hidden')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showExitConfirm({
          title: 'Exit ShitHead?',
          copy: 'Leave the game and return to where you came from?',
          confirmLabel: 'Exit Game',
          onConfirm: exitSite
        });
      }
    }, true);

    setTimeout(() => {
      if (!lobby.classList.contains('hidden') && modeMap[savedMode]) modeMap[savedMode].click();
      syncHeaderSurface();
    }, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeaderAndHomeShell, { once:true });
  else initHeaderAndHomeShell();
})();
