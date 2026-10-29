# Lucky Games demo video: script v3 (built by Claude later, nobody records anything)

Working title: **"Free prizes. Every day."**
Length: about 40 seconds. Format: 9:16 vertical (1080x1920), game audio on, voiceover in the how-to-play voice.
Style: fast cuts (3 to 9 seconds a scene), one prize moment per game, every caption = the line spoken, calm tone.

## How it will be built (no live recording, no real account)

- Claude drives the real game page headlessly with the existing video tools (`tools/video/director.js`: `openGame` with `size: [1080, 1920]`, `audio: true`, `warp: true`, then `finish(...)`), the same way the how-to-play and TikTok videos were made. New script: `tools/video/lucky.js`, voiceover lines in `tools/video/lucky-voice.py` (Kokoro, bm_george 0.6 + am_puck 0.4), muxed with `FFMPEG_FULL` (H.264 + AAC, loudnorm -14 LUFS).
- Every game is shown for real (the game's own wheel, foil, cards, board and sounds), but the page is given a fake signed-in user and a scripted economy (`currentUser`, `firebaseAvailable`, `callEconomy` stubbed in the page, as the dev tests do), so each prize below is chosen by the script, not luck. Nothing touches a real account or the server.
- Look: calm default table (not an event table, so the wheel colours are the standard ones), default effects off except the win pop-ups, event pop-ups and helper tips hidden.
- Each scene starts from a short "setup" the script does off-camera (open the panel, pre-fill the card count), then films the action. Waits for the wheel to stop are cut by re-timing on the effect clock (`g.setRate`), as in the TikTok clip.
- Before it is published, paused frames of every scene are shown to the owner for a "go" (house rule), and the sounds are the game's own (no extra music unless the owner asks).

Facts used (check against `WHEEL`, `SCRATCH`, `MONTY`, `DROPZONE` in `cosmetics-data.js` when building):
- Daily Spin: 1 free spin per UK day. Diamonds, XP, Lucky Wheel avatar, Lucky Spin card back.
- Scratch Card: 1 free card per UK day. Three in a line wins. Prism Ace avatar, Prism Joker card back.
- Three Cards: once a week. Follow the big card: 300 Diamonds.
- Drop Zone: every win, in any mode, earns a card. Drop it for Diamonds, an avatar or a card back.

---

## 1. Hook (0:00 to 0:04)

**Action:** Start on the Scratch Card win pop-up "New avatar: Prism Ace" with confetti (scripted result: three Aces). Freeze half a second, then pull back (a quick zoom-out cut) to the home screen with the four glowing Lucky Games icons.
**Voiceover:** "I just won this. For free."
**Caption:** Won for free

## 2. Daily Spin (0:04 to 0:12)

**Action:** Home. Click `#homeWheelChip`. Click SPIN. Scripted result: "+250 Diamonds". Cut the slow part of the spin; keep the peg ticks, the slow-down and the landing. Win pop-up.
**Voiceover:** "One free spin, every day."
**Caption:** Daily Spin

## 3. Scratch Card (0:12 to 0:20)

**Action:** Click `#homeScratchChip`. Scripted card: a gold line of three Aces. Script drags a pointer across `#scratchFoil` in two quick strokes; the foil peels with its shine; the winning line glows.
**Voiceover:** "One free scratch card. Line up three to win."
**Caption:** Scratch Card

## 4. Three Cards (0:20 to 0:27)

**Action:** Click `#homeMontyChip`. The big card shows, flips face down, the three cards shuffle (normal speed, so it can be followed). The script taps the big card's final position. It flips: "300 Diamonds".
**Voiceover:** "Follow the big card. Find it, win three hundred."
**Caption:** Three Cards, every week

## 5. Drop Zone (0:27 to 0:36)

**Action:** Start from a finished bot game's summary with the "Drop Zone: card earned" row (scripted). Click its button. The gold board opens, the card (the default card back) bounces down the pegs and lands in the Card Back slot. Pop-up: new card back "Gold Vault".
**Voiceover:** "Win any game, earn a card. Drop it, and see where it lands."
**Caption:** Drop Zone: win a game, drop a card

## 6. Close (0:36 to 0:40)

**Action:** Home, the four icons pulse once. End card: "Four Lucky Games. All free." plus shithead-deluxe.web.app and "Sign in to play".
**Voiceover:** "Four free games. Come back every day."
**Caption:** Come back every day

---

## Owner's decisions (NOT to be built yet, owner will say when)

1. Voiceover: yes (how-to-play voice). Game sounds stay; no music bed was asked for.
2. End-card link: yes, shithead-deluxe.web.app.
3. Scope: the main video covers all 4 Lucky Games (as above), PLUS four separate 10-second single-game videos for separate posts: Daily Spin, Scratch Card, Three Cards, Drop Zone. Each: hook line, the prize moment, end card with the link. Scripts for the 10s cuts still to be written when the owner asks.
