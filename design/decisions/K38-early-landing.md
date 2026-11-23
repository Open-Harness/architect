# K38: a slice another goal needs lands early

**Decided 21 November 2026 by the conductor**, under AGENTS.md, "Who decides", answering Ask #440 (Goal 3's lead,
passing on a Codex finding on #430). It builds on K34 (a slice starts once what it needs has landed).

## The problem, in code

Every goal brief lands its work whole, after its done check (`design/goals/15-release.md:78-79`):

```text
**Done check:** `nx run e2e:m7` passes on `goal/release` (Gate M7, M7.12) … It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.
```

K34 counts a slice as landed once it is ✅ on `goal/stage-1`. So two goals that each need a slice of the other wait
for ever, though no slice waits on itself:

- Goal 15's gate (M7.12) needs Goal 16's M7.11 (`15-release.md:70`); Goal 16's M7.11 needs Goal 15's M7.05
  (`16-capxul.md:53`).
- Goal 9's M8.17 needs Goal 4's M6.09 (`09-time.md:84`); Goal 4's M6.21 needs Goal 9's M8.09.

## The call

**A slice that another goal needs lands early.** Once its check is green on the goal's branch:

1. Cut `goal/<name>-early-<slice>` (for example `goal/release-early-M7.05`) at the commit on the goal's branch that
   ends that slice. A branch can't carry one slice alone without cherry-picks, so it carries that slice and the
   goal's earlier ones, each already green; they land early with it. Never cherry-pick or rebase, so every commit a
   reviewer read keeps its identity.
2. Open one pull request from it into `goal/stage-1` (into `main` once Goal 3 has landed), as a draft; merge
   `goal/stage-1` into it first, by a merge.
3. Merge it by a **merge commit**, never a squash, once CI is green, every thread is resolved and a 🔍 reviewer
   passed it. The goal then merges `goal/stage-1` into its own branch, and its later whole-goal pull request finds
   those commits already there.

This is how Goal 6's theme landing already works (`06-portal.md`, "The theme landing"), and it follows the practice
every brief's own landing has: a goal's lead merges its own pull request into `goal/stage-1`, which Goal 3's lead
keeps open to all goals (K32's owner-merges rule covers goal branches, not `goal/stage-1`). The slice's row is then ✅
there, so the needing goal merges `goal/stage-1` in and builds. The whole goal still lands by one pull request after
its done check.

**A slice built outside this repository** (Goal 16's M7.11 runs in Capxul's own repository and staging; superseded by K43, 23 November 2026: Capxul is built here on `goal/capxul` first) lands early
as its record here: the evidence that its journeys are green in Capxul's staging, its row's ✅ and its decision.

The needing goal says which slice it waits on by an Ask issue in the owning goal's milestone (K32, K33), so the owner
knows to land it early. So M7.05 lands early from Goal 15, M7.11 then from Goal 16, and Goal 15's gate passes;
M8.09 lands early from Goal 9, M6.09 from Goal 4.

Not chosen: merging goal branches into each other, which K32 forbids (a goal never pushes to another's branch); and
moving the slices between goals, which only shifts the cycle.

## What changes

- `AGENTS.md`, "Goals", gains the rule.
- Briefs 8 to 16 gain it in "How it runs", "Its needs". Goal 4's brief lives on `goal/on-chain`; AGENTS.md wins over
  it, and Ask #442 in Goal 4's milestone tells its lead to land M6.09 early.
- Asks filed now, since the needing goals have not started: M7.05 in Goal 15's milestone and M8.09 in Goal 9's
  (#443 and #444).

Nothing is superseded: the rule is added, and no older words change.
