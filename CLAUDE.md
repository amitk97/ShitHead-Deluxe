# ShitHead Deluxe

Single-file web game (`index.html`) on Firebase Hosting + Realtime Database (project `shithead-pro`).

- `index.html` is the live game. `index1.html`, `index2.html`, … are old snapshots — don't edit them (Hosting ignores them).
- `database.rules.json` is the source for the Realtime Database rules. Hosting deploys automatically on merge to `main`, but **rules do not**: after changing them, publish the file's contents in Firebase Console → Realtime Database → Rules.
- **Commit and push straight to `main`** (it deploys live automatically). No branches, PRs or merge steps unless the owner asks for one — there are no other players yet.
- **Whenever the rules change, paste the complete `database.rules.json` into the chat reply as one copy-pastable code block.** The owner publishes rules by pasting them into the Console and can't easily open/copy JSON files.
- Tests: open `index.html?dev-tests=1` (the suite lives in `dev-tests.js`, loaded only then; it runs against index.html's globals). All tests should pass; the runner restores `db`/`auth`/`currentUser` after every test.
- Assets live outside index.html: table and card-back art in `art/tables/*.svg` and `art/backs/*.svg`, sound clips in `audio/*.mp3` (cache headers in `firebase.json`; art caches for 1 day, so a changed file can take a day to reach players).

## AmitK test account

- Username `AmitK` / email `amirk2197@googlemail.com` (`isAmitkTestingAccount`).
- Gets a one-time, real 999,999 Diamond balance (`ensureAmitkSpendableTestBalance`, marker `amitKShopTestGrantV4Done`). Spending reduces it; it is never refilled.
- The exception is **Shop spending only**. Do not unlock gameplay (bot difficulties, ranked, etc.) for this account.
- No special Database Rules exception is needed: users may write their own `users/{uid}` and diamonds are capped at 999,999.

## Firebase transaction pitfall (the cause of "has Diamonds but can't buy")

`ref.transaction(update)` first calls `update` with the **local cache**, which is `null` when nothing keeps that path live-synced. Returning `undefined` aborts immediately without ever reading the server. So in any transaction that can abort:

- `if (current === null) return null;` before the checks, so Firebase re-runs with the server value.
- Reset any error/result captured by the closure at the start of every pass, and confirm success from the final pass (see `createCosmeticPurchaseTransaction`).

A write to a parent node re-runs `.validate` on every child, so a whole-`users/{uid}` transaction fails if any existing child (e.g. `equippedCosmetics`) no longer satisfies its rule. `equippedCosmetics` rules accept ownership from `users/{uid}/ownedCosmetics` (canonical) or the legacy `shopPurchases/{uid}/cosmetics` mirror.

## Profile pictures

- Cosmetic type `avatar` (category `Profile Pictures`). Art is inline SVG in `AVATAR_ART`; every picture uses the same 1:1 rounded-square tile via `avatarHtml(id, size)`. Keep new pictures in that style (shared tile, glow tone, metal/suit gradients).
- Free = `BUILT_IN_COSMETICS` (Bronze Crown is also what `default` shows). Shop = `COSMETIC_SHOP_ITEMS`. Earn-only = `EARNED_AVATARS`, granted into `ownedCosmetics` by `grantEarnedAvatars`. The Platinum Crown (id `avatar-crown-diamond`, kept for compatibility) is earned at Platinum.
- Bots get a random free picture, never shared with another bot at the table (`pickBotAvatar` / `ensureBotAvatars`).
- Adding a picture also needs the rules updated: `equippedCosmetics/avatar` id list and the `shopPurchases` price list.
- The page's Tailwind CSS is precompiled: new utility class names silently do nothing. Use custom CSS classes or inline styles for new UI.

## Shop / Custom layout

- Only one page is open at a time: `EXCLUSIVE_PAGE_IDS` (every menu page + `inboxModal`) is watched by `exclusivePageObserver`, so opening any of them hides the rest, whatever opened it.

- Both pages use section tabs driven by `COSMETIC_TABS`, Pictures first, then by where items show up: Tables, Card Backs, Frames, Burn, Victory, Emotes (Custom adds Deck after Pictures via `CUSTOM_TABS`). A new cosmetic category = one entry there.
- The Shop's Seasonal tab is first (and the default tab) only while an event is live or starts within `SEASONAL_LEAD_DAYS` (3) days (`seasonalTabLeads`); otherwise it's last. Each event section folds with a chevron (`seasonalSectionOverrides`); live/soon events start open, the rest folded.
- Custom shows every cosmetic as a tile (`.cosmetic-tile-grid`, 2 per row; pictures 3 per row).
- Table themes are CSS on `body[data-equipped-table-theme="…"] #gameTable` plus a `--table-label-border` accent and a Shop preview background in `shopCosmeticPreviewMarkup`. New themes also need the rules id list and price.

## Table layout & lobby prefs

- Opponent seats are never clipped or scrolled: `#opponentsContainer` has no max height; `fitOpponentSeats` shrinks `--opp-scale` so a seat stays within ~19% of the screen height.
- Vs Bots remembers the last bot count and difficulty (`readBotPrefs` / `applyBotPrefs`: localStorage `shithead_bot_count` / `shithead_difficulty`, plus `botCount` / `botDifficulty` in `users/{uid}/settings` for signed-in accounts). A locked difficulty is never restored.
- Tab strips (`initHorizontalScroller`) keep the selected tab scrolled into view.

## Showcase & daily streak

- Showcase: equipped table/card back/frame/burn/victory/emotes are mirrored to `publicProfiles/{uid}/showcase` (`syncShowcase`) and shown on the in-game player card and the Profile page (`showcaseHtml`). New cosmetic types that should be shown need adding to `SHOWCASE_TYPES` and the `showcase` rule.
- Daily login streak: `claimDailyLoginReward` claims `users/{uid}/loginStreak` (local calendar day) then adds `DAILY_STREAK_REWARDS` Diamonds. The 7-day track repeats; a missed day restarts at Day 1.
- Locked Custom tiles use `data-locked` (not `disabled`) so tapping opens that item in the Shop (`openLockedCosmetic`).

## Seasonal events

- `SEASONAL_EVENTS` (9 events) drives everything: names, emotes, table rim/label, frame glow, card-back colours. Items are generated as `<kind>-<event>` (`table-halloween`, `back-halloween`, `frame-…`, `burn-…`, `victory-…`, `avatar-…`, `emotes-…`) plus earn-only `avatar-<event>-earned` (win 3 games during the event, counted in `users/{uid}/seasonWins/<event>-<year>`).
- Prices are fixed per kind (`SEASONAL_PRICES`: backs/frames 300, pictures/emotes 500, burns 1000, tables/victories 1500); the event bundle is 75% of whatever the player doesn't own yet. The rules match seasonal ids by regex, so a new event = add its id to the `(lunar|valentine|…)` lists in `database.rules.json`.
- Dates: `seasonalWindowsForYear`. Diwali, Lunar New Year and Ramadan use hard-coded tables to 2040 (Lunar/Ramadan fall back to `Intl` calendars after that; Diwali needs new dates adding after 2040). Easter is computed.
- Seasonal items are only sold during their event (Shop → Seasonal tab); owned ones stay in Custom forever. `seasonalNowOverride = 'YYYY-MM-DDT12:00'` in the console previews any date. The AmitK test account can buy every event's items any time (Shop spending only).
- Art: tables are `art/tables/season-<event>.svg`, card backs `art/backs/<event>.svg` (paths in `SEASONAL_TABLE_ART` / `SEASONAL_BACK_ART`); pictures in `SEASONAL_AVATAR_ART`; effects in `SEASONAL_BURN_FX` / `SEASONAL_VICTORY_FX`.

## Gifting

- Shop rows have 🎁 GIFT (any item that's buyable right now; never earn-only pictures). Friends list 🎁 opens the Shop in "gift for X" mode (`giftTarget`).
- `sendGift`: the sender pays in a `users/{uid}` transaction (`calculateGiftPayment`, receipt mail), then writes `gifts/{friendUid}/{giftId}`; if delivery fails the Diamonds are refunded. Rules: only a friend can create a gift, only the recipient can read/delete it.
- `claimGift` (Inbox → OPEN GIFT): `calculateGiftClaim` adds the item to `ownedCosmetics`, or pays its Shop price if already owned, and records `claimedGifts/{giftId}` in the same transaction so a gift can't be opened twice.

## Match summary

- `showMatchEndUI` → `scheduleMatchSummary` opens `#matchSummaryModal` ~1.6s after the end (after the victory effect). Content from `matchSummaryHtml`: placing, the local player's `gameStats`, every Diamond toast this match (`enqueueChallengeToast` → `logMatchReward`), Ranked rating change (`applyRankedRatingUpdate` → `matchSummaryRating`), daily and seasonal progress. It updates live as late rewards arrive.
- REMATCH mirrors the end-of-match row (Quick Play / guest "waiting for host" / Ranked "find another match"). `hideMatchEndUI` (every new match) resets it. Not scheduled while the dev test suite runs.
