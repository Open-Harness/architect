---
goal: 7
title: Safe, Hats and budgets
milestone: "Goal 7: Safe, Hats and budgets"
branch: goal/safe-hats
base: main
status: done           # ready | running | landing | done | parked
done_check: the safe-hats-module spike's README and the draft ST3-budgets recommendation, landed in main (K42, section 7)
owns:
  - spikes/safe-hats-module/
  - design/decisions/ST3-budgets.md
  - design/goals/07-safe-hats.md
  - design/goals/07-snags.md
---
# Goal 7: Safe, Hats and budgets

`design/goals/07-safe-hats.md`, on `goal/safe-hats`, cut from `origin/main` at `1e0a989a` on 21 November 2026. The
number came from the conductor. The Claude lead writes and keeps this file; Codex, run headless, builds.

## Aaron's words, 21 November 2026

"Queue up the safe with hat spike as a goal… definitely high leverage and high priority… use Codex headless with the
goal prompt but we're gonna have to monitor it and maybe steer it… this needs to be monitored."

## What this goal proves

Stage 3, the vault, starts from one spike: ST3.01 in `design/milestones.md:127`. The scope map says nothing exists yet
(`design/scope.md:109`: "Safe, Hats and the budgets module · None · no spike yet"). This goal answers it, and drafts
ST3.02's decision from the evidence:

1. **A Safe obeys a hat.** A real Safe and real Hats Protocol, from their published releases, run on Anvil. A module
   enabled on the Safe lets a hat's wearer spend from the Safe. A non-wearer is refused, and so is a wearer whose hat
   has been turned off.
2. **The signature a client must make.** The exact SafeTx typed data and signature bytes that owners produce, shown by
   a run that executes a Safe transaction with them. That is what stage 3's "owners sign above a budget" will collect.
3. **Budgets hold.** A prototype module gives each hat a budget per period. It refuses an overspend, rolls the period
   over, and lets an agent spend under its own hat. Foundry tests prove it, and a fuzz holds the limit invariant.
4. **What lives where.** A draft `design/decisions/ST3-budgets.md`: what lives in D1, what lives on chain, and what
   stays open.

It also tries out the Foreman idea: a Claude lead supervises a building agent (Codex), steers it, and owns the quality.
What that teaches goes in `design/goals/07-snags.md`.

## The prompt

This is what Codex runs, word for word, with the ground rules after it.

