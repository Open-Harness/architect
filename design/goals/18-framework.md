---
goal: 18
title: the framework, always running, building the Orthograph alpha
milestone: "Goal 18: the framework"
release: preview
branch: main
base: main
status: running        # ready | running | landing | done | parked
lead:
  harness: claude      # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5 # the model id it runs on
  since: 2026-11-26    # the date it started
done_check: from a registry, `ortho new app` makes an app that declares, generates, proves and runs, and its generated CLI, SDK and MCP answer; then the same from npm (slices 11 and 12)
owns:
  - design/goals/
  - docs/canon/status.md
  - tools/github/
  - tools/release/
  - packages/preset/
  - .agents/skills/conductor/
  - .agents/skills/github/
  - .agents/skills/threads/
slices:
  - "1 · The goals K42 stops, wound down"
  - "2 · The board: the status page's items, claims, the split, and the sync that writes the Project"
  - "3 · The loop (after 1, 2)"
  - "4 · The board re-sorted for K44: rows, release rule, milestones and roadmap; Goal 17's claims released"
  - "5 · Publishing that works: a real version, pnpm publish, the starter in the preset, the release-age exemption, a dry run that refuses each mistake"
  - "6 · A command that creates an app: ortho new app and npm create orthograph"
  - "7 · Getting started and help text for every command and flag"
  - "8 · The portal ships without its screens, and says so"
  - "9 · The chain basics in the alpha: their on-chain checks run on main, and the relayer fixed or marked experimental"
  - "10 · Framework fixes no goal has claimed that any TypeScript app hits, the starter's #446 and #449 first"
  - "11 · The acceptance check: install from a registry, create an app, prove, run and call it (after 5, 6)"
  - "12 · Publish under next with Aaron, and the acceptance check against npm (after 7, 8, 9, 10, 11)"
  - "13 · The climb: each build's capabilities, tests and slices on one dashboard, refreshed nightly (after 4)"
---
# Goal 18: the framework, always running, building the Orthograph alpha

