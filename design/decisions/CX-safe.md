# CX-safe: the Safe, cut into slices Goal 16 can build

**Status: decided, 26 November 2026,** by Goal 16's 📐 designer thread, started by the money lane's 🧭 lead (issue
#1158), under AGENTS.md "Who decides". It cuts Goal 16's slice 2, "each person's and each company's Safe, acted on from
the CLI, MCP and an agent; a sales invoice with a pay link, paid from any wallet, settled by the chain, with the ledger
lines posted" (`design/goals/16-capxul.md:93`), into five slices, names the framework gaps Goal 16 claims for them, and
says where the new things go. The two questions for Aaron are at the end; the decision goes ahead on the
recommendation of each.

**Settled before this, and not reopened:** Capxul's on-chain account is a Safe and nothing else for now
(`CX-onchain-safe.md:17-22`); a person's account is an ordinary Safe at the address it will have once deployed, and
money can arrive first (`M7-capxul.md:150-151,169-178`); a Safe is someone else's contract behind the `safe` adapter,
and an organisation and its Safe are linked by an ordinary field (`K25-the-blueprint-on-chain.md:113-121`); payouts
are spent against an Org Budget, a Zodiac Roles 2.1.1 role the company's Safe grants, used by a member through
`execTransactionWithRole` from the member's own Safe, the owners can do anything directly, and over budget is refused
`PayoutOverBudget { remaining }` at prepare (CX-bridge-rails, #1149,
`goal-16/bridge-rails-design:design/decisions/CX-bridge-rails.md:169-204`); the Safe comes before Bridge (same file,
`:327-329,410-411`); staging runs on Base Sepolia with test USDC (the conductor, 26 November 2026).

**The prior art.** This thread cannot attach `Xelmar-tech/infrastructure` (the conductor's answer: it is not added).
The conductor read it from its own clone and answered the lead's questions on 26 November 2026; those answers are
cited here as `infrastructure:<path>:<lines>`, with `P/` for `packages/protocol/src/evm/`. Where a citation came
through CX-bridge-rails it is marked so. One fact still waits on the conductor and is marked **(conductor: confirm)**.

## In short

A Safe is a record Capxul keeps from the moment a person or a company has one. Its address is the one Safe's own
factory will give it, worked out before anything is on chain from a salt and its first owner, so money can be paid
there at once. A person's Safe starts owned by Capxul's bootstrap key, so its address needs nothing from the person;
when the person claims it, it is deployed and their key replaces the bootstrap key as its only owner. A company's Safe
is owned by its founders' and directors' personal Safes, never their keys, so a person can change their key without
any company's Safe moving. After deploy the chain is the truth for owners and threshold, read through the `safe`
adapter. Budgets come next, as a Zodiac Roles module the company's Safe switches on, and getting paid by a link comes
last, after the books have invoices. This is the earlier implementation's design (Aaron's own), lifted, with one
change: the salt is keyed by Capxul's id, not by an email.

The journeys run on Anvil, one per world, from the first slice that sends a transaction. No Safe stand-in is built:
Anvil per world, keys per world, the ABI codec, transaction tracking and the follower already work, so a fake chain
would be thrown away. The first slice sends nothing, so it needs no chain at all.

## 1. The things and their fields

Ids are new prefixes; amounts are base-unit digit strings, as everywhere in Capxul. Where each thing lives is section 5.

**`safe`: a Safe Capxul knows about** (`Blueprint.id("saf")`). One thing for both kinds, because a person's Safe and a
company's are the same contract made by the same factory (`M7-capxul.md:175-176`) and differ only in who owns them.

| Field | Value | Why |
|---|---|---|
| `id` | `saf_…` | |
| `kind` | `personal` or `company` | who it belongs to decides who may act on it |
| `person` | `per_…`, set when `kind` is `personal` | whose Safe it is (`M7-capxul.md:150`) |
| `company` | `com_…`, set when `kind` is `company` | the company it is for; a company may have several, a Safe may have no company (`K25-the-blueprint-on-chain.md:117`) |
| `account` | `Blueprint.account()`, CAIP-10 | the address, worked out before deploy: `eip155:8453:0x…` on Base, `eip155:84532:0x…` in staging, `eip155:31337:0x…` in a world (`packages/orthograph/src/modules/values/service.ts:78`) |
| `firstOwner` | `Blueprint.account()` | the one owner given to `setup`: the environment's bootstrap key for a personal Safe; the founder's personal Safe for a company's |
| `owners` | a list of `Blueprint.account()` | today's owners: `[firstOwner]` until the chain says otherwise, then a read copy |
| `threshold` | a whole number, 1 to the number of owners | 1 at setup; a person's Safe stays 1 |
| `saltNonce` | a uint256 digit string | the CREATE2 salt's nonce (below), stored so the address can be checked again |

Its machine. A personal Safe: **`counterfactual`** (recorded, the address known, no code) → **`claimed`** (deployed, and
the person's key swapped in for the bootstrap key, both seen on chain). A company's Safe: **`counterfactual`** →
**`deployed`** (the factory's `ProxyCreation` for this address seen, confirmed by the tracker). After deploy, owners and
threshold change only on chain (`addOwnerWithThreshold`, `removeOwner`, `swapOwner`, `changeThreshold`), each an
owner-signed `safe-transaction`, and Capxul's row follows the adapter's reads. Refusals declared with the thing:
`ThresholdOutOfRange`, `OwnersNotUnique`, `SafeNotDeployed`, `NotClaimed` (a personal Safe pays nothing, and signs for
no company, until it is claimed), `AlreadyClaimed`, `NotAnOwner`.

**The bootstrap owner and the claim.** The implementation makes a person's Safe with one fixed owner,
`CAPXUL_BOOTSTRAP_OWNER` (`infrastructure:P/safe-contracts.ts:54`), so its address depends on the salt alone, before the
person has any signer; at claim, the person's signer replaces it by `swapOwner` (`infrastructure:P/safe-address.ts:143-174`).
Capxul lifts this. Each environment has its own bootstrap key, held by the server (its custody declared `server`, M6.18;
a world key in a world); its address is part of every personal Safe's address in that environment. The bootstrap key
signs exactly one kind of transaction: the claim, which the relayer sends as the factory's `createProxyWithNonce`
followed by the Safe's `swapOwner(bootstrap → the person's key)`, signed by the bootstrap key. Nothing else Capxul
declares may use it; a journey proves the claim is the only operation that does. This keeps `M7-capxul.md`'s first
feature (money arrives before anything is deployed) and Aaron's "ordinary Safe owned by their key" once claimed; it
changes when the Safe is deployed (at the claim, not at its first pay-out) and who owns it before then (Supersedes).

**Keyed by Capxul's id, not an email.** The implementation's personal salt is
`BigInt(keccak256("<namespace>:<normalized email>"))`, with namespace `capxul:staging:email:v2`
(`infrastructure:P/safe-address.ts:56-63`, `P/safe-contracts.ts:33`), and a company's is namespaced by email and handle
(`infrastructure:P/organization-safe.ts:40-110`). Capxul keys it by its own id instead:
`saltNonce = uint256(keccak256("<namespace>:<id>"))`, the namespace `capxul:<environment>:safe:v1` and the id the
person's `per_…` or the company's `com_…`. Three reasons. An email changes; an id does not, and the address must not.
The salt nonce is an argument of the deploy call, so it is public on chain, and a hashed email is easily guessed back
from a list of addresses, which would put people's emails in public (AGENTS.md: keep people's details private). And a
person or a company has a Capxul id before they sign in or bring a key, which is all the address needs. The cost: a
Capxul address differs from the implementation's for the same person, which matters only for its staging Safes, and
no money in them is carried over.

**The address before deploy.** It is the address `SafeProxyFactory.createProxyWithNonce(singleton, initializer,
saltNonce)` will give, worked out the factory's way: CREATE2 from the factory's address, salt
`keccak256(encodePacked(keccak256(initializer), saltNonce))` (`infrastructure:P/safe-address.ts:205-206`), and the hash
of the factory's proxy creation code (pinned at `infrastructure:P/safe-contracts.ts:59-69`) followed by the singleton's
address. The initializer is the implementation's, byte for byte: `setup([firstOwner], 1, …)` with the setup call that
enables the Safe 4337 module and that module as the fallback handler, and no payment
(`infrastructure:P/organization-safe.ts:44-71`); no Roles modifier or allowance is set up then (`:40-110`). So the
address depends only on the pinned contracts, the first owner and the salt, and adding a budget later never moves it.
The factory and singleton sit at the same addresses on every EVM chain, so the address is the same on Base, Base
Sepolia and in a world (CX-bridge-rails `:94`, its R9).

**`SafeDeployment`: the pinned contracts.** **Safe 1.4.1, the L2 singleton, with the Safe 4337 module**, as the
implementation pins on Base Sepolia (`infrastructure:P/safe-contracts.ts:3-16,82`): `SafeProxyFactory`
`0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67`, `SafeL2` `0x29fcB43b46531BcA003ddC8FCB67FFE91900C762`, `SafeModuleSetup`
`0x2dd68b007B46fBe91B9A7c3EDa5A7a1063cB5b47`, `Safe4337Module` `0x75cf11467937ce3F2f357CE24ffc3DBF8fD5c226`, `MultiSend`
`0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526`, `MultiSendCallOnly` `0x9641d764fc13c8b624c04430c7356c1c7c8102e2`. The
spike ran 1.5.0 (`spikes/safe-hats-module/versions.json:190-193`); 1.4.1 is taken because the implementation's Safes
and its 4337 path are on it, and the spike's findings Capxul uses (the SafeTx format and its order rules, module
enabling, a non-owner submitting, ERC-20 payouts) hold on both. The 4337 module is set up from the start so the
sponsored path (`design/later.md`) needs no new address; until then nothing sends a UserOperation. The addresses and
bytecode are read from `@safe-global/safe-deployments` at an exact version and checked against these, never typed by
hand in code. `SafeL2` is the L2 build: it emits `SafeMultiSigTransaction`, which the follower reads.

**Which chain.** Base, 8453, in production, as the implementation and Bridge's `base` rail settle (CX-bridge-rails
`:92-94,415-416`); Base Sepolia, 84532, in staging; Anvil, 31337, in a world. Each environment names its chain in
`blueprint/environments/`; the `safe` thing never names one. This answers `CX-crypto-accounting.md:484`. In a world,
Anvil has none of these contracts, so the world puts the pinned deployed bytecode at the same addresses with
`anvil_setCode` before the first step; S2's check proves the world's predicted address is the factory's.

**`safe-transaction`: a transaction a Safe's owners are approving** (`Blueprint.id("stx")`), S3. Its fields are the
exact typed `SafeTx` (`to`, `value`, `data`, `operation`, the gas fields zero, `nonce`), its chain and Safe, and each
owner's approval so far. Its machine: `proposed` → `approved` (the threshold reached) → `submitted` → `executed` or
`failed` (the Safe's `ExecutionSuccess` or `ExecutionFailure` for its hash). The SafeTx's EIP-712 domain is the chain
id and the Safe's address (`verifyingContract`), and the nonce is a field of the `SafeTx` message, not of the domain;
the digest must equal the Safe's own `getTransactionHash` (`spikes/safe-hats-module/script/safe.ts:57-76`). How an
owner approves depends on what it is:

- **A key** (a claimed personal Safe's owner) signs the digest; signatures are packed in owner-address order, and the
  Safe refuses reversed order, a wrong recovery value and a replay (`ST3-budgets.md:167-175`,
  `spikes/safe-hats-module/README.md:34-38`).
- **A Safe** (a company's owners are personal Safes) cannot sign through ERC-1271 here, because these Safes' fallback
  handler is the 4337 module, not the compatibility handler that answers `isValidSignature`. So an owner Safe approves
  on chain: its own owner's key signs a SafeTx on the personal Safe that calls `approveHash(digest)` on the company's
  Safe, or, when it is the last approval, calls the company's `execTransaction` itself, where its approval counts
  because it is the sender. Each step is a transaction. **(conductor: confirm)** this is how the implementation
  executes a company's transaction (`infrastructure:P/organization-safe.ts`, `packages/backend/src/permissions/`).

Each approval is an operation the owner calls; the call that reaches the threshold also submits. No workflow:
workflows are parked (K44), so collecting approvals is a thing's machine, not ST3.06's durable workflow.

**`org-budget`: an Org Budget** (`Blueprint.id("obg")`), S4. Fields: the company's `safe`, the member's own `safe` (the
Roles member is the member's personal Safe, CX-bridge-rails `:171-173`), the role key, the allowance key
(`orgBudgetAllowanceKey(roleKey, assetId)`), the token, the per-send limit, the allowance with its refill and period, in
USDC base units, and the recipients (`anyone` for a bank-payout budget, CX-bridge-rails `:206-215`). The chain is the
truth for the allowance's balance; Capxul's row is what was granted and a read copy of what remains. Its machine:
`granting` → `granted` → `revoked`, each move a company `safe-transaction`. As the implementation does it: the Roles
modifier is deployed through Zodiac's `ModuleProxyFactory` `0x000000000000addb49795b0f9ba5bc298cdda236`
(`infrastructure:P/organization-payments.ts:15`) with owner, avatar and target all the company's Safe
(`P/roles-module.ts:118-127`); a budget compiles to direct calls on the Roles modifier
(`buildOrgBudgetCallsWithEncoder`, `P/budget-permissions.ts:203-240`), scoped as `:117-155` says; the allowance is
`setAllowance(key, balance, maxRefill, refill, period, 0)`; and each is a company Safe transaction its owners approve
(`infrastructure:packages/backend/src/permissions/README.md`, `rules/encoding.ts`, `rules/stored-calls.ts`).

**Capxul's Payments contract, V3.** Leg 1 of every payout, and every Org Budget spend, is `CapxulPaymentsV3.send`
(CX-bridge-rails `:125-129,171-174`): `send(PaymentItem)` and `sendBatch`, with `PaymentItem { settlementId, recipient,
token, amount, kind, documentHash, jobNonce, executor }`, the event `PaymentSent(settlementId indexed, sender indexed,
recipient indexed, token, amount, kind, documentHash)`, and `settled[settlementId]` refusing a replay
(`infrastructure:packages/contracts/src/CapxulPaymentsV3.sol:13-35,63,68`). It is on Base Sepolia at
`0x46b28f455c8de7c1505e3185A3f8f87B07eaE1aE` from block 47942654 (`infrastructure:P/payments-v3.ts:7,219`); it is not
yet on Base. It is Capxul's own contract deployed outside the framework (K44 call 8), not generated by
`language-solidity`: its source is copied into Capxul at the implementation's commit, unchanged, with a line naming
that commit, and Forge builds it for worlds. The copy is Aaron's own code, so licence and ownership allow it
(CX-bridge-rails `:341-343`).

**What is not a thing.** The Roles modifier and the Payments contract are reached through adapters (section 3). The
company does not gain a `safe` field: a company may have several Safes (`K25-the-blueprint-on-chain.md:117`), so the
`safe` thing points at the company, and Bridge's R1 reads "the company's Safe" as its one Safe of kind `company`
(CX-bridge-rails `:402`); a second is refused until a company needs one. This changes K25's "an organisation that wants a
Safe points at it" to a link either way (`K25-the-blueprint-on-chain.md:121`, under Supersedes).

## 2. How the journeys run

**On Anvil, one per world, from S2.** S1 sends nothing and needs no chain. Every slice after it runs its journeys
against a world with Anvil, its keys and Safe's contracts at their canonical addresses. No Safe stand-in.

What exists and works today, on `main`:

| Piece | Where | Today |
|---|---|---|
| Anvil per world, keys made by the world and never printed | `packages/chain-evm/src/modules/anvil` (M1.31) | works (`docs/canon/status.md:161`) |
| Keys, signing, simulation, a keystore | `packages/wallets` (M1.27 to M1.32) | works, its own checks only (`status.md:160`) |
| The ABI codec: calls, results, deploys, typed reverts | `packages/chain-evm/src/modules/abi` | built (its README still says empty; `service.ts:5-16`) |
| Transactions: prepare, sign, submit, track to `Confirmed`, replace, resume | `packages/chain-evm/src/modules/tx` | works |
| The follower: confirmed events once, corrections on a reorg | `packages/host-cloudflare/src/modules/follower` (M6.09) | works; check 11 is green on `main` (`e2e/on-chain/expected-failing/` lists no `11-`) |
| The on-chain suite runs on `main`, with Anvil | Goal 18's slice 9, #1104 | runs (`e2e/m1/48-g18-9-chain-basics.test.ts:3-5`) |
| `Blueprint.account()`, CAIP-10 | `packages/orthograph/src/modules/values/service.ts:78` | works |

What is missing, and whose it is (section 3):

| Gap | Status | Needed by |
|---|---|---|
| `ortho new adapter --from-abi` | provisional, #474 (`status.md:195`); the adapters are hand-written until it lands | S2 |
| the `erc20` adapter, typed `transfer` and `Transfer` | provisional, checks a draft #497 (`status.md:201`) | S2 |
| events in: an adapter's chain events, handed on by the follower, taken by `on:` | building, no goal running it (`status.md:191`) | S2 |
| a world with Safe's contracts at their canonical addresses | not built (M6.16's part) | S2 |
| the `safe` adapter: the prediction; owners, threshold, nonce, `execTransaction`, `approveHash`, `swapOwner`, the SafeTx typed data, `GS0xx` reverts typed | spiked (ST3.04, `status.md:170`) | S1 (the prediction), S3 |
| a Roles adapter and the Payments adapter | not on the board | S4 |
| the relayer, trusted | on `main`, marked experimental, four bugs in #784 (`status.md:164`; check 48 `:7-11`) | staging, not the journeys |

`goal/capxul` does not yet hold Goal 18's chain-basics merge (#1104, a74aa622): S2's builder merges `main` into
`goal/capxul` first.

## 3. The framework gaps Goal 16 claims, and what it builds on

**Goal 18 holds what its slice 9 built and runs in `e2e-on-chain` on `main`** (the conductor's answer, 26 November
2026): keys and wallets (`packages/wallets`), the chain adapter with its ABI codec, transactions and contract client
(`packages/chain-evm`), money, the follower and the relayer (`packages/host-cloudflare/src/modules/{follower,relayer}`).
Goal 16 builds on those and does not take them over. A change any of them needs is a Snag issue naming Goal 18, pinned
by its own check, and keeps `e2e-on-chain` green. Purely additive new files in chain-evm's `anvil` module and in the
world are Goal 16's under `lane:goal-16`, as long as `e2e-on-chain` stays green; a change to existing world or Anvil
code is a Snag naming Goal 18. Slice 9 itself only ran the suite on `main` and marked the relayer experimental (#1104:
`ci.yml`, the relayer's README and doc comment, the status row, the canon page, the climb); it built none of the Safe,
Hats, budget, `erc20` or events-in parts.

**Goal 16 claims three rows** (the conductor's answer), each in new files only:

| # | Row | What Goal 16 builds | Touches (new files) | Slice |
|---|---|---|---|---|
| G1 | `erc20-adapter` (ST2.02, #485, checks #497) | `@orthograph/erc20`: `transfer`, `balanceOf`, `Transfer`, its stand-in token deployed into a world | `packages/erc20/` (new package) | S2 |
| G2 | `events-in` (M5.03's chain part, #480) | `on:` for an adapter's confirmed chain events, once each by `${chainId}:${blockHash}:${logIndex}`, with corrections; the inbox side of the follower's `FollowerSink` (Ask #481) | new files in `packages/orthograph/src/modules/events/` and `packages/orthograph/src/modules/plugins/` | S2 |
| G3 | `safe-hats-budgets`, the Safe and budget parts (ST3.04, #484) | the `safe` adapter: `SafeDeployment` and the address prediction (S1); reads of owners, threshold and nonce, the SafeTx typed data, `execTransaction`, `approveHash`, `swapOwner`, `GS0xx` as typed refusals through chain-evm's existing `Abi.refusal` (S3); the world starter that puts the pinned bytecode at its addresses (S2); the Zodiac Roles 2.1.1 adapter, its `ModuleProxyFactory` and the Org Budget's calls (S4) | `packages/wallets/src/modules/safe/` and `packages/wallets/src/modules/roles/` (new modules); the world starter as new files in `packages/wallets/src/modules/world/` or `packages/chain-evm/src/modules/anvil/`; nothing existing changes | S1 to S4 |

The Payments adapter and the contract's copied source are Capxul's own (section 5). Hats is not built: the Org Budget
is Zodiac Roles, so `ST3-budgets.md`'s recommendation is not taken for Capxul.

**Snags naming Goal 18, each pinned by its own check, when the slice that needs it starts:**

- **The relayer's four bugs (#784),** before Capxul's staging run, pinned against check 48: its slice 9 kept #784 open
  "for the app that first pulls it" (`e2e/m1/48-g18-9-chain-basics.test.ts:9-10`), and a fix must change check 48's
  author first (`:21-22`). Capxul's journeys do not need the relayer: in a world, the claim, a deploy and an
  `execTransaction` are sent by a world key through `packages/wallets`'s existing submit, which the spike showed works
  from a non-owner (`spikes/safe-hats-module/README.md:49-52`).
- **Signing typed data (M6.15),** if the existing signer cannot sign the SafeTx's EIP-712 digest, at S3.
- **The contract client (M6.14),** if a Safe's `GS0xx` revert cannot be decoded through the existing `Abi.refusal`, at
  S3.
- **The follower's sink,** if G2 needs any change to it, at S2.

**Flags for the lead.**

- **`ortho new adapter --from-abi` (#474) has no owner yet;** the lead is asking the conductor. Until then the `erc20`,
  `safe`, Roles and Payments adapters are written by hand, and each file says it is to be regenerated when #474 lands.
- **G2 takes from parked Goal 17's slice 11.** Adapter events carrying `id` and `actor` are on `goal/superagent`
  (`status.md:191`). Take what helps, credit it in the commit and the file, copy only what is needed, never merge
  `goal/superagent`, and claim the rest.
- Capxul's checks for G1 to G3 go in each package's own tests and `e2e/capxul/`, not `e2e/on-chain/`, which is
  Goal 18's to run.

**Not built here.** `@orthograph/budgets` (ST3.05) and `examples/budgets`, which CX-bridge-rails already sets aside
(`:221-224,358-359`); ST3.06's durable signature workflow; a sponsored ERC-4337 path (`design/later.md`).

## 4. The slices

Each slice is one branch and ends green with its check. A ✍️ author who is not the builder writes its journeys and
checks first, red, and proves them fair (the `author` skill). Each slice adds things or operations, so it changes
Capxul's `generated/` and lands as a G12 pair, `goal-16/<slice>-check` then `goal-16/<slice>-build`. The framework
gaps land in `main` with their own checks, and are merged into `goal/capxul` before the Capxul slice that uses them.

The lead's draft on #1158 had four slices. This cut adds one, **the chain door (S2)**, before the Safe goes on chain:
getting paid to a Safe needs no deploy (`M7-capxul.md:169-178`), and Bridge's deposits need the same door
(CX-bridge-rails `:403,410`), so seeing money arrive comes before spending it. It also puts the claim in S3, since a
person's Safe deploys when it is claimed.

| Slice | What it builds | Done when | `generated/` |
|---|---|---|---|
| **S1 · The Safes recorded** | `SafeDeployment` and the prediction (G3, in `main`); the `safe` thing; `safe.record` for a person (bootstrap first owner, salt from `per_…`) and for a company (its founder's personal Safe the first owner, salt from `com_…`); no chain; acted on from the CLI, MCP and an agent. It unblocks Bridge R1, the company's Safe address as a fact (CX-bridge-rails `:402`) | in `prove`: a person's Safe has the address of a vector worked out with the implementation's own formula for a fixed salt nonce and owner; recording the same id twice gives one Safe; a company's Safe's address changes with its founder's Safe and nothing else; a company whose founder has no Safe is refused; a stranger cannot record a Safe for another person or company; an agent records one through MCP | yes, a pair |
| **S2 · The chain door** | G1, G2 and G3's world starter in `main`; then in Capxul, an `on:` for the `erc20` `Transfer` to a recorded Safe, kept as a received payment on the Safe | on Anvil: USDC sent to a counterfactual Safe's address is recorded once on that Safe, typed; a second delivery of the same event changes nothing; an `anvil_reorg` that drops it gives a correction and the payment is undone; the address S1 worked out is the one the factory deploys at | yes, a pair |
| **S3 · The Safe on chain** | G3's reads, SafeTx and typed refusals in `main`; then in Capxul, `safe.claim` (deploy and `swapOwner`, signed by the bootstrap key), `safe-transaction` (`propose`, `approve`) for a key owner and for a Safe owner, a company's Safe deployed on its first spend, adding a director's Safe as an owner | on Anvil: a person claims their Safe holding USDC, it reads `claimed` with their key its only owner, and they pay a supplier on their one signature; a second claim is `AlreadyClaimed`; an unclaimed Safe's payment is `NotClaimed`; the bootstrap key is used by the claim and by no other operation; a company's Safe owned by its founder's Safe is deployed and pays on the founder's approval; with a director added at threshold 2, it pays after the second approval and not after the first; an approval from a non-owner is `NotAnOwner` before anything is sent; a replayed SafeTx is refused by the Safe as `GS026`, typed | yes, a pair |
| **S4 · The Org Budget** | G3's Roles adapter in `main`; the Payments contract copied, its adapter, deployed into worlds; `org-budget.grant` (a company Safe transaction: deploy the Roles modifier, enable it, assign the member's Safe, scope V3 `send`, `setAllowance`); `payment.send` under the role from the member's own Safe; `PayoutOverBudget { remaining }` at prepare; an owner's direct send | on Anvil: a member's Safe sends within the budget, `PaymentSent` carries its `settlementId`, and the allowance falls by exactly that; a send over it is refused `PayoutOverBudget` with the right `remaining` before any transaction; a spent budget gives `remaining: 0`; a second `send` with the same `settlementId` is refused by the contract; an owner's direct send needs no budget; a revoked budget refuses; the role cannot send a token it was not scoped to | yes, a pair |
| **S5 · Getting paid by a link** | after slice 7's sales invoices (which wait on gaps #1079 and #1132, being built now) and the pages it needs: a pay link on an invoice, paid from any wallet to the person's or company's Safe, settled only by S2's `Transfer`, its ledger lines posted | `M7-capxul.md`'s journeys (section 4): paid by its link and settled; a second transfer for a settled invoice changes nothing; no call marks an invoice paid; a stranger reads an invoice by its link and nothing else; the ledger balances after each payment | yes, a pair |

**Order and what waits.** S1 now. S2 after S1, G1, G2 and G3's world starter. S3 after S2 and G3's Safe reads (and any
Snag above it meets). S4 after S3. S5 after S2 and slice 7's invoices, which wait on #1079 and #1132; it does not wait
on S3 or S4. Bridge's R1 waits on S1, R2 on S2, R3 on S4 (CX-bridge-rails `:410-411`).

## 5. Where the new things go

A feature may import only features, never the app (the conductor's answer). So, per thing:

| Thing | Where | Why |
|---|---|---|
| `safe` | `examples/capxul/blueprint/things/safe/` | it links to Company and to a person, both still in the app |
| `safe-transaction` | `examples/capxul/blueprint/things/safe-transaction/` | it links to `safe` |
| `org-budget` | `examples/capxul/blueprint/things/org-budget/` | it links to two `safe`s |
| the Payments adapter, the contract's copied source and its ABI | `examples/capxul/plugins/onchain-pay/` | it needs nothing of the app, so it is in the feature from day one |
| `SafeDeployment`, the prediction, the Roles calls | `packages/wallets/src/modules/{safe,roles}/` (G3) | they are the framework's, for any app's Safes |
| the salt's namespace and the bootstrap key's address, per environment | `examples/capxul/blueprint/environments/`, the key itself a secret | they are Capxul's and differ per environment |

The three things move into `onchain-pay` after `company` and `people` have moved, as a move of its own; its row belongs
on CX-features's move list (the features lead's file, so the lead adds it). Its journeys go in
`examples/capxul/journeys/`, named `safe-…` as Bridge's are `bridge-…`; Capxul's CI job (`tools/ci/capxul-paths.sh`)
already runs `prove` over `examples/capxul`. A rule that lives on chain changing by a migration with money in it has no
word in the blueprint yet (`CX-composable-pieces.md:520-521`); S4 meets it first, and a Snag is logged then if it bites.

## For Aaron

1. **Who pays the gas on Base?** I recommend Capxul's relayer pays for claims, deploys and Safe transactions, a cost of
   Capxul's, small on Base, with the sponsored 4337 path later. The other choice is each company funding its own key,
   which needs ETH in every Safe before it can spend. The conductor is bringing this to you; proceeding on Capxul
   paying.
2. **Is it all right that Capxul's bootstrap key owns a person's Safe until they claim it?** I recommend yes, as your
   earlier implementation does: it is what lets money arrive before a person has a key, and the key signs only the
   claim, which a journey proves. The other choice is to make each person's Safe only when they bring a key, so Capxul
   never holds one, but then nobody can be paid before they sign up. Proceeding on the bootstrap key.

## Supersedes

- design/decisions/K25-the-blueprint-on-chain.md: "An organisation that wants a Safe points at it with an ordinary field." → "An organisation and its Safe are linked by an ordinary field; in Capxul the Safe's record points at its company, since a company may have several (CX-safe)."
- design/decisions/M7-capxul.md: "Their personal account is an ordinary Safe owned by that key, at the address it will have once deployed." → "Their personal account is an ordinary Safe at the address it will have once deployed; until they claim it, its only owner is Capxul's bootstrap key, and claiming deploys it with their key in its place (CX-safe)."
- design/decisions/M7-capxul.md: "and the Safe is deployed on its first pay-out, in the second feature" → "and the Safe is deployed when it is claimed (CX-safe)"

`ST3-budgets.md` is not decided (`ST3-budgets.md:3-7`), so no words of it are superseded; its Hats recommendation is
not taken for Capxul, and a note beside its title says so.
