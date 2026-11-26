# CX-feature-contracts: a contract one feature declares and another fills when the app is built

**Decided 26 November 2026** by Goal 16's checks author for gap 3 of `CX-composable-pieces.md` (#1133), within the
building agent's call on architecture (`AGENTS.md`, "Who decides"). The checks that judge it come in the same pull
request. Capxul's own use of it comes later, in the app's slices, once the build lands. It says "feature" throughout,
never "piece" (Aaron, 26 November 2026, CX-features).

## Why

Capxul is split into features, each a feature plugin mounted when its app is built (`CX-composable-pieces.md`,
section 1). Two of them need a seam in their own rules that a later feature fills: `payroll` needs *the tax on a slip*,
which `payroll-tax-us` works out, and `ledger` needs *a check before a posting*, which `budgets` makes. Today a feature
can name another only by needing it (`needs`), which points the wrong way: payroll would have to need every country's
tax feature. An adapter's call (`Blueprint.step.call`) points the right way but leaves the app's commit and has no
access to its records. So a slip can't get its tax lines from a feature payroll doesn't know, and a budget can't stop a
spend (#1133).

## The calls

1. **A feature declares a contract** in its own `blueprint/contracts/<name>.ts`, as the file's default export:
   `export default Blueprint.contract({ description, input, output, errors, optional })`. `input` and `output` are field
   maps, like an operation's payload and answer, each field a value or another declaration's field
   (`Slip.fields.gross`). `errors` are error classes the owner declares in its things, the only refusals a filler may
   make. A contract is **required** unless it says `optional: true`. It is named from its path and its owner's mount:
   `contracts/slip-tax.ts` of the feature mounted as `payroll` is `payroll.slip-tax`, and a mount under another name
   renames it with the mount, as a feature's things are renamed. Only a feature declares one: the app's blueprint has no
   `contracts/` folder, and the compiler already refuses one as a place it doesn't read.
2. **Another feature fills it** in its own `blueprint/fills/<name>.ts`:
   `export default Blueprint.fill(slipTax, { description, input, output, errors, steps })`, with its code in the
   package's `src/fills/<name>.ts`, a handler of the same form as an operation's (`(input, context) => Effect`, its
   `steps` in `context.steps`). The filler writes the contract's shape out again, from the values it imports, rather than
   reading it off the contract object. That is on purpose: the filler is built against one version of its owner, and
   the app may install another; the compiler holds the two shapes side by side and refuses a difference, so a contract
   that changed under its filler stops the build instead of failing in a running app. A fill has no `allowed`, no move,
   no event and no request key: it is never at a door (no route, no MCP tool, no CLI command), and only an operation
   that runs its contract reaches it.

   **A fill's steps** are `database` steps and gap 1's `operation` steps (`Blueprint.step.operation`, CX-inner-operations)
   only. A `call`, `contract` or `wait` step in a fill is refused (call 8): a fill computes inside its caller's commit,
   and an outside call, a wait or a contract of its own would make that commit hang on something no caller declared.

   **A fill's steps are writes by the filler feature**, judged by CX-feature-ownership's rule (its calls 2, 3 and 6), as
   an operation's steps are: a `database` step writes the things its `writes` names (a fill has no subject, so a
   `database` step naming none writes nothing), and an `operation` step writes nothing itself. So a fill writes only its
   own feature's things. Writing the contract owner's things, or the calling feature's, is refused with
   CX-feature-ownership call 6's sentence, word for word, where `<operation>` is `the fill <filler mount>.<file>` (as
   `the fill payroll-tax-us.slip-tax`). The way out it offers is the owner's operation, run as the fill's `operation`
   step. One owner says who may write what: CX-feature-ownership, not this record.

   **Its handler's type** is `FillHandler<typeof fill, R>`, exported from `@orthograph/language-effect` beside `Handler`:
   `(input: InputOf<F>, context: { readonly steps: StepRunners<…> }) => Effect<OutputOf<F>, ErrorOf<F>, R>`, typed from
   the fill's own declaration. So a fill handler that fails with an error its fill doesn't declare, answers another
   shape or runs a step its fill doesn't declare is a type error.
