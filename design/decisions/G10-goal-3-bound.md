# G10: Goal 3's bound takes in the invariants and the speed slices

Decided 20 November 2026 by the conductor, as owner of the plan, at the Goal 3 lead's report. Recorded by the lead.

## The problem

Goal 3's bound named the stage slices "ST1.01 to ST1.08". Three things on `goal/stage-1` disagreed with it:

- Check 28 (the portal shows Plugged In's rules, ST1.22) is the last check on Goal 3's m1 ratchet list. Its 8 red tests
  pass only when the invariants chain under it is built (ST1.14 to ST1.17). Of that chain, only ST1.09, the
  decision, had landed.
- `design/milestones.md` puts the invariants (G5) on `goal/stage-1`, and the stage 1 gate (M2.12) needs "ST1.01 to
  ST1.04, ST1.06 to ST1.22".
- The speed slices ST1.23 and ST1.24 (from `design/research/speed-and-vitest-proposal.md`, #192) were added to stage 1
  because they serve "climbable".

## The call

Goal 3's bound is ST1.01 to ST1.04 and ST1.06 to ST1.24; ST1.05 stays in M3 (K13). A separate goal for the invariants
would only add a branch and a merge. The chain runs in the order of `design/milestones.md` ("Stage 1", the invariants
and speed lines), checks first. ST1.21, the canon page, stays with the canon thread's role.

Staging does not wait for the chain. A first pass runs on the climb as it stands, to find cloud snags early, and is
destroyed; the final pass runs at the end, for the evidence.

## Supersedes

- design/decisions/K9-growing-example.md: "ST1.01 to ST1.08" → "ST1.01 to ST1.04, ST1.06 to ST1.22"
