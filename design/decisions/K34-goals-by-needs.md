# K34: goals start by what they need, not by milestone order

21 November 2026. Decided by the conductor under AGENTS.md, "Who decides", to carry out Aaron's ask that day: "we need
a map of all of the goals … we want to make them as independent as possible … so we can parallelize these". The map is
[`../goals/map.md`](../goals/map.md).

## The problem

`AGENTS.md` said nothing in a milestone may start before the gate of the milestone ahead of it passes on `main`. Read strictly,
the milestones run one at a time: workflows (M3) wait for the beta, agents (M4) wait for M3's gate, events (M5) for
M4's. That ordering was already broken twice, on purpose: K26 pulled on chain (M6) ahead of M3 to M5, and Goal 7 ran a
stage 3 spike while stage 1 was still open. Nothing in M3's workflow engine, M8's clock or stage 4's Aztec work reads
what M2 builds, so the order costs parallel work and buys nothing.

## The call

1. (Superseded by K42, 23 November 2026: an app goal builds what it needs in its own slice, unless a running goal
   has claimed it or its paths.) **A goal builds a slice once what that slice needs has landed,** whatever milestone it sits in. A slice's `needs`
   column in `milestones.md` is the rule; the milestone order is not.
2. **A milestone still counts as done only when its gate passes on `main`.** Releases (K28) are unchanged: the preview
   is Gate M1 and the npm preview, the beta is Gate M2 and Goal 3's done check, 1.0 is the four stage gates (superseded by K42, 23 November 2026: 1.0 is Capxul core).
3. (Superseded by K42, 23 November 2026: goals are long-running agents, one framework goal and app goals.) **Goals are drawn for independence** (`design/goals/map.md`): each owns its paths, adds new modules rather than
   editing the core, has one owner per shared seam, and writes its journeys and checks before what its builds need has
   landed.
4. **The map is the list of goals.** Goals 8 to 16 are planned there; each starts when the conductor has written its
   brief and cut and protected its branch.
5. **The needs that only said milestone order are rewritten** in `milestones.md`, each to what the slice reads:

   | Slice | Its `needs` was | Now | Why |
   |---|---|---|---|
   | M6.01, the chain decision | Gate M5 (the stage table: Gate M2) | none | K26, item 1, already started it on 20 November; this writes that on `main` |
   | M3.01, workflows' shape | Gate M2 (the stage table: "Gate M2, unchanged") | none | a decision; the engine it settles on is the one the workflows spike proved (#289), and the builds after it (M3.02, M3.03) need it, not M2 |
   | M4.01, agents' shape | Gate M3 (the stage table: the stage 2 gate, ST2.06) | none | a decision; nothing in M4.02 to M4.10 reads M3 or stage 2 |
   | M5.01, views and the outbox | Gate M4 (the stage table: Gate M2) | none | a decision; M5.03's `on:` reads only M5.01 |
   | M7.10, Capxul's plugins mapped | M7.13 | none | a mapping on paper, from `decisions/M7-capxul.md` |
   | M7.13, the release pass | ST4.08, M7.01 | M7.01 | the credentials a release needs, each with Aaron's written yes; the npm preview needs one before stage 4 exists. 1.0 itself still waits for the four stage gates (K28) |
   | ST4.01, the club's spike | ST3.08 | none | it reads the budgets declaration in `examples/budgets` (Goal 4), not stage 3's gate |

   Needs that name a real slice stay: M8.18's Gate M2 (it reads stage one's dev worlds and adapter packages), M6.21's
   M8.09, M8.17's M6.09, ST2.04's M2.13, M6.09 and M5.03, ST3.07's M4.10, M4.16 and M2.07.
6. **K26's exception becomes the rule.** K26 (on `goal/stage-1` and `goal/on-chain`, not yet on `main`) pulled on
   chain forward and said, in item 5, that it was Aaron's exception and any other milestone still waited for its gate.
   K34 replaces item 5: every goal starts by its needs. K26 is a dated record, so it keeps its words and gains a note,
   "Superseded by K34, 21 November 2026", through a pull request into `goal/stage-1` that Goal 3's lead merges (K32);
   `goal/on-chain` takes it when it next merges `goal/stage-1` in.

## What it touches

| Dependent | Change |
|---|---|
| `AGENTS.md`, "How work flows" | the milestone rule, as below |
| `design/milestones.md`, the build plan's rule 2 | "Nothing in milestone n+1 starts until gate n" becomes the needs rule; each milestone still ends in its gate |
| `design/milestones.md` | the seven needs cells above, and the stage table's "Read it as" column for M3.01, M4.01, M5.01, M6.01 and M7.13 (M7.01 keeps Gate M2, and is ✅ on `goal/stage-1`) |
| `design/goals/03-stage-1-hill-climbed.md` | its quote of the old rule, rewritten; Goal 3's copy on `goal/stage-1` takes it when it merges `main` in |
| K26 (dated record, on `goal/stage-1`) | a Superseded note on item 5, by a pull request Goal 3 merges |
| `design/goals/map.md` | the goals and their needs, drawn from the cells above |
| `design/docs/index.html`, the roadmap | its line on milestone order |

## Supersedes

- `AGENTS.md`: "until the previous milestone's gate passes on `main`" → "until what it needs has landed, in any milestone order (K34); a milestone is done when its gate passes on `main`."
- `design/milestones.md`: "Gate M2, unchanged" → "none (K34): a decision; the engine is the one the workflows spike proved (#289)"
- `design/milestones.md`: "M7.13: the stage 4 gate, ST4.08, and every other M7 slice needs it" → "M7.13: M7.01 alone (K34), and every other M7 slice needs it"
- `design/milestones.md`: "Nothing in milestone n+1 starts until gate n" → "A milestone is done when its gate passes on `main` from a clean checkout, locally and in CI. A slice starts once what it `needs` has landed, in any milestone order (K34)."
- `design/docs/index.html`: "Nothing in the next one starts until that gate" → "A slice starts once what it needs has landed, in any milestone order, and a milestone is done when its gate passes on `main` (K34)."
