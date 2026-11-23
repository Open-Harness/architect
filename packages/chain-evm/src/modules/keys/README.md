# keys

`Keys`: the secp256k1 keys a wallet signs with, so no other package imports `viem` (the lint rule).

- `Keys.generate`: a fresh secret, `Redacted`.
- `Keys.fromSecret(secret)`: a `Key` (`address`, `signMessage` for EIP-191, and the `signer` `ChainPort.sign` takes).
  A malformed secret is a `ChainFault` of kind `signing`; its message never holds the secret.
- `Keys.keccak256` for the Web3 Secret Storage MAC, and `Keys.isAddress`.

The secret is read once, inside `fromSecret`, and leaves only as signatures. Nothing here prints, logs or stores a key.
