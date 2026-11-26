# PROVE-only-coverage: a run of one journey does not judge coverage, and `--only` takes a journey's file

26 November 2026. A 🔨 builder thread's call, made while fixing what a fact-check of the "journeys first" chapter
found on `examples/plugged-in`. Aaron's words on the findings: "they should work proper".

## Evidence

- **A green run of one journey ended red.** On Plugged In, `ortho prove --only "claim a handle"` passed all 8 steps
  and ended `prove ✘ 5 failing`, exit 1. Each of the five was eval 8, coverage, for an operation the one journey did
  not reach or reach in full ("link.order reached by no journey").
- **Coverage is a fact about the whole run.** Eval 8 asks whether some journey reaches each move, outcome, declared
  error and rule (`packages/prove/src/modules/evals/internal/run.ts`). A run that left journeys out cannot answer it.
- **A run with `--only` proves nothing anyway.** It takes no stamp and records no verdict
  (`packages/prove/src/modules/prove/service.ts`), so its exit was never what earns a promotion.
- **`--only` refused what the brief prints.** `ortho brief` lists the journeys that call an operation by file
  (`journeys/claim-a-handle.ts`); `--only` matched the declared name alone, so a builder following its brief got
  `no journey named`, exit 2.
- **The checks read the journey's lines, not the exit.** The e2e checks that use `--only` on a passing journey
  (`e2e/m1/17`, `29`, `30`, `e2e/m2/09`, `10`, `e2e/ui-layer/04`) judge the journey's own lines or the report's
  verdicts; none asserts exit 1 for a green journey. Several say in a comment that `--only` exits 1 on coverage.

## Decision

1. **With `--only`, an operation's coverage gap is said and not judged.** It prints as
   `<operation> coverage not judged: <what the run did not reach>`, the operation's line reads
   `8 evals ✔, coverage not judged`, and the line before the last says how many journeys ran and that coverage is the
   whole run's to judge. Nothing in it carries a ✘ or counts as failing.
2. **Every other eval is judged as before,** on the calls the journey made, and a failing step or eval still ends
   `prove ✘`, exit 1. So `--only` answers "is this journey green", and `ortho prove` answers "is the app proven".
3. **`--only` names a journey by its declared name or by its file,** as `ortho brief` and `ortho model` list it, for
   `--env local` and `--env staging` alike. `ortho brief` ends its list with the command for one of them. The refusal
   keeps its first words (`no journey named "<x>"`) and adds the two ways to name one.
4. **Staging is unchanged in what it judges:** it never ran the evals (`internal/staged.ts`).

## For the checks' authors

The comments that say `--only` exits 1 on coverage are stale after this: `e2e/ui-layer/04-a-name-is-claimed-once-through-web.test.ts`
(line 14), `e2e/m1/17-telemetry-model.test.ts` (line 326), `e2e/m1/30-st1-24-warm-world.test.ts` (line 216),
`e2e/m1/42-m2-02-principal-journeys.test.ts` (line 72), `e2e/m2/09-journey-stand-calls.test.ts` (line 212) and
`e2e/m2/10-prove-stand-ins.test.ts` (line 267). A builder may not edit them. Their assertions hold either way.

## Supersedes

- `packages/prove/src/modules/prove/README.md`: "`--only` selects a journey by its declared name." → "`--only` selects a journey by its declared name or by its file as `ortho brief` and `ortho model` list it"
- `design/later.md`: "**`--only` should not count coverage against the journeys it excluded, and the climber's worktree needs `pnpm install` said**" → "**The climber's worktree needs `pnpm install` said**"
