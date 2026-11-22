---
goal: 14
title: the club, stage 4 of Plugged In, private on Aztec
milestone: "Goal 14: the club"
release: "1.0"
branch: goal/club
base: goal/stage-1
status: parked         # ready | running | landing | done | parked
lead:
  harness: claude      # claude | codex | opencode | amp, set by the lead when it starts
  model: claude-opus-5-5  # the model id it runs on
  since: 2026-11-22    # the date it started
done_check: nx run e2e:stage4
owns:
  - packages/language-noir/
  - packages/chain-aztec/
  - packages/ballots/
  - spikes/aztec-club/
  - examples/plugged-in/src/club/
  - e2e/stage4/
  - design/decisions/ST4-aztec.md
  - design/goals/14-club.md
slices:
  - "1 · The budgets declaration in Noir on Aztec, a spike"
  - "2 · Noir, Aztec and verified proofs, decided (after 1)"
  - "3 · Journeys for the club (after 2)"
  - "4 · Aztec in a world, with proofs verified (after 2)"
  - "5 · Private notes, and the budgets feature on Aztec (after 4)"
  - "6 · Private ballots with a public tally (after 5)"
  - "7 · Plugged In at stage 4 (after 5, 6)"
  - "8 · The stage 4 gate (after 1, 2, 3, 4, 5, 6, 7)"
---
# Goal 14: the club, stage 4 of Plugged In, private on Aztec

Branch `goal/club`, cut from `goal/stage-1`. Written 21 November 2026 by the 🎼 conductor, from the goal map
(`design/goals/map.md`, K34) and K35. Milestone `Goal 14: the club`, label `release:1.0` (K33).

**To start it, in any harness** (Claude Code, Codex, OpenCode, Amp): "You lead Goal 14. Read `AGENTS.md` and
`design/goals/14-club.md`, and run it." Nothing else is needed.

## The goal, in plain words

- **In one sentence:** Make a group private: hidden members, private spending and private votes, with only the totals in public.
- **Why:** Some groups must not show who belongs or who spent what; the same declaration should run privately just by choosing a private chain.
- **When it's done, you can:** have three people join a club privately, see one spend twenty with only the total shown, and pass a vote whose tally is public while each ballot stays secret.
- **It is:** a private chain in test worlds with real proof checks, the language that writes private contracts, private ballots, and the example app's club pages.
- **It isn't:** the public vault (stage 3) or any real network.
- **Done when:** the stage 4 final check passes in a test world that verifies every proof.
- **Waits on:** nothing for its first four steps. Private spending needs the vault goal's budgets feature.
- **Words used:** Aztec: a chain where data and calls can be private. Noir: the language its private contracts are written in. A proof: the check that a private step was done right.

## Read first

- K7 Q7 (proofs verified) and the Noir line in `design/later.md` and `design/noir/`, the stage 4 rows of `design/milestones.md`,
  and `examples/budgets` on `goal/on-chain` (Goal 4's), which the spike reads.

## The slices

Each slice is a row of `design/milestones.md`; its full text, `needs` and "done when" are there, and win over this
table. "After" names this goal's own earlier slices; "Waits on" names work another goal must land first.

| # | Slice | Row | After | Waits on |
|---|---|---|---|---|
| 1 | The budgets declaration in Noir on Aztec, a spike | ST4.01 | — | — |
| 2 | Noir, Aztec and verified proofs, decided | ST4.02 | 1 | — |
| 3 | Journeys for the club | ST4.03 | 2 | — |
| 4 | Aztec in a world, with proofs verified | ST4.04 | 2 | — |
| 5 | Private notes, and the budgets feature on Aztec | ST4.05 | 4 | the budgets journeys and feature, ST3.03 and ST3.05 (Goal 13) |
| 6 | Private ballots with a public tally | ST4.06 | 5 | — |
| 7 | Plugged In at stage 4 | ST4.07 | 5, 6 | — |
| 8 | The stage 4 gate | ST4.08 | 1 to 7 | — |

Slices 1 to 4 can run now. ST4.05's `needs` cell named only ST4.04; K35 adds ST3.03 and ST3.05, since its done
when runs the budgets journeys on Aztec.

## What it owns, and the seams it touches

It owns the paths in the front matter, and nothing else. Every package here is new. The `aztec` store kind and `chain-aztec` sit on the `ChainPort`, which Goal 4 owns: agree the port's shape with Goal 4 by an Ask issue at slice 2. The club's pages are their own folder in Plugged In.

**Done check:** `nx run e2e:stage4` passes on `goal/club` (the stage 4 gate, ST4.08). It lands in `main` by one pull request
once `goal/stage-1` has, or into `goal/stage-1` by one pull request if Goal 3 is still open.

## How it runs

The rules every goal shares, so this brief stays short. Where they and this file disagree, `AGENTS.md` wins.

- **Branch.** `goal/club`, cut from `goal/stage-1` and protected like it. Every change reaches it by a pull request.
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
  A slice another goal needs lands early, once its check is green: a branch `goal/<name>-early-<slice>` cut at the
  commit that ends it, merged into `goal/stage-1` by a merge commit, never squashed (K38). Ask for one by an Ask
  issue in the owning goal's milestone.
- **Asks.** Anything outside "What it owns" is an Ask issue in the owning goal's milestone, naming this goal and what
  done looks like (K32, K33). Read this goal's own open issues at every slice start.
- **On GitHub.** Every issue and pull request carries the milestone `Goal 14: the club` and the label `release:1.0`;
  every comment an agent posts starts `[goal-14 · <role> · <harness> · <model>]` (the `github` skill).
- **State.** Set `status` and `lead` in the front matter when you start, and rewrite "Where it stands" in the pull
  request that merges each slice. Decisions this goal makes are named `ST4-<slug>` or `GOAL14-<slug>` (K32).
- **Limits.** No cloud and no keys: Aztec runs only inside test worlds. Stop every process you start, by its id, before you report.

## Where it stands

**Parked on 22 November 2026** by the conductor, on Aaron's "narrow to the path": the Beta path and the two long poles
run first. It resumes by the conductor's word.

- **Landed:** `goal/stage-1` merged into `goal/club` (#459), and this brief set to running, then parked.
- **Slice 1, the spike, in review:** `spikes/aztec-club/` on `spike/aztec-club`, pull request #504 into `main`. Its
  answer: yes, the budgets declaration and a ballot map one to one onto a Noir contract, and in a world that verifies
  proofs a tampered and an empty proof are refused and the public total doesn't move; no member's address is in any
  transaction once a sponsor pays the fees. Three limits: every holder of the club's key reads every allowance, each
  spend's amount is public, and a proof against a re-built block must be proved again. Three cases are not tested
  (verification off, the ballot passing with all three members, a second ballot refused); the README names the command
  for each.
- **Open asks:** #495 to Goal 4 (a `ChainPort` for every chain family, and `Blueprint.store.chain.aztec()`), #496 to
  Goal 13 (the budgets feature with an Aztec choice, its journeys neutral on the store kind, both landed early). Slice 5
  is linked as blocked by both.
- **Next, on resuming:** merge #504 if it hasn't merged; run the two missing cases (`club.ts verified ballots`, then
  `club.ts control tamper`) and add them to its README; write `design/decisions/ST4-aztec.md` (slice 2): versions,
  `chain.aztec` as a keyed store address, `language-noir`'s mapping from the spike's table, `chain-aztec`'s port steps
  (prove for sign, a sponsor for fees, sync before proving, one re-prove on `Block header not found`, every wait
  through `Timers`), and `proofs: "verified"` worlds on `setupLocalNetwork`. Then slices 3 and 4.
