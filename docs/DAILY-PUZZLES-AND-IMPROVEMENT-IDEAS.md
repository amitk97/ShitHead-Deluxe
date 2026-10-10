# Daily Puzzles: 50 Ideas and Improvement Roadmap

Saved: 10 October 2026.
Status: design reference, not an implementation or a verified puzzle pack.

## Scope and rules

Daily puzzles are short tactical challenges with fixed cards, a clear objective and one or two accepted move sequences. The concepts below need exact hands, pile order and opponent responses constructed and checked with the current game engine before release. Do not claim unique solutions until that verification passes.

- Show all relevant cards and rules.
- Avoid random draws and unpredictable bot decisions.
- Use current Standard ShitHead Deluxe rules and the usual card information panel.
- State a specific objective, such as finish this turn, force a pickup, or win within three turns.
- Treat interchangeable identical cards as equivalent when counting solutions.
- Accept either solution if two exist.
- Reveal opponents' hands for puzzles that depend on their responses. Responses must be fixed or follow a clearly stated rule.
- Puzzle actions must not count towards normal match challenges, Ranked statistics or Gauntlet progress.
- Known face-down cards are a puzzle-only information aid, not a change to regular matches.

## 1–10: Finish in one uninterrupted turn

| # | Puzzle | Objective and main idea |
|---|---|---|
| 1 | Clean Sweep | Empty your hand this turn by saving a 10 until the correct point. |
| 2 | Four to Freedom | Complete four consecutive cards of one rank, burn, then play your final card. |
| 3 | Skip Ahead | Use an 8 in a two-player game to retain control and finish. |
| 4 | See Through It | Place a 3 without losing track of the card underneath, then finish. |
| 5 | Double Burn | Empty your hand through two burns in the correct order. |
| 6 | The Low Road | Use a 7 to make your remaining low cards playable before your finisher. |
| 7 | Reset Route | Use a 2 at the right moment to begin the only finishing sequence. |
| 8 | Back to Base | Use a 5 to return the effective requirement to a helpful bottom card. |
| 9 | Joker Finish | Force a pickup with a Joker, regain the turn and empty your hand. |
| 10 | Five-Card Flow | Play five cards in one uninterrupted turn using a precise combination of powers. |

## 11–20: Read the pile correctly

| # | Puzzle | Objective and main idea |
|---|---|---|
| 11 | Hidden Queen | Navigate a 3 sitting above a Queen and finish without an illegal play. |
| 12 | Transparent Chain | Read through several 3s to find the effective card, then force a pickup. |
| 13 | The Bottom Matters | Choose the winning response to a 5 by inspecting the pile's bottom card. |
| 14 | Back to Base Twice | Use two 5s at different stages of a fixed sequence to reach the target position. |
| 15 | Even Escape | Escape a 6 restriction while preserving the card needed to win later. |
| 16 | Odd Escape | Escape a Jack restriction without wasting your only winning follow-up. |
| 17 | Seven's Ceiling | Choose the correct low card under a 7 to force the opponent's pickup. |
| 18 | The Awkward Four | Create a legal route for a stranded 4 and then finish. |
| 19 | Reset Isn't Enough | Solve a position where playing a 2 onto a Jack is illegal. |
| 20 | Transparent Trap | Solve a position where a 3 cannot be played onto a 6. |

## 21–30: Control who plays next

Use two, three or four players with clearly displayed seating and direction.

| # | Puzzle | Objective and main idea |
|---|---|---|
| 21 | One Seat Away | Use one 8 to pass control to the opponent who cannot respond. |
| 22 | Double Skip | Use two 8s together to reach the required player in a four-player game. |
| 23 | Skip or Save? | Decide whether to play one 8 or several to secure a win within the limit. |
| 24 | Reverse the Threat | Use a 9 to prevent an opponent with one card from receiving the next turn. |
| 25 | Reverse Parity | Choose an odd or even number of 9s to produce the required direction. |
| 26 | Round Trip | Combine reverse and skip to bring the turn back to you. |
| 27 | Wrong Neighbour | Force a specific opponent to pick up through turn order and card choice. |
| 28 | Last-Card Burn | Finish with a burn, accounting for the turn passing onward after you go out. |
| 29 | Last-Card Skip | Finish with an 8 and achieve the required next-player outcome. |
| 30 | Three-Player Timing | Win within two of your turns by controlling which opponent acts between them. |

## 31–40: Joker tactics and forced pickups

Opponent cards must be visible so the outcome is deterministic.

| # | Puzzle | Objective and main idea |
|---|---|---|
| 31 | Choose Your Target | Select the only Joker target that allows you to finish safely. |
| 32 | Duel Ready | Win a fixed Joker exchange while retaining the correct final card. |
| 33 | Don't Start the Duel | Find the winning move when playing your Joker immediately loses the position. |
| 34 | Draw Out the Joker | Force an opponent to spend their Joker before your finishing attack. |
| 35 | Pickup, Then Finish | Make the Joker target pick up, then use your immediate next turn to finish. |
| 36 | Even Lock | Leave a 6 against an opponent whose revealed hand has no legal response. |
| 37 | Odd Lock | Leave a Jack against an opponent whose revealed hand cannot answer. |
| 38 | Low Lock | Use a 7 to strand an opponent holding only unsuitable high cards. |
| 39 | Base Lock | Use a 5 whose bottom-card requirement forces the opponent to pick up. |
| 40 | Transparent Lock | Use a 3 to preserve a restrictive underlying power and force a pickup. |

## 41–50: Endgame and planning

