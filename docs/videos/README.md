# ShitHead Deluxe videos

Portrait 780×1688 WebM (VP8, 30fps; only the how-to-play has sound), recorded from the real game by
the scripts in `tools/video/`. Social apps prefer MP4: open a file in CapCut
(free), add music, export as MP4.

| File | Length | What it is | Script |
| --- | --- | --- | --- |
| `shithead-hook-blind-flip.webm` | 15s | Hook: last card, face down, everything on one flip | `hook.js` |
| `shithead-gauntlet.webm` | 24s | "5 bots, 3 lives, can you beat them all?" | `gauntlet.js` |
| `shithead-uni.webm` | 25s | "Remember this one?" The rules everyone knows, played fast | `uni.js` |
| `shithead-promo.webm` | 32s | Promo: plays, burn, blind flip, Joker, last card, win | `promo.js` |
| `shithead-tiktok1-jokered.mp4` | 15s | TikTok 1 (1080×1920, game sound + voiceover): your 10 burns a 22-card Pile with Ghost Flames, then Jake's Pumpkin Joker hands you 17 cards | `tiktok1-voice.py` → `tiktok1.js` |
| `shithead-how-to-play.webm` / `.mp4` | 112s | How to play with a voiceover (British male, excited), every move cued to the narration | `narrate.py` → `howto-voice.js` → `mux-voice.py` |

Suggested captions:

- **TikTok 1 (Burnt… then Jokered):** "Karma comes fast in Shithead 🎃🔥" #cardgame #palacecardgame #satisfying
- **Hook:** "Last card. Face down. Everything on one flip 😱 #shithead #cardgame #palace"
- **Gauntlet:** "5 bots. 3 lives. A new run every day. Can you beat the Boss? 😈 #cardgames #shithead"
- **Uni:** "The card game every uni kitchen knew 🍻 Now on your phone. #shithead #uni #cardgame #palace #karma"

The game goes by Shithead, Palace, Karma and Shed, so use all of those in
hashtags and descriptions. Every clip ends on shithead-deluxe.web.app.

Re-record (needs Playwright + Chromium and `SH_VIDEO_DEPS` with
`firebase@10.12.0` + `canvas-confetti@1.6.0`):
`SH_VIDEO_DEPS=/path node tools/video/hook.js`, then move the output here.

How-to-play voiceover: `KOKORO_DIR=<kokoro-v1.0.onnx + voices-v1.0.bin> FFMPEG_FULL=<ffmpeg with rubberband, libopus, libx264> python3 tools/video/narrate.py`,
then `node tools/video/howto-voice.js`, then `python3 tools/video/mux-voice.py` (writes the WebM and the MP4). The script text lives in `narrate.py`;
each scene of `howto-voice.js` starts on its line and cues moves to the phrase times in `narration/timing.json`.
