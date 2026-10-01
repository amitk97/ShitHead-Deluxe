# Server-owned Ranked — v262

`rankedGames/{roomCode}` is Admin-only canonical state. The server cryptographically shuffles 54 cards and assigns random UUID handles. It never accepts card values, snapshots, timestamps, player identity or results supplied by a browser.

`rankedStart` requires the host of a two-account Ranked lobby, recent self-owned membership markers, supported client version and verified server profiles. A room has one match; a finished room cannot be redealt. `rankedMove` derives the account from callable authentication and validates match ID, request ID, state version, ownership, zone, turn and legality before committing an atomic transaction. Ready is a commutative own-seat operation so simultaneous Ready requests work. Request IDs make retries idempotent. Timers use server time; active-player ticks and a scheduled backup handle expiration. Leaving concedes only the authenticated caller's seat.

The engine implements swaps, blind flips, face-up sacrifice, bonus continuation, same-rank final hand/face-up combinations, rank powers, four-of-kind Snap Burns, Jokers/counters, refills, stand-ins, reconnects and stalemate draws. `rankedResult` scores only canonical FINISHED placings and retains duplicate-payment and pair-per-day protection.

Public `rooms/{code}` contains revealed cards and masked counts. Private `rankedViews/{code}/{uid}` additionally reveals only that account's hand. Every blind card and the stock stay masked; dummy rank/suit fields exist only for renderer compatibility and carry no real values. Publications refuse to overwrite a newer version. Firebase removes empty arrays/objects, so the engine hydrates them after database reads.

## Deployment

1. Push main. Wait for Hosting and Deploy notification functions workflows to succeed.
2. Publish all of `database.rules.json` in Firebase Console → Realtime Database → Rules. Canonical/private paths have no browser write grant; private reads are self-only. Canonical public rooms deny whole-game writes. Self-owned presence and emotes remain permitted.
3. New Ranked matches use v262. Legacy full-deck requests are refused; legacy browser-written rooms are not accepted for Ranked scoring. Players may finish a legacy display session but cannot obtain a new Ranked result from it. Players update from home.

The client subscribes to private views and also fetches its view through periodic authenticated ticks. Updated rules are required for correct realtime updates and public-room write protection. A permission error tells the player to return home and retry.

## Tests

- `node tools/ranked-server-test.js`: 20 focused checks and 40 complete simulated games with conservation of all 54 cards.
- `node tools/security-boundary-test.js`: economy identity and replay boundaries.
- Database emulator plus `tools/ranked-server-emulator-test.js`: hidden-data denial, outsider/multipath writes, actual handlers, concurrent moves, duplicate scoring and publication ordering.
- Database emulator plus `tools/ranked-browser-test.js`: two real Chromium clients, private hand rendering, Ready, move sync, subscription reconnect, concession. Add `SH_DEV_SUITE=1` to run the broader browser regression suite; `SH_TEST_FILTER` selects tests. Dependencies: Firebase, rules-unit-testing, Playwright, esbuild; optional `@fontsource-variable` Outfit/Cinzel/Plus Jakarta Sans packages make offline font rendering match production; `SH_CHROMIUM` selects the executable.

## Regression status

The full v262 browser run passed 567/573. Four failures also reproduce against the v261 source: showcase selection, page navigation, hold preview, and a scoring-test assertion affected by a background economy init. Two additional tests mixed local time with Firebase server time; their fixtures now use `serverNow()` and were rechecked separately. The previous Big Print failure disappears with production fonts loaded. The Ranked engine, actual-handler database access tests and two-client browser checks pass; this is not a claim that the entire existing UI suite is green.

## Remaining limits

This migration covers Ranked. Casual rooms still share browser-owned cards/state. Solo bot/Gauntlet results and some selected challenge claims still trust reports. Local UI changes are always possible; they cannot alter canonical Ranked cards or placings. Admission relies on self-owned account markers and does not prevent collusion or multiple accounts. Spectators see masked public Ranked data. Historical legacy server deals may still exist in Admin-only storage; no client API returns them.

## Play Friends engine preparation — not connected yet

The engine also accepts an explicit `{isRanked:false}` option for two to four distinct seats, including up to two permanent bots. Ranked callers retain the existing two-account default. Casual turns follow direction and skip finished seats; eights cap skips at the number of opponents; finishing places remain ordered while remaining players continue. A multiplayer Joker creates a timed target choice restricted to its initiator. The server chooses a live target if that choice expires. Permanent bots use short server deadlines and do not concede after five substitute turns.

`node tools/casual-engine-test.js` covers these rules, guest/public masking, bot identity rejection and 60 complete three/four-player simulations with conservation of all 54 cards. The existing Ranked engine suite additionally simulates 40 two-player games.

This prepares the engine only. Play Friends still uses its existing browser-owned room protocol. Guest admission, callable lobby operations, private views, client integration and canonical casual reward verification remain to be implemented before that mode can claim server protection. No new database rules are required for this preparation.
