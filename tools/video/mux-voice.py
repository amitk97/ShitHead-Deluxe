# Lays each narration line at the moment its scene started in the recording
# (narration/marks.json from howto-voice.js) and muxes it with the silent video.
import json, numpy as np, soundfile as sf, subprocess, os, sys
D = os.path.dirname(os.path.abspath(__file__)); N = os.path.join(D, 'narration')
FF = os.environ.get('FFMPEG_FULL', 'ffmpeg')  # needs libopus + libx264
m = json.load(open(os.path.join(N, 'marks.json')))
parts = [sf.read(os.path.join(N, f'scene-{i+1:02d}.wav'), dtype='float32') for i in range(len(m['scenes']))]
sr = parts[0][1]; total = int((m['scenes'][-1] - m['start'] + 30) * sr)
mix = np.zeros(total, dtype='float32')
for (a, _), t in zip(parts, m['scenes']):
    o = int((t - m['start']) * sr); mix[o:o + len(a)] += a
mix *= 0.89 / max(1e-6, np.abs(mix).max())
wav = os.path.join(N, 'voice.wav'); sf.write(wav, mix, sr)
src = os.path.join(D, 'shithead-how-to-play-silent.webm')
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '128k', '-shortest', os.path.join(D, 'shithead-how-to-play.webm')], check=True)
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', src, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-crf', '20', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', os.path.join(D, 'shithead-how-to-play.mp4')], check=True)
print('done')
