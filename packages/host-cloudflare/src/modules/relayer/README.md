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

**The store owns the nonces.** The moment `prepare` reserves a nonce, `relay` writes a row for it (the nonce, no bytes yet), before anything
that can fail, and holds that row's reservation object in a map keyed by the row's id. Only that reservation is ever filled or replaced:
`ChainPort.fill` takes the caller's own reservation object and refuses any other, and the port is built with `keepOnReject`, so a send the
node refuses for good leaves the nonce held by its owner instead of handing it back. A nonce is let go only once the node's count has
passed it (the allocator prunes it). On a restart, inside `blockConcurrencyWhile`, every open row takes back its own reservation before a
call is served: `resume` for rows with bytes, `hold` for rows without. A failure there is a defect and restarts the Durable Object.

**One Live at a time, and one owner of "final".** `configure` runs under the reconcile lock with every `relay` drained (each `relay` holds one
permit of a swap semaphore, `configure` takes them all), so a new Live is built, and takes every open row's reservation back, only when nothing
is working on the old one. Whether a refusal is final is the port's call (`isDefinite`): `submit` says so in the error it returns whenever it
reset the nonce, so a fee-cap refusal ends as a fill row, never as a call answered as sent. The port also refuses to `replace` a
transaction that is not the one broadcast at its nonce, and a row that reaches that state becomes a fill.

**Write before send.** `relay` first asks the node to run the call (`port.read`), so a call that would revert never takes a nonce. It
then simulates and signs, stores the signed bytes on the row (state `submitting`) before it sends, and, while it works, the alarm leaves
the row alone. A send that fails in transit (or that the node does not explain) is answered as sent and left to the alarm, which looks
at the node and sends it again if it is gone. A crash after the row is written and before the send means the alarm sends it, so a call is
at-least-once: a caller that got no answer should check `status` before it relays again.

**A reserved nonce that fails** (a simulation, a signature, a send the node refuses for good) keeps its reservation, and its row becomes a
`fill` row without bytes. The alarm sends a zero-value transfer from the relayer to itself there, from that row's reservation, so the
calls queued behind it go through; a fill the node refuses is tried again at the next alarm. The caller still gets the error. Bytes that
can no longer be read turn a row into a fill the same way. A nonce another transaction already used needs no fill. A replacement that
fails in transit is recorded as the current transaction, as a first send is; one the node refuses for good leaves the old one current and
the reason on the row (`status` shows it as `problem`).

**What is stored** (the Durable Object's SQLite): the configuration, and one row per submission: id, nonce, state, the current
hash, the signed bytes of the current transaction (public), the hashes it replaced, the block it was first sent at, and the fee
cap for replacements (ten times the first fee). After a restart the open rows are taken back into the port in nonce order
(`ChainPort.resume`), so their nonces stay reserved and a dropped one can still be replaced.

Test: `relayer.test.ts` (the store). The behaviour is checked on a real Anvil by `e2e/on-chain/10-m6-07-relayer.test.ts`.
