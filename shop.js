// Shop catalogue, filters, purchase controls and cosmetic previews.
// Classic script: shared game state is read when functions are invoked.
// Control setup runs from app.js at its original startup positions.

    function previewEquippedCosmetic(type, id) {
      // Burn previews play in Custom's own contained stage. They used to fire
      // on the hidden game table's pile and shake #gameTable, which knocked
      // the open Custom panel aside (flashing the home screen) with nothing
      // visible to show for it.
      if (type === 'burnEffect' || type === 'jokerEffect') return playInlineEffectPreview(type, id);
      if (!bigEffectsOn || id === 'default') return;
      if (type === 'victoryEffect') return playVictoryEffect(id);
    }

    function burnPreviewIcon(id) {
      if (window.ShLevel3D && ShLevel3D.icon(id)) return ShLevel3D.icon(id); // its tile, even for one played without it (Origami)
      if (ShLevelBurns.index(id) >= 0) return ShLevelBurns.icon(id);
      return { 'burn-ice': '❄️', 'burn-electric': '⚡', 'burn-sweets': '🍬', 'burn-paint': '🎨', 'burn-smoke': '💨',
        'burn-blackhole': '🕳️', 'burn-origami': '🦢', 'burn-pixel': '👾', 'burn-lava': '🌋',
        'burn-lvl-spark-snap': '✨', 'burn-lvl-smoke-burst': '💨', 'burn-lvl-inferno-sweep': '🔥', 'burn-lvl-hellfire-spiral': '🌪️', 'burn-lvl-royal-incineration': '👑', 'burn-lvl-shitstorm': '💩' }[id] || SEASONAL_EVENT_BY_ID[String(id).replace('burn-', '')]?.burnIcon || '🔥';
    }

    // Burn and Joker previews open in Custom right under the tapped tile (a
    // full-width row after that tile's row), in the tab on screen.
    function visibleCustomPanel() {
      return [...document.querySelectorAll('#themesModal [data-custom-panel]')].find(panel => !panel.classList.contains('hidden')) || null;
    }
    function playInlineEffectPreview(type, id) {
      document.querySelectorAll('#themesModal .custom-inline-preview').forEach(el => el.remove());
      const tile = visibleCustomPanel()?.querySelector(`[data-equip-type="${type}"][data-equip-id="${CSS.escape(id)}"]`);
      if (!tile) return false;
      let rowEnd = tile;
      for (let next = tile.nextElementSibling; next && next.offsetTop === tile.offsetTop && !next.classList.contains('custom-inline-preview'); next = next.nextElementSibling) rowEnd = next;
      const box = document.createElement('div');
      box.className = 'custom-inline-preview';
      box.dataset.previewFor = id;
      box.innerHTML = type === 'burnEffect'
        ? `<div class="shop-preview-stage" data-shop-burn-stage><div class="shop-burn-core">${burnPreviewIcon(id)}</div></div>`
        : `<div class="jfx-stage"><div class="jfx-stage-hint">${jokerPreviewIcon(id)}</div></div>`;
      rowEnd.after(box);
      box.scrollIntoView?.({ block: 'nearest' });
      return type === 'burnEffect' ? playShopBurnPreview(id, box.firstElementChild) : playJokerPreview(id, box.firstElementChild);
    }

    // § Big preview (v248, owner): press and hold any item in Custom, the
    // Shop or the Collection (CARD_HOLD_MS) for a big preview over the page;
    // effects play in it (victories run full screen on #victoryFxLayer,
    // above it). Tapping an equipped card back previews it; other taps equip
    // or use the existing Shop buttons. The click after a hold is swallowed.
    // Closes on ✕, a tap outside the item, Escape or Back (BACK_LAYERS).
    function bigPreviewItem(id, type = '') {
      // 'default' is shared by several categories; resolve it with the tile type.
      if (id === 'default' && type === 'cardBack') return { id, name:'Default Card Back', category:'Card Backs', builtIn:true };
      return [...COSMETIC_SHOP_ITEMS, ...BUILT_IN_COSMETICS, ...EARNED_AVATARS, ...EARNED_FRAMES, ...LEVEL_REWARDS].find(i => i.id === id) || null;
    }
    function bigPreviewStatus(item) {
      if (item.builtIn || cosmeticPurchaseState[item.id]) return 'You own this.';
      return customLockedStatus(item);
    }
    function bigPreviewStageHtml(item, type) {
      const id = item.id;
      if (type === 'burnEffect') return `<div class="shop-preview-stage bp-stage-fx" data-shop-burn-stage><div class="shop-burn-core">${burnPreviewIcon(id)}</div></div>`;
      if (type === 'jokerEffect') return `<div class="jfx-stage bp-stage-fx"><div class="jfx-stage-hint">${jokerPreviewIcon(id)}</div></div>`;
      if (type === 'victoryEffect') return `<div class="bp-victory" data-keep-emoji>${victoryPreviewIcon(id)}</div>`;
      if (type === 'avatar') return `<div class="bp-avatar">${avatarHtml(id, 200)}</div>`;
      if (type === 'tableTheme') return `<div class="bp-table">${miniTablePreviewHtml(id, '', true, { backId: equippedCosmetics.cardBack || 'default', frameId: equippedCosmetics.frame || 'default' })}</div>`;
      if (type === 'cardBack') return `<div class="bp-card card-base relative rounded-xl custom-card-back ${getCosmeticBackClass(id)} border-2 border-slate-500 flex items-center justify-center">${getEmblemSvg()}</div>`;
      if (type === 'frame') return `<div class="bp-card bp-frame card-base relative rounded-xl bg-slate-900 border-2 font-black text-white" style="border-color:${item.tones[1]};${getCosmeticFrameStyle(id)}"><span class="bp-rank">A</span><span class="bp-suit">♠</span></div>`;
      if (type === 'deck') { ensureDeckFont(item.theme); return `<div class="bp-deck">${deckMiniCardHtml(item, true)}<span class="deck-mini-card ${item.theme} is-big"><span class="dm-rank ${getSuitStyle('♦')}">10</span><span class="dm-suits"><span class="${getSuitStyle('♦')}">♦</span></span></span></div>`; }
      if (type === 'emotes') return `<div class="bp-emotes" data-keep-emoji>${(EMOTE_PACKS[id] || []).map(e => `<span>${e}</span>`).join('')}</div>`;
      return '';
    }
    function playBigPreviewEffect() {
      const box = document.getElementById('bigPreview');
      const id = box?.dataset.itemId, type = box?.dataset.type;
      if (!id) return;
      if (type === 'burnEffect') playShopBurnPreview(id, box.querySelector('[data-shop-burn-stage]'), 1);
      else if (type === 'jokerEffect') playJokerPreview(id, box.querySelector('.jfx-stage'));
      else if (type === 'victoryEffect') playVictoryEffect(id);
    }
    // Locked items preview too (v252, owner), except hidden ones (an item
    // marked hidden: true stays a mystery until earned). One you can buy
    // gets a See In Shop button (openLockedCosmetic).
    function bigPreviewShopButton(item) {
      if (item.builtIn || cosmeticPurchaseState[item.id] || !COSMETIC_SHOP_ITEMS.some(i => i.id === item.id)) return '';
      return `<button type="button" class="bp-shop" data-bp-shop>See In Shop</button>`;
    }
    // Owned items get an Equip button in the big preview (v290, owner): the
    // Level Ladder opens the preview instead of equipping on a tap.
    function bigPreviewEquippedNow(item, type) {
      const now = type === 'avatar' ? resolveAvatarId(equippedCosmetics.avatar) : equippedIdOf(type);
      return now === item.id;
    }
    function bigPreviewEquipButton(item, type) {
      const owned = item.id === 'default' || !!item.builtIn || !!cosmeticPurchaseState[item.id];
      if (!owned) return '';
      return bigPreviewEquippedNow(item, type)
        ? '<button type="button" class="bp-equip is-on" disabled>Equipped</button>'
        : '<button type="button" class="bp-equip" data-bp-equip>Equip</button>';
    }
    function previewLockedCosmetic(id) {
      const item = bigPreviewItem(id);
      if (!item || item.hidden) return openLockedCosmetic(id);
      return openBigPreview(id);
    }
    function openBigPreview(id, typeHint = '') {
      const item = bigPreviewItem(id, typeHint);
      const type = item && COSMETIC_CATEGORY_TYPES[item.category];
      const box = document.getElementById('bigPreview');
      if (!item || !type || !box) return false;
      const animated = type === 'burnEffect' || type === 'jokerEffect' || type === 'victoryEffect';
      box.dataset.itemId = id;
      box.dataset.type = type;
      box.innerHTML = `<div class="bp-panel">
        <button type="button" class="bp-close" data-bp-close aria-label="Close preview">✕</button>
        <div class="bp-name">${escapeHtml(item.name)}</div>
        <div class="bp-kind">${escapeHtml(item.category.replace(/s$/, ''))}</div>
        <div class="bp-stage">${bigPreviewStageHtml(item, type)}</div>
        <div class="bp-status">${escapeHtml(bigPreviewStatus(item))}</div>
        ${animated ? '<button type="button" class="bp-play" data-bp-play>Play Again</button>' : ''}
        ${bigPreviewEquipButton(item, type)}
        ${bigPreviewShopButton(item)}
      </div>`;
      box.classList.remove('hidden');
      if (typeof springIn === 'function' && !reduceMotion) springIn(box.firstElementChild);
      if (animated) requestAnimationFrame(playBigPreviewEffect);
      if (typeof syncBackGuard === 'function') syncBackGuard();
      return true;
    }
    function closeBigPreview() {
      const box = document.getElementById('bigPreview');
      if (!box || box.classList.contains('hidden')) return;
      box.classList.add('hidden');
      if (box.dataset.type === 'victoryEffect') { audio.stopEffectClip('lion-roar'); audio.stopEffectClip('fireworks'); const layer = document.getElementById('victoryFxLayer'); layer?.getAnimations({ subtree: true }).forEach(a => a.cancel()); layer?.replaceChildren(); }
      box.innerHTML = '';
      delete box.dataset.itemId;
    }
    // Control setup is registered below.
    // Control setup is registered below.
    const BIG_PREVIEW_TILES = '#themesModal [data-equip-id], #collectionModal [data-coll-id], #shopModal [data-shop-row], #levelLadderModal [data-ladder-id]';
    // Control setup is registered below.


    function initCosmeticPreviewControls() {
document.getElementById('bigPreview')?.addEventListener('click', (e) => {
      if (e.target.closest('[data-bp-play]')) { playBigPreviewEffect(); return; }
      const equipBtn = e.target.closest('[data-bp-equip]');
      if (equipBtn) {
        const box = e.currentTarget, id = box.dataset.itemId, type = box.dataset.type;
        const item = bigPreviewItem(id, type);
        if (item && equipCosmetic(type, id, { preview: false })) {
          equipBtn.outerHTML = '<button type="button" class="bp-equip is-on" disabled>Equipped</button>';
          notifyBanner(`${item.name} equipped.`);
          document.querySelectorAll('#levelLadderModal [data-ladder-id]').forEach(t => {
            const chip = t.querySelector('.ll-equip');
            if (chip && t.dataset.equipType === type) chip.textContent = t.dataset.ladderId === id ? 'Equipped' : 'Equip';
          });
        }
        return;
      }
      if (e.target.closest('[data-bp-shop]')) {
        const id = e.currentTarget.dataset.itemId;
        closeBigPreview();
        document.getElementById('collectionModal')?.classList.add('hidden');
        openLockedCosmetic(id);
        return;
      }
      if (e.target.closest('[data-bp-close]') || !e.target.closest('.bp-panel')) closeBigPreview();
    });
document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !document.getElementById('bigPreview')?.classList.contains('hidden')) { closeBigPreview(); e.stopImmediatePropagation(); }
    }, true);
