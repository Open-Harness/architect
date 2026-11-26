# safe-tx

`SafeTx` is a Safe transaction as its owners sign it: the `SafeTx` EIP-712 typed data (domain: the chain id and the Safe's
address; the nonce is in the message) and its digest, which equals the Safe's `getTransactionHash`.

Status: empty handlers until the build lands; `safe-tx.test.ts` and `../client/client.test.ts` are the checks.
