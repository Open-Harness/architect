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

| Page | Film | Recorded by |
|---|---|---|
| [The hard part is the next morning](chapters/00-why-this-exists.md) | `why` | nothing: it is the argument |
| [1 · Plan it](chapters/01-plan-it.md) | `plan-it` | `captures/plan-page.txt`, a page an agent drew |
| [2 · Spike what you doubt](chapters/02-spike-what-you-doubt.md) | `spike` | `record/02-spike.sh` |
| [3 · Describe it](chapters/03-describe-it.md) | `describe` | `record/03-describe.sh` |
| [4 · Say what done means](chapters/04-say-what-done-means.md) | `say-done` | `record/04-journeys.sh`, `record/04-stub.sh` |
| [5 · Build until green](chapters/05-build-until-green.md) | `build-green` | `record/05-climb.sh` |
| [6 · Review without reading the code](chapters/06-review-without-reading-the-code.md) | `review` | `record/06-review.sh` |
| [7 · Run it, break it, read the trace](chapters/07-run-it-and-read-the-trace.md) | `read-trace` | `record/07-trace.sh` |
| [8 · Stage it](chapters/08-stage-it.md) | `stage` | `record/08-stage.sh` |
| [9 · Watch it](chapters/09-watch-it.md) | `watch` | `record/09-watch.sh` |
| [10 · Change it, months later](chapters/10-change-it-months-later.md) | `change` | `record/10-change.sh` |
| [11 · More than one agent](chapters/11-more-than-one-agent.md) | `agents` | `record/11-agents.sh` |
| [Working with your agents](working-with-your-agents.md) | none | reference |
| [The agent kit](kit/README.md) | none | reference |

All eleven chapters are written. Each says in its last section how its part stands. `plan/` holds the plan this order came
from and the specimen Aaron agreed the voice and look on (26 November 2026).

## What is where

| Path | What it is |
|---|---|
| `chapters/` | one page per chapter, numbered as `spine.json` numbers them |
| `spine.json` | the order, the parts, and the question each chapter answers |
| `WRITING.md` | how a chapter and its film are written: the one guide every writer and every film follows |
| `capture.sh`, `record/` | records every command the chapters and their films show, on `examples/plugged-in`, into `captures/`. One section file per chapter. It changes the example to record, and restores it on the way out |
| `captures/` | the recordings, committed. Each opens with the command that was run; `plan-page.txt` is a page an agent drew, and opens with a line saying so |
| `check.mjs` | fails when a role's words differ, a written command is not in the command line's recorded tree (`captures/cli.json`), a chapter quotes a line that was not recorded, or a chapter is not in the spine or does not end with its two closing sections. CI runs it in the `e2e-m0` job |
| `cli-tree.mjs` | records that tree from the command line's own `--help` |
| `build.mjs`, `page/` | the manual as one page: `site/index.html` (committed, opens in a browser) and `out/manual.html` (the same page as an artifact's body) |
| `films.mjs`, `site/films/` | each film as the page plays it: a 720p copy, a poster and its captions, made from the renders and committed |
| `kit/` | the agent kit, and `roles.json`, the one place a role's limits are written |

```sh
docs/manual/capture.sh          # when ortho's output or the example changed: needs Node 24 and an installed workspace
docs/manual/capture.sh climb    # one section only (a file in record/): the other recordings are kept
node docs/manual/check.mjs
node docs/manual/films.mjs       # after a film is rendered
node docs/manual/build.mjs
```

Open `docs/manual/site/index.html` to read the manual. The `manual` skill (`.agents/skills/manual/`) is how a chapter is made.

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
