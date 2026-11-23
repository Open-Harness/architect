# keyfile

`Keyfile.keyring({ directory, passphrase, cost })`: the `node` signer's keys, one Web3 Secret Storage v3 file per label
in a folder (`<label>.json`, label written as a URI component, mode 0600, the folder 0700).

- Listing needs no passphrase (a file names its address); opening or adding a key does, and without one is `KeyLocked`.
- A file is never overwritten (`wx`): a repeated label cannot lose a key. `NoSuchKey` when no file has the label.
- Node only (`node:fs`, `node:crypto` through `keystore`): a browser's closure never holds it.
