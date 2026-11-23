# Goal 4: state

Updated 22 November 2026 by the Goal 4 lead. Check against GitHub before acting (the skill's resume step 6).

## Hand-over in one line

Lead Goal 4: read this file, then the goal-4 skill's "Resume in this order". Next action: merge [#331](https://github.com/Open-Harness/orthograph/pull/331) (slice 3's
build) once its merge of `goal/stage-1` and the Codex fix are green and a 🔍 has passed the merge. Then take the relayer
and follower checks and the ABI codec checks through a 🔍 and into builders.

## Where it stands

- **Landed on `goal/on-chain`:**
  - slice 0, 1b ([#275](https://github.com/Open-Harness/orthograph/pull/275)) and 2 ([#276](https://github.com/Open-Harness/orthograph/pull/276), [#279](https://github.com/Open-Harness/orthograph/pull/279));
  - M6-money ([#287](https://github.com/Open-Harness/orthograph/pull/287), `cbd0bbf0`);
  - slice 3's checks ([#283](https://github.com/Open-Harness/orthograph/pull/283), `224af530`);
  - `goal/stage-1` with CI-drafts, K32, K33 and Effect 4.1.4 ([#303](https://github.com/Open-Harness/orthograph/pull/303));
  - the two lock calls in M6-chain item 4 ([#332](https://github.com/Open-Harness/orthograph/pull/332)).
- **Slice 3, build:** [#331](https://github.com/Open-Harness/orthograph/pull/331), ready.
  - Three 🔍 rounds passed (round 3 at `02753816`).
  - It then sat a day BLOCKED: `goal/stage-1` had moved 113 commits, and an unanswered Codex finding remained (a
    unique invariant whose refusal field is `money.of(...)` crashes `sameValue` on a cyclic `JSON.stringify`).
  - The builder (a subagent of this lead, worktree `agent-acbbee5078f80ab9d`) is merging `goal/stage-1` in. Six
    conflicts are expected: AGENTS.md, three canon pages, `describe.ts`, `model/types.ts`.
  - The builder is also fixing the Codex finding with a test. The merge needs a 🔍 before #331 merges.
- **Order changed under K38 (22 November):**
  - Slices 9 and 10 (relayer, follower) come straight after 3, before 4 to 8.
  - M6.09 lands early into `goal/stage-1` for Goal 9 (Ask #442, answered).
  - Slice 3b, `chain-evm`'s ABI codec and `ChainPort.read`, is for Goal 12 (Ask #471, answered: its shape as asked).
    It is cut from `goal/stage-1` and lands there directly.
  - The follower calls Goal 11's `Inbox.accept` per `Confirmed` and per `Corrected` with `wasConfirmed: true`, never
    for an unconfirmed take-back, or a `FollowerSink` port until `Inbox` is on `goal/stage-1` (Ask #481, answered;
    narrowed by M6-chain item 12).
- **Checks authors running (subagents):**
  - `goal-4/abi-codec-check`, off `goal/stage-1`;
  - `goal-4/m607-m609-check`, off `goal/on-chain`.
- **Slice 1:** held. M2.05 is not ✅ on `goal/stage-1` as of 22 November.
- **Slices 4 to 8, 11 and 12:** not started. Slice 4's checks author starts when a builder slot frees (at most three
  builders).
- **Closed issues:** #333, #335 and #336 (slices 0, 1b and 2), #300 (K32 adopted), and #349 (Goal 3's OTLP status
  question: no Goal 4 check asserts a span status).

## Open pull requests, in merge order

| PR | Branch | What | Waiting on |
|---|---|---|---|
| [#331](https://github.com/Open-Harness/orthograph/pull/331) | `goal-4/m610-build` | slice 3's build | the `goal/stage-1` merge and Codex fix, a 🔍 of the merge, CI |
| this one | `goal-4/k38-order` | brief and state: K38 order, Asks answered | 🔍, CI |
| (draft, opening) | `goal-4/abi-codec-check` | slice 3b's checks, into `goal/stage-1` | the author, then a 🔍 |
| (draft, opening) | `goal-4/m607-m609-check` | slices 9 and 10's checks | the author, then a hostile pass and a 🔍 |

`goal/on-chain` and `goal/stage-1` require their CI jobs and every thread resolved. Neither requires the branch to be
up to date (`strict=false`).

## Waiting on Aaron

Nothing. Money (ledger `THI-07`) was answered by Aaron himself on 21 November 2026, all five recommendations ("agreed on
all questions"; the conductor had given the same under his standing authority). Recorded in
`design/decisions/M6-money.md`, [#287](https://github.com/AaronAbuUsama/architect/pull/287) (🔍 passed on the second round; waits on CI): every amount names its asset (fixed, or
`money.of` a field of the same thing); assets are files in `blueprint/assets/`; base units everywhere, digits-only on
the wire, formatted at the faces; unsigned unless signed; built in slice 3. Slice 3's checks author (a subagent of
this lead) was asked to add money's seven cases to [#283](https://github.com/AaronAbuUsama/architect/pull/283); Goal 7's lead (Foreman) was given the same shape.

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
