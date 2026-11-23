# world

`WorldHost.signer(name)`: the signers a world has, for the `*.world.js` entries. Prove runs those entries in its own
process in place of a device (it never picks one by an `exports` condition), giving them a `DeviceWorld`: the chain it
stood, a folder of its own, and one funded key for each host. All four signers are there, each kept as its host keeps it:

| Signer | Where its keys are in a world |
|---|---|
| `node` | Web3 v3 files in the world's folder, light scrypt cost, locked with a passphrase the world made |
| `keystore` | a server's key store, in memory: in M1 only a test key the world generated (real secrets are M2.04) |
| `world` | the world's test wallets, in memory |
| `browser` | a test EIP-1193 provider (`internal/provider.ts`) holding two accounts, an empty one for `create` to take and the world's funded one, which `import` binds by its CAIP-10 account |

Nothing is written outside the world's folder, which prove removes; no key is printed (keys are `Redacted` until a
signature is made). Test: `world.test.ts` runs each signer on a real Anvil when `ORTHO_CHAIN_EVM_ANVIL=1`.
