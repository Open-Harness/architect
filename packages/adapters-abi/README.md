# @orthograph/adapters-abi

Adapters made from a contract's ABI (K7 Q2; `design/decisions/ST2-abi-adapters.md`). It holds the generator (ABI JSON in, the files
of an adapter package out) and the runtime the generated files import. The first adapter is `@orthograph/erc20`.

| Module | What it does |
|---|---|
| `generate` | `AbiAdapters.parse`, `AbiAdapters.plan`: the files, their headers, `AbiRefused` |
| `contract` | `ContractChain`, `Contract.read`, `Contract.write`, `Contract.refusals` |
| `events` | `AbiEvents.source`: a typed event source |
| `stand-in` | `StandInContract.deploy`: the contract's bytecode into a world's chain |
| `conformance` | `Conformance.run`: the ABI against the deployed code |

`@orthograph/adapters-abi/testing` (`src/testing.ts`) starts an Anvil world with funded keys for tests. The Anvil checks run with
`ORTHO_CHAIN_EVM_ANVIL=1` (CI sets it); without it they are skipped.

`test/fixtures/Broken.sol` is a token that disagrees with the ERC-20 ABI in four planted ways; `broken.json` is its compiled bytecode
(solc 0.8.30, `forge build` with the same settings as `packages/erc20/foundry.toml`).
