#!/usr/bin/env python3
"""Sound clips for the owner's v257 effects, written to audio/*.mp3:

  audio/lion-roar.mp3  Lion's Roar victory: a short breath in, then a deep,
                       rough roar that swells, peaks and rumbles away.
  audio/boo.mp3        Pumpkin Joker: a ghost's long, wavering "Boooo!"
                       (espeak-ng's voice, chorused, pitch-bent and echoed).
  audio/fireworks.mp3  Fireworks victory: five rockets whistle up and burst
                       with a boom and a crackle, on the animation's beats
                       (FIREWORK_BURSTS below = the bursts' times in index.html).

Synthesised with numpy (no samples from anywhere else). Deterministic (fixed
seed). Needs numpy, espeak-ng (apt install espeak-ng) and an ffmpeg with
libmp3lame (imageio-ffmpeg's is fine; set FFMPEG=/path if it isn't on PATH).
Usage: python3 tools/make-effect-sounds.py
"""
import os, subprocess, tempfile, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
RNG = np.random.default_rng(257)
# Seconds from the start of the Fireworks victory to each burst (vfxFireworks).
FIREWORK_BURSTS = [0.45, 0.75, 0.95, 1.2, 1.4]
# The victories play 4.2s of animation in OWNER_VICTORY_MS (index.html): 2.0s
# since v275 (2.5s in v264), so the clips are sped up by 4.2 / 2.0 = 2.1 with
# pitch kept (atempo goes up to 2 per stage, hence two stages).
VICTORY_SUFFIX = '-v275.mp3'
VICTORY_TEMPO = 'atempo=1.5,atempo=1.4'


def ffmpeg():
    if os.environ.get('FFMPEG'):
        return os.environ['FFMPEG']
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return 'ffmpeg'


def biquad(x, kind, f, q=0.7):
    """RBJ biquad (lowpass / highpass / bandpass), constant frequency."""
    w = 2 * np.pi * f / SR
    a = np.sin(w) / (2 * q)
    c = np.cos(w)
    if kind == 'lowpass':
        b0, b1, b2 = (1 - c) / 2, 1 - c, (1 - c) / 2
    elif kind == 'highpass':
        b0, b1, b2 = (1 + c) / 2, -(1 + c), (1 + c) / 2
    else:
        b0, b1, b2 = a, 0, -a
    a0, a1, a2 = 1 + a, -2 * c, 1 - a
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.zeros_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i, v in enumerate(x):
        o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        x2, x1, y2, y1 = x1, v, y1, o
        y[i] = o
    return y


def reverb(x, mix=0.3, size=1.0):
    """Small Schroeder reverb: four combs into two allpasses."""
    out = np.zeros(len(x) + int(SR * 1.2))
    src = np.concatenate([x, np.zeros(int(SR * 1.2))])
    for d, g in [(1557, .8), (1617, .79), (1491, .78), (1422, .77)]:
        d = int(d * size)
        y = src.copy()
        for i in range(d, len(y)):
            y[i] += g * y[i - d]
        out += y
    out /= 4
    for d, g in [(225, .5), (556, .5)]:
        y = np.zeros_like(out)
        for i in range(len(out)):
            xd = out[i - d] if i >= d else 0.0
            yd = y[i - d] if i >= d else 0.0
            y[i] = -g * out[i] + xd + g * yd
        out = y
    dry = np.concatenate([x, np.zeros(int(SR * 1.2))])
    return dry * (1 - mix) + out * mix


def env(n, points):
    """Piecewise-linear envelope from (seconds, level) points."""
    t = np.arange(n) / SR
    ts, ls = zip(*points)
    return np.interp(t, ts, ls)


def trim_tail(x, floor=0.002):
    idx = np.where(np.abs(x) > floor)[0]
    return x[: idx[-1] + int(SR * 0.05)] if len(idx) else x


