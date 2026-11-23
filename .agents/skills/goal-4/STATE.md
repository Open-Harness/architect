# Goal 4: state

Updated 23 November 2026 by the Goal 4 lead, on parking the goal under K42. Check against GitHub before acting (the skill's resume step 6).

## Hand-over in one line

Goal 4 is parked (K42, section 7). Nothing is in review. Whoever picks up an open slice from the board should read
this file and the brief's "Where it stands", merge `goal/stage-1` into `goal/on-chain` (by a merge), and start from
the slice's check.

## Where it stands

- **Parked, 23 November 2026.** K42 named #679 and #677 to land first. Both are merged, and the lead stopped there.
- **Landed on `goal/on-chain`:**
  - Slices 0, 1b and 2 ([#275](https://github.com/Open-Harness/orthograph/pull/275), [#276](https://github.com/Open-Harness/orthograph/pull/276), [#279](https://github.com/Open-Harness/orthograph/pull/279)).
  - Money ([#287](https://github.com/Open-Harness/orthograph/pull/287)).
  - Slice 3, M6.10 ([#283](https://github.com/Open-Harness/orthograph/pull/283), [#331](https://github.com/Open-Harness/orthograph/pull/331)).
  - Item 12 ([#518](https://github.com/Open-Harness/orthograph/pull/518)).
  - The actor checks ([#513](https://github.com/Open-Harness/orthograph/pull/513)).
  - `goal/stage-1` again ([#663](https://github.com/Open-Harness/orthograph/pull/663)).
  - The state rewrite ([#675](https://github.com/Open-Harness/orthograph/pull/675)).
  - **The follower**, slice 10, M6.09 ([#679](https://github.com/Open-Harness/orthograph/pull/679), `22eff2cf`):
    - It hands the sink only `Confirmed` events, and `Corrected` with `wasConfirmed: true`.
    - It has an outbox: the checkpoint and its pending entries are stored together before delivery, so a change the
      sink took survives a reorg (a Codex P1).
    - `health()` reports the last fault.
  - **The relayer**, slice 9, M6.07 ([#677](https://github.com/Open-Harness/orthograph/pull/677), `a6bf2701`):
    - It writes each row right after reserving the nonce. It never releases a nonce itself; the allocator prunes it.
    - The port alone decides whether a refusal is final.
    - A dropped transaction is sent again byte for byte. A refused resend keeps the call and retries quietly.
    - Only a call refused on its first relay becomes a fill, and the caller is told.
    - Every open row has an alarm coming, from relay, startup and `configure`.
    - `status` runs under the lock, and terminal rows are guarded in SQL.
    - `health()` names nonces pending past `stuckAfterMs`.
    - Fee-bump replacement and the reorg re-check were cut to `design/later.md` (`decisions/M6-relayer-rebroadcast.md`,
      the conductor's call under Aaron's standing authority). The stuck-nonce cost is snag #700.
- **Landed on `goal/stage-1` (K38):**
  - Slice 3b ([#509](https://github.com/Open-Harness/orthograph/pull/509), [#521](https://github.com/Open-Harness/orthograph/pull/521)).
  - Goal 4 up to the follower ([#701](https://github.com/Open-Harness/orthograph/pull/701), `42b3b155`). That closed Ask #442 for Goal 9.
- **Open, for the board:**
  - Slice 1, held on M2.05.
  - Slices 4 to 8, 11 and 12, not started. Slice 4's decision step takes S-12.
  - Snags S-01 to S-12 and #700.
  - Ask #674 (with Goal 9).
  - `03-snags.test.ts` must read Snag issues before the goal lands.
  - Two `05-m6-11` cases pass in the local ratchet run; confirm in CI, then take them off the ratchet.
- **Closed issues:** #333, #335, #336, #337, #343, #344, #300, #349, #442, #471.

## Open pull requests

None. This parking pull request is the last.

## Waiting on Aaron

Nothing. Aaron answered money himself on 21 November 2026 ("agreed on all questions"). It is recorded in
`design/decisions/M6-money.md` and built in slice 3: every amount names its asset, assets are files in
`blueprint/assets/`, amounts are base units, digits only on the wire, and unsigned unless declared signed.

## From Goal 7 (Safe, Hats and budgets; Foreman runs it)

Slice 7's five Safe questions are answered with runs on Anvil: commit 149b7dfa on `goal/safe-hats`, evidence in
`spikes/safe-hats-module/evidence/goal-4.txt`, code in `script/goal4.ts`, `script/safe.ts`, `test/SafeFixtures.sol`.
Read first-hand by the lead, 21 November 2026.

1. Safe 1.5.0: its singleton, proxy factory and CompatibilityFallbackHandler are enough (no MultiSend).
2. `enableModule` through a signed Safe transaction works on a 1-of-1 and a 2-of-3 Safe.
3. A token returning `false` still makes `execTransactionFromModule` return `true`; a reverting token makes it return
   `false` without reverting. So the module uses `execTransactionFromModuleReturnData` and checks both itself (snag
   S-12, for slice 4's decision step).
4. A Safe signing the Budgets typed data through ERC-1271 (SafeMessage via the fallback handler) is accepted by
   OpenZeppelin 5.7.0's `SignatureChecker`; a tampered signature is refused.
5. Anyone can relay a Safe's call to the direct entry: 93,260 gas, against 90,770 for the signed route.

Goal 7 puts M6-money's shape into its budgets module next.

Goal 7's spike passed its done check ([#294](https://github.com/AaronAbuUsama/architect/pull/294)): a hat budgets module, fuzz, an Anvil run, and a
draft `design/decisions/ST3-budgets.md` (stage 3, ST3.02). Read by the lead on 21 November 2026; it changes nothing in
Goal 4:
- Its rows are keyed by (Safe, hat); Goal 4's by a client-minted id with `safe` and `member` fields. Stage 3 can keep
  id keys with a rule on (safe, hat), and that also answers its open "regrant" question: a regrant is a new row.
- Its spender is whoever wears the hat, read live from Hats: neither a `who` nor a `holds` role (M6-chain item 5).
  A chain role that reads another contract is a stage 3 decision, not Goal 4's.
- Its payment (`spikes/safe-hats-module/src/SafePayment.sol`) already uses `execTransactionFromModuleReturnData`:
  the reference for snag S-12. Its amounts already follow M6-money.

## Passed to Goal 3 (through the conductor)

- Codex: `packages/compiler/src/modules/model/internal/invariants.ts:83`, a rule refusal's auto-filled field schemas
  aren't checked against the key fields'.
- Codex: `packages/projections/src/modules/server/internal/worker-config.ts:67`, rule index names differing only in case
  collide in SQLite.
- Codex (on #283): `packages/language-effect/src/modules/records/internal/holder.ts:31`, the pre-commit unique-rule check
  rescans every held row per row, cubic in a bulk write's size.

## Snags

S-01 to S-12 open (`design/goals/04-snags.md`): each a framework piece the budgets journeys need, each naming its slice.
From K33 (21 November 2026), new snags are Snag issues in Goal 4's milestone. The done check's snag line
(`e2e/on-chain/03-snags.test.ts`) reads only `04-snags.md`, so a checks author must extend it to require every Snag
issue in the milestone closed or parked, before the goal lands.

## What went well

- Writing the chain decision early, then answering every author's questions into it (items 10 and 11) gave the
  journeys, the done check and slice 3 one spec to build to.
- The hostile pass found real holes in every check (snag statuses with fake PR numbers, a seam check that compared a
  branch with itself, a signer check one shared key could pass). Reviewers alone had missed them.
- Two 🔍 rounds on the decision caught a changed meaning of "intent" with no supersede line, and a refusal list that
  contradicted the not-found rule.

## What did not go well

- Side sessions could not be started over Remote Control; roles ran as subagents instead (fine, but not visible as
  sessions to Aaron).
- A reviewer checked out a branch in the lead's worktree and left a detached head.
- The kanban snapshot carried a superseded phrase and failed CI's supersede check on the first push.
- CI is slow (45 to 60 minutes a pull request), so a stacked chain of four takes hours to land.
- #331 sat a day ready and BLOCKED (21 to 22 November): an open Codex thread, and `goal/stage-1` moving 113 commits
  meanwhile. The conductor had to nudge.

## Lessons for the next lead

- Give every subagent reviewer an explicit "read-only, no checkout in shared worktrees" line.
- Run `tools/ci/supersedes.sh` before pushing any decision.
- Answer an author's questions in the decision itself, as a numbered item, not only in a message.
- Turn off auto-archive on PR close at the start.
- Keep this file current in the same pull request as every merge.
- A ready pull request with everything green can still sit BLOCKED on one unanswered Codex thread. Read the
  unresolved threads, not only the checks, before leaving a pull request to CI.
- The lead's session does not get CI events for a pull request it didn't bind. Check every open pull request at each
  wake, or a ready one can sit for a day.
- A push and `gh pr ready` in the same second can leave only a draft run, whose skipped jobs GitHub counts as passed.
  `goal/on-chain` has the draft-race fix since #663; still wait a minute after a push before marking ready, and confirm
  the newest run on the head really ran its jobs before merging.
- A merge of `goal/stage-1` after a slice that rebuilt shared code is real integration: give it a 🔍 of its own. On
  #663 that 🔍 found stage-1's `.via` hiding an entry from slice 3's chain checks.
- When review rounds keep finding faults of one kind, look for two owners of one fact. The relayer's five nonce
  rounds all came from the relayer guessing state that only the port knew; cutting the guessing code ended them.
  Count rounds, and cut scope at the third rather than patch a fourth.
- Codex reviews each new head and often finds a new real fault after a 🔍 pass. Budget one more round per pull
  request for it.
