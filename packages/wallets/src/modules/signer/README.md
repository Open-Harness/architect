# signer

`Signer` (K7: a `Signer` per host): the five things a wallet does with a key on one signer (`node`, `browser`, `keystore`,
`world`): `create`, `import`, `keys`, `sign` and `send`. `Signers` makes them:

- `keyed(name, chain, keyring)`: keys held here. A `Keyring` is where they sit (`memory` here, an encrypted folder in
  `keyfile`). A label is never overwritten: `create` on one that exists answers its key, `import` of the same key answers it,
  of another is `KeyLocked`. The secret is `Redacted` from the first line and leaves only as signatures.
- `provided(name, chain, provider, labels)`: keys a browser's wallet holds, reached through EIP-1193. The wallet has no names
  for its accounts, so the signer keeps a `LabelBook` (in the page's storage); `create` takes the next account the wallet
  offers that has no label; `send` is simulated by the chain port before the wallet is asked to approve anything.
- `absent(name, chain, why)`: a signer the host does not have. Every request is `KeyLocked`, with a log saying why.

Refusals are the declared errors (`KeyLocked`, `NoSuchKey`, and `SimulationReverted` from a send), each said in a log
first, so the refusal explains itself. Nothing here imports Node, so a browser's closure holds it.
