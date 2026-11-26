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
   own error. **Addition (Goal 16's lead):** when the outer and an inner declare one error name with two shapes or exits,
   the compiler refuses it, naming both operations; it never merges them.
3. **The whole inner pipeline runs, for the same caller, inside the outer's one commit.** Its access rule (judged for the
   caller, never as system), what its payload names and `<Thing>NotFound`, its from-check, its handler, its answer's
   declaration, its move and event, and its G5 rules. It never commits on its own: its writes and journal entries join
   the outer's commit, so a conflict runs the whole call again and a refusal anywhere writes nothing. What it wrote is
   visible to the outer handler afterwards, and to a later inner step. It keeps no request key of its own. The inner runs
   in its own span, named after it, inside the outer's step span (`step.kind: operation`), and its events name it as
   their operation. The generated server wires it as `Handlers.serve({ ..., operations: { draft: entryDraftServed } })`.
   **Addition:** an outer the caller may run never widens what the inner admits. A refused inner access is the outer's
   `NotAllowed`, and nothing is written.
4. **What the compiler refuses.** An inner operation whose thing lives in another store (K3 item 5's rule, as for
   `writes`), an inner operation that is no verb of the app, and a cycle anywhere in the step graph: an operation running
   itself, and A running B running A (**addition**).
5. **#972 folds in.** `job-offer.accept` declares `applicant: Blueprint.step.operation(jobApplicantAccept)`, so the second
   thing moves by its own declared operation, with its from-check and its event, and a move its state doesn't allow is
   refused with that thing's own `NotFrom`. #972 closes when #1079's build lands. CX-appraisals' `goal.roll-up` and
   CX-recruitment's second call can fold into the child's own moves later; that is an app change, not this slice.

## The checks

- `packages/language-effect/src/modules/handler/inner-operation.test.ts`: the runtime over `storeMemory`.
- `packages/compiler/src/modules/model/inner-operations.test.ts`: the model and the compiler's refusals.
- `e2e/m2/13-inner-operations.test.ts` (m2 check 13): the generated server over local D1, through HTTP, read back from the D1 file.

acme's generated files don't move (the checks build their own scratch ledger), so G12's paired landing doesn't apply.

## Known limits of the checks

- An inner handler given the call's records without the log watcher (`logs.watching`) passes: no field the scratch ledger
  reads is secret, so nothing shows that a value the inner read would be left out of its logs. The watcher's contract is
  judged for operations in `handler/internal/decided*.test.ts`.
- An inner operation's access judged without the app's `mounts` passes: no inner operation in the checks is allowed to a
  `service` role.
- A clash between two inner operations' error names (rather than the outer's and an inner's) isn't judged on its own.
  Today the compiler already refuses two error classes of one name anywhere in a project ("declared twice"), so it can't
  arise.
