The EVM event follower backfills and polls the same source. A successful poll returns
changes and a checkpoint together. Persist them atomically to resume without replaying
committed changes. The checkpoint carries the last 128 block hashes and the events
needed for confirmation and correction. A reorg deeper than that window fails with
`ChainFault` so the caller can recover from a trusted checkpoint. `Corrected` reports
whether the retracted event was previously confirmed.
