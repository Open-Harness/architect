---
goal: 3
title: stage 1 of Plugged In, hill-climbed through its journeys
milestone: "Goal 3: stage 1 of Plugged In, hill-climbed through its journeys"
release: beta
branch: goal/stage-1
base: main
status: parked         # ready | running | landing | done | parked
lead:
  harness: claude-code
  model: claude-opus-5-5
  since: 2026-11-21
done_check: nx run e2e:stage1
owns:
  - design/goals/03-stage-1-hill-climbed.md
  - design/goals/03-snags.md
  - examples/plugged-in/
  - e2e/stage1/
  - e2e/climb/
  - e2e/m1/
  - e2e/m2/
  - e2e/staging/
  - .github/workflows/staging.yml
  - packages/cli/src/modules/staging/
  - packages/projections/src/modules/infra/
  - packages/auth/
  - packages/organizations/
slices:
  - "1 · M1.12a, the request key on every attempt's span, with check 38 (#281)"
  - "2 · M1.49, monitoring derived from the model, check 39 (#290)"
  - "3 · M1.50, one Graph for machines, the map and the worlds, check 40 (#280): handed to Goal 6, built after its cutover (M1-50-after-cutover)"
  - "4 · M7.03 and M7.04, staging up and destroy through Alchemy, and prove --env staging (#282, #291)"
  - "5 · S-35, the unique check indexed by rule and key, not cubic (#292)"
  - "6 · M1.15, Gate M1, then the preview merge into main (after 1, 2, 4, 5)"
  - "7 · M2.02, journeys for both plugins (#267, #297)"
  - "8 · M2.03, the five principals, paired with M2.02's principal part (#297)"
  - "9 · M2.04, secrets by declaration"
  - "10 · M2.05, auth, identity (with M2.24 and M2.25)"
  - "11 · M2.06, auth, ways in (with M2.26)"
  - "12 · M2.07, organizations (with M2.18, M2.22 and M2.23)"
  - "13 · M2.08, journeys through the clients"
  - "14 · M2.09, ortho new scaffolds Plugged In (with M2.27)"
  - "15 · M2.10, ortho new feature and publish --local"
  - "16 · M2.11, the work app mounts auth"
  - "17 · M2.05b, the host's Better Auth removed (after 16)"
  - "18 · ST1.03, ST1.04, ST1.06 to ST1.08, stage 1's own slices"
  - "19 · M2.13 to M2.22, the rest of M2"
  - "20 · M2.12, Gate M2, the stage 1 gate (after 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19)"
  - "21 · The staging run, then the stage 1 merge into main (after 6, 20)"
---
# Goal 3: stage 1 of Plugged In, hill-climbed through its journeys

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 3. Read `AGENTS.md` and
`design/goals/03-stage-1-hill-climbed.md`, and run it." Nothing else is needed. Milestone `Goal 3: stage 1, hill-climbed`, label
`release:beta` (K33). The front matter above is what the sync reads; this file stays the whole context (K32).

## The goal, in plain words

- **In one sentence:** Take the example app, Plugged In, to its first release: every journey a person or an agent
  takes through it passes on this computer, in test and on a real staging site, with sign-in and organizations built in.
- **Why:** The framework's parts each pass their own checks, but no real app has been built with them from end to end
  yet. Running one app's journeys is how we find what is missing, and we fix it in the framework, not in the app.
- **When it's done, you can:** start a new app from the starter, sign in as a person or as an agent, join an
  organization, claim a name and add links, and send the app to a short-lived staging site that is torn down after.
- **It is:** the framework's last first-release pieces, its first staging deploy, and the sign-in and organizations
  work, each landed with its checks written first by someone who didn't build it.
- **It isn't:** the web building blocks or the new portal (two other goals), anything on a blockchain (its own goal),
  or a production deploy.
- **Done when:** the example app's first-release checks all pass on this goal's branch, and the branch merges into the
  main line for the first beta.
- **Waits on:** nothing to start. The early preview waits on the first milestone's checks passing; the blockchain goal
  waits on our sign-in work.
