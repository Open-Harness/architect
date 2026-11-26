# erc20

`Erc20.at(port, address)`: one ERC-20 contract, reached through a chain port (`@orthograph/chain-evm`). Its calls are typed:
`balanceOf({ account })` answers a bigint in base units, `decimals()` a number read from the contract, and
`transfer({ to, value }, signer)` prepares, simulates, signs and sends, answering the `Submission`. `Transfer(fromBlock)` is
the contract's `Transfer` event as an `EventSource<TransferEvent>`, for `ChainPort.follow` and `track`.

A revert the simulation finds fails typed when it is one of OpenZeppelin 5's ERC-6093 errors the adapter knows
(`ERC20InsufficientBalance`, `ERC20InvalidReceiver`), whether or not the port's refusals.lock holds it, and nothing is sent.
Any other revert stays the port's `ChainError`. The adapter reads any ERC-20, not only the test token.

Status: the handlers are empty (`Effect.die`); `erc20.test.ts` and `anvil.test.ts` are the checks, listed in
`../../../expected-failing/` until the build lands (#1162).
