# keystore

`Keystore`: Web3 Secret Storage v3, the file the `node` signer keeps its keys in (K7: "the Node signer is an encrypted
keystore file"). scrypt derives 32 bytes from the passphrase; the first half is the aes-128-ctr key, the second half
goes into the keccak-256 MAC with the ciphertext, so a wrong passphrase is told from a damaged file.

- `encrypt(secret, passphrase, cost)` is the file's text; `decrypt(file, passphrase)` the `Redacted` secret, or a
  `KeystoreFault` of reason `wrong-passphrase` or `malformed`. Neither the passphrase nor the key is in a fault.
- `addressOf(file)` reads the address a file names without opening it, so listing keys needs no passphrase.
- `cost.standard` (geth's n 262144) is what a CLI uses; `cost.light` is what a world uses, so a journey does not wait.

Node only (`node:crypto`): a browser's closure never holds it. Test: an independent derivation of the MAC and plaintext agrees with the file.
