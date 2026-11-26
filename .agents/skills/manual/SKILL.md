---
name: manual
description: How to write, record, check, film and publish a chapter of the Orthograph manual (docs/manual), the book that follows Plugged In from a plan to a change made months later. Use it when asked to write or fix a chapter, re-record one after the product changed, add a film to a chapter, rebuild or republish the manual, or take over docs/manual.
---

# The manual

`docs/manual/` is a book for the person who directs the work and reads the blueprint. Its order is `spine.json`: an
opening, eleven chapters in four parts, and the reference at the back. Every chapter has a film. The book and its films
are committed: `docs/manual/site/index.html` opens in a browser, with the films beside it in `site/films/`.

`docs/manual/WRITING.md` is the one standard for a chapter and its film. Read it before you write a word, and read
`chapters/05-build-until-green.md` as the model. This skill is the order of work and what went wrong the first time.

## The order of work

1. **Find out what is real.** Run the commands the chapter is about on `examples/plugged-in`, read their `--help` and
   the README of the module that implements them, and read `docs/canon/status.md`. Trust no description, including
   the chapter's own plan. What is rough or missing goes in the chapter's last two sections, plainly. Restore the
   example after every trial: `git checkout -- examples/plugged-in && git clean -fdq -- examples/plugged-in`.
2. **Record.** One file per chapter, `record/NN-<section>.sh`, sourced by `capture.sh` and using only its helpers.
   Run it alone with `docs/manual/capture.sh <section>`. It starts from a clean example, leaves it clean, stops what
   it starts, and records no secret. Recordings land in `captures/` and are committed.
3. **Write** the chapter at the path `spine.json` gives, in the voice of `WRITING.md`. Every fenced block is a quote of
   a recording or a file. Then `node docs/manual/check.mjs` until it passes. It fails on an invented line, a command
   the command line does not have, a table or list in a chapter, and a missing closing section.
4. **Have it read by an agent that wrote none of it** (the `reviewer` skill), against the recordings and the code.
   Fix what it finds in one pass. Log what you leave, in the pull request.
5. **Film it** with the `explainer` skill: the script first (`docs/explainer/films/<film>/script.json`, its `pictures`
   key saying what each sheet shows), then `narrate.py`, `mix.py`, the scenes, `render.mjs`.
6. **Publish**: `node docs/manual/films.mjs` makes `site/films/<film>.mp4` (720p), its poster and its captions from
   the renders; `node docs/manual/build.mjs` writes `site/index.html` and the artifact body `out/manual.html`.
   Commit `site/`. To publish it as an artifact, publish `out/manual.html` with `site/films/*` as its files, under
   `films/`.

## Many chapters at once

Write `WRITING.md` and the spine first, so every writer has one standard. Give each chapter one agent in its own git
worktree, with its own port (`MANUAL_PORT`), told which files it may touch: its chapter, its record section, its
captures, its film's folder, and its own entry in `spine.json`. A second agent checks each one and fixes small things
in place. Merge the branches in spine order. Narrate every script yourself, so the voice is one voice, before any
scenes are drawn. Then give each film's scenes to one agent, with the series' common brief, and look at every
contact sheet yourself before you render.

## What went wrong, so it does not again

- A chapter written to four fixed headings read like a form. Aaron asked for prose in the order things happen, the way
  a good engineering post reads: what we want, then how, then what was recorded.
- A rewrite into prose dropped facts the earlier version had. Compare the old chapter's facts with the new one's.
- Two untrue sentences reached the opening ("every join is in it", "most chapters have a film"). Opening claims are
  the ones nobody re-reads: check them against the spine and the recordings.
- The checker could be fooled until it was tried: by a fence it did not see, a quote of the chapter itself, a flag
  held as a global set. When you change `check.mjs`, try to fool it.
- `capture.sh` once checked the example was clean after setting the trap that restores it, so its refusal destroyed
  the work it warned about. Check before you touch.
- A recording made at one port breaks when re-recorded at another. A section whose recordings show a port fixes it.
- The page looked like a dashboard, then plain. What works: a serif column, a contents rail that stays in view,
  chapter openers with the number, recordings as small panels with their source above, and a poster on every film.

## What to tell Aaron

He listens rather than reads (`threads` skill). Say how many chapters and films, what was recorded and what was
replayed or staged, that nobody has listened to the films, and what in the product was rough while recording.
