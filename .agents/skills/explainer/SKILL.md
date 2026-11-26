---
name: explainer
description: How to make a narrated explainer film for Orthograph as code, with docs/explainer's pipeline (a script spoken and timed by word, scenes drawn on one paused timeline, rendered to MP4 and published as a player). Use it when Aaron asks for a film, a video tutorial or a recut, when a manual chapter needs its film, or when you take over docs/explainer. For a silent animated diagram inside a doc, use the `visuals` skill instead.
---

# Explainer films

A film here is code. The voice is synthesised from a script, each scene is drawn by a web page at any time you ask
for, and nothing on screen is typed that could be read from a file. `docs/explainer/README.md` has the commands and
the folder layout; this skill is the method and what went wrong the first time.

## Before you write a word

1. **Say what the film claims, and to whom.** Aaron listens rather than reads, and he watches as someone who has
   built the thing before. Start from the problem and from a whole system, never from one feature.
2. **Sort what you will show into real and designed.** Real means it runs today: quote the file and record the
   command's output (`tools/capture.sh` is the model). Designed means it is decided or proposed: put it under a
   film's `app/` folder as files, written as if the framework existed, each proposed line ending `// new`, and label
   every designed output on screen. Never let a design read as a recording. End a design film by sorting what was
   shown into runs today, decided, proposed.
3. **Check the repo before calling anything new.** Read the canon page, the decision and `docs/canon/status.md` for
   each idea. The first design film marked five things as proposals that already existed.

## The steps

1. **Script** (`films/<film>/script.json`): scenes, each a few lines with an id. Write for the ear: short sentences,
   one idea each, no symbols, numbers as words. A line may carry `say` when a word is mispronounced ("Capxul" is said
   from "Capsule"). Give the film `title`, `source`, `steps` (the rail across the top) and `about`.
2. **Narrate**: `narrate.py <film>` speaks each line and hears it back, so `out/<film>/timing.json` has the time of
   every word. Then `mix.py <film>`. Clips are cached by their words, so changing one line speaks one line.
3. **Scenes** (`films/<film>/scenes/NN-<id>.js`, one per sheet, ids matching the script). A scene never names a
   second: `s.cue("b5", "comes in")` is when that word is spoken. Pick words the recogniser heard; the build lists any
   cue it had to guess, and none may be left. Read two finished scenes before writing one.
4. **Look at frames.** `build.mjs <film>`, then `shot.mjs <film> <seconds…>`. Look at three or more frames of every
   scene after its last change: just after it opens, the middle, the last second. Then tile about two dozen frames
   into contact sheets under `out/<film>/sheets/`.
5. **Render**: `render.mjs <film>` (ten to fifteen minutes). Check the MP4: its length against the narration, video,
   audio and subtitle streams, loudness near -16 LUFS, and a few frames pulled from the file itself.
6. **Publish**: `out/<film>/page.html` with `narration.mp3` beside it is the player artifact. Send the MP4 as a file.
   A docs page can play a film too: a 720p encode under 15 MB beside the page, and the captions as a `.txt` of
   WebVTT that a few lines of script turn into a track (artifacts do not serve `.vtt`).

## The look

A drafting sheet: a rail of steps, a title block, one idea per sheet. White is what you declare, cyan is generated,
amber is proposed (show `Kit.legend` whenever an amber line is on screen), green and red are only verdicts. Text on the
1920×1080 stage stays at about 22px or more. A flow between parties over time is a sequence diagram, one column per
party with time running down, never boxes and arrows in a row. When the narration says something happens, show it
happening: run the journey on screen, don't read its file aloud.

## More than one film at once

One agent can build one film's scenes while another builds the next. Write every script yourself first, so the voice
is one voice, and narrate before you hand over. Give each agent one film's folder and nothing else: the engine, the
tools, the shared kit and the shared `app/` are read-only for it, and a helper it needs goes in its own
`scenes/00-local.js`. Ask each for contact sheets, look at them yourself, and render and publish yourself.

## What went wrong, so it does not again

- A class named `k`, `s`, `c`, `n`, `t`, `f`, `p`, `x` or `r` in a scene takes the code painter's colour. Use longer names.
- A scene's "about" line, and any on-screen claim about where its code comes from, must be true for that film.
- `ffmpeg -shortest` cut a film to its subtitle track. Dynamic `loudnorm` pumped; a measured gain and a limiter did not.
- `narration.mp3` is written by the render, so the player cannot be published before it.
- A player opened from a file cannot fetch its sound; that is not a fault. On the first play, wait for the sound.
- Building a film needs Python with `kokoro-onnx` and `faster-whisper`, the voice model's two files, `ffmpeg` and
  Playwright. CI has none of them, and `out/` is never committed.

## What to tell Aaron

Write it to be listened to. Say what each film shows, and say plainly what you could not check: nobody has listened
to a film you made, because you can only transcribe it back and measure it. Name the word most likely to be said
wrong. If a film came out shorter or longer than planned, say so.
