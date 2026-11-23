# node-host

`NodeHost.signer(name)`: the signers a Node process has, for the `*.node.js` entries (the generated CLI, and the SDK
run from Node). Only `node` is there: an encrypted keystore folder (`keyfile`), `ORTHO_WALLET_HOME` (default
`~/.orthograph/wallets`) locked with `ORTHO_WALLET_PASSPHRASE` at geth's standard scrypt cost. Without a passphrase its
keys list and nothing opens (`KeyLocked`).

`browser`, `keystore` and `world` are `absent` on this host and refuse as `KeyLocked`, saying why in a log: a page's wallet
is only in a browser, a server's key store is reached by a server operation (M2.04), the world's wallets only in a world.

The chain is `ORTHO_WALLET_CHAIN` (CAIP-2, default `eip155:1`) and `ORTHO_WALLET_RPC_URL`.
