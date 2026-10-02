#!/usr/bin/env python3
"""Fits the owner's own sound clips (v287) to their animations.

Sources (owner-supplied, kept unchanged): docs/audio-src/
  boo-owner.mp3        crowd "booo" for the Pumpkin Joker  -> audio/boo-v287.mp3
  lion-roar-owner.mp3  lion roar for Lion's Roar victory   -> audio/lion-roar-v287.mp3

Timing (see index.html: jfxHalloween / vfxLion and where they call the clips):
  Boo: the Joker effect lasts 1.44s; the ghost bursts out at ~0.52s and the
       BOO word peaks at ~0.72s. The clip starts 0.18s into the source (the
       crowd's first rise), runs 1.0s and fades over its last 0.3s; the game
       plays it 0.5s after the Joker lands (BOO_DELAY in index.html), so the
       loudest part lands on the word and it is silent by the effect's end.
  Roar: the victory runs on a 2.0s clock (OWNER_VICTORY_MS); the burst is at
       ~0.21s, the head pulse ~0.46s, the shockwaves gone by ~1.0s. The roar
       is quickened x1.25 (pitch kept, atempo) so it builds with the head,
       peaks with the pulse, ends with the last shockwave, and its tail fades
       out at 2.0s.
Both are mono 44.1kHz MP3, peak-normalised to 0.9 (the game plays them at
0.5-0.6, like the other effect clips).

Needs numpy and an ffmpeg with libmp3lame (`pip install imageio-ffmpeg` works).
Change a timing here and in index.html together, and give the outputs a new
name (audio caches for a day).
"""
import os, shutil, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100

def ffmpeg():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()

def decode(src, filters):
    out = subprocess.run([ffmpeg(), '-v', 'error', '-i', src, '-af', filters, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(out, dtype=np.float32).copy()

def fade(a, fade_in, fade_out):
    n_in, n_out = int(fade_in * SR), int(fade_out * SR)
    if n_in: a[:n_in] *= np.linspace(0, 1, n_in)
    if n_out: a[-n_out:] *= np.linspace(1, 0, n_out) ** 1.5
    return a

def write(a, name):
    a = a / max(1e-9, np.abs(a).max()) * 0.9
    dst = os.path.join(ROOT, 'audio', name)
    subprocess.run([ffmpeg(), '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-c:a', 'libmp3lame', '-b:a', '96k', dst], input=a.astype(np.float32).tobytes(), check=True)
    print(f'{dst}: {len(a) / SR:.2f}s')

def main():
    src = os.path.join(ROOT, 'docs', 'audio-src')
    boo = decode(os.path.join(src, 'boo-owner.mp3'), 'atrim=start=0.18:duration=1.0,asetpts=PTS-STARTPTS')
    write(fade(boo, 0.02, 0.3), 'boo-v287.mp3')
    roar = decode(os.path.join(src, 'lion-roar-owner.mp3'), 'atempo=1.25,atrim=duration=2.0,asetpts=PTS-STARTPTS')
    write(fade(roar, 0.01, 0.45), 'lion-roar-v287.mp3')

if __name__ == '__main__':
    main()
