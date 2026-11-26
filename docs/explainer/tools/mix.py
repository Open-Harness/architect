"""The sound: the narration over a very quiet pad of slow chords, which dips while someone is speaking.

Reads out/narration.wav and out/timing.json, writes out/pad.wav. tools/render.mjs mixes the two and sets the loudness.
The pad is plain synthesis (sines, a little detune, slow swells), so nothing here is anyone's recording.
"""
import json, os
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUT = os.path.join(HERE, "out"); SR = 48000
timing = json.load(open(os.path.join(OUT, "timing.json"))); total = timing["total"]; n = int(total * SR)
t = np.arange(n) / SR; rng = np.random.default_rng(7)
hz = lambda midi: 440.0 * 2 ** ((midi - 69) / 12)
CHORDS = [[38, 45, 54, 61, 64], [35, 42, 50, 57, 64], [43, 50, 54, 57, 59], [45, 52, 57, 59, 64]]  # Dmaj9, Bm11, Gmaj7, Asus2
HOLD, FADE = 11.0, 4.0

left, right = np.zeros(n), np.zeros(n)
for k in range(int(total / HOLD) + 2):
    start = k * HOLD - FADE; a, b = max(0, int(start * SR)), min(n, int((start + HOLD + FADE) * SR))
    if a >= b: continue
    tt = t[a:b]; x = (tt - start) / (HOLD + FADE)
    env = np.clip(np.minimum(x * (HOLD + FADE) / FADE, (1 - x) * (HOLD + FADE) / FADE), 0, 1); env = 0.5 - 0.5 * np.cos(np.pi * env)
    for i, note in enumerate(CHORDS[k % len(CHORDS)]):
        f = hz(note); swell = 1 + 0.28 * np.sin(2 * np.pi * rng.uniform(0.05, 0.12) * tt + rng.uniform(0, 6.28)); weight = 1.0 if i == 0 else 0.62 / (1 + 0.25 * i)
        for detune, pan in ((-0.0013, 0.25), (0.0013, 0.75)):
            tone = sum(g * np.sin(2 * np.pi * f * (1 + detune) * h * tt + rng.uniform(0, 6.28)) for h, g in ((1, 1.0), (2, 0.22), (3, 0.06)))
            left[a:b] += tone * env * swell * weight * (1 - pan); right[a:b] += tone * env * swell * weight * pan

# Under speech the pad sits lower; in the pauses between scenes it comes up a little.
speaking = np.zeros(n)
for scene in timing["scenes"]:
    for line in scene["lines"]: speaking[int(max(0, line["start"] - 0.25) * SR): int((line["end"] + 0.35) * SR)] = 1
win = int(0.9 * SR); kernel = np.hanning(win); kernel /= kernel.sum(); duck = np.convolve(speaking, kernel, mode="same")
gain = (1.0 - 0.62 * duck) * np.clip(t / 1.5, 0, 1) * np.clip((total - t) / 3.0, 0, 1)
pad = np.stack([left, right], axis=1); pad *= 10 ** (-29 / 20) / np.sqrt(np.mean(pad ** 2)); pad *= gain[:, None]
sf.write(os.path.join(OUT, "pad.wav"), pad.astype("float32"), SR)
print(f"pad {total:.1f}s, peak {np.abs(pad).max():.3f}")
