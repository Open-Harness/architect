# CX-inner-operations: a handler runs another operation of the same app inside its own commit

**Decided 26 November 2026** by the checks author for snag #1079 (thread T-01a21857-3261-7475-9bb1-47631ce21d5d), with
Goal 16's lead (thread T-01a2093c-8643-7794-9ce7-5dbc110ce4aa), who said yes to each call below and added three. It folds
#972.

## Why

Capxul's payroll found it (#1079). `payroll-entry.submit-slips` has to post an accrual Journal Entry. It can't run
`journal-entry.create` and `journal-entry.submit`, so it writes the Journal Entry, its lines and its GL Entries itself.
The ledger's own rules (7a's fiscal-year rule) are judged a second time in the payroll handler, the journal entry's
events aren't written, and every later slice that posts to the books would copy the same writes. #972 is the same gap
from the other side: `job-offer.accept` can't move the applicant, because a handler can't move a second thing's state.

## The calls

1. **Declared as a step.** `steps: { draft: Blueprint.step.operation(entryDraft) }`, with the operation imported from its
   verb file, as `Blueprint.step.call(...)` names a call. The model records it as
   `{ name: "run.pay.draft", type: "operation", operation: "entry.draft" }`. The handler runs it as
   `steps.draft(payload)`, which gives the inner answer or fails with the inner refusal. No step, no runner: a handler
   can't run an operation it didn't declare.
2. **Its refusals are the outer's.** The compiler adds every refusal the inner operation can make to the outer's model:
   its declared errors to `errors`, and all of them (its `<Thing>Not<State>`, `<Thing>NotFound`, NotAllowed and G5
   refusals) to `refusals`, its rules to `invariants`, through any depth of inner operations. The SDK, docs and wire then
   list them, and the runtime counts them as refusals, never defects. A handler may still catch one and map it to its
   own error. An idempotent inner's `IdempotencyConflict` stays its own: run inside another operation, it keeps no
   request key, so the outer never refuses with it. **Addition (Goal 16's lead):** when the outer and an inner declare one error name with two shapes or exits,
   the compiler refuses it, naming both operations; it never merges them.

   **The handler's error channel (26 November 2026, from the 🔍 review of #1176).** The types say the same as the model.
   `steps.<key>(payload)` fails with every refusal its inner operation can make: its declared errors, `NotAllowed`,
   `<Thing>Not<State>`, `<Thing>NotFound`, and every refusal of the inner's own inner steps, at any depth. `Handler<O>`
   lets out the operation's declared errors and every refusal of each of its operation steps, at any depth, so the
   scaffold's `yield* steps.draft(...)` compiles with no cast, and a handler may refuse with an inner's refusal itself.
   Nothing else widens: an error no operation declares, the refusal of an operation no step runs, the outer's own
   refusal in an inner's handler or runner (refusals go up, never down), and one sibling step's refusal in another's
   runner all stay type errors. So do the runtime's refusals (`NotAllowed`, `<Thing>Not<State>`, `<Thing>NotFound`)
   in the handler of an operation with no operation step: they come with an inner step, never without one. An inner
   step widens the error channel and nothing else: the handler's answer, the runner's payload (whole, nothing added) and
   its answer (field by field), and the step keys (a handler gets its own steps' runners, never its inners') are judged as
   before, for an operation with steps or none.
3. **The whole inner pipeline runs, for the same caller, inside the outer's one commit.** Its access rule (judged for the
   caller, never as system), what its payload names and `<Thing>NotFound`, its from-check, its handler, its answer's
   declaration, its move and event, and its G5 rules. It never commits on its own: its writes and journal entries join
   the outer's commit, so a conflict runs the whole call again and a refusal anywhere writes nothing. What it wrote is
   visible to the outer handler afterwards, and to a later inner step; what the outer wrote before it is visible to it.
   The outer's own move is applied as it always is, once the outer handler answers, so an inner sees the outer's subject
   in the state the call found it. A step runs as often as the handler calls it, each run its own move and event, all
   in the one commit. It keeps no request key of its own. The inner runs
   in its own span, named after it, inside the outer's step span (`step.kind: operation`), and its events name it as
   their operation. The generated server wires it as `Handlers.serve({ ..., operations: { draft: entryDraftServed } })`.
   **Addition:** an outer the caller may run never widens what the inner admits. A refused inner access is the outer's
   `NotAllowed`, and nothing is written.
4. **What the compiler refuses.** An inner operation whose thing lives in another store (K3 item 5's rule, as for
   `writes`), an inner operation that is no verb of the app, and a cycle anywhere in the step graph: an operation running
   itself, and A running B running A (**addition**). It also refuses an operation step where today's gates refuse a
   `database` step or a `call` step: on an operation of a chain-stored thing (a contract reaches only its own store and
   the account adapter) and on an operation that runs on the caller's device (no store, no journal), as outer or inner.
