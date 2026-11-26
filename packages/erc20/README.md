# @orthograph/erc20

An ERC-20's `transfer`, `balanceOf` and `Transfer` event, typed, and a test token for worlds (#1162; `design/decisions/CX-safe.md`
unit A2). Built on `@orthograph/chain-evm`: its ABI codec, its chain port and its event sources. Hand-written to the shape
`ortho new adapter --from-abi` (#1164) will generate, and regenerated with no change to its tests when that lands.

| Module | What |
|---|---|
| `src/modules/erc20` | `Erc20.at(port, address)`: typed `balanceOf`, `decimals`, `transfer`, the `Transfer` event, ERC-6093 reverts typed |
| `src/modules/test-token` | `TestToken.deploy`: the 6-decimal test token in a world's Anvil |

Tests: `erc20.test.ts` needs no chain. `anvil.test.ts` and `test-token.test.ts` run a real Anvil, so they are skipped unless
`ORTHO_CHAIN_EVM_ANVIL=1`, as chain-evm's are; CI sets it.

The checks take what helped from parked Goal 12's draft checks (#497, `goal-12/st2-02-check`): the typed surface and the
revert cases.
