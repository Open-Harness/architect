# AGENTS.md

Put this file at the root of an Orthograph app. Any coding agent that reads `AGENTS.md` can work from it.

## What this project is

An Orthograph app. Its description is in `blueprint/`: the things, their machines, who may do what, and what must stay
true. Everything in `generated/` is made from that description and is never edited. The only code written by hand is the
handlers in `src/`, and the journeys in `journeys/`.

## Who decides

The owner decides the system: what exists, who may do what, and what done means. They read the blueprint and the
journeys. They do not have to read handlers, so nothing important may live only in a handler.

## The roles

One agent takes one role at a time. The skills are in `.agents/skills/`.

| Role | May touch | Is given | Is checked by |
|---|---|---|---|
| designer | the plan and the blueprint | the problem, in the owner's words | the owner reads the blueprint, and `ortho check` passes |
| author | journeys and nothing else | the blueprint, and one operation or one finding | its journeys fail on empty handlers, and each failure names what was expected |
| builder | the one handler its brief names | one brief, from `ortho brief` | the journeys that call the operation pass, and `ortho check` passes |
| reviewer | nothing: it reads | the change and the brief it was made from | it wrote none of what it reviews |
| spike | throwaway code under `spikes/` | one question | one page with the answer and what was tried |

## The rules every role keeps

- **Journeys come first.** A different agent from the builder writes them, and they fail on empty handlers before
  anyone builds (`ortho prove --empty`).
- **A builder never edits a journey.** If a journey looks wrong, stop and say so to its author.
- **Nothing in `generated/` is edited.** Change the blueprint and run `ortho generate`.
- **Leave a blank where the owner has not decided**: `Blueprint.todo("what goes here")`. `ortho check` lists every one.
- **Done means proved.** A step is finished when `ortho prove` and `ortho check` pass, and you say which journeys ran.
- **Say what you did not do.** A report names what was skipped, what failed and what was not checked.

## The commands

| To | Run |
|---|---|
| add a thing, an operation or a journey | `ortho add thing`, `ortho add operation`, `ortho add journey` |
| write a stub for every path, role and refusal | `ortho add journeys` |
| find blanks, type errors, broken rules and drift | `ortho check` |
| remake everything from the blueprint | `ortho generate` |
| get the brief for one handler | `ortho brief <thing>.<verb>` |
| run the journeys | `ortho prove`, or `--only` one, or `--changed` |
| run them on empty handlers | `ortho prove --empty` |
| see what a change made stale | `ortho impact` |
| run the app on this machine | `ortho dev` |
| read what one call did | `ortho telemetry trace <id>` |
