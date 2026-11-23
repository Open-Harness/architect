# Goal 4: state

Updated 23 November 2026 by the Goal 4 lead. Check against GitHub before acting (the skill's resume step 6).

## Hand-over in one line

Lead Goal 4: read this file, then the goal-4 skill's "Resume in this order". Next action: take the relayer (slice 9,
branch `goal-4/m607-build`) and the follower (slice 10, `goal-4/m609-build`) from their builders through a 🔍 and CI
into `goal/on-chain`; then land M6.09 early into `goal/stage-1` (K38, Ask #442), and start slice 4's checks author.

## Where it stands

- **Landed on `goal/on-chain`:**
  - Slices 0, 1b and 2: the plan, the chain decision, and the budgets example with its done check ([#275](https://github.com/Open-Harness/orthograph/pull/275),
    [#276](https://github.com/Open-Harness/orthograph/pull/276), [#279](https://github.com/Open-Harness/orthograph/pull/279)).
  - Money, M6-money ([#287](https://github.com/Open-Harness/orthograph/pull/287)). Slice 3's checks ([#283](https://github.com/Open-Harness/orthograph/pull/283)). Two lock calls in M6-chain item 4 ([#332](https://github.com/Open-Harness/orthograph/pull/332)).
  - Slice 3, M6.10: the chain store, values and money, and the refusals lock ([#331](https://github.com/Open-Harness/orthograph/pull/331), `d93a16ca`). Codex's two
    fixes went in with it: an asset change a money field uses is major, and a changed prefix keeps the codes that
    shipped.
  - The relayer and follower decision, M6-chain item 12 ([#518](https://github.com/Open-Harness/orthograph/pull/518), `d1e045cd`).
  - The relayer and follower checks ([#513](https://github.com/Open-Harness/orthograph/pull/513), `c0ccbb28`). Thirteen tests fail on the empty seam, and each is
    listed in the ratchet.
  - `goal/stage-1` again, up to `dc471c87` ([#663](https://github.com/Open-Harness/orthograph/pull/663), `0494d896`). It brought CI that goes by a pull request's live
    draft state, the faster gate for goal branches, Goal 3's timing-test fix ([#528](https://github.com/Open-Harness/orthograph/pull/528)) and its monitor history fix
    ([#552](https://github.com/Open-Harness/orthograph/pull/552)).
  - The merge with slice 3 made two calls. A chain operation's `allowed` refuses `.via`/`.notVia`, `Blueprint.system`
    and a service role (M6-chain item 1). The refusals lock records an `instant` as its own kind (M6-chain item 4).
- **Landed on `goal/stage-1` (K38):** slice 3b, `chain-evm`'s ABI codec and `ChainPort.read`, for Goal 12 (checks
  [#509](https://github.com/Open-Harness/orthograph/pull/509), `e1bcb79a`; build [#521](https://github.com/Open-Harness/orthograph/pull/521), `b0673ee8`). Ask #471 is closed.
- **Running (subagents of this lead, each in its own worktree):** the relayer builder (slice 9, M6.07) and the
  follower builder (slice 10, M6.09). Each builds a Durable Object in its own `host-cloudflare` module and pushes
  its `-build` branch; the lead opens the pull request.
- **CI since 23 November:** a pull request into `goal/on-chain` runs only `check`, `builder-paths` and
  `e2e-on-chain`. The other required jobs pass without running. The lead runs the rest locally and posts the result in
  the pull request. To watch CI, copy the watcher from `main` until this branch has it:
  `git show origin/main:tools/ci/watch-required.sh > tmp/watch-required.sh`, then run `tmp/watch-required.sh <n>` in
  the background after each push. Wait a minute after a push before `gh pr ready`.
- **Order (K38):** slices 9 and 10 before 4 to 8. M6.09 lands early into `goal/stage-1` for Goal 9 (Ask #442). The
  follower calls Goal 11's `Inbox.accept` per `Confirmed` and per `Corrected` with `wasConfirmed: true`, never for an
  unconfirmed take-back, or a `FollowerSink` port until `Inbox` is on `goal/stage-1` (Ask #481, answered; narrowed by
  M6-chain item 12).
- **Slice 1:** held until M2.05 is ✅ on `goal/stage-1`.
- **Slices 4 to 8, 11 and 12:** not started. Slice 4's checks author starts when a builder slot frees (at most three
  builders). Slice 4's decision step takes snag S-12 (`execTransactionFromModuleReturnData`).
- **Asks out:** #541 to Goal 3 (fixed by #552); #674 to Goal 9 (a recast actor changes how a starting world's setup
  runs in `prove`; Codex on #663).
- **Closed issues:** #333, #335, #336 and #337 (slices 0, 1b, 2 and 3), #300, #349, #471.

## Open pull requests, in merge order

| PR | Branch | What | Waiting on |
|---|---|---|---|
| this one | `goal-4/where-it-stands-nov23` | brief and state after #331, #518, #513, #663 | 🔍, CI |
| (to open) | `goal-4/m607-build` | slice 9, the relayer | the builder, a 🔍, CI |
| (to open) | `goal-4/m609-build` | slice 10, the follower | the builder, a 🔍, CI |

`goal/on-chain` and `goal/stage-1` require their CI jobs and every thread resolved. Neither requires the branch to be
up to date (`strict=false`).

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
