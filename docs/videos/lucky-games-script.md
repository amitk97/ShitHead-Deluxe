# Lucky Games demo video: script v2 (draft, not recorded yet)

Working title: **"Free prizes. Every day."**
Length: about 40 seconds. Format: 9:16 vertical (1080x1920), game audio on, voiceover in the how-to-play voice (`tools/video/`).
Style: fast cuts (3 to 7 seconds a scene), one prize moment per game, every caption = the line spoken, calm tone.

Facts (check against `WHEEL`, `SCRATCH`, `MONTY`, `DROPZONE` in `cosmetics-data.js` before recording):
- Daily Spin: 1 free spin per UK day. Diamonds, XP, Lucky Wheel avatar, Lucky Spin card back.
- Scratch Card: 1 free card per UK day. Three in a line wins. Prism Ace avatar, Prism Joker card back.
- Three Cards: once a week. Follow the big card: 300 Diamonds.
- Drop Zone: every win, in any mode, earns a card. Drop it for Diamonds, an avatar or a card back.

---

## 1. Hook (0:00 to 0:04)

**Screen:** Straight into a win pop-up: "New avatar: Prism Ace" with confetti. Quick freeze, then pull back to the home screen with the four glowing Lucky Games icons.
**Voiceover:** "I just won this. For free."
**Caption:** Won for free

## 2. Daily Spin (0:04 to 0:12)

**Screen:** Tap the wheel. SPIN. Pegs tick, pointer slows, lands: "+250 Diamonds".
**Voiceover:** "One free spin, every day."
**Caption:** Daily Spin

## 3. Scratch Card (0:12 to 0:20)

**Screen:** Scratch card tap. Finger drags across the foil, the grid of real cards appears, a line of three Aces glows gold.
**Voiceover:** "One free scratch card. Line up three to win."
**Caption:** Scratch Card

## 4. Three Cards (0:20 to 0:27)

**Screen:** Big card shown, flips, shuffles. Tap one. It flips: "300 Diamonds".
**Voiceover:** "Follow the big card. Find it, win three hundred."
**Caption:** Three Cards, every week

## 5. Drop Zone (0:27 to 0:36)

**Screen:** End of a bot game: summary row "Drop Zone card earned". Tap it. The card bounces down the gold pegs and lands in the Card Back slot. Pop-up with the new card back.
**Voiceover:** "Win any game, earn a card. Drop it, and see where it lands."
**Caption:** Drop Zone: win a game, drop a card

## 6. Close (0:36 to 0:40)

**Screen:** Home, the four icons pulse once. End card: "Four Lucky Games. All free." + shithead-deluxe.web.app.
**Voiceover:** "Four free games. Come back every day."
**Caption:** Come back every day

---

## Recording notes

- Use the AmitK test account (menu or Dev page: Reset Lucky Games) so each game can be replayed until the prize shot is a good one. Use Grant Diamonds only if the balance needs to look healthy.
- Record at 390x844 with `tools/video/director.js` (`openGame` `size: [1080, 1920]`, `audio: true`). Real game screens only.
- Keep one take per game under 7 seconds; trim the wait for the wheel to stop by recording the spin at normal speed and cutting the wait before the pop-up.
- Pick a calm table and date so the wheel colours match in every take (set `seasonalNowOverride` if an event is live). Hide event pop-ups and helper tips.
- Show the owner paused frames before publishing (house rule).
- Voiceover lines go with the other `tools/video/*-voice.py` files; the finished video goes in `docs/videos/` with captions in its README.

## Optional 15-second cut-downs

1. Drop Zone: win a game, drop the card, land on the avatar slot.
2. Scratch Card: peel the foil, reveal three Aces.
3. Daily Spin: spin, land on 1,000 Diamonds.
