# Goal 3: the snag log

Every snag the climb hits, in the goal file's form ("A snag entry" in `03-stage-1-hill-climbed.md`). A framework builder
takes each, check first, and the climber comes back to that step once it is fixed. Snags found while writing the floor
(by the journey author and the checks author) are logged the same way, with "Hit" naming who hit them. Status is one of
`open`, `building` (with its PR), `fixed` (with the change), or `parked` (with an owner and a reason).

## Triage, 21 November 2026

The Goal 3 lead went through every snag whose Status was `open` in one pass, checking each against the code on
`goal/stage-1` at `61a7df04`. The call for each is its Status line; Hit, Lost, Cause and Fix are unchanged. A snag blocks
if it stands in the way of M2's auth journeys or principals, the story through the CLI, SDK, MCP and HTTP, `nx run
e2e:stage1`, or a staging run (M7.03, M7.04); the seven journeys in `examples/plugged-in/journeys/` are green, so only
future journeys count. S-29, S-30 and S-31 have merged (#265, #254, #269) and S-01 to S-04, S-22, S-23 and S-25 were already fixed; none of
them was touched.

| Verdict | Count | Snags |
|---|---|---|
| Fixed already (found fixed in the code) | 3 | S-10 (#76), S-12 (#116, #117), S-19 (#205, #227, #229) |
| Open, blocks | 2 | S-27, S-11 (S-17's HAN-15 was fixed by #268 and is off the list) |
| Parked, with an owner | 15 | S-05 to S-09, S-13 to S-17, S-20, S-21, S-24, S-26, S-28 (S-17: HAN-13 and HAN-14 are parked, HAN-15 is fixed) |

That is 20 snags: S-05 to S-17 (13), S-19 to S-21 (3), S-24 and S-26 to S-28 (4). The brief counted 21 lines. This
change also removes a stray second `Status: fixed (#148)` under S-27, a copy of S-25's left by a merge.

**The blockers, in the order to fix them**

1. **S-27, a throwing `pick` kills the run.** A small prove slice, and first because a single red step in the story or
   the grid otherwise stops every journey after it and the report file, so the climb curve and `nx run e2e:climb` record
   nothing. It touches only `packages/prove/src/modules/journeys/internal/checks.ts`, so it conflicts with nothing and
   is ready now: its fix and test: #264.
2. **S-11, `prove --through cli|mcp`.** This is M2.08 itself, so it follows M2.05. Without it the story cannot run
   through the CLI and MCP, and the held-off grid cells `error.cli`, `error.mcp` and `invariant.cli` stay off. S-20
   and S-16 ride on it.

Everything parked is journey-language ergonomics no journey needs (S-05 to S-09), wallet and chain items (S-13, S-15, the
device half of S-17), cells held off until M2.08 (S-20, S-16), and small hygiene (S-14, S-21, S-24, S-26, S-28). Each has
an owner and a trigger in its line, and the ones without a milestone slice have a line in `design/later.md`.

Not a snag, but the done check depends on it: `nx run e2e:stage1` is a target now (#261) and a required check on
`goal/stage-1`; what it still needs is listed in `e2e/stage1/README.md`. The staging checks merged (#266); the build is M7.03 and M7.04 (#282).

## S-01 · prove · every run's numbers come from its text
- Hit: the checks author, writing the climb recorder (#110): `ortho prove` prints only text, so `tools/climb/record.mjs`
  parses each journey's line to append `runs.jsonl`.
- Lost: none yet; a format change to prove's lines would silently break the curve.
- Cause: `packages/cli/src/main.ts` writes `report.lines` and nothing structured.
- Fix: framework, `ortho prove --json` (or a report file) with journey, step, verdict, expected, got, file; the recorder
  and the climb check read it.
- Status: fixed (#119): `ortho prove --report <file>` writes a JSON report (schemaVersion 1), and the recorder reads it.

## S-02 · climb · prove names no handler file and no declaration
- Hit: the checks author, climb property 3 (#110), all five planted fixtures: `✘ "olga spends some and is told what is
  left": answer "500", expected "380"`, with no `src/…` or `blueprint/…` path.
- Lost: on every red step a climber has to work out which file to open.
- Cause: the failing-step line carries journey, step and cause only; the model already has each declaration's file.
- Fix: framework, the failing step names `src/<thing>/<verb>.ts` and `blueprint/things/<thing>/verbs/<verb>.ts`.
- Status: fixed (#119): the failing step names the handler file and the declaration file.

## S-03 · climb · a missing span doesn't say what was there
- Hit: the checks author, climb property 2 (#110): `✘ "…": span allowance.spend.record missing`.
- Lost: the climber can't see which spans did occur.
- Cause: the spans check reports only the missing name.
- Fix: framework, the line says what was expected and lists the spans that came back.
- Status: fixed (#119): the line lists the spans that came back.

## S-04 · claim · a handler can't look a record up by a field
- Hit: the journey author, proving the spec satisfiable (#107): claiming a name needs "is this name taken?", and
  `Records` offers only `find`, `insert` and `update` by id; the scratch handlers used `Store.list`, which a handler
  can't reach.
- Lost: a climber with only `src/` stops at the first claim step.
- Cause: no lookup by field (or unique index) in the handler's records.
- Fix: framework, a declared unique field and `Records.findBy` in the handler's context (decision G4), check first.
- Status: fixed: the check (#118), the build (#120, #121) and Plugged In's handle name unique while claimed (#122). The
  spelling moves to G5's invariants (see the S-04 note below); the behaviour stays.

## S-05 · journeys · a starting world serves one journey
- Hit: the journey author (#107): a world that claims a name can be used by one journey only, so five near-copies.
- Cause: worlds share one database and names must differ.
- Fix: framework or journey API, a world parameterised per journey (or names minted per run).
- Status: parked (Goal 3 lead, 21 November 2026): the five worlds are near-copies but every stage 1 journey is green, and no planned journey needs a world shared by two journeys; M2's `founded` and `invited` worlds can each be per journey the same way. Owner: later.md (journey language). Revisit when a journey needs a world that two journeys share, or a world mints a value that must differ per run.

## S-06 · journeys · a world's `gives` returns only `s.last`
- Hit: the journey author (#107).
- Fix: journey API, `gives` names more than the last answer.
- Status: parked (Goal 3 lead, 21 November 2026): the journeys read what they need from the page and `s.last`, and no stage 1 or M2 journey needs an earlier answer from a world. Owner: later.md (journey language). Revisit when a starting world has to hand over an answer that is not its last call's.

## S-07 · journeys · a step can't compare against the previous answer
- Hit: the journey author (#107).
- Fix: journey API.
- Status: parked (Goal 3 lead, 21 November 2026): the journeys route around it with a world that gives the handle, and nothing in M2.02's list needs a comparison between two answers. Owner: later.md (journey language). Revisit when a journey must check a step's answer against the previous one and no world can give it.

## S-08 · journeys · a refused step leaves `s.last` unchanged
- Hit: the journey author (#107): one step relies on it; it should be stated, or `s.last` should hold the refusal.
- Fix: journey API, decide and document.
- Status: parked (Goal 3 lead, 21 November 2026): `a stranger cannot edit a page` states the dependency in one place, and it is green; the call to make is a documentation line, not a blocker. Owner: later.md (journey language). Revisit when a journey or the journey docs next say what `s.last` holds after a refusal.

## S-09 · journeys · no journey can send a malformed payload
- Hit: the journey author (#107): `InvalidPayload` can't be reached, so runtime refusals coverage stays 6 of 7.
- Fix: journey API, a raw payload step.
- Status: parked (Goal 3 lead, 21 November 2026): prove counts the runtime's own refusals but never requires them (`packages/prove/src/modules/evals/internal/run.ts:80`), so `InvalidPayload` unreached fails nothing. Owner: later.md (journey language). Revisit when a journey needs to send a payload its operation does not declare, which is also when S-14's undeclared-key hole matters.

## S-10 · scaffold · a handler scaffold misses declarations added after it was written
- Hit: the journey author (#107): four handlers had to be re-scaffolded to pick up new refusals.
- Fix: framework, K16 (#76) territory; recheck once #76 lands.
- Status: fixed (#76, K16): `ortho check` now warns when a declared refusal, state or step has no case in a handler that is already the project's (`packages/lint/src/modules/rules/internal/drift.ts`, checked by `e2e/m1/19-scaffold-explains.test.ts`, which names `AllowanceFrozen`). `ortho generate` still leaves an existing handler alone, by design: the warning is the answer.

## S-11 · grid · the CLI and MCP error cells can't be judged live
- Hit: the checks author (#110): `error.cli` and `error.mcp` need the refused call seen through each client.
- Fix: framework, `prove --through` (M2.08).
- Status: open, blocks M2.08, the story through the CLI and MCP, and the held-off cells `error.cli`, `error.mcp` and `invariant.cli`: `ortho prove --through cli|mcp` (M2.08, needs M2.05) runs a journey's steps through the clients and captures the refusal as data. `--through` exists nowhere in `packages/` today.

## S-12 · runtime · a reused request key with another payload is a defect (ledger HAN-10)
- Hit: Aaron's review of #95.
- Fix: framework, a typed built-in refusal `IdempotencyConflict` over HTTP, the SDK and the CLI; an early framework slice
  after #76 lands.
- Status: fixed (#116 the checks, #117 the build): `IdempotencyConflict` is the runtime's own refusal (`packages/language-effect/src/modules/handler/types.ts`; its exit 120 is in `packages/compiler/src/modules/model/internal/exits.ts:9`), reaching HTTP, the SDK and the CLI, and `e2e/m1/24-idempotency-conflict.test.ts` is green off the ratchet list.

## S-13 · wallets · a send that never reaches depth is a defect (ledger HAN-11)
- Hit: the 🔍 review of #104.
- Fix: framework, a typed failure in `SendRefused`; an early framework slice after #76 lands.
- Status: parked (Goal 3 lead, 21 November 2026): stage 1 has no wallet and no chain; the send's depth defect is a stage 2 refusal, and S-18's chain-settings slice must land first to reach it from a journey. Owner: later.md (stage 2 wallets, with S-18). Revisit when ST2.01 starts, or when S-18's chain settings are taken (#113 and #114 stay open).

## S-14 · describe and portal · journey redaction is three rules, not one (ledger HAN-12)
- Hit: the 🔍 review of #109 on m1 (advice item 5).
- Cause: `packages/compiler/src/modules/model/internal/journeys.ts` redacts a blank operation's payload and `emits` to
  public fields (undeclared keys hidden), but a completed operation's payload and `refuses` hide only declared non-public
  fields, so an undeclared key stays visible.
- Fix: framework, one redaction rule shared with the visibility module (M1.35, #95), check first; after #95 lands.
- Status: parked (Goal 3 lead, 21 November 2026): the leak needs a journey payload or refusal carrying a key the operation does not declare, and no journey can send one (S-09); a declared secret is redacted at every site today (`journeys.ts:14-17`, `:76`). Owner: later.md (journey redaction, one rule with the visibility module). Revisit when S-09's raw payload step is built, or before the release pass M7.13, whichever comes first.

## S-15 · errors · a plugin's error has no `_tag` when it runs from source
- Hit: the HAN-11 builder (#114): the check reads `_tag` on `SendNotIncluded` and `SendNotConfirmed`, but
  `Blueprint.error` leaves `_tag` unset until generated code names the class
  (`packages/orthograph/src/modules/errors/README.md:4`, `packages/projections/src/modules/api/internal/api.ts:28`).
- Lost: one stopgap, `packages/wallets/src/modules/submit/internal/names.ts`, which names the two classes from their
  identifiers; the wallet's other errors stay unnamed from source, and a minifier on the device path would mangle the
  name.
- Cause: a declared error's name comes only from generation.
- Fix: framework, `Blueprint.error` (or the runtime) derives `_tag` from the declaring export, check first; then
  `names.ts` goes.
- Status: parked (Goal 3 lead, 21 November 2026): the name is only needed on the wallet's device path (`packages/wallets/src/modules/submit/internal/names.ts`); Plugged In's errors are all named by generation, and stage 1 has no wallet. Owner: later.md (stage 2 wallets). Revisit when ST2.01 starts, or when a plugin's error is read by `_tag` from source in a journey.

## S-16 · MCP · a tool call carries no request key (ledger HAN-16)
- Hit: HAN-10's checks author (#116): an idempotent operation called over MCP can't be replayed, so
  `IdempotencyConflict` can't be reached there.
- Fix: framework, with M1.12's request key, check first.
- Status: parked (Goal 3 lead, 21 November 2026): a request key is optional (`packages/language-effect/src/modules/handler/service.ts:162`), so the story's single claim over MCP runs without one; only a replay through MCP needs it. Owner: M2.08 (journeys through the clients). Revisit when M2.08 replays a journey that sends a request key through MCP, which is `a name is claimed once`.

## S-17 · Codex on #95's code (ledger HAN-13, HAN-14, HAN-15)
- Hit: Codex's review of #116 (the code is #95's, M1.35).
- HAN-13: a request answer stored before the envelope change refuses its own retry after an upgrade. Parked to M7.03:
  no world outlives an upgrade before M7.
- HAN-14: the device SDK types a redacted answer as whole, so `answer.pin.length` type-checks and crashes. Parked
  (Goal 3 lead, 21 November 2026) to `later.md` (ST2.01), with the wallet's device path.
- HAN-15: the answer-shape eval lets a sign-in answer omit its issued token. Fixed: the eval requires every issued answer field (`packages/prove/src/modules/evals/issued.test.ts`).
- Status: parked (Goal 3 lead, 21 November 2026) for HAN-13 and HAN-14; HAN-15 is fixed (#268). HAN-14: the device SDK is the wallet's browser path. Owner: later.md (stage 2 wallets), revisit when ST2.01 starts. HAN-13 stays parked to M7.03. HAN-15 is fixed, so M2.05's sign-in journeys are no longer blocked on it.

## S-18 · prove · a device-path world can't hold its chain (blocks HAN-11)
- Hit: the journeys for HAN-11's two new wallet refusals (#113, #114). The coverage eval rightly asks for a journey
  reaching `SendNotIncluded` and `SendNotConfirmed`; none can be written.
- Why: `packages/prove/src/modules/prove/internal/device-host.ts:21-33` hard-codes depth 3 and one Anvil mining every
  second for every journey; the journey `Script` (`packages/orthograph/src/modules/journeys/types.ts:70-79`) has no way
  to hold mining; the wallet's send budget is chain-evm's 120 s default (`packages/chain-evm/src/modules/tx/service.ts:16`),
  renewed on every block, and the wallet reads no budget setting (`packages/wallets/src/modules/chain/service.ts:10-12`).
- Needs: chain settings a starting world declares (mining held or interval, depth, send budget), read by `deviceHost`
  instead of the constants, and passed to the wallet. A framework slice: decision, then check, then builder.
- Call (Goal 3 lead): park HAN-11 behind the climb. #113 and #114 stay open, unmerged; the slice is taken when a builder
  is free of S-04 and S-01 to S-03. No stub chain, no unreachable RPC, no coverage exemption.
- Status: parked (Goal 3 lead): HAN-11 waits behind the climb; the chain-settings slice is taken when a builder is free. Revisit at ST2.01, stage 2's first chain slice (S-13 waits on it too).

## S-19 · records · a unique value moved between holders in one call passes in memory, fails on D1 (ledger HAN-18)
- Hit: Codex's review of #118 (G4, S-04).
- What: a call that renames holder A `x`→`y`, then holder B `y`→`z`. The memory store checks uniqueness on the final
  values (`packages/language-effect/src/modules/records/internal/unique.ts`) and commits; D1's partial unique index checks
  each statement in write order and refuses the first, so the handler retries the same doomed batch 64 times.
- Needs: both stores check in write order, and a unique conflict a call makes with its own writes fails fast as a defect
  naming the field rather than retrying.
- Owner: the decision is G5's (📐 invariants-ripple, which settles write-order semantics in both stores and a self-made
  conflict failing fast, ordered before the invariant runtime slice); the build is the Goal 3 lead's, check first, any
  time after the starting curve. No stage 1 journey moves a unique value between holders.
- Status: fixed (#205 the checks, #227 the build, #229 the follow-up): the unit orders its writes, frees before takes, and the memory store applies them one at a time (ST1.11, ST1.12; check 31).

## S-04 note · the spelling of unique fields is open with Aaron (conductor, 19 November 2026)
- The conductor's recommendation to Aaron: `blueprint/things/<thing>/invariants.ts`, one named export per rule, e.g.
  `Blueprint.invariant.unique(Handle.fields.name, { while: [machine.states.claimed], refuse: HandleTaken })`, where the
  runtime refuses for the handler and states and fields are typed references.
- Aaron answered (19 November 2026): C, a per-thing `invariants.ts`, one named export per rule. G5 (📐 invariants-ripple)
  supersedes G4's spelling and keeps its runtime behaviour; its migration slice swaps Plugged In's one line.
- Until then: Plugged In may declare today's `unique: { name: { while: ["claimed"] } }` as one line, and the
  climb goes on. Today's spelling is not written into docs, the scaffold or the skills beyond what G4 and #118 already
  hold; when the answer comes, G4 is amended and the spelling changes in one slice.

## S-20 · CLI · a refusal's string fields print unquoted, so text can't be split back into fields
- Hit: Codex's review of #110 (the grid's refusal evals, `e2e/grid/src/modules/refusal-evals/internal/facts.ts:58`).
- What: the generated CLI prints a refusal as `[CODE] Name { a: v, b: w }` with string values unquoted
  (`packages/generators/src/modules/render/internal/cli.ts`), so a value holding `, b: ` reads as another field. The
  grid's error.cli and error.mcp evals parse that text and can be fooled either way.
- Needs: structured evidence for those cells (prove `--through` capturing the refusal as data, M2.08 with S-11), or a
  CLI rendering that quotes strings. The cells are off until `--through` exists; switching them on waits on this.
- Also (Codex on #110, 6c10efc8): the grid's refusal facts treat every field of a not-found refusal as undeclared, but the
  runtime's prehandle sends `NotFound({ _tag, id })` and the generated wire schema declares `id`
  (`e2e/grid/src/modules/refusal-evals/internal/facts.ts:48`). When these cells switch on, their facts come from the
  runtime's real refusal shapes, not the model's declared fields alone, and a test exercises a real not-found refusal.
- Owner: Goal 3 lead, with S-11 (`prove --through`).
- Status: parked (Goal 3 lead, 21 November 2026): the cells it guards (`error.cli`, `error.mcp`, `invariant.cli`) are held off in `e2e/grid/held-off.json`, so no switched-on cell is wrong today. Owner: M2.08, with S-11 (`prove --through`). Revisit when `--through` lands and the held-off cells are switched on; the not-found facts then come from the runtime's real shapes.

## S-21 · prove · a journey whose starting world fails reports 0 of 0 steps, so the curve can't say N
- Hit: the starting curve's dry run (the recorder from #110 over Plugged In, 19 November 2026). Five of seven journeys
  start from a world built by `handle.claim`, which dies on the empty handler; prove's report gives those journeys
  `total: 0` with `stopped`, so the curve reads 0 of 13 where the journeys hold more steps.
- Needs: prove's report gives a stopped journey its real step count (`total`, with `green: 0`), so "0 of N" is N.
- Owner: Goal 3 lead; a small prove slice, check first. It doesn't block the climb: "claim a handle" (8 steps) runs
  from no world, and climbing it makes the worlds that the other journeys start from.
- Status: parked (Goal 3 lead, 21 November 2026): every journey already reads all its steps green and the report says `no step ran` for a stopped one; only the count of an unwritten journey is wrong. Owner: later.md (prove report). Revisit when M2.07's tenancy journeys, which start from the `founded` and `invited` worlds, are climbed from red.

## S-22 · handle · "aaron cannot add a link before he has a page" and "aaron cannot claim a second name while he holds one": a handler can't find the caller's own handle
- Hit: the climb of "claim a handle" (steps 3 and 7; 5 of 8 green with everything else written). `link.add` must refuse
  `LinkNeedsHandle` when the caller holds no claimed name, and `handle.claim` must refuse `HandleAlreadyOwned` when the
  caller holds one. Both need "the claimed handle whose `owner` is this person".
- What: `Records` gives a handler `find` (by id) and `findBy` (by a declared unique field, G4), nothing else
  (`packages/language-effect/src/modules/records/types.ts:73`). `owner` is not unique on `Handle`
  (`examples/plugged-in/blueprint/things/handle/thing.ts:9` declares only `name`), so `findBy(Handle, "owner", person)` does
  not type-check, and `Store.list` is not a handler's. Prove's output was clear (it named the step, the file and the
  `BlankReached` death); the gap is in the spec and framework, not the report.
- Needs: either (a) the declaration `unique: { name: ..., owner: { while: ["claimed"] } }` on `Handle`, which is the very
  rule `HandleAlreadyOwned` states ("one person holds one name"), so both handlers use `findBy` and the store enforces it
  at commit (the journey author's file; the spelling moves to `invariants.ts` under G5); or (b) a handler-side lookup on
  any field (G4's option B, rejected there for the race). (a) fits G4 and is what the climber would write.
- Owner: Goal 3 lead (declaration by the journey author, check first). The climber has left `HandleAlreadyOwned` out of
  `src/handle/claim.ts` and `LinkNeedsHandle` blank in `src/link/add.ts` until it lands.
- Call (Goal 3 lead): declare the rule the spec states with G4's one-liner; ST1.19 moves it to invariants.ts.
- Status: fixed (#139)

## S-23 · profile · a handler can't find a handle's page, so `profile.get` can't list its links
- Hit: the climb of "claim a handle", step 6 ("the claim made a public page, with no links yet"). It is green only because
  `profile.get` answers `links: []` without reading the page: the page is found by `Profile.handle` (the handle's id), and
  `handle` is not a unique field, so no lookup reaches it. Nothing in this journey shows it; "add, order and remove a link"
  and "anyone reads a public page" will.
- What: the same gap as S-22, on `Profile.handle` (`examples/plugged-in/blueprint/things/profile/thing.ts`). `claim`
  inserts the profile but no later handler can ask for it from the handle.
- Needs: `unique: { handle: {} }` on `Profile` (one page per handle, in every state), so `findBy(Profile, "handle", id)` works.
  Same owner and route as S-22. Until then `src/profile/get.ts` has a hard-coded empty list that the link journeys will
  turn red.
- Owner: Goal 3 lead.
- Call (Goal 3 lead): declare the rule the spec states with G4's one-liner; ST1.19 moves it to invariants.ts.
- Status: fixed (#139)

## S-24 · climb · friction while climbing "claim a handle" (no framework fix needed to proceed)
- A fresh worktree runs nothing until `pnpm install` (the first `ortho` call dies with `ERR_MODULE_NOT_FOUND` for
  `orthograph`); the goal's prompt says nothing of it. A user's `ortho new` would not have this, a climber in a worktree does.
- Prove prints about 400 lines and the journey's red steps come before the per-operation eval lists; the first screen is
  the right one, but a climber filtering the output has to know to look for `journey … ✘`. Coverage lines ("reached by no
  journey") fail the run too whenever `--only` runs one journey of seven, so "10 failing" stays after every step is green.
- The scaffold's `Handlers.blank` placeholders gave the shape (step wrapping, refusal ifs) well; what it does not say is
  which `Records` call to use for "is this name taken", so the climber read `records/types.ts` and `examples/acme`.
- Status: parked (Goal 3 lead, 21 November 2026): friction found while climbing, with no fix needed to proceed. The scaffold's missing `Records` call for a unique field is ST1.17's (the scaffold header names the rule); the install line and `--only` coverage are lessons. Owner: ST1.17 for the scaffold, later.md for `--only` coverage and the worktree install line. Revisit when ST1.17 builds, and at the lessons step (loop step 5).

## S-25 · prove · a run can land on another run's world or Collector, and report wrong verdicts instead of failing
- Hit: the 🔍 reviewer of #140 re-ran `record.mjs --only "claim a handle"` in a fresh worktree while other sessions had
  wrangler, workerd and otelcol running on the same Mac. The first run gave 0 of 8: "telemetry missing", and `HandleTaken`
  on the very first claim. The second run gave 8 of 8.
- What: a prove run can reach another run's world or Collector, likely through a fixed port, and then reports wrong
  verdicts instead of failing clearly. Climb property 5 (the same result twice) breaks on a shared machine.
- Needs: prove runs on free ports and refuses a world it didn't start. Lint-hygiene's #133 on main moves prove to
  `--port 0` / `Worlds.anyPort`; check whether that covers the Collector too, after main next merges into goal/stage-1.
- Owner: Goal 3 lead.

- Status: fixed (#148: `ortho prove --port` defaults to 0, a free port)

## S-26 · names · a handler or journey can name a machine state only as a string
- Hit: the 🔍 reviewer of #142, on the climber's handlers and the journey author's journeys.
  `examples/plugged-in/src/link/order.ts:46` reads `subject.state === "removed"`, and the journeys refuse with
  `refuses(machine.notFrom, { state: "removed" })` (`add-order-and-remove-a-link.ts:79`, `release-a-handle.ts:42`).
- Lost: "a declared name is never written as a string outside `generated/`" (AGENTS.md) can't hold. Renaming a state in
  the blueprint leaves these strings stale, and a type-check catches only the ones typed against the state union.
- Cause: the compiler generates the state union type, and the model JSON lists the states as data, but no importable constant names each state.
- Fix: framework, generate a constant per machine (for example `LinkStates.removed`) from the blueprint, and point the
  scaffold, the handlers and the journeys at it. A check author then adds a lint or canon check that a state's name
  appears as a string only in `generated/`.
- Owner: Goal 3 lead, for a framework builder after the M1.42 client slice.
- Status: parked (Goal 3 lead, 21 November 2026): every state string is a spelling the types catch only where they are typed against the state union, and `machine.states.<state>` references now exist (ST1.14); moving the four string sites and a lint for them waits for a slice, and no stage 1 or M2 journey depends on it. Owner: later.md (declared names as constants). Revisit when a state is renamed in a blueprint, or when the lint rule for declared names is written.

## S-27 · prove · a journey check that throws kills the run instead of failing its step
- Hit: the checks author of #150, running the grid twice: `ortho prove` died with `TypeError: Cannot read properties of
  undefined (reading 'map')` at `examples/plugged-in/journeys/the-story.ts:44`, inside
  `expect((a) => a.links.map(…))`, after an answer came back without `links`.
- Lost: one red step stops every journey after it and the report file, so the curve records nothing for that run, and
  the climber sees a stack trace instead of `✘ step: answer …, expected …`.
- Cause: `packages/prove/src/modules/journeys/internal/checks.ts:66` (`expect`) and `:72` (`expect-equal`) call the journey's
  `check.pick(env["last"])` with nothing around it.
- Fix: framework, run `pick` inside `Effect.try` and turn a throw into the step's failure, naming the step, the answer
  and the error. A checks author first adds a prove test with a journey whose `pick` throws.
- Owner: Goal 3 lead, for a framework builder.
- Status: fixed (#264)
- Notes from #264: the failing line names the answer's top-level keys and never its values (a sign-in answer holds a token, and the report is kept), a `pick` that
  returns a value holding itself reads `[Circular]` where it loops back, and a throw of anything (a string, a `RangeError`) fails the step. The guard around the
  `refuses()` class is in the code but effectively unreachable: the compiler refuses a bad `refuses()` argument first, so no test can reach it. Journey code that
  throws outside a check is S-32.

## S-28 · model · a value's pattern is not in the model, so evals, docs and clients can't see it
- Hit: the 🔍 of #154 (Codex's P2 on `output-schema/internal/sample.ts`): the MCP output-schema eval builds a sample answer from the model's
  value types, and a text of `{type: "text", max: 254}` (Acme's email) cannot be given a value, because the model does not say it must look like an address.
- Lost: nothing yet. The eval reports such a field as unjudged (red) when the run recorded no value for it, instead of trying a value that cannot occur.
- Cause: the model records a value's constraints only as `max`. `Values.email` (`packages/orthograph/src/modules/values/service.ts:36`) carries its
  pattern only inside the Schema, so evals, docs and clients can't see it.
- Fix: the framework records a value's pattern or format in the model.
- Owner: Goal 3 lead, for a framework builder.
- Status: parked (Goal 3 lead, 21 November 2026): the grid's stopgap (`max === 254`) keeps the output-schema eval judging Acme's email, and no other pattern-bearing value is declared. Owner: later.md (the model records a value's pattern). Revisit when a second value with a pattern is declared, or M2.05's person email needs a sample the heuristic cannot give.

## S-29 · prove · a handler that imports a rule `invariants.ts` doesn't export makes prove wait forever
- Hit: with `oneHolderPerName` deleted from Plugged In's handle rules while the claim handler still imports it,
  `ortho prove` waits forever: the world never gets its up. Seen by the checks author of #241 (ST1.19's checks) on a
  stand-in, and reproduced by the 🔍 of #241 on its own wrong builds.
- Lost: a builder would see a hang instead of a named error, and CI would wait until the job's own timeout. Check 34
  stops its own prove at 240 s so it fails rather than hangs.
- Cause: traced by the 🔍 of #253. Prove prints nothing. Wrangler's log (`.ortho/prove/wrangler.log` in the copy) holds
  esbuild's error, coloured even when written to a file with `CI=1`: `✘ [ERROR] No matching export in
  "../../blueprint/things/handle/invariants.ts" for import "oneHolderPerName"`. Wrangler stays up waiting for file
  changes, and prove keeps polling for the world: that is the hang. The polling is `bringUp` in
  `packages/prove/src/modules/world/internal/wrangler.ts`.
- Fix: framework. Prove exits non-zero within 60 s (the bound check 33 uses) and names the file and the missing
  export. A checks author first adds the case beside check 33.
- Owner: Goal 3 lead, for a framework builder.
- Status: fixed (#265: `bringUp` reads wrangler's log while it waits, and stops wrangler and fails with esbuild's error the moment the worker cannot build; checks 33 and 36 pass); check written (#253)

## S-30 · compiler · a blueprint that still declares G4's `unique` property compiles silently and loses its rule
- Hit: the 🔍 of #245 (ST1.20) put a stale `unique: { owner: {} }` on Plugged In's `Handle` behind `@ts-ignore`;
  `ortho model` exited 0, the model carried no rule and the migration no index, with no problem message.
- Lost: `tsc` refuses the property in a typed project, so only plain JavaScript, an ignored type error or a skipped
  typecheck reaches it; there the constraint is dropped without a word and two rows may then hold one value.
- Cause: ST1.20 removed G4's reader in `packages/compiler/src/modules/model/internal/describe.ts`, and nothing took its
  place to refuse the retired property.
- Fix: framework. The compiler refuses a thing carrying `unique`, naming the thing and pointing at
  `Blueprint.invariant.unique` in `invariants.ts` (G5). A checks author first adds the case.
- Owner: Goal 3 lead, for a framework builder.
- Status: fixed (the compiler refuses a thing carrying `unique`, #254); checks written (#251)

## S-31 · model · an operation's spine can't name a rule that owns no refusal
- Hit: Codex on #249 (ST1.22). `profile.onePagePerHandle` refuses nothing, yet `handle.claim` writes a profile and the
  runtime checks the rule before the commit; the portal's rules stop on `handle.claim` names only handle's two rules.
- Lost: an operation that can break only a rule with no refusal shows no rules stop, and one that can break both kinds
  lists only some of what the runtime checks.
- Cause: the compiler's `breakersOf` (`packages/compiler/src/modules/model/internal/invariants.ts:102`) works out every
  rule an operation can break (`breaks`), but the model keeps only `refusals` (`operations.<op>.invariants`, refusal to
  rule), so the wire never carries a rule with no refusal on an operation.
- Fix: framework. The model carries each operation's `breaks`, and the portal's spine reads it. Check 28 pins the stop to
  the rules the model attaches today (`e2e/m1/rules-fixture.ts`), so a checks author first moves it to `breaks`.
  Amended 21 November 2026 (`design/decisions/S31-breaks.md`, point 4): a database step with `writes` unset stays
  unknown and breaks the rules of a machine-less thing; `writes: []` is reads only. `profile.get` declares it and has no
  rules stop; `handle.claim` declares `writes: [Profile]`.
- Owner: Goal 3 lead, for a checks author and then a framework builder.
- Status: fixed (#269, `b1d424e0`; #255 was closed in its favour)

## S-32 · prove · journey code that throws while the compiler describes a blueprint kills the run with no report
- Hit: the 🔍 of #264 (S-27), reading what the `Effect.try` there does not cover. Not run on a planted journey yet: read from the code.
- What: S-27 covers a throw inside a check. Three other places run journey code outside it. A throw inside a journey's `steps(...)` builder is caught first by the
  compiler (`storiesOf`, `packages/compiler/src/modules/model/internal/journeys.ts:89`, called from `describe.ts:254`), and a starting world's `makes` and `gives`
  run at `packages/prove/src/modules/journeys/service.ts:73-80`. A throw in any of them ends `ortho prove` with a stack trace and no `--report` file.
- Lost: as in S-27, the curve records nothing for that run, and the climber sees a stack trace instead of a failed journey naming the file.
- Cause: nothing wraps journey code there; S-27 wrapped only the check's `pick` and the refusal's class.
- Fix: framework. A throw while describing a journey fails that journey (named, with the error's message) and the other journeys still run; a throwing
  `makes` or `gives` fails the journey that declared it. A checks author first adds the cases beside `throwing-check.test.ts`.
- Owner: the compiler (a later slice, for a framework builder).
- Status: parked. Trigger: a climber's journey throws in a `steps(...)` builder or a world's `makes`/`gives`, or the next prove slice touches `storiesOf`.


<!-- S-32 is PR #264's, not merged yet: its entry goes here. -->

## S-33 · compiler · a refusal field of another schema than the rule's key field compiles, and the duplicate claim ends in an internal error
- Hit: Codex on #273 (Goal 4). `refusalOf` (`packages/compiler/src/modules/model/internal/invariants.ts:83`) checks only the
  names of the fields a rule's refusal carries against the key, not their schemas.
- Reproduced (21 November 2026, on a copy of Plugged In with `HandleTaken` changed to
  `Blueprint.error({ name: Blueprint.uint(32) }, { exit: 10 })`, over the text key `Handle.fields.name`):
  `ortho model` exits 0 and prints `operation handle.claim  refuses HandleTaken, HandleAlreadyOwned, ...`.
  `ortho prove` then fails the journey: `"a taken name is refused": expected refused with HandleTaken, failed with 500`
  (and the same for "another person's request key is not aaron's"), with `prove ✘ 2 failing`.
- Lost: a mismatched refusal is never refused at compile time; `settleViolation`
  (`packages/language-effect/src/modules/handler/internal/invariants.ts:26`) copies the caller's row value into the
  refusal's field, so a duplicate claim answers with an internal error where the declared refusal belongs.
- Cause: the compiler compares field names (`key.includes(field)`), never the field's value schema.
- Fix: framework. The compiler refuses a refusal field whose value is not the rule's key field's own, one line naming
  the thing, the rule and the field. The comparison is strict (the lead's call, on the reviewer's advice): a value whose
  schema has no named type (`Blueprint.value(Schema...)`) is equal only when it is the same object; any other value
  (text, number, id) is equal when its kind and its numbers match. A separately declared equal `Blueprint.uint(32)`
  twice, or the same id prefix, passes; a text with a larger `max` than the key's is refused. The message says to declare
  the field with the key field's own value (share the constant). Checks: `packages/compiler/src/modules/model/refusal-field-schema.test.ts`, held on
  `packages/compiler/expected-failing/refusal-field-schema.txt` (G11).
- Owner: Goal 3 lead, for a framework builder.
- Status: fixed (#288)

## S-34 · compiler · two rules of one thing whose names differ only in case compile, and the world's migrations never finish
- Hit: Codex on #275 (Goal 4). Rules `byURL` and `byUrl` on one thing are accepted.
- Reproduced (21 November 2026, on a copy of Plugged In with both rules added to `handle/invariants.ts`): `ortho model`
  exits 0. `ortho generate` writes `CREATE UNIQUE INDEX "handle_byURL"` and `CREATE UNIQUE INDEX "handle_byUrl"` to
  `0001_things.sql`, and `ortho prove` exits 2: `prove couldn't run: the local database couldn't be made: Error: ✘ [ERROR]
  index handle_byUrl already exists: SQLITE_ERROR`.
- Lost: SQLite compares index names without regard to case, so the second `CREATE UNIQUE INDEX` that
  `packages/projections/src/modules/server/internal/worker-config.ts:67` writes fails and the world never comes up.
- Cause: the compiler checks no rule name against the others of its thing.
- Fix: framework. The compiler refuses two rule names on one thing that match when case is ignored, naming the thing and
  both rules. The same name on two different things stays allowed (the index is prefixed by the thing). Checks:
  `packages/compiler/src/modules/model/rule-name-case.test.ts`, held on
  `packages/compiler/expected-failing/rule-name-case.txt` (G11).
- Owner: Goal 3 lead, for a framework builder.
- Status: fixed (#288)

## S-35 · language-effect · the pre-commit unique check rescans every written row once for each row it checks
- Hit: Codex on #283 (Goal 4). `holderOf` (`packages/language-effect/src/modules/records/internal/holder.ts:28-31`) loops
  `for (const id of written(rule.thing))` and calls `find` for each, and the unit's check (`internal/unit.ts`) calls it for every row it writes.
- Reproduced (21 November 2026, a call that inserts n rows under one unique rule, then `unit.check`): the looks at a key
  (`holds` and `ruleKey`) are 40,400 for 200 rows and 361,200 for 600 (9 times for 3 times the rows). `find` itself walks the
  call's held rows (`heldFor`), so the time is cubic: 3,000 rows had not finished after minutes.
- Lost: a bulk write (a seed, an import, a handler that writes a few thousand rows) holds its worker for minutes, with the
  work synchronous, so no timeout can stop it.
- Cause: the held rows are never indexed by rule and key; each row's lookup walks all of them and reads each again.
- Fix: framework. Index the call's held rows by rule and key once per check, so each lookup is constant time. Checks:
  `packages/language-effect/src/modules/records/unique-bulk-scale.test.ts`, held on
  `packages/language-effect/expected-failing/unique-bulk-scale.txt` (G11). They count the looks at keys through the rule
  module's seam (at most 6 a row), not the clock; a 4,000 ms bound on the 3,000-row call is the secondary check. The seam is a
  contract: keys are computed through `ruleKey`/`holds` imported from `internal/unique.ts`, at least once per row; the count check
  depends on it (the ratio test fails with "0 looks: keys are not computed through internal/unique.ts" when it sees none). A scan
  that compares every pair on keys worked out once calls neither, and takes about 137 ms at 3,000 rows, so a 40,000-row call with
  a 2,000 ms bound (pairwise 8 to 11 s, linear about 300 ms) is the backstop for it and for a build that ignores the contract; it runs only
  once the 3,000-row time test has passed, so a quadratic build cannot hang CI.
- Owner: Goal 3 lead, for a framework builder in `language-effect`.
- Status: open; checks written (#292), build next

## S-36 · language-effect · S-19's write-order ratio sits on its bar under load
- Issue: [#304](https://github.com/AaronAbuUsama/architect/issues/304) (K33: snags are issues from 21 November 2026; this file keeps the record).
- Hit: the 🔍 of #292. `write-order-scale.test.ts:60` measured 16.0055 against a limit of 16 once on a loaded Mac, then passed three times.
- Fix: a checks author backs the ratio with a deterministic count, as #292 does for S-35, and keeps the time bound with headroom.
- Owner: Goal 3 lead, for a checks author.
