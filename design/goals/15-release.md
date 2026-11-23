---
goal: 15
title: release and the cloud
milestone: "Goal 15: release and the cloud"
release: "1.0"
branch: goal/release
base: goal/stage-1
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | codex | opencode | amp, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: nx run e2e:m7
owns:
  - tools/release/
  - .github/workflows/release.yml
  - e2e/m7/
  - design/decisions/M7-release.md
  - design/goals/15-release.md
slices:
  - "1 · The release pass: each credential, with Aaron's written yes"
  - "2 · The npm org and the first real release (after 1)"
  - "3 · Real releases: npm, Homebrew, GitHub (after 2)"
  - "4 · Test worlds and signed verdicts from CI (after 1)"
  - "5 · Adapters against real vendors' test modes (after 1)"
  - "6 · The builder's read-only staging telemetry"
  - "7 · Contracts on a testnet (after 1)"
  - "8 · Monitors to the sink"
  - "9 · Gate M7 (after 1, 2, 3, 4, 5, 6, 7, 8)"
---
# Goal 15: release and the cloud

> **Winding down under K42** (23 November 2026, `design/decisions/K42-goals-are-agents.md`, section 7). This goal
> lands the pull request it has in review, rewrites "Where it stands", sets `status: parked` and stops. Its open
> slices become items on the board. Gaps go by K42's collision rule, not by Ask issues; where this brief and K42
> disagree, K42 wins.

Branch `goal/release`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 15: release and the cloud`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 15. Read `AGENTS.md` and
`design/goals/15-release.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Ship Orthograph for real: published packages, a command you can install, signed results from CI, and alerts when something slows down.
- **Why:** Until it is released, nobody outside can use it, and 1.0 means real releases that anyone can check.
- **When it's done, you can:** install Orthograph and an app's command from the real package registries, see each pull request get a signed verdict, and get an alert when calls slow down.
- **It is:** the credentials a release needs, the release jobs, signed verdicts, real vendors' test modes, contracts on a test network, and the monitors.
- **It isn't:** the early preview on npm or staging itself (the goal building Plugged In's first release ships both).
- **Done when:** the cloud milestone's final check passes and everything it made is destroyed.
- **Waits on:** Aaron's written yes for each credential, and staging from the goal building Plugged In's first release, for the slices that run there.
- **Words used:** a credential: a key or account the release uses. A verdict: the signed result of running the checks.

## Read first

- K28 (releases), `design/decisions/M7-cloud.md` (on `goal/stage-1`), K18 (monitoring falls out), and the M7 section of
  `design/milestones.md`. AGENTS.md's standing rules on money and credentials, word for word.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | The release pass: each credential, with Aaron's written yes | M7.13 | — | — |
| 2 | The npm org and the first real release | M7.02 | 1 | — |
| 3 | Real releases: npm, Homebrew, GitHub | M7.06 | 2 | — |
| 4 | Test worlds and signed verdicts from CI | M7.05 | 1 | staging, M7.04 (Goal 3) |
| 5 | Adapters against real vendors' test modes | M7.07 | 1 | M7.04 (Goal 3) |
| 6 | The builder's read-only staging telemetry | M7.08 | — | M7.04 (Goal 3) |
| 7 | Contracts on a testnet | M7.09 | 1 | M7.04 (Goal 3) |
| 8 | Monitors to the sink | M7.14 | — | M1.49 (Goal 3) |
| 9 | Gate M7 | M7.12 | 1 to 8 | M7.03 and M7.04 (Goal 3); M7.10 and M7.11 (Goal 16) |

Slice 1 is a decision that asks Aaron, in one batched message, for each credential with its cost; nothing else starts
until his written yes for the one it needs. Every cloud resource carries the Orthograph prefix and is destroyed.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. `tools/ci` is shared: the release jobs go in their own workflow and folder. `prove`'s publish is Goal 3's for the npm preview (M1.51) and this goal's after; agree the hand-over by an Ask issue.

**Done check:** `nx run e2e:m7` passes on `goal/release` (Gate M7, M7.12), and every resource it made is destroyed. It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/release`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
  Merge `origin/goal/stage-1` in at the start of every slice, by a merge, never a rebase, and never push to another
  goal's branch. Goal 3 owns `goal/stage-1` and never waits on you; resolve conflicts on your side.
- **Checks first.** For each slice, an author who is not the builder writes the journeys and checks on a `-check`
  branch, red on empty handlers, and proves them fair (the `author` skill). The builder then makes them green on a
  `-build` branch and never edits them.
- **Merging.** Open pull requests as drafts, test locally, get a 🔍 pass from a reviewer that wrote none of it (the
  `reviewer` skill), then mark ready; merge when CI is green and every thread is resolved. At most two ready pull
  requests in CI at once.
- **Its needs.** Under K42: a gap this goal finds goes by K42's collision rule (section 3), and a
  slice another goal needs lands early into `main` (K38, K42).
- **Asks.** Under K42, an Ask issue is only for two goals' claims that overlap (K42, section 3, case 2). Read this
  goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 15: release and the cloud` and the label `release:1.0`;
  every comment an agent posts starts `[goal-15 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `M7-<slug>` or `GOAL15-<slug>` (K32).
- **Limits.** No cloud and no keys without Aaron's written yes for that credential, and at most $10 a day across everything. Stop every process you start, by its id, before you report.

## Where it stands

Not started: brief written and branch cut on 21 November 2026. The lead rewrites this section at every slice merge.
