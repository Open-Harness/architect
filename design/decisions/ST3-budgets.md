# ST3-budgets, not decided: the spike's recommendation that the Safe owns the budget and Hats decides who can spend

**Not a decision.** This is the safe-hats-module spike's recommendation, written 21 November 2026 as a draft for Goal 7's
lead and landed in `main` on 23 November 2026 for the record. Nobody has decided it. Under K42 a piece is decided and
built when the first app needs it, and Capxul (K43, Goal 16) is the app expected to need budgets first. The decision
that settles ST3.02 is made then, with this page as its evidence. Read "The recommendation" below as what the spike
found and proposes, not as what holds.

## The problem

A person or an agent needs to spend from a workshop's Safe within a limit. The
Safe's owners need a separate approval path for a spend above that limit. The
stage-three budgets decision must say which facts the app keeps in D1 and
which it reads from the chain. The spike paid from an enabled Safe, refused
an overspend, and ran a Safe transaction with two owner signatures.
`design/milestones.md:128`, `design/milestones.md:132`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:9`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:17`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:18`,
`spikes/safe-hats-module/evidence/safe-signatures.txt:6`

## The recommendation

Use one budgets module per network. Key each budget by the paying Safe and
the hat. The same hat had separate rows in two Safes in the Anvil run. The
Safe alone can create, change or revoke its own budget. A wearer can spend
from that budget while Hats says they wear the hat. The funds stay in the
Safe until it pays the recipient.
`spikes/safe-hats-module/src/HatBudgetModule.sol:38`,
`spikes/safe-hats-module/src/HatBudgetModule.sol:84`,
`spikes/safe-hats-module/src/HatBudgetModule.sol:100`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:13`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:16`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:28`

### Where each fact lives

This is the proposed storage split for the feature. The spike ran the chain side.

- **Budget.** The module is the source of truth for the token, limit,
  period length, charged amount and revocation. D1 holds a read copy for
  lists and display. The row's token gives every amount its units. Keep
  unsigned 128-bit amounts on chain and base-unit digit strings in D1 and
  on the wire. Format them only for display.
  `spikes/safe-hats-module/src/HatBudgetModule.sol:10`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:44`,
  `spikes/safe-hats-module/script/budgets.ts:137`,
  `spikes/safe-hats-module/evidence/budget-anvil.txt:20`,
  `origin/goal-4/m6-money:design/decisions/M6-money.md:98` (on Goal 4's branch).
- **Hat.** Store the link from a person or an agent to their account and hat
  in D1, alongside any display names. Hats on chain is the source of truth
  for the hat tree, who can administer a hat, and who can wear it now. Use
  the live Hats read for permission. The spike refused both an inactive hat
  and an ineligible wearer.
  `spikes/safe-hats-module/script/budgets.ts:20`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:89`,
  `spikes/safe-hats-module/evidence/hat-anvil.txt:16`,
  `spikes/safe-hats-module/evidence/hat-anvil.txt:19`
- **Spend.** D1 can keep an app request and a copy of the confirmed payout.
  The chain is the source of truth for payment. For a module spend, read
  the Safe, hat, token, recipient, amount, period and remaining limit from
  the `BudgetSpent` event. The module emits it after Safe pays. Direct and
  relayed spends consume the same nonce sequence for the acting address.
  `spikes/safe-hats-module/src/HatBudgetModule.sol:32`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:94`,
  `spikes/safe-hats-module/src/BudgetAuthorization.sol:21`,
  `spikes/safe-hats-module/src/BudgetAuthorization.sol:43`,
  `spikes/safe-hats-module/evidence/budget-anvil.txt:17`
- **Period.** The chain's block time and budget rule determine the current
  period. D1 keeps the period on observed spends and can show the current
  period as of the last block it read. The spike uses `block.timestamp /
  periodSeconds`. The boundary is measured from 1970. The module returns
  the restored limit even before the first spend in a new period. In
  production, the grant-anchored calendar month needs the time milestone.
  `spikes/safe-hats-module/src/HatBudgetModule.sol:72`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:110`,
  `spikes/safe-hats-module/evidence/budget-anvil.txt:26`,
  `design/decisions/K23-time.md:179`
- **Pending owner signature.** The app can keep the pending proposal and
  its display status in D1. The off-chain record is the source of truth
  for which signatures arrived. The workflow's storage is open. Safe
  decides which signatures count at execution, using its owners, threshold
  and nonce on chain. Safe also supports an explicit on-chain hash approval.
  `spikes/safe-hats-module/script/safe.ts:61`,
  `spikes/safe-hats-module/evidence/goal-4.txt:12`,
  `spikes/safe-hats-module/evidence/safe-signatures.txt:7`,
  `spikes/safe-hats-module/evidence/safe-signatures.txt:9`

### What the follower watches

