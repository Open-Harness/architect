# ADD-stubs-match-coverage: `ortho add journeys` stubs every refusal coverage asks a journey for

26 November 2026. A 🔨 builder thread's call, made while fixing what a fact-check of the "journeys first" chapter
found on `examples/plugged-in`.

## Evidence

- **The canon said "every refusal".** `docs/canon/orthograph.mdx`, "Three loops": "`ortho add journeys` writes a stub
  for every path through the machine, every role and every refusal".
- **The code stubbed only declared errors.** `errorStubs` in
  `packages/projections/src/modules/handlers/internal/stubs.ts` kept the refusals the handler gives (`giver ===
  "yours"`). On Plugged In, `handle.claim` declares none: `HandleTaken` and `HandleAlreadyOwned` belong to the rules in
  `blueprint/things/handle/invariants.ts` (G5), so `ortho add journeys handle` wrote no stub for either.
- **Coverage requires them.** Eval 8 fails an operation whose rule no journey breaks ("rule handle.oneHolderPerName
  refused by no journey", `packages/prove/src/modules/evals/internal/run.ts`). It counts the runtime's other refusals
  (a missing record, a reused request key) but never requires them, and no journey step can cause the second.

## Decision

1. **A stub per refusal that coverage requires of a journey:** each declared error, as before, and each refusal one
   of the thing's rules gives. A rule's stub is scaffolded from the rule's file, cites the rule by its full name and
   its sentence, and leaves the starting world and the payload as blanks that name the rule.
2. **No stub for the runtime's other refusals.** `NotAllowed` and the machine's refusal already have theirs (the role
   stubs and the refused paths). A generated `<Thing>NotFound` and `IdempotencyConflict` get none, as coverage does not
   ask for them.
3. **The canon says which refusals,** so it matches the code and the eval.

## Supersedes

- `docs/canon/orthograph.mdx`: "every role and every refusal, and a journey author fills them in" → "every role, and every refusal the thing declares or one of its rules gives, and a journey author fills them in"
