# Full-scene table replacement — v270 approved release

**Owner approved publication on 1 October 2026, with the five final theme revisions recorded below.**

The rejected v269 draft was never pushed. Remote main was rechecked on 2026-10-01 and remains v268 at `ba516fc5d546874f16852afe4ccc2fbc5bbd5546`; no revert was necessary. This draft starts from that commit, not the rejected draft.

## Changes

All 23 tables use a shared responsive scene renderer. The sky and texture cover the whole table. Terrain is generated across the actual screen width, with independently anchored side and top features. Each feature has one uniform scale based on the smaller table dimension. Stars, embers, petals and patterns spread across the scene. Gradients, highlights and shadows give the feature layers depth. The game, home backdrop and cosmetic previews share the renderer. All table IDs, names, prices and ownership remain unchanged. Gameplay and the economy are unchanged.

The master cosmetic style document now requires responsive full scenes and replaces the safe-area motif / crop-defining-art instructions. Illustrated themes use vector art. Oak Wood and Classic Felt retain the existing native 3x seamless texture tiles with vector detailing.

## Review evidence

The contact sheet contains all **138 real browser captures**, with a dealt, in-progress Vs Bots game. The app uses its genuine offline fallback in this environment; Firebase and other external requests are unavailable. No gameplay mock or substitute UI was used. The local player's turn is held for consistent artwork review. Each JPEG's actual pixel dimensions were checked before saving.

Required sizes: **390×844, 360×640, 768×1024, 1366×768, 1920×1080 and 3840×2160**. Every final capture was visually inspected in eight enlarged review panels: scene coverage, complete and recognisable main features, preserved proportions, continuous terrain or texture, and readable card faces and controls. Art may run behind the cards, as requested. The disabled Play selected button has an opaque, subdued background so its label remains readable even over bright patterned art; enabled controls keep their existing styling.

| Table ID | Name | Six-size visual review | Feature geometry |
|---|---|---|---|
| table-candyfloss | Candyfloss | 6/6 reviewed | 6/6 pass |
| table-desert | Desert | 6/6 reviewed | 6/6 pass |
| table-jungle | Jungle | 6/6 reviewed | 6/6 pass |
| table-devilish | Devilish | 6/6 reviewed | 6/6 pass |
| table-angelic | Angelic | 6/6 reviewed | 6/6 pass |
| table-neon | Neon City | 6/6 reviewed | 6/6 pass |
| table-aurora | Northern Lights | 6/6 reviewed | 6/6 pass |
| table-space | Deep Space | 6/6 reviewed | 6/6 pass |
| table-lunar | Lantern Festival | 6/6 reviewed | 6/6 pass |
| table-valentine | Candlelit Dinner | 6/6 reviewed | 6/6 pass |
| table-ramadan | Crescent Night | 6/6 reviewed | 6/6 pass |
| table-easter | Spring Meadow | 6/6 reviewed | 6/6 pass |
| table-summer | Beach Day | 6/6 reviewed | 6/6 pass |
| table-halloween | Haunted Graveyard | 6/6 reviewed | 6/6 pass |
| table-diwali | Rangoli | 6/6 reviewed | 6/6 pass |
| table-christmas | Fireside | 6/6 reviewed | 6/6 pass |
| table-newyear | Midnight Skyline | 6/6 reviewed | 6/6 pass |
| table-casino | Casino | 6/6 reviewed | 6/6 pass |
| table-winter | Winter | 6/6 reviewed | 6/6 pass |
| table-midnight | Midnight | 6/6 reviewed | 6/6 pass |
| table-royal | Royal | 6/6 reviewed | 6/6 pass |
| table-wood | Oak Wood | 6/6 reviewed | 6/6 pass |
| table-felt | Classic Felt | 6/6 reviewed | 6/6 pass |

## Automated validation

- Required matrix: **138/138 pass**, no browser page errors.
- Additional folded-phone / short-phone / ultra-wide / 200% zoom matrix: **92/92 pass**, no browser page errors. Cases: 344×882, 320×568, 2560×1080, and 1920×1080 at 200% browser scale.
- The new dev test checks every table at the six required sizes using rendered DOM bounds. It fails if any marked main feature extends outside the table or falls below its theme-specific minimum (at least 12% of the smaller dimension; defining wings, planets and similar features have larger thresholds). It also checks uniform scaling and scene coverage.
- Existing catalog/economy and cosmetic asset validation tools pass: `tools/v268-client-test.js` and `tools/v265-art-test.js`.
- Full dev suite: **558/579 pass**. The unmodified v268 baseline in the same offline environment is **557/578 pass**. Both have the same 21 failing test names. The new full-scene test adds one passing test. This is not a claim of a clean full-suite pass.

