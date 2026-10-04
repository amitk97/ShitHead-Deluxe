# Voiceover for tiktok1.js, in the how-to-play voice (narrate.py: George 0.6 + Puck 0.4,
# per-phrase pace and pitch, its 0.88 pace). Lines are placed at the times in tiktok1.js.
# KOKORO_DIR=<model files> FFMPEG_FULL=<ffmpeg with rubberband> python3 tools/video/tiktok1-voice.py
import numpy as np, soundfile as sf, subprocess, json, os
from kokoro_onnx import Kokoro
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "narration"); os.makedirs(D, exist_ok=True)
KD = os.environ.get("KOKORO_DIR", "."); FF = os.environ.get("FFMPEG_FULL", "ffmpeg")
k = Kokoro(os.path.join(KD, "kokoro-v1.0.onnx"), os.path.join(KD, "voices-v1.0.bin"))
V = k.get_voice_style("bm_george")*.6 + k.get_voice_style("am_puck")*.4
PACE = 1.0  # owner: "a bit quicker" than the tutorial's 0.88
# Each line: phrases of (text, gap after, speed, pitch semitones).
LINES = {
  "burn":   [("Twenty-two cards on the Pile?", .08, 1.34, 1.2), ("Watch this!", .02, 1.3, 1.8)],
  "burnt":  [("Burnt!", .02, 1.2, 2.0)],
  "later":  [("A few moments later...", .02, 1.3, -.3)],
  "joker1": [("Then my mate drops a Joker...", .02, 1.36, .6)],
  "joker2": [("and I get the lot!", .02, 1.3, 1.5)],
  "prove":  [("Think you can beat the dev?", .12, 1.3, 1.0), ("Prove it!", .02, 1.25, 1.8)],
}
out = {}
for name, phrases in LINES.items():
    parts = []
    for t, gap, sp, st in phrases:
        a, sr = k.create(t, voice=V, speed=sp * PACE, lang="en-gb")
        sf.write(os.path.join(D, "p.wav"), a, sr)
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", os.path.join(D, "p.wav"), "-af", f"rubberband=pitch={2**(st/12):.4f}", os.path.join(D, "q.wav")], check=True)
        b, _ = sf.read(os.path.join(D, "q.wav"), dtype="float32"); parts += [b, np.zeros(int(sr * gap), dtype="float32")]
    x = np.concatenate(parts); sf.write(os.path.join(D, f"tt1-{name}.wav"), x, sr); out[name] = round(len(x) / sr, 2)
json.dump(out, open(os.path.join(D, "tt1-timing.json"), "w")); print(out)
