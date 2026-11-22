---
name: trace-waterfall
description: Make an animated trace waterfall for Orthograph's docs, in the house style, from a real recorded trace. Spans appear as a cursor sweeps time, each with a one-line caption, ending with the operation span's attributes. Use it when a doc needs to show what one call did in time order, or when Aaron asks for a waterfall, a trace animation or "the trace one".
---

# Trace waterfall

One recorded call, built up span by span: a cursor sweeps the time axis, each span appears when the cursor reaches its
start and grows to its end, a caption says what that span is, and the operation span's attributes land as chips at the
end. The model is `spikes/visual-content/scenes/trace-waterfall.js` (the `allowance.grant` trace).

The look and the timing live in the kind, `spikes/visual-content/lib/kinds/waterfall.js`. A scene only holds data and
words. Never restyle one scene: change the kind and re-render them all. The general rules (commands, sizes, palette,
dark and light) are in the `visuals` skill. Read it first.

## When it's the right picture

- **Use it** to show what one call did, in time order. That covers nesting (which span is inside which), where the
  commit falls, which spans a refused call never opens, and what the operation span carries.
- **Don't use it** for many calls, for averages or for anything you would plot on a chart. If time order doesn't
  matter, use a still tree instead (`spikes/local-trace-viewer/tree.py` prints one).

## Real data only

The times come from a real trace, never from imagination. Get the trace's JSON one of two ways:

- **Tempo:** run prove with the local viewer, then read the trace back by id (the `local-trace-viewer` spike's
  `run.sh` and `evidence/` show how).
- **OTLP:** take any OTLP JSON file from the Collector's file exporter.

Both shapes work. If the clock makes times come out coarse (workerd counts in whole milliseconds), keep them as they are.
The kind draws a 0 ms span as a diamond, and the converter adds the footnote that explains why.

## Steps

From `spikes/visual-content/`:

```bash
node tools/trace-to-waterfall.mjs <trace.json> <scene-name>                  # writes scenes/<scene-name>.js
node render.mjs <scene-name> --beats --theme dark --scale 1                 # one still per span, then the poster
node render.mjs <scene-name>                                                # MP4, GIF and poster, dark and light
```

1. **Convert.** The converter puts the spans in tree order and gives times in ms from the trace's start. It names and
   colours them by the rules below, and turns the operation span's attributes into chips.
2. **Write the words.** These are every `TODO` in the file: `intro`, `outro`, and each span's `say`. The kind refuses to
   render while a `TODO` is left. Read the code that made each span before saying what it does, because the caption is
   a claim about the code.
3. **Fold to six spans or fewer.** Delete spans that don't tell the story, such as repeated reads. Never move a time,
   never merge two spans into one invented span, and keep every span the story mentions.
4. **Look at the beats.** `--beats` writes a still as each span lands, plus the poster. Read them. Check that no label
   is cut off, every caption fits on one line, and the chips wrap cleanly.
5. **Render and check sizes.** The GIF must stay under 2 MB, and the render fails if it doesn't. A six-span waterfall
   comes out around 350 KB.

## The spec

```js
import { waterfall } from "/lib/kinds/waterfall.js";
export default waterfall({
  title: "One trace, span by span",                    // Inter 22 semibold
  subtitle: "allowance.grant · recorded by prove, read back from Tempo",   // mono 13, muted
  unit: "ms",
  intro: "allowance.grant, one call, as prove recorded it",          // caption at 0 s
  outro: "no span ends as an error; the move and its event are written on the operation's span",
  spans: [ { name, depth, start, end, color, say }, ... ],             // tree order; depth 0 is the root
  attrs: { on: "allowance.grant", items: [ { text: "move.to=active", color: "step" }, ... ] },
  footnote: "workerd's clock moves only on I/O: times come in whole ms", // only when it's true
});
```

## Names and colours (the converter applies these; keep them when you edit)

| Span | Name in the picture | Colour |
| --- | --- | --- |
| HTTP server span | `POST /allowance/grant` (method and route) | `accent` (blue) |
| operation span, step span | as recorded: `allowance.grant`, `allowance.grant.insert` | `step` (violet) |
| the commit (a batch that writes `_journal`) | `BATCH · allowance + _journal` | `journal` (teal) |
| any other database call | `sqlite · SELECT organization` (verb and table) | `muted` (grey) |
| a span carrying `refusal` | as recorded | `refusal` (amber): it ended ok |
| a span in error, or carrying `defect` | as recorded | `defect` (red) |

Chips come from the operation span only, in this order:

- `operation`, `move.*` and `refusal`, in violet (amber for `refusal`).
- `event.*` and `payload.*`, in teal, because that is what the journal keeps.
- Leave out ids and anything that isn't public.

## The look and the timing (fixed by the kind)

- **Layout.** The canvas is 960 by 540. Span names sit on the left, indented 18 px per level, with an elbow line.
  Names are JetBrains Mono 12.5.
- **Axis.** Time runs from x 330 to 900, with at most six ticks (steps of 1, 2 or 5). Rows are 40 px apart, starting
  at y 138, and tighter when there are more than six.
- **Bars.** Each bar is 14 px tall. A zero-length span is a diamond. The duration label appears once the bar has
  finished.
- **Bottom of the frame.** Chips sit at y 428 and wrap at x 920. The footnote is at y 395, aligned right. The caption
  sits under a rule at y 478.
- **Pacing.** The cursor appears at 0.4 s and the first span at 0.6 s. Each sweep takes 0.95 s plus 0.75 s times the
  share of the axis it crosses. Spans that open at the same instant appear 0.7 s apart while the cursor waits, then one
  more 0.7 s beat.
- **Ending.** After the last sweep comes the outro caption. The chips follow 0.6 s later, 0.3 s apart, and the
  finished picture holds for 3.2 s before the loop starts again.
- **Captions.** There is one per span, at the moment it appears. Each is under 90 characters, in plain words: what a
  person pointing at the screen would say.

## Checks before you hand it over

- Every time matches the trace file the scene names in its opening comment.
- Every `say` is true of the code. Name the source file in the scene's comment if a caption depends on it.
- Read the dark and light posters and every beat still.
- The GIF is under 2 MB. Send the GIF to Aaron with one spoken sentence on what it shows (`visuals`, "Talking to
  Aaron").
