# K25: the blueprint on chain

Decided 20 November 2026 by Aaron, from the 📐 on-chain designer's grill on the first step of the on-chain lifecycle,
what a blueprint author writes for a thing that lives on chain. Question 1 option A ("agreed"), question 3 option A
("agreed"). For question 2, the "roles on chain" follow-up, he took option A ("A, OZ interface"). It came after his own
reframe: "why can't we adopt a standard like OZ roles … this should work cross chains or does it matter? the authority
is the chain". Grounded at `origin/goal/stage-1` `eaf7a10e`. The options, drawn as code, are on the session's whiteboard
(https://claude.ai/artifact/Awa6ahjAfYiLQXsUyXY9Ht, section "Step 1, the blueprint").

Item 7 came later the same day, from step 2. Asked what `per: Organization` would deploy, Aaron asked back: "what
does an organization deploy to? I don't think you can deploy an organization ... if you can then it should just be like
a smart account". Then: "I think that the safe is a different thing altogether". Shown two separate things, linked by
a field, he said "No, that's correct."

This record amends K7 Q4 (the inline `lives` spelling) and K7's decided item 2 (how roles are generated). Everything
else in K7 stands.

## The problem, in code

K7 put the contract inline, its names written as strings:

```ts
// design/decisions/K7-chain-languages.md:284
lives: Blueprint.chain.evm({ contract: "Governance", per: "workshop" })
```

Meanwhile, stores became files, each named by its path, and their kind was left open:

```ts
// packages/orthograph/src/modules/stores/types.ts:19
readonly kind: <const K extends string>(of: K) => Store<K>;
```

`AGENTS.md:66` says that a declared name is never written as a string. A caller is a person id:

```ts
// packages/orthograph/src/modules/roles/types.ts:6-8
export type Principal =
  | { readonly kind: "anonymous" }
  | { readonly kind: "person"; readonly person: string; readonly email?: string };
```

A contract, though, only sees an address. A value also carries only what TypeScript needs
(`packages/orthograph/src/modules/values/types.ts:21-25`), so nothing says what it becomes in Solidity, and nothing
stops a secret field from being generated into public storage. Ledger `STO-19` records that the inline shape was
written three different ways.

## Decided

1. **A chain store is a file, and a thing lives in it.** The contract's name comes from the file's path. Several
   things may share one store, and so one contract, which is how a `holds` role (K20) can read another thing's rows
   on chain. The environment binds the store to a network, the same way it binds a database store.

   ```ts
   // blueprint/stores/budgets.ts: the contract is "Budgets"
   export default Blueprint.store.chain.evm();

   // blueprint/things/allowance/thing.ts
   import budgets from "../../stores/budgets.ts";
   export const Allowance = Blueprint.thing({ /* … */ lives: budgets });

   // blueprint/environments/staging.ts
   stores: { budgets: Chain.evm.network("base-sepolia") },
   ```

   `.solana(...)` and `.aztec(...)` follow when those languages are built (K7 F3). There is no inline form, and no
   `per`: item 7 says why.

2. **A person on chain is an account.** A field that holds whoever acts on chain is `Blueprint.account()`, a CAIP-10
   account (`eip155:8453:0x…`), as the wallets plugin already writes them. Person ids never go on chain. The server
   finds a person's accounts through wallet linking (M2.13). A Safe or an ERC-7702 account is just an account.

3. **The chain is the authority.** For a thing that lives on chain, the contract alone decides who may act. The server
   and the SDK only check ahead of time by simulating (K7 Q5 item 3), and read roles back through the follower.

4. **Roles show up through OpenZeppelin's interface, and stay ours.** A declared role (`who` or `holds`, K20) is
   compiled behind `IAccessControl` (`@openzeppelin/contracts` 5.x, `access/IAccessControl.sol`):

   ```solidity
   // one role id per instance: "a director of this company"
   bytes32 role = keccak256(abi.encode("director", company));
   function hasRole(bytes32 role, address account) external view returns (bool);   // answers every declared role
   // when a holding row moves into the role's states
   emit RoleGranted(role, person, msg.sender);
   // grantRole and revokeRole revert NotAllowed unless the blueprint declares who grants the role
   ```

   This replaces K7's "OpenZeppelin-style `onlyRole`, generated rather than imported". The modifier stays, but the
   standard interface and events are added, so wallets, Safe apps and explorers can read who holds what. A `rule`
   role still can't go on chain (K20). Each chain renders the same blueprint role in its own idiom:
   - Solana: one account per holding, at seeds `["<role>", <instance>, <person>]`, with `emit_cpi!` events.
   - Aztec: one private note per holding, checked on the caller's device, with no public `hasRole`, which would undo
     the privacy.

   None of these is built here.

5. **A value's Solidity type is worked out from the value.** On an EVM chain store:

   | Value | Solidity |
   |---|---|
   | `uint(bits)` | `uint<bits>` (bits a multiple of 8, at most 256) |
   | `id(prefix)` | `bytes32`, the id's own text padded, so it round-trips. It must fit: the compiler refuses an id on a chain store whose prefix leaves no room for a minted suffix within 32 bytes, and a longer value is refused before sending. Moving existing longer ids on chain is a migration |
   | `text({ max })` | `string` |
   | `account()` | `address`, its chain part checked against the store's chain |
   | `email()`, `visibility.secret(...)`, `visibility.private(...)` | refused: "a public chain shows every field" |
   | `schema(...)` | refused unless it declares its Solidity type |

   Money is not in this table. It gets its own round with Aaron (the open pull request #203, ledger `THI-07`, not yet merged).

6. **An operation on a thing that lives on chain runs on chain.** Its `runs` is worked out, and an author never writes
   `runs: "chain"`. This is the building agent's call, offered to Aaron in the round and not objected to.

7. **An organisation is not on chain; an account is.**
   - The organisation is a business thing, and it stays off chain.
   - A Safe is a wallet: someone else's contract, so a thing living in a source behind the `safe` adapter (K7's rule,
     K9 stage 3).
   - A company may have no Safe, one or several. A Safe may have no company.
   - Our contract is one deployment per network, a module that any account switches on. Its rows are keyed by the
     account they act for, and it never holds the account's money: it spends from the account through the account
     adapter (on a Safe, `execTransactionFromModule`; ERC-7579 accounts later, as another adapter).
   - An organisation that wants a Safe points at it with an ordinary field.

   ```ts
   // the safe adapter: someone else's contract
   export const Safe = Blueprint.thing({ fields: { account: Blueprint.account(), /* owners, threshold */ }, lives: safe });

   // ours: rows keyed by the Safe they spend from
   export const Allowance = Blueprint.thing({
     fields: { id: Blueprint.id("alw"), safe: Safe.fields.account, member: Blueprint.account(), limit: Amount, spent: Amount },
     lives: budgets,
   });

   // the organisation, off chain, may point at its Safe
   fields: { id: Blueprint.id("org"), name: Blueprint.text(), safe: Safe.fields.account },
   ```

## Not chosen, and why

- **The inline form** (K7's spelling): it writes names as strings and repeats them on every thing.
- **A contract per organisation (a clone), or the organisation as its own account**: an organisation is not something
  deployed, and a contract that is the organisation would hold its whole treasury in generated code.
- **One contract holding every organisation's money, keyed by id**: all the money in one place, and custody becomes ours.
- **Safe built into the core**: Safe is the first account adapter, not the only kind of account.
- **One contract per thing**: a `holds` role whose rows sit in another contract can't be checked.
- **Person ids plus a registry the server writes**: the contract would trust the server again, which is what living
  on chain is meant to avoid.
- **Swapping in the linked wallet**: a second or new wallet would strand what the old address held.
- **OpenZeppelin `AccessControl` imported as it is, or `AccessManager`**: both have one role list for the whole
  contract, with no "director of this company", and grants become a second truth beside the holding rows.
  `AccessManager`'s delayed grants are worth another look with time (K23), not here.
- **Solidity types written by hand on each value, or a thing stored as bytes**: the first drifts, and the second
  leaves the contract unable to check a limit or a role.

## What it touches

| Dependent | Change |
|---|---|
| `orthograph`: stores, things, values, roles | `Blueprint.store.chain.evm`, `Blueprint.account()`, and a Solidity type on `ValueMeta` (M6.10). Nothing is built here. Goal 3 owns `packages/orthograph` until it lands |
| compiler `environments.ts:30` | binds a chain store as well as a database store (M6.10, M6.17) |
| `language-solidity` (M6.11) | renders roles behind `IAccessControl` |
| The allowance and private-membership examples, `frame/projections.md` | rewritten to the store form in this change; the allowance's store is `budgets`, so its scaffold is `src/Budgets.sol` |
| Stage 3 (K9) and S27, "one vault per organisation" | one budgets module per network that each organisation's Safe enables; the worlds of M6.16 deploy a Safe and enable it |
| K20 | a dated record: notes beside its Solidity sketch and its same-chain rule point here, for `hasRole`, the events and "the same chain store" |

## Ledger

- `STO-19` (three spellings of `Blueprint.chain`): decided here. Built in M6.10.
- `THI-01` (a value's Solidity type): decided here. Built in M6.10.
- `X-19` (the same three shapes, as a contradiction): settled here.
- `THI-05` and S27 (one vault per organisation): settled by item 7, one module per network that each Safe enables.
- `STO-18` (the private-membership example's chain wording): rewritten here to a chain store; the Aztec kind itself
  is still later.

## Supersedes

- design/decisions/K7-chain-languages.md (Q4): "`lives: Blueprint.chain.evm({ contract: "Governance", per: "workshop" })`, and likewise `.solana(...)` and `.aztec(...)`. `Blueprint.chain({...})` alone means `evm`" → "`lives: governance`, a chain store declared in `blueprint/stores/governance.ts` as `Blueprint.store.chain.evm()` (K25)"
- design/decisions/K7-chain-languages.md (decided item 2): "OpenZeppelin-style `onlyRole`, generated rather than imported" → "generated behind OpenZeppelin's `IAccessControl`, one role id per instance (K25)"
- design/decisions/K7-chain-languages.md (milestone slices it changed, M6.10): "Also lands `Blueprint.chain.evm(...)`" → "chain store files (K25)"
- design/decisions/K20-roles-across-things.md (the rules, item 1): "`Blueprint.chain.evm(...)` is Solidity" → "a chain store, `Blueprint.store.chain.evm`, is Solidity (K25)"
- design/decisions/K20-roles-across-things.md (the rules, item 6): "it lives on the same chain" → "it lives in the same chain store (K25)"
- design/decisions/K3-stores-and-sources.md (decided item 1): "`lives: Blueprint.chain({ … })` from L4.01" → "a chain store file, `Blueprint.store.chain.evm()` (K25)"
- design/decisions/K5-the-whole-shape.md: "`lives: Blueprint.chain({ contract: "Governance", per: "workshop" })`" → "`lives: governance` (K25)"
- design/decisions.md: "switched on by `lives: Blueprint.chain({ contract, key, per })`" → "switched on by a thing living in a chain store (K25)"
- design/build-plan.md (L4.01): "`lives: Blueprint.chain({ contract, per })`" → "a chain store file (K25)"
- design/milestones.md (M6.10): "`lives: Blueprint.chain.evm(...)`" → "chain stores (`Blueprint.store.chain.evm()`, K25), `Blueprint.account()`"
- design/milestones.md (M6.11): "roles generated in (OpenZeppelin-style `onlyRole`, generated, not imported)" → "roles generated in behind OpenZeppelin's `IAccessControl` (K25)"
- design/frame/examples/allowance-on-chain.md: "`lives: Blueprint.chain({ contract: "AllowanceVault", per: "organization" })`" → "`lives: budgets`, with `blueprint/stores/budgets.ts`"; "`member: Person.fields.id`" → "`member: Blueprint.account()`"; "adds `Blueprint.chain({ contract, per })`" → "adds chain stores (K25)"
- design/frame/examples/private-membership.md: "`lives: Blueprint.chain({ contract: "RolePool", per: "organization", network: Aztec })`" → "`lives: rolePool`, with `Blueprint.store.chain.aztec()`"
- design/milestones.md (M6.16): "Worlds with a chain: a vault per organisation" → "Worlds with a chain: a Safe per organisation with the budgets module enabled (K25)"
- design/milestones.md (M6, ships): "one vault per organisation (S27)" → "one budgets module per network, enabled by each organisation's Safe (S27, K25)"
- design/milestones.md (M6.01): "`signedBy` as EIP-712, one vault per organisation)" → "`signedBy` as EIP-712; one budgets module per network, enabled by each organisation's Safe, is settled by K25)"
- design/build-plan.md (D5): "(3) One vault per organisation from a factory, deployed by the starting world." → "(3) One budgets module per network, which each organisation's Safe enables, deployed by the starting world (K25)."
- design/build-plan.md (L4.07): "The starting world deploys a vault per organisation and funds it with TestUSD" → "The starting world deploys a Safe per organisation, enables the budgets module (K25) and funds the Safe with TestUSD"
- design/goals/01-the-whole-framework-locally.md: "worlds with a vault per organisation on Anvil" → "worlds with a Safe per organisation, enabling the budgets module (K25), on Anvil"
- design/milestones.md (M6.10): "the compiler accepts `runs: "chain"`" → "the compiler works out `runs` for an operation on a thing in a chain store, and an author never writes it (K25 item 6; L4.01;"
- design/frame/projections.md (3.9): "every thing that `lives: Blueprint.chain(...)`" → "every thing that lives in a chain store"