| # | Puzzle | Objective and main idea |
|---|---|---|
| 41 | Hand to Table | Empty your hand with the deck exhausted, then finish using your face-up cards. |
| 42 | Matching Across Phases | Use the game's supported same-rank hand/face-up play to finish within the move limit. |
| 43 | Save the Table Burn | Reach your face-up 10 at the correct moment to keep control. |
| 44 | Face-Up Order | Play three face-up cards in the only order that wins against fixed responses. |
| 45 | Known Blind Finish | Win using revealed-for-puzzle face-down cards in the correct slot order. |
| 46 | Take It to Win It | Deliberately pick up a small pile, then use its cards to win within a fixed number of turns. |
| 47 | Build the Four | Set up a four-of-a-kind burn across a scripted opponent response. |
| 48 | Don't Burn Yet | Preserve the pile because burning immediately removes the route to victory. |
| 49 | Swap to Victory | Choose the correct initial hand/face-up swap, then complete a fixed short endgame. |
| 50 | The Perfect Escape | Solve a longer endgame combining a reset, transparent card, turn control and a burn. |

Start with finishing sequences, pile reading and forced pickups. Add multiplayer turn-order and deliberate-pickup puzzles after validating the format.

## Solution verification

Use the same rules engine as the main game.

1. Enumerate every legal move, including multiple-card plays, Joker targets and pickups.
2. Explore resulting positions until the objective or move limit is reached.
3. Count distinct successful sequences, ignoring interchangeable identical cards.
4. Reject puzzles with zero solutions or more than two.
5. Check unintended routes, including early pickups.

Avoid puzzles with many equivalent solutions caused by harmless move reordering. A tight move limit must serve the puzzle rather than feel arbitrary. Define exactly what a move and a turn mean in each objective.

## Controls and completion states

| Control | Behaviour |
|---|---|
| Undo | Restore the position before the previous player decision, including automatic opponent responses. Unlimited use; no penalty. |
| Restart | Return to the original puzzle position. |
| Hint | First highlight the relevant rule; a second hint suggests the opening move. |
| Give Up | Confirm, then demonstrate a valid solution step by step with explanations. |
| Replay | Allow practice after solving or viewing the answer. |

Suggested failure copy: "That route won't meet the objective. Undo and try another move."

Track Solved, Solved with hints and Solution viewed separately. A Solved without hints badge can recognise unaided completion.

## Proposed XP and Diamond rewards

These values are recommendations, not approved implementation requirements.

| Outcome | XP | Diamonds |
|---|---:|---:|
| Solve the daily puzzle, with or without Undo | 25 | 5 |
| Solve using hints | 25 | 5 |
| Give Up / view the solution | 0 | 0 |
| Replay a completed puzzle | 0 | 0 |
| Practise an older puzzle | 0 | 0 |

Award once per daily puzzle. Validate the submitted solution on the server and bind the award to the player and puzzle ID. Prevent a viewed-solution replay from earning that puzzle's reward. Start without streak rewards; assess completion rates before considering a modest weekly bonus.

## Other improvement ideas

These are planning recommendations, not confirmed current defects.

### Multiplayer reliability

First run a structured two-device check across Ranked, Standard, House Rules and Best of Series.

- Show Connecting / Connected / Reconnecting clearly.
- Recover the correct hand, turn and pile after refresh or app switching.
- Make repeated taps submit a move only once.
- Display which players are Ready between series matches.
- Handle host departure with a clear continuation or room-closing outcome.
- Explain bot takeover and show when the player returns.
- Give failures a useful retry action.
- Record a compact diagnostic match ID for support reports.

Acceptance criterion: both devices agree on whose turn it is and what happened.

### Better match summaries

- Biggest pile picked up.
- Total cards picked up.
- Burns and Snap Burns.
- Longest uninterrupted turn.
- Joker duels won.
- Successful and failed face-down plays.
- Short match timeline showing major turning points.
- Personal best indicators.

Keep the next-game button prominent. Show the rules preset for House Rules results.

### Performance and modularisation

Measure first, then choose extractions based on what is slow or difficult to maintain.

- Load large cosmetic artwork and sounds when needed.
- Pause previews and effects when panels close.
- Remove finished animation elements and event listeners reliably.
- Limit particles on slower devices.
- Add an optional reduced-effects setting.
- Separate puzzle logic, match summaries and cosmetic previews into modules.
- Check first load, repeat load and mid-match responsiveness on an ordinary phone.

Smaller files help maintenance; reduced downloads and animation work help players.

### Reward and progress verification

Recheck docs/SECURITY-AUDIT-2026-09-30.md against the current implementation before deciding what remains open.

- Derive challenge progress from validated gameplay events.
- Bind rewards to a specific match or puzzle ID.
- Make repeated claims return the original result without another payout.
- Verify House Rules cannot award restricted progression.
- Restrict casual room actions to admitted participants.
- Ensure spectators receive only information they should see.
- Keep a private reward history to diagnose missing XP or Diamonds.

Prioritise this before paid Diamonds go live.

### Accessibility polish

- Reduced motion for burns, card flights and carousel transitions.
- Optional larger buttons and text.
- Strong keyboard focus and accessible menus.
- Turn indicators using text and shape as well as colour.
- Readable backdrops behind labels on busy table artwork.
- Separate music, effects and turn-alert volumes.
- Clear screen-reader labels for cards and actions.
- Investigate browser zoom support without breaking layout.

## Suggested delivery order

1. Multiplayer reliability checks.
2. Five validated puzzle prototypes, with a working solver and Undo.
3. Performance improvements.
4. Expand the catalogue from these 50 concepts.

This document does not authorise implementing the proposed features or reward values.
