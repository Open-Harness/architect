The EVM port prepares an EIP-1559 or legacy transaction, verifies a host signer's bytes, broadcasts
and tracks receipts. Call `release` when abandoning a prepared transaction before
broadcast. A send can be retried with the same signed bytes. An explicit replacement
signs replacement bytes with the same sender and nonce and a caller-capped fee bump.
Pass those bytes to `submit` so they can be retried if the send outcome is uncertain. The receipt tracker
follows same-call repricing and reports a different call consuming the nonce.

Receipt-only tracking ends when it sees a receipt or a different call using the nonce. At `{ depth }` it goes on until
the transfer is that many blocks deep, the including block as 1, and emits `Deepened` with the count each time it
changes (a mined revert ends it at once). A tag level is not counted.
Pass an intent's event source and matcher to also get `Confirmed` and `Corrected`.
Confirmation is about the event even if a competing transaction emitted it.
An optional contract deadline is measured in chain block timestamps. A tracking
timeout means the observer exhausted its budget. RPC requests are cancelled by
the timer when the per-request or remaining tracking budget expires.
Each observed receipt gets a span. Tracking and the follower run as the caller's
counted work. The host supplies the signer. Simulation (M1.32) is an `eth_call` that `sign` and `submit` require first.
