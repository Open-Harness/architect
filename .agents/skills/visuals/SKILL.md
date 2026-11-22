---
name: visuals
description: How to make animated visuals for Orthograph's docs (MP4, GIF and a still) from plain-text SVG scenes, rendered headless and the same every run. Use it when a doc needs a diagram, when you are about to draw an ASCII or static diagram of a route, a lifecycle, a machine or a trace, or when Aaron asks for an animation, a GIF or a video.
---

# Visuals

A scene is one JavaScript file that draws SVG as a pure function of time. `render.mjs` opens it in headless Chromium,
sets the time for every frame, screenshots it, and has ffmpeg make an MP4, a GIF and a still. Nothing runs on a clock,
so the same source gives byte-identical output every run, and any frame can be checked on its own.

The kit lives in `spikes/visual-content/` until the docs site has a home for it (the spike's README says why, and what
was tried against it). Three finished scenes there are the models to copy.

Two kinds of scene have their own skill, because their style is fixed and only the data changes. Use them whenever
they fit:

- `trace-waterfall`: one recorded call, built up span by span. A converter writes the scene from the trace's JSON.
- `machine-journey`: a journey drawn by hand across a machine.

Write a scene by hand, as below, only for anything else, like the handler lifecycle.

## Animate, or a still?

Animate when the point is **order or a path**: the route a call takes, which check refuses first, a journey walking a
machine, spans opening one after another. Motion carries the "then", which a static diagram makes the reader rebuild.

A still is enough when the point is **shape**: what a thing holds, which packages depend on which, a table of fields.
Render a still from a scene with `--still`, or write the SVG and leave it at that. Never animate for decoration.

Replace ASCII diagrams in docs with a scene whenever the diagram shows a route or a sequence.

## Commands

From `spikes/visual-content/`:

```bash
pnpm install --ignore-workspace && npx playwright install chromium-headless-shell   # once; needs ffmpeg on the PATH
node render.mjs handler-lifecycle            # one scene, dark and light: MP4, GIF and poster PNG each
node render.mjs all                          # every scene in scenes/
node render.mjs trace-waterfall --still 6.5 --theme dark   # one frame as a PNG, to look at while you work
node render.mjs trace-waterfall --beats --scale 1          # a still at each beat the scene declares, then the poster
node render.mjs journey-revoke-then-spend --serve          # a local URL that plays it on a loop; Ctrl-C stops it
```

Options: `--theme dark|light|both` (both), `--fps 30`, `--gif-fps 15`, `--gif-width 960`, `--scale 2` (the MP4 is
1920 by 1080 for a 960 by 540 scene), `--jobs 3`, `--out <dir>`. A run prints frames, timings and sizes per file, and
exits non-zero when a GIF is over budget.

Work loop: write the scene, render stills at the beats you care about and look at them (they are PNGs you can read),
fix overlaps, then render the whole thing once. All three scenes render in about two and a half minutes.

## Where things live

- `scenes/<name>.js`: the source. One file per scene, plain text, reviewed like code. The file's opening comment names
  the code or evidence it draws from, with the date, so it can be checked when that code changes.
- `renders/<name>.<theme>.{mp4,gif,png}`: the output, committed beside the source. The PNG is the poster (the
  scene's `poster` time, by default its end): use it as the video's poster and as the still for print or a README.
- `lib/kinds/`: the two kinds (`waterfall.js`, `journey.js` with `sketch-geometry.js`); `tools/trace-to-waterfall.mjs`.
- `lib/stage.js`: the kit (palettes, fonts, easing, `beat`, `drawn`, `along`, `pill`, `captions`, `sketch` for
  rough.js). `lib/page.html` and `lib/page.js` load a scene; `render.mjs` drives them.

When a docs page uses one, the MDX shows the MP4 (autoplay, muted, loop, playsinline, with the PNG as poster) and
picks the theme with `prefers-color-scheme`; the GIF is for places that can't play video (GitHub, chat, a README).

## Writing a scene

```js
import { el, label, drawn, appear, beat, captions } from "/lib/stage.js";
export default {
  width: 960, height: 540, duration: 12, poster: 11.5,
  build({ svg, colors: c }) {
    // make every element once, here
    return (t) => { /* set every element from t alone: no state carried between frames */ };
  },
};
```

- **Draw what the code does.** Read the source first and name it in the scene's opening comment. If the brief and the
  code disagree, draw the code and say so in your report.
- **Pure in `t`.** `draw(t)` may be called for any time in any order. Use `beat(t, start, duration)` for every change;
  never a counter, `Date`, `requestAnimationFrame` or CSS animation.
- **Seed every rough shape** (`sketch(svg)` does), so the hand-drawn wobble is the same every render.
- **Look at stills before the full render**, at least one mid-scene and the poster, in both themes.

## Size limits

- GIF under 2 MB (the renderer fails the run above it); aim under 1 MB. MP4 under 1.5 MB. Poster PNG under 300 KB.
- 8 to 20 seconds. A scene longer than 20 seconds is two scenes.
- If a GIF runs over: shorten the scene, drop `--gif-fps` to 12, then `--gif-width` to 800. Hachure fills and large
  moving areas cost the most bytes.

## Style guide

- **Canvas** 960 by 540 (16:9). 40 px margins. Title top left; a caption line at the bottom (y 508) for flow diagrams.
- **Type.** Inter for words (titles 22 semibold, captions 16, labels 14). JetBrains Mono for anything that is a name in
  the code: spans, operations, refusals, attributes (10 to 13). Caveat for hand-drawn scenes only. All three are
  vendored from npm (`@fontsource`), so a render never reaches the network.
- **Palette.** One meaning per colour, the same in both themes (`palettes` in `lib/stage.js`):
  accent blue is the call's own path; violet is a span or step; teal is the journal and events; green is ok;
  **amber is a refusal** (an outcome: its span does not end as an error); **red is a defect** (the only error). Grey is structure not
  yet reached. Never use red for a refusal.
- **Dark and light.** Render both, always. Dark background `#0f1117`, light `#fbfaf7`. Check contrast of muted text
  in light.
- **Pacing.** Show the whole route faintly first (under a second), then walk it. One idea per beat, a beat is 0.6 to
  1.2 seconds, and the caption changes with the beat. Paths draw at roughly 400 px a second. Hold the final frame two
  seconds or more, because the GIF loops and the last frame is the one people read.
- **Captions** say what happens in plain words, one line, under 90 characters: what a person would say aloud while
  pointing. The scene must make sense with no sound and no surrounding text.
- **Hand-drawn** (rough.js and Caveat) for journeys, sketches and ideas; **clean** (Inter, straight lines) for how the
  framework works. Don't mix the two in one scene.

## Talking to Aaron about a visual

He listens rather than reads (`threads`, "Talking to Aaron"): describe what the animation shows in a sentence or two,
then send the GIF or MP4 itself, so he can look when he wants to.
