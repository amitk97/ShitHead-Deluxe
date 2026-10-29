# Lucky Games demo video: script (draft, not recorded yet)

Working title: **"Four ways to get lucky in ShitHead Deluxe"**
Length: about 60 to 70 seconds. Format: 9:16 vertical (1080x1920), game audio on, voiceover in the how-to-play voice (see `tools/video/`).
Tone: friendly, quick, no shouting. Captions = the line being spoken.
All four games are free, signed-in only, and the server picks every prize (the phone only plays the animation).

Facts used here (keep in step with `WHEEL`, `SCRATCH`, `MONTY`, `DROPZONE` in `cosmetics-data.js` before recording):
- Daily Spin: one free spin per UK day. Prizes: Diamonds (25 up to 1,000), XP, the Lucky Wheel avatar, the Lucky Spin card back.
- Scratch Card: one free card per UK day. Nine real cards, one winning line. Prizes 10 / 50 / 100 / 250 Diamonds, the Prism Ace avatar, the Prism Joker card back.
- Three Cards: once a week. Find the big card after 9 swaps: 300 Diamonds, the other two pay 50 and 25.
- Drop Zone: you start with 1 card, every game you win in any mode earns another (bank holds 10). Slots: Avatar, 50, 25, 10, 20, 50, Card Back.
- A prize item you already own pays 1,250 Diamonds instead.

---

## Scene 1: Hook (0:00 to 0:06)

**Screen:** Home screen. The four round Lucky Games icons glow in the corners (wheel and Three Cards on the right, Scratch Card and Drop Zone on the left, gold dots showing).
**Voiceover:** "Four free games hiding on your home screen. Every one can win you Diamonds, and rare avatars and card backs."
**Caption:** Four free Lucky Games
**Notes:** Slow push-in on the icons. Hold the Drop Zone badge showing a card count.

## Scene 2: Daily Spin (0:06 to 0:20)

**Screen:** Tap the wheel icon. The Daily Spin opens. Tap SPIN. Wheel turns, pegs tick, the red pointer settles. Win pop-up: "+100 Diamonds" with confetti. Quick cut to the prize preview rows (Lucky Wheel avatar, Lucky Spin back).
**Voiceover:** "The Daily Spin. One free spin every day. Land on Diamonds or XP, or get lucky and win the Lucky Wheel avatar or the Lucky Spin card back."
**Caption:** Daily Spin: one free spin a day
**Notes:** Use the sound of the wheel ticks. Tap a prize row once to show the big preview (2 seconds).

## Scene 3: Scratch Card (0:20 to 0:34)

**Screen:** Tap the scratch icon. A 3x3 grid of real cards under silver foil. Drag a finger across the foil; it peels with a shine. Cards turn up. A row of three Aces lights up gold. Pop-up: "Prism Ace avatar".
**Voiceover:** "The Scratch Card. One a day. Scratch the foil, and if you line up three in a row, you win. Three Aces gets you the Prism Ace avatar."
**Caption:** Scratch Card: match three in a line
**Notes:** Record a card that wins on purpose (use the AmitK test account and Reset Lucky Games). Show the winning line glow.

## Scene 4: Three Cards (0:34 to 0:46)

**Screen:** Tap the Three Cards icon. The big card is shown, flips face down, the three cards shuffle with sliding sounds. Tap one. It flips: "300 Diamonds".
**Voiceover:** "Three Cards. Once a week. Watch the big card, follow it through the shuffle, and pick. Find it and it pays three hundred."
**Caption:** Three Cards: follow the big card
**Notes:** Keep the shuffle at normal speed so viewers can try to follow it. Land the pick on the big card.

## Scene 5: Drop Zone (0:46 to 0:62)

**Screen:** Tap the Drop Zone icon. The gold board with pegs. Tap DROP. The card (in your own card back) bounces down and lands in the 50 slot. Then show the card count at 3, tap DROP ALL: cards drop one after another, and one total pops up at the end.
**Voiceover:** "Drop Zone. Win any game, in any mode, and earn a card. Drop it down the pegs and see where it lands. Got a few saved up? Drop all of them and see your total at the end."
**Caption:** Drop Zone: win games, earn cards
**Notes:** Show the match summary row "Drop Zone, card earned" for 2 seconds before the drop (Scene 5 can start from the end of a bot game). Show the Avatar and Card Back slots at the edges.

## Scene 6: Close (0:62 to 0:70)

**Screen:** Back to home. The four icons again, then the end card.
**Voiceover:** "Four games, all free. Come back every day. Play ShitHead Deluxe."
**End card text:** "Four Lucky Games. All free." plus the game link (shithead-deluxe.web.app) and "Sign in to play".

---

## Recording checklist

- Use the AmitK test account so Lucky Games can be reset (menu or Dev page: Reset Lucky Games) and Diamonds are plentiful.
- Record the real game at 390x844 with `tools/video/director.js` (`openGame` with `size: [1080, 1920]`, `audio: true`); no fake screens.
- The Halloween/seasonal wheel colours change with the date. Pick a calm date or set `seasonalNowOverride` so the wheel looks the same in every take.
- Hide event pop-ups and the helper tips before recording.
- Show paused frames of any new effect to the owner before publishing (house rule).
- Voiceover lines go in `tools/video/` alongside the other `*-voice.py` files when the video is built; finished video goes in `docs/videos/` with its captions in the README there.

## Short cut-downs (optional, 15 seconds each)

1. Drop Zone only: win a game, get a card, drop it, land on the avatar slot ("Your next win could drop an avatar").
2. Scratch Card only: peel the foil and reveal three Aces.
3. Daily Spin only: spin, land on 1,000 Diamonds.
