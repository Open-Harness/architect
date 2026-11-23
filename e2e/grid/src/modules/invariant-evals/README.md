# invariant-evals

Part of the grid runner; see `e2e/grid/README.md`. Interface: `types.ts`. The invariant row (K14 lane 14, G5): one rule of a thing, named in the list as
`<thing>.<rule>` (`handle.oneHolderPerName`), judged in the outputs the lane's cards name. Every expected value comes from the model's `things.<thing>.invariants.<rule>` and
`operations.<op>.invariants` (the map from a refusal a rule owns to the rule), never from the output judged.

| Cell | What is judged |
|---|---|
| `invariant.model` | the rule's kind, key fields (the thing has them, no repeat), scope (states of the thing's machine), refusal (the thing declares it; its own fields are among the key), description (words when written); every operation mapped to the rule lists the refusal among its `refusals` and not its `errors`; one owner per error; a rule that refuses nothing is mapped by none |
| `invariant.api` | the refusal's class is generated; each breaker's endpoint lists it; no other endpoint does |
| `invariant.server` | D1 has one unique index named `<thing>_<rule>` over exactly the key columns, partial on exactly the scope; the server mounts the thing's rules and serves each breaker with the refusal mapped to this rule, and no other operation as a breaker; prove's declared-errors line for each breaker, and a journey step that expects the refusal, passed |
| `invariant.sdk` | the SDK exports the errors; the refusal is a tagged error with a code; each breaker's call has it in its error channel and exists |
| `invariant.mcp` | each breaker's tool says `Refuses <Error> when <sentence>.` once, the sentence the rule's `description` or the one the docs say; no other tool says it |
| `invariant.docs` | the thing's `## Invariants` has one bullet naming the rule, its key, its scope, its sentence and its refusal (a rule that refuses nothing says so); each breaker's Refusals row has the sentence and `by the rule <name>` |
| `invariant.portal` | the thing's page has one Rules section with one row (`data-rule`, `data-fields`, `data-while`, `data-refuse`, an `id`, one `rule-sentence`); each breaker's page shows the refusal once with one sentence and a `rule-link` to that row, and a `rules` spine stop between `move` and `commit` naming the rule (check 28's hooks) |
| `invariant.telemetry` | every refused call's span has `refusal.invariant: <thing>.<rule>`, the refusal's code and a deciding line (`refusal.log`) that names the rule; no span names a rule that refuses nothing |
| `invariant.cli` | no eval: held off (`../../../held-off.json`), as `error.cli` is, until the refused call can be seen through the CLI (`prove --through`, M2.08) |

**A rule's sentence.** A written `description` replaces the generated sentence on every surface, verbatim. A generated one names the thing, every key field and every state, and is no
other rule's description; its wording is the generator's, so the evals ask only for the names. The MCP tool's sentence must also be the docs' (K14: "the same sentence as the docs").

**A rule with no refusal** (`profile.onePagePerHandle`) has no refusal to carry, so its api, sdk, mcp and telemetry cells are absence checks (nothing is mapped to it, no tool or span
says it refuses) and its model, server, docs and portal cells judge its row, index and bullet.

## Tests

`invariant-evals.test.ts` (model, api, server, sdk) and `invariant-surfaces.test.ts` (docs, mcp, portal, telemetry) judge Plugged In as ST1.19 leaves it
(`fixtures/plugged-in-rules`: a throwaway stand-in of the slice, generated and run on 21 November 2026, trimmed to the files these evals read) and plant one wrong output per thing
an eval reads. The portal's pages are drawn by hand from the model in `testing.ts`, in the hooks check 28 reads, because the portal draws no Rules section until ST1.22. Recapture
the fixture with `capture --out <folder> --run` when Plugged In declares its own rules; the tests then judge the real thing.

## Known gaps

- The portal eval reads the markup's hooks, not what a person sees: a row hidden with CSS passes (check 28 judges visibility in Chromium).
- Forms no generator emits, found by the hostile pass of 21 November 2026 and not built: two things declaring one error name (the compiler's collision check), an endpoint's `error: [X]` written inside an
  earlier string literal, `invariantsIn("<thing>",` only in dead code or a quoted string, an SDK call file that is empty, an index with an expression for a column that the strict column check does not name,
  `refusal.log` wording beyond starting with the rule's name, a refused call that opened no handler span (an idempotent replay: the refused spans are not counted against the journeys' refusing steps).
- A rule that refuses nothing is covered on the tool side by `operation.mcp` (a sentence that no rule refuses for an operation is red), not by `invariant.mcp`.
- `invariant.sdk` does not run the TypeScript checker over the SDK's error union (`error.sdk` does not either): it reads the endpoint's error list the SDK's types derive from.
- A rule with a composite key (a tuple) is judged by the same rules, but no project has one yet: no planted case.
