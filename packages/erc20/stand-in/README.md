# The stand-in token

`Token.sol` is OpenZeppelin's `ERC20` (`@openzeppelin/contracts` 5.6.1, a dev dependency of this package) with a test mint: the
constructor mints 1,000,000 tokens (18 decimals) to the account that deploys it, and that account hands them on with `transfer`.
It is the contract itself, not a model of it: it runs in the world's Anvil (`Stand.process`), and conformance checks `abi.json` against it.

`bytecode.json` is its deployment bytecode. Rebuild it with Foundry v1.8.6 (the version CI pins):

```bash
pnpm install
forge build --root packages/erc20 --out /tmp/erc20-out --cache-path /tmp/erc20-cache
node -p 'require("/tmp/erc20-out/Token.sol/Token.json").bytecode.object'
```

The settings are in `../foundry.toml`: solc 0.8.30, optimizer 200 runs, EVM `prague`, no metadata hash, so the same source gives the same bytes.
