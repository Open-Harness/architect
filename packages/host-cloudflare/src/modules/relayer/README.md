# relayer

`Relayer`, the Durable Object that holds one relayer key and sends every call from it, in order (M6.07; M6-chain item 12).
One instance per key, so one per chain, named by the chain's CAIP-2 id: `env.RELAYER.getByName("eip155:8453")`. The key is the
secret binding `RELAYER_KEY` (`0x` and 64 hex digits); it is never an argument, an answer, a log line or a stored byte.

It wraps `chain-evm`'s port (nonce allocator, transaction manager, replacement, receipt reads), and adds nothing to it but
its own storage and its alarm.

| Method | What it does |
|---|---|
| `configure({ rpcUrl, chainId, pollIntervalMs? })` | Builds the port and the key; answers `{ address }`. The same arguments again change nothing. |
| `relay({ to, data })` | Prepare (the allocator gives the next nonce), simulate, sign, send. Answers `{ id, hash, nonce, from }` once the node has it. |
| `status(id)` | `{ id, nonce, hash, state, replaces }`, read from the chain now. `state` is `submitted`, `included`, `reverted` or `dropped`. |
| `reconcile()` | Reads every submission that may still change and sends each dropped one again, same call and nonce, higher fee. `{ replaced }`, lowest nonce first. |

**The alarm.** With `pollIntervalMs` configured, an alarm runs `reconcile` that often while any submission may still change (it is
set by `configure` and `relay`, and by itself again after each run, and stops when everything is mined). With none configured there
is no alarm. `reconcile` and the alarm take one lock, so a dropped transaction is replaced once.

**Write before send.** `relay` stores the submission, with its signed bytes, in state `submitting` before it sends, so a crash cannot
orphan a transaction. A send that fails in transit (or that the node does not explain) is answered as sent and left to the alarm, which
looks at the node and sends it again if it is gone. A call the node refuses for good (a revert, no funds) answers its error, and its row
keeps the nonce: the alarm fills it with a zero-value transfer from the relayer to itself, so later nonces still go through. A replacement
that fails in transit is recorded as the current transaction, as a first send is; one the node refuses for good leaves the old one current
and the reason on the row (`status` shows it as `problem`). A submission with no live copy is taken back from its bytes when it is next
looked at; bytes that can no longer be read end it as `dropped`, and its nonce is held until the node's count has passed it.

**What is stored** (the Durable Object's SQLite): the configuration, and one row per submission: id, nonce, state, the current
hash, the signed bytes of the current transaction (public), the hashes it replaced, the block it was first sent at, and the fee
cap for replacements (ten times the first fee). After a restart the open rows are taken back into the port in nonce order
(`ChainPort.resume`), so their nonces stay reserved and a dropped one can still be replaced.

Test: `relayer.test.ts` (the store). The behaviour is checked on a real Anvil by `e2e/on-chain/10-m6-07-relayer.test.ts`.