- **Words used:** a journey: one thing a person or an agent does, written as steps a test runs. Staging: a real copy
  of the app on Cloudflare, made for one run and destroyed after. Hill-climbing: run every journey, fix the framework
  where one fails, and run again.

## Aaron's words, 19 November 2026

He first chose option D (the grid for stage 1, shown in the portal):

> "Set up an integration branch for this, all of your work goes in there, that way you don't have any issues of
> permissions with merging and stuff. You're totally in control of this. You have to make sure that you're setting up
> evidence, you're proving it end to end, and you're going to present it to me in a way that's very easy to see. A
> recording of the final run would be great, screenshots too."

"This should also include a staging deployment." Then he changed the shape:

> "The way people are going to use this in real life is to hill climb the journeys, right? That is the whole point of
> setting up the journeys in the first place, such that it's easy for a coding agent to just hill climb that journey.
> So really what we need to do is we need to set up the basis, make sure that it's hill climbable, and then hill
> climbing. While we're hill climbing it, based upon all of the issues and the things that we're fixing and the
> processes, we're making suggestions for the skills and the working processes."

The conductor steelmanned and strawmanned it, and he agreed to this version: **the journeys are the climb, and the grid
is the guardrail.** Staging runs on `workers.dev` for now, with no domain.

## What this goal proves

Orthograph is used this way: someone writes a blueprint and its journeys, and a coding agent climbs them until they are
green. This goal does exactly that with Plugged In at stage 1, where a person claims `@name` and gets a public page of
links. It proves four things:

1. **The climb works.** An agent that sees only what a user sees gets every stage 1 journey green.
2. **It's climbable.** Every failure tells the agent which step failed, what was expected, what came back, and which
   file to change, fast and the same every time.
3. **Everything falls out.** Every grid cell the journeys touch is green in all nine outputs, not only through the SDK.
4. **It runs for real.** The story runs in `local`, `test` and `staging` on Cloudflare, and staging is destroyed after.

What the climb teaches is the second output: every snag becomes a fix to the framework, the docs, the scaffold, the
skills or the process.

## The prompt

> You lead Goal 3 in this repository. Run it as one autonomous goal until the done check below passes on
> `goal/stage-1`, or until you are truly blocked as `AGENTS.md` defines it.
>
> Read first: `AGENTS.md`; this file, word for word; `design/milestones.md` (the v1.0 stages, M1, M2 and stage 1);
> `design/decisions/K14-the-grid.md` and `design/grid/grid.json`; K9, K13, K15, K16, K17 and K18 in
> `design/decisions/`; `design/portal.md`; `design/handoff.md`; and the `conductor`, `reviewer`, `threads` and `kanban`
> skills in `.agents/skills/`.
>
> - **Branch:** `goal/stage-1`, cut from `m1` once every m1 pull request has landed. Every change reaches it through a
>   pull request into `goal/stage-1`, which you merge when CI is green and a 🔍 reviewer that wrote none of it passed
>   it. Merge `main` in whenever `main` moves. **Started early (Aaron, 19 November 2026: "Start them now"):** the
>   branch was cut at `32388caf` (m1 at `5e66bc91` with main at `a002dab4` merged in) before three m1 pull requests
>   landed: #76 (K16, the scaffold explains itself), #95 (M1.35, visibility) and #104 (the Codex fixes). Each time one
>   lands on `m1`, `origin/m1` is merged into `goal/stage-1` through a pull request (CI green, and a 🔍 that wrote none
>   of it); #104 landed first, at `c63da4b5`. Until #76 lands, Goal 3 stays off the files it changes (the list on the
>   pull request: `packages/cli/src/main.ts` and `packages/cli/src/modules/{add,check,model}`, `e2e/m1/` checks 00, 19
>   and 22 with `loop.ts`, the canon docs, and the generated output it refreshes) and the code its builds work in:
>   `packages/language-effect/src/modules/handler/**`, `packages/generators/` and `packages/compiler/`. Plugged In's
>   `generated/` is regenerated after each m1 merge rather than hand-merged.
> - **Roles:** keep the five roles below apart. No agent plays two of them on the same journey.
> - **Ownership:** you own the architecture. Where code, design, journeys and grid disagree, decide, fix the other in
>   the same change, and record it in `design/decisions/`.
> - **The handoff:** keep `design/handoff.md` and `STATE.md` current after every merge, and move each card on the board
>   (the `kanban` skill), so a fresh or compacted session continues where you stopped.
>
> Each time a journey turns green, say so in "Where it stands" below, in two or three lines: the journey, how many
> tries it took, its snags and what they changed. Goals coordinate through git and GitHub (K32, K33), not through a
> session: at every slice start, read the open Ask issues in milestone `Goal 3: stage 1, hill-climbed` and the open
> `goal-3` issues and pull requests into `goal/stage-1`, and answer each before starting the slice. A new snag is a Snag
> issue in that milestone, and `03-snags.md` keeps the record. Every comment you or your agents post on GitHub starts
> with `[goal-3 · <role> · <harness> · <model>]`, and every new pull request carries `harness:<harness>` and
> `role:<role>` once those labels exist.

