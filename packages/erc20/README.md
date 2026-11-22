# @orthograph/erc20

The first adapter made from an ABI (`design/decisions/ST2-abi-adapters.md`): the ERC-20 standard's functions and events, and
OpenZeppelin 5's ERC-6093 errors, as typed calls, typed events and declared errors.

| Path | What |
|---|---|
| `adapter.ts` | the root export: the descriptor, a `Blueprint.adapter` with a call per function, an event per event, `standIn: Stand.process(...)`. Scaffolded; yours now |
| `abi.json` | the contract (OpenZeppelin `ERC20` 5.6.1: nine functions, two events, six errors) |
| `generated/` | what `AbiAdapters.plan` writes from `abi.json`: `types.ts`, `calls.ts`, `events.ts`, `errors.ts`, `stand-in.ts`. Never edited; `test/generated.test.ts` fails when it is stale |
| `stand-in/` | the token the world deploys: `Token.sol`, and `bytecode.json` (compiled, with the compiler named) |

A call needs one service, `ContractChain` (its `ChainPort`, the token's address and, for a write, a `Signer`), which the host or the
wallet provides. `transfer({ to, value })` simulates and, only if it passes, signs and submits; a revert by one of the six errors fails as that
class with its fields (`ERC20InsufficientBalance { sender, balance, needed }`), and a revert by anything else stays a `ChainFault`.

Regenerate after changing `abi.json` (until `ortho new adapter --from-abi` writes these itself): plan the files and write the ones under `generated/`.
The stand-in's bytecode is rebuilt as `stand-in/README.md` says.

The Anvil checks run with `ORTHO_CHAIN_EVM_ANVIL=1`; without it they are skipped.
