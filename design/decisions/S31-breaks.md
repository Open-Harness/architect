# S31: an operation's model carries `breaks`, every rule it can break, with a refusal or without

Decided 21 November 2026 by the checks author for snag S-31 (Goal 3), under "Who decides" in `AGENTS.md`; amended the same day on the conductor's call (point 4: reads declare `writes: []`). Evidence: a probe of `breakersOf` over Plugged In's compiled model, run on `goal/stage-1` at `e6dc1733`.

## The problem

`profile.onePagePerHandle` refuses nothing, yet `handle.claim` makes a profile and the runtime checks the rule before the commit. The compiler computes every rule an operation can break (`breakersOf`,
`packages/compiler/src/modules/model/internal/invariants.ts:102`, its `breaks`), and `describe.ts:170` keeps only `refusals` (`operations.<op>.invariants`, refusal to rule). So the wire never carries a rule
with no refusal on an operation, and the portal's rules stop can name only the rules that refuse.

## What `breakersOf` really returns for Plugged In today

```text
handle.claim    refusals { HandleTaken: handle.oneHolderPerName, HandleAlreadyOwned: handle.oneNamePerPerson }   breaks [handle.oneHolderPerName, handle.oneNamePerPerson]
handle.release  breaks []
handle.resolve  breaks []        link.add, link.order, link.remove  breaks []
profile.get     breaks [profile.onePagePerHandle]
```

Two facts the brief did not have. `handle.claim` does not break `profile.onePagePerHandle` by the compiler's rules: its one step is `Blueprint.step.database()`, which names no `writes: [Profile]`, and G5 section 3 says in so many words that
it "misses `handle.claim`" for this reason. And `profile.get`, a read, does break it, by section 3's third rule (a thing with no machine, an operation on it with a database step; "coarse on purpose").

The second is wrong for a reader, and the conductor decided so on 21 November 2026 (the amendment below): a read writes nothing, and the runtime's `unit.check`
(`packages/language-effect/src/modules/records/internal/unit.ts:72-97`) looks only at the rows the call writes, so a rules stop on `profile.get` would tell a reader something false.

## The call

1. **The field is `operations.<op>.breaks`**: a list of full rule names, `<thing>.<rule>`, each once, for every rule the operation can break by section 3's three rules (as amended in point 4), whether or not the rule owns a refusal. It is the compiler's `breakersOf(...).breaks`, unchanged,
   in the compiler's order; a checker sorts before comparing. An operation that breaks nothing carries `[]`, not an absent key, so a reader can tell "none" from "an older wire".
2. **`invariants` stays what it is**: refusal to rule, only for rules that refuse. Every rule an operation attaches a refusal for is among its `breaks`; the converse is false (that is the snag).
3. **The wire keeps it** (`ModelWire`'s operation schema names `breaks`, an array of strings; the digest covers it), and the portal's rules stop is read from it: a `spine-rule` for each rule in `breaks`, with that rule's sentence and a link to its row, and no refusal for a rule that owns none.
4. **Amendment to G5 section 3 (rule 3), and `handle.claim` and `profile.get` say what they write.** A database step's `writes` is now one of three things:
   - **unset** (`Blueprint.step.database()`): unknown. Section 3's rule 3 still catches it (a thing with no machine, an operation on it with an unset database step breaks every rule of the thing), so a write the author forgot to name stays loud: the runtime still dies naming the rule and the operation.
   - **`writes: []`**: reads only. The step breaks nothing by rule 3 (and by no other rule: its rows are not written). The model keeps the empty list, apart from the absent key, so "unknown" and "none" stay different words.
   - **`writes: [T, ...]`**: section 3's rule 2, as before.

   An operation with more than one database step is unknown if any one of them leaves `writes` unset. In `breakersOf`, rule 3's `bare` becomes "the thing has no machine, the operation is on it, and some database step has `writes === undefined`".
   This supersedes "coarse on purpose" for steps that declare `writes`; it leaves it alone for steps that do not.
   - `handle.claim` names its write: `steps: { record: Blueprint.step.database({ writes: [Profile] }) }` in `examples/plugged-in/blueprint/things/handle/verbs/claim.ts`, so the model says what the runtime already checks.
   - `profile.get` says it reads: `steps: { load: Blueprint.step.database({ writes: [] }) }` in `examples/plugged-in/blueprint/things/profile/verbs/get.ts`, so it breaks nothing and shows no rules stop.
   - Both are the builder's changes (a blueprint edit and a regenerate), and the checks fail without them. The compiler and the step's schema already accept `writes: []` today (a check pins it), so nothing else is needed for the empty list.

   | Operation | Before the amendment | After |
   |---|---|---|
   | `handle.claim` | breaks handle's two rules (the page rule missed: no `writes`) | breaks all three (`writes: [Profile]`) |
   | `profile.get` | breaks `profile.onePagePerHandle` (rule 3, coarse) | breaks nothing (`writes: []`), no rules stop |
   | an operation on a machine-less thing whose step leaves `writes` unset | breaks every rule of the thing (rule 3) | the same: unknown stays coarse |
   | an operation on a machine-less thing whose step says `writes: []` | breaks every rule of the thing (rule 3) | breaks nothing |
   | every other Plugged In operation | breaks nothing | the same |

## The checks

- `packages/compiler/src/modules/model/breaks.test.ts` (a rule with no refusal, a rule of another thing broken through `writes`, a rule with none broken, Plugged In's claim, release and get) and `packages/portal/src/modules/wire/breaks.test.ts` (decoding keeps the list; empty stays empty; a non-list is refused). Reds are in `packages/*/expected-failing/breaks.txt`.
- Check 28 (`e2e/m1/28-st1-22-rules-in-the-portal.test.ts`, `rules-fixture.ts`, `rules-judge.ts`, `rules-standin.ts`): the spine is judged against `breaks`. `handle.claim` lists all three rules, the page rule with its sentence and link and no refusal;
  `handle.release` and `profile.get` have no stop. Controls plant the wrong stops (refusals only, every rule everywhere, the thing's own rules, a rule twice, no sentence, no link, the wrong row, a refusal on a rule that owns none, hidden, outside the stop, stray `spine-rule` entries on an operation that breaks none).
  The renamed variant also plants a `breaks` the compiler never made (the page rule off `handle.claim`, on `handle.resolve`, `link.add` and `profile.get`, none of which attach a refusal; `profile.get` has a thing with no machine), so a portal that writes the real list in, or shows the stop only when an operation has refusals, passes the real list and fails the planted one: only a portal that reads `breaks` passes both.
  The fixture also holds the wire's own `breaks` to its own list (mapped through the variant's names), so the compiler and the fixture cannot drift. A test also holds `generated/model/model.json` to the wire. The two spine tests, the two drift tests and that one are listed in `e2e/m1/expected-failing/28-st1-22-rules-in-the-portal.txt`.
- Rule 3 has its own synthetic cases in `breaks.test.ts` (a thing with no machine, one verb with `writes` unset, one with `writes: []`, one with both, one naming the thing), so deleting the unset branch of `breakersOf` is caught without Plugged In.

## Supersedes

- `design/decisions/G5-invariants.md` section 3: "Both are accepted for a rule with no `refuse`" → "the missed `handle.claim` is named in its step (`writes: [Profile]`), and the model carries `breaks`, S31"
- `design/decisions/G5-invariants.md` section 3: "Rule 3 is coarse on purpose" → "Rule 3 applies only to a database step that leaves `writes` unset; `writes: []` means reads only (S31, amendment of 21 November 2026)"
