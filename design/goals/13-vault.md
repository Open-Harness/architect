---
goal: 13
title: the vault, stage 3 of Plugged In
milestone: "Goal 13: the vault"
release: "1.0"
branch: goal/vault
base: goal/stage-1
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | amp | codex, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: nx run e2e:stage3
owns:
  - packages/budgets/
  - packages/adapters-abi/src/modules/safe/
  - packages/adapters-abi/src/modules/hats/
  - examples/plugged-in/src/group/
  - e2e/stage3/
  - design/decisions/ST3-budgets.md
  - design/goals/13-vault.md
slices:
  - "1 · The budgets feature, decided"
  - "2 · Journeys for stage 3 (after 1)"
  - "3 · The safe and hats adapters (after 1)"
  - "4 · The budgets feature, built (after 2, 3)"
  - "5 · Owners' signatures as a workflow (after 4)"
  - "6 · Plugged In at stage 3, and an agent spending under its role (after 5)"
  - "7 · The stage 3 gate (after 1, 2, 3, 4, 5, 6)"
---
# Goal 13: the vault, stage 3 of Plugged In

Branch `goal/vault`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 13: the vault`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Amp, Codex): "You lead Goal 13. Read `AGENTS.md` and
`design/goals/13-vault.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Let a group on Plugged In share a Safe with monthly budgets per role, where owners sign anything above a budget and an agent can spend within its own.
- **Why:** It is the base Capxul is rebuilt on: shared money, spending limits and sign-off, with an agent as a member.
- **When it's done, you can:** make a group with a two-of-three Safe, give someone a spending role of a hundred a month, watch spends inside it go through and bigger ones wait for owners, and see the budget reset next month.
- **It is:** the budgets feature, adapters for the Safe and for roles, owners' sign-off as a long-running job, and the example app's group pages.
- **It isn't:** private groups (the club goal), the chain machinery (the on-chain goal) or the clock (the time goal).
- **Done when:** the stage 3 final check passes in a test world on a local chain.
- **Waits on:** more than any other goal: the on-chain, workflows, agents, wallets and time goals. It starts with its decision once two of those land.
- **Words used:** a Safe: a shared wallet that needs several owners to sign. A hat: a role, held by a person or an agent, that carries a budget.

## Read first

- `spikes/safe-hats-module/README.md` and the draft `ST3-budgets.md` (Goal 7, in #294), K25 (the blueprint on chain, on
  `goal/stage-1`), K23 (budgets are per month), and the stage 3 rows of `design/milestones.md` and its stage table.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | The budgets feature, decided | ST3.02 | — | the spike, ST3.01 (Goal 7, #294); the chain decision, M6.01 (Goal 4); a workflow's shape, M3.01 (Goal 8) |
| 2 | Journeys for stage 3 | ST3.03 | 1 | — |
| 3 | The safe and hats adapters | ST3.04 | 1 | adapters from an ABI, ST2.02 (Goal 12) |
| 4 | The budgets feature, built | ST3.05 | 2, 3 | the Safe host, M6.13 (Goal 4) |
| 5 | Owners' signatures as a workflow | ST3.06 | 4 | workflows, M3.28 (Goal 8); the client, M6.15 (Goal 4) |
| 6 | Plugged In at stage 3, and an agent spending under its role | ST3.07 | 5 | M4.10 and M4.16 (Goal 10); M2.07 (Goal 3) |
| 7 | The stage 3 gate | ST3.08 | 1 to 6 | all of M8 (Goal 9) and the stage's other milestone slices (Goals 4, 8, 10) |

Start when slice 1's three needs have landed; until then, read Goal 7's spike and write nothing. Its journeys (slice 2)
also feed the club goal's private budgets (ST4.05).

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. `@orthograph/budgets` is a new package; the Solidity module it generates goes through Goal 4's `language-solidity` (an ask for anything new there). The `safe` and `hats` adapters are new modules of Goal 12's adapters package. Plugged In's `/@group` is its own folder.

**Done check:** `nx run e2e:stage3` passes on `goal/vault` (the stage 3 gate, ST3.08). It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/vault`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
  Merge `origin/goal/stage-1` in at the start of every slice, by a merge, never a rebase, and never push to another
  goal's branch. Goal 3 owns `goal/stage-1` and never waits on you; resolve conflicts on your side.
- **Checks first.** For each slice, an author who is not the builder writes the journeys and checks on a `-check`
  branch, red on empty handlers, and proves them fair (the `author` skill). The builder then makes them green on a
  `-build` branch and never edits them.
- **Merging.** Open pull requests as drafts, test locally, get a 🔍 pass from a reviewer that wrote none of it (the
  `reviewer` skill), then mark ready; merge when CI is green and every thread is resolved. At most two ready pull
  requests in CI at once.
- **Its needs.** A slice builds once what it needs has landed (K34, `design/goals/map.md`). A slice that needs another
  goal's work writes its checks first and waits for the build; it never builds a stand-in for the other goal.
- **Asks.** Anything outside "What it owns" is an Ask issue in the owning goal's milestone, naming this goal and what
  done looks like (K32, K33). Read this goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 13: the vault` and the label `release:1.0`;
  every comment an agent posts starts `[goal-13 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `ST3-<slug>` or `GOAL13-<slug>` (K32).
- **Limits.** No cloud and no keys. Stop every process you start, by its id, before you report.

## Where it stands

Not started: brief written and branch cut on 21 November 2026. The lead rewrites this section at every slice merge.
