# ShitHead Deluxe videos

Portrait 780×1688 WebM (VP8, 30fps, no sound), recorded from the real game by
the scripts in `tools/video/`. Social apps prefer MP4: open a file in CapCut
(free), add music, export as MP4.

| File | Length | What it is | Script |
| --- | --- | --- | --- |
| `shithead-hook-blind-flip.webm` | 15s | Hook: last card, face down, everything on one flip | `hook.js` |
| `shithead-gauntlet.webm` | 24s | "5 bots, 3 lives, can you beat them all?" | `gauntlet.js` |
| `shithead-uni.webm` | 25s | "Remember this one?" The rules everyone knows, played fast | `uni.js` |
| `shithead-promo.webm` | 32s | Promo: plays, burn, blind flip, Joker, last card, win | `promo.js` |
| `shithead-how-to-play.webm` | 73s | How to play, step by step | `howto.js` |

Suggested captions:

- **Hook:** "Last card. Face down. Everything on one flip 😱 #shithead #cardgame #palace"
- **Gauntlet:** "5 bots. 3 lives. Nobody's beaten the Boss first try 😈 #cardgames #shithead"
- **Uni:** "The card game every uni kitchen knew 🍻 Now on your phone. #shithead #uni #cardgame #palace #karma"

The game goes by Shithead, Palace, Karma and Shed, so use all of those in
hashtags and descriptions. Every clip ends on shithead-pro.web.app.

Re-record (needs Playwright + Chromium and `SH_VIDEO_DEPS` with
`firebase@10.12.0` + `canvas-confetti@1.6.0`):
`SH_VIDEO_DEPS=/path node tools/video/hook.js`, then move the output here.
