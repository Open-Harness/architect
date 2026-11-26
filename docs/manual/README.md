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

`spine.json` is the manual's order: an opening, eleven chapters in four parts, and the reference at the back.

| Page | How it stands |
|---|---|
| [The hard part is the next morning](chapters/00-why-this-exists.md) | the opening: the problem, what Orthograph does about it, how to read the manual, the cast |
| [1 · Plan it](chapters/01-plan-it.md) | written around a real first page an agent drew for Plugged In's next stage. The owner has not answered it yet, and it has no film |
| [4 · Say what done means](chapters/04-say-what-done-means.md) | recorded on Plugged In. Film: `docs/explainer/films/say-done/` |
| [5 · Build until green](chapters/05-build-until-green.md) | recorded on Plugged In; the climb is a replay of one handler at three points. Film: `docs/explainer/films/build-green/` |
| [7 · Run it, break it, read the trace](chapters/07-run-it-and-read-the-trace.md) | recorded on Plugged In. Film: `docs/explainer/films/read-trace/` |
| [Working with your agents](working-with-your-agents.md) | reference. The roles are this repository's own practice. Orthograph does not yet give a new app any of it |
| [The agent kit](kit/README.md) | reference, as files to copy into an app. Nothing generates it yet (M3.12 is parked) |

Chapters 2, 3, 6 and 8 to 11 are in the spine and not written; the page shows each in its place. `plan/` holds the plan
this order came from and the specimen Aaron agreed the voice and look on (26 November 2026).

## What is where

| Path | What it is |
|---|---|
| `chapters/` | one page per chapter, numbered as `spine.json` numbers them |
| `spine.json` | the order, the parts, and the question each chapter answers |
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
- **A chapter is written the way it happens.** It opens with the problem in plain words. Each section says what we want,
  then how, then shows what was recorded. It uses no tables, lists or boxes. It always ends with "When it goes wrong" and
  "How this stands", and limits are said in the same voice as everything else.
- **It says how each part stands**, in its last section: runs today, decided, this repository's practice, or missing.
- **A role's limits are written once**, in `kit/roles.json`. The page, the kit's `AGENTS.md` and each skill say the same
  words, and `node docs/manual/check.mjs` fails when they differ.
