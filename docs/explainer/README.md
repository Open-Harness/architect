# The explainer films

Six narrated films about Orthograph, for developers. All are code: the pictures are a web page drawn frame by frame,
the voice is synthesised from a script, and every scene is timed by the words the voice actually spoke.

| Film | Folder | What it is |
|---|---|---|
| **How Orthograph works** (5:25) | `films/how-it-works/` | What runs today, shown on Plugged In. One operation, `handle.claim`, through the loop. |
| **Capxul Lite: Describe It** | `films/capxul-describe/` | Part one of the design, on a stripped-back Capxul: the problem, the system, where each thing lives, who is who, rules, events, one sealed spend followed through, and a proposal that waits for its owners. |
| **Capxul Lite: What Falls Out** | `films/capxul-runs/` | Part two: the contract, the server and its two actors, the ways in, the app, a journey run on screen, a rule change as a published version, and the environments it runs in. |

The manual's films, one for each chapter of `docs/manual/chapters/`, share `films/manual/` (their data loader and scene kit):

| Film | Folder | Chapter |
|---|---|---|
| **Say what done means** | `films/say-done/` | 4: stubs made while planning, a journey read as a story, and a first run that is red on purpose |
| **Build until green** | `films/build-green/` | 5: one brief, one handler, three rungs from red to green |
| **Run it, break it, read the trace** | `films/read-trace/` | 7: a refusal followed from the terminal to the rule that gave it |

## The rule each film keeps

**The first film invents nothing.** Every line of code on screen is read from `examples/plugged-in` when the film is
built, and every line of terminal output is replayed from `films/how-it-works/captures/`, which `tools/capture.sh` records
by running `ortho` for real. A quoted file that is gone fails the build, and a quoted line that is gone fails the first
frame. One exception says so on screen: the six "written by hand" snippets on sheet 1.

**The two Capxul Lite films are a design, and say so.** Their example lives in `films/capxul-lite/app/`, written as if all of
Orthograph existed. Nothing in it is compiled or run. Most of its syntax is real or decided (`examples/budgets`, K20, K23,
K25, M6-chain, M6-money). A line that ends `// new` is a proposal of the design, and is drawn with an amber edge wherever
it appears. Output that was designed, not recorded, is labelled so on screen, and the second film ends by sorting everything
into what runs today, what is decided, and what is proposed. They replace one earlier film of eight minutes, recut after its
first viewing; `films/capxul-lite/board/board.html` has the notes and the decisions that led here.

**The manual's films invent nothing either.** Code is read from `examples/plugged-in` and terminal output is replayed from
`docs/manual/captures/`, which `docs/manual/capture.sh` records. The second film's climb is a replay, and says so: one
handler put at three points, and the real run recorded at each.

## What is where

| Path | What it is |
|---|---|
| `films/<film>/script.json` | the narration: the film's title and steps, then scenes, lines and pauses |
| `films/<film>/scenes/` | one file per sheet, in order |
| `films/<film>/data.mjs` | what the film quotes: it reads files, and hands them to the scenes |
| `films/how-it-works/captures/` | recorded output of `ortho` on Plugged In |
| `films/capxul-lite/app/` | the Capxul Lite design both films quote: blueprint, a Solidity handler, a journey, and sketches of what falls out |
| `films/manual/data.mjs`, `films/manual/kit.js` | what the manual's three films quote, and the scene helpers they share |
| `films/capxul-lite/kit.js` | scene helpers both films share; a script names it under `uses` |
| `films/capxul-lite/supplement/` | the docs page for both films; it quotes the same files |
| `films/capxul-lite/board/board.html` | the design board written after the first viewing: the notes on the film, the next step, every problem found and what was proposed for it. One file, published as it is |
| `src/engine.js` | the timeline every scene writes to, the cue lookup, the code and terminal painters |
| `src/film.css`, `src/shell.html`, `src/player.js` | the look, the frame around the stage, and the player |
| `tools/capture.sh` | records the first film's captures; undoes every edit it makes to the example |
| `tools/narrate.py` | speaks a script, then hears it back for each word's time: `out/<film>/timing.json`, `narration.wav` |
| `tools/mix.py` | the quiet pad under the voice: `out/<film>/pad.wav` |
| `tools/build.mjs` | puts the page together: `out/<film>/film.html` to look at, `page.html` for an artifact, `captions.srt` |
| `tools/shot.mjs` | draws single frames to look at: `node tools/shot.mjs <film> 12.5 90` |
| `tools/render.mjs` | draws every frame and encodes `out/<film>/<film>.mp4`, with sound and captions |
| `tools/supplement.mjs` | builds a film's reading page: `out/<film>/supplement.html` |

`out/` and `.cache/` are built, never committed.

## Building one

It needs `ffmpeg`, Playwright with Chromium, and a Python environment with `kokoro-onnx`, `soundfile`, `numpy` and
`faster-whisper`. The voice model's two files, `kokoro-v1.0.onnx` and `voices-v1.0.bin`, go in `.cache/models/` or wherever
`EXPLAINER_MODELS` points. `capture.sh` also needs Node 24 and an installed workspace.

```sh
tools/capture.sh                       # first film only, when ortho's output or the example changed
python tools/narrate.py <film>         # when its script.json changed
python tools/mix.py <film>
node tools/build.mjs <film>
node tools/render.mjs <film>           # ten to fifteen minutes on four cores
node tools/supplement.mjs capxul-lite  # the docs page for the two Capxul Lite films
```

The docs page plays each film at the head of its part. It looks for `capxul-describe-720.mp4`, `capxul-runs-720.mp4` and
a `<film>.captions.txt` beside it (a 720p encode of each render, and its `captions.srt` as WebVTT text); they are published
with the page and are not in the repository.

`narrate.py` keeps each spoken line in `.cache/clips/` under the hash of its words, so a change to one line speaks one line.

## How a scene is timed

A scene never names a second. It asks for a word: `s.cue("b5", "comes in")` is the moment the voice says "comes in" in line
`b5`, taken from the recogniser's word times in `timing.json`. Rewrite a line, run `narrate.py`, and every picture moves to
its new word. A cue whose word the recogniser didn't hear is placed by its share of the line, and the build lists it.

The whole film is one paused timeline. `Film.seek(seconds)` draws any frame on its own, which is what lets the renderer
split the film across workers and what lets the player scrub.

## Changing one

- **The words.** Edit `script.json`, then `narrate.py`, `mix.py`, `build.mjs`. Check the cues the build lists.
- **A scene.** Edit its file in `scenes/`, run `build.mjs`, and look at a few frames with `shot.mjs` before rendering.
- **What a scene quotes.** In the first film, add the file to `quoted` in its `data.mjs`. In the Capxul Lite films, add it under `films/capxul-lite/app/`.
- **A class name in a scene.** Don't use `k`, `s`, `c`, `n`, `t`, `f`, `p`, `x` or `r` as a whole class: they colour code.

## What the recording found

`ortho prove --changed`, after a change to `claim`'s budget and description, proved all seven journeys: it could not place
the regenerated files (`films/how-it-works/captures/change-prove-changed.txt` has its words). So the first film shows a plain
`ortho prove` there, and its narration says "prove again", not "prove what changed".

## What the design found

`design/decisions/K46-things-last.md` is the record: what Aaron decided on 26 November 2026, what it changes in older
records, and what is still open. The board lists every problem found and what was proposed for it. Two ideas carry the design: a thing that waits says what
it needs, and the framework asks; and when the other half of an act is only data, it is sealed into the one signed call.
