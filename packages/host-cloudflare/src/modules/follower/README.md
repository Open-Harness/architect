# follower

`Follower`, the Durable Object that follows one contract's events (M6.09): one per program, named
`eip155:<chainId>:<address, lower case>`. It reads the contract's log through chain-evm's reliable stream (backfill in
windows of 128 blocks, a cursor of block hashes, the decoder) and hands changes to its sink, the port `FollowerSink`
(`accept({ source: "chain", id, event, fields })` answering `"accepted"` or `"seen"`, the shape of `Inbox.accept`, Ask #481).
A Worker binds the sink as `FOLLOWER_SINK`; Goal 11's `Inbox` takes that binding over.

- `configure(config)`: stores the contract, event ABI, start block and confirmation level. The same arguments again change nothing.
- `poll()`: one step. It hands on each `Confirmed` change (id `chain:blockHash:logIndex`, event `Contract.Event`) and each
  `Corrected` change with `wasConfirmed: true` (id with `:corrected`, event `Contract.EventCorrected`); `Observed` is not
  handed on, and a take-back of an unconfirmed event is dropped, because the sink never saw it (M6-chain item 12).
- `checkpoint()`: `{ through, window }` as stored, numbers as decimal strings.

The checkpoint (chain-evm's, with the events it still needs to confirm or correct) is written in one `put`, only after the
sink has taken every change of the step. A failed hand-on leaves it where it was, so the next poll reads the same changes
again, and the sink answers `seen` for any it already took: nothing is accepted twice. A restart resumes from the stored
checkpoint. Polls on one follower run one after another. An alarm that calls `poll` is for the Worker to set; the follower keeps no clock.
Test: `follower.test.ts` (the entries); the Durable Object itself is checked by `e2e/on-chain/11-m6-09-follower.test.ts`.
