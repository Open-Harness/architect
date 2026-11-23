# ST1.19's checks: what the grid learned, what the claim journeys stop saying, and what a build must leave

Decided 21 November 2026 by the checks author for ST1.19 (Goal 3), under "Who decides" in `AGENTS.md`, from the ST1.19 row of `design/milestones.md`, G5 (`G5-invariants.md`),
K14's lane 14 (`K14-the-grid.md`, "14. invariant") and the first run of a throwaway stand-in of the slice (never committed) on `goal/stage-1` at `6f7d8847`.

## What was found, running the slice before it exists

A right ST1.19 (the two `invariants.ts` files, `unique:` and the claim's errors gone, the handlers reading through the rules) was built in a scratch copy and run. It turned up four things
that the row does not say, and that three owners must each do something about:

| Found | Why | Whose |
|---|---|---|
| `prove` went red on three journeys, six steps | G5 section 5: the runtime refuses after the handler (the rule is a stop between the move and the commit), so a refused claim's `record` step has run when the refusal comes. The journeys said `spans({ absent: ["handle.claim.record"] })` on every refused claim, and `present: ["handle.claim.load"]` on every claim | the journey author: this change |
| `handle.claim.load` is a declared step the handler no longer runs | prove's `steps` check ("declared step ran no span") fails for it; the handler has nothing to look up | the blueprint: the build drops the step (`steps: { record: … }`); the grid's list drops its nine step pairs here, so the build cannot turn them red |
| `handle.resolve` and `link.add` read through G4's `findBy(Thing, "field", …)` | it dies once `unique:` is gone; the row names only `profile.get` | the climber: check 34 asks for all four reads |
| `operation.mcp handle.claim` went red | ST1.17 appends one `Refuses <Error> when <reason>.` sentence per rule refusal to the tool's description, and the eval wanted the model's words exactly | the grid: this change |
| check 28's controls failed (about fifty tests) | they read Plugged In's rules out of its `unique` entries (`rules-fixture.ts`), which ST1.19 removes | the checks author: this change; check 28 reads the wire's own `invariants` when `unique` is gone, and its eight ST1.22 tests are still the only ones listed |

## The calls

**1. The grid learns `invariant`.** `touches` adds an `invariant` row for every rule of the thing an operation is on and for every rule the model says the operation can break
(`operations.<op>.invariants`), so the claim journey touches all three rules, `profile.get` touches the rule that refuses nothing, and a rule is touched by any call, not by a
refusal (a rule with no refusal has none to touch it by). `modules/invariant-evals` judges eight of the lane's nine cells from the model's `things.<t>.invariants` and
`operations.<op>.invariants` (its README has the table); `invariant.cli` is held off with `error.cli`, because only a refused call seen through the CLI shows `[code] Tag` and the exit
(`prove --through`, M2.08). `switched-on.json` gains the eight cells with the three rules, `switchedBy: "claim a handle"`. **All 24 pairs are red today** (the model has no rule) and are on
`expected-red.json` with ST1.19, and ST1.22 for the portal's three. A right build turns 21 green and takes them off the list; the three `invariant.portal` pairs wait for ST1.22.

**2. The journeys drop what the runtime changes.** In `claim a handle`, `a name is claimed once` and `a person claims a page and shares it`: the claim steps no longer expect
`handle.claim.load`, and a refused claim expects no `commit` span (`spans({ absent: ["handle.claim.commit"] })`) where it expected no `record` span. A refused claim left nothing
because nothing committed, and the steps after it (the name still resolves to the first holder, the refused name is still free) say so by state. Every step passes on today's
stage 1 and on a right ST1.19.

**3. The blueprint is the build's.** The row says "the journey author for the blueprint", and the blueprint cannot change without the handler (a claim that no longer lists
`HandleTaken` and still throws it is a defect, and a `findBy(Handle, "name", …)` on a thing with no `unique:` dies), so the declarations are part of the one build change and the checks
say exactly what they must be (check 34). Nothing the journey author owns is left undone: the journeys are in this change.

**4. `operation.mcp` reads the rules' sentences.** A tool's description is the model's, then one `Refuses <Error> when <reason>.` per refusal in the operation's `invariants`, each once, and
nothing else. Today's tools, with no rule, still must say exactly the model's.

**5. Check 28 reads the wire's own rules.** From ST1.19 `unique` is gone and the wire carries `invariants`; `rules-fixture.ts` reads each rule back as the one-liner it replaced (first key
field and scope) and builds every variant from that, so both worlds give the same wire. Its eight ST1.22 tests stay on the list and its controls pass on both.

## What a build must leave (check 34)

The three rules exactly (names, fields, scope, refusal, the one description), `handle.claim`'s `errors` empty with its `invariants` map naming both refusals, no other operation mapping one,
`git grep -n "new HandleTaken\|new HandleAlreadyOwned\|unique:" examples/plugged-in` empty, `profile.get`, `handle.resolve` and `link.add` each reading through the rules they key on
and none on G4's spelling, a claim handler that looks nothing up and names neither refusal, prove green on a fresh copy with both claim journeys passing, each refused claim's span saying
which rule decided (`refusal.invariant`), and the committed `generated/model/model.json` as `ortho generate` writes it. The test that proves prove green and the journeys' refusals passes
today (a guard); the other six are listed in `e2e/m1/expected-failing/34-st1-19-plugged-in-declares-its-rules.txt`.

**Known gaps of check 34** (the hostile pass of 21 November 2026; each is a wrong build no climber writes, so by G7's scope call 4 it is a line here and not a fix): an operation the build adds
that refuses by hand with an error of its own (it names neither `HandleTaken` nor `HandleAlreadyOwned`, maps no rule, and `link.add`-style calls to it are not the claim); an error built at run time
out of two strings, which no name search reads (a computed access on `Errors.declared` is refused); a handler that annotates a span with another name. What a handler can say in `src` about the two
refusals, about `refusal.invariant` and `refusal.log` and about `findBy`'s old spelling is read in every file of `src`, not only the four the slice names.

## Supersedes

- e2e/grid/README.md: "Plugged In's seven stage 1 journeys switched on 53 cells (7 rows, 316 cell-and-subject pairs)." → "Plugged In's seven stage 1 journeys switched on 61 cells (8 rows, 331 cell-and-subject pairs"
- examples/plugged-in/journeys/README.md: "spans `handle.claim{,.load,.record,.commit}`" → "spans `handle.claim{,.record,.commit}`"
- examples/plugged-in/journeys/README.md: "no `record` span; bob refused `HandleTaken` with his own key and with aaron's key, no events, no `record`" → "no `record` span; bob refused `HandleTaken` with his own key and with aaron's key, no events, no `commit`"
- examples/plugged-in/journeys/README.md: "a second name refused `HandleAlreadyOwned`, nothing recorded, still free" → "a second name refused `HandleAlreadyOwned`, nothing committed, still free"
- examples/plugged-in/journeys/README.md: "Every journey asserts the events (`emits` or `noEvents()`), and every refusal also asserts the absent write span." → "Every journey asserts the events (`emits` or `noEvents()`), and a refusal also asserts the absent write span, or, for a claim (the runtime refuses after the handler), the absent `commit`."
