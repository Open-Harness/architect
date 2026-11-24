# Landing a pull request into main

The lander (Goal 19) lands app goals' slices; Goal 18 lands its own. The same five conditions hold for both, and for any
build pull request. All five must hold:

1. **No conflicts:** the pull request merges cleanly.
2. **A fresh CI run:** green on the head that will merge; `main` checks every merge on its own push run (CI-drafts).
3. **The gate passes:** the slice's or layer's one e2e suite, on a clean checkout.
4. **A 🔍 pass, the gate.** Have the `reviewer` skill run on the diff by a subagent or a 🔍 thread that wrote none of
   it, against its brief, `AGENTS.md` and `design/`. Merge on a pass. Send findings back to the lead.
5. **Every review thread is resolved:** fixed with a check, or answered with the ledger entry or decision that takes it.
   Codex is advisory (`design/decisions/CI-codex-advisory.md`): comment `@codex review` when it is available and answer
   what it posts before the merge, but never wait on it. If Codex is down or slow, land without it.

Open pull requests as drafts; test locally, get the 🔍 pass, then mark ready so CI runs once; at most two ready pull
requests per goal in CI at once. Bring a branch up to date by merging its base in, never by rebasing.

Then check `main`'s next CI run. If it goes red, fixing it comes before anything else (the lander's first job). One
landing at a time: the lander tells running goals "landing now" before it merges, and Goal 18 answers if another landing
is under way.

**Whole slices, merge commits.** The lander lands everything up to the commit that ends a slice, by a branch cut there
(K38), reviewed, merged by a merge commit and never squashed, so nothing is copied twice and nothing conflicts later.
Moving a plugin out of an app's `plugins/` into `packages/` (extraction) is its own pull request on `main`.

**A process change lands everywhere work runs.** When a skill, `AGENTS.md` or a CI guard lands on `main`, have `main`
merged into each live goal branch within the hour, by its lead, and tell the lead to have its open pull request branches
merge their base. A session reads skills from its own checkout, so until then the change is not in force where the work is.

The 🔍 is not only for slices. Every build pull request, a builder's into a goal branch included, gets one before it
merges, and the 🔍 lists every door into the change and runs one probe through each (the `reviewer` skill).