def write_mp3(x, name, peak=0.89):
    if name in ('lion-roar.mp3', 'fireworks.mp3'):
        x = x[:int(SR * 4.2)].copy()
        x[-int(SR * .3):] *= np.linspace(1, 0, int(SR * .3))
    x = trim_tail(x)
    x = x / (np.abs(x).max() + 1e-9) * peak
    fade = int(SR * 0.03)
    x[-fade:] *= np.linspace(1, 0, fade)
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'x.wav')
        with wave.open(wav, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            w.writeframes((x * 32767).astype('<i2').tobytes())
        victory = name in ('lion-roar.mp3', 'fireworks.mp3')
        out = os.path.join(ROOT, 'audio', name.replace('.mp3', VICTORY_SUFFIX) if victory else name)
        subprocess.run([ffmpeg(), '-y', '-loglevel', 'error', '-i', wav, *(['-af', VICTORY_TEMPO] if victory else []), '-codec:a', 'libmp3lame', '-b:a', '96k', out], check=True)
    print(out, f'{len(x) / SR:.2f}s', f'{os.path.getsize(out) // 1024}KB')


def lion_roar():
    dur = 4.2
    n = int(SR * dur)
    t = np.arange(n) / SR
    # Pitch: rises into the roar, holds with a wobble, sags as it rumbles out.
    f0 = np.interp(t, [0, .35, .6, 1.0, 1.5, 2.1], [70, 70, 150, 135, 95, 60])
    f0 *= 1 + 0.035 * np.sin(2 * np.pi * 7 * t)
    jitter = 1 + 0.06 * np.convolve(RNG.standard_normal(n), np.ones(200) / 200, 'same') * 8
    phase = np.cumsum(f0 * jitter / SR)
    # Glottal-ish pulse train (rich in harmonics) plus a half-rate growl (the rasp).
    saw = 2 * (phase % 1) - 1
    pulse = np.sign(np.sin(2 * np.pi * phase)) * 0.4 + saw * 0.6
    growl = np.sin(np.pi * phase) * (0.6 + 0.4 * np.sin(2 * np.pi * 31 * t))
    voice = pulse * (0.8 + 0.5 * growl)
    noise = RNG.standard_normal(n)
    breath = biquad(noise, 'bandpass', 900, 0.6)
    src = voice * 0.7 + breath * 0.5
    # "Aaaar" formants, then a chesty low end.
    y = biquad(src, 'bandpass', 420, 1.8) * 1.0 + biquad(src, 'bandpass', 950, 2.2) * 0.8 + biquad(src, 'bandpass', 2300, 3) * 0.25
    y += biquad(voice, 'lowpass', 180, 0.9) * 0.9
    y = np.tanh(y * 2.2)  # saturation: the rough edge
    roar = y * env(n, [(0, 0), (.4, 0), (.55, 1), (1.1, .95), (1.7, .45), (2.3, 0), (4.2, 0)])
    # The breath in before it.
    inhale = biquad(noise, 'bandpass', 1400, 1.2) * env(n, [(0, 0), (.25, .18), (.34, .05), (.36, 0)])
    thump = np.sin(2 * np.pi * np.cumsum(np.interp(t, [.45, .7], [60, 38]) / SR)) * env(n, [(.43, 0), (.46, .8), (.9, 0), (4.2, 0)])
    tail = biquad(noise, 'bandpass', 3400, 1.1) * env(n, [(0, 0), (.8, 0), (1.1, .035), (3.4, .015), (4.15, 0)])
    return reverb(roar + inhale + thump * 0.6 + tail, mix=0.25, size=1.3)


def ghost_boo():
    with tempfile.TemporaryDirectory() as tmp:
        wav = os.path.join(tmp, 'boo.wav')
        subprocess.run(['espeak-ng', '-v', 'en+m3', '-p', '10', '-s', '70', '-a', '160', '-w', wav, 'Boooooo!'], check=True)
        with wave.open(wav) as w:
            sr0 = w.getframerate()
            v = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float64) / 32768
    v = np.interp(np.arange(0, len(v), sr0 / SR), np.arange(len(v)), v)  # to 44.1k
    idx = np.where(np.abs(v) > 0.02)[0]
    v = v[idx[0]: idx[-1]]
    n = len(v)

    def bend(rate):
        # Variable-speed read of the voice: a slow rise then a wavering fall.
        t = np.arange(n) / SR
        r = rate * np.interp(t, [0, n / SR * .3, n / SR], [1.0, 1.12, 0.86]) * (1 + 0.03 * np.sin(2 * np.pi * 5.2 * t))
        pos = np.cumsum(r)
        pos = pos[pos < n - 1]
        return np.interp(pos, np.arange(n), v)

    parts = [bend(1.0), bend(0.985) * 0.55, bend(1.02) * 0.5, bend(0.5) * 0.35]  # chorus + a low shadow an octave down
    m = max(len(p) for p in parts)
    y = sum(np.pad(p, (0, m - len(p))) for p in parts)
    t = np.arange(m) / SR
    y *= 1 + 0.25 * np.sin(2 * np.pi * 4.5 * t)  # tremolo
    air = biquad(RNG.standard_normal(m), 'bandpass', 2200, 0.8) * 0.06 * np.convolve(np.abs(y), np.ones(2000) / 2000, 'same')
    y = biquad(y + air, 'highpass', 90)
    return reverb(y, mix=0.4, size=1.5)


