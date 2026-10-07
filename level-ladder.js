// Level Ladder, unlock displays, reward previews and seen-state indicators.
// Classic script loaded before app.js; shared game state is read when invoked.
    // "New" dots (v279, owner): a gold dot on your level (home, Profile, menu)
    // while a level you've reached has a reward or unlock you haven't looked at
    // on the Level Ladder yet. The highest level seen there is kept per account
    // on this device (localStorage shithead_ladder_seen_<uid>); the first time
    // an account is seen it starts at its current level, so nobody gets a dot
    // for old levels. Opening the ladder clears it (and climbs from there).
    const LADDER_DOT_IDS = ['hamburgerLevel', 'profileLevelBadge', 'homeNameLevel'];
    function ladderSeenKey() { return currentUser ? `shithead_ladder_seen_${currentUser.uid}` : ''; }
    function ladderSeenLevel(level) {
      const key = ladderSeenKey();
      if (!key) return level;
      let seen = null;
      try { seen = localStorage.getItem(key); } catch (e) {}
      if (seen == null || !Number.isFinite(Number(seen))) {
        if (level > 0) { try { localStorage.setItem(key, String(level)); } catch (e) {} }
        return level;
      }
      return Number(seen);
    }
    function markLadderSeen(level) {
      const key = ladderSeenKey();
      if (key && level > 0) { try { localStorage.setItem(key, String(Math.max(level, Number(localStorage.getItem(key)) || 0))); } catch (e) {} }
    }
    function ladderHasNewSince(seen, level) {
      if (!(level > seen)) return false;
      for (const L of ladderRewards().keys()) if (L > seen && L <= level) return true;
      return false;
    }
    function paintLadderNewDots(level) {
      const fresh = level > 0 && ladderHasNewSince(ladderSeenLevel(level), level);
      LADDER_DOT_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.classList.contains('ll-new-dot') !== fresh) el.classList.toggle('ll-new-dot', fresh);
        if (fresh) el.setAttribute('aria-label', 'Your level: new rewards on the Level Ladder');
        else el.removeAttribute('aria-label');
      });
    }
    // Profile: the next level reward (a button to its tile in Custom).
    const LEVEL_REWARD_KIND = { 'Avatars': 'avatar', 'Card Backs': 'card back', 'Frames': 'frame', 'Table Themes': 'table', 'Burn Effects': 'burn' };
    function levelRewardRowHtml(level) {
      const r = nextLevelReward(level);
      if (!r) return '';
      const type = COSMETIC_CATEGORY_TYPES[r.category];
      return `<button type="button" class="xp-reward-next" data-showcase-type="${type}" data-showcase-id="${r.id}"><span class="xp-reward-art">${cosmeticPreview(r, type)}</span><span><small>Lvl ${r.level} reward</small>${escapeHtml(r.name)} ${LEVEL_REWARD_KIND[r.category] || ''}</span></button>`;
    }
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('.xp-reward-next');
      if (b) openShowcaseItemInCustom(b.dataset.showcaseType, b.dataset.showcaseId);
    });
    // § Level Ladder (v277, owner): one page with your XP and every level's
    // rewards, opened from your level anywhere (home, Profile, menu, the header
    // XP bar, Profile's XP section, the match summary, the level-up mail).
    // Built from the lists the game already uses (LEVEL_REWARDS, speed locks,
    // look slots, Best of series, Gauntlet modes, badge colours, level-up
    // Diamonds, XP_MAX_LEVEL), so a new level reward or a higher cap appears
    // here by itself. It opens scrolled to your level ("You are here").
    const LADDER_SPEEDS = ['0.5×', '1×', '2×', '4×'];
    const LADDER_KIND = { 'Avatars': 'Avatar', 'Card Backs': 'Card Back', 'Burn Effects': 'Burn', 'Frames': 'Frame', 'Table Themes': 'Table', 'Victory Effects': 'Victory', 'Joker Effects': 'Joker', 'Emote Packs': 'Emotes' };
    function ordinalNumber(n) {
      const t = n % 100, u = n % 10;
      return `${n}${t >= 11 && t <= 13 ? 'th' : u === 1 ? 'st' : u === 2 ? 'nd' : u === 3 ? 'rd' : 'th'}`;
    }
    function ladderMilestoneDiamonds(L) {
      if (L === XP_MAX_LEVEL && XP_RULES.maxLevelDiamonds) return XP_RULES.maxLevelDiamonds;
      return L % XP_RULES.milestoneEvery === 0 ? XP_RULES.milestoneDiamonds : XP_RULES.levelUpDiamonds;
    }
    // level → [{kind:'item', item} | {kind:'unlock', icon, name, tone, tip} | {kind:'badge', level}]
    function ladderRewards() {
      const at = new Map();
      const add = (L, piece) => { if (L > 1 && L <= XP_MAX_LEVEL) { if (!at.has(L)) at.set(L, []); at.get(L).push(piece); } };
      LEVEL_REWARDS.slice().sort((a, b) => a.level - b.level).forEach(item => add(item.level, { kind: 'item', item }));
      SPEED_UNLOCK_LEVELS.forEach((L, i) => { if (L > 0) add(L, { kind: 'unlock', icon: 'bolt', tone: '#38bdf8', name: `${LADDER_SPEEDS[i] || ''} game speed`, tip: `Play Vs Bots at ${LADDER_SPEEDS[i]} speed (signed in).` }); });
      LOADOUT_SLOT_LEVELS.forEach((L, i) => { if (L > 0) add(L, { kind: 'unlock', icon: 'save', tone: '#a78bfa', name: `Saved look ${i + 1}`, tip: `A ${i === 1 ? 'second' : i === 2 ? 'third' : 'new'} saved look in Custom.` }); });
      add(XP_RULES.giftLevel, { kind: 'unlock', icon: 'gift', tone: '#f9a8d4', name: 'Gifting', tip: 'Send Shop items to your friends as gifts.' });
      (XP_RULES.extraDaily || []).forEach((L, i) => add(L, { kind: 'unlock', icon: 'check', tone: '#34d399', name: `${ordinalNumber(3 + i + 1)} daily challenge`, tip: 'One more daily challenge every day.' }));
      const weeklyBase = WEEKLY_CHALLENGE_RULES[WEEKLY_CHALLENGE_RULES.length - 1].picks; // 5 a week from 2026-W41
      (XP_RULES.extraWeekly || []).forEach((L, i) => add(L, { kind: 'unlock', icon: 'check', tone: '#22d3ee', name: `${ordinalNumber(weeklyBase + i + 1)} weekly challenge`, tip: 'One more weekly challenge every week.' }));
      add(XP_RULES.weeklyRerollLevel, { kind: 'unlock', icon: 'refresh', tone: '#34d399', name: 'Weekly Reroll', tip: 'Swap one weekly challenge for a different one, once a week.' });
      Object.entries(SERIES_RULES.levels).forEach(([n, level]) => add(level, { kind: 'unlock', icon: 'swords', tone: '#f472b6', name: `Best of ${n}`, tip: `Play a Best of ${n} against a friend (both players level ${level}+).` }));
      Object.entries(GAUNTLET.modes || {}).forEach(([key, m]) => { if (m.level > 0) add(m.level, { kind: 'unlock', icon: key === 'boss' ? 'crown' : 'shield', tone: key === 'boss' ? '#c084fc' : '#f87171', name: `${m.name} Gauntlet`, tip: `${m.name} Gauntlet opens at level ${m.level}${m.needs ? ' once you have beaten the easier Gauntlets' : ''}.` }); });
      LEVEL_BADGE_TIERS.forEach(([L, , label]) => add(L, { kind: 'badge', level: L, name: `${label} badge` }));
      return at;
    }
    function ladderPieceHtml(piece) {
      if (piece.kind === 'item') {
        const it = piece.item, type = COSMETIC_CATEGORY_TYPES[it.category];
        const art = type === 'avatar' ? avatarHtml(it.id, 44) : cosmeticPreview(it, type);
        return `<button type="button" class="ll-piece" data-ladder-id="${it.id}" data-equip-type="${type}"><span class="ll-piece-art">${art}</span><span class="ll-pname">${escapeHtml(it.name)}</span><span class="ll-pkind">${LADDER_KIND[it.category] || ''}</span><span class="ll-equip">${equippedCosmetics[type] === it.id ? 'Equipped' : 'Equip'}</span></button>`;
      }
      if (piece.kind === 'badge') return `<button type="button" class="ll-piece" data-ladder-tip="${escapeHtml(`Your level badge turns ${piece.name.replace(' badge', '').toLowerCase()} at level ${piece.level}.`)}"><span class="ll-piece-art">${xpLevelBadge(piece.level, 'xp-badge-lg')}</span><span class="ll-pname">${escapeHtml(piece.name)}</span><span class="ll-pkind">Badge</span></button>`;
      return `<button type="button" class="ll-piece" data-ladder-tip="${escapeHtml(piece.tip)}"><span class="ll-piece-art"><span class="ll-unlock" style="--t:${piece.tone}">${icon(piece.icon)}</span></span><span class="ll-pname">${escapeHtml(piece.name)}</span><span class="ll-pkind">Unlock</span></button>`;
    }
    const ladderGem = (n) => `<span class="ll-gem">${icon('gem')}<b>${n}</b></span>`;
    function ladderNextReward(level, rewards) {
      const L = [...rewards.keys()].sort((a, b) => a - b).find(l => l > level);
      return L ? { level: L, piece: rewards.get(L)[0] } : null;
    }
    function ladderPieceName(piece) {
      if (piece.kind === 'item') return `${piece.item.name} ${(LADDER_KIND[piece.item.category] || '').toLowerCase()}`;
      return piece.name;
    }
    let ladderExtras = { weekXp: null, rank: null };
    function levelLadderHeroHtml(total, level, signedIn, rewards) {
      const p = xpProgress(total);
      const fmt = (n) => Math.round(n).toLocaleString('en-GB');
      const next = ladderNextReward(level, rewards);
      const weekXp = ladderExtras.weekXp ?? (playerXp?.week === getUkWeekKey() ? playerXp.weekXp : null);
      let pace = '';
      if (next && weekXp > 0) {
        const ukDay = (new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' })).getDay() || 7);
        const perDay = weekXp / ukDay, days = Math.ceil((xpForLevel(next.level) - total) / perDay);
        if (Number.isFinite(days) && days > 0) pace = ` · about ${days} day${days === 1 ? '' : 's'} at your pace`;
      }
      const nextHtml = next ? `<button type="button" class="ll-next" data-ladder-jump="${next.level}"><span>${next.piece.kind === 'item' ? ladderPieceHtml(next.piece).replace(/^[\s\S]*?<span class="ll-piece-art">([\s\S]*?)<\/span><span class="ll-pname">[\s\S]*$/, '$1') : `<span class="ll-unlock" style="--t:${next.piece.tone || '#fbbf24'}">${icon(next.piece.icon || 'star')}</span>`}</span><span>Next up: <b>${escapeHtml(ladderPieceName(next.piece))}</b> at Lvl ${next.level}<small>${fmt(xpForLevel(next.level) - total)} XP away${pace}</small></span></button>` : '';
      // The menu header already holds the account's username (updateHamburgerAccountLabel).
      const label = signedIn && hamburgerUsernameFor === currentUser.uid ? document.getElementById('hamburgerAccountLabel')?.textContent : '';
      const name = label || (signedIn ? 'Player' : 'You');
      return `<div class="ll-hero"><span data-own-avatar>${avatarHtml(equippedCosmetics.avatar, 56)}</span><div style="min-width:0">
        <div class="ll-name"><span>${escapeHtml(name)}</span>${xpLevelBadge(level, 'xp-badge-lg')}</div>
        <span class="ll-bar"><i style="width:${p.pct}%"></i></span>
        <div class="ll-barline"><span>${fmt(p.total)} XP</span><span>${p.max ? 'Top level' : `${fmt(p.need - p.into)} to Lvl ${p.level + 1}`}</span></div></div></div>
        <div class="ll-stats"><div class="ll-stat"><b>${fmt(p.total)}</b><small>Total XP</small></div><div class="ll-stat"><b data-ladder-week>${weekXp == null ? '–' : fmt(weekXp)}</b><small>This week</small></div><div class="ll-stat"><b data-ladder-rank>${ladderExtras.rank || '–'}</b><small>Levels board</small></div></div>
        ${nextHtml}${signedIn ? '' : '<div class="ll-signin">Sign in to earn XP and climb the ladder.</div>'}`;
    }
    function levelLadderRowsHtml(total, level, rewards, from = level) {
      const fmt = (n) => Math.round(n).toLocaleString('en-GB');
      const milestones = Array.from({ length: Math.floor(XP_MAX_LEVEL / XP_RULES.milestoneEvery) }, (_, i) => (i + 1) * XP_RULES.milestoneEvery);
      const stops = [...new Set([...rewards.keys(), ...milestones, level, XP_MAX_LEVEL])].filter(L => L >= 1 && L <= XP_MAX_LEVEL).sort((a, b) => a - b);
      const p = xpProgress(total);
      let html = '', prev = 1;
      const gap = (a, b) => b < a ? '' : `<div class="ll-gap ${b <= level ? 'got' : ''} ${from < b && a <= level ? 'll-new' : ''}" data-ladder-range="${a}-${b}"><span class="ll-tick" data-ladder-node="${a}-${b}"></span><span data-ladder-node="${a}-${b}">Lvl ${a === b ? a : `${a}–${b}`} · ${ladderGem(XP_RULES.levelUpDiamonds)} ${a === b ? '' : 'each'}</span></div>`;
      const here = `<div class="ll-here" data-ladder-here data-ladder-level-here="${level}"><span class="ll-node" data-ladder-node="${level}">${level}</span><div class="ll-here-card"><div class="ll-here-top">You are here</div><div class="ll-here-sub">${xpLevelBadge(level)}<span>${p.max ? 'Top level' : `${fmt(p.need - p.into)} XP to Lvl ${level + 1}`}</span></div><span class="ll-bar" style="height:6px;margin-top:6px"><i style="width:${p.pct}%"></i></span></div></div>`;
      if (level === 1) html += here;
      stops.forEach((L) => {
        if (L === 1) return;
        // The gap before this stop holds only plain levels (Diamonds alone),
        // except the milestones every 10th level, which get their own row.
        html += gap(prev + 1, L - 1);
        const pieces = rewards.get(L) || [];
        const milestone = L % XP_RULES.milestoneEvery === 0 || L === XP_MAX_LEVEL;
        if (pieces.length || milestone) {
          const got = L <= level, final = L === XP_MAX_LEVEL, fresh = got && L > from;
          const status = fresh ? `<span class="ll-new-tag">New · just unlocked</span>` : got ? `<span class="ll-done">${icon('check')} Unlocked</span>` : `<span class="ll-away">${fmt(xpForLevel(L) - total)} XP away</span>`;
          html += `<div class="ll-row ${got ? 'got' : 'locked'} ${fresh ? 'll-new' : ''} ${milestone ? 'big' : ''} ${final ? 'final' : ''}" data-ladder-level="${L}"><span class="ll-node" data-ladder-node="${L}">${got ? icon('check') : L}</span><div class="ll-card">${final ? `<div class="ll-final-title">Max Level · Lvl ${L}</div>` : ''}<div class="ll-head">${xpLevelBadge(L)}${status}${ladderGem(ladderMilestoneDiamonds(L))}</div>${pieces.length ? `<div class="ll-pieces">${pieces.map(ladderPieceHtml).join('')}</div>` : `<div class="ll-only">Milestone level: ${ladderMilestoneDiamonds(L)} Diamonds.</div>`}</div></div>`;
        } else if (L !== level) html += gap(L, L);
        if (L === level) html += here;
        prev = L;
      });
      return html;
    }
    const LADDER_HOW = () => `<details class="ll-how"><summary>How to earn XP</summary><div class="ll-xp">
      <span>Finish a game</span><span>${XP_RULES.finish}</span><span>First game of the day</span><span>+${XP_RULES.firstGameOfDay}</span>
      <span>Win (Vs Bots / Play Friends)</span><span>${XP_RULES.win}</span><span>Ranked game / Ranked win</span><span>${XP_RULES.ranked} / ${XP_RULES.rankedWin}</span>
      <span>Gauntlet bot beaten</span><span>${Math.min(...Object.values(XP_RULES.gauntletBot))}–${Math.max(...Object.values(XP_RULES.gauntletBot))}</span>
      <span>Daily / weekly challenge</span><span>${XP_RULES.daily} / ${XP_RULES.weekly}</span></div></details>`;
    function renderLevelLadder(from) {
      const signedIn = !!currentUser && !!playerXp;
      const total = signedIn ? playerXp.total : 0;
      const level = signedIn ? xpLevelFor(total) : 1;
      const rewards = ladderRewards();
      document.getElementById('levelLadderHero').innerHTML = levelLadderHeroHtml(total, level, signedIn, rewards);
      const scroll = document.getElementById('levelLadderScroll');
      const climbFrom = Number.isFinite(from) && from >= 1 && from < level ? from : level;
      scroll.innerHTML = LADDER_HOW() + `<div class="ll-line"><i></i></div>` + levelLadderRowsHtml(total, level, rewards, climbFrom)
        + '<p class="ll-help">Tap a reward you own to equip it. Tap or hold any other to preview it.</p>';
      return { scroll, level, from: climbFrom };
    }
    // The ladder element that holds a level: its own row, "You are here", or the folded line around it.
    function ladderElementForLevel(L) {
      const scroll = document.getElementById('levelLadderScroll');
      if (!scroll) return null;
      return scroll.querySelector(`[data-ladder-level="${L}"]`) || scroll.querySelector(`[data-ladder-level-here="${L}"]`)
        || [...scroll.querySelectorAll('[data-ladder-range]')].find(el => { const [a, b] = el.dataset.ladderRange.split('-').map(Number); return L >= a && L <= b; }) || null;
    }
    // The gold line runs from the first stop to the last and fills up to "You are here".
    function placeLadderLine(animate, from) {
      const scroll = document.getElementById('levelLadderScroll');
      const line = scroll?.querySelector('.ll-line'), fill = line?.querySelector('i');
      const stops = scroll ? [...scroll.querySelectorAll('.ll-row, .ll-here, .ll-gap')] : [];
      if (!line || !stops.length) return;
      const first = stops[0], last = stops[stops.length - 1], here = scroll.querySelector('[data-ladder-here]');
      line.style.top = `${first.offsetTop + 18}px`;
      line.style.height = `${Math.max(0, last.offsetTop - first.offsetTop + 10)}px`;
      const target = here ? Math.max(0, here.offsetTop - first.offsetTop + 8) : 0;
      if (!animate || reduceMotion) { fill.style.transition = 'none'; fill.style.height = `${target}px`; void fill.offsetHeight; fill.style.transition = ''; return; }
      // A level-up climbs from the old level (v278); a normal open fills from the bottom rung.
      const fromEl = Number.isFinite(from) ? ladderElementForLevel(from) : null;
      const start = fromEl ? Math.max(0, Math.min(target, fromEl.offsetTop - first.offsetTop + 8)) : 0;
      fill.style.transition = 'none'; fill.style.height = `${start}px`; void fill.offsetHeight; fill.style.transition = fromEl ? 'height 1.6s var(--ease-soft, ease-out)' : '';
      requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.height = `${target}px`; }));
    }
    function scrollLadderTo(el) {
      const scroll = document.getElementById('levelLadderScroll');
      if (!scroll || !el) return;
      scroll.scrollTop = Math.max(0, el.offsetTop - scroll.clientHeight / 2 + el.offsetHeight / 2);
    }
    // opts.from: the level before a level up (match summary, level mail): the
    // line climbs from there and the rewards just unlocked glow (v278).
    function openLevelLadder(opts = {}) {
      if (!xpShown()) { notifyBanner('Levels are switched off at the moment.'); return false; }
      document.getElementById('hamburgerDrawer')?.classList.contains('open') && closeHamburgerMenu();
      ladderExtras = { weekXp: null, rank: null };
      // Unseen rewards (the "New" dot, v279) glow and climb like a level up.
      const curLevel = playerXp ? xpLevelFor(playerXp.total) : 0;
      let from = Number(opts.from);
      if (currentUser && curLevel) {
        const seen = ladderSeenLevel(curLevel);
        if (!Number.isFinite(from) && ladderHasNewSince(seen, curLevel)) from = seen;
        markLadderSeen(curLevel);
        paintLadderNewDots(curLevel);
      }
      const view = renderLevelLadder(from);
      document.getElementById('levelLadderModal').classList.remove('hidden');
      requestAnimationFrame(() => {
        scrollLadderTo(document.querySelector('#levelLadderScroll [data-ladder-here]'));
        placeLadderLine(true, view.from < view.level ? view.from : undefined);
      });
      loadLadderExtras();
      loadLadderFriends();
      setTimeout(() => showHelperTip('ladder-tap', '#levelLadderScroll [data-ladder-id]'), 700); // § Helper tips
      return true;
    }
    // Tap a level (its circle or a folded line): the total XP it needs (v278).
    function ladderLevelTipHtml(spec) {
      const total = playerXp?.total || 0, fmt = (n) => Math.round(n).toLocaleString('en-GB');
      const line = (L) => {
        const need = xpForLevel(L);
        return `<b>Lvl ${L}</b> needs ${fmt(need)} total XP${need <= total ? ' · reached' : ` · ${fmt(need - total)} to go`}`;
      };
      const [a, b] = String(spec).split('-').map(Number);
      return b && b !== a ? `${line(a)}<br>${line(b)}` : line(a);
    }
    // Friends on the ladder (v278): their avatars at their levels, from
    // friends/{uid} and each friend's public level. Tap one for their card.
    let ladderFriendsToken = 0;
    function loadLadderFriends() {
      if (!currentUser || typeof db === 'undefined' || !db) return;
      const token = ++ladderFriendsToken, uid = currentUser.uid;
      try {
        db.ref(`friends/${uid}`).once('value').then((snap) => {
          const ids = Object.keys(snap.val() || {}).slice(0, 60);
          // Total XP (the Levels board's count) breaks ties between friends on one level (v280).
          return Promise.all(ids.map(f => Promise.all([
            db.ref(`publicProfiles/${f}`).once('value').then(p => p.val() || {}),
            db.ref(`boards/levels/${f}/count`).once('value').then(c => Number(c.val()) || 0).catch(() => 0)
          ]).then(([p, xp]) => ({ uid: f, ...p, xp })).catch(() => null)));
        }).then((list) => {
          if (token !== ladderFriendsToken || document.getElementById('levelLadderModal')?.classList.contains('hidden')) return;
          paintLadderFriends((list || []).filter(f => f && Number(f.level) > 0 && !f.deleted));
        }).catch(() => {});
      } catch (e) {}
    }
    // Several friends on one row (v280): highest level first, then most total
    // XP (closest to the next level), then online, then A-Z. Four chips show;
    // "+N" opens the whole row's list in the info bubble.
    const LADDER_FRIENDS_SHOWN = 4;
    let ladderFriendGroups = [];
    function ladderFriendOrder(a, b) {
      return (Number(b.level) - Number(a.level)) || ((Number(b.xp) || 0) - (Number(a.xp) || 0))
        || ((isProfileOnline(b) ? 1 : 0) - (isProfileOnline(a) ? 1 : 0))
        || String(a.username || '').localeCompare(String(b.username || ''), 'en', { sensitivity: 'base' });
    }
    function ladderFriendChipHtml(f, opts = {}) {
      const name = f.username || 'Friend', lvl = Number(f.level);
      const extra = opts.full ? `<small>${(Number(f.xp) || 0) > 0 ? `${Math.round(f.xp).toLocaleString('en-GB')} XP` : ''}${isProfileOnline(f) ? ' · online' : ''}</small>` : '';
      return `<button type="button" class="ll-friend${opts.full ? ' ll-friend-row' : ''}" data-ladder-friend="${escapeHtml(f.uid)}" data-name="${escapeHtml(name)}" data-avatar="${escapeHtml(f.avatar || 'default')}" title="${escapeHtml(name)} · Lvl ${lvl}" aria-label="${escapeHtml(name)}, level ${lvl}">${avatarHtml(f.avatar || 'default', opts.full ? 28 : 22)}<span>${escapeHtml(name)} · ${lvl}${extra}</span></button>`;
    }
    function ladderFriendListHtml(list) {
      return `<div class="ll-friend-list"><b>${list.length} friends here</b>${list.map(f => ladderFriendChipHtml(f, { full: true })).join('')}</div>`;
    }
    function openLadderFriend(btn) {
      // From the +N list, point the card at the +N button: the list row goes away with the bubble.
      const anchor = btn.closest('#infoPop') && infoPopAnchor && infoPopAnchor.isConnected ? infoPopAnchor : btn;
      hideInfoPop();
      openProfileCard({ uid: btn.dataset.ladderFriend, name: btn.dataset.name, avatar: btn.dataset.avatar }, anchor);
    }
    // The bubble lives outside the ladder page, so its rows need their own listener.
    document.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('#infoPop [data-ladder-friend]');
      if (b) { e.preventDefault(); openLadderFriend(b); }
    });
    function paintLadderFriends(friends) {
      ladderFriendGroups = [];
      const scroll = document.getElementById('levelLadderScroll');
      if (!scroll) return;
      scroll.querySelectorAll('.ll-friends').forEach(el => el.remove());
      const groups = new Map();
      friends.forEach((f) => {
        const el = ladderElementForLevel(Math.min(XP_MAX_LEVEL, Number(f.level)));
        if (!el) return;
        if (!groups.has(el)) groups.set(el, []);
        groups.get(el).push(f);
      });
      groups.forEach((list, el) => {
        list.sort(ladderFriendOrder);
        const shown = list.slice(0, LADDER_FRIENDS_SHOWN), more = list.length - shown.length;
        const wrap = document.createElement('div');
        wrap.className = 'll-friends';
        const key = String(ladderFriendGroups.length);
        ladderFriendGroups.push(list);
        wrap.innerHTML = shown.map(ladderFriendChipHtml).join('')
          + (more > 0 ? `<button type="button" class="ll-friend-more" data-ladder-more="${key}" aria-label="Show all ${list.length} friends here">+${more}</button>` : '');
        (el.querySelector('.ll-card, .ll-here-card') || el).appendChild(wrap);
      });
      placeLadderLine(false);
    }
    // This week's XP and your place on the Levels board (all-time), read once per opening.
    function loadLadderExtras() {
      if (!currentUser || typeof db === 'undefined' || !db) return;
      const uid = currentUser.uid;
      const paint = () => {
        if (document.getElementById('levelLadderModal')?.classList.contains('hidden')) return;
        const w = document.querySelector('#levelLadderHero [data-ladder-week]'), r = document.querySelector('#levelLadderHero [data-ladder-rank]');
        if (w && ladderExtras.weekXp != null) w.textContent = Math.round(ladderExtras.weekXp).toLocaleString('en-GB');
        if (r && ladderExtras.rank) r.textContent = ladderExtras.rank;
      };
      try {
        db.ref(`users/${uid}/xp`).once('value').then((snap) => {
          const x = snap.val() || {};
          ladderExtras.weekXp = x.week === getUkWeekKey() ? Number(x.weekXp) || 0 : 0;
          paint();
        }).catch(() => {});
        db.ref('boards/levels').orderByChild('count').limitToLast(100).once('value').then((snap) => {
          const rows = [];
          snap.forEach((c) => { rows.push({ uid: c.key, count: Number(c.val()?.count) || 0 }); });
          rows.sort((a, b) => b.count - a.count);
          const mine = rows.find(r => r.uid === uid);
          ladderExtras.rank = mine ? `#${rows.filter(r => r.count > mine.count).length + 1}` : (rows.length >= 100 ? '100+' : '–');
          paint();
        }).catch(() => {});
      } catch (e) {}
    }
    (function wireLevelLadder() {
      const modal = document.getElementById('levelLadderModal');
      if (!modal) return;
      document.getElementById('levelLadderCloseBtn')?.addEventListener('click', () => modal.classList.add('hidden'));
      modal.addEventListener('click', (e) => {
        if (e.target === modal) { modal.classList.add('hidden'); return; } // a tap outside the panel closes it
        const jump = e.target.closest('[data-ladder-jump]');
        if (jump) { scrollLadderTo(modal.querySelector(`[data-ladder-level="${jump.dataset.ladderJump}"]`)); return; }
        const tip = e.target.closest('[data-ladder-tip]');
        if (tip) { showInfoPop(tip, escapeHtml(tip.dataset.ladderTip), { toggle: true }); return; }
        const friend = e.target.closest('[data-ladder-friend]');
        if (friend) { openLadderFriend(friend); return; }
        const more = e.target.closest('[data-ladder-more]');
        if (more) { const list = ladderFriendGroups[Number(more.dataset.ladderMore)]; if (list) showInfoPop(more, ladderFriendListHtml(list), { toggle: true }); return; }
        const node = e.target.closest('[data-ladder-node]');
        if (node) { showInfoPop(node, ladderLevelTipHtml(node.dataset.ladderNode), { toggle: true }); return; }
        const tile = e.target.closest('[data-ladder-id]');
        if (!tile) return;
        // A tap never equips (v290, owner): the big preview has the Equip button.
        openBigPreview(tile.dataset.ladderId, tile.dataset.equipType);
      });
      // Your level, wherever it shows, opens the ladder.
      document.addEventListener('click', (e) => {
        const t = e.target.closest && e.target.closest('#homeNameLevel, #profileLevelBadge, #hamburgerLevel, [data-open-ladder]');
        if (!t || t.classList.contains('hidden')) return;
        e.preventDefault();
        if (t.id === 'homeNameLevel' && !currentUser) { openAuthModal(); return; }
        openLevelLadder(t.dataset.ladderFrom ? { from: Number(t.dataset.ladderFrom) } : {});
      });
      window.addEventListener('resize', () => { if (!modal.classList.contains('hidden')) placeLadderLine(false); });
      modal.addEventListener('toggle', () => placeLadderLine(false), true); // the How To Earn XP fold moves the line
    })();