> You are building Goal 7 of Orthograph in this repository: a spike that answers ST3.01 and drafts ST3.02. Work on the
> branch `goal/safe-hats`, already checked out. A Claude lead supervises you; it may send you messages that change
> course, and they win over this prompt.
>
> **Read first.** Read `AGENTS.md`, `.agents/skills/spike/SKILL.md` and this file (`design/goals/07-safe-hats.md`).
> In `design/milestones.md`, read the stage 3 row (line 74) and rows ST3.01 to ST3.08 (lines 127 to 134). Then read
> `spikes/chain-languages/evm/`: its `README.md`, `foundry.toml`, `versions.json`, `run-all.sh` and `src/Governance.sol`.
> That is how this repository does a Foundry spike with exact pins. Copy its shape.
>
> **Also read, but do not import.** Goal 4's chain packages live only on another branch. Read them with
> `git show origin/goal/on-chain:<path>`:
> - `packages/chain-evm/README.md`, with `src/modules/anvil/` and `src/modules/keys/`;
> - `packages/wallets/README.md`;
> - `design/decisions/M6-chain.md` on `origin/goal-4/m6-chain`, items 1 and "A Safe as signer".
>
> Borrow their approach (viem 2.57.20, Anvil started on a free loopback port and stopped on exit, EIP-712 shapes) into
> the spike's own files. Never add a workspace dependency on them.
>
> **Question.** Can a Safe let a Hats Protocol hat's wearer spend through a module, within a budget per hat per period,
> on a real local chain? And what exactly must a client sign?
>
> **Build, in `spikes/safe-hats-module/` only, in this order, with one commit per step:**
>
> 1. **Pins.** Write `foundry.toml`, `package.json` and `versions.json` in the shape of `spikes/chain-languages/evm/`.
>    - Use the Safe smart account contracts from a published release, and Hats Protocol from a published release.
>    - Pin each exactly: an npm version, or a git tag at its exact commit.
>    - Each must be published at least three days before today. Record each one's publish date and source in
>      `versions.json`.
>    - Reuse the chain-languages pins where they fit: solc 0.8.30 or what Safe needs, OpenZeppelin 5.7.0, viem
>      2.57.20, forge 1.8.6.
>    - If no release is old enough or exact, stop and say so in `NOTES.md`. Never take a branch head or `latest`.
> 2. **The hat module (ST3.01).** Write `src/HatSpendModule.sol`, a Safe module. It asks Hats `isWearerOfHat(caller,
>    hatId)`, then calls the Safe's `execTransactionFromModule`. Foundry tests in `test/` must deploy the real Safe
>    singleton and proxy factory and the real Hats contract, from the pinned sources. They prove:
>    - a wearer spends ETH and an ERC-20 from the Safe;
>    - a non-wearer is refused with a custom error;
>    - a wearer whose hat is turned off (`setHatStatus` false, or a toggle module) is refused;
>    - a wearer made ineligible is refused;
>    - the module does nothing until the Safe enables it.
> 3. **The same on Anvil.** Write `script/` in TypeScript with viem. It starts Anvil itself, deploys the same contracts,
>    enables the module through a real 2-of-3 Safe transaction signed by two owners, and runs a wearer's spend and a
>    refused one. Print the transaction hashes and the decoded refusal.
> 4. **The SafeTx signature format.** In the same script, build the SafeTx EIP-712 typed data and have the owners sign
>    it. In `README.md`, document the exact format a client must produce:
>    - the domain (`chainId`, `verifyingContract`);
>    - the `SafeTx` type and its fields;
>    - the nonce;
>    - how signatures are ordered (by owner address) and packed (`r`, `s`, `v`);
>    - the `v` values for an ECDSA signature over typed data, an `eth_sign` signature, an approved hash and a contract
>      (ERC-1271) signature.
>
>    Show each with a run. One check must break it: wrong order, a wrong `v`, or a replayed nonce must each be refused,
>    with the Safe's error code (for example `GS026`).
> 5. **The budgets module.** Write `src/HatBudgetModule.sol`. Each hat has a budget for one token, an amount, and a
>    period length in seconds. A wearer's spend:
>    - succeeds within what is left in the current period;
>    - is refused over it, with a custom error that carries the hat, the amount asked and what is left;
>    - starts from a full budget once the period rolls over (use `vm.warp` in Foundry, and `evm_increaseTime` on
>      Anvil).
>
>    An agent is an address wearing its own hat, a child of the person's hat, with its own smaller budget. Show that the
>    agent spends under its hat, is refused over its own budget, and loses the right when the person's admin hat turns
>    its hat off. Who may set a budget is the Safe itself (a module call needs the Safe); say why in `NOTES.md`.
> 6. **The fuzz.** Write a Foundry invariant test. Across random spends, warps and budget changes, no period's total
>    spend for any hat ever passes that period's budget, and the Safe's balance falls by exactly what was spent.
>    - Plant one mutant (`<` written as `<=`, or a rollover that keeps what was spent) in `test/mutants/`.
>    - Show that the fuzz catches it.
>    - Record the runs and the seed.
> 7. **The decision draft.** Write `design/decisions/ST3-budgets.md` (named by its slug, as `design/handoff.md` allows
>    for `ST<n>-<slug>`). It covers:
>    - what lives in D1 and what lives on chain, for a budget, a hat, a spend, a period and a pending owner signature;
>    - which side is the truth for each;
>    - what the follower must watch;
>    - how an agent is given its hat.
>
>    Mark signature collection as a workflow **open**: the workflows spike running now answers it. Cite the spike's
>    files by `path:line`. Status: draft, for the lead to review.
> 8. **The README.** Write `README.md` in the spike skill's shape: question, answer, what was tried, what was found
>    (numbered, each with its evidence in `evidence/`), measurements (gas per spend, test and fuzz times), the decision
>    it supports, and open risks. Add `run-all.sh`: from a clean checkout, it installs the exact pins and runs every
>    test, the fuzz and the Anvil script. It exits non-zero on any failure and stops every process it started.
>
> **Done when** `spikes/safe-hats-module/run-all.sh` passes from a clean checkout, and every item above has its
> evidence. Then stop, and write a final summary to `spikes/safe-hats-module/NOTES.md`.