- Follow budget creation, limit changes, revocation and `BudgetSpent` at the
  module address. Match a confirmed spend by chain, module, acting address
  and nonce. Apply the environment's confirmation rule and correct D1 if
  the chain takes a block back. Read the current budget at a known block
  when a period changes. Rollover has no event of its own.
  `spikes/safe-hats-module/src/HatBudgetModule.sol:26`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:72`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:110`,
  `origin/goal-4/m6-chain:design/decisions/M6-chain.md:195` (on Goal 4's branch),
  `design/decisions/K7-chain-languages.md:378`
- Follow hat creation, mint, transfer, burn, status, standing, and changes
  to the toggle or eligibility module. Use these changes to refresh the hat
  view. Re-read Hats for the current wearer, since the toggle and eligibility
  checks can change what that read returns. The local proof exercises
  explicit changes to status and eligibility.
  `spikes/safe-hats-module/versions.json:408`,
  `spikes/safe-hats-module/src/HatBudgetModule.sol:89`,
  `spikes/safe-hats-module/evidence/hat-anvil.txt:16`,
  `spikes/safe-hats-module/evidence/hat-anvil.txt:19`
- Follow Safe owner, threshold and module-enable changes. For an
  owner-approved transaction, match the Safe and its signed transaction
  hash to the Safe's execution result. Require the target's payout evidence
  before recording a spend. Where a Safe is itself a signer, the fallback
  handler is part of that read path. The spike checked both the Safe's
  execution event and token balances.
  `spikes/safe-hats-module/script/safe.ts:33`,
  `spikes/safe-hats-module/script/safe.ts:73`,
  `spikes/safe-hats-module/script/safe.ts:104`,
  `spikes/safe-hats-module/evidence/hat-anvil.txt:11`,
  `spikes/safe-hats-module/evidence/goal-4.txt:30`,
  `spikes/safe-hats-module/script/budgets.ts:126`

### How the agent gets a hat

The person uses their admin hat to create a child hat and mint it to the
agent's own address. The Safe gives that child hat its own smaller budget.
The agent spends from that row. The person can turn off the child hat through
a toggle that checks their Hats admin role. The local run paid the agent's
first spend, refused its overspend and refused another spend after the
person turned its hat off.
`spikes/safe-hats-module/script/budgets.ts:20`,
`spikes/safe-hats-module/test/HatAdminToggle.sol:15`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:15`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:22`,
`spikes/safe-hats-module/evidence/budget-anvil.txt:24`

## What follows

- The stage-three budgets decision is this draft (ST3.02). The journeys and
  the independent budget model come next (ST3.03). The spike's invariant
  checked its own ledger against the Safe balances and caught a rollover
  that kept prior spend.
  `design/milestones.md:128`, `design/milestones.md:129`,
  `spikes/safe-hats-module/test/HatBudgetInvariant.t.sol:85`,
  `spikes/safe-hats-module/evidence/budget-invariant.txt:17`,
  `spikes/safe-hats-module/evidence/budget-invariant.txt:59`
- The Safe and Hats adapters read owners, threshold and wearers (ST3.04).
  The budgets feature then supplies its generated on-chain module and fuzz
  comparison against the TypeScript machine (ST3.05). Use the direct and
  signed chain entries from the Goal 4 chain decision and the row's token
  units from the Goal 4 money decision.
  `design/milestones.md:130`, `design/milestones.md:131`,
  `spikes/safe-hats-module/src/BudgetAuthorization.sol:21`,
  `spikes/safe-hats-module/evidence/budget-anvil.txt:20`,
  `origin/goal-4/m6-chain:design/decisions/M6-chain.md:59` (on Goal 4's branch),
  `origin/goal-4/m6-money:design/decisions/M6-money.md:25` (on Goal 4's branch).
- The durable owner-signature workflow is a separate build step (ST3.06).
  The spike proved Safe transaction execution by a non-owner relayer with
  valid signatures. The stage-three workflow still has to prove the
  above-budget journey across eviction.
  `design/milestones.md:132`,
  `spikes/safe-hats-module/evidence/goal-4.txt:33`

## Open questions

- **Signature collection is open**, waiting on the workflows spike. It must
  collect the exact typed `SafeTx`, including its chain, Safe address and
  nonce, and the owner signatures that go with it. The Safe expects those
  signatures in owner-address order. The run refused the wrong order and
  a replay against a later nonce.
  `spikes/safe-hats-module/script/safe.ts:46`,
  `spikes/safe-hats-module/script/safe.ts:85`,
  `spikes/safe-hats-module/evidence/safe-signatures.txt:4`,
  `spikes/safe-hats-module/evidence/safe-signatures.txt:7`
- **Calendar months.** The spike proves that spend resets at a fixed-length
  boundary. The time milestone needs to supply the calendar rule and its
  chain test before a monthly budget can use this design.
  `spikes/safe-hats-module/evidence/budget-anvil.txt:26`,
  `design/decisions/K23-time.md:179`
- **Regranting a budget.** The spike's revocation is permanent. Creating a
  budget again for that Safe and hat returns `AlreadyExists`. The feature
  must settle whether it needs a new grant for the same pair.
  `spikes/safe-hats-module/src/HatBudgetModule.sol:44`,
  `spikes/safe-hats-module/evidence/budget-foundry.txt:15`
