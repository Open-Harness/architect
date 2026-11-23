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

### 9. `observedRow` is not changed yet: check 62 pins the old value

GOAL17-stage-one call 8 (and the slice 6 README, point 14) says `observedRow` is `{ listed: "inferred", ... }`. Check `62-the-mappings` (slice 10) pins `OBSERVED = { listed: "explicit", unlisted: "none", unnamed: "none" }` at its line 17,
for GitHub's and Slack's admission rows, and passed before this slice. I changed it, and two of its tests went red (the repository row, and the Slack channel rows); a builder may not edit a check and the ratchet must exit 0, so I put
the old value back. The gate does not read this row (it reads the policy's cells, with call 8's defaults), so checks 19 and 23 pass either way. **Asked of 62's author:** change `OBSERVED` to `inferred`, then `observedRow` follows.

## What still fails, and what stays blank

- `22-stage-one-doors` stays on the ratchet: prove cannot load a journey that imports `@orthograph/stand-in-model` or `outbox` until slices 8 and 9 build the harness surface (`s.runner`, `settle`, `outbox.rows`, `models.script`, the `actor:` cast form).
- Blank, to the slice that owns each: `agent.tell`, `agent.close`, `ticket.report`, `ack`, `attach`, `note`, `policy-changed`, `request-status`, `retry`, `thread.follow`, `unrelated`, `trigger.handback`, `input.store`, `input.route`, `mandate.revalidate`
  (its payload names the ticket, not the mandate its move is about), the outgoing messages, `superagent.fill`, `reap`, `boot`, `update`, `eval.read`, `eval.context`, `source.*`, `account.sync`, `policy.sync`, `thread.bind`, `closed`, `unsubscribe`,
  `trigger.requeue`, `reevaluate`, and the prompts' `compose` and `preview`. Each needs the agents, a connection or an adapter call.

## Supersedes

- `design/decisions/GOAL17-derived-reads.md`: "A pinned or derived read is not served before slice 7" → "A pinned or derived read is served (GOAL17-slice7-build call 4)"