## The bound

- **Stage 1 only:** the journeys below, the framework work they need (the rest of M1, all of M2, and ST1.01 to ST1.04
  and ST1.06 to ST1.24, ST1.05 having moved to M3 by K13), and the grid cells they touch. The invariants (ST1.09 to
  ST1.22) and the speed slices (ST1.23, ST1.24) are inside because check 28 sits on this goal's ratchet list, the stage 1
  gate (M2.12) names ST1.06 to ST1.22, and the speed slices serve "climbable"
  ([`decisions/G10-goal-3-bound.md`](../decisions/G10-goal-3-bound.md)). Each milestone slice is still ticked in
  `milestones.md` with its proof when it lands, and Gates M1 and M2 must pass on this branch before it reaches `main`.
- **Local, never fake,** as in goals 1 and 2: real workerd, D1, Durable Objects, Better Auth and Collector on this Mac.
  No Docker.
- **One cloud piece: staging,** on `workers.dev`. See "Staging".
- **At most three builders at once,** and every agent stops the processes it starts before it reports.

**Aaron's override, recorded.** The rule then in `AGENTS.md`, that a milestone waited for the previous milestone's
gate on `main`, is replaced, for M1, M2 and stage 1, by one integration branch under the conductor's control (K34
since made needs, not milestone order, the rule for every goal). The
gates still order the landing, not the work.

## The five roles

| Role | Writes | Never touches |
|---|---|---|
| **Journey author** | Plugged In's stage 1 journeys and starting worlds, and the declarations in `examples/plugged-in/blueprint/` they need: the spec, as a user would write it | handlers, the framework |
| **Checks author** | the climbability check, the grid runner, and every grid cell's eval | handlers, the framework, the journeys |
| **Climber** | only `examples/plugged-in/src/`, using only what a user has: the scaffold, `ortho` and its output, the generated docs, and the skills a user would get | the blueprint, the journeys, `packages/`, any check |
| **Framework builder** | `packages/`, to clear a snag or turn a grid cell green, check first | the journeys, any check, Plugged In's handlers |
| **🔍 Reviewer** | a verdict on each pull request | anything it reviews |

The climber is the user. When it is stuck on something it can't fix inside `src/`, such as a confusing error, a
missing output, a wrong scaffold or a framework bug, it writes a snag and moves on to another step. It never works
around the framework from inside the handlers.

## The journeys

ST1.02's list, plus the story. Each is written before its climb starts and fails on empty handlers.

- **Claim:** claim a free handle; a taken one is refused with `HandleTaken`; the same request sent twice claims once;
  release; resolve a handle to its page.
- **Links:** add, order and remove a link; a stranger can't edit someone else's page.
- **The page:** anyone, signed in or not, reads a public page.
- **The story:** from a fresh folder with the real `ortho` from the local registry, `ortho new plugged-in`. A person
  signs up, claims `@aaron`, adds three links and sees their public page, through the CLI, the SDK, MCP and HTTP.

Sign-in waits on M2. Until it lands, a signed-in cast member is one of the world's fixed test people
(`Identity.testPrincipals`), so every journey but the story's sign-up can be climbed now
([`decisions/ST1-02-plugged-in-ownership.md`](../decisions/ST1-02-plugged-in-ownership.md)).

