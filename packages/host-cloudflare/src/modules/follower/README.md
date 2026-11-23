# follower

`Follower`, the Durable Object that follows one contract's events (M6.09): one per program, named
`eip155:<chainId>:<address, lower case>`. It reads the contract's log through chain-evm's reliable stream (backfill in
windows of 128 blocks, a cursor of block hashes, the decoder) and hands changes to its sink, the port `FollowerSink`
(`accept({ source: "chain", id, event, fields })` answering `"accepted"` or `"seen"`, the shape of `Inbox.accept`, Ask #481).
A Worker binds the sink as `FOLLOWER_SINK`; Goal 11's `Inbox` takes that binding over.

- `configure(config)`: stores the contract, event ABI, start block, confirmation level and optional `pollIntervalMs`.
- `poll()`: one step. It hands on each `Confirmed` change (id `chain:blockHash:logIndex`, event `Contract.Event`) and each
  `Corrected` change with `wasConfirmed: true` (id with `:corrected`, event `Contract.EventCorrected`); `Observed` is not
  handed on, and a take-back of an unconfirmed event is dropped, because the sink never saw it (M6-chain item 12).
- `checkpoint()`: `{ through, window }` as stored, numbers as decimal strings.
- `health()`: `null` while well; after failed alarm steps `{ failures, lastError: { tag, message, at } }`.

The checkpoint (chain-evm's, with the events it still needs to confirm or correct) is written in one `put`, only after the
sink has taken every change of the step. A failed hand-on leaves it where it was, so the next poll reads the same changes
again, and the sink answers `seen` for any it already took: nothing is accepted twice. A restart resumes from the stored
checkpoint.

`configure`, `poll` and the alarm run one at a time. `configure` with a `pollIntervalMs` arms an alarm at that interval (and
resets it when the interval changes); with none, any alarm is deleted and there is none, so a check that calls `poll` by hand
is never raced. The alarm runs the same step as `poll` and sets the next alarm. When the step fails (a wrong `rpcUrl`, a sink
that refuses, a reorg deeper than the window) the checkpoint stays where it was and the alarm tries again; `health()` answers
the last error's tag and message (URLs and 32-byte hex are scrubbed), when it happened and how many steps in a row failed, or
`null` once a step has succeeded. A `configure` for a different source (chain, contract, address, event or start block) starts a
new stream and clears the checkpoint; the same source keeps it.

Test: `follower.test.ts` (the entries, and the alarm, reconfiguring and health in workerd, which has no chain; the alarm-driven
hand-off was shown on Anvil with the on-chain check's Worker); the Durable Object itself is checked by
`e2e/on-chain/11-m6-09-follower.test.ts`.
