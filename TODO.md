# TODO

Owner's backlog. Don't build an item until the owner asks for it.

## Tutorial & Guide (after the v315 header and the v317–v321 home screen)

- [ ] Update the Tutorial, its step-by-step logic and the Guide's Key Terms so they match the new header and home screen:
  - the header: Exit on the far left, Shop / Custom / Guide / Settings on Home folding into the menu during a game, and the logo asking before it goes home;
  - the mode carousel (swipe, arrows, mouse wheel, keys 1-7; tap a side card to bring it to the middle, tap the middle card to open it);
  - the mode pages (Play Computer, Play Friends, Ranked, Gauntlet, More Modes) and their Back button.
- [ ] Add Key Terms for the carousel and mode pages if lessons or challenges link to them.
- [ ] Check every lesson step that points at a header or menu button (spotlight selectors, `tapCheck`, caption text).
- [ ] Rename "Vs Bots" to "Play Computer" everywhere: home, Guide, lessons, Match History and helper tips.

## First sign-in onboarding tour

- [ ] Show a short guided tour the first time a player signs in (once per account, skippable, Back closes it):
  1. Header: Exit, Diamonds and Shop, Custom, Profile, Inbox, Guide, Settings and the Menu.
  2. Game modes: turn the carousel through Play Computer, Gauntlet, Play Friends, Ranked and More Modes, one line each, and show that tapping the middle card opens it.
  3. End on the Tutorial button ("New here? 1-minute tutorial").
- [ ] Reuse the tutorial spotlight (`positionTutorialUI` / `tutorialFollowSpotlight`) and the helper-tip bubble. Store "seen" in `users/{uid}/settings` so it also works across devices.

## Home carousel follow-ups

- [ ] Shortcut slots 1 and 7: let a player pin an extra mode there (say what they pin and where it's saved; today they only explain themselves).
- [ ] Move the Play Computer options' old Gauntlet row out of the code once nothing uses it (it's hidden since v320).
- [ ] The video box from the owner's wireframe beside the Tutorial button, once a how-to-play video is hosted with the game.

## Future game modes

They are listed on the More Modes page (v320); each becomes its own carousel card and page when it goes live.

- [ ] **2 vs 2**: teams of two, partners sit opposite each other, and a team wins when both partners are out.
- [ ] **Puzzles**: set positions to solve, like Chess.com puzzles ("win in 2 turns"). The owner wants a weekly puzzle, not a daily one.
- [ ] **Randomiser Mode**: card powers are shuffled each match and shown up front.
- [ ] **Multiple Decks**: 2+ decks for bigger tables and longer games.
- [ ] **No Mercy**: harsher rules.
  - **Queen = X-ray** (as in Ocho): it shows the next player's hidden cards to the player who played it.
  - **Jokers can't be played on a 4.**
  - **King**: the next player must pick up the card at the **bottom** of the Pile.
    - If the bottom card is the King just played (the Pile was empty), the next player picks up that King. The King's player then goes again, playing on the draw pile's base card.

## Other ideas already noted

- Shop wishlist (a heart on each Shop item, plus a Wishlist filter).
- 1.5x XP during seasonal events. A Season Pass (maybe a second tab on the Level Ladder).
- Watch a friend's Vs Bots / Gauntlet game.
- See `CLAUDE.md` → "Owner's later list" for the full list.
