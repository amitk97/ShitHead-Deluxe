# No Mercy demo video: script v3 (exactly 15 seconds, NOT built yet)

Working title: **"No Mercy. Nobody is safe."**
Length: **15.0 seconds, hard limit.** Format 9:16 (1080x1920), game audio on, voiceover in the how-to-play voice, every caption = the line spoken.
Status: script only. Claude builds it later when the owner says so (headless `tools/video/director.js`, scripted game state, no live recording). Paused frames go to the owner for a "go" first. End-card link: shithead-deluxe.web.app.

Rules shown (check against the game when building):
- **Queen:** X-ray. A random card from the NEXT player's hand is shown to you (one per Queen).
- **King:** the next player takes a card from the BOTTOM of the Pile (a King at the bottom cannot be taken).
- **Ace:** EVERY opponent, in turn order, takes exactly ONE card from the bottom of the Pile (an Ace at the bottom cannot be taken and stops it; an empty Pile does nothing; four Aces burn first).
- **Joker:** cannot be played on a 4.
- Unlocks at Level 25.

Voiceover budget: about 2.5 words a second, so 15s holds about 35 words. This script uses 28, leaving room for game sounds.

## Beat sheet

| Time | Scene | Voiceover (words) | Caption |
|---|---|---|---|
| 0.0-2.0 | Hook | "Normal rules? Not here." (4) | No Mercy |
| 2.0-5.0 | Queen | "Queen: see their card." (4) | Queen: X-ray |
| 5.0-8.0 | King | "King: they take from the bottom." (6) | King: take from the bottom |
| 8.0-11.0 | Ace | "Ace: everyone takes one." (4) | Ace: everyone takes one |
| 11.0-13.0 | Joker | "No Joker on a four." (5) | No Joker on a 4 |
| 13.0-15.0 | Close | "No Mercy. Level twenty-five." (4) | No Mercy, Lvl 25 |

## Shots

### 1. Hook (0.0 to 2.0)
- 0.0 Home screen, carousel turns; the red No Mercy card snaps to the middle with the carousel snap sound.
- 0.6 Card opens (the expand cover), cut straight to a three-player table, a dealt hand on screen.
- Voiceover starts at 0.2.

### 2. Queen X-ray (2.0 to 5.0)
- 2.2 Tap-play a Queen from the hand; it lands on the Pile.
- 2.6 The scan sweeps the next player's hand (`noMercyPeekFx`, scan sound); one card turns face up with a cyan ring.
- 3.6 The card stays as a `.nm-known` chip under their seat. Hold on it for a beat.

### 3. King (5.0 to 8.0)
- 5.2 Play a King on a Pile of about 8 cards.
- 5.7 The bottom card of the Pile slides out and flies into the next player's hand; banner names the card.
- 6.8 Hand count on that seat ticks up by one. Hold.

### 4. Ace (8.0 to 11.0)
- 8.2 Play an Ace.
- 8.6 A card leaves the bottom of the Pile for the first opponent, then 9.2 another for the second opponent (two seats, one card each).
- 10.0 Banner "Everyone takes"; both hand counts tick up. Hold.

### 5. Joker blocked (11.0 to 13.0)
- 11.2 A 4 sits on top of the Pile. Tap the Joker in hand and Play.
- 11.6 It is refused: the Joker shakes back and the banner says why. Hold.

### 6. Close (13.0 to 15.0)
- 13.0 Cut to the end card: red No Mercy badge, "Unlocks at Level 25", shithead-deluxe.web.app.
- 14.6 Hold the last frame to 15.0.

## Sound
Game sounds only (card plays, scan, pick-ups, refusal) plus the voiceover. No music bed. Voice lines are placed at each scene's real start (see `tiktok1.js` for the method), loudnorm -14 LUFS.

## If a scene needs more time
The cut is fixed at 15s. Extra time can only come from tightening a scene elsewhere (e.g. take the Joker scene down to 1.5s) or dropping the hook line. A longer version (30s) would be a separate cut and the owner would ask for it.
