# The manual

How to build a real thing with Orthograph over time, with your agents. It is for the person who directs the work and
reads the blueprint, and who does not have to read the code.

The docs have three parts. This folder is the first.

| Part | Where | What it is |
|---|---|---|
| The manual | `docs/manual/` | the life of a system, chapter by chapter: what you do, what your agent does, what you read, what goes wrong |
| Reading a blueprint | `docs/manual/` (to come) | one guided read of a real one |
| The primitives | [`docs/canon/`](../canon/README.md) | one page for each idea. The canon is the only place a word is explained |

## What is written

| Page | How it stands |
|---|---|
| [Working with your agents](working-with-your-agents.md) | written. The roles are this repository's own practice, proved daily here. Orthograph does not yet give a new app any of it |
| [The agent kit](kit/README.md) | written, as files to copy into an app. Nothing generates it yet (M3.12 is parked) |
| [4 · Say what done means](chapters/04-say-what-done-means.md) | pilot. Recorded on Plugged In. Film: `docs/explainer/films/say-done/` |
| [5 · Build until green](chapters/05-build-until-green.md) | pilot. Recorded on Plugged In; the climb is a replay of one handler at three points. Film: `docs/explainer/films/build-green/` |
| [7 · Run it, break it, read the trace](chapters/07-run-it-and-read-the-trace.md) | pilot. Recorded on Plugged In. Film: `docs/explainer/films/read-trace/` |

The three chapters are a pilot, to fix the format before the rest is written. The other chapters, the guided read of a
blueprint and the canon's missing pages are planned in `docs/explainer/docs-plan/` and not started.

## What is where

| Path | What it is |
|---|---|
| `chapters/` | one page per chapter, numbered as the plan numbers them. Four parts and nothing else |
| `capture.sh` | records every command the chapters and their films show, on `examples/plugged-in`, into `captures/`. It changes the example to record, and restores it on the way out |
| `captures/` | the recordings, committed. Each opens with the command that was run |
| `check.mjs` | fails when a role's words differ, a written command is not in the command line's recorded tree (`captures/cli.json`), or a chapter quotes a line that was not recorded. CI runs it in the `e2e-m0` job |
| `cli-tree.mjs` | records that tree from the command line's own `--help` |
| `build.mjs`, `page/` | the manual as one page, `out/manual.html`, with each film at the head of its chapter |
| `kit/` | the agent kit, and `roles.json`, the one place a role's limits are written |

```sh
docs/manual/capture.sh          # when ortho's output or the example changed: needs Node 24 and an installed workspace
docs/manual/capture.sh cli      # one section only (cli, journeys, stub, climb, trace): the other recordings are kept
node docs/manual/check.mjs
node docs/manual/build.mjs
```

A recording carries ids and timings of its own run, and a last line `exit N` is the recorder's, not the command's. After `capture.sh`, the check names each chapter line that no longer
matches, and the films pick the new recordings up when they are next built.

## The rules a page keeps

- **It never explains a primitive.** It links to the canon's page.
- **Nothing is typed that can be read.** A command it names exists, with its flags. Every fenced block in a chapter is
  a quote, of a recording (`capture=<file>`) or of a file (`file=<path> lines=a-b`), and `check.mjs` fails when one is not.
  The check cannot tell whether the lines a quote leaves out change its meaning: that is a reviewer's to read.
- **A chapter has four parts and nothing else**: what you do, what your agent does, what you read, what goes wrong.
- **It says how each part stands**: runs today, decided, this repository's practice, or missing.
- **A role's limits are written once**, in `kit/roles.json`. The page, the kit's `AGENTS.md` and each skill say the same
  words, and `node docs/manual/check.mjs` fails when they differ.
