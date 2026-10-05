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

// § Home header + mode polish (owner, v314)
// Loaded here because this tiny shared script already runs on every game page.
// Everything is progressive DOM enhancement: no gameplay or Firebase state changes.
(() => {
  const HOME_MODE_KEY = 'shithead_home_mode';

  function initHomeShellPolish() {
    const header = document.querySelector('body > header');
    const lobby = document.getElementById('lobbyScreen');
    const shop = document.getElementById('headerShopBtn');
    const diamonds = document.getElementById('headerDiamondBtn');
    const diamondCount = document.getElementById('headerDiamondCount');
    const roomCode = document.getElementById('roomCodeBadge');
    const profile = document.getElementById('headerProfileBtn');
    const inbox = document.getElementById('headerInboxBtn');
    const menu = document.getElementById('hamburgerBtn');
    if (!header || !lobby || !shop || !diamonds || !profile || !inbox || !menu) return;

    const headerParts = [...header.children].filter(el => el.tagName === 'DIV');
    const left = headerParts[0];
    const logo = headerParts[1];
    const right = headerParts[2];
    left?.classList.add('home-header-left');
    logo?.classList.add('home-header-logo');
    right?.classList.add('home-header-right');

    const makeHeaderButton = (id, label, icon, targetId) => {
      let btn = document.getElementById(id);
      if (btn) return btn;
      btn = document.createElement('button');
      btn.id = id;
      btn.type = 'button';
      btn.className = 'home-only-header relative h-7 flex items-center justify-center bg-transparent hover:brightness-125 active:scale-95 transition tip-below';
      btn.style.width = '1.75rem';
      btn.dataset.tip = label;
      btn.setAttribute('aria-label', label);
      btn.innerHTML = `<svg style="width:28px;height:28px" viewBox="0 0 32 32" aria-hidden="true"><use href="#${icon}"/></svg>`;
      btn.addEventListener('click', () => {
        const target = document.getElementById(targetId);
        if (target) target.click();
      });
      return btn;
    };

    // Home order: Shop · Diamonds/value (or room code) · Challenges · Custom ·
    // Settings · Profile · Mailbox · Menu. Existing controls retain their exact
    // button/icon sizes; only the gaps collapse a little on narrow phones.
    shop.classList.add('home-only-header');
    const challenges = makeHeaderButton('homeHeaderChallengesBtn', 'Challenges', 'ui-challenges', 'menuChallengesBtn');
    const custom = makeHeaderButton('homeHeaderCustomBtn', 'Custom', 'ui-personalise', 'menuThemesBtn');
    const settings = makeHeaderButton('homeHeaderSettingsBtn', 'Settings', 'ui-settings', 'menuSettingsBtn');
    right.insertBefore(challenges, profile);
    right.insertBefore(custom, profile);
    right.insertBefore(settings, profile);

    const style = document.createElement('style');
    style.id = 'homeShellPolishStyles';
    style.textContent = `
      :root { --home-head-btn:1.75rem; }
      @media (min-width:768px) { :root { --home-head-btn:38px; } }

      /* Home-only shortcuts physically collapse toward the hamburger when leaving
         Home. Their matching rows are already in the drawer, so the motion reads
         as the shortcuts returning to Menu rather than abruptly disappearing. */
      #headerShopBtn.home-only-header,
      .home-only-header {
        display:flex !important;
        flex:0 0 var(--home-head-btn);
        max-width:0;
        opacity:0;
        overflow:hidden;
        pointer-events:none;
        transform:translateX(18px) scale(.88);
        transform-origin:right center;
        margin-left:calc(var(--home-head-btn) * -1);
        transition:max-width .24s var(--ease-soft,ease), opacity .18s ease,
          transform .24s var(--ease-soft,ease), margin-left .24s var(--ease-soft,ease) !important;
      }
      body.home-shell-active #headerShopBtn.home-only-header,
      body.home-shell-active .home-only-header {
        max-width:var(--home-head-btn);
        opacity:1;
        pointer-events:auto;
        transform:translateX(0) scale(1);
        margin-left:0;
      }

      .home-header-logo {
        max-width:220px;
        opacity:1;
        overflow:hidden;
        transition:max-width .24s var(--ease-soft,ease), opacity .16s ease,
          transform .24s var(--ease-soft,ease), padding .24s var(--ease-soft,ease);
      }
      body.home-shell-active .home-header-logo {
        max-width:0;
        opacity:0;
        padding-left:0 !important;
        padding-right:0 !important;
        pointer-events:none;
        transform:translateX(14px) scale(.9);
      }
      body.home-shell-active > header {
        justify-content:center !important;
        gap:2px !important;
        padding-left:4px !important;
        padding-right:4px !important;
      }
      body.home-shell-active .home-header-left,
      body.home-shell-active .home-header-right {
        flex:0 0 auto !important;
        min-width:0 !important;
        gap:2px !important;
      }
      body.home-shell-active .home-header-left { justify-content:flex-start !important; }
      body.home-shell-active .home-header-right { justify-content:flex-end !important; }

      /* In a hosted Friends room the six-digit room code takes the count's place,
         while the Diamond icon itself remains in exactly the same header position. */
      body.home-shell-active.home-shell-room #headerDiamondCount { display:none !important; }

      /* Speed is already available in Settings and in-game, so it no longer takes
         up decision space before a match. */
      #lobbySpeedBox { display:none !important; }

      /* One stable mode-card footprint: switching Bots / Friends / Ranked no
         longer recentres the entire Home panel. A joined/hosted room is the one
         deliberate exception because its live player/rules controls need space. */
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

      body.reduce-motion .home-only-header,
      body.reduce-motion .home-header-logo { transition:none !important; }
      @media (prefers-reduced-motion:reduce) {
        .home-only-header, .home-header-logo { transition:none !important; }
      }
    `;
    document.head.appendChild(style);

    const blockingPanels = [
      'shopModal','challengesModal','themesModal','settingsModal','profileModal',
      'rulesModal','friendsModal','leaderboardModal','tutorialHubScreen','statsModal',
      'supportModal','inboxModal','levelLadderModal'
    ].map(id => document.getElementById(id)).filter(Boolean);
    const drawer = document.getElementById('hamburgerDrawer');

    const isVisible = el => !!el && !el.classList.contains('hidden');
    const syncHeaderSurface = () => {
      const lobbyVisible = !lobby.classList.contains('hidden');
      const panelOpen = blockingPanels.some(isVisible) || !!drawer?.classList.contains('open');
      const onHome = lobbyVisible && !panelOpen;
      document.body.classList.toggle('home-shell-active', onHome);
      const roomVisible = onHome && roomCode && !roomCode.classList.contains('hidden') && roomCode.textContent.trim();
      document.body.classList.toggle('home-shell-room', !!roomVisible);
      if (diamondCount) diamondCount.setAttribute('aria-hidden', roomVisible ? 'true' : 'false');
    };
    window.syncHomeShellHeader = syncHeaderSurface;

    const observed = [lobby, roomCode, drawer, ...blockingPanels].filter(Boolean);
    const observer = new MutationObserver(() => requestAnimationFrame(syncHeaderSurface));
    observed.forEach(el => observer.observe(el, { attributes:true, attributeFilter:['class'], childList:el === roomCode, characterData:el === roomCode, subtree:el === roomCode }));
    window.addEventListener('pageshow', syncHeaderSurface);
    syncHeaderSurface();

    // The four primary paths use the same green action language. Sign-in stays
    // gold because it is account emphasis rather than starting/continuing play.
    const hostRoom = document.getElementById('hostRoomBtn');
    if (hostRoom) {
      hostRoom.classList.remove('bg-amber-600','hover:bg-amber-500');
      hostRoom.classList.add('bg-emerald-600','hover:bg-emerald-500');
    }

    // Persist only the top-level Home mode. Room/search state is intentionally
    // not persisted here; existing reconnect/session logic owns that separately.
    const modeMap = {
      bots: document.getElementById('modeSingleBtn'),
      friends: document.getElementById('modeMultiBtn'),
      ranked: document.getElementById('modeRankedBtn')
    };
    Object.entries(modeMap).forEach(([mode, btn]) => {
      btn?.addEventListener('click', () => {
        try { localStorage.setItem(HOME_MODE_KEY, mode); } catch (e) {}
      });
    });

    let savedMode = 'bots';
    try {
      const candidate = localStorage.getItem(HOME_MODE_KEY);
      if (candidate && modeMap[candidate]) savedMode = candidate;
    } catch (e) {}
    // Let the main script finish attaching its own mode listeners first, then
    // restore the player's last picker selection without changing game state.
    setTimeout(() => {
      if (!lobby.classList.contains('hidden') && modeMap[savedMode]) modeMap[savedMode].click();
      syncHeaderSurface();
    }, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHomeShellPolish, { once:true });
  else initHomeShellPolish();
})();

// § Header exit / back navigation + Guide shortcut (owner, v315)
// The Exit control is now always present. On Home it exits the app/site after a
// game-styled confirmation; on a page it acts as Back; in a live match it asks
// with the same game-styled confirmation before delegating to the existing leave
// logic. The existing leave logic remains the single source of truth for cleanup.
(() => {
  function initHeaderExitNavigation() {
    const header = document.querySelector('body > header');
    const lobby = document.getElementById('lobbyScreen');
    const leaveBtn = document.getElementById('leaveGameBtn');
    const diamonds = document.getElementById('headerDiamondBtn');
    const diamondCount = document.getElementById('headerDiamondCount');
    const roomCode = document.getElementById('roomCodeBadge');
    const shop = document.getElementById('headerShopBtn');
    const inbox = document.getElementById('headerInboxBtn');
    const menu = document.getElementById('hamburgerBtn');
    if (!header || !lobby || !leaveBtn || !diamonds || !inbox || !menu) return;

    // The Diamond pill is the Shop entry point, so the separate cart button is
    // redundant in the tighter header. The Diamond icon itself never disappears.
    shop?.classList.remove('home-only-header');

    const right = [...header.children].filter(el => el.tagName === 'DIV')[2];
    let guide = document.getElementById('homeHeaderGuideBtn');
    if (!guide) {
      guide = document.createElement('button');
      guide.id = 'homeHeaderGuideBtn';
      guide.type = 'button';
      guide.className = 'home-only-header relative h-7 flex items-center justify-center bg-transparent hover:brightness-125 active:scale-95 transition tip-below';
      guide.style.width = '1.75rem';
      guide.dataset.tip = 'Guide';
      guide.setAttribute('aria-label', 'Guide');
      guide.innerHTML = '<svg style="width:28px;height:28px" viewBox="0 0 32 32" aria-hidden="true"><use href="#ui-guide"/></svg>';
      guide.addEventListener('click', () => document.getElementById('menuGuideBtn')?.click());
    }
    right?.insertBefore(guide, menu);

    const style = document.createElement('style');
    style.id = 'headerExitNavigationStyles';
    style.textContent = `
      /* Requested Home order is Exit · Diamonds/room · Challenges · Custom ·
         Settings · Profile · Mailbox · Guide · Menu. The Diamond pill opens Shop,
         so a second Shop icon is intentionally removed. */
      #headerShopBtn { display:none !important; }
      #leaveGameBtn { display:flex !important; flex:0 0 var(--home-head-btn,1.75rem); }
      #headerDiamondBtn { display:flex !important; flex:0 0 auto; }
      body.header-room-code-active #headerDiamondCount { display:none !important; }

      #headerExitConfirm { position:fixed; inset:0; z-index:120; display:flex; align-items:center; justify-content:center; padding:18px; background:rgba(2,6,23,.86); backdrop-filter:blur(8px); }
      #headerExitConfirm.hidden { display:none !important; }
      #headerExitConfirm .hex-card { width:min(340px,calc(100vw - 32px)); border:2px solid #f59e0b; border-radius:18px; background:#020617; box-shadow:0 22px 60px rgba(0,0,0,.65); padding:18px; text-align:center; }
      #headerExitConfirm .hex-icon { width:42px; height:42px; margin:0 auto 10px; }
      #headerExitConfirm .hex-title { color:#f8fafc; font-size:15px; font-weight:900; letter-spacing:.04em; text-transform:uppercase; }
      #headerExitConfirm .hex-copy { margin:8px 0 15px; color:#94a3b8; font-size:11px; font-weight:650; line-height:1.45; }
      #headerExitConfirm .hex-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
      #headerExitConfirm .hex-btn { min-height:40px; border-radius:11px; border:1px solid #475569; background:#1e293b; color:#e2e8f0; font-size:11px; font-weight:900; text-transform:uppercase; letter-spacing:.06em; }
      #headerExitConfirm .hex-btn.confirm { border-color:#be123c; background:#4c0519; color:#fda4af; }
      #headerExitConfirm .hex-btn:hover { filter:brightness(1.14); }
      body.reduce-motion #headerExitConfirm { backdrop-filter:none; }
    `;
    document.head.appendChild(style);

    // Force the intended order without changing any control dimensions.
    const left = [...header.children].filter(el => el.tagName === 'DIV')[0];
    if (left) {
      left.insertBefore(leaveBtn, left.firstChild);
      left.insertBefore(diamonds, roomCode || null);
    }
    const settings = document.getElementById('homeHeaderSettingsBtn');
    const challenges = document.getElementById('homeHeaderChallengesBtn');
    const custom = document.getElementById('homeHeaderCustomBtn');
    const profile = document.getElementById('headerProfileBtn');
    if (right) {
      if (challenges) right.insertBefore(challenges, profile);
      if (custom) right.insertBefore(custom, profile);
      if (settings) right.insertBefore(settings, profile);
      right.insertBefore(inbox, guide);
      right.insertBefore(guide, menu);
    }

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
      modal.querySelector('#headerExitCancel').addEventListener('click', () => modal.classList.add('hidden'));
      return modal;
    }

    let approvedNativeExit = false;
    let approvedConfirmUntil = 0;
    const nativeConfirm = window.confirm.bind(window);
    // The old match-leave handler uses confirm(). We keep its cleanup/ranked/
    // series logic but suppress only that redundant browser prompt immediately
    // after our in-game confirmation has already been accepted.
    window.confirm = function(message) {
      if (Date.now() < approvedConfirmUntil && /leave|return to the main menu/i.test(String(message || ''))) return true;
      return nativeConfirm(message);
    };

    function showExitConfirm({ title, copy, confirmLabel, onConfirm }) {
      const modal = buildConfirm();
      modal.querySelector('#headerExitTitle').textContent = title;
      modal.querySelector('#headerExitCopy').textContent = copy;
      modal.querySelector('#headerExitConfirmBtn').textContent = confirmLabel;
      modal.classList.remove('hidden');
      const yes = modal.querySelector('#headerExitConfirmBtn');
      yes.onclick = () => { modal.classList.add('hidden'); onConfirm(); };
      requestAnimationFrame(() => modal.querySelector('#headerExitCancel')?.focus());
    }

    const pagePanels = [
      'shopModal','challengesModal','themesModal','settingsModal','profileModal',
      'rulesModal','friendsModal','leaderboardModal','tutorialHubScreen','statsModal',
      'supportModal','inboxModal','levelLadderModal','matchStatsModal','historyGameModal'
    ];
    const visiblePanel = () => pagePanels.map(id => document.getElementById(id)).find(el => el && !el.classList.contains('hidden')) || null;

    function closeCurrentPage(panel) {
      if (!panel) return false;
      const close = panel.querySelector('button[aria-label="Close"],button[id$="CloseBtn"],button[id$="Close"],.pp-x');
      if (close) close.click();
      else panel.classList.add('hidden');
      return true;
    }

    function exitSite() {
      // Browser tabs cannot always be programmatically closed. Prefer returning to
      // the page that launched the game; a direct-opened tab gets a clean blank page.
      if (history.length > 1) { history.back(); return; }
      try { window.close(); } catch (e) {}
      setTimeout(() => {
        if (!document.hidden) location.replace('about:blank');
      }, 120);
    }

    function isLiveMatch() {
      return typeof state !== 'undefined' && (state.phase === 'PLAY' || state.phase === 'SWAP' || state.phase === 'FINISHED') && lobby.classList.contains('hidden');
    }

    leaveBtn.addEventListener('click', e => {
      if (approvedNativeExit) { approvedNativeExit = false; return; }

      const drawer = document.getElementById('hamburgerDrawer');
      if (drawer?.classList.contains('open')) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (typeof closeHamburgerMenu === 'function') closeHamburgerMenu();
        else drawer.classList.remove('open');
        return;
      }

      const panel = visiblePanel();
      if (panel) {
        e.preventDefault(); e.stopImmediatePropagation();
        closeCurrentPage(panel);
        return;
      }

      if (isLiveMatch()) {
        e.preventDefault(); e.stopImmediatePropagation();
        const ranked = !!(typeof state !== 'undefined' && state.isRanked && state.isMultiplayer);
        showExitConfirm({
          title: ranked ? 'Leave Ranked Match?' : 'Leave Match?',
          copy: ranked ? 'A bot will take your seat and this counts as a loss, so your rating can go down.' : 'Your progress in this match will be lost and you may not be able to rejoin.',
          confirmLabel: 'Leave Match',
          onConfirm: () => {
            approvedNativeExit = true;
            approvedConfirmUntil = Date.now() + 4000;
            leaveBtn.click();
          }
        });
        return;
      }

      // Home: a deliberate Exit means leaving the web app/site, not navigating
      // to another in-game page.
      if (!lobby.classList.contains('hidden')) {
        e.preventDefault(); e.stopImmediatePropagation();
        showExitConfirm({
          title: 'Exit ShitHead?',
          copy: 'Leave the game and return to where you came from?',
          confirmLabel: 'Exit Game',
          onConfirm: exitSite
        });
      }
    }, true);

    function syncHeaderCode() {
      const active = !!roomCode && !roomCode.classList.contains('hidden') && !!roomCode.textContent.trim();
      document.body.classList.toggle('header-room-code-active', active);
      diamondCount?.setAttribute('aria-hidden', active ? 'true' : 'false');
    }
    if (roomCode) new MutationObserver(syncHeaderCode).observe(roomCode, { attributes:true, childList:true, characterData:true, subtree:true });
    syncHeaderCode();

    // The old game code hides Exit in lobby/page transitions. This button is now
    // global, so immediately restore it whenever that happens.
    new MutationObserver(() => {
      if (leaveBtn.classList.contains('hidden')) leaveBtn.classList.remove('hidden');
    }).observe(leaveBtn, { attributes:true, attributeFilter:['class'] });
    leaveBtn.classList.remove('hidden');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initHeaderExitNavigation, { once:true });
  else initHeaderExitNavigation();
})();
