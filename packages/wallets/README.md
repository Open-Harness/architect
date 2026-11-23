# @orthograph/wallets

The first real plugin (M1.29, K7 F4, F5): keys on a device or in a server's key store, `create`, `import`, `keys`, `sign`
and `send`. Mount it with `ortho add feature @orthograph/wallets`; the generated SDK and CLI then have `wallet create`,
`wallet import`, `wallet keys`, `wallet sign` and `wallet send`.

All five operations are `allowed: [Blueprint.anyone]` and `runs: "client"` (M1.27): they run on the caller's device, with
no server call, and their spans leave from there. Values are **CAIP-10 accounts** (`eip155:31337:0xAb…`), never a bare
address, so a Solana or Aztec account slots in without reshaping the thing (K7). `signer` in every payload says where the
key lives (K7 F5: each wallet declares it); `label` names a key on a signer.

## The four signers

| `signer` | Where the key lives | On which host |
|---|---|---|
| `node` | an encrypted keystore file (Web3 Secret Storage v3) in `ORTHO_WALLET_HOME`, locked with `ORTHO_WALLET_PASSPHRASE` | the CLI, and the SDK run from Node |
| `browser` | the wallet the page was given as `window.ethereum` (EIP-1193); the signer keeps only labels | a browser |
| `keystore` | a server's key store. In M1 only a key the world generated; real secrets are M2.04, the hygiene check M6.18 | a server operation (`Server.keystore`); a world |
| `world` | the world's test wallets | a world |

Each host entry (`src/wallet/<verb>.{node,browser,world}.ts`) is one line over `modules/operations`; the host decides
which signers it has, and one it does not have refuses as `KeyLocked`, saying why in a log. Prove runs the `world` entry in
place of a device (it is never an `exports` condition), with the chain it stood and a funded key per host.

## Using it

```sh
ORTHO_WALLET_CHAIN=eip155:31337 ORTHO_WALLET_RPC_URL=http://127.0.0.1:8545 \
ORTHO_WALLET_PASSPHRASE=… acme wallet create --signer node --label demo
acme wallet send --signer node --label demo --to eip155:31337:0x… --value 1000
```

`tools/demo/m1-wallet.sh` does all of it against an Anvil of its own, never printing a key.

| Variable | Meaning | Default |
|---|---|---|
| `ORTHO_WALLET_CHAIN` | the chain accounts are on, CAIP-2 | `eip155:1` |
| `ORTHO_WALLET_RPC_URL` | where to send; without it a wallet makes keys and signs but a send is a defect | none |
| `ORTHO_WALLET_HOME` | the `node` signer's keystore folder | `~/.orthograph/wallets` |
| `ORTHO_WALLET_PASSPHRASE` | what locks it; without it keys list and nothing signs (`KeyLocked`) | none |

A browser has no process environment: it sets `globalThis.ORTHOGRAPH_WALLET` to an object with the first two.

## A server operation signing

`@orthograph/wallets/server` (the package's `src/main.js`) exports `Server.keystore({ secret, chain })`: a `keystore` signer holding one key, `server`,
from a `Redacted` binding. A server operation's handler sends with `signer.send("server", to, value)` and gets what a device
gets. Test: `server.test.ts` serves a real operation that sends on Anvil with a world-generated key.

## What a send is

`send` is K7 Q3's lifecycle on `@orthograph/chain-evm`: prepare, **simulate** (never skipped), sign, submit, follow. A
transfer whose simulation fails is `SimulationReverted` with nothing signed or sent and its nonce handed back, so the
next send takes the nonce this one would have had. `confirmed` is what a plain transfer answers once it is included and not
reverted at depth one, a local chain's level; it has no event of its own to wait for.

## Layout

`feature.ts` (the descriptor), `blueprint/` (the declarations, and the ten journeys, which belong to their author and are
byte for byte the author's), `src/wallet/` (the host entries), `src/modules/` (`account`, `chain`, `keystore`, `keyfile`, `signer`,
`submit`, `operations`, `node-host`, `browser-host`, `world`, `server`; each with a README), `src/main.ts` (the library).

Tests: `pnpm exec vitest run --root packages/wallets`; with `ORTHO_CHAIN_EVM_ANVIL=1` (Foundry's `anvil` on the PATH) they
also run every signer on a real chain. Prove's own run of the journeys is `packages/prove/test/device-journeys.test.ts`.
