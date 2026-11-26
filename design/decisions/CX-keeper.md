# CX-keeper: the keeper fires moves made by time (M8.10)

**Status: decided, 26 November 2026,** by Goal 16's ✍️ author for issue #1199 (K1), under AGENTS.md "Who decides". It
fixes the keeper's surface for the builder of M8.10 before the build starts. The Safe machines
(`CX-safe-machines.md`, #1194) declare three moves made by time (the personal Safe's `recover`, the company setup's
`observe` on a backoff to a one-day park, and its `recover` every minute), and S3a (#1170) and S3b (#1196) wait on them.

**Settled before this, and not reopened:** K23 section 3 (the keeper is a built-in principal that calls only moves made
by time; entering a state sets the thing's timer, leaving clears it, no scans; the request key is the thing, the move
and the due instant); `M8-checks.md` calls 2 to 4 and 8 (a clock step answers `{ now, fired }`; a journey that moves
time has a world of its own; `s.keeper.run(op, payload, { due })`; `ORTHO_KEEPER_DELAY`); `M8-07-timers-and-quiet.md`
(the world's durable timer table, the wake route `WorldWakes`, the generation fence I2); the spike
`design/spikes/world-clock.md` (every keeper job is counted work).

## The problem, in code

The table and the route exist, and nothing uses them for moves:

```ts
// packages/host-cloudflare/src/modules/timers/README.md
// A durable row is woken by its kind through the wake route (`WorldWakes`, a map of kind to wake that the generated
// `World` answers, empty today; ...). (the keeper, M8.10, and Goals 8 and 10 each add a kind)
```

```ts
// packages/prove/src/modules/journeys/service.ts:61-63
// The keeper's call is not built yet (M8.10): it refuses, never pretends.
call.kind !== "clock-call" && kept.has(call.actor) ? "time is not built yet: M8.10 (a call made as the keeper)" : undefined;
```

Proving `e2e/fixtures/m8/moves` today (`goal/capxul` at `730873b0`): `a missed payment lapses` ends `✘ 0/5`, its lapse
step answers `fired: []`, and the clock steps of later journeys are refused `BadMove (the world's clock never goes back)`,
because every journey shares one world's clock.

## The calls

1. **The wake kind is `keeper`.** The generated `World` registers it in `WorldWakes` (`{ keeper: ... }`) for a
   blueprint with a stepped or scaled clock, and the generated Worker's `WorldEntry.work(env, wakes)` gets the same map.
   A real world's alarm fires the same kind. The wake runs the move in the world's own isolate, counted under the row's
   owner (M8.07 call 10), and returns once the operation's run holds its own token.

2. **The arming key is (thing, move, generation).** A row's owner is the move's operation name
   (`desk.expire`), so `NeverQuiet` and `GET /_world/clock` name it; its name is the instance's id (`dsk_...`), so
   `DurableTimers.set(at, owner, name, wake)` keeps one row per instance and move. The wake is
   `{ kind: "keeper", thing, move, id, due, generation }`, `due` as ISO 8601 with milliseconds and `generation` the
   world's generation when the row was set. To move a row, the keeper clears it and sets it again (the shape of
   `DurableTimers`: setting a pending row again keeps the first).

3. **When a row is set, moved or dropped: after every committed move of the thing, from the record as committed.**
   The operation spine does it after the commit succeeds, inside the call's own counted work, so the world is not quiet
   until the row is in the table. A refused or failed call changes no row. For each move made by time on the thing's
   machine that is not `lazy`:
   - the thing is now in a state outside the move's `from`: **drop** the row (`clear`); there is nothing else to drop, no scan;
   - the thing is now in a state in the move's `from`: the row's due is worked out as call 4 or 5 says, and the row is
     **set**, **moved** (when its due changed) or **kept** (when it did not);
   - **a due already fired is never armed again**: its request key (thing, move, due) is used, whatever the answer was.

4. **How `.every` re-arms.** When the thing enters a state in the move's `from` and has no row, the due is the
   period's first instant strictly after the commit's instant, worked out from its anchor (K23 section 4: from the
   thing's field, or on the calendar in its zone). After the keeper's own firing of that move commits and the thing
   stays in a `from` state, the next due is the first instant strictly after **the due just fired**, never after the
   firing's instant: a late keeper (`ORTHO_KEEPER_DELAY`) does not push the dates. Any other move that keeps the thing in
   a `from` state keeps the row as it is. A firing whose due is already past when it is set fires where the world stands
   (M8.07 call 4), one due at a time, in order.

5. **How an `after` re-arms on a self-move.** `after(field, span)` is due at the committed record's `field` plus `span`.
   It is worked out again after every committed move that leaves the thing in a `from` state, the keeper's own firing
   included, so **a self-move that writes the field forward re-arms the move** at the new instant, and one that leaves it
   as it was arms nothing, because that due has fired (call 3). That is how the Safe machines back off: `observe` is
   `after("nextCheckAt", "0 seconds")`, and each stay in its state writes `nextCheckAt` further out, until a move
   leaves the state and drops the row. A field with no value arms nothing. A span may be `"0 seconds"` for `after`
   (due at the field's own instant), which the compiler refuses today (`time` module: "a whole number ... like
   \"14 days\"" requires one or more); it allows zero for `after` and still refuses it for `every`. A row due at or
   before the world's instant fires at the next step of a stepped clock, where the world stands.

6. **The keeper runs the move through the normal pipeline, as the keeper principal.** A firing is one call of the
   move's operation by `Blueprint.keeper`, with payload `{ <thing>: id }` and the request key (thing, move, due): the
   role check, the replay, not-found, the from-check, the handler, the answer check, the move, the invariants (G5) and
   the commit, each as for any caller. Nothing is bypassed, and the keeper may call nothing else (K23 section 3,
   `keeper.ts`). A refusal is an answer, not a failure: it writes nothing, its deciding log is written as for any caller
   (G5 section 5, eval 9), the clock step still answers 200, and the due counts as fired (call 3), so a refused move is
   not retried in a loop; the thing waits for its next committed move. A defect in the handler fails the step as
   `WakeFailed` (M8.07 call 5) and the row goes back.

7. **What a clock step reports.** Each `fired` entry is `{ thing, move, due }`, plus `refused: "<refusal name>"` when
   the run was refused, plus the run's `trace` for prove. Prove records each run as a call of the operation by the
   keeper (actor `keeper`), with its trace and journal, so the ten evals judge the keeper's runs like anyone's: a keeper
   refusal has its deciding log (eval 9) and counts for coverage (eval 8), and the events of the runs are the step's
   journal (`M8-checks` call 2).

8. **A stale row is fenced by its generation.** A reset empties the table (M8.07 call 1) and moves the generation on.
   A keeper wake whose `generation` is not the world's runs nothing, writes nothing and is not reported in `fired`; a
   run already under way when the reset comes is refused by the world's write fence (M8.07 I2, `world/internal/fence.ts`).
   A journey that moves time gets a world of its own from the environment's `starts` (`M8-checks` call 3, which M8.07
   left to this slice), so nothing one journey arms fires in another.

9. **Time-fired moves need only durable timers, not workflows** (the conductor, 26 November 2026). The keeper is the
   table, the wake and an ordinary call; nothing waits across steps. Signature collection is what needs workflows
   (`gap-signature-collection`). So `world-clock-keeper` needs `timers` only.

## The checks

`e2e/m8/05-the-keeper.test.ts`, over `e2e/fixtures/m8/keeper` and `e2e/fixtures/m8/keeper-backoff`, ratcheted in
`e2e/m8/expected-failing/05-the-keeper.txt`. They are the done check for #1199; `e2e/m8/03` is the wider M8.04 check
the keeper also turns.

| # | What | Journey |
|---|---|---|
| 1 | a desk held at nine expires at ten, when the clock steps past the hour, and not a minute before | `a-held-desk-expires-after-an-hour` |
| 2 | a desk released at half past nine does not expire | `a-released-desk-does-not-expire` |
| 3 | a beacon lit at nine pings at ten, eleven and twelve in one step, and stops when doused | `a-beacon-pings-every-hour` |
| 4 | a booking the keeper would seat at a taken table is refused `TableTaken`, writes nothing, keeps its state, is not retried, and has its deciding log | `a-taken-table-refuses-the-keeper` |
| 5 | a row armed in one journey's world never fires in another's; after a warm reset, a row from before it does not fire | `a-desk-left-held`, `a-fresh-world-fires-nothing-old`, and the front-door half |
| 6 | a watch's `observe`, `after("nextCheckAt", "0 seconds")`, re-arms on each self-move that writes `nextCheckAt` forward (one, two, four hours), parks on the third, and fires nothing after | `a-watch-backs-off-and-parks` |

## Supersedes

- `docs/canon/status.md` (`gap-signature-collection`): "stage 3's signature collection and the keeper rest on workflows" → "stage 3's signature collection rests on workflows; the keeper does not (CX-keeper)"
- `docs/canon/status.md` (open items, 5): "Stage 3's signature collection and the keeper rest on workflows, which have no decision or spike" → "Stage 3's signature collection rests on workflows, which have no decision or spike; the keeper needs only timers (CX-keeper)"
- `docs/canon/status.md` (`world-clock-keeper`): "| spiked | framework | — | — | none |" → "| building | Capxul | 1.0 | getting paid | goal-16 |"
- `design/history/artifacts-2026-11-21/scope.html` and `design/history/retired-2026-11-23/scope.md` (dated records, words kept): "Stage 3's signature collection and the keeper rest on workflows" gains "Superseded by CX-keeper, 26 November 2026"