### Ground rules (sent with the prompt)

> - **Where you write.** Only `spikes/safe-hats-module/` and `design/decisions/ST3-budgets.md`. Never `packages/`,
>   `examples/`, `e2e/`, `.github/`, `design/goals/` or `design/process/log.md`. Never import spike code into a package.
> - **Git.** Commit on `goal/safe-hats` after each step, with a plain message that says what the step proves. Add no
>   co-author or attribution lines. Never push, never rebase, never switch branches, never touch another branch or
>   worktree.
> - **Local and real.** Use Anvil as a plain local process, with no Docker, no cloud and no public chain. Never fake
>   the chain: no mocked Safe or Hats, and no stubbed `execTransactionFromModule`. Use the real contracts from the
>   pinned releases.
> - **No secrets.** Never write a private key, mnemonic or RPC credential to a file, a commit or a log, and never print
>   one. In Foundry, use `makeAddrAndKey("ada")`. On Anvil, generate keys at run time, or derive Anvil's own dev
>   accounts in memory, and log only addresses.
> - **Versions.** Pin every version exactly, each published at least three days before you add it. Record it in
>   `versions.json`. Never write `^`, `~`, `latest` or a branch name.
> - **Processes.** Stop every process you start, by PID; `run-all.sh` traps exit and kills its own Anvil. Never run
>   `pkill` or `killall`.
> - **When stuck.** If one failure repeats three times, stop trying it. Write what you tried in `NOTES.md` and move on
>   to the next step, or stop and say you are blocked.
> - **Notes.** Keep `spikes/safe-hats-module/NOTES.md` as a running log: each step, what you tried, what surprised you,
>   and what is left. The lead reads it.

## The bound

- **Inside:**
  - the spike in `spikes/safe-hats-module/`, which answers ST3.01 (`design/milestones.md:127`);
  - the draft of ST3.02's decision, `design/decisions/ST3-budgets.md` (`milestones.md:128`);
  - this file and `07-snags.md`, which the lead keeps.
- **Outside:**
  - the ST3.03 journeys onward (checks, adapters, `@orthograph/budgets`, the owner-signature workflow, Plugged In at
    stage 3);
  - Goal 4's `examples/budgets` and its Solidity language (`goal/on-chain`);
  - time as a framework feature (M8; `vm.warp` and `evm_increaseTime` stand in here);
  - any change to `packages/`.
- **Local only:** Anvil, $0 cloud, no keys, no Docker.
- **Overlap with Goal 4.** Goal 4's slice 7 enables its generated budgets module on a Safe
  (`design/goals/04-on-chain.md` on `goal/on-chain`), but leaves hats out. This spike is throwaway and imports
  nothing from Goal 4. Its findings about the Safe go to Goal 4's lead through the conductor.

## Roles

| Role | Who | Writes |
|---|---|---|
| Builder | Codex, headless (`codex exec`, CLI 0.166) | the spike and the draft decision |
| Lead and monitor | the Claude thread that wrote this file | this file, `07-snags.md`, steering messages, the pull requests |
| 🔍 Reviewer | a Claude subagent that wrote none of it | a verdict on each pull request |

How the lead runs Codex:

```bash
codex exec -C <worktree> -s workspace-write \
  -c sandbox_workspace_write.network_access=true \
  --add-dir <the main checkout's .git> --json "<the prompt and ground rules>" > <scratch>/codex-1.jsonl 2>&1
```

- `--add-dir` is there because a worktree's git data lives in the main checkout's `.git/worktrees/`, which the
  sandbox would otherwise refuse to write.
