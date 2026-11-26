# @orthograph/erc20

An ERC-20's calls, its `Transfer` and `Approval` events and OpenZeppelin 5's ERC-6093 reverts, typed, with a test token for
worlds (#1162; `design/decisions/CX-safe.md` unit A2). Built on `@orthograph/chain-evm`: its ABI codec, its chain port and its
event sources. It is written to the shape `ortho new adapter --from-abi` makes (`packages/generators/src/modules/abi/README.md`,
#1164), so A1 regenerates it with no change to its tests.

| Path | How | What |
|---|---|---|
| `abi/ERC20.json` | generated | OpenZeppelin 5's `ERC20` ABI with the test token's `constructor(uint256 supply)`; the build adds the test token's creation code as `"bytecode"` |
| `src/generated/ERC20.ts` | generated | `ERC20.at({ port, address, from? })`: one call per function (a read answers its type; a write prepares, simulates, signs and sends, answering the `Submission`); `ERC20.events.Transfer(address, fromBlock)`; an error class per ERC-6093 error; `ERC20.deploy(port, signer, { supply })`, the stand-in |
| `src/generated/index.ts` | generated | `export * as ERC20`, `calls`, `standIn` |
| `src/index.ts` | scaffold | the adapter's descriptor |
| `test/` | the checks | `erc20.test.ts` needs no chain; `anvil.test.ts` runs a real Anvil |

The stand-in is the test token: an ERC-20 with 6 decimals, like USDC, whose whole supply goes to the account that deploys it,
which hands it on with `transfer`. Its balances are base units: 1 USDC is `1_000_000n`.

A revert whose selector is one of the six ERC-6093 errors fails as that error's class with its fields, whether or not the
port's refusals.lock holds it, and nothing is sent. Any other revert stays chain-evm's `ChainError`.

Status: the calls, the event sources and `deploy` are empty handlers until the build of #1162, and `bytecode` is `0x`. The red
checks are listed in `expected-failing/` (G11). `anvil.test.ts` is skipped unless `ORTHO_CHAIN_EVM_ANVIL=1`, as chain-evm's
Anvil tests are; CI sets it.

The checks take the typed surface and the revert cases from parked Goal 12's draft checks (#497, `goal-12/st2-02-check`).