## The loop

1. **Floor.** The journey author writes the journeys, and all of them fail. The checks author writes the climbability
   check and the grid runner. The starting curve is recorded: 0 of N steps green.
2. **Climb.** The climber takes the first red step, reads `ortho prove`, changes `src/`, and runs again, until the step
   is green or it files a snag. Every prove run is appended to `design/evidence/climb/runs.jsonl`, taken from prove's
   own output and never retyped: time, journey, steps green and total, and seconds taken.
3. **Snags.** A framework builder takes each snag in `design/goals/03-snags.md`, check first, and the climber comes
   back to that step once it's fixed.
4. **Guardrail.** When every step of a journey is green, the grid runner checks the cells of every building block the
   journey used, in all nine outputs. A red cell means the journey isn't done: a framework builder turns the cell
   green. From then on CI runs that cell on every push, and a push that turns it red fails.
5. **Lessons.** When a journey is done, its snags become pull requests to the skills, the docs, the scaffold or the
   process, and the lead reports them.

### What "climbable" means, as a check

With an empty or wrong handler planted, `ortho prove` must:

- name the journey and the step that failed;
- show what was expected and what came back;
- point to the handler file and the declaration it answers to;
- finish one journey in under 30 seconds once the world is warm;
- give the same result on two runs in a row.

The checks author writes this as `nx run e2e:climb`, with one planted fixture for each kind of failure: a wrong
answer, a missing refusal, a missing event, the wrong state, and a missing span.

### What the guardrail checks

Take the step where a taken handle is refused. The journey proves `HandleTaken` reaches the SDK. The grid's error row
then checks the same refusal everywhere else:

- the CLI prints `[code] HandleTaken { … }` and exits 10;
- the MCP result carries its code, with its fields cut to what the agent may see;
- the docs list it in the claim page's refusals table;
- the portal shows it under the claim arrow, counted by code;
- the span carries `refusal.code`.

The same goes for the operation, thing, machine, event and other rows each journey uses. The grid only grows as fast
as the climb: a cell is switched on by the first journey that touches it.

### A snag entry

```md
## S-07 · claim · "a taken name is refused"
- Hit: prove said "expected HandleTaken, got Defect" with no file named.
- Lost: 4 tries, 6 minutes.
- Cause: the scaffold's Match didn't list HandleTaken, so the handler threw.
- Fix: framework, M1.44's scaffold lists every declared refusal (PR #…). Skill: none.
- Status: fixed
```

## Staging

- **Where:** Cloudflare's `workers.dev` addresses, with no custom domain for now.
- **The account and token** are the ones Aaron set on the repository on 19 November 2026: the `CLOUDFLARE_ACCOUNT_ID`
  variable and the `CLOUDFLARE_API_TOKEN` secret. They are used only inside GitHub Actions. Never read, print, copy or
  write either value, and never create another credential. If staging needs anything more, stop and ask Aaron.
- **M7.01 first:** `decisions/M7-cloud.md` records the account, the token's scope, which secret store
  `Cloudflare.secrets` means, Aaron's yes (his words above), and a cost estimate under $10 a day across everything.
- **M7.03 and M7.04:** `ortho env up staging` deploys from the model through the infra projection, and
  `ortho env destroy staging` removes everything it made. One CI workflow, run by hand, does up, the story, the
  evidence and destroy as a single job, and destroy always runs, even when the story fails.
- **Nothing left running:** after each run the job lists the account's Workers, D1 databases, Durable Object namespaces
  and R2 buckets, and fails if any of Plugged In's remain. Touch only what this goal made. The old
  `codex/links-staging` branch has no teardown, so don't run it.

## The done check

```bash
nx run e2e:stage1
```

It passes only when all of these hold, in CI on `goal/stage-1`:

- every stage 1 journey is green in `local` and `test`;
- `nx run e2e:climb` passes;
- every grid cell a journey switched on is green, with its verdict in the logbook;
- the latest staging run deployed, ran the story, destroyed everything, and left the account clean;
- every snag in `03-snags.md` is fixed, or parked with an owner and a reason.

