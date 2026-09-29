# Plan: Best of series (with Diamond stakes) + XP & levels

Status: **agreed in principle, not built.** The owner wants both built together, later.
This file is self-contained so any developer (or AI assistant) can pick it up.
Read `CLAUDE.md` first for how the game is put together (single `index.html`,
Firebase Realtime Database, one server callable `economy` in `functions/economy.js`,
rules in `database.rules.json` pasted into the Console by hand).

---

## 1. XP and levels (build this first: the series depends on it)

**Why:** a steady sense of progress for everyone (casual, Vs Bots, Ranked), separate
from Ranked rating, and a natural gate for features like staked series.

- One number per account: `users/{uid}/xp` (server-only field; add it to the rules'
  server-only list with no `.write`, or the `$field` catch-all makes it writable).
- **XP is only ever added by the server** (economy actions that already run after a
  game: `matchFinished`, `matchWin`, `rankedResult`, `claim`, `gauntlet`). Never trust a
  number sent by the phone.
- **Built (v222–v224, owner's numbers).** XP per event: finish a game 25, first game of
  the UK day +50, win +75 (Vs Bots / Play Friends), Ranked game +25, Ranked win +150
  (instead of +75), Gauntlet bot beaten 40 / 80 / 120 / 200 (easy / medium / hard /
  boss), daily challenge 50, weekly 350. **No daily cap** (owner: it discourages
  playing; the match limits already stop farming).
- Levels 1–99 from the table `XP_RULES.levels` (RuneScape-style: ~120–300 XP a level
  early, doubling about every 7 levels at the top; level 5 = 477 XP ≈ 5+ games,
  level 10 = 1,086, level 92 = 349,976 = half of level 99 = 700,000). XP keeps
  counting past 99 up to 100,000,000.
- Level-up Diamonds: 20 a level, 100 on every 10th level instead (not both).
- Back-dating: the first time an account gets XP (or signs in) with the switch on,
  its past games, wins, Ranked games/wins, Gauntlet bots and daily/weekly
  challenges become XP once, levels passed pay their Diamonds, one mail.
- Show: level badge next to the name (player card, Profile, leaderboards), a thin XP bar
  on the Profile and in the match summary (`matchSummaryHtml`: "+45 XP").
- Level-up rewards (server-paid, once each): a few Diamonds per level; milestone
  levels (10, 25, 50) give earn-only pictures/frames (same pattern as
  `EARNED_AVATARS` / `EARNED_FRAMES`).
- Leaderboards: a "Levels" tab can reuse `functions/boards.js` (`boards/levels`).
- Keep it clearly different from Ranked rating (rating can go down; XP never does).
- Don't gate core gameplay behind levels (bot difficulties already unlock by wins).

## 2. Best of series between two friends

**Where:** Play Friends only (casual rooms). Ranked stays single games.

**Who can play:**
- Both players **signed in** with a **verified email** (Diamonds are involved).
- **Both at level 10 or higher** (owner's decision, `XP_RULES.seriesLevel`; ~19
  typical games; it doubles as anti-abuse because a brand-new throwaway account
  can't join).
- Optional: allow an *unstaked* "friendly" series for any signed-in player, and only
  require level 10 for staked series. (Owner to decide.)

**Setting it up:**
- When the host creates a room with exactly 2 human seats, a "Series" choice appears:
  Single game / Best of 3 / Best of 5.
- Friends → Invite can also send "Challenge to a Best of 3/5".
- The invite shows the entry fee. Both players must accept, and both must have enough
  Diamonds, before it starts.

**Stakes (owner's idea):**
| Series | Entry each | Pot | Server match | Winner receives |
|---|---|---|---|---|
| Best of 3 | 30 💎 | 60 | +60 | 120 (net +90) |
| Best of 5 | 50 💎 | 100 | +100 | 200 (net +150) |

- The server takes both entries when the series starts and holds them in escrow
  (server-only `series/{seriesId}`: players, format, fee, score, status, createdAt).
  Phones never move Diamonds.
- **Farming risk:** the server's matching money is new Diamonds. Two friends (or one
  person with two accounts) alternating wins still gain +60 or +100 per series between
  them. Mitigations (pick at least two):
  1. The server match is paid at most once per pair per UK day (like
     `RANKED_PAIR_PER_DAY`); later series that day are pot-only.
  2. Or the match is 50% of the pot instead of 100%.
  3. The level-5 + verified-email + account-age (≥ 3 days, `users/{uid}/createdAt`)
     gates.
  4. A cap on staked series per player per day (e.g. 5).
- **Real money:** Diamonds can't be bought or cashed out today, so this is just game
  currency. If Diamonds are ever sold, staking them on results starts to look like
  gambling (app stores, UK Gambling Act). Then stakes should use earned Diamonds only,
  or series become free.

**How a series runs:**
- Same room, same two players; after each game the next one starts from the lobby with
  a "Game 2 of 3" banner and a score pill (1–0) above the table.
- The loser of the previous game goes first.
- It ends as soon as someone can't be caught (2 wins in Bo3, 3 in Bo5).
- A drawn game (stalemate, see "Stalemate draw" in `CLAUDE.md`) is replayed and doesn't
  count.
- No bots in a series.

**Integrity (Diamonds on the line):** casual rooms are player-written, so a series should
use the Ranked safety machinery:
- server deal (`rankedDeal`) and the move audit (`functions/ranked-audit.js`);
- per-seat membership markers (like `rankedMembers`);
- the server reads the room itself to decide each game's winner (like `rankedResult`),
  never a result sent by a phone.

**Quits and disconnects:**
- App closed / signal lost mid-game: the usual grace period and bot stand-in for that
  game only (see "Online sync pitfalls" / rejoin in `CLAUDE.md`).
- Pressing Leave mid-series = **forfeit the whole series**: the opponent gets the full
  payout.
- Not back in the lobby for the next game within **2 minutes** = forfeit.
- Both leave, or the server can't confirm results → series **abandoned**, both entries
  **refunded**.

**Rewards:**
- The payout above, plus a "Series won" line in Match History and Stats (series
  won / played).
- Later: challenges ("Win 5 series"), an earn-only "Champion" frame, a Series tab on the
  leaderboards.
- No rating change (so friends can't trade rating).

**UI placement:**
- Play Friends lobby (host): Series selector under the room settings, with the entry fee
  shown.
- Invite pop-up: "Amit challenges you to a Best of 3 · entry 30 💎 · winner takes 120 💎".
- Table: score pill + "Game n of m"; match summary shows the series score; the final
  summary shows the payout.
- Locked state (below level 10 or signed out): the selector shows a lock and
  "Reach level 10 to play series".

---

## 3. Implementation checklist (this codebase)

1. XP: done (v222–v224, `functions/xp.js`, screens, owner switch in the menu).
2. Series server actions: `seriesCreate` (checks both players: signed in, verified,
   level ≥ 10, funds; takes entries → escrow), `seriesGame` (reads the room, records a
   game win for the right seat, idempotent per matchId), `seriesForfeit`,
   `seriesAbandon` (refunds), payout on the deciding game. All via `userTx` (mind the
   transaction pitfall in `CLAUDE.md`).
3. Rules: `series/*` server-only (read by its two players), room fields `series`
   (format, score, id) written only as part of normal room saves.
4. Client: lobby selector, invite type, table score pill, summary lines, forfeit timers,
   rejoin keeps the series.
5. Tests: dev tests for the UI/state; emulator tests for escrow, payout, forfeit, refund,
   daily pair cap, level gate; an e2e run of a full Bo3 with a mid-series disconnect
   (`tools/online-e2e.js` style).
6. What's New entry (key), README features, `docs/OWNER-HANDBOOK.md` (how to refund a
   stuck series by hand).
