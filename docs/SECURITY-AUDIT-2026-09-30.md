# Browser Inspect security audit — 30 September 2026

Scope: v260 client, server functions and repository database rules; first hardening changes in v261. Tests used isolated in-memory records and real server handlers. No live player records were modified. This is a source audit, not confirmation that the Firebase Console currently has the repository rules deployed.

## Answers

**Can Inspect reveal face-down cards? Yes.** `syncFirebaseGameState` uploads whole `players` and `drawPile` objects; browsers subscribe to the whole room. They receive ranks, suits and predictable card IDs for hands, face-down cards and the ordered remaining deck. Solo bot games also hold these values locally. The card-back presentation does not remove these values from browser memory or network responses.

**Can Inspect change values or cause game-breaking behaviour? Yes.** Local JavaScript and the displayed interface can always be changed. The important question is whether the server accepts those changes. The current online room permissions allow shared game-state changes; hiding controls or setting `state.spectating` only stops the normal interface. Ranked auditing protects some scoring outcomes after a write, rather than preventing all writes before other players see them.

## Findings

| Priority | Finding | Evidence and impact | Status |
|---|---|---|---|
| Critical | Hidden-card disclosure | `index.html`: `syncFirebaseGameState`, `listenToFirebaseRoom`, `applySpectatedRoom`; full room reads include every hand, blind card and draw-pile order. Spectator masking happens after receiving the data. | Open; requires private server-held state and per-player views. |
| Critical | Online room modification by outsiders | `database.rules.json`: `rooms/$roomCode` permits casual reads/writes without authentication; any signed-in account can read/write Ranked rooms, without room membership checks. Whole-room writes can alter cards, turns, placings or delete a room. | Open; membership checks and server move processing required. Guest play needs server-issued authenticated guest identities first. |
| High | Self-reported gameplay can earn real progress | `functions/economy.js`: `matchWin` accepts bot wins without a game record; `matchFinished` accepts reported finishes; Gauntlet accepts `won` after a minimum time. Counters, XP, unlocks and eligible rewards can be obtained without honest play. | Open; timers and daily caps limit speed, not authenticity. |
| High | Challenges do not always verify completion | `challengeForKey` checks daily/weekly selection and expiry and seasonal availability, but does not verify the required activity for those claims. An empty test account claimed a selected daily challenge. | Open; compute eligibility from server-owned event counters. Tutorial completion also needs a defined server-verification policy. |
| High | Online result replay under arbitrary IDs | `matchWin` checked the winning seat but did not bind the request ID to the room's actual match ID. A single winning room could count repeatedly under invented IDs after the time cap. | Fixed in v261: exact match-ID equality; duplicate actual ID remains idempotent. |
| High | Ranked scoring identity not bound to original deal | `rankedResult` previously accepted terminal placings and member markers without requiring the matching server deal. `auditTransition` treats changed match IDs as new matches and can return no findings for a fabricated non-SWAP terminal state. | Partially addressed in v261: scoring requires FINISHED phase and a server deal matching both match ID and participant set. Other room tampering remains possible. |
| Medium | Ranked can fall back to an unauditable local deal | Client started a locally shuffled Ranked game when server dealing failed, despite scoring requiring integrity checks. | Fixed in v261: failure stays in the lobby with a retry message. |
| High | Ranked checks are asynchronous and incomplete | `auditRankedRoom` is a post-write trigger; `rankedResult` waits a fixed 1.5 seconds and treats absent counts as zero. Some findings (including out-of-turn play and draws) are soft. Room mode remains browser-writable. The deal check alone is not proof of a valid finished game. | Open; results must come from server-validated moves and a server-owned final record. |

## Existing protections

- Named wallet, ownership, rating, XP and protected counter fields have no client write grant in the repository rules. The writable `$field` fallback does not grant writes to named protected fields.
- The economy callable derives UID from verified request authentication, rather than a UID in the request body.
- Shop prices and rewards come from the server catalog. Changing the displayed price or wallet does not change the real purchase charge.
- The AmitK purchase exception checks the verified account email on the server; changing a nickname does not enable it.
- Ranked audit checks include canonical card ranks, duplicate cards, conservation, seat changes and illegal plays; hard findings reject rating awards when recorded before scoring.
- Purchase/result transactions and processed-ID markers protect against concurrent duplicate claims. They do not prove a reported match happened.

## Validation

- `node tools/security-boundary-test.js`: actual economy handlers reject fabricated online match IDs, repeat IDs, missing/mismatched Ranked deals, changed participants and unfinished Ranked rooms. Valid online wins during ongoing multiplayer games and valid Ranked results still work; duplicate results return the original award.
- `node tools/ranked-audit-test.js`: 31 passed, zero failed.
- `node tools/boards-period-test.js`: passed.
- Isolated diagnostic calls reproduced unearned daily challenge, bot win and Gauntlet result acceptance. No production calls were made.
- Client failure-path check confirmed failed server dealing does not start Ranked locally.
- Changed JavaScript passed syntax checks and `git diff --check`.
- The full browser and Firebase emulator suites were not run in this audit environment; no database rules were changed.

## Next implementation

1. Make Ranked server authoritative first: authenticated room admission; server-only canonical card locations, shuffle and draw pile; callable move intents validated against server rules; server-owned placings and payout record.
2. Publish separate public room and private player views. Public views expose card counts and revealed cards only. Private views expose only the requesting player's hand; face-down values stay server-only until played. Use opaque card handles so IDs cannot reveal rank.
3. Move bot/Gauntlet reward-bearing games onto a verifiable server path, or explicitly keep unverified solo progress out of competitive/reward-bearing totals. Client-supplied logs alone are not trustworthy proof.
4. Drive daily, weekly and seasonal challenge progress from validated server events. Remove unsupported client-only claims after a compatibility rollout.
5. Migrate casual/guest rooms onto authenticated participant permissions and server moves; give spectators only public views. Test outsiders, forged turns, reconnects, replay, duplicates and hidden-card network payloads in the Firebase emulator before deploying rules.

This audit does not establish that anyone has cheated. It establishes what the current code permits. v261 closes specific scoring gaps; it does not make hidden cards private or make all gameplay tamper-proof.