## Evidence for Aaron

- **The climb curve:** steps green over time, from `runs.jsonl`, with each snag marked where it was hit and where it was
  fixed.
- **The snag log,** each entry linked to the change that fixed it, and the skill and process changes it led to.
- **The grid,** showing only the cells the journeys switched on, each opening its evidence. The portal's Proof page shows
  the same verdicts from the logbook.
- **The final run,** from a clean checkout:
  - a terminal recording of `nx run e2e:stage1`;
  - a browser video, recorded by Playwright, of the story from sign-up to the public page, with each call opening in
    the portal;
  - a screenshot, at desktop width, of every portal page the story touches;
  - the staging job's log: deploy, the story, destroy, and the listing showing nothing with the run's prefix afterwards.
- **One page.** The conductor publishes it as an artifact and adds each journey to it as it turns green.

## Landing

Two merges. First the preview (K28): once Gate M1's slices are green on `goal/stage-1`, open one pull request from
`goal/stage-1` to `main`. It merges when CI is green, Gate M1 passes on it, and a 🔍 reviewer that wrote none of it passed
the whole branch; the goal then carries on from its branch. Then, when the done check passes, open one more pull
request from `goal/stage-1` to `main`. It merges when Gates M1 and M2 pass on it, `nx run e2e:stage1` passes in CI, and
a 🔍 reviewer passed the whole branch. Then tag `plugged-in/stage-1`.

K28 decides the preview merge and the three releases: [`K28-releases.md`](../decisions/K28-releases.md).

## Where it stands

**Parked on 23 November 2026 under K42** (`design/decisions/K42-goals-are-agents.md`): goals become agents, and this goal's open slices become items on the board. Last rewritten at `goal/stage-1` after M2.04's build merged. A fresh owner starts here, then reads `design/goals/03-snags.md` and the open issues in milestone "Goal 3: stage 1 of Plugged In, hill-climbed through its journeys". Nothing is running in this lane.