3. **Only the owner and the features that depend on it touch a contract.** A feature may run a contract from its
   operations when it is the owner or depends on the owner, and may fill one only when it depends on the owner: it lists
   the owner in `needs`, or needs a feature that does, through any depth (CX-open-sets call 2's rule). The graph is the
   model's: each mount's `needs` (`mounts.<name>.needs`), which holds a conditional need (`Blueprint.need(owner, { when })`)
   only when the mount picked its option. Depending runs one way: a feature the owner needs does not depend on the
   owner. Siblings don't count: two features that need one feature don't depend on each other (budgets and payroll both
   need payments, and budgets may neither run nor fill payroll's contract). The owner never fills its own contract, since it can run
   its own code. A required contract is filled whether or not any operation runs it. The app depends on every feature it mounts,
   so its own operations may run a mounted feature's contract, and none whose owner isn't mounted (an unmounted feature
   declares no contract the app has). The app does not fill one: a business with its own tax
   rule writes it as a small feature of its own. A feature that is installed but not mounted is never read, so what it
   would fill fills nothing and refuses nothing.
4. **An operation runs a contract through a step:** `steps: { tax: Blueprint.step.contract(slipTax) }`. Its handler
   calls `steps.tax(input)`, which answers the filler's output, or `undefined` when the contract is optional and no
   mounted feature fills it (then nothing runs: no tax feature, no tax lines; no budgets, no check). The model records
   the step as `{ name: "slip.submit.tax", type: "contract", contract: "payroll.slip-tax" }`, and adds the contract's
   errors to the operation's `errors`, filled or not, so the operation's wire and SDK list them whichever feature fills
   it. An operation run as an inner step (CX-inner-operations) brings its contracts' errors up to its outer, as it brings
   every refusal it can make (CX-inner-operations call 2): they are its errors.

   **The handler's type.** In `Handler<typeof op>`, `steps.tax(input)` takes the contract's input and answers its output
   for a required contract, and its output or `undefined` for an optional one. Its failure is the contract's errors, and
   those errors pass through the handler's own error channel (they are the operation's). An error no contract it runs and
   no declaration of its own names is still a type error.
5. **The filler runs inside the caller's commit.** The input is checked against the contract's input (a wrong one is the
   caller's bug, a defect), the fill's handler runs with the caller's records, its writes join the caller's, and its
   output is checked against the contract's output (a wrong one is the filler's bug, a defect). One commit lands the
   caller's writes and the filler's together; a refusal from the filler is the operation's refusal, under the
   contract's error and its exit, and writes nothing, the caller's rows included. It runs for the same caller, with no
   access rule of its own: the operation that runs it already judged who may call. It runs in the step's span,
   `<operation>.<step>`, marked `step.kind: contract`, which names the contract and the filler's mount. How the
   generated server hands each operation its fillers is the builder's.
6. **The model holds each contract** under `contracts.<name>`: its owner's mount and file, `optional`, `input`,
   `output` (each a field map in the model's field form, `{ value: … }`), `errors`, and `filler`: the mount that fills
   it, its fill's file and the things its steps write (renamed for that mount), or `null` when none does.
7. **One filler per contract per app.** Two, from two features or two fill files of one, are refused. Choosing among
   several by a row's data, such as each employee's place of work, is a later decision of its own
   (`CX-composable-pieces.md`, section 2).
8. **What the compiler refuses**, each naming the files it is about, and so both features:
   - a contract step in an operation of the app whose owner isn't mounted, word for word:
     `<operation file>: step <key> runs a contract of <owner package>, which isn't mounted: mount it (ortho add feature <owner package>)`;
   - a `call`, `contract` or `wait` step in a fill, word for word:
     `<fill file>: the fill <name> declares the <type> step <key>: a fill holds only database and operation steps`;
   - a fill's write of another feature's thing, with CX-feature-ownership call 6's sentence (call 2 above);
   - a required contract no mounted feature fills, naming the contract, its file and that a feature filling it must be
     mounted;
   - two fills of one contract, naming the contract and both fill files;
   - a fill whose shape isn't the contract's, naming the fill's file, the contract's file and the field: an input or
     output field the contract has and the fill lacks, one the fill has and the contract lacks, or one whose model
     differs. A field is compared whole, as the model holds it: its value, whether it may be left out, and the field or
     named value it is declared from. So the fill declares each field from what the contract declares it from (the
     slip's `country`, not a bare text of the same length). An error the fill declares that its contract doesn't is
     refused too, even when another contract of the same owner declares it;
   - a fill by a feature that doesn't depend on the contract's owner, or by the owner itself, naming the fill's file and
     the owner's package;
   - a contract step in an operation of a feature that is neither the owner nor depends on it, naming the operation's
     file and the owner's package;
   - a `contracts/` or `fills/` folder in the app's own blueprint, naming the file (today's "not a place the blueprint
     reads" refusal stands).
9. **Where a contract can't run.** A filler joins its caller's commit, so a contract runs only where there is one, as an
   inner operation does (CX-inner-operations call 4). Each is refused word for word:
   - on an operation that runs on the caller's device (`runs: "client"`, which only a plugin supplies):
     `<operation file>: a client operation can't run a contract: it has no store and no commit for a filler to join`;
   - on an operation of a chain-stored thing, today's sentence for a step a chain operation can't take:
     `<operation file>: <operation> declares the contract step <key>: an operation of a chain-stored thing reaches only its own store and the account adapter, so it has no contract step`;
   - a fill writing a thing that lives in a chain store:
     `<fill file>: the fill <name> writes <thing>, which lives in a chain store: a fill runs inside its caller's commit, so it writes only things in a database`;
   - a cycle: a contract whose fill runs, through its `operation` steps and their operations' steps at any depth, an
     operation that runs the same contract. It is refused at the fill's file, naming the contract and the path:
     `<fill file>: the fill <name> runs <contract> again, through <step path>: a contract never runs itself`, where the
     path is each operation and contract it passes, joined by ` → `.

## Why these and not others

- **Not an operation as filler.** A filler that were an operation of its feature would get the inner-operation
  machinery (CX-inner-operations) for free, but it would also be at every door, need an `allowed` that means nothing
  here, and need a thing to be an operation of. A tax computation and a budget check are neither callable nor about one
  row. A fill is the smaller thing: a handler with a shape.
- **Not a typed shape only.** The filler's handler is typed from its own declaration, and the compiler compares that
  declaration to the contract's in the model. A filler typed from the contract object alone would compile against
  whatever owner was installed and could not be judged at build.
- **Errors listed whether or not filled.** An operation's wire should not move with which feature fills its contract;
  its declared errors are the contract's.

## Interim

Until the build lands, nothing fills payroll's tax contract and a slip has no tax lines (`CX-composable-pieces.md`,
section 5, gap 3). `payroll-tax-us` stays mounted from its first slice, filling nothing (#1131). Once the build lands,
Capxul's payroll slice declares `contracts/slip-tax.ts` (optional), `payroll-tax-us` fills it, its ledger declares
`contracts/posting-check.ts` (optional), and `budgets` fills it in slice 12.

## Checks

- `packages/compiler/src/modules/mounts/contracts.test.ts`, `contracts-refused.test.ts` and `contracts-touch.test.ts`
  (who may run and fill what, judged pair by pair against the model's needs graph), with the scratch features in
  `mounts/fixtures/contracts/testing.ts`: the model (calls 1, 3, 4, 6, 7) and the refusals (calls 2, 3, 8 and 9), over
  an in-memory source of installed feature packages. It is not `mounts/testing.ts`, which #1175 adds. The cases that run
  an `operation` step (an inner operation's errors, a cycle, the way out of a fill's foreign write) need #1079's build
  too, and their ratchet lines say so.
- `packages/language-effect/src/modules/handler/contract-types.test.ts`: the handler's and the fill handler's types (calls 2
  and 4), one tsc run over `test/fixtures/contract-types/` (`accepts.ts` and one-fault `refuses/` files, no cast), as
  #1079's `inner-operation-types.test.ts` does.
- `e2e/m2/15-feature-contracts.test.ts` (m2 check 15): the runtime and the doors (calls 2, 4 and 5), in copies of acme
  with two installed feature packages, made with the real `ortho generate` and run in a world over local D1. One copy
  mounts the filler, one leaves it installed and unmounted, and one makes the contract required with no filler.

acme's own files don't move (the checks build their own copies), so G12's paired landing doesn't apply.

## Known limits of the checks

- The step's span and its attributes (call 5) are stated, not judged: the m2 check reads the doors and D1, not traces. So is
  the runtime counting a filler's refusal as a refusal in its own telemetry (not a defect): the doors already refuse it
  by the model's errors, so leaving the contract's errors out of the runtime's refusal set shows only in metrics.
- A fill whose writes live in another store than the operation that runs it can't commit with it (K3 item 5). The
  compiler should refuse it; no check plants one, since the scratch features have one store.
- A defect from a wrong input or output (call 5) isn't planted at the door: a handler that sends a wrong shape is the
  same defect an operation's wrong answer is, judged for operations in `language-effect`.

## Supersedes

Nothing. Gap 3's draft in `CX-composable-pieces.md` (section 2, "contracts filled at build time"; section 5, gap 3)
stands; this record says how it is spelt (`Blueprint.contract`, `Blueprint.fill`, `Blueprint.step.contract`) and what
the model, the compiler and the runtime do.

Once #1193 (CX-feature-ownership) is on `main`, this record's pull request merges it in and adds "a fill's steps" to
CX-feature-ownership call 2's list of what writes a thing, with a line here for each phrase that changes.
