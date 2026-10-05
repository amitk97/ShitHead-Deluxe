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
