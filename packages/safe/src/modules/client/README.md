# client

`SafeCalls` encodes the Safe's own calls (`execTransaction`, `approveHash`, `swapOwner`, `addOwnerWithThreshold`).
`SafeClient` reads a Safe's owners, threshold and nonce through a chain port, and sends call data to a Safe: a revert of the
Safe's own (`require(…, "GS0xx")`) comes back as `SafeRefused` with its code, before anything is signed or sent.

Status: empty handlers until the build lands; `client.test.ts` is the check, on Anvil.
