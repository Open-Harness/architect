# GOAL17-slice7-build: the calls slice 7's build made, and what it leaves for slice 9

Decided 23 November 2026 by the 🔨 builder of Goal 17, slice 7 (`AGENTS.md`, "Who decides"), on `goal-17/s7-stage-one-build`. Slice 7 is "stage one's
handlers", done when slice 6 passes (`e2e/superagent/18` to `23`, `GOAL17-stage-one`). Evidence is the branch's commits; checks 19 (six journeys, one `ortho prove`
run), 20, 21 and 23 pass, and 22 stays on the ratchet.

## The calls

### 1. Every optional or nullable field is a nullable column; a boolean is INTEGER; a struct, union or unknown is JSON (snag #685, Capxul's #742 items 1 to 3)

- **Migration** (`packages/projections/.../worker-config.ts`, `columnOf`): a field that is `Blueprint.optional` or whose encoded form is a union with null (`FieldModel.nullable`, new, set on
  a thing's fields only so no answer or payload model changes) is a column without `NOT NULL`; a `Blueprint.bool()` is `INTEGER NOT NULL`; the rest are `TEXT NOT NULL` as before.
- **Store** (`packages/host-cloudflare/.../rows.ts`): the column's form is decided by the field's encoded schema, never the text. An array, struct, `Unknown`, `Any` or a union that is not only
  strings is JSON; a boolean is bound as 1 or 0 and read back as `true` or `false` whatever affinity the column read it with; a NULL column of an optional field leaves its key out of the row.
- **Evidence:** `store.test.ts` ("a row's values") on a real D1 in workerd, `columns.test.ts` in projections. No other example's generated output changed.

### 2. A thing that lives as an actor has facts (snag #685 gap 1)

`/_world/facts/record` answers an actor's row, from its Durable Object, in the shape of a table row (`WorldHost.actors`, `actorTables`, written by the generated server only for an app with actors).
Without the `ACTORS` binding it answers 404, not a database error. Evidence: `world.test.ts`. This is what lets a starting world call `agent.open`.

### 3. `versions:` is served by the framework (GOAL17-stage-one call 9)

- `Blueprint.thing` adds one field, `saved: { at, by, from }`, to a thing with `versions:`; the thing's type carries it (`Saved`).
- `Versions` (`packages/language-effect/src/modules/versions/`) serves `save`, `get`, `history` and `restore`. Every save is a new row with the next `revision`, the newest is current, and a save made from
  any other version is refused with the operation's own `StaleRevision { current }`. The newest row is touched in the save's commit, so two saves from one base cannot both land.
- The generated server serves those four verbs of a versioned thing, when the thing's key is a field of the payload, with `Versions.handler(...)` and imports no handler file for them
  (`isVersioned` in the compiler, shared by the generator's missing-handler check). I deleted the six blank handlers (`policy.save`, `get`, `history`, `restore`; `prompt-set.save`, `history`).
- `policy.restore`'s move is now `from: []`, as `save`'s is: a restore makes a new version, so it has no row to move. `Settings` has no key in its payload, so `settings.save` is the app's own handler on the same rules.
- `Superagent`'s `versions: { key: "id" }` keeps its declaration; `superagent.update` is not served (no `revision` field), and stays blank.

### 4. Pinned and derived reads are served (GOAL17-derived-reads, section 6)

`Reads.serve` runs a derive's looks through the store and the pure `is`, answers the adds, and pages a derived list as the record says (scan at most 200 roots; a page may hold fewer rows than `page` and still have a
`next`). `only` is the read's own filter, never the caller's, for a stored list too (`proposal.waiting`, `assignment.waiting`). A derive that looks at problems (`superagent.health`) still refuses `ReadNotServed`:
no store lists the problems yet. The compiler's model says `ReadNotServed` only for that one, so `ticket.stage`, `ticket.waiting` and the stored pinned lists no longer declare it.

### 5. The blueprint now matches the records

The payload and answer of `trigger.receive` (call 2), Thread's one state (call 5), `eval.expire` (call 5, with `Eval.deliveredAt`, which `eval.delivered` writes and `eval.due` judges overdue from), `observedRow` (call 8),
`ticket.stop`'s one database step (`ticket`, `mandate`, `assignment`), the closing row of `stageOf` ("Stopping"), and `decision.route`'s description (call 10). Two rules the handlers need are declared: one trigger per
`(superagent, source, event)` and one thread per `(superagent, source, key)`.

### 6. `agent.open` records the Agent and nothing more

The real agents on Pi Durable are slice 9's. `agent.open` makes the Agent from its payload (idle, in its own actor); `agent.tell` and `agent.close` stay blank.

### 7. Handlers that cannot call an operation write the records themselves

Nothing in the framework lets one operation call another. So `eval.due` writes the queued Evals and the expiries (it may now move an instance's state with `Records.update(..., state)`, which journals nothing), and
`ticket.stop` writes the Mandate's and the Assignment's new states in its own commit. `EvalStarted`, `EvalExpired`, `MandateWithdrawn`, `AssignmentEnded` and `AssignmentInterrupted` are therefore not emitted by those calls.
Slice 9, with the outbox doors, must give a call the means to emit them (or `due` must call `eval.start` and `eval.expire` through it); `ticket.accept` likewise emits `TicketCreated` only.

### 8. The gate does not see tickets yet

`gate.of` takes the tickets that follow a thread, but `intake` cannot import `tickets` (the reverse is true), so `trigger.receive` passes none. A ticket's `accept` must write what follows a thread where intake can read it;
that is the follow-up journeys of `22`, with the doors of slices 8 and 9.

### 9. `observedRow` is `inferred` (after #760 changed check 62)

Flipped to `{ listed: "inferred", unlisted: "none", unnamed: "none" }` once #760 landed; check 62's `observedRow` tests pass and its expected-failing file is deleted. The history, kept as written:

GOAL17-stage-one call 8 (and the slice 6 README, point 14) says `observedRow` is `{ listed: "inferred", ... }`. Check `62-the-mappings` (slice 10) pins `OBSERVED = { listed: "explicit", unlisted: "none", unnamed: "none" }` at its line 17,
for GitHub's and Slack's admission rows, and passed before this slice. I changed it, and two of its tests went red (the repository row, and the Slack channel rows); a builder may not edit a check and the ratchet must exit 0, so I put
the old value back. The gate does not read this row (it reads the policy's cells, with call 8's defaults), so checks 19 and 23 pass either way. **Asked of 62's author:** change `OBSERVED` to `inferred`, then `observedRow` follows.

### 10. Review of #756: what the 🔍 pass changed

- **A first save cannot race.** A thing with versions holds one rule it does not declare: one row per revision of its key (`versionRule` in `orthograph`; `FieldModel`'s sibling `InvariantModel.framework`).
  The compiler puts it in the model, so the migration makes the index (`policy_oneVersionPerRevision` over `superagent, revision`; `settings_...` over `revision`, since Settings is keyed by its own id), and the
  generated server hands the runtime `Versions.rulesOf(...)`. The second of two first saves conflicts at commit, runs again, and is refused as stale. `settings.save` has the same rule with no code of its own.
- **A lost race at that rule is a retry, not a defect.** `versionRule` marks the rule `framework`; a call whose pre-commit check finds it broken by another save that already committed goes
  through `settleViolation` as the call's retry (`Conflict`), so it reruns and is refused `StaleRevision { current }`. Test: the first attempt reads no version, the rival commits its revision 1, the check finds it.
- **Codex's three findings on #756.**
  - **`records.update`'s `state` was dropped** by the watching wrapper every served handler is given (`handler/internal/decided.ts` forwarded three arguments). So `ticket.stop` left the mandate held and the
    assignment pending, and `eval.due` never saved its expirations. It is forwarded now; tests go through `Handlers.serve` (`state-update.test.ts`, `ticket/stop.test.ts`, `eval/due.test.ts`). No journey caught it:
    check 19 has no ticket, and no step of it reads a mandate, an assignment or an eval's state back. The steps that would are `22`'s "a stop withdraws the mandate" and "a stop cancels or closes from the state it reads", which wait on the harness's doors.
  - **An eval's clock is the superagent's active clock** (GOAL17-pause): `eval.delivered` records the wall clock less `pausedFor`, and `eval.due` judges overdue on the same (`modules/clock`), standing still while paused. An eval that spans a pause does not expire for it.
  - **One live eval per thread is enforced at commit** (`oneLiveEvalPerThread`, a partial unique index over queued and delivered). A rule may say `retry: true` (it replaces call 10's `framework` flag on the rule): breaking it is a lost race, the call reruns and meets what the winner made. A pass that loses makes nothing.
- **A derived list checks its cursor** with the same `CURSOR` check as a plain list (`NotAllowed`).
- **`eval.due` reads each kind to its end,** a page of 100 at a time, where it read the oldest 1000. Test: 1100 triggers already covered, then one new one (`due.test.ts`).
- **The migration is `0009_columns.sql`** (`0008_inbox.sql` is another's).
- **`Versions.restore` is tested:** an old revision becomes a new version from its content; a never-saved one, and one made from an older version, are refused.
- **Line counts.** `compiler/.../model/types.ts` was 303 lines and `describe.ts` 275 before this slice (both over by `wc -l`; the lint rule counts lines of code, and passes on both). This slice added about 5 and 2.
- `observedRow` stays `explicit` until #760 changes check 62.

## What still fails, and what stays blank

- `22-stage-one-doors` stays on the ratchet: prove cannot load a journey that imports `@orthograph/stand-in-model` or `outbox` until slices 8 and 9 build the harness surface (`s.runner`, `settle`, `outbox.rows`, `models.script`, the `actor:` cast form).
- Blank, to the slice that owns each: `agent.tell`, `agent.close`, `ticket.report`, `ack`, `attach`, `note`, `policy-changed`, `request-status`, `retry`, `thread.follow`, `unrelated`, `trigger.handback`, `input.store`, `input.route`, `mandate.revalidate`
  (its payload names the ticket, not the mandate its move is about), the outgoing messages, `superagent.fill`, `reap`, `boot`, `update`, `eval.read`, `eval.context`, `source.*`, `account.sync`, `policy.sync`, `thread.bind`, `closed`, `unsubscribe`,
  `trigger.requeue`, `reevaluate`, and the prompts' `compose` and `preview`. Each needs the agents, a connection or an adapter call.

## Supersedes

- `design/decisions/GOAL17-derived-reads.md`: "A pinned or derived read is not served before slice 7" → "A pinned or derived read is served (GOAL17-slice7-build call 4)"
