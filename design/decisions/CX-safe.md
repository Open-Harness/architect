# CX-safe: the Safe, cut into slices Goal 16 can build

**Status: decided, 26 November 2026,** by Goal 16's 📐 designer thread, started by the money lane's 🧭 lead (issue
#1158), under AGENTS.md "Who decides". It cuts Goal 16's slice 2, "each person's and each company's Safe, acted on from
the CLI, MCP and an agent; a sales invoice with a pay link, paid from any wallet, settled by the chain, with the ledger
lines posted" (`design/goals/16-capxul.md:93`), into five slices, names the framework gaps Goal 16 claims for them, and
says where the new things go. The three questions for Aaron are at the end; the decision goes ahead on the
recommendation of each.

**Settled before this, and not reopened:** Capxul's on-chain account is a Safe and nothing else for now
(`CX-onchain-safe.md:17-22`); a person's account is an ordinary Safe owned by their key, at the address it will have
once deployed, money can arrive first, and it deploys on its first pay-out (`M7-capxul.md:150-151,169-178`); a Safe is
someone else's contract behind the `safe` adapter, and an organisation points at its Safe with an ordinary field
(`K25-the-blueprint-on-chain.md:113-121`); payouts are spent against an Org Budget, a Zodiac Roles 2.1.1 role the
company's Safe grants, used by a member through `execTransactionWithRole` from the member's own Safe, the owners can do
anything directly, and over budget is refused `PayoutOverBudget { remaining }` at prepare (CX-bridge-rails, #1149,
`goal-16/bridge-rails-design:design/decisions/CX-bridge-rails.md:169-204`); the Safe comes before Bridge (same file,
`:327-329,410-411`).

**The prior art was not reachable.** This thread was refused permission to attach `Xelmar-tech/infrastructure`, as the
bridge-rails designer was (`CX-bridge-rails.md:12-13`). Everything from it here comes through CX-bridge-rails's
citations, written `infrastructure:<path>`. The infrastructure repository is not added (the conductor's answer); the conductor answers prior-art questions from its
clone, with `infrastructure:<path>:<lines>` citations. Two facts here wait on that answer before S3 starts; each is marked **(conductor: confirm)**.

## In short

A Safe is a record Capxul keeps from the moment a person or a company has one: its owners, its threshold, and the
address the Safe's own factory will give it, worked out from those and a salt before anything is on chain. Money can
be paid to that address at once. The Safe is deployed the first time it spends (in a world by a world key, in staging and production by Capxul's relayer), in the same step
as the owners' signed transaction. After that, the chain is the truth for owners and threshold, read through the
`safe` adapter. Budgets come next, as a Zodiac Roles module the company's Safe switches on, and getting paid by a link
comes last, after the books have invoices.

The journeys run on Anvil, one per world, from the first slice that sends a transaction. No Safe stand-in is built:
Anvil per world, keys per world, the ABI codec, transaction tracking and the follower already work, so a fake chain
would be thrown away. The first slice sends nothing, so it needs no chain at all.

## 1. The things and their fields

The new things go in the `onchain-pay` piece (section 5). Ids are new prefixes; amounts are base-unit digit strings, as
everywhere in Capxul.

**`safe`: a Safe Capxul knows about** (`Blueprint.id("saf")`). One thing for both kinds, because a person's Safe and a
company's are the same contract made by the same factory (`M7-capxul.md:175-176`) and differ only in who owns them.

| Field | Value | Why |
|---|---|---|
| `id` | `saf_…` | |
| `kind` | `personal` or `company` | who it belongs to decides who may act on it |
| `person` | `per_…`, set when `kind` is `personal` | the person whose key owns it (`M7-capxul.md:150`) |
| `company` | `com_…`, set when `kind` is `company` | the company it is for; a company may have several, a Safe may have no company (`K25-the-blueprint-on-chain.md:117`) |
| `account` | `Blueprint.account()`, CAIP-10 | the address, worked out before deploy; `eip155:8453:0x…` on Base, `eip155:31337:0x…` in a world (`packages/orthograph/src/modules/values/service.ts:78`) |
| `owners` | a list of `Blueprint.account()` | as given to `setup`; a person's Safe has one, their key's account |
| `threshold` | a whole number, 1 to the number of owners | |
| `saltNonce` | a uint256 digit string | the CREATE2 salt's nonce, derived from the id (below), stored so the address can be checked again |
| `deployment` | the name of a pinned `SafeDeployment` (below) | which factory, singleton and fallback handler the address was worked out for |

Its machine: **`counterfactual`** (recorded, the address known, no code on chain) → **`deployed`** (the factory's
`ProxyCreation` for this address was seen, confirmed by the tracker). A recorded Safe's `owners` and `threshold` cannot
change while it is counterfactual, because they are part of the address: a change is refused `SafeNotDeployed`, and is
made on chain after the first deploy (`addOwnerWithThreshold`, `swapOwner`, `changeThreshold`), when the adapter's reads
become the truth and Capxul's row is a read copy. Refusals declared with the thing: `ThresholdOutOfRange`,
`OwnersNotUnique`, `SafeNotDeployed`, `NotAnOwner`.

**The address before deploy.** It is the address `SafeProxyFactory.createProxyWithNonce(singleton, initializer,
saltNonce)` will give, worked out off chain the same way the factory does it: CREATE2 from the factory's address, a
salt of `keccak256(keccak256(initializer) ‖ saltNonce)`, and the hash of the factory's `proxyCreationCode` followed by
the singleton's address. `initializer` is the encoded `setup(owners, threshold, 0x0, 0x, fallbackHandler, 0x0, 0, 0x0)`:
no module, no setup call and no payment at creation, so the address depends only on the owners, the threshold, the
pinned deployment and the salt. `saltNonce` is the uint256 of `keccak256` of the Safe's id, so one id gives one address
and recording twice cannot make two Safes. Because the factory and singleton sit at the same addresses on every EVM
chain, the address is the same on Base and in a world (CX-bridge-rails `:94`, its R9). Modules (the Org Budget's Roles
modifier) are enabled later by an owner-signed transaction, never at setup, so adding a budget never moves the address.

**`SafeDeployment`: the pinned contracts.** One value per pinned release, read from `@safe-global/safe-deployments` at an
exact version (AGENTS.md, pinned and at least three days old), never typed by hand: the `SafeProxyFactory`, the
`SafeL2` singleton (the L2 build, because it emits `SafeMultiSigTransaction` events the follower reads; Base is an L2)
and the `CompatibilityFallbackHandler` (needed for a Safe to sign through ERC-1271, `M6-chain.md:105-106`;
`spikes/safe-hats-module/README.md:30-33,44-48`). **The release is Safe Smart Account 1.5.0**, the one the spike ran
with its signature formats, module enabling, ERC-20 payouts and Safe-as-signer
(`spikes/safe-hats-module/versions.json:190-193`, `README.md:13-18,30-52`). **(conductor: confirm)** that the implementation
does not already pin 1.4.1 with live Safes on Base; if it does, the value names 1.4.1 instead, which changes nothing
else here, and S1's vector is recomputed.

**Which chain.** Base, chain id 8453, in production, as the implementation and Bridge's `base` rail already settle
(CX-bridge-rails `:92-94,415-416`); Base Sepolia, 84532, in staging; Anvil, 31337, in a world. Each environment names
its chain in `blueprint/environments/`; the `safe` thing never names one. This answers the open question in
`CX-crypto-accounting.md:484` (which network Capxul's Safes live on). In a world, Anvil has none of Safe's
contracts, so the world puts the pinned deployed bytecode at the canonical addresses with `anvil_setCode` before the
first journey step. That keeps the address a world works out identical to Base's, and S2's check proves it.

**`safe-transaction`: a transaction the owners are signing** (`Blueprint.id("stx")`), S3. Its fields are the exact
typed `SafeTx` (`to`, `value`, `data`, `operation` always `Call`, the gas fields zero, `nonce`), its chain and Safe,
and the signatures collected so far, each with its owner. Its machine: `proposed` → `signed` (the threshold reached) →
`submitted` → `executed` or `failed` (the Safe's `ExecutionSuccess` or `ExecutionFailure` for its hash). The SafeTx
must be signed exactly, with the chain, the Safe's address and its nonce in the domain, and the signatures packed in
owner-address order; the Safe refuses reversed order, a wrong recovery value and a replay (`ST3-budgets.md:167-175`,
`spikes/safe-hats-module/README.md:34-38`). Each owner signs by calling `sign`; the call that reaches the threshold also
submits. No workflow: workflows are parked (K44), and nothing here waits on one, so signature collection is a thing's
machine, not ST3.06's durable workflow.

**`org-budget`: an Org Budget** (`Blueprint.id("obg")`), S4. Fields: the company's `safe`, the member's own `safe` (a
personal Safe: the Roles member is the member's Safe, CX-bridge-rails `:171-173`), the role key, the token
(`equalAddress(policy.tokenAddress)`), the per-send limit and the total allowance with its refill period, in USDC base
units, and the recipients (`anyone` for a bank-payout budget, `:206-215`). The chain is the truth for the allowance's
balance; Capxul's row is what was granted and a read copy of what remains. Its machine: `granting` → `granted` →
`revoked`, each move an owner-signed `safe-transaction`.

**What is not a thing.** The Roles modifier and Capxul's Payments contract are someone else's contracts (the Roles
modifier) or Capxul's own deployed outside the framework (Payments), reached through adapters (section 3). The company
does not gain a `safe` field: a company may have several Safes (`K25-the-blueprint-on-chain.md:117`), so the `safe`
thing points at the company, and Bridge's R1 reads "the company's Safe" as its one Safe of kind `company`
(CX-bridge-rails `:402`); a second is refused until a company needs one.

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
| `ortho new adapter --from-abi` | provisional, #474 (`status.md:195`) | S2 |
| the `erc20` adapter, typed `transfer` and `Transfer` | provisional, checks a draft #497 (`status.md:201`) | S2 |
| events in: an adapter's chain events, handed on by the follower, taken by `on:` | building, no goal running it (`status.md:191`) | S2 |
| a world with Safe's contracts at their canonical addresses | not built (M6.16's part) | S2 |
| the `safe` adapter: owners, threshold, nonce, `execTransaction`, the SafeTx typed data, `GS0xx` reverts typed | spiked (ST3.04, `status.md:170`) | S1 (the address only), S3 |
| a Roles adapter and the Payments adapter | not on the board | S4 |
| the relayer, trusted | on `main`, marked experimental, four bugs in #784 (`status.md:164`; check 48 `:7-11`) | staging, not the journeys |

`goal/capxul` does not yet hold Goal 18's chain-basics merge (#1104, a74aa622): S2's builder merges `main` into
`goal/capxul` first.

## 3. The framework gaps Goal 16 claims, and what it builds on

**Goal 18 holds what its slice 9 built and runs in `e2e-on-chain` on `main`** (the conductor's answer to the lead, 26
November 2026): keys and wallets (`packages/wallets`), the chain adapter with its ABI codec, transactions and
contract client (`packages/chain-evm`), money, the follower and the relayer
(`packages/host-cloudflare/src/modules/{follower,relayer}`). Goal 16 builds on those and does not take them over. A
change any of them needs is a Snag issue naming Goal 18, and keeps `e2e-on-chain` green. Slice 9 itself only ran the
suite on `main` and marked the relayer experimental (#1104: `ci.yml`, the relayer's README and doc comment, the status
row, the canon page, the climb); it built none of the Safe, Hats, budget, `erc20` or events-in parts.

**Goal 16 claims three rows** (the conductor's answer), each in new files only:

| # | Row | What Goal 16 builds | Touches (new files) | Slice |
|---|---|---|---|---|
| G1 | `erc20-adapter` (ST2.02, #485, checks #497) | `@orthograph/erc20`: `transfer`, `balanceOf`, `Transfer`, its stand-in token deployed into a world | `packages/erc20/` (new package) | S2 |
| G2 | `events-in` (M5.03's chain part, #480) | `on:` for an adapter's confirmed chain events, once each by `${chainId}:${blockHash}:${logIndex}`, with corrections; the inbox side of the follower's `FollowerSink` (Ask #481) | new files in `packages/orthograph/src/modules/events/` and `packages/orthograph/src/modules/plugins/` | S2 |
| G3 | `safe-hats-budgets`, the Safe and budget parts (ST3.04, #484) | the `safe` adapter: the address prediction and `SafeDeployment` (S1); reads of owners, threshold and nonce, the SafeTx typed data, `execTransaction`, `GS0xx` as typed refusals through chain-evm's existing `Abi.refusal`, and the world starter that puts Safe's pinned bytecode at its canonical addresses (S2, S3); the Zodiac Roles 2.1.1 adapter and its module proxy factory (S4) | `packages/wallets/src/modules/safe/` and `packages/wallets/src/modules/roles/` (new modules); nothing existing in `packages/wallets` changes | S1 to S4 |

The Payments adapter is Capxul's own, in `examples/capxul/plugins/onchain-pay/` (section 5). Hats is not built: the
Org Budget is Zodiac Roles, so `ST3-budgets.md`'s recommendation is not taken for Capxul.

**Flags for the lead.**

- **`ortho new adapter --from-abi` (#474) has no owner.** The conductor's answer does not name it, and the board says
  Goal 18 ranks it (`status.md:195`). Goal 16's rule is to build the scaffolder before using it (`16-capxul.md:144-145`).
  Ask the conductor whether Goal 16 claims #474 (`packages/cli`, `packages/generators`, where Goal 16 already holds
  `adapters-from-spec`, `status.md:194`); until then G1 and G3 are written by hand and each file says so, to be
  regenerated when #474 lands.
- **The relayer's four bugs (#784) are Goal 18's.** Its slice 9 kept #784 open "for the app that first pulls it"
  (check 48 `:9-10`), and a fix must change check 48's author first (`:21-22`). Capxul's journeys do not need the
  relayer: in a world, a Safe's deploy and `execTransaction` are sent by a world key through `packages/wallets`'s
  existing submit, which the spike showed works from a non-owner (`spikes/safe-hats-module/README.md:49-52`). Staging
  does need it, so the lead logs a Snag naming Goal 18 for #784 before Capxul's staging run.
- **Signing the SafeTx.** The `safe` module builds the EIP-712 typed data; the existing signer signs it. If the signer
  cannot sign typed data today, that is a Snag naming Goal 18 (M6.15), not a change Goal 16 makes.
- **G2 meets parked Goal 17's work.** Adapter events carrying `id` and `actor` sit on `goal/superagent`, slice 11
  (`status.md:191`). Goal 17 is parked (AGENTS.md); take what landed there rather than rebuild it, and settle the paths
  through Goal 18. If the follower's sink needs a change, it is a Snag naming Goal 18.
- Capxul's checks for G1 to G3 go in each package's own tests and `e2e/capxul/`, not `e2e/on-chain/`, which is
  Goal 18's to run.

**Not built here.** `@orthograph/budgets` (ST3.05) and `examples/budgets`, which CX-bridge-rails already sets aside
(`:221-224,358-359`); ST3.06's durable signature workflow; a sponsored ERC-4337 path (a paymaster is in
`design/later.md`).

## 4. The slices

Each slice is one branch and ends green with its check. A ✍️ author who is not the builder writes its journeys and
checks first, red, and proves them fair (the `author` skill). Each slice that adds a thing or an operation changes
Capxul's `generated/`, so it lands as a G12 pair, `goal-16/<slice>-check` then `goal-16/<slice>-build`. The framework
gaps land in `main` with their own checks, and are merged into `goal/capxul` before the Capxul slice that uses them.

The lead's draft on #1158 had four slices. This cut adds one, **the chain door (S2)**, before the Safe goes on chain:
getting paid to a Safe needs no deploy (`M7-capxul.md:169-178`), and Bridge's deposits need the same door
(CX-bridge-rails `:403,410`), so seeing money arrive comes before spending it.

| Slice | What it builds | Done when | `generated/` |
|---|---|---|---|
| **S1 · The Safes recorded** | the `onchain-pay` piece and its `safe` thing; `safe.record` for a person (their key the one owner) and a company (owners, threshold); the address worked out by G3's prediction, no chain; acted on from the CLI, MCP and an agent. It unblocks Bridge R1, the company's Safe address as a fact (CX-bridge-rails `:402`) | in `prove`: a person's recorded Safe has the address of a pinned vector (owners, threshold, salt, 1.5.0 deployment); recording the same id twice gives one Safe; a company's 2-of-3 is recorded; a threshold above its owners is `ThresholdOutOfRange`, a repeated owner `OwnersNotUnique`; changing a counterfactual Safe's owners is `SafeNotDeployed`; a stranger cannot record a Safe for another person or company; an agent records one through MCP | yes, a pair |
| **S2 · The chain door** | G1, G2 and G3's world starter in `main`; then in Capxul, an `on:` for the `erc20` `Transfer` to a recorded Safe, kept as a received payment on the Safe | on Anvil: USDC sent to a counterfactual Safe's address is recorded once on that Safe, typed; a second delivery of the same event changes nothing; an `anvil_reorg` that drops it gives a correction and the payment is undone; the world's predicted address equals the one the factory deploys at (`createProxyWithNonce` on Anvil) | yes, a pair |
| **S3 · The Safe on chain** | G3's reads, SafeTx and typed refusals in `main`; then in Capxul, `safe-transaction` (`propose`, `sign`), deploy on first spend (the submitting key sends `createProxyWithNonce` when the Safe has no code, then `execTransaction`), the Safe moving to `deployed`, owner changes on chain after deploy | on Anvil: a person's counterfactual Safe holding USDC pays a supplier on its owner's one signature, is deployed in the same step, and reads `deployed`; a company's 2-of-3 pays after the second signature and not after the first; a signature from a non-owner is `NotAnOwner` before anything is sent; a replayed SafeTx is refused by the Safe as `GS026`, typed | yes, a pair |
| **S4 · The Org Budget** | G3's Roles adapter in `main`; Capxul's Payments contract deployed outside the framework (K44 call 8) from the implementation's pinned build **(conductor: confirm** its source in `infrastructure:packages/protocol`); `org-budget.grant` (an owner-signed SafeTx that deploys the Roles modifier, enables it, assigns the member's Safe, scopes V3 `send` and sets the allowance, CX-bridge-rails `:180-186`); `payment.send` under the role from the member's own Safe; `PayoutOverBudget { remaining }` at prepare; an owner's direct send | on Anvil: a member's Safe sends within the budget and the allowance falls by exactly that; a send over it is refused `PayoutOverBudget` with the right `remaining` before any transaction; a spent budget gives `remaining: 0`; an owner's direct send needs no budget; a revoked budget refuses; the role cannot send a token it was not scoped to | yes, a pair |
| **S5 · Getting paid by a link** | after slice 7's sales invoices (which wait on gaps #1079 and #1132, being built now) and the pages it needs: a pay link on an invoice, paid from any wallet to the person's or company's Safe, settled only by S2's `Transfer`, its ledger lines posted | `M7-capxul.md`'s journeys (section 4): paid by its link and settled; a second transfer for a settled invoice changes nothing; no call marks an invoice paid; a stranger reads an invoice by its link and nothing else; the ledger balances after each payment | yes, a pair |

**Order and what waits.** S1 now. S2 after S1, G1, G2 and G3's world starter. S3 after S2 and G3's Safe reads (and any
Snag on Goal 18's signer). S4 after S3. S5 after S2 and slice 7's invoices, which wait on #1079 and #1132; it does not wait on S3 or S4. Bridge's R1 waits on S1, R2 on S2, R3 on
S4 (CX-bridge-rails `:410-411`).

## 5. Where the new things go

A new feature folder, **`examples/capxul/plugins/onchain-pay/`**, the piece CX-composable-pieces already names "so
nothing else takes its records" (`CX-composable-pieces.md:154-155`): its `blueprint/things/{safe,safe-transaction,org-budget}/`,
the Payments adapter and its pinned ABI, and the `SafeDeployment` value. Its journeys go in `examples/capxul/journeys/`
beside the others, named `safe-…` as Bridge's are `bridge-…`. Capxul's CI job (`tools/ci/capxul-paths.sh`) already runs
`prove` over `examples/capxul`, so they run as soon as they exist. Nothing existing moves into `plugins/` (CX-features
owns that); the lead checks the new folder with the conductor before S1's author starts. A rule that lives on chain
changing by a migration with money in it has no word in the blueprint yet (`CX-composable-pieces.md:520-521`); S4 meets
it first, and a Snag is logged then if it bites.

## For Aaron

1. **Who pays the gas on Base?** I recommend Capxul's relayer pays for deploys and Safe transactions, a cost of Capxul's,
   small on Base, with a sponsored ERC-4337 path later. The other choice is each company funding its own relayer key,
   which needs ETH in every Safe before it can spend. Proceeding on Capxul paying.
2. **Who owns a company's Safe: the directors' keys, or their personal Safes?** I recommend their keys: one signature per
   owner, no nested Safe signatures, and the member of an Org Budget is still the person's own Safe, as CX-bridge-rails
   says. Owned by personal Safes, each owner signs through ERC-1271, which works (the spike proved it) but makes every
   company payment two signing steps. Proceeding on the keys.
3. **Staging on Base Sepolia, with test USDC?** I recommend yes, so staging never holds real money, and Base mainnet is
   ADR-0025's release gate as the implementation already says. Proceeding on Base Sepolia.

## Supersedes

Nothing: no decided words change. `ST3-budgets.md` is not decided (`ST3-budgets.md:3-7`); its Hats recommendation is
not taken for Capxul, and a note beside its title says so.
