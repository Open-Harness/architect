# account

`Account`: the wallet's values are CAIP-10 accounts (K7, "The wallet plugin": `eip155:31337:0xab…`), never a bare address,
so a Solana or Aztec account slots in without reshaping the thing.

- `format({ chainId, address })` and `parse(text, chainId?)`. `parse` never throws; a bare address takes `chainId`.
- `idOf(address)`: the `wal_…` id an operation answers, the same for the same key whichever signer holds it.
