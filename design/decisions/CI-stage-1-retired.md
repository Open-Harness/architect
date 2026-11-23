# CI-stage-1-retired: `goal/stage-1` is retired, and `main` is the one integration branch

23 November 2026, by the lander (Goal 19), at the end of its slice 1, as K42 section 7 says: "`goal/stage-1` lands in
`main` (the lander's slice 1) and is retired; `main` is the one integration branch".

## What was done

1. **`main` requires every protection `goal/stage-1` had** (K42, open risks). `e2e-stage1` was the one missing; it now
   runs and is required on `main` (CI-main-stage1, #729). Both branches require the same ten checks, every
   conversation resolved, admins included, no force push and no deletion.
2. **`goal/stage-1` landed in `main`** by #707, merge commit `438f631c`, with every pull request that was open into it
   merged first (#690, #696, #697, #737, #754). `git rev-list origin/main..origin/goal/stage-1` was empty afterwards.
3. **The branch is locked, not deleted.** Its protection keeps every rule and gains `lock_branch: true`, so nothing can
   push to it, and its history stays readable for the records that cite its commits.
4. **The live docs name `main`.** `AGENTS.md` and the `threads` skill no longer name `goal/stage-1` as a branch to land
   into, the `github` skill's brief template bases on `main`, the status page says stage 1's work is on `main`, and
   Goal 16's brief bases on `main`. The goal briefs of parked goals keep their words as the record of how they
   ran. Goal 17, which is running, changes its own brief's base.

## Not done here

These still name `goal/stage-1`. Each line is dead now that the branch is locked, and harmless, and all of them come out
together in the next CI change, so this docs-only pull request doesn't need to run every suite:

- `.github/workflows/ci.yml`: the push trigger, the concurrency and required-job comments, the docs-only and scope
  comments, `e2e-stage1`'s comment and `SKIP`, and the on-chain job's merge-base note;
- `tools/ci/scope.sh` and `tools/ci/affected.sh`, which treat it as a branch that runs everything;
- `tools/ci/ci.test.sh`, two cases that assert that behaviour, and `tools/github/sync.test.mjs`, a fixture.

Dated records, parked goals' briefs and `.agents/skills/goal-4/STATE.md` keep their words. Goal 17's brief is Goal 17's to
change.

## Undoing it

```bash
gh api repos/Open-Harness/orthograph/branches/goal%2Fstage-1/protection > p.json   # then set lock_branch to false and PUT it back
```

## Supersedes

- AGENTS.md: "merged into `main` (into `goal/stage-1` until" → "merged into `main` by a merge commit"
- AGENTS.md: "`main`, `m1` and `goal/stage-1` require their" → "`main` and `m1` require their"
- AGENTS.md: "`main` and `goal/stage-1` also require `builder-paths`" → "`main` requires `builder-paths` too"
- .agents/skills/threads/SKILL.md: "On `main` and `goal/stage-1` the push run checks" → "On `main` the push run checks"
- .agents/skills/threads/SKILL.md: "if you change its base to `goal/stage-1` or `main`" → "if you change its base to `main`"
- design/goals/16-capxul.md: "main once the lander's slice 1 retires goal/stage-1" → "base: main"
- docs/canon/status.md: "reaches `main` when that branch lands" → "What stage 1 built is on `main`"