def fireworks():
    dur = 4.2
    n = int(SR * dur)
    out = np.zeros(n)
    t_all = np.arange(n) / SR
    for i, at in enumerate(FIREWORK_BURSTS):
        big = i == 0
        # Launch whistle: a rising, slightly wavering tone with hiss.
        start, rise = max(0.0, at - 0.42), min(0.42, at)
        s, e = int(start * SR), int(at * SR)
        tt = np.arange(e - s) / SR
        f = np.interp(tt, [0, rise], [900 + i * 90, 2300 + i * 140]) * (1 + 0.01 * np.sin(2 * np.pi * 30 * tt))
        whistle = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.interp(tt, [0, rise * .3, rise], [0, .12, .2])
        whistle += biquad(RNG.standard_normal(e - s), 'highpass', 3000) * np.interp(tt, [0, rise], [.02, .06])
        out[s:e] += whistle
        # Boom: a noise blast through a falling lowpass + a sub thump.
        L = int(SR * (1.1 if big else 0.8))
        b = np.zeros(L)
        nz = RNG.standard_normal(L)
        tb = np.arange(L) / SR
        b += biquad(nz, 'lowpass', 900 if big else 1300, 0.8) * np.exp(-tb * (5 if big else 7)) * (1.1 if big else .7)
        b += np.sin(2 * np.pi * np.cumsum(np.interp(tb, [0, .25], [85, 40])) / SR) * np.exp(-tb * 6) * (1.0 if big else .55)
        b[: int(SR * .004)] *= np.linspace(0, 1, int(SR * .004))
        s = int(at * SR)
        out[s: s + L] += b[: n - s]
        # Crackle: a shower of tiny pops as the stars burn out.
        for _ in range(60 if big else 34):
            c = at + 0.15 + RNG.random() ** 0.8 * 2.6
            cs = int(c * SR)
            cl = int(SR * 0.012)
            if cs + cl >= n:
                continue
            pop = RNG.standard_normal(cl) * np.exp(-np.arange(cl) / (SR * 0.0025)) * RNG.uniform(.08, .28)
            out[cs: cs + cl] += pop
    out = biquad(out, 'highpass', 35)
    return reverb(out, mix=0.22, size=1.1)


def main():
    write_mp3(lion_roar(), 'lion-roar.mp3')
    write_mp3(ghost_boo(), 'boo.mp3')
    write_mp3(fireworks(), 'fireworks.mp3', peak=0.8)


if __name__ == '__main__':
    main()