Branch `main`, by this goal's own pull requests. Written 23 November 2026 from K42
(`design/decisions/K42-goals-are-agents.md`), with Aaron, by voice (#694); given the alpha on 25 November by K44
(`design/decisions/K44-two-builds.md`). Milestone `Goal 18: the framework`, label `release:preview`.

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 18. Read `AGENTS.md`,
`design/decisions/K44-two-builds.md` and `design/goals/18-framework.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Make Orthograph installable and usable by someone outside this repository: one command makes an
  app, and the whole TypeScript loop works from npm. Meanwhile keep the framework's work in order for Capxul.
- **Why:** Inside the repository a new app goes from nothing to proved and running in about thirty minutes. From npm it
  doesn't work at all, and none of the reasons is the framework itself.
- **When it's done, you can:** install Orthograph from npm, make an app with one command, declare what it holds,
  generate its server and its tools, write its handlers in TypeScript, prove it, run it, and use the chain's basics.
- **It is:** the framework's one always-running goal: packaging, a command that creates an app, a getting-started page,
  framework fixes no one else has claimed, and settling anything two goals both claim.
- **It isn't:** the portal's screens, Capxul, or the chain beyond keys, wallets, reads, sends and the follower.
- **Done when:** a check installs Orthograph from a package registry, makes a fresh app, proves it, runs it and calls
  it; then the same works from npm.
- **Waits on:** Aaron, for the publish itself, which needs his npm account.
- **Words used:**
  - a blueprint: the typed description of an app that everything else is generated from;
  - its tools: the generated command line, the SDK (a typed library for calling the app) and MCP (the same calls for AI
    agents);
  - proving: running the app's journeys, its scripted user stories, and judging it from real evidence;
  - npm, a package registry: where JavaScript packages are published; `next` is the tag for early releases;
  - the portal: the web page every app gets for looking inside it;
  - Capxul: the business app being rebuilt on Orthograph;
  - the chain's basics: keys, signing, wallets, sending and reading, and following what happens on chain.

## Read first

- K44, then K42 (how goals work) and K28 (the preview).
- The trial of 25 November (K44, The problem): a fresh app made from `main` and proved, and every place it broke for an
  outsider. `tools/e2e/starter.sh` is the route that works inside the repository; `tools/release/preview.mjs` is the dry
  run.
- `docs/canon/status.md`, the board; the `conductor`, `github` and `reviewer` skills.

## The slices

Slices 1 and 2 are done; slice 3 is the loop that runs throughout. Slices 4 to 10 can run side by side.

| # | Slice | After |
|---|---|---|
| 1 | The goals K42 stops, wound down: each lands what it has in review (K42, section 7), sets `status: parked` and stops; the lander brings their finished work into `main`. Their open slices become board items, and the 33 open Ask issues are sorted | — |
| 2 | The board: the capability map in `docs/canon/status.md`, one row per item, written by `tools/github/sync.mjs` to one issue per row and the Project's fields | — |
| 3 | The loop (below), run from then on | 1, 2 |
| 4 | The board re-sorted for K44: each row the superagent pulled goes to the alpha, to Capxul or to "Not yet needed", and the chain basics to the alpha; `tools/github/board.mjs`'s release rule, pulled-by list and app milestones, and `roadmap.mjs`'s ranking, follow K44 section 4; Goal 17's claims, released by K44, stay released; the labels of any issue K44's merge left unchanged are set to K44's | — |
| 5 | Publishing that works: a real version (`0.1.0-next.<n>`), published with pnpm so `workspace:` links and the `bin` are rewritten; the starter copied into the preset when it is packed; the preset's new workspace exempting `orthograph` and `@orthograph/*` from pnpm's minimum release age; the dry run refusing a `workspace:` link, a `bin` outside the tarball, or a preset with no starter | — |
| 6 | A command that creates an app: `ortho new app <name>`, spelled beside the existing `ortho new adapter`, and `npm create orthograph`, both making the app the preset makes | — |
| 7 | Getting started: one page from install to a proved, running app and its generated tools (`<APP>_URL`, `<APP>_TOKEN`); a description on every command and flag; the stale READMEs (the CLI's says it has only `model`). Its checks hold the page to the code; running the page's steps is slice 11's (GOAL18-getting-started-acceptance) | — |
| 8 | The portal ships without its screens: the server and the blueprint feed answer; asking for the screens says they aren't in this release, not a 404 | — |
| 9 | The chain basics in the alpha: the on-chain checks of keys, wallets, the chain adapter, money and the follower run on `main`; the relayer's #784 fixed, or the relayer marked experimental | — |
| 10 | Framework fixes any TypeScript app hits that no goal has claimed: the starter's sign-in bugs #446 (an agent's key can mint a person's key) and #449 (API keys refused after ten calls a day) first. A gap a goal has claimed stays with that goal (K42, section 3); Capxul builds the ones it claimed | — |
| 11 | The acceptance check: in CI, publish to a local registry, run `ortho new app`, declare one thing, generate, prove, run it and call it through the generated CLI, SDK and MCP. Its checks start from check 09 of #1111 and take the getting-started page's steps as one of their inputs (GOAL18-getting-started-acceptance) | 5, 6 |
| 12 | Publish under `next` with Aaron, with Gate M1 green on `main` (it doesn't wait for the portal's graphs, M1.50), then run the acceptance check against npm | 7, 8, 9, 10, 11 |
| 13 | The climb (K45): a script in `tools/github/` that works out, for the alpha and for Capxul, each dimension at every commit or event that moved it: the board's rows by stage from `main`; the alpha's check files green and red, from Goal 3's branch until Gate M1 reached `main`, then `main`; Capxul's journeys written on its branch; the slices closed on GitHub; later, the tests and record types planned but not written. A dashboard of it, refreshed nightly | 4 |

## The loop

Each round:

1. Read the board: every item not yet built, with its stage, its needs and its claims.
2. Find what can run now: items whose needs have landed and that nobody else has claimed.
3. Rank them:
   1. an app goal is waiting on it now;
   2. it is the alpha's next slice, or on Capxul's next feature;
   3. it makes scaffolding better for every app;
   4. it keeps `main` green and CI fast;
   5. a piece no app has pulled yet, and only with capacity to spare.
4. Start workers from the top, as many as CI holds (20 jobs at once; at most two ready pull requests per goal).
5. Rebuild the board as work lands. Send every running goal what was decided, grills included.

## How it runs

- **Collisions.** When two goals claim overlapping paths, this goal settles who builds it, or how they split it
  (K42, section 3, case 2).
- **Grills.** A grill is a Decision issue labelled `needs-aaron`. Batch them and bring them to Aaron by voice, as the
  `threads` skill says in "Talking to Aaron". Record each answer as a decision and send it to every running goal.
- **Merging.** This goal's own pull requests: drafts first, checks before builds by a different agent (the `author`
  skill), a 🔍 that wrote none of it, then ready, at most two ready, and merge when CI is green and every thread is
  resolved (`AGENTS.md`). Capxul's work reaches `main` through the lander.
- **Limits.** `AGENTS.md`'s standing rules: at most $10 a day on cloud resources, no keys printed or written, every
  world destroyed, processes stopped by their id, and no publish without Aaron.

## Where it stands

**26 November 2026, about 21:40 UTC: the handoff.** The week's usage is nearly spent, so the goal pauses here and can be
resumed in any harness with the start line in this brief's header. What it leaves:

- **Landed on `main`:** slices 1, 2 and 4 to 10. Slice 5, publishing (#1083, #1086, #1090). Slice 6, `ortho new app` and
  `npm create orthograph` (#1082, #1108, #1087). Slice 7, getting started (#1111, #1139, #1152, #1153, #1189). Slice 8, the
  portal without its screens (#1098, with #1114 through its check branch). Slice 9, the chain basics (#1095, with #1104
  through its check branch). Slice 10, the starter's sign-in
  fixes (#1081, #1084). Also the CI speed-up (#1092), the stale-test fix (#910) and the attribution rule (#1191).
- **Slice 11, the acceptance check:** #1145 (checks). Its author is merging `main` in and marking it ready. Next: a 🔍
  on the delta, then merge when CI is green. Whatever its `expected-failing/` list still names after that is the slice's
  remaining build work, a `-build` branch by a different agent.
- **Slice 12, publishing under `next`: blocked on Aaron.** The 14 packages are at `0.1.0-next.1`, and
  `tools/e2e/starter.sh` names them in publishing order. Layer 1's check 01 already publishes them to a local Verdaccio,
  makes an app, checks it and proves it. None of the names is on npm yet. Aaron's part: the npm organisation
  `orthograph`, the unscoped names `orthograph` and `create-orthograph`, and an npm automation token saved as the
  repository secret `NPM_TOKEN`. Then a hand-run `publish` workflow, still to be written, publishes under `next` after
  the acceptance check passes, and the acceptance check runs again against npm.
- **Slice 13, the climb:** the script and kit are in (#1075). Still to do: the planned series, and the nightly refresh as a
  scheduled task.
- **Open, this goal's:** #1212 (the decision register gains K46 and K47; next free K48), merge when CI is green. #909
  (faster M1 checks 29 and 30, a draft since 24 November), to finish or close. Snag #1130's follow-up, the fixed
  `pause(n)` waits in three world tests, is written as a brief on the issue, for any harness.
- **Known stale words, small fixes:** `docs/canon/getting-started.mdx`'s status table and note still call
  `ortho new app` planned. `docs/canon/status.md` still marks `actions` spiked, though M1.22 landed
  (`examples/acme/generated/actions/`). Both are for the next status pass.
- **Not claimed: the UI pieces (K29, ST1.25 and ST1.26).** These are the headless components that replaced hooks. The
  actions under them are built. Their five checks are written and red (`e2e/ui-layer/expected-failing/04` to `08`).
  `@orthograph/web`, the generator and `generated/web/` are not built. Goal 5 owned them and is parked. Proposed to
  Aaron as its own lane for the beta, after the alpha publishes.
- **Waiting on Aaron:** the npm names and token (above); the UI pieces lane; and Capxul's open decisions, which are
  listed in `16-capxul.md`.

26 November 2026: led from Claude Code (Claude Opus 5.5) since this morning. Slices 1, 2 and 4 are closed on GitHub (#719, #720, #1062). Slice 13's script and kit merged (#1075), and the dashboard was made again in this account from the kit: https://claude.ai/artifact/TdjaPiom3zeWDzSLBUDdhv. Authors are writing the checks for slice 5 (publishing), slice 6 (`ortho new app`) and slice 10 (the starter's #446 and #449); builders follow each red check.

25 November 2026: given the alpha by K44 (slices 4 to 12), and waiting for a lead. Aaron starts it with the line above.
Slice 4, the board re-sorted, is K45's pull request: the alpha's milestone and Capxul's path, the release rule, the 30
rows the superagent pulled re-sorted, Goal 17's claims released, the parked goals' issues hidden by a `parked` label, and
the Project's views; it merged as #1071. K45 adds slice 13, the climb; its dashboard is up as a claude.ai Data
artifact. Its script and kit, `tools/github/climb.mjs` and `tools/github/climb-dashboard/`, make or refresh it in any account.
Still to do in slice 13: the planned-but-not-written series, and the nightly refresh as a scheduled task.
The history below is from before K44.

24 November 2026, about 00:30 UTC (before K44). Running since 23 November in Claude Code, in the session that was
the 🎼 conductor. The lander, Goal 19, runs as its own thread and in Amp.

**Slice 1, the goals K42 stops, wound down: done.**

- Every goal K42 section 7 names is parked on `main`: Goals 3, 4, 6, 8, 9, 10, 11, 12 and 14 by their leads; Goals 5, 13
  and 15 by Goal 18 (#779), since their leads stopped without parking and had nothing in review. Goal 7 is done.
- The lander brought their finished work into `main`: #771 (stage 1 retired), #774 (the portal), #777 (workflows, wallets,
  the club), #778 (the relayer, kept at building by snag #784) and #785 (the UI layer).
- The 34 Ask issues open on 23 November are sorted: case 3 to Goals 17 and 16, Goal 18's own as board items, the rest closed as done or
  no longer applying. With the board live, the asks that describe an item were adopted or folded into its issue (below),
  and #475, #486 and #749 closed with pointers.

**Slice 2, the board: done.**

- `docs/canon/status.md`'s capability map is 116 rows, one per item: stage, who pulled it, release, milestone, lane,
  Touches, Needs and evidence (#780, #791). "Built" is K42's: proved by an app's journeys (Plugged In's for the core).
- `tools/github/sync.mjs --board` writes one issue per row, found by its marker; a row adopts a `kind:ask` issue or folds
  duplicates into it, never a snag, claim or decision (#791, #792). The `goals` workflow runs it on every push to `main`
  and every three hours; its first run wrote the 116 issues, adopted 16 asks and folded 3 duplicates.
- The Project "Orthograph" (https://github.com/orgs/Open-Harness/projects/1) has Stage, Pulled by, Release, Lane, Kind,
  Status, Start and End, a view per goal, and each app milestone's due date as a forecast recomputed every run.
- The workflow has no Project token (no `ORTHOGRAPH_PROJECT_TOKEN` secret), so the Project's fields are filled by Goal 18's
  local `--goal-branches --board --project --apply` each round, until Aaron grants one. The first fill stopped on a
  `claude-code` harness; #902 maps it and skips, red, any value the Project has no option for.
- The `conductor` and `github` skills say K42's loop, claims and board (#792).

**Slice 3, the loop: next.** The first round ranks `ortho new` for an app (M2.09), `ortho add` (M2.14, M2.15), adapters
from an ABI (#474) and the npm preview (M1.51), against what Goals 17 and 16 wait on now.
