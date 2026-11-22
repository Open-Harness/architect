---
goal: 3
title: stage 1 of Plugged In, hill-climbed through its journeys
milestone: "Goal 3: stage 1 of Plugged In, hill-climbed through its journeys"
release: beta
branch: goal/stage-1
base: main
status: running        # ready | running | landing | done | parked
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

Rewritten at every slice merge. Last rewritten on 22 November 2026, at `goal/stage-1` `374cd994`. A fresh lead in any harness starts here, then reads `design/handoff.md` (the ids and the lines of work), `design/goals/03-snags.md`, and the open issues in milestone "Goal 3: stage 1 of Plugged In, hill-climbed through its journeys". Sessions don't carry over; everything below is in the repository or on GitHub. The repository moved to `Open-Harness/orthograph`; older links below point at `AaronAbuUsama/architect` and redirect.

**Where the goal is.** Every slice of Gate M1 is on `goal/stage-1`. M1.50, the one `Graph`, is built in Goal 6 after its cutover, and Gate M1 doesn't wait for it ([`M1-50-after-cutover`](../decisions/M1-50-after-cutover.md)). Check 40 is the one entry left on the e2e-m1 ratchet. Plugged In's seven journeys are green in local and test, and the climb is green. Staging deploys: run 3 ([44940466011](https://github.com/Open-Harness/orthograph/actions/runs/44940466011)) went up, passed the story 5 of 5, and destroyed with nothing left, for about $0. In M2, the decision (M2.01) and the principal journeys with M2.03's build ([#297](https://github.com/Open-Harness/orthograph/pull/297)) are in.

**How pull requests run (CI-drafts, #293).** Every pull request opens as a draft, and a draft runs no CI. The 🔍 reads the draft and runs the affected checks locally. Then the pull request is marked ready and CI runs once. At most two of this lane's pull requests are ready at a time. After every push, a background watcher waits for CI to end and merges when it is green with no unresolved thread (`tmp/goal3/automerge.sh`, untracked).

**Merged on 21 and 22 November** (newest first):
- [#267](https://github.com/Open-Harness/orthograph/pull/267): M2.02's moved journeys, the auth and organizations stand-ins (`e2e/m2`).
- [#537](https://github.com/Open-Harness/orthograph/pull/537): CI Part B on this branch's `ci.yml` (the CI lane's): a pull request into another goal branch runs the fast gate.
- [#523](https://github.com/Open-Harness/orthograph/pull/523): `ortho env up|destroy --environment test`, for Goal 15's ask #505.
- [#547](https://github.com/Open-Harness/orthograph/pull/547): the canon's claim quote follows `acting(principal)`.
- [#528](https://github.com/Open-Harness/orthograph/pull/528): S-35's 40,000-row backstop is a same-runner ratio (under 30), not a 2-second clock; closes snag #452.
- [#297](https://github.com/Open-Harness/orthograph/pull/297): M2.02's principal journeys (check 42) and M2.03's build, paired (G12).
- [#448](https://github.com/Open-Harness/orthograph/pull/448): M7.04's prove side, `ortho prove --env staging` reads D1 facts.
- [#447](https://github.com/Open-Harness/orthograph/pull/447): M1.49, monitoring derived from the model ([`M1-49-issue-attribution`](../decisions/M1-49-issue-attribution.md)).
- [#350](https://github.com/Open-Harness/orthograph/pull/350), [#292](https://github.com/Open-Harness/orthograph/pull/292): S-35's build and checks, the unique check indexes held rows by rule and key.
- [#291](https://github.com/Open-Harness/orthograph/pull/291), [#282](https://github.com/Open-Harness/orthograph/pull/282), [#429](https://github.com/Open-Harness/orthograph/pull/429): staging, check 41, up and destroy on Alchemy, the CLI path fix.
- [#281](https://github.com/Open-Harness/orthograph/pull/281): M1.12a, the request key on the operation span.
- [#290](https://github.com/Open-Harness/orthograph/pull/290), [#432](https://github.com/Open-Harness/orthograph/pull/432), [#280](https://github.com/Open-Harness/orthograph/pull/280), [#347](https://github.com/Open-Harness/orthograph/pull/347): checks 39, 40 and 21.
- [#302](https://github.com/Open-Harness/orthograph/pull/302), [#430](https://github.com/Open-Harness/orthograph/pull/430): `main` merged in (effect 4.1.4, K30, K34).

**In flight.** Each pull request goes into `goal/stage-1`.

| PR | What it does | State, and the next step |
|---|---|---|
| [#549](https://github.com/Open-Harness/orthograph/pull/549) | Ask #542: `ortho --version` prints the CLI's version; `wallets` and `language-solidity` are private | Draft, under 🔍 |
| the #541 fix | Monitoring history apart from the Calls page's 30 minutes, so derived burn alerts can fire locally (also snag #450) | A builder is on it |
| the #466 checks | An operation declares `needsApproval`; `AR-007` is `ApprovalDeclined` (Goal 5's ask) | An author is on it; a builder follows |
| this pull request | M1-50-after-cutover, this section | Draft, under 🔍 |

**Next, in order.**
1. Asks from the goals on the Beta path first (5, 6 and 15, then 4 and 9): #541, #542 and #466 above.
2. The preview merge: one pull request from `goal/stage-1` to `main`, with CI green, Gate M1 passing and a 🔍 of the whole branch (K28). Then M1.51, Aaron's npm publish under `next`, then the publish hand-over to Goal 15 (#542, item 1).
3. M2.04 to M2.11 in the pairs `design/decisions/M2-auth.md` maps, then M2.05b and Gate M2 (M2.12). When M2.05 merges, tell Goal 4.
4. The asks from parked goals, after those: #480, #474, #478, #486, #501, and the superagent's #531 to #534.

**Open snags that matter.**
- [#446](https://github.com/Open-Harness/orthograph/issues/446): an agent's key can mint a person's key through `/api/auth`. Security; it belongs with M2's auth slices.
- [#503](https://github.com/Open-Harness/orthograph/issues/503): a pull request's token can record a production release in the logbook.
- [#438](https://github.com/Open-Harness/orthograph/issues/438), [#431](https://github.com/Open-Harness/orthograph/issues/431): a deployed portal keeps no issues past its isolate; a failed staging deploy hides what it couldn't find.
- [#449](https://github.com/Open-Harness/orthograph/issues/449), [#451](https://github.com/Open-Harness/orthograph/issues/451): every API key is refused after 10 calls a day; a commit issue opens for a call still retrying.
- [#304](https://github.com/AaronAbuUsama/architect/issues/304) (S-36): S-19's write-order ratio is near its bar under load. JOU-13 (no journey can force a race) has no slice.

**Agreements with other lanes**
- **The conductor** owns `.agents/skills/kanban/STATE.md` on `main`. Never edit it here; take main's version at each merge of `main`.
- **Goal 4** (on-chain, `goal/on-chain`): when M2.05 merges, tell it the commit, as an Ask-free comment on its goal issue.
- **Goal 5** (the UI layer, `goal/ui-layer`, K29): ST1.25 to ST1.28 and M1.22 and M1.23 are its work. The portal moves off HeroUI there (ST1.27). Don't build portal screens here that it replaces.
- **Goal 6** (the portal, K31): its cutover asks Goal 3 through a `goal-3` pull request that adds a freeze line, and merging it is the freeze.
  M1.50, the one `Graph`, is Goal 6's, built in `@orthograph/shell` after cutover; a checks author first moves check 40 to the shell (M1-50-after-cutover).
- **Aaron's standing authority** (21 November): anything waiting on him goes ahead on the recommendation, and the call is recorded.
- **M1.37** (the MCP output schema) is left as it is, by the conductor's call.
