"""Speak films/<film>/script.json (python tools/narrate.py <film>): one clip per line, the words' times, and the whole narration laid on one track.

Writes out/<film>/timing.json (every scene, line and word, in seconds) and out/<film>/narration.wav. A clip is kept in .cache/ under
the hash of what was said, so a line is spoken again only when its words change.
"""
import hashlib, json, os, sys

FILM = sys.argv[1] if len(sys.argv) > 1 else "how-it-works"
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS = os.environ.get("EXPLAINER_MODELS", os.path.join(HERE, ".cache", "models"))
CACHE, OUT, SR = os.path.join(HERE, ".cache", "clips"), os.path.join(HERE, "out", FILM), 24000
os.makedirs(CACHE, exist_ok=True); os.makedirs(OUT, exist_ok=True)
script = json.load(open(os.path.join(HERE, "films", FILM, "script.json")))

_kokoro = _whisper = None
def speak(text):
    global _kokoro
    if _kokoro is None:
        from kokoro_onnx import Kokoro
        _kokoro = Kokoro(os.path.join(MODELS, "kokoro-v1.0.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    samples, sr = _kokoro.create(text, voice=script["voice"], speed=script["speed"], lang="en-us")
    assert sr == SR
    return np.asarray(samples, dtype="float32")

def trim(a, floor=0.004, pad=0.03):
    loud = np.flatnonzero(np.abs(a) > floor)
    if len(loud) == 0: return a
    a = a[max(0, loud[0] - int(pad * SR)): loud[-1] + int(pad * SR)].copy()
    fade = int(0.008 * SR); ramp = np.linspace(0, 1, fade, dtype="float32")
    a[:fade] *= ramp; a[-fade:] *= ramp[::-1]
    return a

def words(a):
    """Each spoken word and when it starts and ends, heard back by a speech recogniser."""
    global _whisper
    if _whisper is None:
        from faster_whisper import WhisperModel
        _whisper = WhisperModel("small.en", device="cpu", compute_type="int8")
    n = int(len(a) * 16000 / SR)
    a16 = np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype("float32")
    segments, _ = _whisper.transcribe(a16, beam_size=5, word_timestamps=True)
    return [{"w": w.word.strip(), "t0": round(w.start, 3), "t1": round(w.end, 3)} for s in segments for w in s.words]

def clip(line):
    said = line.get("say", line["text"])
    key = hashlib.sha1(json.dumps([said, script["voice"], script["speed"]]).encode()).hexdigest()[:16]
    wav, meta = os.path.join(CACHE, key + ".wav"), os.path.join(CACHE, key + ".json")
    if not (os.path.exists(wav) and os.path.exists(meta)):
        a = trim(speak(said)); sf.write(wav, a, SR)
        json.dump(words(a), open(meta, "w"))
        print("spoke", line["id"], round(len(a) / SR, 2), "s", file=sys.stderr)
    a, _ = sf.read(wav, dtype="float32")
    return a, json.load(open(meta))

t, track, scenes = 0.0, [], []
for scene in script["scenes"]:
    start = t; t += scene.get("lead", 0.7); lines = []
    for i, line in enumerate(scene["lines"]):
        a, ws = clip(line); dur = len(a) / SR
        lines.append({"id": line["id"], "text": line["text"], "start": round(t, 3), "end": round(t + dur, 3),
                      "words": [{"w": w["w"], "t0": round(t + w["t0"], 3), "t1": round(t + w["t1"], 3)} for w in ws]})
        track.append((t, a)); t += dur
        if i < len(scene["lines"]) - 1: t += line.get("gap", script["gap"])
    t += scene.get("tail", 0.6)
    scenes.append({"id": scene["id"], "title": scene["title"], "start": round(start, 3), "end": round(t, 3), "lines": lines})

total = round(t, 3)
mix = np.zeros(int(total * SR) + SR, dtype="float32")
for at, a in track: mix[int(at * SR): int(at * SR) + len(a)] += a
sf.write(os.path.join(OUT, "narration.wav"), mix[: int(total * SR)], SR)
json.dump({"total": total, "scenes": scenes}, open(os.path.join(OUT, "timing.json"), "w"), indent=1)
print(f"{len(track)} lines, {total:.1f}s ({int(total // 60)}:{int(total % 60):02d})")
for s in scenes: print(f"  {s['start']:7.2f}  {s['id']:10s} {s['end'] - s['start']:6.2f}s")
