# K16a: building the scaffold that explains itself (M1.44, M1.45)

Decided 19 November 2026 by the 🔨 builder of M1.44 and M1.45, while building
[`K16-the-scaffold-explains-itself.md`](K16-the-scaffold-explains-itself.md). Each call below is where the build met
something K16 didn't settle, or where two checks disagreed. None changes what a user of Orthograph sees beyond K16.

## Where it lives

- `packages/projections/src/modules/handlers/internal/`: `words.ts` (the shared sentences: who may call, a field's
  label and visibility, a thing's files, every refusal with who gives it), `header.ts` (the front matter, and
  `handedIn`: the subject, `refs.<field>` and a minted id, read from the payload's refs and a creating move),
  `body.ts` (steps, refusal blocks, the `Match`, the answer), `scaffold.ts`, `paths.ts` (`machinePaths`) and
  `stubs.ts` (`renderJourneyStubs`). Both are exported from the handlers module and from `@orthograph/projections/shared`.
- `packages/lint`: two warnings beside `required-step-used`, `outcome-chosen` and `declared-error-named` (K16 f).
  `ortho check` passes them `outcomes` per handler file (moves with more than one outcome).
- `packages/orthograph`: `Operation` gains a sixth type parameter, its move, inferred by `Blueprint.operation`, so the
  machine's literal states reach the handler's `move`.
- `packages/cli`: `ortho add journeys <thing>` (`modules/add/internal/journeys.ts`), which depends on
  `@orthograph/projections` for the stubs.
- `packages/compiler`: a journey holding blanks is listed under `model.blanks` (by file) and carries `blanks`;
  `packages/prove` skips it, printing `journey <file> skipped: it still has blanks (ortho check names them)`.

## Calls

1. **`renderHandlerScaffold(op, path, model)`: the model is optional, not required.** K16 says required. The handlers
   test that predates K16 calls `renderHandlerScaffold(op)`, and test files are type-checked, so a required model
   would turn it red. Both callers pass the model; with none, the scaffold says only what the operation holds.
2. **`Outcome` is exported only for a move with more than one outcome**, and is computed in the generated file
   (`NonNullable<(typeof declaration)["move"]>["to"][number]`) rather than from `@orthograph/language-effect`. Only a
   scaffold with a `Match` imports it, and keeping it off single-outcome moves changes one generated file in acme
   (`spend.handler.ts`), not three. Computing it in the generated file keeps M1.44 out of the runtime's handler types,
   which M1.46 is changing in parallel.
3. **The docs page shares `who`, and keeps its own visibility words and refusal table.** K16 a.3 moves the docs page
   to the header's `(private: only <who> sees it)`. But check 16 (M1.35) pins the docs page's
   `(private to organization.owner)`, so those words stay until an author changes check 16. `docs.ts` now reads `who`
   from `@orthograph/projections/shared`, the scaffold's own sentence, and regenerating every example changed no docs
   page. The docs refusal table stays a markdown table of its own, and `ortho brief` keeps its two lines ("refuse
   with …", "never refuse … yourself"). Neither repeats a header sentence word for word, so neither can disagree with
   it yet. Moving them onto `refusalsOf` belongs with check 16's change.
4. **The minted id is written into the body only once the model says the runtime mints it.** The header's lines about
   what is handed in (the subject, `refs.<field>`, the minted id) are read from the model's structure and are true
   once M1.46 lands. The body's `{ ..., id }` and `allowance: id` would not compile before M1.46 gives the context
   an `id`, so they render only when the operation's model carries `mints` (the answer field the id fills), which
   M1.46 sets. Until then grant's two tests in `handlers.test.ts` stay red, as K16 expects ("passes once M1.46 is in
   too"); the `PersonNotFound` row turns on by itself when M1.46 puts it in `op.refusals`.
5. **A read's stub payload is `Blueprint.todo<never>(...)`.** A read's `run` is an overload that a bare
   `Blueprint.todo` can't be inferred through (it infers `unknown`). An allowed-role stub's only check is a
   `Blueprint.todo` naming what the call answers.
6. **Drift judges literals through conditionals.** `outcome-chosen` reads `move(a ? "x" : "y")` as naming both, so
   acme's spend, written that way, is judged (check 19 expects the `frozen` warning on it) and, as shipped, warns
   about nothing. A `move(x)` with any non-literal branch leaves the file unjudged.
7. **Check 12's baseline disagrees with check 19, and an author settles it.** K16's golden imports `Outcome` from
   `generated/api/src/allowance/spend.handler.ts`, so that file gains two lines. Check 12 pins its bytes in
   `e2e/fixtures/m1/projections/acme-baseline.json`, which predates K16, so its two baseline tests go red with M1.44.
   They are green without it. A builder never edits a check, so the conductor has an author regenerate the baseline.
   M1.47's `refusals` table changes `api/src/errors.ts`, which the same baseline pins, so one regeneration after
   both covers them.
8. **A declared error borrowed from another thing is the handler's to refuse.** `examples/work`'s `attention.raise`
   declares the mission's `MissionNotRunning`. `refusalsOf` looks for the declaring thing among all things, the
   operation's own first, so the header cites `mission/errors.ts` with exit 56. The body writes its refusal block,
   and `add journeys` writes its stub (found by the 🔍 review).
9. **The drift rules judge what is used, not what is brought in.** `declared-error-named` doesn't count a
   destructured binding or an import specifier (`const { X } = Errors.declared`). So a handler that keeps the
   destructure but drops the refusal is still warned. `outcome-chosen` also reads `context.move("…")`.
10. **Blank detection in a journey looks one level deep**, the depth a stub's blanks sit at: the world, the payload or
    one of its fields, a check, or a check's fields, id or value. A hand-written journey with a blank nested deeper is
    not skipped by `prove`, and it reaches the blank when it runs.
