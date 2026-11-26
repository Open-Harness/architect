# The explainer film

"How Orthograph works", a narrated film of about five and a half minutes for developers: what goes in, what comes out, and
how you know it works. It follows one operation of Plugged In, `handle.claim`, through the loop.

The film is code. Nothing here is a recording: the pictures are a web page drawn frame by frame, the voice is synthesised
from `script.json`, and every scene is timed by the words the voice actually spoke.

## The one rule

**The film invents nothing about Orthograph.** Every line of code on screen is read from `examples/plugged-in` when the
film is built, and every line of terminal output is replayed from `captures/`, which `tools/capture.sh` records by running
`ortho` for real. Change the example, rebuild, and the film changes with it. A quoted file that is gone fails the build, and a quoted line
that is gone fails the first frame.

There is one exception, and it says so on screen: the six snippets on sheet 1 stand for an ordinary hand-written stack. They
are labelled "written by hand" and are nothing Orthograph makes.

## What is where

| Path | What it is |
|---|---|
| `script.json` | the narration: scenes, lines, pauses, the voice |
| `captures/` | recorded output of `ortho check`, `prove`, `generate`, `impact` and `brief` on Plugged In |
| `src/engine.js` | the timeline every scene writes to, the cue lookup, the code and terminal painters |
| `src/scenes/` | one file per sheet, in order |
| `src/film.css`, `src/shell.html`, `src/player.js` | the look, the frame around the stage, and the player |
| `tools/capture.sh` | records `captures/`; undoes every edit it makes to the example |
| `tools/narrate.py` | speaks the script, then hears it back for each word's time: `out/timing.json`, `out/narration.wav` |
| `tools/mix.py` | the quiet pad under the voice: `out/pad.wav` |
| `tools/build.mjs` | puts the page together: `out/film.html` to look at, `out/page.html` for an artifact, `out/captions.srt` |
| `tools/shot.mjs` | draws single frames to look at: `node tools/shot.mjs 12.5 90` |
| `tools/render.mjs` | draws every frame and encodes `out/how-orthograph-works.mp4`, with sound and captions |

`out/` and `.cache/` are built, never committed.

## Building it

It needs Node 24 with the workspace installed (for `capture.sh`), `ffmpeg`, Playwright with Chromium, and a Python
environment with `kokoro-onnx`, `soundfile`, `numpy` and `faster-whisper`. The voice model's two files,
`kokoro-v1.0.onnx` and `voices-v1.0.bin`, go in `.cache/models/` or wherever `EXPLAINER_MODELS` points.

```sh
tools/capture.sh              # only when ortho's output or the example changed
python tools/narrate.py       # only when script.json changed
python tools/mix.py
node tools/build.mjs
node tools/render.mjs         # about ten minutes on four cores
```

`narrate.py` keeps each spoken line in `.cache/clips/` under the hash of its words, so a change to one line speaks one line.

## How a scene is timed

A scene never names a second. It asks for a word: `s.cue("b5", "comes in")` is the moment the voice says "comes in" in line
`b5`, taken from the recogniser's word times in `out/timing.json`. Rewrite a line, run `narrate.py`, and every picture
moves to its new word. A cue whose word the recogniser didn't hear is placed by its share of the line, and the build
lists it.

The whole film is one paused timeline. `Film.seek(seconds)` draws any frame on its own, which is what lets the renderer
split the film across workers and what lets the player scrub.

## Changing it

- **The words.** Edit `script.json`, then `narrate.py`, `mix.py`, `build.mjs`. Check the cues the build lists.
- **A scene.** Edit its file in `src/scenes/`, run `build.mjs`, and look at a few frames with `shot.mjs` before rendering.
- **What a scene quotes.** Add the file to `quoted` in `tools/build.mjs`; the scene reads it from `D.src`.

## What the recording found

`ortho prove --changed`, after a change to `claim`'s budget and description, proved all seven journeys: it could not place
the regenerated files (`captures/change-prove-changed.txt` has its words). So the film shows a plain `ortho prove` there,
and the narration says "prove again", not "prove what changed".
