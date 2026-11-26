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

The chapters are planned in `docs/explainer/docs-plan/`. The first three to be written, each with a film, are: say what
done means, build until green, and run it and read the trace.

## The rules a page keeps

- **It never explains a primitive.** It links to the canon's page.
- **Nothing is typed that can be read.** A command it names exists, and `check.mjs` fails when one does not.
- **It says how each part stands**: runs today, decided, this repository's practice, or missing.
- **A role's limits are written once**, in `kit/roles.json`. The page, the kit's `AGENTS.md` and each skill say the same
  words, and `node docs/manual/check.mjs` fails when they differ.
