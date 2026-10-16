# Voiceover for tiktok2.js (Gauntlet) and tiktok3.js (Halloween), in the how-to-play voice
# (narrate.py: George 0.6 + Puck 0.4, per-phrase pace and pitch; same recipe as tiktok1-voice.py).
# KOKORO_DIR=<model files> FFMPEG_FULL=<ffmpeg with rubberband> python3 tools/video/tt23-voice.py
# Writes narration/tt2-*.wav, tt3-*.wav and tt23-timing.json (line lengths in seconds).
import numpy as np, soundfile as sf, subprocess, json, os
from kokoro_onnx import Kokoro
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "narration"); os.makedirs(D, exist_ok=True)
KD = os.environ.get("KOKORO_DIR", "."); FF = os.environ.get("FFMPEG_FULL", "ffmpeg")
k = Kokoro(os.path.join(KD, "kokoro-v1.0.onnx"), os.path.join(KD, "voices-v1.0.bin"))
V = k.get_voice_style("bm_george")*.6 + k.get_voice_style("am_puck")*.4
# Each line: phrases of (text, gap after, speed, pitch semitones).
LINES = {
  # Video 2: the Gauntlet (Easy)
  "tt2-hook":  [("Five bots.", .1, 1.32, 1.2), ("Three lives.", .1, 1.32, .8), ("One shot a day.", .02, 1.28, 1.6)],
  "tt2-easy":  [("Round one? Easy.", .02, 1.3, 1.2)],
  "tt2-life":  [("Lose a game...", .1, 1.26, .2), ("and you lose a life.", .02, 1.3, 1.0)],
  "tt2-boss":  [("Then comes the Boss.", .02, 1.3, .6)],
  "tt2-burnt": [("Burnt!", .02, 1.2, 2.0)],
  "tt2-clear": [("Gauntlet cleared!", .02, 1.3, 1.8)],
  "tt2-end":   [("Can you do it?", .12, 1.3, 1.0), ("Play free!", .02, 1.25, 1.8)],
  # Video 3: Halloween
  "tt3-hook":  [("Halloween just took over my card game!", .02, 1.32, 1.4)],
  "tt3-shop":  [("A new table, card backs, burns, Jokers and avatars.", .02, 1.34, .6)],
  "tt3-burn":  [("Ghost Flames burn the Pile...", .02, 1.3, .4)],
  "tt3-joker": [("and the Pumpkin Joker gets the last laugh!", .02, 1.32, 1.4)],
  "tt3-earn":  [("Extra Diamonds every day,", .06, 1.32, .5), ("one and a half times XP,", .06, 1.32, .2), ("and Diamond prizes on the leaderboard!", .02, 1.3, 1.2)],
  "tt3-end":   [("Ends the second of November.", .12, 1.3, .3), ("Play free!", .02, 1.25, 1.8)],
}
out = {}
for name, phrases in LINES.items():
    parts = []
    for t, gap, sp, st in phrases:
        a, sr = k.create(t, voice=V, speed=sp, lang="en-gb")
        sf.write(os.path.join(D, "p.wav"), a, sr)
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", os.path.join(D, "p.wav"), "-af", f"rubberband=pitch={2**(st/12):.4f}", os.path.join(D, "q.wav")], check=True)
        b, _ = sf.read(os.path.join(D, "q.wav"), dtype="float32"); parts += [b, np.zeros(int(sr * gap), dtype="float32")]
    x = np.concatenate(parts); sf.write(os.path.join(D, f"{name}.wav"), x, sr); out[name] = round(len(x) / sr, 2)
json.dump(out, open(os.path.join(D, "tt23-timing.json"), "w")); print(out)