The full suite's existing or environment-dependent failures are recorded below. Network-dependent failures cannot be validated here; those need a connected release check if publication is approved.

- Cosmetic art: the default SH card back previews on tap and hold without equipping on release: hold previews an unequipped default back
- REGRESSION: Custom is organised into tabs with tiles, at least 2 per row: Tiles sit at least two to a row
- Friends show when they are in a match; WATCH opens it read-only from their seat: Watching the friend's seat
- Profile showcase: tapping an item opens Custom on its tab, scrolled to that item: Viewing another showcase does not equip anything — expected "frame-spectrum", got "default"
- Back goes to the page you came from: Profile → Custom → Collection, then back, back, closed: Back from Custom: Profile — expected ["profileModal"], got []
- Press and hold an item in Custom for a big preview; a tap still equips as before: The hold opens the big preview
- REGRESSION: the hamburger menu has all 9 items in the agreed order, with no duplicates: No id anywhere in the document may be duplicated — expected [], got ["approved-joker-bg","approved-joker-card","v267-orbit-gold","v267-orbit-violet","v267-orbit-depth","v267-tear-fill"]
- Server economy: a call that trips the Firebase Messaging bug is sent directly instead: You need a connection for that.
- Server economy: a finished match and the daily login streak are recorded by the server: Streak day and reward come from the server — expected {"count":2,"reward":15}, got null
- Server economy: a finished Ranked match is scored by the server from the room: Only the room is sent, never a rating — expected [["rankedResult",{"roomCode":"123456"}]], got [["rankedResult",{"roomCode":"123456"}],["init",{}]]
- Seasonal mail: one "event is here" and one "last day" mail per event, never re-sent after reading: The first visit during Halloween sends its mail
- Gauntlet: a result that could not reach the server is kept and sent later (a win is never lost): Sent once there is a signal — expected ["gauntlet",{"op":"result","runId":"g5","won":true}], got undefined
- Referrals: a ?ref= link is remembered, cleaned from the address bar and claimed once signed in: Claimed with the code — expected ["referral",{"op":"claim","code":"AMITK"}], got undefined
- Big Print: with a huge hand no rank or suit is covered by the next card: no index is covered — expected 0, got 3
- Card backs v197: Dragon Scale and Stained Glass are vector, priced, previewable: back-dragon is drawn from vector art
- 4K: every table, card back and picture is vector art or a 3x tile, with no bitmap inside: avatar-crown-bronze only uses its own art/avatars files
- Premium pictures (Royal Flush, Cosmic Ace) and tables (Neon City, Northern Lights, Deep Space): Cosmic Ace mixes at least two motions
- Custom → All: every item incl. all seasonal ones, folding sections, and a Diamonds / owned / Shop bar: Sections count owned / total — expected "1/29", got "4/29"
- REGRESSION: Google sign-in is enabled and clicking it opens a real Google pop-up sign-in (redirect only as the fallback): Clicking it must first try a real Google pop-up sign-in
- Old-room cleanup removes only rooms over 2 days old and idle, with the one query the rules allow: Cannot read properties of null (reading 'path')
- Settings persist: a change made just before a refresh wins over the older account copy; other devices still sync: Marked as not yet saved to the account

## Reproduce

Set `SH_CHROMIUM` to a Chromium executable and `SH_CONFETTI` to a local canvas-confetti browser bundle. Install Playwright and Sharp (Node) and Pillow (Python), or use the configured runtime dependencies.

```bash
node tools/full-scene-browser-test.js
node tools/full-scene-browser-test.js --extra --geometry-only
node tools/full-scene-browser-test.js --suite
python tools/full-scene-contact-sheet.py
```

`SH_GAME_ROOT`, `SH_TABLE_OUT` and `SH_REVIEW_OUT` optionally override the repository, capture and contact-sheet directories. The browser tool routes local project files and aborts external requests. Review the full-resolution screenshots as well as the contact sheet before approving any release.

## Final approved revisions

Owner explicitly requested push to main after these changes: Fireside is an indoor Christmas room without tree/snowflake/window imagery; Candlelit Dinner has no flowers or petals; Casino uses the reference green surface with top-left-to-bottom-right diagonal lines and no chips/suits; Royal uses purple fine crosshatching with no crowns; Jungle is a thick layered forest with canopy, rooted trees, vines and undergrowth.

Final responsive matrices were rerun: 138/138 required cases and 92/92 extra cases, with no page errors. Jungle received a final canopy refinement and its ten cases were rechecked separately. The two existing client/art validators pass. Prior full-suite results above are retained as baseline evidence; the full suite was not rerun for these artwork-only revisions.
