# ADD-stubs-match-coverage: `ortho add journeys` stubs every refusal a rule can give an operation

26 November 2026. A 🔨 builder thread's call, made while fixing what a fact-check of the "journeys first" chapter
found on `examples/plugged-in`. Reworded the same day after the 🔍 review: the first wording said the stubs equal what
coverage asks, and they are more.

## Evidence

- **The canon said "every refusal".** `docs/canon/orthograph.mdx`, "Three loops": "`ortho add journeys` writes a stub
  for every path through the machine, every role and every refusal".
- **The code stubbed only declared errors.** `errorStubs` in
  `packages/projections/src/modules/handlers/internal/stubs.ts` kept the refusals the handler gives (`giver ===
  "yours"`). On Plugged In, `handle.claim` declares none: `HandleTaken` and `HandleAlreadyOwned` belong to the rules in
  `blueprint/things/handle/invariants.ts` (G5), so `ortho add journeys handle` wrote no stub for either.
- **Coverage requires each rule once.** Eval 8 fails an operation whose rule no journey breaks ("rule
  handle.oneHolderPerName refused by no journey", `packages/prove/src/modules/evals/internal/run.ts`), and counts a
  rule once, whichever operation broke it (`ruleKey`). It counts the runtime's other refusals (a missing record, a
  reused request key) but never requires them, and no journey step can cause the second.
- **The model lists rules per operation, and widely.** An operation carries every rule it could break
  (`op.invariants`), a rule on another thing included. On Capxul that is 73 pairs of operation and rule for 34 rules,
  17 of them a rule on another thing; `appraisal.oneAppraisalPerCycle` is listed on seven `goal.*` operations.

## Decision

1. **A stub per operation and rule it can break,** beside the stub per declared error. The rule may be another
   thing's: the stub is scaffolded from the rule's file, imports the error from that thing's `errors.ts`, cites the rule
   by its full name and its sentence, and leaves the starting world, the payload and the error's fields as blanks.
2. **That is more than coverage asks,** which is one journey per rule. The stubs follow the model's list, so each
   operation that can break a rule gets its own, and some of them cannot happen in practice. A stub is the author's
   from the moment it is written: the author fills the ones worth a journey and deletes the rest. `ortho check` names
   a stub's blanks until one or the other is done. One stub per rule was the other choice; it would pick an operation
   for the author and hide the others.
3. **No stub for the runtime's other refusals.** `NotAllowed` and the machine's refusal already have theirs (the role
   stubs and the refused paths). A generated `<Thing>NotFound` and `IdempotencyConflict` get none.
4. **The canon and the command's own words say which refusals.**

## Supersedes

- `docs/canon/orthograph.mdx`: "every role and every refusal, and a journey author fills them in" → "every role, and every refusal an operation declares or a rule can give it, and a journey author fills them in or deletes the ones that cannot happen"
- `packages/cli/src/modules/add/README.md`: "one caller turned away, and one per declared error (`renderJourneyStubs`" → "one caller turned away, one per declared error and one per rule the operation can break"
