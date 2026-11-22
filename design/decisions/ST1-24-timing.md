# ST1-24-timing: the warm-world speed row is a ratio to the cold run, not 6 seconds

20 November 2026. Decided by the conductor under AGENTS.md, "Who decides", on the evidence of the ST1.24 build (#214).

## Evidence

CI run 44777690829 on f26b6cfb: reuse worked and the structural rows passed, but the timed warm runs were 6.18 s and 6.58 s
against a 13.4 s cold run on the same runner. On the builder's quiet Mac the warm run took about 4.7 s against 9.7 s cold. Warm is
about 46 to 48% of cold on both. A reviewer's three-run row on #214's real build then measured 5.71 s against 9.7 s cold, 59%, and runs on a loaded Mac measured 43 to 44%. The evidence spans 43 to 59%, so the cap is 70%: a cold second run is about 100% of cold and stays red. About 4 s of a warm run is the journeys' own password hashing, which a warm world cannot save. An
absolute 6 s therefore measures the machine, not what was built.

## Decision

Check 30's speed row asserts that the fastest of three timed warm runs, after a warm-up, is at most 70% of the cold run of the same
project measured on the same machine in the same file (Superseded by the addendum below, 21 November 2026). It prints both times and whether the warm run was under 6 s, as
information only. The 6 s stays the target on a developer's machine, in words (the ST1.24 row in `milestones.md`).

## Fairness

The rule is a function (`fastEnough`) with its own control: green at CI's numbers (6.18 and 6.58 against 13.4) and the quiet Mac's
(4.7 against 9.7), red for a second run that is cold (13.0 against 13.4, about 100%), red just over 70%, red when slower than cold.
The row itself is red today because prove does not reuse `ortho dev`'s world (it stops at "nothing is warm"), and it needs the warm
build to be green.

## Addendum, 21 November 2026: the ratio is measured on one fixed journey

Decided by the Goal 3 lead on #297, written by the checks author.

The speed row now times one fixed journey, `health is up`, run alone (`ortho prove --only`), cold and warm, and judges each run by that journey's verdict.
The rest of the rule stands: the fastest of three warm runs after a warm-up is at most 70% of the cold run measured on the same machine in the same test.

**Why.** What a warm world saves is a fixed start-up of about 5 s. A ratio taken over the whole project therefore moves with how many journeys acme has, by
construction: M2.02 added four, each taking seconds of its own in a world, the warm run saved the same 5 s out of a longer total, and the faster warm run reached
about 84% of cold with nothing wrong in the warm path (removing the four journeys made the row green again). The whole-run form ties the bar to acme's
journey count; the fixed journey does not. It does not prove that no build could pass the whole-run form (a faster prove, such as cheaper password hashing in test
worlds or journeys run in parallel, could), only that the bar should not depend on a count that grows with every slice.

**What stays covered.** The whole acme verdict (every journey and step, by name) and the spans in dev's collector folder are still judged by check 30's row 1, and
isolation by row 2, on the full project. `--only` also judges the evals, which one journey cannot satisfy, so its exit is 1 and the row reads the journey's verdict, not
the exit. The review of the edit measured a build that claims warmth without having it at 93% (red) and a real warm world at 33% (green).

## Supersedes

- design/milestones.md (ST1.24): "finishes in under 6 s with the same verdict as a cold run" → "finishes in at most 70% of the time of a cold run on the same machine (about 6 s on a developer's machine) with the same verdict as a cold run"
- design/decisions/ST1-23-prove-changed.md ("The warm world's check"): "The 6 s is a separate soft row: after a warm-up, the faster of two timed runs" → "the fastest of three timed runs, at most 70% of the cold run on the same machine"
- design/milestones.md (ST1.24): "finishes in at most 70% of the time of a cold run on the same machine" → "finishes in at most 70% of the time of a cold run of the same journey (`health is up`, fixed) on the same machine"
- e2e/m1/30-st1-24-warm-world.test.ts (header, "HOW IT IS JUDGED"): "the fastest is at most 70% of the cold run of the same project" → "the fastest is at most 70% of the cold run of that same journey"
