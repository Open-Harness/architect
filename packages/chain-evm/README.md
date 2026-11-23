# EVM chain port

`makeChainPort` creates an Effect adapter for one RPC chain ID. It uses Orthograph's
`Timers` for polling and backoff. The wallet supplies a host signer. Simulation is built in (M1.32): a plain `eth_call`. The EVM projection of `blueprint/refusals.lock` supplies error
signatures and historical aliases. See K7 for the chain model.

The nonce allocator, transaction manager and tracker, viem error mapping, and
event follower are adapted from `@prb/effect-evm@5.0.3`. The npm tarball's source
maps contain the upstream TypeScript. The upstream notice is
[LICENSE-prb-effect-evm](LICENSE-prb-effect-evm). viem is a direct dependency and
is confined to this package in workspace lint.

`simulate` runs the prepared transaction as an `eth_call` and returns a revert as its typed refusal. `sign` and
`submit` refuse a transaction that has not passed it (`ChainFault` kind `unsimulated`), so no path sends without
simulating. After a failed simulation, `release` the transaction.

`Anvil.start` (`modules/anvil`) is the world's chain. Run the local proof with Foundry's Anvil on PATH.

```sh
ORTHO_CHAIN_EVM_ANVIL=1 pnpm exec vitest run --root packages/chain-evm src/modules/tx/anvil.test.ts
```

The test starts a silent Anvil on a free loopback port and stops it on scope exit.

`@orthograph/chain-evm/device` is the same package without `Anvil` (no `node:` import, so a browser's or a Worker's closure can hold it): the port, faults, events and `Keys` (`modules/keys`: generate a secret, make a `Key` that signs EIP-191 messages and transactions, keccak-256, addresses). The wallet imports nothing else of viem: the lint rule keeps viem in this package.