**Where the work is.**
- **M1 is on `main`.** The M1 preview ([#602](https://github.com/Open-Harness/orthograph/pull/602)) merged on 23 November with Gate M1 green. Only check 40 is left on M1's list. Check 40 is M1.50, the one `Graph`, which is Goal 6's after its cutover ([`M1-50-after-cutover`](../decisions/M1-50-after-cutover.md)).
- **M1.51, the npm preview, is built on `goal/stage-1`.** The pieces:
  - checks [#678](https://github.com/Open-Harness/orthograph/pull/678), build [#683](https://github.com/Open-Harness/orthograph/pull/683), and the G12 pair [#702](https://github.com/Open-Harness/orthograph/pull/702);
  - `node tools/release/preview.mjs --dry-run` lists the 16 public packages with version, tag `next`, licence and files. It refuses any other tag on npmjs, makes no connection and sends nothing;
  - every public package is Apache-2.0, with a root and a per-package LICENSE ([`L1-apache-2`](../decisions/L1-apache-2.md), Aaron's "Make it all Apache 2.0").

  The licence moved each package's recorded hash, so acme's and Plugged In's `generated/` and the baselines were regenerated and recaptured as a G12 pair.
- **Stage 1 to `main`: [#707](https://github.com/Open-Harness/orthograph/pull/707)** (`goal-3/stage-1-to-main-m1-51`) carries M1.51 to `main`. Its 🔍 of everything since `0d0c4b31` passed at `ba9c50bc`. **Goal 19, the lander, owns it now**: it merges `goal/stage-1` in, runs a delta 🔍, and lands it. Then Aaron signs in and runs `npm publish` under `next`, and publishing moves to Goal 15 ([#542](https://github.com/Open-Harness/orthograph/issues/542), item 1).
- **M2.** The decision (M2.01), the principal journeys and M2.03's build ([#297](https://github.com/Open-Harness/orthograph/pull/297)) are in. M2.04, secrets by declaration, is built:
  - checks [#659](https://github.com/Open-Harness/orthograph/pull/659), build [#690](https://github.com/Open-Harness/orthograph/pull/690);
  - `Blueprint.secret`, `Blueprint.layer` hands `Redacted` values, `ortho secrets` and `ortho secrets set` (stdin only, 0600 file), and `promote` refuses a missing stored secret;
  - the readings are in [`M2-04-secrets-readings`](../decisions/M2-04-secrets-readings.md);
  - M2.04 is inert until a plugin declares a secret.

  M2.05 to M2.11, M2.05b and Gate M2 are not started.
- Plugged In's seven journeys are green in local and test, the climb is green, and staging run 3 passed 5 of 5 and was destroyed.

**Open slices, now board items** (issues #627 to #647, kind:slice). The ones not done:
- [#636](https://github.com/Open-Harness/orthograph/issues/636) M2.05 identity, with M2.24 and M2.25. Tell Goal 4 the commit when it merges.
- [#637](https://github.com/Open-Harness/orthograph/issues/637) M2.06 ways in; [#638](https://github.com/Open-Harness/orthograph/issues/638) M2.07 organizations.
- [#639](https://github.com/Open-Harness/orthograph/issues/639) to [#642](https://github.com/Open-Harness/orthograph/issues/642): M2.08 to M2.11.
- [#643](https://github.com/Open-Harness/orthograph/issues/643) M2.05b; [#644](https://github.com/Open-Harness/orthograph/issues/644) stage 1's own slices; [#645](https://github.com/Open-Harness/orthograph/issues/645) M2.13 to M2.22.
- [#646](https://github.com/Open-Harness/orthograph/issues/646) Gate M2; [#647](https://github.com/Open-Harness/orthograph/issues/647) the staging run and the second landing.
- Pair map: `design/decisions/M2-auth.md`. A slice that moves acme's wire, model or `generated/` lands as a G12 pair.
- Parked asks from other goals: #480, #474, #478, #486, #501, #531 to #534.

**Open snags that matter.**
- [#446](https://github.com/Open-Harness/orthograph/issues/446): an agent's key can mint a person's key through `/api/auth`. This is security work, and it belongs with M2.05.
- [#695](https://github.com/Open-Harness/orthograph/issues/695): secrets hardening from M2.04's review. `promote` reads only the local `secrets.env`, which M2.05 must settle. Also the argv echo, a non-atomic write, and the `then` key.
- [#660](https://github.com/Open-Harness/orthograph/issues/660): how secret names with digits or runs of capitals split.
- [#688](https://github.com/Open-Harness/orthograph/issues/688): the preview's root LICENSE check reads the repository, not `--root`.
- [#620](https://github.com/Open-Harness/orthograph/issues/620): the wallet advice from #616.
- [#503](https://github.com/Open-Harness/orthograph/issues/503): a pull request's token can record a production release.
- [#449](https://github.com/Open-Harness/orthograph/issues/449), [#451](https://github.com/Open-Harness/orthograph/issues/451): the API key's daily limit, and a commit issue for a call still retrying.
- [#606](https://github.com/Open-Harness/orthograph/issues/606): S-19's write-order ratio near its bar under load.
- [#588](https://github.com/Open-Harness/orthograph/issues/588): e2e-m2 runs on drafts.

**How the work ran here, worth keeping.**
- Draft first, then a 🔍 that wrote none of it, then ready, with at most two ready per lane. Wait on CI with `tools/ci/watch-required.sh`; any exit but 0 is not green.
- A cancelled duplicate CI run shows unexpanded `${{ … }}` check names as failed. They aren't required checks; merge by hand with `--match-head-commit`.
- Never wait with `pgrep -f`: it matches itself. Wait on a PID or a sentinel line.
- Bring a branch up to date by merging its base, never by rebasing.

**Agreements that carry over.**
- The conductor owns `.agents/skills/kanban/STATE.md`; take main's version at each merge of `main`.
- Goal 4: when M2.05 merges, tell it the commit.
- Goal 5 owns ST1.25 to ST1.28, M1.22 and M1.23, and the portal's move off HeroUI.
- Goal 6 owns M1.50 after its cutover.
- M1.37 stays as it is, by the conductor's call.