(function wireBigPreviewHold() {
      let hold = null, swallowClick = false;
      const cancel = () => { if (hold) { clearTimeout(hold.timer); hold = null; } };
      document.addEventListener('pointerdown', (e) => {
        swallowClick = false; // only the click of the hold's own release is eaten
        if (e.button > 0) return;
        const tile = e.target.closest && e.target.closest(BIG_PREVIEW_TILES);
        if (!tile) return;
        const id = tile.dataset.equipId || tile.dataset.collId || tile.dataset.shopRow || tile.dataset.ladderId;
        const type = tile.dataset.equipType || '';
        if (!id || !bigPreviewItem(id, type)) return;
        cancel();
        hold = { tile, x: e.clientX, y: e.clientY, timer: setTimeout(() => {
          hold = null;
          if (openBigPreview(id, type)) { swallowClick = true; if (navigator.vibrate) try { navigator.vibrate(8); } catch (err) {} }
        }, CARD_HOLD_MS) };
      }, true);
      document.addEventListener('pointermove', (e) => { if (hold && Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > 8) cancel(); }, true);
      ['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, cancel, true));
      // Only a scroll that moves the held tile cancels (v276): a tab strip
      // gliding to its selected tab used to cancel every hold made just after.
      document.addEventListener('scroll', (e) => {
        const t = e.target;
        if (hold && (t === document || t === document.documentElement || !t.contains || t.contains(hold.tile))) cancel();
      }, true);
      document.addEventListener('click', (e) => {
        if (!swallowClick) return;
        swallowClick = false;
        e.preventDefault(); e.stopPropagation();
      }, true);
      document.addEventListener('contextmenu', (e) => { if (e.target.closest && e.target.closest(BIG_PREVIEW_TILES)) e.preventDefault(); }, true);
    })();
    }

    function setNameTokenStatus(message, tone) {
      const el = document.getElementById('nameTokenStatus');
      el.textContent = message || '';
      el.className = `text-[9px] text-center leading-snug ${tone === 'error' ? 'text-rose-400' : tone === 'success' ? 'text-emerald-400' : 'text-slate-400'}`;
    }
    function renderNameChangeToken() {
      const buyBtn = document.getElementById('nameTokenBuyBtn');
      const useArea = document.getElementById('nameTokenUseArea');
      document.getElementById('shopDiamondCount').textContent = formatCompactDiamonds(challengeEconomy.diamonds || 0);
      useArea.classList.add('hidden');
      buyBtn.disabled = false;
      if (!currentUser) {
        buyBtn.textContent = 'Sign in';
        setNameTokenStatus('Sign in to purchase Shop items.');
      } else if (!nameChangeTokenState) {
        buyBtn.textContent = (challengeEconomy.diamonds || 0) >= NAME_CHANGE_TOKEN_COST ? 'Buy' : 'Need 💎';
        buyBtn.disabled = (challengeEconomy.diamonds || 0) < NAME_CHANGE_TOKEN_COST;
        setNameTokenStatus('');
      } else if (nameChangeTokenState.usedAt) {
        buyBtn.textContent = 'Used';
        buyBtn.disabled = true;
        setNameTokenStatus('');
      } else {
        buyBtn.textContent = 'Owned';
        buyBtn.disabled = true;
        useArea.classList.remove('hidden');
        setNameTokenStatus('');
      }
      buyBtn.classList.toggle('opacity-50', buyBtn.disabled);
      buyBtn.classList.toggle('cursor-not-allowed', buyBtn.disabled);
    }
    function showShopActionNotice(message, tone = 'error') {
      const el = document.getElementById('shopActionNotice');
      if (!el) return;
      el.textContent = message || '';
      el.className = `sticky top-1 z-30 rounded-xl border-2 bg-slate-950/95 p-2.5 text-center text-[9px] font-black leading-snug shadow-xl ${tone === 'success' ? 'border-emerald-500 text-emerald-300' : 'border-rose-500 text-rose-300'}`;
      el.classList.toggle('hidden', !message);
      // It lives at the TOP of the Shop's own scroll area, so feedback is
      // visible immediately even when the player clicked an item far below.
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function clearShopActionNotice() {
      const el = document.getElementById('shopActionNotice');
      if (el) { el.textContent = ''; el.classList.add('hidden'); }
    }

    // One list drives the section tabs on both the Shop and Custom pages.
    // Adding a cosmetic category later = one entry here.
    // Your picture first, then by where items show up: the table and cards
    // you look at all game, then the big moments (burns, wins), then emotes.
    const COSMETIC_TABS = [
      { category: 'Avatars', label: 'Avatars' },
      { category: 'Table Themes', label: 'Tables' },
      { category: 'Card Backs', label: 'Card Backs' },
      { category: 'Decks', label: 'Decks' },
      { category: 'Frames', label: 'Frames' },
      { category: 'Burn Effects', label: 'Burn' },
      { category: 'Joker Effects', label: 'Joker' },
      { category: 'Victory Effects', label: 'Victory' },
      { category: 'Emote Packs', label: 'Emotes' }
    ];
    // The Shop's first tab: every item not tied to an event, one folding
    // section per type, with the Name Change Token at the top.
    const SHOP_ALL_TAB = 'All';
    let shopTab = SHOP_ALL_TAB;
    // Every Shop/Custom tab lists items cheapest first, then A-Z within a price.
    function sortByValue(items) {
      return [...items].sort((a, b) => ((a.cost || 0) - (b.cost || 0)) || String(a.name).localeCompare(String(b.name)));
    }
    function renderShopTabs(balance) {
      const bar = document.getElementById('shopTabBar');
      if (!bar) return;
      const seasonalCount = COSMETIC_SHOP_ITEMS.filter(item => item.season && isSeasonalItemBuyable(item) && shopItemMatchesFilter(item, balance)).length;
      const live = activeSeasonalEvents();
      const seasonalTab = `<button type="button" role="tab" class="cosmetic-tab season-tab ${live.length ? 'is-live' : ''}" data-shop-tab="${SEASONAL_TAB}" aria-selected="${shopTab === SEASONAL_TAB}">${live.length ? live.map(w => w.event.emoji).join('') : '🎉'} Seasonal <small>${seasonalCount || (live.length ? 0 : 'soon')}</small></button>`;
      const seasonalFirst = seasonalTabLeads();
      const allCount = COSMETIC_SHOP_ITEMS.filter(item => !item.season && shopItemMatchesFilter(item, balance)).length;
      const allTab = `<button type="button" role="tab" class="cosmetic-tab" data-shop-tab="${SHOP_ALL_TAB}" aria-selected="${shopTab === SHOP_ALL_TAB}">All <small>${allCount}</small></button>`;
      bar.innerHTML = allTab + (seasonalFirst ? seasonalTab : '') + COSMETIC_TABS.map(tab => {
        const count = COSMETIC_SHOP_ITEMS.filter(item => !item.season && item.category === tab.category && shopItemMatchesFilter(item, balance)).length;
        return `<button type="button" role="tab" class="cosmetic-tab" data-shop-tab="${tab.category}" aria-selected="${shopTab === tab.category}">${tab.label} <small>${count}</small></button>`;
      }).join('') + (seasonalFirst ? '' : seasonalTab);
    }
    function shopItemRowHtml(item, balance) {
        const owned = !!cosmeticPurchaseState[item.id];
        const affordable = balance >= item.cost;
        const type = COSMETIC_CATEGORY_TYPES[item.category];
        const equipped = equippedIdOf(type) === item.id;
        const equipLabel = lastPurchasedCosmeticId === item.id ? 'EQUIP NOW' : 'EQUIP';
        const isNew = newCosmeticIds.has(item.id);
        const shortfall = Math.max(0, item.cost - balance);
        const buyable = isSeasonalItemBuyable(item);
        return `<div data-shop-row="${item.id}" class="rounded-xl border ${owned ? 'border-emerald-700' : 'border-slate-800'} bg-slate-900/60 overflow-hidden">
          <div class="flex items-center gap-2 p-2">
            ${type === 'tableTheme' ? '' : `<span class="shop-row-thumb">${shopCosmeticThumbnail(item, type)}</span>`}
            <span class="min-w-0 flex-1"><span class="flex items-center gap-1"><span class="block text-[10px] font-black text-white truncate">${item.name}</span>${isNew ? '<span class="shrink-0 rounded-full bg-fuchsia-600 px-1.5 py-0.5 text-[7px] font-black text-white">NEW</span>' : ''}</span><span class="block text-[8px] text-slate-500">${getCosmeticDescription(type)}</span>${!owned && buyable && !affordable ? `<span class="block text-[8px] font-bold text-rose-400">Need 💎${shortfall} more</span>` : ''}</span>
            <span class="shrink-0 flex flex-col gap-1">
              <button type="button" data-preview-cosmetic-id="${item.id}" aria-expanded="false" class="cosmetic-preview-btn min-w-[66px] px-2 py-1 rounded-lg border border-cyan-600 text-[8px] font-black text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 transition">PREVIEW</button>
              ${owned
                ? `<button type="button" data-shop-equip-id="${item.id}" ${equipped ? 'disabled' : ''} class="cosmetic-shop-equip-btn min-w-[66px] px-2 py-1 rounded-lg border text-[8px] font-black ${equipped ? 'border-emerald-600 bg-emerald-950/50 text-emerald-300' : 'border-amber-500 text-amber-300 hover:bg-amber-500 hover:text-slate-950'}">${equipped ? 'EQUIPPED' : equipLabel}</button>`
                : !buyable ? `<button data-cosmetic-id="${item.id}" data-season-locked aria-disabled="true" class="cosmetic-buy-btn min-w-[66px] px-2 py-1 rounded-lg border text-[9px] font-black border-slate-700 text-slate-500">SOON</button>`
          : `<button data-cosmetic-id="${item.id}" aria-disabled="${!affordable}" class="cosmetic-buy-btn min-w-[66px] px-2 py-1 rounded-lg border text-[9px] font-black transition ${affordable ? 'border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-950' : 'border-slate-700 text-slate-600 opacity-60'}">💎 ${item.cost}</button>`}
              ${buyable && currentUser ? `<button type="button" data-gift-item="${item.id}" class="cosmetic-gift-btn ${giftTarget ? 'is-target' : ''}">🎁 GIFT</button>` : ''}
            </span>
          </div>
          ${type === 'tableTheme' ? `<div class="shop-row-table">${miniTablePreviewHtml(item.id)}</div>` : ''}
          <div id="shop-preview-${item.id}" data-inline-shop-preview class="hidden border-t border-slate-700/70 bg-slate-950/55 p-3"></div>
        </div>`;
    }
    // ---- Seasonal Shop tab ----------------------------------------------
    const SEASONAL_TAB = 'Seasonal';
    let seasonalWinState = {};
    let seasonalForceAllEvents = false; // tests only
    let shopTabPicked = false;
    // The Shop opens on the tab last picked (localStorage shithead_shop_tab).
    // A seasonal event that has started since then still takes the lead once.
    const SHOP_TAB_KEY = 'shithead_shop_tab';
    function rememberShopTab(tab) {
      try { localStorage.setItem(SHOP_TAB_KEY, JSON.stringify({ tab, seasonLead: seasonalTabLeads() })); } catch (e) {}
    }
    function restoredShopTab(seasonLeadsNow) {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem(SHOP_TAB_KEY) || 'null'); } catch (e) {}
      const valid = saved && (saved.tab === SEASONAL_TAB || saved.tab === SHOP_ALL_TAB || COSMETIC_TABS.some(t => t.category === saved.tab));
      if (seasonLeadsNow && !(valid && saved.seasonLead)) return SEASONAL_TAB;
      return valid ? saved.tab : (seasonLeadsNow ? SEASONAL_TAB : SHOP_ALL_TAB);
    }
    const seasonShortDate = (date) => date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    // Seasonal leads the Shop only while an event is on or starts within 3 days.
    const SEASONAL_LEAD_DAYS = 3;
    function seasonalTabLeads(now = seasonalNow()) {
      if (activeSeasonalEvents(now).length) return true;
      const next = nextSeasonalEvent(now);
      return !!next && (next.start - now) <= SEASONAL_LEAD_DAYS * 864e5;
    }
    // Each event section folds up with its chevron. Live events start open;
    // the rest (e.g. the test account's full list) start folded.
    const seasonalSectionOverrides = {};
    const isSeasonalSectionOpen = (eventId, state) => seasonalSectionOverrides[eventId] ?? (state === 'active' || state === 'soon');
    function seasonalSectionHtml(ev, balance, { state, win, now }) {
      const accentStyle = `--season-dark:${ev.tones[0]};--season-accent:${ev.tones[1]};--season-light:${ev.tones[2]}`;
      let when = '';
      if (state === 'active' && win) {
        const left = seasonDaysBetween(now, win.endsAt);
        when = left <= 1 ? 'Last day' : `Leaves in ${left} days`;
      } else if (win) {
        const until = seasonDaysBetween(now, win.start);
        when = state === 'soon' ? `Starts in ${until} day${until === 1 ? '' : 's'} · ${seasonShortDate(win.start)}` : `Opens ${seasonShortDate(win.start)}`;
      }
      const earnedId = `avatar-${ev.id}-earned`;
      const earnedOwned = !!cosmeticPurchaseState[earnedId];
      const wins = Math.min(SEASONAL_EARN_WINS, seasonalWinsFor(seasonalWinState, ev.id));
      const earnText = earnedOwned ? `<b>${ev.names.earned}</b> earned ✓`
        : state === 'soon' ? `Win ${SEASONAL_EARN_WINS} games during the event to earn <b>${ev.names.earned}</b>`
        : `Win ${SEASONAL_EARN_WINS} games during ${ev.name} to earn <b>${ev.names.earned}</b> <span class="season-progress">${wins}/${SEASONAL_EARN_WINS}</span>`;
      const open = isSeasonalSectionOpen(ev.id, state);
      const headBtn = `<button type="button" class="season-head" style="${accentStyle}" data-season-toggle="${ev.id}" data-season-state="${state}" aria-expanded="${open}">
          <span class="season-emoji" aria-hidden="true">${ev.emoji}</span>
          <span class="season-title"><b>${ev.name}</b><small>${ev.title}</small></span>
          ${when ? `<span class="season-when ${state === 'active' ? 'is-live' : ''}">${when}</span>` : ''}
          <span class="season-chev" aria-hidden="true">▾</span>
        </button>`;
      if (!open) return `<section class="season-section is-collapsed" data-season-section="${ev.id}">${headBtn}</section>`;
      const head = `${headBtn}
        <div class="season-earn" style="${accentStyle}">${avatarHtml(earnedId, 30, earnedOwned ? '' : 'avatar-locked')}<span>${earnText}</span></div>`;
      let bundle = '';
      if (state !== 'soon') {
        const b = seasonalBundleFor(ev.id);
        if (b.items.length >= 2) {
          const affordable = balance >= b.price;
          bundle = `<div class="season-bundle" style="${accentStyle}"><span class="season-bundle-icon" aria-hidden="true">🎁</span>
            <span class="season-bundle-text"><b>${ev.name} Bundle</b><small>${b.items.length === COSMETIC_SHOP_ITEMS.filter(item => item.season === ev.id).length ? `All ${b.items.length} items` : `The ${b.items.length} items you don't own yet`} · save 💎 ${b.full - b.price}</small></span>
            <button type="button" data-bundle-event="${ev.id}" aria-disabled="${!affordable}" class="season-bundle-btn ${affordable ? '' : 'is-short'}"><s>💎 ${b.full}</s> 💎 ${b.price}</button></div>`;
        }
      }
      const items = sortByValue(COSMETIC_SHOP_ITEMS.filter(item => item.season === ev.id && shopItemMatchesFilter(item, balance)));
      return `<section class="season-section" data-season-section="${ev.id}">${head}${bundle}<div class="space-y-1.5">${items.map(item => shopItemRowHtml(item, balance)).join('')}</div></section>`;
    }
    function renderSeasonalShop(list, balance) {
      const now = seasonalNow();
      const active = activeSeasonalEvents(now);
      const sections = active.map(w => seasonalSectionHtml(w.event, balance, { state: 'active', win: w, now }));
      const shown = new Set(active.map(w => w.event.id));
      if (seasonalShopTestAccess() || seasonalForceAllEvents) {
        const windows = seasonalWindowsAround(now);
        const rest = SEASONAL_EVENTS.filter(ev => !shown.has(ev.id))
          .map(ev => ({ ev, w: windows.filter(x => x.event.id === ev.id && x.start > now).sort((a, b) => a.start - b.start)[0] || null }))
          .sort((a, b) => (a.w ? a.w.start : Infinity) - (b.w ? b.w.start : Infinity));
        sections.unshift('<p class="season-note">🧪 Test account: every event is open here for Shop testing.</p>');
        rest.forEach(({ ev, w }) => sections.push(seasonalSectionHtml(ev, balance, { state: 'test', win: w, now })));
      } else {
        const next = nextSeasonalEvent(now);
        if (!active.length) sections.push('<p class="season-note">No event is on right now. Seasonal items are only sold during their event, and anything you buy is yours to keep.</p>');
        if (next && !shown.has(next.event.id)) sections.push(`<p class="season-next-label">${active.length ? 'Coming up next' : 'Next event'}</p>` + seasonalSectionHtml(next.event, balance, { state: 'soon', win: next, now }));
      }
      list.innerHTML = sections.join('');
    }
    function buySeasonalBundle(eventId) {
      const ev = SEASONAL_EVENT_BY_ID[eventId];
      if (!ev || !currentUser) return;
      if (!seasonalShopTestAccess() && !isSeasonalEventActive(eventId)) { showShopActionNotice(`The ${ev.name} Bundle is only sold during ${ev.name}.`, 'error'); return; }
      const { items, price } = seasonalBundleFor(eventId);
      if (items.length < 2) return;
      if ((Number(challengeEconomy.diamonds) || 0) < price) {
        showShopActionNotice(`Not enough Diamonds — you need 💎${price - (Number(challengeEconomy.diamonds) || 0)} more for the ${ev.name} Bundle.`, 'error');
        return;
      }
      if (!confirm(`Buy the ${ev.name} Bundle (${items.length} items) for ${price} Diamonds?`)) return;
      const uid = currentUser.uid;
      callEconomy('buyBundle', { eventId, price }).then((res) => {
        if (currentUser?.uid !== uid) return;
        Object.entries(res.purchases || {}).forEach(([id, record]) => {
          cosmeticPurchaseState[id] = record;
          newCosmeticIds.add(id);
        });
        persistNewCosmetics();
        challengeEconomy.diamonds = Number(res.diamonds) || 0;
        updateDiamondHeader();
        renderNameChangeToken();
        renderCosmeticShop();
        renderPersonalisationCosmetics();
        showShopActionNotice(`${ev.name} Bundle unlocked: ${items.length} items for 💎 ${res.price}. Equip them from EQUIP or Custom.`, 'success');
        notifyBanner(`✓ ${ev.name} Bundle purchased.`);
      }).catch((error) => {
        showShopActionNotice(error.message || 'Purchase failed. Please try again.', 'error');
        renderCosmeticShop();
      });
    }

    // § Shop and Custom pages
    function renderCosmeticShop() {
      const list = document.getElementById('cosmeticShopList');
      if (!list) return;
      const balance = challengeEconomy.diamonds || 0;
      renderShopTabs(balance);
      const isAll = shopTab === SHOP_ALL_TAB;
      document.getElementById('shopNameTokenCard')?.classList.toggle('hidden', !isAll);
      const groups = shopTab === SEASONAL_TAB ? [] : isAll ? COSMETIC_TABS.map(tab => tab.category) : [shopTab];
      if (shopTab === SEASONAL_TAB) renderSeasonalShop(list, balance);
      else list.innerHTML = groups.map(category => {
        const categoryItems = sortByValue(COSMETIC_SHOP_ITEMS.filter(item => !item.season && item.category === category && shopItemMatchesFilter(item, balance)));
        if (!categoryItems.length) return '';
        const items = categoryItems.map(item => shopItemRowHtml(item, balance)).join('');
        if (!isAll) return `<div class="space-y-1.5">${items}</div>`;
        const open = !collapsedShopCategories.has(category);
        const label = COSMETIC_TABS.find(tab => tab.category === category).label;
        return `<section class="cat-section" data-shop-section="${category}">
          <button type="button" class="cat-head" data-shop-category="${category}" aria-expanded="${open}"><span class="cat-head-title">${label}</span><span class="cat-head-count">${categoryItems.length}</span><span class="cat-head-chev" aria-hidden="true">▾</span></button>
          ${open ? `<div class="space-y-1.5">${items}</div>` : ''}
        </section>`;
      }).join('');
      if (!list.innerHTML.trim()) list.innerHTML = '<p class="rounded-xl border border-dashed border-slate-700 p-4 text-center text-[9px] text-slate-500">Nothing in this section matches the filter.</p>';
      else if (shopTab !== SEASONAL_TAB && shopFilter === 'all' && activeSeasonalEvents().length) list.insertAdjacentHTML('afterbegin', `<button type="button" class="season-promo" data-shop-tab-jump="${SEASONAL_TAB}">${activeSeasonalEvents().map(w => `${w.event.emoji} ${w.event.name}`).join(' · ')} items are in the Shop now →</button>`);
      const focusRow = pendingShopFocusId && list.querySelector(`[data-shop-row="${pendingShopFocusId}"]`);
      if (focusRow) {
        pendingShopFocusId = null;
        focusRow.classList.add('shop-row-focus');
        focusRow.scrollIntoView?.({ block: 'center' });
      }
      document.querySelectorAll('[data-shop-filter]').forEach(button => {
        const active = button.dataset.shopFilter === shopFilter;
        button.className = `shop-filter-btn shrink-0 rounded-full border px-2 py-1 text-[8px] font-black ${active ? 'border-emerald-500 text-emerald-300 bg-emerald-950/40' : 'border-slate-700 text-slate-400'}`;
      });
    }

    function shopItemMatchesFilter(item, balance) {
      const owned = !!cosmeticPurchaseState[item.id];
      const type = COSMETIC_CATEGORY_TYPES[item.category];
      if (shopFilter === 'affordable') return !owned && balance >= item.cost;
      if (shopFilter === 'owned') return owned;
      if (shopFilter === 'unowned') return !owned;
      if (shopFilter === 'equipped') return owned && equippedIdOf(type) === item.id;
      return true;
    }

    function persistNewCosmetics() {
      try { localStorage.setItem('shithead_new_cosmetics', JSON.stringify([...newCosmeticIds])); } catch (e) {}
    }

    function showShopPurchaseSuccess(item) {
      const panel = document.getElementById('shopPurchaseSuccess');
      if (!panel || !item) return;
      panel.innerHTML = `<div class="text-2xl">✨</div><div class="text-[11px] font-black text-emerald-300">${item.name} unlocked</div><div class="mt-1 flex items-center justify-center">${shopCosmeticThumbnail(item, COSMETIC_CATEGORY_TYPES[item.category])}</div><div class="mt-1 text-[8px] text-slate-300">Use EQUIP NOW to apply it.</div>`;
      panel.classList.remove('hidden');
      panel.classList.remove('shop-purchase-success');
      void panel.offsetWidth;
      panel.classList.add('shop-purchase-success');
      setTimeout(() => panel.classList.add('hidden'), 2600);
    }

    function getCosmeticDescription(type) {
      return {
        cardBack: 'Changes your deck and face-down cards',
        frame: 'Adds a border and glow around your cards',
        emotes: 'Changes the six reactions in your emote fan',
        tableTheme: 'Changes your table background and arena styling',
        burnEffect: 'Plays when you burn the pile',
        victoryEffect: 'Plays when you finish in first place',
        jokerEffect: 'Plays over the table when you play a Joker',
        avatar: 'Your avatar in games, Friends and the leaderboard',
        deck: 'Changes the faces of your cards'
      }[type] || 'Custom item';
    }

    function shopCosmeticThumbnail(item, type) {
      if (type === 'tableTheme') return `<span style="display:block;width:120px">${cosmeticPreview(item, type)}</span>`;
      return cosmeticPreview(item, type);
    }

    function shopCosmeticPreviewMarkup(item) {
      const type = COSMETIC_CATEGORY_TYPES[item.category];
      let demo = '';
      if (type === 'cardBack') {
        demo = `<div class="shop-preview-stage"><div class="card-base shop-preview-card relative rounded-xl custom-card-back ${getCosmeticBackClass(item.id)} border-2 border-slate-500 flex items-center justify-center shadow-xl">${getEmblemSvg()}<span class="absolute inset-[5px] rounded-lg border border-white/20"></span></div></div>`;
      } else if (type === 'frame') {
        demo = `<div class="shop-preview-stage"><div class="card-base shop-preview-card relative rounded-xl bg-slate-900 border-2 p-1 font-black text-white" style="border-color:${item.tones[1]};${getCosmeticFrameStyle(item.id)}"><span class="card-corner-rank block leading-none">A</span><span class="card-corner-suit block leading-none mt-px">♠</span><span class="absolute inset-0 flex items-center justify-center text-[clamp(22px,4vh,34px)] opacity-90">♠</span></div></div>`;
      } else if (type === 'emotes') {
        demo = `<div class="shop-preview-stage"><div class="grid grid-cols-3 gap-2">${(EMOTE_PACKS[item.id] || []).map(emoji => `<span class="w-10 h-10 rounded-full bg-slate-800 border border-amber-400/60 flex items-center justify-center text-xl">${emoji}</span>`).join('')}</div></div>`;
      } else if (type === 'tableTheme') {
        demo = `<div class="shop-preview-stage" style="width:100%">${miniTablePreviewHtml(item.id, item.name, true)}</div>`;
      } else if (type === 'burnEffect') {
        demo = `<div class="shop-preview-stage" data-shop-burn-stage><div class="shop-burn-core">${burnPreviewIcon(item.id)}</div></div>`;
      } else if (type === 'avatar') {
        demo = `<div class="shop-preview-stage"><div class="avatar-demo">${avatarHtml(item.id, 84)}<div class="avatar-demo-list"><span class="avatar-demo-chip">${avatarHtml(item.id, 22)}<span>IN GAME</span></span><span class="avatar-demo-chip">${avatarHtml(item.id, 22)}<span>#1 <small>Leaderboard</small></span></span><span class="avatar-demo-chip">${avatarHtml(item.id, 22)}<span>FRIENDS</span></span></div></div></div>`;
      } else if (type === 'jokerEffect') {
        demo = `<div class="jfx-stage" data-shop-joker-stage><div class="jfx-stage-hint">${jokerPreviewIcon(item.id)}</div></div>`;
      } else if (type === 'deck') {
        demo = `<div class="shop-preview-stage" style="gap:10px">${deckMiniCardHtml(item, true)}<span class="deck-mini-card ${item.theme} is-big"><span class="dm-rank ${getSuitStyle('♦')}">10</span><span class="dm-suits"><span class="${getSuitStyle('♦')}">♦</span><span class="${getSuitStyle('♣')}">♣</span></span></span></div>`;
      } else if (type === 'victoryEffect') {
        demo = `<div class="shop-preview-stage"><div class="text-center"><div class="text-5xl">${victoryPreviewIcon(item.id)}</div><div class="text-[8px] text-slate-400 mt-1">Tap below to play the win animation</div></div></div>`;
      }
      const isAnimated = type === 'burnEffect' || type === 'victoryEffect' || type === 'jokerEffect';
      return `<div class="flex items-start justify-between gap-2 mb-1"><div><div class="text-[10px] font-black text-white">${item.name}</div><div class="text-[8px] uppercase tracking-wider text-cyan-300">${item.category.slice(0, -1)} preview</div></div><button type="button" data-close-shop-preview class="text-slate-400 text-lg leading-none" aria-label="Close preview">×</button></div><div class="min-h-[106px] flex items-center justify-center">${demo}</div>${isAnimated ? `<button type="button" data-play-shop-effect="${item.id}" class="mt-2 w-full rounded-lg border border-cyan-500 py-1.5 text-[9px] font-black text-cyan-300">PLAY EFFECT</button>` : ''}<p class="mt-2 text-center text-[8px] text-slate-500">Preview only — no Diamonds have been spent.</p>`;
    }

    function playShopBurnPreview(id, stage, scale = .62) {
      if (!stage) return false;
      ShLevelBurns.clear(stage);
      if (window.ShLevel3D) ShLevel3D.clear(stage);
      audio.playBurnSound(id);
      stage.querySelectorAll('.shop-burn-particle, .bfx, .bfx-flash, .pfx-layer').forEach(node => node.remove());
      if (SHAPE_BURN_EFFECTS.has(id)) {
        const rect = stage.getBoundingClientRect();
        return playBurnFx(id, stage, (rect.width || 240) / 2, (rect.height || 132) * .62, scale);
      }
      const kind = id === 'burn-ice' ? 'ice' : id === 'burn-electric' ? 'electric' : '';
      const palette = id === 'burn-ice' ? ['#e0f2fe','#7dd3fc','#38bdf8']
        : id === 'burn-electric' ? ['#ffffff','#fde047','#22d3ee']
        : id === 'burn-coloured' ? ['#fbbf24','#fb7185','#c084fc','#22d3ee']
        : ['#f97316','#fbbf24','#ef4444'];
      for (let index = 0; index < 18; index += 1) {
        const particle = document.createElement('span');
        particle.className = `shop-burn-particle ${kind}`.trim();
        const angle = (Math.PI * 2 * index) / 18;
        const distance = 38 + (index % 4) * 9;
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance - 18}px`);
        particle.style.setProperty('--spin', `${(index % 2 ? 1 : -1) * (90 + index * 13)}deg`);
        particle.style.setProperty('--particle-color', palette[index % palette.length]);
        particle.style.animationDelay = `${(index % 5) * 18}ms`;
        stage.appendChild(particle);
        setTimeout(() => particle.remove(), 1100);
      }
      return true;
    }

    function getCosmeticBackClass(id) {
      if (['back-cobalt-linen','back-sage-linen','back-plum-linen'].includes(id)) return `cosmetic-${id}`;
      if (SEASONAL_BACK_IDS.has(id)) return `cosmetic-${id} season-back`;
      if (/^back-lvl-/.test(id || '')) return `cosmetic-${id} lvl-back`;
      return { 'back-midnight':'cosmetic-back-midnight','back-emerald':'cosmetic-back-emerald','back-neon':'cosmetic-back-neon','back-crimson':'cosmetic-back-crimson','back-nebula':'cosmetic-back-nebula','back-inferno':'cosmetic-back-inferno',
        'back-arcade':'cosmetic-back-arcade','back-space':'cosmetic-back-space','back-tartan':'cosmetic-back-tartan','back-artdeco':'cosmetic-back-artdeco','back-dragon':'cosmetic-back-dragon','back-stained':'cosmetic-back-stained' }[id] || 'cosmetic-back-default';
    }

    function getCosmeticFrameStyle(id) {
      const styles = {
        'frame-silver': 'box-shadow:inset 0 0 0 1px #cbd5e1,0 0 7px rgba(96,165,250,.5)!important',
        'frame-gold': 'box-shadow:inset 0 0 0 2px #fbbf24,0 0 8px rgba(251,191,36,.65)!important',
        'frame-diamond': 'box-shadow:inset 0 0 0 2px #67e8f9,0 0 9px rgba(34,211,238,.68)!important',
        'frame-obsidian-throne': 'box-shadow:inset 0 0 0 2px #8b5cf6,0 0 9px rgba(139,92,246,.68)!important',
        'frame-emerald-sovereign': 'box-shadow:inset 0 0 0 2px #34d399,0 0 9px rgba(52,211,153,.68)!important',
        'frame-darkness': 'border-color:#000!important;box-shadow:inset 0 0 0 3px #000!important',
        'frame-gauntlet': 'border-color:#f59e0b!important;box-shadow:inset 0 0 0 1px #fde68a,inset 0 0 0 3px #b45309,0 0 9px rgba(245,158,11,.75)!important',
        'frame-gauntlet-hard': 'border-color:#e11d48!important;box-shadow:inset 0 0 0 1px #fde68a,inset 0 0 0 3px #9f1239,0 0 9px rgba(225,29,72,.75)!important',
        'frame-gauntlet-boss': 'border-color:#a855f7!important;box-shadow:inset 0 0 0 1px #fde68a,inset 0 0 0 3px #6b21a8,0 0 9px rgba(168,85,247,.75)!important',
        'frame-split-crimson': 'box-shadow:inset 2.5px 2.5px 0 #e11d48,inset -2.5px -2.5px 0 #f8fafc,0 0 8px rgba(225,29,72,.45)!important',
        'frame-split-royal': 'box-shadow:inset 2.5px 2.5px 0 #2563eb,inset -2.5px -2.5px 0 #fbbf24,0 0 8px rgba(37,99,235,.45)!important',
        'frame-split-noir': 'box-shadow:inset 2.5px 2.5px 0 #000,inset 3.5px 3.5px 0 #52525b,inset -2.5px -2.5px 0 #ec4899,0 0 8px rgba(236,72,153,.45)!important',
        'frame-dashed-gold': 'outline:2px dashed #fbbf24;outline-offset:-5px;box-shadow:0 0 7px rgba(251,191,36,.45)!important',
        'frame-neon-tube': 'outline:2px solid #f472b6;outline-offset:-4px;box-shadow:0 0 10px rgba(244,114,182,.75),inset 0 0 9px rgba(244,114,182,.45)!important;animation:fx-neon-flicker 4.5s infinite',
        'frame-spectrum': 'border-style:solid;border-width:2px;box-shadow:0 0 9px rgba(168,85,247,.55)!important;animation:fx-spectrum 2.6s linear infinite'
      };
      if (SEASONAL_FRAME_STYLES[id]) return `box-shadow:${SEASONAL_FRAME_STYLES[id][0]}!important`;
      return styles[id] || '';
    }

    // Opponent cards are much smaller and overlap by design, so an inset
    // decorative frame steals too much usable card face. These styles sit
    // just OUTSIDE the card edge via box-shadow (which never changes layout
    // dimensions), with a deliberately restrained glow so neighbouring cards
    // remain readable.
    function getOpponentCosmeticFrameStyle(id) {
      const styles = {
        'frame-silver': 'box-shadow:0 0 0 1px #cbd5e1,0 0 4px rgba(96,165,250,.42)!important',
        'frame-gold': 'box-shadow:0 0 0 1px #fbbf24,0 0 5px rgba(251,191,36,.5)!important',
        'frame-diamond': 'box-shadow:0 0 0 1px #67e8f9,0 0 5px rgba(34,211,238,.52)!important',
        'frame-obsidian-throne': 'box-shadow:0 0 0 1px #8b5cf6,0 0 5px rgba(139,92,246,.5)!important',
        'frame-emerald-sovereign': 'box-shadow:0 0 0 1px #34d399,0 0 5px rgba(52,211,153,.5)!important',
        'frame-darkness': 'border-color:#000!important;box-shadow:0 0 0 1px #000!important',
        'frame-gauntlet': 'border-color:#f59e0b!important;box-shadow:0 0 0 1px #fbbf24,0 0 5px rgba(245,158,11,.55)!important',
        'frame-gauntlet-hard': 'border-color:#e11d48!important;box-shadow:0 0 0 1px #fda4af,0 0 5px rgba(225,29,72,.55)!important',
        'frame-gauntlet-boss': 'border-color:#a855f7!important;box-shadow:0 0 0 1px #d8b4fe,0 0 5px rgba(168,85,247,.55)!important',
        'frame-split-crimson': 'box-shadow:-1.5px -1.5px 0 0 #e11d48,1.5px 1.5px 0 0 #f8fafc!important',
        'frame-split-royal': 'box-shadow:-1.5px -1.5px 0 0 #2563eb,1.5px 1.5px 0 0 #fbbf24!important',
        'frame-split-noir': 'box-shadow:-1.5px -1.5px 0 0 #000,1.5px 1.5px 0 0 #ec4899!important',
        'frame-dashed-gold': 'outline:1px dashed #fbbf24;outline-offset:-2px;box-shadow:0 0 4px rgba(251,191,36,.45)!important',
        'frame-neon-tube': 'outline:1px solid #f472b6;outline-offset:-2px;box-shadow:0 0 5px rgba(244,114,182,.6)!important',
        'frame-spectrum': 'border-style:solid;animation:fx-spectrum 2.6s linear infinite;box-shadow:0 0 5px rgba(168,85,247,.5)!important'
      };
      if (SEASONAL_FRAME_STYLES[id]) return `box-shadow:${SEASONAL_FRAME_STYLES[id][1]}!important`;
      return styles[id] || '';
    }

    function openShopCosmeticPreview(item) {
      const panel = item && document.getElementById(`shop-preview-${item.id}`);
      if (!panel || !item) return;
      const wasOpen = !panel.classList.contains('hidden');
      document.querySelectorAll('[data-inline-shop-preview]').forEach(el => {
        el.classList.add('hidden');
        el.innerHTML = '';
      });
      document.querySelectorAll('[data-preview-cosmetic-id]').forEach(button => button.setAttribute('aria-expanded', 'false'));
      if (wasOpen) return;
      panel.innerHTML = shopCosmeticPreviewMarkup(item);
      panel.classList.remove('hidden');
      // Burn effects play straight away so the preview shows the effect
      // itself, not just a static icon; PLAY EFFECT replays it.
      if (COSMETIC_CATEGORY_TYPES[item.category] === 'burnEffect') playShopBurnPreview(item.id, panel.querySelector('[data-shop-burn-stage]'));
      if (COSMETIC_CATEGORY_TYPES[item.category] === 'jokerEffect') playJokerPreview(item.id, panel.querySelector('[data-shop-joker-stage]'));
      const button = document.querySelector(`[data-preview-cosmetic-id="${item.id}"]`);
      if (button) button.setAttribute('aria-expanded', 'true');
    }
    function isAmitkTestingAccount(profile = {}) {
      const username = String(profile.username || '').trim().toLowerCase();
      const email = String(currentUser?.email || '').trim().toLowerCase();
      return username === 'amitk' || email === 'amirk2197@googlemail.com';
    }

    // Gives the designated AmitK testing account one real, spendable 999,999
    // Diamond balance. The V4 marker makes this a one-time grant: purchases
    // reduce the canonical users/{uid}/diamonds value normally and reopening
    // the Shop does NOT refill it.
    function ensureAmitkSpendableTestBalance() {
      if (!currentUser) return Promise.resolve(null);
      // The one-time grant is made by the server (economy `init`, checked by
      // the account's verified email); this just reads the result.
      return ensureServerProfile().then((res) => {
        if (res && res.testGrant) { challengeEconomy.diamonds = Number(res.diamonds) || 0; updateDiamondHeader(); }
        return res;
      }).catch(() => null);
    }

    function openShopPanel() {
      closeHamburgerMenu();
      closeOtherMenuPages('shopModal');
      if (!currentUser) { openAuthModal(); return; }
      document.getElementById('shopModal').classList.remove('hidden');
      setTimeout(() => showHelperTip('shop-hold', '#shopModal [data-shop-row]'), 900); // § Helper tips
      if (!shopTabPicked) shopTab = restoredShopTab(seasonalTabLeads());
      clearShopActionNotice();
      setNameTokenStatus('Loading…');
      initChallengeEconomy()
        .then(() => ensureAmitkSpendableTestBalance())
        .then(() => Promise.all([
          db.ref(`shopPurchases/${currentUser.uid}/nameChangeToken`).once('value'),
          db.ref(`shopPurchases/${currentUser.uid}/cosmetics`).once('value'),
          db.ref(`users/${currentUser.uid}/ownedCosmetics`).once('value'),
          db.ref(`users/${currentUser.uid}`).once('value')
        ]))
        .then(([snap, cosmeticsSnap, ownedSnap, userSnap]) => {
          const canonicalUser = userSnap.val() || {};
          challengeEconomy.diamonds = Number(canonicalUser.diamonds) || 0;
          seasonalWinState = canonicalUser.seasonWins || {};
          updateDiamondHeader();
          nameChangeTokenState = snap.val();
          cosmeticPurchaseState = { ...(cosmeticsSnap.val() || {}), ...(ownedSnap.val() || {}) };
          renderNameChangeToken();
          renderCosmeticShop();
        }).catch((e) => setNameTokenStatus(`Couldn’t load the Shop${e.code ? ` (${e.code})` : ''}.`, 'error'));
    }
    // Control setup is registered below.
    // Control setup is registered below.
    // v286 (owner): the hint says where the Diamonds go; phones say Tap.
    // Control setup is registered below.
    // Control setup is registered below.
    // Control setup is registered below.
    // Control setup is registered below.
    // Control setup is registered below.
    // Control setup is registered below.
    // Spends the Name Change Token. Shared by the Shop's Use row and the
    // Profile page's inline editor so both apply exactly the same checks.
    function changeUsernameWithToken(newName) {
      if (!currentUser || !nameChangeTokenState || nameChangeTokenState.usedAt) return Promise.reject(new Error('You need an unused Name Change Token.'));
      if (!USERNAME_PATTERN.test(newName)) return Promise.reject(new Error('Use 3–12 characters; start with a letter or number.'));
      if (isUsernameBlocked(newName)) return Promise.reject(new Error('That username isn’t allowed.'));
      const uid = currentUser.uid;
      return getOrCreateUserProfile(uid).then((profile) => {
        const oldName = (profile.username || '').trim();
        const oldKey = oldName.toLowerCase();
        const newKey = newName.toLowerCase();
        if (!oldKey || oldKey === newKey) throw new Error('Choose a different username.');
        const rating = profile.rating != null ? profile.rating : 500;
        const tier = getRankTier(rating).name;
        const newUsernameRef = db.ref(`usernames/${newKey}`);
        return newUsernameRef.transaction((existing) => existing ? existing : uid).then((result) => {
          if (!result.committed || result.snapshot.val() !== uid) throw new Error('Username unavailable — try another.');
          return db.ref().update({
            [`usernames/${oldKey}`]: null,
            [`users/${uid}/username`]: newName,
            [`publicProfiles/${uid}/username`]: newName,
            [`leaderboard/${oldKey}`]: null,
            [`leaderboard/${newKey}`]: { username: newName, rating, tier, wins: profile.wins || 0, losses: profile.losses || 0 },
            [`shopPurchases/${uid}/nameChangeToken/usedAt`]: firebase.database.ServerValue.TIMESTAMP
          }).catch((error) => newUsernameRef.remove().then(() => { throw error; }));
        });
      }).then(() => {
        nameChangeTokenState.usedAt = Date.now();
        document.getElementById('playerNameInput').value = newName;
        renderNameChangeToken();
        refreshProfilePanel();
        notifyBanner(`Username changed to ${newName}.`);
      });
    }
    // Control setup is registered below.
    // Control setup is registered below.
    // Control setup is registered below.

    function initCosmeticShopControls() {
document.getElementById('menuShopBtn').addEventListener('click', openShopPanel);
document.getElementById('headerDiamondBtn').addEventListener('click', openShopPanel);
try {
      if (window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) {
        document.getElementById('headerDiamondBtn').setAttribute('data-tip', 'Diamonds · Tap to open the Shop');
      }
    } catch (e) {}
document.getElementById('profileChangeUsernameBtn').addEventListener('click', () => {
      if (nameChangeTokenState?.usedAt) return;
      if (currentUser && nameChangeTokenState) { openProfileNameEditor(); return; }
      document.getElementById('profileModal').classList.add('hidden');
      openShopPanel();
    });
document.getElementById('nameTokenBuyBtn').addEventListener('click', () => {
      if (!currentUser) { document.getElementById('shopModal').classList.add('hidden'); openAuthModal(); return; }
      if (nameChangeTokenState) return;
      const btn = document.getElementById('nameTokenBuyBtn');
      btn.disabled = true;
      btn.textContent = 'Purchasing…';
      callEconomy('buyNameToken').then((res) => ({ balance: Number(res.diamonds) || 0 })).then(({ balance }) => {
        challengeEconomy.diamonds = balance;
        nameChangeTokenState = { purchasedAt: Date.now(), cost: NAME_CHANGE_TOKEN_COST };
        updateDiamondHeader();
        renderNameChangeToken();
      }).catch((e) => {
        setNameTokenStatus(e.message || 'Purchase failed. Please try again.', 'error');
        renderNameChangeToken();
      });
    });
document.getElementById('shopTabBar').addEventListener('click', (event) => {
      const tab = event.target.closest('[data-shop-tab]');
      if (!tab) return;
      shopTab = tab.dataset.shopTab;
      shopTabPicked = true;
      rememberShopTab(shopTab);
      renderCosmeticShop();
      tab.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
    });
document.getElementById('cosmeticShopList').addEventListener('click', (event) => {
      const seasonToggle = event.target.closest('[data-season-toggle]');
      if (seasonToggle) {
        const id = seasonToggle.dataset.seasonToggle;
        seasonalSectionOverrides[id] = !isSeasonalSectionOpen(id, seasonToggle.dataset.seasonState);
        renderCosmeticShop();
        return;
      }
      const jump = event.target.closest('[data-shop-tab-jump]');
      if (jump) { shopTab = jump.dataset.shopTabJump; shopTabPicked = true; renderCosmeticShop(); return; }
      const giftBtn = event.target.closest('[data-gift-item]');
      if (giftBtn) { event.preventDefault(); openGiftModal(giftBtn.dataset.giftItem); return; }
      const bundleBtn = event.target.closest('[data-bundle-event]');
      if (bundleBtn) { event.preventDefault(); buySeasonalBundle(bundleBtn.dataset.bundleEvent); return; }
      const categoryBtn = event.target.closest('[data-shop-category]');
      if (categoryBtn) {
        event.preventDefault();
        event.stopPropagation();
        const category = categoryBtn.dataset.shopCategory;
        if (collapsedShopCategories.has(category)) collapsedShopCategories.delete(category);
        else collapsedShopCategories.add(category);
        try { localStorage.setItem(SHOP_COLLAPSED_KEY, JSON.stringify([...collapsedShopCategories])); } catch (e) {}
        renderCosmeticShop();
        return;
      }
      const closePreviewBtn = event.target.closest('[data-close-shop-preview]');
      if (closePreviewBtn) {
        event.preventDefault();
        event.stopPropagation();
        const inlinePanel = closePreviewBtn.closest('[data-inline-shop-preview]');
        if (inlinePanel) {
          inlinePanel.classList.add('hidden');
          inlinePanel.innerHTML = '';
          const itemId = inlinePanel.id.replace('shop-preview-', '');
          document.querySelector(`[data-preview-cosmetic-id="${itemId}"]`)?.setAttribute('aria-expanded', 'false');
        }
        return;
      }
      const playBtn = event.target.closest('[data-play-shop-effect]');
      if (playBtn) {
        event.preventDefault();
        event.stopPropagation();
        const id = playBtn.dataset.playShopEffect;
        const item = COSMETIC_SHOP_ITEMS.find(entry => entry.id === id);
        const type = item && COSMETIC_CATEGORY_TYPES[item.category];
        if (type === 'victoryEffect') playVictoryEffect(id);
        if (type === 'jokerEffect') playJokerPreview(id, playBtn.closest('[data-inline-shop-preview]')?.querySelector('[data-shop-joker-stage]'));
        if (type === 'burnEffect') {
          const inlinePanel = playBtn.closest('[data-inline-shop-preview]');
          playShopBurnPreview(id, inlinePanel?.querySelector('[data-shop-burn-stage]'));
        }
        return;
      }
      const previewBtn = event.target.closest('[data-preview-cosmetic-id]');
      if (previewBtn) {
        event.preventDefault();
        event.stopPropagation();
        const previewItem = COSMETIC_SHOP_ITEMS.find(entry => entry.id === previewBtn.dataset.previewCosmeticId);
        if (previewItem && newCosmeticIds.delete(previewItem.id)) {
          persistNewCosmetics();
          renderCosmeticShop();
        }
        openShopCosmeticPreview(previewItem);
        return;
      }
      const equipBtn = event.target.closest('[data-shop-equip-id]');
      if (equipBtn && !equipBtn.disabled) {
        const equipItem = COSMETIC_SHOP_ITEMS.find(entry => entry.id === equipBtn.dataset.shopEquipId);
        const equipType = equipItem && COSMETIC_CATEGORY_TYPES[equipItem.category];
        if (equipItem && equipCosmetic(equipType, equipItem.id, { preview: false, sync: true })) {
          newCosmeticIds.delete(equipItem.id);
          persistNewCosmetics();
          const shopStatus = document.getElementById('cosmeticShopStatus');
          shopStatus.textContent = `${equipItem.name} equipped.`;
          shopStatus.className = 'text-[9px] text-center text-emerald-400 leading-snug mt-2';
          notifyBanner(`✓ ${equipItem.name} equipped.`);
        }
        return;
      }
      const btn = event.target.closest('.cosmetic-buy-btn');
      if (!btn || btn.disabled || !currentUser) return;
      const item = COSMETIC_SHOP_ITEMS.find(entry => entry.id === btn.dataset.cosmeticId);
      if (!item || cosmeticPurchaseState[item.id]) return;
      if (!isSeasonalItemBuyable(item)) {
        const ev = SEASONAL_EVENT_BY_ID[item.season];
        const next = seasonalWindowsAround().filter(w => w.event.id === item.season && w.start > seasonalNow()).sort((a, b) => a.start - b.start)[0];
        showShopActionNotice(`${item.name} is only sold during ${ev ? ev.name : 'its event'}${next ? ` — back on ${seasonShortDate(next.start)}` : ''}.`, 'error');
        return;
      }
      const visibleBalance = Number(challengeEconomy.diamonds) || 0;
      if (visibleBalance < item.cost) {
        const shortfall = item.cost - visibleBalance;
        showShopActionNotice(`Not enough Diamonds — you need 💎${shortfall} more for ${item.name}.`, 'error');
        notifyBanner(`⚠ Not enough Diamonds — you need ${shortfall} more.`);
        return;
      }
      clearShopActionNotice();
      btn.disabled = true;
      btn.textContent = 'BUYING…';
      // The server checks the price, the balance and the event window, and
      // records ownership and the Diamonds together (economy `buyItem`).
      callEconomy('buyItem', { itemId: item.id }).then(res => Number(res.diamonds) || 0).then((balance) => {
        challengeEconomy.diamonds = balance;
        cosmeticPurchaseState[item.id] = { purchasedAt: Date.now(), cost: item.cost };
        lastPurchasedCosmeticId = item.id;
        newCosmeticIds.add(item.id);
        persistNewCosmetics();
        document.getElementById('cosmeticShopStatus').textContent = `${item.name} purchased. Tap EQUIP NOW to use it.`;
        document.getElementById('cosmeticShopStatus').className = 'text-[9px] text-center text-emerald-400 leading-snug mt-2';
        clearShopActionNotice();
        updateDiamondHeader();
        renderNameChangeToken();
        renderCosmeticShop();
        renderPersonalisationCosmetics();
        showShopPurchaseSuccess(item);
        spawnDiamondSpend(document.getElementById('headerDiamondBtn'));
        notifyBanner(`✓ ${item.name} purchased for ${item.cost} Diamonds.`);
      }).catch((error) => {
        const message = error.message || 'Purchase failed. Please try again.';
        document.getElementById('cosmeticShopStatus').textContent = message;
        document.getElementById('cosmeticShopStatus').className = 'text-[9px] text-center text-rose-400 leading-snug mt-2';
        showShopActionNotice(message, 'error');
        notifyBanner(`⚠ ${message}`);
        renderCosmeticShop();
      });
    });
document.getElementById('shopFilterBar').addEventListener('click', (event) => {
      const button = event.target.closest('[data-shop-filter]');
      if (!button) return;
      shopFilter = button.dataset.shopFilter;
      renderCosmeticShop();
    });
document.getElementById('nameTokenUseBtn').addEventListener('click', () => {
      if (!currentUser || !nameChangeTokenState || nameChangeTokenState.usedAt) return;
      const btn = document.getElementById('nameTokenUseBtn');
      btn.disabled = true;
      btn.textContent = 'Changing…';
      changeUsernameWithToken(document.getElementById('nameTokenInput').value.trim())
        .catch((e) => setNameTokenStatus(e.message || 'Username change failed. Please try again.', 'error'))
        .finally(() => { btn.disabled = false; btn.textContent = 'Use'; });
    });
document.getElementById('shopCloseBtn').addEventListener('click', () => {
      document.getElementById('shopModal').classList.add('hidden');
      if (giftTarget) { giftTarget = null; renderGiftBanner(); }
    });
document.getElementById('shopModal').addEventListener('click', (e) => {
      if (e.target.id === 'shopModal') document.getElementById('shopModal').classList.add('hidden');
    });
    }

