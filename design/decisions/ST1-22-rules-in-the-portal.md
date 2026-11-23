# ST1.22: the portal shows rules

Decided 21 November 2026 by the ST1.22 builder, for check 28 (`e2e/m1/28-st1-22-rules-in-the-portal.test.ts`) and Aaron's answers in
[G5-invariants-ui-grill.md](G5-invariants-ui-grill.md) (1A 2A 3A 4A).

## What was built

- A thing's page: a Rules section after the lifecycle (one `rule` row per rule, with its sentence and the refusal it owns) and an Errors table.
- Every refusal a rule owns reads as the rule's sentence and links to the rule's row: an operation's refusals, a thing's errors, the reference page's
  refusal codes, and the generated docs a page embeds.
- An operation (not a read) gets a spine, drawn from the model; one that can break a rule has a `rules` stop between `move` and `commit`.

## Calls made while building

1. **The sentence is `orthograph/sentences`.** `ruleSentence` lived in `@orthograph/projections` (`env:build`), which a runtime package, the portal's
   browser client, may not import (`.oxlintrc.json`: `env:runtime` depends only on `env:runtime`). It moved, unchanged, with `words`, to
   `packages/orthograph/src/modules/sentences/` as its own subpath, so the client takes two pure functions and not the declaration language.
   `@orthograph/projections` re-exports both, so the docs, MCP and the scaffold say the same sentence. The portal reads it from the wire's rule alone.
2. **A rule's refusal is shown once on an operation's page.** The grid's `invariant.portal` eval counts `refusal` elements for a rule on that page and
   wants one, so the rules stop lists the rules (name, sentence, link to the row) and not their refusals. Check 28 allows either.
3. **The refusals list keeps its `<li>` of bare names.** The grid's `operation.portal` eval reads the Refusals section's plain `<li>` items as exactly
   the declared names; so each refusal is its own one-item list, and a rule's refusal element wraps that list with the sentence and the link. The
   refusal element also carries `data-code` and `data-count`, as `error.portal` reads every element with `data-refusal`.
4. **Telemetry surfaces are not wrapped.** The Metrics tab's counts, the calls table and a trace's spans still show a refusal as its code and text; their
   strings are what check 21 reads. They are the next surface to move, if Aaron wants the sentence there too.

## Supersedes

- `packages/projections/src/modules/names/README.md`: "`ruleSentence` is the one sentence for a rule" → "`ruleSentence` (kept in `orthograph`, as `orthograph/sentences`, and re-exported here)"
