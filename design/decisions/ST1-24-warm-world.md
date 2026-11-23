# ST1-24: a warm world is `ortho dev`'s, found by a record, emptied between runs, and used only when its source is the source on disk

20 November 2026. Decided by the builder of ST1.24 (Goal 3), under AGENTS.md, "Who decides". The check is
`e2e/m1/30-st1-24-warm-world.test.ts`; the design is A1 of [`../research/speed-and-vitest-proposal.md`](../research/speed-and-vitest-proposal.md).

## What was decided

- **`ortho dev` keeps a collector** (the one a prove makes, in dev's process) writing `.ortho/dev-telemetry`, a portal feed over it,
  and its world exporting to both. While it lives it keeps `.ortho/dev.json`: its pid, the world's URL, the collector's URL and
  folder, and when it began. The file is removed when dev stops.
- **`ortho prove --env local` looks for it** (`packages/prove/src/modules/warm`). It uses the world only when dev's pid is alive, the
  world answers `/_world/health`, and nothing under `src`, `blueprint` or `generated/server` (not wrangler's `.wrangler` output) is
  newer than dev's start, and the list and contents of those files are what dev began with (a hash taken at dev's start, so an added, deleted or renamed file counts too). A record whose process is gone (dev killed) is ignored, and prove starts its own world. A prove with
  `--empty`, a chosen `--port`, or a model whose plugins run on a device (they need a chain of their own) never reuses.
  When it reuses it prints `prove: reusing the world of ortho dev at <url>` first, in its text and in the report's `lines`.
- **Isolation is a reset before the run**, not a store per run: `POST /_world/reset` (host-cloudflare, `world`) empties every table
  of the default database and of each declared store, and prove empties the collector's folder. Nothing a run, or the developer,
  left in them is in the next run's way. This also empties what the developer made in `ortho dev`; that is what a reset is.
- **The cast stays.** The world's cast (the people a journey names, signed up for real) and their `auth_user` and `auth_account`
  rows are kept, with each person's password hash: they are the world's population and not a run's records, and signing a person
  up costs a password hash. Measured on acme against a warm dev, keeping them takes a prove from 6.4 s to 5.3 s; a cast of twenty
  people re-signed every run was three of the seconds. Sessions, keys, device codes and every other identity table are emptied.

## Why the source rule is strict

wrangler reloads an edited handler by itself, but prove has no way to know when it has finished. A prove that ran in the old world
would give a verdict on code that is no longer on disk, which is a false result, and the check plants exactly that (an edit, then the
edit's removal). So any change to the sources after dev began sends prove to a world of its own until dev is started again. The cost is
that a developer who edits while `ortho dev` runs gets the cold time until they restart it; the day dev reports its own reloads, the
rule can follow them.

## Not done, and limits

- Actor storage (Durable Objects other than the world) and any bucket are not reset.
- Two proves at once against one dev reset under each other.
- The 6 s row rests on a loaded machine: measured 5.0 to 5.5 s here, against 9.7 s cold.

## Supersedes

- design/research/speed-and-vitest-proposal.md: "Leftover state between runs; needs A4 or a reset to be trustworthy." → "Leftover state between runs: a reset before each run keeps it out of the way (Superseded by ST1-24, 20 November 2026)."
