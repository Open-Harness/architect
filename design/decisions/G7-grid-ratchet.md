# G7: red grid cells are listed, may not grow, and must leave the list when fixed

Decided 19 November 2026 by the Goal 3 lead, under "Who decides" in `AGENTS.md`. Built by the checks author.

## The problem

Goal 3 switches a grid cell on when a journey first touches it, and CI fails on a red cell (K14, `e2e/grid/README.md`). Plugged In's seven
journeys switched on 53 cells, 316 (cell, subject) pairs. 239 are green and **77 are red** today: the framework has not caught up to what
K14 asks of the CLI, SDK, MCP, docs, portal and some spans. Ten more touched cells are held off (`held-off.json`). The red pairs are
real framework work, owned by M1.13, M1.36, M1.37, M1.42 and M2.08, and none of it is the climb's. A red `e2e-grid` blocks every pull
request into `goal/stage-1` until all of it lands.

## The options

- **A. Block on red.** What the runner did. Honest, but no pull request merges until M1.13 and M1.42 are done, so the climb stops.
- **B. Switch the red cells off.** The push goes green, and the grid lies: a cell that fails today looks like one nobody has looked at, and
  nothing stops a green cell turning red unseen. Rejected; "never weaken an eval to make it green".
- **C. Ratchet** (the call). The red pairs are listed, each with its reason and what it waits on. The list may not grow, and a pair that
  turns green must leave it in the same change. The same rule as `e2e/ratchet` for the m1 checks.

## The call: C

`e2e/grid/expected-red.json` is `{ pairs: [{ cell, subject, reason, waitsOn }] }`, with `waitsOn` K14's "fix" column for the cell
(a slice) and the package file the checks author found. `nx run e2e:grid` runs `ortho prove`, judges every switched-on pair and fails on:

1. a red pair that is not on the list (a new failure);
2. a listed pair that is not switched on, or that no cell judges (the list cannot hold what nothing proves);
3. a listed pair that is green (it is fixed, so it comes off the list in the same change).

It prints each, then `ratchet ✔ 77 expected red, 0 unexpected, 0 newly green, 0 not switched on`. `Grid.ratchet` is a pure function of the
report and the list, in `e2e/grid/src/modules/grid`; it keys by pair, not by test file, so `e2e/ratchet`'s code is not reused (its
unit is a vitest test, ours a verdict). Three tests keep the list honest: every listed pair is switched on, each names a slice or a
package file, and the list parses.

**Two scope calls (Goal 3 lead, 19 November 2026).**
1. M2.08 (`prove --through`) is inside Goal 3's bound ("all of M2"), after M2.05. Its 7 pairs (`operation.cli`'s journeys half) stay on the
   list and the done check waits for them. `error.cli` and `error.mcp` switch on when M2.08 lands.
2. M1.37's MCP output schema and states (`thing.mcp`, `machine.mcp`, 5 pairs) are pulled into Goal 3 from M3, because a journey touched
   those cells. They are built with M1.42's client slice, and the list labels them "M1.42 (with M1.37's output schema, pulled from M3 by G7)".

3. `machine.mcp` reads a move's states from what the framework emits for the tool (schemas, annotations), not from its description, which `operation.mcp` requires to equal the model's. K14's row and `grid.json` were amended to say so in #150.

4. Stopping rule for the evals (#150, after four rounds of review on one kind of finding): the evals guard against false greens first. A false red from a presentation form no generator emits is loud, because the ratchet fails it as unexpected red. It is fixed when a generator first emits that form, not ahead of it. #150 swept the evals once for the kind (names matched as tokens, one declaration syntax accepted and its equivalent refused, formatting left in labels and values) and the sweep ends there. A false green is always fixed now, whatever form it needs.

K19 (the portal prebuilt, #103) is the route for the M1.13 portal pairs.

**When the list may grow.** Only in a checks author's change; only for pairs that change's new reading turns red; each named in the PR body with
its reason in the entry. Builders never add to it. K19's served portal (#149) is the first case: the portal's pages are read in a browser, so 13
`thing.portal` and `step.portal` pairs that were green on server-rendered HTML are listed until the portal is split.

**The goal's done check needs the list empty.** A pair stays visible until a builder fixes it; fixing it is what shortens the list.

CI: the `e2e-grid` job now runs `run --prove` through the nx target (`e2e/project.json`), with the No-Docker step and the Collector cache of
`e2e-climb`. No Foundry: Plugged In has no chain. A local run is 47 seconds, so `timeout-minutes` is 10.

## The evidence

239 of 316 pairs green, 77 red, 53 cells on, 10 held off, from one `nx run e2e:grid --skip-nx-cache` on the branch (exit 0, ratchet ✔). The 77
by slice (a pair that names two counts under each): M1.42 52 (the 5 MCP pairs now counted here, M1.37's output schema pulled from M3), M1.13 38, M2.08 7, M1.36 3 (`error.telemetry` for NotAllowed, `machine.telemetry` for handle and link). M2.08's 7 are `operation.cli`'s journeys half.
By file, the builders' list is in `e2e/grid/README.md`, "Where Plugged In stands".

Not decided here: `error.cli`, `error.mcp` (`prove --through`, S-11, S-20) and the eight not-needed event and journey cells (K14 Q2, Q3)
stay in `held-off.json`, not on this list, because they are not switched on.

**False green fixed under scope call 4 (20 November 2026, checks author).** The 🔍 review of #153 found `thing.mcp` green over an output schema that refused its own answer: M1.42 spread a refusal's `{refusal, code, exit, status}` over the answer's properties, so Acme's `system.health` answer `{status: "ok"}` failed `status: integer` and the MCP SDK client rejected every successful call; the eval only checked that an `outputSchema` existed. `thing.mcp` and `machine.mcp` now run the schema through the SDK's own validator (`e2e/grid/src/modules/output-schema`): it must accept the operation's answer and each refusal, and refuse `{}`, a wrong-typed field and (machine) a non-state. `thing.sdk` also judged only that the type was exported, so a field typed wrongly passed; it now checks each field's type against the model. Planted red and green cases are in the unit tests. `machine.mcp`'s contract (README, K14's row, `grid.json`'s greenMeans) now names metadata (`_meta`) beside schemas and annotations, as the eval already reads it. No pair came off the expected-red list and none went on it on `goal/stage-1`.

**Amendment, 20 November 2026 (Goal 3 lead, after #154): the loop-break rule for the evals.** #154 took eleven rounds of review, and every finding was on a form no generator emits
(a schema typed `["string","number"]`, a `Link` with an extra method, a literal narrowed to `5n`). Each round was fixed, and each fix opened the next sibling. The rule from here on:

1. **A sample is every sample.** An eval judges from every successful answer the run recorded (each span's fields kept together, identical ones once, a cap), every state the model
   allows, both shapes of an optional or role-private field, every refusal an operation may give in each shape, and every committed call. It never judges from the first one. The sibling
   list of that sweep is in the pull request; the matrix READMEs (`output-schema`, `thing-evals`) hold the shapes and rules.
2. **Known gaps.** A finding that the eval misses a wrong output that no generator emits is an evidence gap, not a defect. It is recorded as a line under "Known gaps" in the matrix
   README, the thread is answered with that line and resolved, and no fix is built. Only a finding where our real generated output is judged wrong (a false red today), or where a
   generator really emits the wrong form, is fixed. This is scope call 4 applied to false greens: "a false green is always fixed now" holds for forms the generators emit.

