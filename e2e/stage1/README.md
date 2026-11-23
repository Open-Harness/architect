# e2e:stage1, the done check of Goal 3

`nx run e2e:stage1` is the done check of `design/goals/03-stage-1-hill-climbed.md`. It is being built up a piece at a time; this folder holds
what exists. It runs `stage1/*.test.ts` through the ratchet (`e2e/ratchet/README.md`): a failure not on `expected-failing/` fails it, and
so does a hook error. The list shrinks only.

## What it checks today

- `01-plugged-in-journeys.test.ts`: on a fresh copy of `examples/plugged-in`, `ortho prove` in `--env local` (read from prove's own
  `--report`) and in `--env test` (read from prove's lines and exit code; see below) runs the seven journeys, 56 steps, all green, and
  leaves nothing running.

## What the done check still needs

JSON has no comments, so this list sits here and in the `stage1` target's description in `e2e/project.json`.

1. `nx run e2e:climb` as a step of this target. Today it is its own CI job (`e2e-climb`).
2. Every grid cell a journey switched on, green, with its verdict in the logbook. Today it is its own CI job (`e2e-grid`), and this
   target reads no logbook verdict.
3. The latest staging run: deployed, ran the story, destroyed everything, left the account clean (M7.03, M7.04). Nothing to read yet.
4. A snags check: every snag in `design/goals/03-snags.md` fixed, or parked with an owner and a reason.
5. The story through the CLI, the SDK, MCP and HTTP from a fresh folder with the real `ortho new plugged-in` and the local registry.
   Prove runs the story journey; this target does not yet run the story as a user does.
6. `--env test` read from a report. Prove refuses `--report` in test (exit 2), so the test half reads its lines. The test "`--env test` reports
   its run as data" requires the report and is on `expected-failing/` until a builder gives test one.

## Why `--env test` runs here, and with what

`--env test` signs its verdicts for the logbook. The check starts the local OIDC issuer and the logbook of `e2e/layer2/services.ts` on free ports,
so no token of anyone's is made or read, and it runs the same on a Mac and in CI. The CI job needs no `id-token: write` for this.
