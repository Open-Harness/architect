# Example: an allowance that lives on chain

Part of the frame's worked examples ([`../README.md`](../README.md)). Proposed, 17 November 2026; it follows layer 4 of
the build plan (L4.01 to L4.09) and the chain pieces of layer 3 (L3.04 to L3.08).

**Built as the budgets feature** of the growing example's stage 3 (K9, ST3.05): a Safe module, the allowance per hat.

**Languages: Effect and Solidity.** "Language" is the axis that was called "target" before: the language the code
comes out in (Effect, Solidity, Noir, Python), packaged as `@orthograph/language-effect`, `@orthograph/language-solidity`.
It is not a host (where the code runs: here `Host.worker` and `Host.chain`) and not a projection (what is shipped:
here the server, the SDK and the contracts).

## The idea

acme's allowance today lives in the database: the server holds the money's record, and you trust the server. Moved on
chain, each organisation's money sits in its own Safe, and the allowance lives in our budgets module, one contract per
network that any Safe switches on (K25). A member spends by signing; the module checks the allowance and pays from the
Safe. The server relays the signed call, and its relayer key can only submit payloads someone already signed. Where a member's own key lives is declared
per wallet (K7 F5). The rules (the limit, the states, who may do what) are the
same rules, enforced by the contract.

The point of this example: **the same machine** produces both the TypeScript and the Solidity, and the two are tested
against each other, so the chain and the server cannot disagree about what a move does.

## The description

One line changes in the thing. Everything else, the machine, the roles, the errors, is today's acme
(`examples/acme/blueprint/things/allowance/machine.ts:5-13` on `origin/layer/3`).

```ts
// blueprint/stores/budgets.ts: a chain store, the contract "Budgets", named by its path (K25)
export default Blueprint.store.chain.evm();

// blueprint/things/allowance/thing.ts
import budgets from "../../stores/budgets.ts";
import { Safe } from "@orthograph/safe";   // sketch: the safe adapter (K9 stage 3); its package is set when it is built
export const Allowance = Blueprint.thing({
  description: "Money a member may spend from their organisation's Safe, up to a limit each month.",
  fields: { id: Blueprint.id("alw"), safe: Safe.fields.account, member: Blueprint.account(), limit: Amount, spent: Amount },
  lives: budgets,   // was: the database
});
```

The member is an account, not a person id: on chain, the signer is compared with it, and person ids never go on chain.
The allowance names the Safe it spends from, not the organisation: the organisation stays off chain and may point at
its Safe with an ordinary field (K25).

```ts
// blueprint/values/money.ts: a value says what it is in every language
export const Amount = Blueprint.value(Blueprint.uint(128));   // bigint in Effect, uint128 in Solidity
```

`ortho impact` sees what the change means before anything is built:

```text
$ ortho impact
allowance lives: database → chain              major, next 2.0.0
  payload of allowance.spend gains a signature   (signed by the caller's wallet)
  stale: allowance.grant, .spend, .revoke, .get in every environment
  mounts added: language solidity and host chain (automatic, needed by the chain store)
```

The Solidity language and `Host.chain` mount themselves (K27), because a thing on chain can't exist without them ([`../projections.md`](../projections.md)
section 3.9). The chain adapter mounts too; its stand-in is Anvil.

```ts
// blueprint/adapters/chain.ts: written by `ortho add`, the mount is called `chain`
export default Blueprint.use(evm, (c) => [c.choose(c.choices.relayer.ownKey)]);
// blueprint/environments/staging.ts: the setting each environment gives
settings: [chain.settings.network.is("base-sepolia")],
```

## Journeys

The same journeys as today, now signed. In prose:

1. Ada grants olga 500. The budgets module holds the allowance, and olga's wallet can see it.
2. Olga spends 120, signing with her own wallet. The relayer submits it. The spend appears through the chain follower.
3. Bob signs a spend of olga's allowance with his wallet. It is refused before anything is sent.
4. Ada revokes. Olga's next signed spend is refused by the contract with the machine's own refusal.
5. Olga's signed spend is submitted twice. It lands once.

Executable: today's `revoke-then-spend.ts` stays almost word for word. What changes is the cast. A cast member now
holds a wallet (from the wallets feature, [`../writing-a-feature.md`](../writing-a-feature.md)), and the evidence
carries the receipt:

```ts
s.step("olga can't spend", s.olga.run(spend, { allowance: s.world.allowance, amount: 1n, memo: "coffee" }),
  refuses(machine.notFrom, { state: "revoked" }),        // the same refusal code, [AL-…], from Solidity as from Effect
  noEvents(), receipts({ reverted: 0, sent: 0 })),        // refused before sending: simulated first (L3.07)
```

A refusal is checked **before** sending, by simulating the call. A spend that would revert costs nothing and leaves no
transaction.

## Blanks and handlers

