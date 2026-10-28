# TODO

Owner's backlog. Don't build an item until the owner asks for it.

## Tutorial & Guide (after the v315 header and the v317–v321 home screen)

- [x] (v337: Guide + Key Terms updated, lessons never mentioned the old header/home) Update the Tutorial, its step-by-step logic and the Guide's Key Terms so they match the new header and home screen:
  - the header: Exit on the far left, Shop / Custom / Guide / Settings on Home folding into the menu during a game, and the logo asking before it goes home;
  - the mode carousel (drag or flick, ‹ › held to repeat, « » to the ends, mouse wheel, ←/→ and keys 1-7; tap a side card to bring it to the middle, tap the middle card to open it; Shortcut pins);
  - the mode pages (Play Computer, Play Friends, Ranked, Gauntlet, More Modes) and their Back button.
- [x] (v337) Add a dedicated "Game Modes" section to the Guide, with its own subsection for each game mode (Play Computer, Gauntlet, Play Friends, Ranked, Best Of Series, and each coming mode as it launches).
- [x] (v337) Key Terms: Play Computer replaces Vs Bots; no lesson or challenge links to the carousel, so no extra terms.
- [x] (v337) Checked: lessons only point at `#hamburgerBtn` and `#cardRefBtn`, both still exist.
- [x] (v337) Renamed "Vs Bots" to "Play Computer" in all player-facing text (Match History labels already say Play Computer if they use PLAYING_LABELS; check old saved entries).

## First sign-in onboarding tour

- [x] (v337, `js/welcome-tour.js`) Show a short guided tour the first time a player signs in (once per account, skippable, Back closes it):
  1. Header: Exit, Diamonds and Shop, Custom, Profile, Inbox, Guide, Settings and the Menu.
  2. Game modes: turn the carousel through Play Computer, Gauntlet, Play Friends, Ranked and More Modes, one line each, and show that tapping the middle card opens it.
  3. End on the Tutorial button ("New here? 1-minute tutorial").
- [x] (v337: own overlay instead, the lesson spotlight is tied to `tutorialActive`) Reuse the tutorial spotlight (`positionTutorialUI` / `tutorialFollowSpotlight`) and the helper-tip bubble. Store "seen" in `users/{uid}/settings` so it also works across devices.

## Home carousel follow-ups

- [x] Shortcut slots 1 and 7: pin a coming mode there (v323, placeholder; saved on the device in `shithead_home_pins`). When a mode launches, a pinned card should open it, and the pins could sync to the account.
- [x] (v337) Long-press on carousel items to reorder them (cards should visually "bounce" when picked up).
- [ ] Move the Play Computer options' old Gauntlet row out of the code once nothing uses it (it's hidden since v320).
- [ ] The video box from the owner's wireframe beside the Tutorial button, once a how-to-play video is hosted with the game.

## Future game modes

They are listed on the More Modes page (v320); each becomes its own carousel card and page when it goes live.

- [x] (v388) **2 vs 2**: teams of two, partners sit opposite each other, and a team wins when both partners are out.
- [x] **Puzzles**: shipped (52 weekly puzzles, server-checked rewards). History: v341 prototype (5 weekly "out in one turn" puzzles, solver, AmitK sees all). Still to do: more puzzles/goal types (burn, make the Rival pick up), XP/Diamond rewards with server-side move checking, Guide section.
- [ ] **Randomiser Mode** (only one left): card powers are shuffled each match and shown up front.
- [x] (v443-v447) **Multiple Decks**: 2+ decks for bigger tables and longer games.
- [x] (v448-v455) **No Mercy**: harsher rules (built; King now stops at a King at the bottom of the Pile, bots break loops).
  - **Queen = X-ray** (as in Ocho): it shows the next player's hidden cards to the player who played it.
  - **Jokers can't be played on a 4.**
  - **King**: the next player must pick up the card at the **bottom** of the Pile.
    - If the bottom card is the King just played (the Pile was empty), the next player picks up that King. The King's player then goes again, playing on the draw pile's base card.

## Other ideas already noted

- Shop wishlist (a heart on each Shop item, plus a Wishlist filter).
- ~~1.5x XP during seasonal events~~ (v345). A Season Pass (maybe a second tab on the Level Ladder).
- Watch a friend's Vs Bots / Gauntlet game.
- See `CLAUDE.md` → "Owner's later list" for the full list.

## Season Pass (built v393: free track, Season 1 Ancient Egypt, from 1 Nov 2026)

- [x] Free 50-tier pass, auto-granted tiers, Egypt art (card back, avatar, table), Level Ladder tab, home chip (v393).
- [x] (v395–v399) Seasons 2–6 built (Ice Age, Feudal Japan, Deep Ocean, Ancient Greece, Dark Magic).
- [ ] Premium track and tier skips stay on hold until there is a business bank account.

- [ ] Detailed plan: `docs/plans/season-pass.md` (2-month seasons, 50 tiers, free + Premium tracks, first season 1 Nov 2026). Open decisions are in section 14 of the plan.
- [ ] Legal and payments prerequisites before Premium goes on sale: legal drafts (kept locally), Monzo Business account and sole trader registration, ICO registration, Google Play developer account and closed test, and the game fixes listed in the legal pack (deletion gaps, age tick and terms links at sign-up, separate sales record).
- [ ] Future game modes and No Mercy rules are listed above under the earlier TODO entries.

## Daily extras (built v469–v482)

- [x] Daily Spin (v469), Three Cards weekly (v474), Scratch Card daily (v478; tic tac toe lines with real cards v479; holographic foil v482).
- [ ] **Functions deploy needed** for the v479 line grid, the catalog names and the AmitK/Pooja scratch reset (run the "Deploy notification functions" workflow).

## Housekeeping due

- [ ] **README refresh is overdue** (due at v480, now v482): text, all seven screenshots, `README-VERSION` stamp.

## Ideas (v482, not decided; delete what you don't want)

- [ ] Daily trio bonus: finish the Spin, the Scratch Card and (weekly) Three Cards in one day / week for a small extra prize.
- [ ] Scratch Card streak: 7 days in a row gives a golden card with better odds.
- [ ] Scratch Card as a gift: send a friend a free card.
- [ ] A weekly mega scratch card with a bigger grid and a seasonal foil during events.
- [ ] Randomiser Mode (already listed above): shuffled card powers shown up front.
- [ ] Tournament mode (friends' bracket) once there are more players.
- [ ] Clubs / teams with a shared weekly goal.
- [ ] "You've been overtaken" leaderboard mail.
- [ ] Share card for big wins (Foil items, Ranked streaks) as a picture.
- [ ] Sound pass: more of the home screen (circles, carousel) with small synthesised sounds.
- [ ] Hand-picked Daily puzzle sets for events (e.g. Halloween puzzles).
- [ ] A "Collection" progress reward (own 25 / 50 / 100 items) with a title or frame.