5. **#972 folds in, the other way round.** The applicant's own operation runs the offer's: `job-applicant.accept`
   declares `offer: Blueprint.step.operation(jobOfferAccept)`. Its handler first finds the applicant's offer through
   `job-offer.oneOfferPerApplicant`. When the offer is still `awaiting`, it runs `steps.offer(...)`, which moves the offer
   by the offer's own rules, refusals and event, visible to the handler afterwards (call 3). An offer already accepted
   on its own is left as it is. The handler then refuses `OfferNotAccepted` unless the offer is accepted, and makes its
   own move, judged by the applicant's machine (a move its state doesn't allow is refused with the applicant's own
   `NotFrom`). Both moves and both events land in one commit, or neither. No operation that moves the applicant skips
   the offer rule, whoever calls it. `job-applicant.reject` does the same with `job-offer.reject`: it runs it when the
   applicant's offer is `awaiting`, and moves alone when there is no offer or the offer is already settled. The offer's
   operations stay callable on their own. The two-call flow goes, and so do the journey steps that make it. #972 closes
   when #1079's build lands; the recruitment change is the app's, not this slice.

   **Open, for Capxul's app change (Goal 16's lead, 26 November 2026).** #972's own hole is a caller running
   `job-offer.accept` directly: the offer is accepted and the applicant is left unmoved. This decision doesn't close it,
   since the framework gives an operation no way to admit only callers that are other operations. Capxul closes it in
   its own `-check` slice on `goal/capxul` once #1079's build lands, by one of two choices it makes there: the offer's
   accept and reject stop being callable by a person (only the applicant's operations run them), or the applicant's
   accept stays a separate call the journeys make, as today. Until then CX-recruitment's two-call flow stands. This
   slice touches no Capxul file or journey. CX-appraisals' `goal.roll-up` can fold
   into the child's own operations the same way later.

## The checks

- `packages/language-effect/src/modules/handler/inner-operation.test.ts`: the runtime over `storeMemory`, the commit;
  `inner-operation-rules.test.ts`: the inner operation's own rules and its span. The scratch ledger is `handler/testing.ts`.
- `packages/language-effect/src/modules/handler/inner-operation-types.test.ts`: the handler's error channel (call 2), judged by
  one tsc run over `test/fixtures/inner-operation-types/`: `accepts.ts` compiles with no cast, and each file in `refuses/` is
  one of its handlers with one fault, an error on that line alone, three deep at most. An error anywhere outside the
  fixture (in the framework's own types) is no clean compile.
- `packages/compiler/src/modules/model/inner-operations.test.ts`: what the model records;
  `inner-operations-refused.test.ts`: what the compiler refuses. The scratch ledger is `model/testing.ts`.
- `e2e/m2/13-inner-operations.test.ts` (m2 check 13): the generated server over local D1, through HTTP, read back from the D1 file.

acme's generated files don't move (the checks build their own scratch ledger), so G12's paired landing doesn't apply.

## Supersedes

- CX-recruitment: "When #972 lands, the second call folds into the offer's moves" → "When #972 lands, the applicant's own accept and reject run the offer's (CX-inner-operations, call 5)"

## Known limits of the checks

- An inner handler given the call's records without the log watcher (`logs.watching`) passes: no field the scratch ledger
  reads is secret, so nothing shows that a value the inner read would be left out of its logs. The watcher's contract is
  judged for operations in `handler/internal/decided*.test.ts`.
- An inner operation's access judged without the app's `mounts` passes: no inner operation in the checks is allowed to a
  `service` role.
- No inner operation runs on the caller's device: the device gate (call 4) is stated, but only the chain gate is judged.
  A device operation exists only when a mounted plugin supplies it (`internal/device.ts`, `RUNS_NEEDS.client`), so a
  scratch ledger can't make one.
- A clash between two inner operations' error names (rather than the outer's and an inner's) isn't judged on its own.
  Today the compiler already refuses two error classes of one name anywhere in a project ("declared twice"), so it can't
  arise.
- The error channel is judged by fields, not by name. A declared error's `_tag` is a `string` in the type, so tsc tells
  two errors apart only by their fields: an error with every field of an allowed one (or with an `id` or a `state` text
  field, which `<Thing>NotFound` and `<Thing>Not<State>` carry) is let through. Each error in the fixture has a field no
  other has. Narrowing `_tag` to the class's export name is generated code's (errors/types.ts), not this slice's.
- Extra keys on a handler's answer aren't judged by the type check: an answer returned from `Effect.gen` is inferred, and
  tsc never checks an inferred object for excess keys, under today's `Handler` or any. The runtime refuses an answer
  outside its declaration (`inner-operation-rules.test.ts`).
