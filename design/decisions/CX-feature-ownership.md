# CX-feature-ownership: a feature writes only its own things

**Decided 26 November 2026** by Goal 16's checks author for gap 4 of `CX-composable-pieces.md` (#1134), within the building agent's
call on architecture (`AGENTS.md`, "Who decides"). The checks that judge it come in the same pull request. It uses "feature" for what
`CX-composable-pieces.md` calls a piece (Aaron, 26 November 2026, CX-features, #1157). It comes after gap 1 (#1079,
`CX-inner-operations.md`), whose in-commit call is the one allowed way to write another feature's thing.

## Why

Capxul is being split into features, one package each, mounted when the app is built (`CX-composable-pieces.md`, section 1). Every
feature's things live in the app's one database, so a boundary between two features is a rule about who may write what, not a store
edge (section 2, "Rules every contract keeps"): a feature writes only its own things, except through an in-commit call its owner offers.
Nothing checks it today. Payroll's submit writes `JournalEntry`, `JournalEntryAccount` and `GLEntry` itself, so the ledger's rules are
judged a second time in payroll, and every later feature that posts would do the same. Once each is a feature, nothing would stop it.

## The calls

1. **Who owns a thing.** A thing a feature's mount brings (`blueprint/things/` of its package, renamed for the mount) is that mount's:
   its owner is the feature, known by its mount's name. Each mount is its own feature, so a package mounted twice is two owners. The
   app's own things are the app's. The app is no feature: it composes the features it mounts and depends on all of them.
2. **What writes a thing.** In the model's words, per operation: its move writes its subject (a move from no state creates it, any other
   moves it); a `database` step writes the things its `writes` names, or its subject when it names none; `writes: []` writes nothing,
   and so do `wait`, `call` and gap 1's `operation` steps (the operation a step runs writes what its own declaration writes). Every
   operation counts, whoever runs it: a person or an agent, the keeper (a move made by time), the runtime on an event (`on:`), or
   another operation inside its commit (gap 1). An operation a feature adds to another feature's thing, by a folder of verbs with no
   `thing.ts` (`M1-plugins.md`), is that feature's, whosever thing it is declared on.
3. **The rule.** An operation of a feature may write only that feature's things. The compiler refuses any other write, so
   `ortho check`, `ortho generate` and every command that compiles refuse the project. The app's operations may write any thing, its
   own or a feature's, and the app may still add verbs to a feature's thing (`M1-plugins.md`, unchanged). The draft's "may name only
   things of its own plugin or the app's" is read that way: an app step names any thing, a plugin step only its plugin's. A feature
   can't name an app's thing at all, since a package never imports the app that mounts it.
4. **The allowed way is the owner's operation, run inside the commit** (gap 1, `Blueprint.step.operation`). Running another feature's
   operation is no write by the feature that runs it: the inner operation's writes are its owner's, judged where it is declared. So a
   feature's own operation that writes another's thing is refused once, at its own file, however it is run, and the operation that
   runs it is refused nothing for it. Gap 1's own rules (one store, no cycle, the inner a verb of the app) stand beside this one.
5. **Reading is allowed.** A feature may read another's thing (`Blueprint.read`, or an operation on it that writes nothing: no move
   and `writes: []` or no `database` step), link to it (a field typed by its id), name it in a payload, and react to its events.
   Section 2 makes links references only and reports read across features. An operation a feature adds to another's thing that
   writes only the feature's own things passes: the thing it is declared on is its subject, never written. `examples/superagent`
   does exactly this today (`tickets` adds `follow` and `unrelated` to `intake`'s thread, writing only its own subscription, and
   `handback` to `intake`'s trigger, writing nothing), and it compiles under the rule.
6. **What the refusal says.** One problem per operation and thing it may not write, opened by the file that declares the operation
   (after the mount's file, as every problem of a mounted feature is): `the feature <writer> writes <thing> in <operation>
   (<how>), and <thing> is the feature <owner>'s: a feature writes only its own things.` `<how>` names every way that operation writes
   that thing, `move <key>` and `step <key>`, joined by "and". Then either `Run one of <owner>'s operations that write it inside this
   commit instead, as a step (Blueprint.step.operation): <operations>`, listing, sorted, every operation of the owner's mount in the
   model that writes the thing by any way of call 2 (one the app's mount omits isn't in the model, so it isn't offered), or, when there
   is none, `<owner> offers no operation that writes it to run inside this commit (Blueprint.step.operation): ask its owner for one`.
   Every name is the model's: the mount's name and the thing's and operation's names under it. An installed feature that isn't mounted
   is never read, so it refuses nothing.

## Interim

Capxul's things are all the app's until its split lands, so the rule changes nothing there today. When payroll becomes a feature, its
submit posts through `ledger.post` inside its commit (gap 1) instead of writing the ledger's lines; until gap 1 is built, a poster stays
in the app. The model gains no field for this: an operation's `from` and a thing's `from` already say whose each is.

## Checks

- `packages/compiler/src/modules/mounts/ownership-refused.test.ts` (12): each way of writing, refused with what call 6 says; a feature
  that doesn't need the owner; an unmounted feature; other mount names; an omitted operation.
- `packages/compiler/src/modules/mounts/ownership.test.ts` (5): a feature's own writes by every way, reads and links, the app's writes
  and the allowed way compile, each beside the one wrong write, refused. The scratch books are `mounts/ownership-testing.ts`.
- `e2e/m2/16-feature-ownership.test.ts` (m2 check 16): the `ortho check` and `ortho generate` doors, in a copy of acme with two
  installed feature packages.

acme's generated files don't move (the checks build their own scratch books), so G12's paired landing doesn't apply.

## Known limits of the checks

- A thing an adapter brings (its errors' things) isn't judged: no operation writes one in any check, and this record says nothing of it.
- A package mounted twice isn't judged: call 1 makes each mount its own owner, but no check mounts one package twice.
- Whether a feature may run an operation of a feature it doesn't need is gap 1's (its draft: "an operation of a piece it depends on"),
  not judged here.

## Supersedes

Nothing. Gap 4's draft in `CX-composable-pieces.md` (section 5, on `goal/capxul`) stands; call 3 says how its "or the app's" is read.
