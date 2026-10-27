# Shop wishlist extension

The earlier backlog recommendation was stale: v374 already shipped Shop hearts, a Wishlist filter, profile display and account sync. This draft retains that feature and addresses confirmed cache, synchronization and saved-view gaps. It extends the existing Shop's navy/amber/emerald/rose styling and item artwork; it introduces no new brand or global design system.

Hearts use 12px glyphs optically centred on the title line in borderless 16px buttons, with an invisible 32px hit area, item-specific accessible names, pressed states and visible focus rings. Wishlist sits next to All and shows the total saved count. The filtered view includes saved seasonal items while their season is closed; existing purchase eligibility still applies. Section tabs can narrow the saved view, with empty-state guidance to choose All. Existing profile visibility remains and is stated in sync feedback. The client cap blocks new additions at 30; it does not truncate valid existing cloud or cache entries. Concurrent devices may temporarily produce more than 30 saved items, with additions blocked until the count falls below 30. There is no server-enforced count limit.

## Storage and synchronization

`js/wishlist-store.js` owns the controller; `app.js` connects it to authentication and existing profile/Shop rendering. `shop.js` renders counts, saved items and status. The module is loaded and cached through `index.html` and `sw.js`.

- Device caches use `shithead_wishlist:v2:guest` and `shithead_wishlist:v2:{uid}`, storing IDs and a per-item pending journal. Switching accounts clears the previous account's visible state before rendering its replacement.
- Legacy unscoped `shithead_wishlist` data remains available to guests. It is not automatically attributed or imported into the next signed-in account. Explicit new guest additions transfer once to the first receiving account, subject to the cap on new additions; they do not follow subsequent accounts.
- Cloud snapshots replace stale cached membership, with only explicit pending edits overlaid. A removed cloud item is therefore not resurrected by an old cache. Writes use per-item Firebase `update()` values (`true` to add, `null` to remove), rather than replacing the entire wishlist.
- Revision checks preserve edits made during an in-flight write. Listener detachment and generation/account guards prevent late reads or write completions from applying to another account.
- Failed reads and writes retain queued edits and expose Retry sync. An edit after a failed initial read keeps the error and actionable Retry control; it does not falsely report an active save. Retry reconnects when needed. Online and foreground events also request retry. Device persistence depends on available browser storage; storage failures are caught.

The existing `publicProfiles/{uid}/wishlist` path and `{itemId: true}` representation remain. This draft changes no server rules, schema, ownership, pricing, purchase or gifting behavior.

## Reproduce the focused checks

Run from the repository root with Node.js (CI uses Node 22):

```sh
node tools/wishlist-store-test.js
node tools/wishlist-browser-test.js
```

The 13 controller tests need no npm dependencies. The browser runner requires `playwright@1.55.0` resolvable by Node and an installed Chromium. This repository has no root package manifest; CI creates a temporary one using `npm init -y`, installs with `npm install --no-save --ignore-scripts playwright@1.55.0`, then runs `npx playwright install --with-deps chromium chrome`.

For the local environment used for review:

```sh
SH_CHROMIUM_EXECUTABLE=/usr/bin/chromium SH_VIDEO_DEPS=/tmp/sh-test-deps node tools/wishlist-browser-test.js
```

`SH_VIDEO_DEPS` supplies local browser SDK assets from its `node_modules/firebase/firebase-*-compat.js` and `node_modules/canvas-confetti/dist/confetti.browser.js` (install compatible `firebase@10.12.0` (the current CDN version) and `canvas-confetti` there if needed). Omit that variable to use the default CDN assets. Omit `SH_CHROMIUM_EXECUTABLE` to use Playwright's installed Chromium. The runner serves the actual local Shop runtime via routed requests and replaces account data with a synthetic in-memory backend; it does not exercise live Firebase.

The focused browser suite covers keyboard hearts and focus, guest reload, account separation, pending removal/reload/retry, failed-initial-read recovery through the visible button, live changes, sign-out, closed-season purchase locks, responsive overflow and page exceptions. All 13 controller tests pass, including concurrent additions at the cap without data loss. The focused browser suite passed after F1, the cap-only fix and the final heart-size correction (`/tmp/wishlist-small-hearts.log`). The last run verifies an actual click outside the visible circle within its invisible hit area, keyboard focus, responsive captures and no browser exceptions; modular asset checks also passed 43 checks. The final full regression run (`/tmp/wishlist-final-regressions.log`) finished 670/671: its sole failure was the Profile showcase scroll check (971–1075 of 844). The identical intermittent failure appears in `/tmp/sh-fixed-tests.log` from a regression task before any wishlist changes; subsequent serial/GitHub CI runs then passed 671/671. A separate full 671/671 run before F1 remains historical evidence. The final suite is not fully green, and CI on the final branch is pending.

The user subsequently reported that the favourite icons looked too large. The final correction removes the surrounding circle and selected background, using a 16px-wide button with a 12px glyph while retaining an explicit invisible 32px `::after` hit area. All seven review captures were refreshed from the actual local runtime. The change preserves the incumbent Shop styling and creates no global design rules.

## Review and release state

The initial independent extension review requested one fix, F1: editing after a failed initial account read hid Retry and falsely claimed saving. The final independent verdict marks F1 and F2 (preservation of valid entries when concurrent additions exceed the client cap) resolved and says **ship at F1/F2-only scope**; it does not constitute a fresh full-extension or live-release approval. See [review evidence](../.impeccable/review/README.md).

The prepared build is v466, based on main commit `9757ccc9e002eb32c7e07506ad5dbc35dca374aa`. Nothing has been deployed or merged to main; user approval is still required after review. No physical-device, live Firebase or real-account test is claimed. `TODO.md` and `CLAUDE.md` retain stale wishlist reminders and historical merge/rules instructions; they were deliberately not edited. `PRODUCT.md` and `DESIGN.md` are absent; this extension does not create them or repair global documentation/design drift.