The Solidity language writes `src/Budgets.sol` once, with blanks, beside the generated machine
(`generated/solidity/AllowanceMachine.sol`, whose `_step` is the compiled machine). The blank is the same blank as the
Effect handler's: the limit check.

```solidity
// src/Budgets.sol: scaffolded once, yours from then on
function _spend(Allowance storage a, uint128 amount) internal override {
  if (a.spent + amount > a.limit) revert AllowanceExceeded(a.limit - a.spent);   // its stable refusal code, the same in both languages
  a.spent += amount;
}
```

The hook decides; it moves no money. The generated base pays after it, from the allowance's Safe, through the account
adapter (on a Safe, `execTransactionFromModule`), because the module never holds the money (K25 item 7).

The Effect handler shrinks: it no longer decides anything. The SDK fetches the EIP-712 typed data to sign, the caller's
signer signs it, and the relayer submits it (L4.06). The server checks the signature and passes it on.

## The relayer and the chain follower: two actors

| Actor | One per | What it does | Build plan |
|---|---|---|---|
| relayer | relayer key | hands out nonces in order, replaces stuck transactions, writes receipts through | L3.06 |
| chain follower | contract | follows the budgets module's logs with a checkpoint, handles reorgs, emits corrections | L3.08 |

Both are Durable Objects inside the environment's one Worker, so each is a single writer with its own storage. The
relayer's key can only submit payloads someone already signed. M6.18 checks that no key is ever in plain text in a
binding, a commit or a log, and that each wallet declares where its key lives (K7 F5).

Reads come back through the follower: `allowance.get` reads the follower's view, not the chain, so a read is fast and a
reorg is corrected rather than silently wrong.

## Conformance: the two machines against each other

The proof that Solidity and Effect agree is a fuzz test the Solidity language generates:

1. Generate random sequences of moves (grant, spend with random amounts, revoke) from random signers.
2. Run each sequence through the Effect machine and through the contract on Anvil.
3. After every move, both must agree: the same state, the same refusal code, the same `spent`.

Foundry tests are generated beside it: every move from every state, every write signed by the wrong signer, every
signature replayed (projections section 3.9). A disagreement is a failed check before any journey runs.

## Where data lives

| Data | Lives | Why |
|---|---|---|
| the money | in the organisation's Safe | the organisation's own account |
| the allowance | in the budgets module, keyed by the Safe | the point of the example |
| the follower's view | the follower actor's storage | fast reads, corrected on reorg |
| nonces, pending transactions | the relayer actor | one writer per key |
| the organisation's index | the organisation actor, built from events | unchanged |

## Worlds and deployment

- **In a world**, the chain is Anvil, `Stand.process(anvil)`, run as a child process locally and in a Cloudflare
  Container owned by the world in CI (L3.05), with block timestamp interval 0 so time moves only when the world moves
  it. The starting world `funded` deploys a Safe for the organisation from Safe's release, enables the budgets module and funds the Safe with a test token (L4.07).
- **In an environment**, contracts are deployed and verified once per environment and **redeployed only when the
  bytecode hash changes** (L4.08). Promoting twice with the same bytecode deploys nothing the second time.
- A new budgets module holds no money, but its allowances must move with it, so its redeploy is a migration. `promote` names it and refuses until the migration is declared.

## Projections and what gets generated

- **the Solidity language** (K27, not a projection): the machine, typed data, Foundry tests, the fuzz conformance
  test, the scaffold.
- **server**: the operations, now verifying signatures and calling the relayer.
- **sdk, cli**: a `--wallet` on every signed operation (`acme allowance spend --wallet olga`).
- **mcp**: signed operations are out. An agent holds no wallet of ours.

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed (layer 4) |
|---|---|---|
| Where it lives | `Lives = "database" \| "actor"` (`packages/orthograph/src/modules/things/types.ts:32`) | adds chain stores, `Blueprint.store.chain.evm()` (K25) |
| Solidity | a shell: "Arrives in layer 4" (`packages/language-solidity/README.md`) | `@orthograph/language-solidity` on `Host.chain` |
| Relayer, follower | not built (L3.06, L3.08 on layer 3) | two actors |
| Conformance between languages | none | generated fuzz, Effect machine against contract |

## Questions this raised

1. **Where does a chain call's waiting state live?** The build plan names "an in-between state for chain calls" (L4.06).
   (a) A generated in-between state on the machine (`spending`), visible to journeys. (b) Hidden in the relayer; the
   thing moves only when the receipt lands. *Recommend (a)*: honest to callers, and the follower settles it.
2. **How much of the fuzz runs on every check?** (a) A small fixed seed set in `check`, the long run in CI.
   (b) The long run always. *Recommend (a)*, with the CI seed recorded in the verdict.
3. **One vault per organisation, or one vault for all?** Settled by K25: neither. The money stays in each
   organisation's Safe, and one budgets module per network, which each Safe enables, keeps the allowances.
