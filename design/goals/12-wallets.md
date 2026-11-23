---
goal: 12
title: wallets, stage 2 of Plugged In
milestone: "Goal 12: wallets"
release: "1.0"
branch: goal/wallets
base: goal/stage-1
status: ready          # ready | running | landing | done | parked
lead:
  harness: null        # claude | codex | opencode | amp, set by the lead when it starts
  model: null          # the model id it runs on
  since: null          # the date it started
done_check: nx run e2e:stage2
owns:
  - packages/adapters-abi/
  - examples/plugged-in/src/wallet/
  - e2e/stage2/
  - design/goals/12-wallets.md
slices:
  - "1 · Adapters made from a contract's ABI"
  - "2 · Journeys for stage 2"
  - "3 · Pieces for payments as they go through the chain"
  - "4 · Plugged In at stage 2 (after 1, 2, 3)"
  - "5 · The gates' test app moves to Plugged In (after 4)"
  - "6 · The stage 2 gate (after 1, 2, 3, 4)"
---
# Goal 12: wallets, stage 2 of Plugged In

> **Winding down under K42** (23 November 2026, `design/decisions/K42-goals-are-agents.md`, section 7). This goal
> lands the pull request it has in review, rewrites "Where it stands", sets `status: parked` and stops. Its open
> slices become items on the board. Gaps go by K42's collision rule, not by Ask issues; where this brief and K42
> disagree, K42 wins.

Branch `goal/wallets`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 12: wallets`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 12. Read `AGENTS.md` and
`design/goals/12-wallets.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Let a person on Plugged In create a wallet or link their own, and be paid by their name.
- **Why:** It is the first stage where money moves: the example app grows from a page of links into something people can pay.
- **When it's done, you can:** create a wallet in a browser, link one you already have by signing in with it, pay someone by their name, and watch the payment be confirmed, or corrected if the chain changes its mind.
- **It is:** typed adapters for any existing contract, payment building blocks that show each stage of a payment, and the example app's wallet pages.
- **It isn't:** the chain machinery itself (the on-chain goal), shared Safes and budgets (the vault goal), or any real network: it all runs on a local test chain.
- **Done when:** the stage 2 final check passes: two people, one creating and one linking a wallet, and a payment by name that is simulated, confirmed and shown.
- **Waits on:** its first slice can start now. The rest needs the on-chain goal's store, client and follower, the events goal's incoming events, and the goal building Plugged In's first release, for linking a wallet.
- **Words used:** an ABI: the published description of a contract's calls and events. A handle: the name a person claims, like a username.

## Read first

- K7 (chain languages, Q2 for adapters from an ABI) and K9 (the growing example), and the stage 2 rows of
  `design/milestones.md` and its stage table.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | Adapters made from a contract's ABI | ST2.02 | — | — |
| 2 | Journeys for stage 2 | ST2.01 | — | the chain store's checks, M6.02 (Goal 4) |
| 3 | Pieces for payments as they go through the chain | ST2.03 | — | the web projection, ST1.25 (Goal 5); the client, M6.15 (Goal 4) |
| 4 | Plugged In at stage 2 | ST2.04 | 1, 2, 3 | M2.13 (Goal 3); the follower, M6.09 (Goal 4); events in, M5.03 (Goal 11) |
| 5 | The gates' test app moves to Plugged In | ST2.05 | 4 | Goal 3's yes (it changes every gate suite) |
| 6 | The stage 2 gate | ST2.06 | 1, 2, 3, 4 | the stage's milestone slices (Goals 3, 4, 11) |

Slice 1 needs only M1.30 and M1.31, both done on `goal/stage-1`. Slice 5 moves every gate suite's fixture from acme
to Plugged In: its author asks Goal 3's lead first, by an Ask issue, since those suites are Goal 3's gates.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. The wallet feature is its own folder in Plugged In; the rest of the app is Goal 3's. `ortho new adapter --from-abi` goes in a new package plus one new scaffolder module in the CLI (an ask to Goal 3). `chain-evm` is Goal 4's: anything the adapters need from it is an ask. Goal 13's `safe` and `hats` adapters build on slice 1.

**Done check:** `nx run e2e:stage2` passes on `goal/wallets` (the stage 2 gate, ST2.06). It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/wallets`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
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
- **On GitHub.** Every issue and pull request carries the milestone `Goal 12: wallets` and the label `release:1.0`;
  every comment an agent posts starts `[goal-12 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `ST2-<slug>` or `GOAL12-<slug>` (K32).
- **Limits.** No cloud and no keys. Stop every process you start, by its id, before you report.

## Where it stands

Not started: brief written and branch cut on 21 November 2026. The lead rewrites this section at every slice merge.