- Never pass `--dangerously-bypass-approvals-and-sandbox`.
- Steer with `codex exec resume <session id> "<message>"`, one run at a time.

## The done check

A 🔍 reviewer that wrote none of it:
- clones the branch fresh;
- runs `spikes/safe-hats-module/run-all.sh` and gets every test, the fuzz and the Anvil script green;
- checks the README against the spike skill's shape;
- checks every pin in `versions.json` against its registry date.

Then the pull request into `main` merges, with CI green and every thread resolved.

## Landing

CI is shared and slow, so this follows the conductor's CI-drafts rule (pull request 293, 21 November 2026):
- Codex's steps go onto `goal/safe-hats` as they pass review.
- The whole spike lands in one pull request, or two at most, opened as a **draft**.
- The 🔍 pass is given on the draft's diff, and the README's commands are run locally, before it is marked ready, so
  CI runs once.
- At most one of this goal's pull requests is ready and in CI at a time.

The lead opens pull requests from `goal/safe-hats` into `main`. Merge `origin/main` in first, by a merge, never a
rebase. A spike pull request adds only `spikes/safe-hats-module/`, the draft decision and these two goal files. Each
needs CI green, every thread resolved, and a 🔍 pass. After a merge, the next pull request comes from a fresh branch
cut from `main` (or `goal/safe-hats` with `main` merged in), never more pushes to a merged branch.

## Where it stands

- **21 November 2026.** Brief written. Branch `goal/safe-hats` cut from `origin/main` at `1e0a989a`, worktree
  `.claude/worktrees/safe-hats`.
- **21 November 2026, 09:43 UTC.** Codex run 1 started on the prompt above: session `01a1fd7d-a64b-7660-b3ec-7cfba7a59b69`.
  Its log is outside the repository, in the lead's scratch folder (`codex-1.jsonl`). To steer it:
  `codex exec resume 01a1fd7d-a64b-7660-b3ec-7cfba7a59b69 "<message>"`, once the run in flight has ended.
- **21 November 2026, about 09:55 UTC. Steer 1, a scope addition.** Goal 4's lead asked for five Safe answers that
  its slice 7 rests on. The lead stopped run 1 while it was still on pins and resumed the same session (run 2) with
  them, to be answered before Hats:
  - **A1:** deploy a Safe from its release.
  - **A2:** `enableModule` on a 1-of-1 Safe.
  - **A3:** how a failed ERC-20 transfer comes back through `execTransactionFromModule`.
  - **A4:** a Safe as an ERC-1271 signer, accepted by `SignatureChecker`.
  - **A5:** a Safe calling the module's direct entry, relayed by anyone, with its gas.

  The budgets module is also shaped to `M6-chain.md`, where it fits:
  - one deployment per network, keyed by Safe;
  - the Safe grants;
  - a direct entry and a signed entry;
  - ordered nonces;
  - the `Budgets` EIP-712 domain;
  - `by` and `nonce` on each event;
  - its errors.

  The A1 to A5 findings come first in the README, under "For Goal 4".
- **Steer 2, run 3.** A1 to A5 and the hat module were re-run by the lead and committed (149b7dfa); Goal 4 was told.
  Goal 4's money rule (`M6-money.md`, base units of the row's `token`, `uint128`) goes into the budgets module.
  Codex now ends its turn after each step and the lead commits (snag S-02).
- **Steps 3 to 8, runs 3 to 7.** Each step ended Codex's turn, and the lead re-ran it, reviewed it and committed it:
  - the Hats path on Anvil and the SafeTx signature format, with GS026 on three malformed cases;
  - the budgets module (13 tests, then 14 with the fuzz);
  - the invariant fuzz, which catches the planted rollover mutant;
  - the decision draft;
  - the README and `run-all.sh`, green from a fresh folder.

  Codex is stopped; no Codex process is running. Its session stays resumable by the id above.
- **Next: the done check.** A 🔍 reviewer runs `run-all.sh` from a clean clone. Then one draft pull request into
  `main`, marked ready once (the CI-drafts rule). Pull request 293 was not yet merged when this was written, so the
  branch is pushed only when the check has passed.
