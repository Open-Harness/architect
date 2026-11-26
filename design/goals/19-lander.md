---
goal: 19
title: the lander, keeping main fresh
milestone: "Goal 19: the lander"
release: beta
branch: main
base: main
status: running        # ready | running | landing | done | parked
lead:
  harness: amp         # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-23    # the date it started
  thread: https://ampcode.com/threads/T-01a209a1-9868-7586-bf92-78d1f6c34e13 # the Amp loop, a round every 30 minutes
done_check: never done; it runs while the apps are being built (K42, section 8)
owns:
  - main
  - design/goals/19-lander.md
slices:
  - "1 · goal/stage-1 lands in main and is retired; every goal branch then bases on main"
  - "2 · The winding-down goals' finished work lands in main (after 1)"
  - "3 · The landing loop (after 1)"
---
# Goal 19: the lander, keeping main fresh

Branch `main`. Written 23 November 2026 from K42 (`design/decisions/K42-goals-are-agents.md`, section 8), with Aaron,
by voice (#694). Milestone `Goal 19: the lander`, label `release:beta`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 19. Read `AGENTS.md`,
`design/decisions/K42-goals-are-agents.md` and `design/goals/19-lander.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Bring each app's finished work into the main branch as clean, reviewed pull requests, so the
  main branch stays fresh and every release is cut from it.
- **Why:** The apps build on their own branches so they never stop. Without a lander, their work piles up away from
  the main branch and lands in one painful merge at the end.
- **When it's done, you can:** it is never done. At any moment the main branch holds every finished slice, it is green,
  and each app's branch is close to it.
- **It is:** the one agent that moves app work into the main branch, and the owner of the main branch being green.
- **It isn't:** a builder. It writes no feature code and decides no priorities; the framework goal ranks the work.
- **Done when:** never; it stops only when Aaron says so.
- **Waits on:** nothing.
- **Words used:**
  - the framework goal: the always-running goal that decides what gets built next;
  - a slice: one piece of an app's work that ends green, with its own tests passing;
  - landing: bringing a slice into the main branch by a reviewed pull request;
  - merging the main branch in: an app bringing the main branch's new work into its own branch, never by rewriting
    its history;
  - extraction: moving a piece out of an app and into Orthograph's own packages, so it is part of the framework.

## Read first

- K42, sections 1, 3 and 8; K38 (early landing); `design/decisions/CI-drafts.md` and `CI-drafts-race.md`;
  `design/decisions/CI-branch-protection.md`.
- The `reviewer` and `github` skills.

## The slices

| # | Slice | After |
|---|---|---|
| 1 | `goal/stage-1` lands in `main` once Goal 3's last pull requests (#683, #690) are in and it is green, then it is retired. First check that `main` requires each protection `goal/stage-1` has (its CI jobs, `builder-paths`, resolved threads). Then every goal branch, `goal/superagent` and `goal/capxul` among them, bases on and merges in `main` | — |
| 2 | The winding-down goals' finished work lands in `main`: each goal's green slices on its branch (K42, section 7), by the landing method below. What is unfinished stays on its branch, and its items wait on the board | 1 |
| 3 | The landing loop, run from then on | 1 |

## The landing loop

1. **Is `main` green?** If not, that is the first job: find what turned it red and fix it, or revert it.
2. **Find what is ready.** On each running app goal's branch, the slices that are green, reviewed and merged there
   since the last landing.
3. **Land whole slices.** For each, cut a branch at the commit that ends it, open a pull request into `main`, have a
   🔍 that wrote none of it pass it, and merge it by a merge commit, never squashed (K38). At most two of the lander's
   pull requests are in CI at once (CI-drafts).
4. **Extraction is its own pull request.** When an app goal moves a plugin from its `plugins/` into `packages/`, that
   move is its own pull request on `main`, and the app then mounts the package.
5. **Tell the apps.** After each landing, tell every running goal what landed. Each merges `main` into its branch at
   its next slice start. Nobody rebases a shared branch.

## How it runs

- **Merging.** The lander's pull requests follow `AGENTS.md`: drafts first, a 🔍 that wrote none of it, then ready,
  and merge when CI is green and every thread is resolved.
- **Conflicts.** When a landing conflicts with `main`, the lander merges `main` into the landing branch and resolves
  it there. When the answer needs the app's knowledge, it asks that app goal.
- **Limits.** `AGENTS.md`'s standing rules. Stop every process you start, by its id.

## Where it stands

26 November 2026, about 15:00 UTC. The Amp lander loop (the thread in `lead:`) runs this goal, a round every 30
minutes for Aaron. A Claude Code lead started the goal and took slice 1; the Goal 16 conductor reports that Aaron has
said no Claude-led goal is running now.

- **Slice 1 is done.** #707 landed `goal/stage-1` in `main` at `438f631c`, with all ten required checks green.
  `goal/stage-1` is retired: it is locked read-only with its protections kept, and not deleted. `main` requires all ten
  checks, `e2e-stage1` among them (CI-main-stage1). Every goal bases on `main` and merges it in, never by rebasing
  (CI-stage-1-retired). Codex's two findings on #707 are Snags #765 and #766.
- **Slice 2 is done.** Every parked goal's finished work is in `main`, and each of their branches is 0 commits ahead of
  it. `goal/time` came in with #707, through #696. Then, in order: #294 (Goal 7's spike, for the record), #777
  (workflows, wallets and club), #774 (portal), #778 (on-chain), #785 (ui-layer, which also runs `e2e-ui-layer` on
  `main`, not required: CI-main-ui-layer), #789 (release), #793 (agents) and #794 (events). #793 and #794 applied K40's
  fixes 1, 3 and 5 for the parked owners as dated notes, and the lander closed Asks #535, #536 and #538. Goal 18's board
  sync then took #535 and #536 over as capability rows and reopened them (Snag #898). The parked goals' unfinished
  drafts (#490, #498, #497 and #708) stay on their branches.
- **Slice 3, the landing loop, is running.** Fifteen Capxul rounds have landed. `goal/capxul` is ahead of `main`
  by payroll, slice 9a: #1078's checks with #1102's build, and #1105 (CX-payroll-tax: the United States only)
  between them, which the next round lands together:
  - #832 brought `goal/capxul` through #786, at `1770ffad`.
  - #913 brought #787 (slice 10's Bridge build) and #911 (Goal 16's brief), at `5027d6a8`.
  - #919 brought slice 8c's holidays, at `de09a851`: #914, the checks, and #918, the handlers.
  - #929 brought #921 (Goal 16's docs) and #922 (`Day` becomes `Blueprint.day()`), at `9295d2ab`.
  - #936 brought slice 8's Branch and Employee Grade, at `792d6062`: #924, the checks, and #927, the build.
  - #947 brought #926 (the USDC decision), at `82a5ef6b`.
  - #961 brought slice 8's expense claims in USDC, at `8471eb92`: #937, the checks (with CX-expense-leavers), and
    #955, the handlers.
  - #979 brought slice 8d's attendance and shifts, at `bc723cba`: #964, the checks, and #970, the handlers, with #960
    (Goal 16's brief) and #973 (Goal 16's merge of `main`). The lander's first try, #978, resolved its merge of `main`
    by taking `status.md` and Goal 16's brief whole from `goal/capxul`, which undid `main`'s board rows; the 🔍
    blocked it, and #979 was cut on #973's merge instead.
  - #990 brought slice 8e's recruitment, at `2a22de48`: #982, the checks, and #985, the build. #982 had no 🔍 posted,
    so the lander's 🔍 tested it: all six recruitment journeys fail on blank handlers, and each of 12 planted wrong
    builds fails a named step.
  - #1013 brought slice 8f's employee moves, at `160f7893`: #1000, the checks (with CX-employee-moves), and #1009, the
    build, with #991 and #1005 (Goal 16's merges of `main`). #1000 had no 🔍 posted either, so the lander's 🔍 tested it:
    on blank handlers only the four 8f journeys fail, and each of 13 planted wrong builds fails a named step.
  - #1033 brought Bridge part one, at `2dfa8d90`: #1007, the checks, and #1027, the build. The lander's 🔍 first
    blocked it at `96d20c17`: the Bridge plugin was generated before #994 and #1021 changed `main`'s generator, so
    regenerating it from the pinned spec gave a different `src/index.ts`, `src/runtime/client.ts` and two new
    scaffolds. Goal 16 regenerated it (`4ab55270`), the lander merged that commit without #1017, whose build had not
    landed, and the 🔍 passed `56be9a16`: the regenerated plugin matches byte for byte, and `prove` gives 56/56 moves,
    54/54 outcomes and 70/70 refusals.
  - #1052 brought slice 7a's ledger, at `f8a20825`: #1017, the checks, and #1043, the build, with #1036 and #1039
    (Goal 16's merges of `main`). #1043's merge also carried #1030, so #1052 was cut at `3c27593a`, the tip of
    #1043's own commits. The 🔍 passed it: `prove` gives 63/63 moves, 62/62 outcomes and 94/94 refusals; on blank
    handlers only the six ledger journeys fail, and each of six planted wrong builds fails a named step. Codex's one
    finding, that the generated CLI can't pass a list flag, is Snag #1034.
  - #1057 brought slice 8g's appraisals and slice 8b's leave together, at `cd85ba7d`: #1030 and #1051, and #1026 and
    #1055. #1051's last fix (`7a55e9bb`) sat on #1026's merge, so the two landed as one. The 🔍 passed it: `prove`
    gives 91/91 moves, 84/84 outcomes and 174/174 refusals; on blank handlers exactly the 15 new journeys fail, and
    each of 12 planted wrong builds fails a named step. #1026 had no posted 🔍, and Goal 16 was asked to post it.
  - #1097 brought two docs slices, at `a03ef322`: #1050 (CX-ledger's balance and P&L with no fiscal year, and
    CX-appraisals: a submitted appraisal still rescores) and #1088 (CX-payroll-tax: a tax module per jurisdiction,
    the United States first). The 🔍 checked every cited ERPNext and HRMS line and passed it; its one nit, a
    132-column line in CX-ledger, is Goal 16's to rewrap (#426).
  - #1107 brought #1091, Capxul's journeys in CI (the `e2e-capxul` job), at `8d40dfdc`, cut at `d697e8ee` so #1078
    stayed out. Merging `main` conflicted in `ci.yml`, where #1092 had moved `e2e-portal-next` and `e2e-ui-layer` into
    the `parked` workflow; the lander kept `main`'s layout and added only the new job. #1091 had no 🔍 of its own, so
    the lander's 🔍 reviewed its three files too and passed them, and Goal 16 was asked to post a 🔍 on every slice.

  Capxul has no ratchet, so a checks slice lands only with its build. Since #1107, `e2e-capxul` runs `prove` on
  `examples/capxul` for pull requests into `goal/capxul` and `main`; it is not required, and it skips on push (noted
  for Goal 18 on #718), on docs-only pull requests and on those that can't change what `prove` does. A 🔍 failed #919
  while it carried only #914, with `prove` ✘ and 17 failing, so #919 stayed a draft until #918 merged. #929 was cut
  before #924 for the same reason. Goal 16 also lands its framework slices in `main` itself: #915 (the Dates checks)
  turned `main` red at `bf3c60bf`, and #917 (the Dates build) made it green again at `9afb7efd`. Three more landed the same
  way: #939 (`check` refuses a role path that walks to nothing, and a `Blueprint.todo` in `allowed` is a blank), #943
  (exact decimals and two-way links, the build) and #928 (CX-takeover). #928's board rows turned the `goals` sync red
  on `main` at `2cdfa9b3`: `webhook-doors` and Goal 16's rows overlapped in
  `packages/host-cloudflare/src/modules/store`. #948 narrowed `webhook-doors`' Touches to `inbound/`, as CX-takeover
  says ("inbound/ stays Goal 17's"), and the sync is green again at `f72338b2`. The row
  still leaves out the doors' other homes from #747 (`projections/src/modules/server`, compiler mounts and the
  generators' adapter); a complete row would overlap Goal 16's gap-optional-columns, which is noted for Goal 18 on #718.

  #887 landed `goal/superagent` through `4123b1cb` in `main`, at `dbbdee56`, and the branch is 0 commits ahead of it.
  Goal 16 has run Goal 17's lane since CX-takeover. A reviewer thread that wrote none of them recorded the 18 🔍
  verdicts the slices lacked, indexed on #887: 11 passed and 7 blocked. The blocks were Snags #899 to #901 (fixes the
  lander's 🔍 found in framework code) and #932 to #935 (checks-side), and #940, #941, #949 and #951 fixed them all.
  `main` then no longer merged in: seven files conflicted, four of them framework code that both `main` and
  `goal/superagent` had changed, so Goal 16 merged `main` into `goal/superagent` itself (#962, with its own 🔍), not
  the lander. #962 also
  pointed the plugins' fields at `Superagent.fields.id` and `Account.fields.id`, so #939's role paths walk
  (GOAL17-dead-role-paths), and moved checks 15, 19 and 25 off made-up ids; Goal 16 both authorised and made those
  check edits. #887's 🔍 found #903 with no 🔍 and #949's pass only in the builder's words, and recorded both. The
  superagent ratchet gave 38 failing, 38 expected and 0 unexpected. #781 and #905 are still open on `goal/superagent`.

  #993 landed `goal/superagent` at `446fb6dd` in `main`, at `71e55caa`: #946, the adapter generator's build for #739,
  which Capxul's Bridge adapter (#716) needs. The merge was mechanical: #975's build had not yet changed
  `runtime/client.ts` on `main`, and `embed-runtime.ts` and `ortho generate` left no diff. The 🔍 rebuilt all 24
  generated adapter plugin files from the pinned specs, byte for byte. Codex found that the generator drops body
  fields of a `oneOf`/`anyOf` nested in another alternative. No pinned spec has that shape, so it is Snag #996 for
  Goal 16, not a block.
- **Snags filed for Goal 18:** #762 (a flaky port check in `portal.test.ts`), #788 (`examples/budgets` imports
  `receipts`, which `orthograph` does not export), #898 (the board sync takes over closed Asks),
  #908 (`e2e-layer1` check 4 fails at random; it turned `main` red at `06877509` and #919 red at `3822d439`,
  and a rerun passed each time) and #944 (host-cloudflare `entry.test.ts` "a spawn has a token of its own" fails at
  random; #1073 made both tests wait for the token to go back, at `2a8e4d56`).
  Two tests in that file fail at random: "a spawn has a token of its own" (at `4068d588`, on `main` at
  `6f77a26a` and on #993 at `e5087506`) and "is counted from arrival …" (at `9a8601a6`, on #993's rerun at
  `e5087506`, and on `main` at `85ee3707` and `765ee8dd`). Reruns passed at `4068d588`, `9a8601a6`, `765ee8dd` and, on
  the second rerun, `e5087506`; `main` went green again on its next commit after `6f77a26a` and after
  `85ee3707`. The lander asked Goal 18 on #718 to rank #944 up. #1008: projections' `decimal-doors.test.ts` makes
  scratch folders inside `packages/projections/.ortho/`, and `compiler`'s role-paths test, reading that package through
  acme, failed on one that had gone, on `main` at `765ee8dd`. `logbook`'s `local/routes.test.ts` failed once on #948
  and passed on rerun. #1035: `e2e-layer2` check 3 fails at random with "world's address was taken" (on `main` at
  `67605c1e`; a rerun passed). #1058: `prove`'s `promote/staging.test.ts` fails at random when its issuer's port is
  taken (on `main` at `f8a20825`; `main` was green on its next commit, `c819ed27`). #1071's `parked` label
  description was over GitHub's 100 characters, so the `goals` sync was red on `main` from `4424c0a5` until #1073
  shortened it (`2a8e4d56`).
- **Next:** each round lands what the app branches have merged since, and tells every running goal after each
  landing.
