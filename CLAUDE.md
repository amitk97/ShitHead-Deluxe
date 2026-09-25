# ShitHead Deluxe

Single-file web game (`index.html`) on Firebase Hosting + Realtime Database (project `shithead-pro`).

- Finding your way: the BUILD comment at the top has a FILE MAP; the GAMEPLAY ENGINE script opens with a MAP and each section starts with a `// § Name` marker (search `// § `). New code goes in the matching section; a new section gets a marker and a line in the map.
- `index.html` is the live game. `index1.html`, `index2.html`, … are old snapshots — don't edit them (Hosting ignores them).
- `database.rules.json` is the source for the Realtime Database rules. Hosting deploys automatically on merge to `main`, but **rules do not**: after changing them, publish the file's contents in Firebase Console → Realtime Database → Rules.
- **Commit and push straight to `main`** (it deploys live automatically). No branches, PRs or merge steps unless the owner asks for one — there are no other players yet.
- **Whenever the rules change, paste the complete `database.rules.json` into the chat reply as one copy-pastable code block.** The owner publishes rules by pasting them into the Console and can't easily open/copy JSON files.
- Keep every line of `database.rules.json` short (~100 chars): long expressions are broken across lines at ` && ` / ` || ` (Firebase accepts line breaks inside rule strings; it is not strict JSON). Very long lines got corrupted when copied from the chat on a phone ("Line 34 invalid"). Check changes with the database emulator (`PUT /.settings/rules.json`). A paste stops at 20,000 characters and the file is ~24,400, so give the rules in TWO code blocks split at a top-level key (currently before `"usernames"`), to be pasted one after the other.
- Tests: open `index.html?dev-tests=1` (the suite lives in `dev-tests.js`, loaded only then; it runs against index.html's globals). All tests should pass; the runner restores `db`/`auth`/`currentUser` after every test.
- Assets live outside index.html: table and card-back art in `art/tables/*.svg` and `art/backs/*.svg`, sound clips in `audio/*.mp3` (played through Web Audio from buffers decoded once in `SoundFX`; never clone `<audio>` per play, it lags on iPhones) (cache headers in `firebase.json`; art caches for 1 day, so a changed file can take a day to reach players).

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

## Settings

- Tabs like the Shop (`SETTINGS_TABS`: Gameplay, Display, Sound & Alerts, Accessibility; last tab in localStorage `shithead_settings_tab`). Each tab is a `.settings-tab-panel`; search looks across every tab and clearing it returns to the chosen one. "Helper Icons" reads ON when shown (pref is still `shithead_hide_helpers`).
- Order: tabs by how often they're used; inside a tab the main slider first, then rows alphabetical (a test checks this).
- Turn Alert (`turnAlertOn`, `audio/turn.mp3` at `TURN_ALERT_GAIN` = 8% of the volume: the owner wants it faint) chimes in `render` when `isMyTurn` goes false → true. Notification Sound (`notifySoundOn`, `audio/notify.mp3`) chimes when `notifyNewInboxItems` sees a new invite/request/gift. Both default on and sync to `users/{uid}/settings`.

## Blind flip reveal

- Every face-down (blind) play goes through a reveal first (`playBlindReveal`, gated at the top of `executePlayCards`; the real play reruns with `{ revealed: true }`): the card rises over the pile, the table dims, it wobbles and turns edge-on, then snaps over glowing green (playable) or red (forced pickup). ~1.2s for you, ~0.8s for others (`BLIND_REVEAL_MS`). Sounds are synthesised (`playRevealTension` / `playRevealResult`).
- `state.blindRevealing` blocks every other play meanwhile (reset by `hideMatchEndUI`). Skipped (instant flip) in the tutorial, with Reduce Motion, while fast-forwarding, in a hidden tab and during the test suite (`shouldRevealBlind`). Online, the client making the flip (you, or the host for a bot) broadcasts it as `rooms/{code}/lastBlindReveal` (`broadcastBlindReveal`: card, result, length, `serverNow()` time) and every other player plays the same reveal, trimmed by the delay (`showRemoteBlindReveal`), so it lands with the real play.

## Challenges

- Every row shows what the challenge asks for; a completed row keeps that description (with the ✓) instead of just "Completed". The "Challenge completed" mail shows it too. One source: `challengeDescription(defOrCompletionKey)` (handles `daily_<date>_<id>` / `weekly_<week>_<id>` keys and the tutorial).

## Microinteractions & flips

- Main buttons press in (`scale` on `:active`, plus a 6ms vibration tick on touch); a touched hand card lifts; Play pulses once when it becomes available (`mi-pulse-once`); the turn pill slides in when your turn arrives (`mi-slide-in`); the header Diamond count rolls to its new value (`rollDiamondCount`).
- Face-up cards arriving on any table (yours and opponents') and the Pile inspect view flip in with a crisp 3D turn (`mi-flip-in`, first appearance via `shouldPopCard`). Played cards stay a quick slide.
- Also: pickups fly into the seat as a fan of card backs (`spawnPickupFan`); cards selected to play stay raised with a gold edge in the hand (`mi-staged`) and spring up on the pile (`mi-staged-preview`/`mi-lift-in`); Settings toggles are sliding switches (`paintToggle` → `.mi-switch`, the ON/OFF text stays); every `.cosmetic-tab-bar` gets one gliding highlight pill (`attachTabGlide`, from `initHorizontalScroller`); the last 5s of your online turn pulse red with a soft tick + buzz each second (`mi-urgent`, `audio.playTick`); a Shop purchase tosses Diamonds out of the header balance and off the bottom of the screen (`spawnDiamondSpend`); pages and pop-ups spring in when opened (`watchOverlayEntrances` → `springIn`).
- Also: the direction icon spins a full turn when a 9 reverses play (`updateDirectionBadge`); earned Diamonds stream up into the header (`spawnDiamondGain`, from `updateDiamondHeader`); the match summary's bars fill from their last width, new reward rows slide in, finished rows stamp ✓ and a tier change shows a flipping, shining RANK UP badge (`animateMatchSummary` / `msShown`, reset in `hideMatchEndUI`); equipping in Custom pops the new tile with a click (`audio.playEquipClick`); the Inbox icon wiggles and its count bounces when something new arrives (`refreshInboxBadge`).
- House motion curves: CSS `--ease-snappy` (presses/toggles), `--ease-bouncy` (landings), `--ease-soft` (fades/pop-ups), `--ease-spring` (a real spring via `linear()`, bouncy fallback); JS twin `EASE`. Use these for any new animation.
- All of it is off with Reduce Motion (the `body.reduce-motion` CSS rule, or `reduceMotion` / `motionOff()` checks for Web Animations).

## Pages fit every phone

- Every `div.fixed.inset-0.flex.items-center.justify-center` pop-up/page caps its panel at the VISIBLE screen (`100dvh` less padding, `--safe-top` and the home bar) and scrolls inside, so its top and X never slip under the header/status bar (iPhone Safari's `vh` includes hidden toolbars). Exclusions use `:not(:where(...))` so they add no specificity (plain `:not(#id)` outranked pages' own ID rules). A dev test checks tall content still fits.
- Pages/pop-ups are moved to the top level of `<body>` at load (list at the top of the GAMEPLAY ENGINE script). Inside `#gameTable`, any transform on the table (burn screen-shake etc.) made their `position:fixed` start at the table top, under the header. A new page/pop-up goes in that list.

## Shop / Custom layout

- Only one page is open at a time: `EXCLUSIVE_PAGE_IDS` (every menu page + `inboxModal`) is watched by `exclusivePageObserver`, so opening any of them hides the rest, whatever opened it.

- Both pages use section tabs driven by `COSMETIC_TABS`, Pictures first, then by where items show up: Tables, Card Backs, Frames, Burn, Victory, Emotes (Custom adds Deck after Pictures via `CUSTOM_TABS`). A new cosmetic category = one entry there.
- The Shop's Seasonal tab is first (and the default tab) only while an event is live or starts within `SEASONAL_LEAD_DAYS` (3) days (`seasonalTabLeads`); otherwise it's last. Each event section folds with a chevron (`seasonalSectionOverrides`); live/soon events start open, the rest folded.
- Custom shows every cosmetic as a tile (`.cosmetic-tile-grid`, 2 per row; pictures 3 per row).
- Table themes are CSS on `body[data-equipped-table-theme="…"] #gameTable` plus a `--table-label-border` accent and a Shop preview background in `shopCosmeticPreviewMarkup`. New themes also need the rules id list and price.

## Table layout & lobby prefs

- Opponent seats are never clipped or scrolled: `#opponentsContainer` has no max height; `fitOpponentSeats` shrinks `--opp-scale` so a seat stays within ~19% of the screen height.
- The play-direction badge (`#gameDirectionBadge`) is a circle the size of the Card Powers button, in the left-hand column above the Play Matrix button (same size), level with the middle of the Deck (`positionDirectionBadge`, end of `render` and on resize). The hand's rows spread into spare height (at least 55% of each back-row card shows), and `fitHandToTable` (end of `render`) shrinks the rows/cards if the player's area still runs past the table bottom (the play button row is revealed after the hand is sized). The hand's `maxHeight` is the cards' height plus its own padding.
- Vs Bots remembers the last bot count and difficulty (`readBotPrefs` / `applyBotPrefs`: localStorage `shithead_bot_count` / `shithead_difficulty`, plus `botCount` / `botDifficulty` in `users/{uid}/settings` for signed-in accounts). A locked difficulty is never restored.
- Tab strips (`initHorizontalScroller`) keep the selected tab scrolled into view.

## Online sync pitfalls (the cause of "Ranked/online lags and freezes")

- Firebase never stores empty arrays: a player whose Hand or Face-Up has run out arrives with that zone missing. The room listener refills `hand`/`faceUp`/`faceDown` with `[]` before use; never treat a missing zone as damage (`localDealLooksIncomplete` only flags a live seat with no cards at all).
- `syncFirebaseGameState()` fires this client's own room listener synchronously. Anything the listener does that syncs again (refill invariant, recovery requests) must only sync when something really changed, or it recurses until the page freezes.
- Firebase returns object keys sorted; compare objects key-by-key (`sameCosmeticLoadout`), never with `JSON.stringify`.
- The online "no legal move → auto pick-up" check runs once per turn, keyed on seat + `turnDeadline` + pile length (an 8 in a 2-player match gives the same seat the next turn).
- Bonus Draw online has an 8s countdown (`BONUS_FOLLOW_UP_MS`) and is skipped on timeout; a Joker with one possible target skips the picker; timeout auto-play flips a face-down card when that's all a player has.
- Leaving (`leaveMultiplayerRoom`): lobby → removed from the list; mid-match → a bot takes the seat (2-player casual ends back in the lobby); a leaving host passes `isHost` to the next human. Presence `left` also tells the others within 3s. The last real player leaving deletes the room.
- Shared deadlines (turn timer, Bonus countdown, invites, Ranked queue) use `serverNow()` (Date.now + `.info/serverTimeOffset`), never the phone's own clock. The first turn after everyone is Ready gets a deadline too.
- Every `syncFirebaseGameState` stamps `updatedAt`. `pruneOldRooms` (signed-in, once per 6h per device, 25 at a time) deletes rooms over 2 days old with no activity for 2 days; the rules only allow that query shape on `rooms` (ordered by `createdAt`, from the oldest, ≤25).

## Ranked

- `getOrCreateUserProfile` fills in a missing `rating`/`wins`/`losses` field-by-field in transactions (records often exist before the first Ranked game). Never write defaults with a plain update: it can land after a result saved in the meantime.
- `applyRankedRatingUpdate` seeds `highestRating`/`lowestRating` from the pre-match rating via `finiteRating`: a NaN anywhere makes Firebase reject the whole result.
- Queue = one `matchmaking/waiting` ticket. The waiter refreshes `ts` every 5s (`RANKED_TICKET_HEARTBEAT_MS`) and sets `onDisconnect().remove()`; searchers treat a ticket older than 30s as a ghost and take the spot. Claiming (`decideRankedQueueAction`) removes the opponent in the same transaction. Assignments carry `at` and are ignored after 60s. A waiter whose ticket vanished with no assignment re-queues itself.

## Installable app & notifications

- `manifest.webmanifest`, `icons/*.png` and `sw.js` make the game installable (menu → Install App: the browser prompt, or Safari steps on iOS). `sw.js` is network-first for pages (every deploy shows at once) and only serves its cached copy offline; `sw.js` and the manifest are `no-cache` in `firebase.json`.
- Settings → Notifications (`notificationsOn`, localStorage `shithead_notifications`). While the game is open/backgrounded, `notifyNewInboxItems` announces new gifts, game invites and friend requests from the Inbox listeners.
- App closed (push): each device saves its FCM token at `pushTokens/{uid}/{key}` (`registerPushToken`; removed on toggle-off and sign-out while still signed in). The Cloud Functions in `functions/` (`notifyGameInvite`, `notifyFriendRequest`, `notifyGift`, daily 09:00 UK `notifySeasonStart`) send data-only messages; `sw.js` shows them (skipped when the game is on screen, except on Apple devices, which must show every push). Tags match the in-game alerts (`shithead-gift-<id>`, `shithead-season-<key>`…), so nothing shows twice.
- Push is on: `FCM_VAPID_KEY` in index.html holds the project's Web Push key (Console → Project settings → Cloud Messaging → Web Push certificates) and the functions are deployed: project on the Blaze plan, then GitHub → Actions → "Deploy notification functions" (runs on changes to functions/ or by hand; its service account `github-action-…` has the Owner role, and the workflow enables the Cloud Billing API first) or `npx firebase-tools deploy --only functions` locally. Hosting ignores `functions/**`.
- `functions/seasons.js` is a COPY of the event dates code in index.html (`DIWALI_DATES` … `seasonalWindowsForYear`): change both together.
- Without the server, Android's installed app still gets event starts: the page posts `upcomingSeasonCalendar()` to `sw.js`, and a `periodicsync` ('season-check', ~daily) shows the alert on the start day.
- The service worker isn't registered when `?dev-tests=1` is in the URL.
- The installed iPhone app draws under the status bar (`black-translucent`): `--safe-top` (`env(safe-area-inset-top)`) is added to the header's height, the top of the full-page panels, `.fixed.inset-0.p-4/.p-3` pop-ups and top banners. Anything new pinned to the top of the screen needs `var(--safe-top)` too.

## Google sign-in

- Google = `signInWithPopup` (account chooser every time), falling back to `signInWithRedirect` when the pop-up can't open, and always redirect in the installed iPhone app (`navigator.standalone`). The redirect alone failed with "missing initial state" in the installed Android app.
- `authDomain` = the page's own hosting domain (`SAME_SITE_AUTH_DOMAINS`), so the `/__/auth/handler` step stays same-site. A cross-site handler loses its state on phones and shows "missing initial state". Every domain in that list must be an Authorized redirect URI (`https://<domain>/__/auth/handler`) on the Google OAuth web client (Google Cloud Console → APIs & Services → Credentials), and in Firebase Auth → Authorized domains. `sw.js` never intercepts `/__/` paths.
- Every link ends at `https://shithead-pro.web.app/`: GitHub Pages (`*.github.io`) and `shithead-pro.firebaseapp.com` redirect from the first script in `<head>` (privacy-policy.html too); `/index.html` and old snapshot names (`/indexN.html`) 301 to `/` (`redirects` in `firebase.json`); any other missing path gets `404.html`, which redirects to the game. `_config.yml` keeps the snapshots off GitHub Pages so they 404 there too.

## Phone back gesture

- Back (Android gesture/button; a left-edge swipe in the installed iPhone app) closes the top pop-up/page (`BACK_LAYERS`: element id → its close button or function; `null` = must be answered, Back does nothing), then the menu; at a table it clicks Exit (the "Leave this match?" confirm); in a Ranked search it cancels; in an online lobby it offers to leave. Only the bare home screen lets Back exit the app.
- One `{ shBackGuard: true }` history entry exists whenever there's something to go back from (`syncBackGuard`, driven by a MutationObserver on those elements); closing with an on-screen button drops it again. A new pop-up/page needs an entry in `BACK_LAYERS`. Reloads after leaving a match/room go through `reloadCleanly`.

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
- The summary is not a page: `.ms-scrim` sits at z-index 79, below the Inbox and every menu page (lowest is the Guide at 80), so they open on top of it and closing them returns to it (a test checks). It is not in `EXCLUSIVE_PAGE_IDS`.
- Vs Bots only: a LEAVE button sits under the "MATCH FINISHED" box on the player's table area (`#finishedLeaveBtn`, drawn in `render`) → `leaveBotMatch()` (clears the saved game, `reloadCleanly`, no confirm). Never online or in the tutorial.
- REMATCH mirrors the end-of-match row (Quick Play / guest "waiting for host" / Ranked "find another match"). `hideMatchEndUI` (every new match) resets it. Not scheduled while the dev test suite runs.

## Version, What's New & error reports

- The version comes ONLY from the `<!-- BUILD: YYYY-MM-DD-vNNN ... -->` comment at the top of index.html (`GAME_BUILD` → `getGameVersionLabel()`). Bump it for every release: it drives room compatibility (`clientVersion`), the support email and What's New.
- What's New: `WHATS_NEW['vNNN']` = `[icon, text]` rows, shown once to a returning player whose `shithead_seen_version` differs (`maybeShowWhatsNew`, waits for the home screen). A build with no entry shows nothing. Add one when players would notice the change.
- `reportError` writes `errorReports/{uid}/{id}` (once per error per session, never during tests). Only the owner (`GAME_OWNER_EMAIL`, verified) can read/clear them: menu → Error Reports (`#errorReportsModal`, grouped by message).

## Rejoin, friends & small prefs

- The current room is kept in sessionStorage `shithead_joined_room` plus localStorage `shithead_active_match` ({code, at, playerId, name}, 3h): always use `rememberJoinedRoom` / `forgetJoinedRoom` / `joinedRoomRecord`. On load (`attemptMatchReconnect`, after auth; guests too) a live match rejoins: Ranked automatically by uid, casual after the "Rejoin your match?" prompt (`#rejoinModal`; seat by uid, stored id, or name incl. a "Name (Bot)" stand-in, which is handed back via `reclaimSubstitutedSeat`).
- Friends: online first with "N of M online"; INVITE from inside a casual lobby invites into that room (`inviteableRoomCode`), otherwise it opens a new one. The lobby has an Invite Friends button.
- Match history: `recordMatchHistory` (from `showMatchEndUI`, once per match via `matchHistoryCurrentId`, reset in `hideMatchEndUI`) saves the last 30 to localStorage `shithead_match_history_<uid|guest>` and, signed in, `users/{uid}/matchHistory/{id}` (pruned to 30). `patchMatchHistory` adds late Diamonds (`logMatchReward`) and the Ranked rating change. Shown in Stats → Match History (`matchHistoryHtml`; tabs via `statsTab`, localStorage `shithead_stats_tab`).
- Burn sounds: `BURN_SOUNDS[burnId]` recipes (synthesised via `SoundFX._burnKit`), one per Burn cosmetic plus `default`; `audio.burn(burnEffectIdFor(player))` in `executeBurn` and Joker counters, remote players hear it from `lastCosmeticEffect` (skipped by the sender via its `by` field), Shop preview plays it.
- **Whenever a new Burn item is added (Shop or seasonal), also design its own `BURN_SOUNDS` recipe without being asked**: read its animation (`bfx…` / `sbfx…` function) and follow it beat for beat: what the effect is (fire, water, ice, sparks…), the moment of impact, each delayed wave (use the same delays), and the tail as particles land (e.g. Cannonball = plunk + splash, a second wash with the second ripple at 0.22s, droplets pattering down). Keep it in the same loudness range as the others (peak ≈ 0.2–0.55 when rendered offline) and never reuse another item's recipe. A test fails if a Burn item has no recipe.
- Inbox and Friends lists pull to refresh (`attachPullToRefresh`). The Shop opens on the last tab (`shithead_shop_tab`, `restoredShopTab`), except a seasonal event that started since takes the lead once. Turn Alert also buzzes (Vibration). Leaving a live Ranked match warns it counts as a loss.
