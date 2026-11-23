Each port has one in-memory nonce manager. Reservations start at the pending chain
nonce and allocate atomically by sender. Abandoned preparations can be released.
After a send with an ambiguous outcome, its reservation is retained so the same
signed bytes can be retried. A definite first rejection reclaims the nonce or
restores the previous attempt after a failed replacement. Finalized transaction
counts provide a monotonic floor and reclaim old reservations. Use one port per chain and signer process.
